#include <WiFi.h>
#include <WiFiMulti.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <ArduinoJson.h>

// =========================================================================
// 1. CONFIGURACIÓN DE REDES MULTI-WIFI (Taller / Programación + Cultivo Final)
// =========================================================================
WiFiMulti wifiMulti;

// Redes configuradas
const char* WIFI_1_SSID = "WiFi-000-2.4GHz";     // Red 1 (Lugar actual / Taller)
const char* WIFI_1_PASS = "0043117534";

const char* WIFI_2_SSID = "ClaroSM";             // Red 2 (Carpa / Lugar definitivo)
const char* WIFI_2_PASS = "12563478";

// Configuración Broker MQTT Contabo
const char* MQTT_SERVER   = "109.199.99.126";
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "cultivo/electrophysiology/esp32/telemetry";

// Identificador del cultivo
const char* ROOM_ID   = "5a650ff8-9b93-40cc-a7f9-c672bad50014"; // Carpa 2
const char* PLANT_TAG = "Carpa2_PlantaCentinela_01";

// =========================================================================
// 2. OBJETOS Y DIAGNÓSTICO AVANZADO DEL ADS1115
// =========================================================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);
Adafruit_ADS1115 ads; 

bool ads_detected = false;
bool prev_ads_status = false;
uint8_t ads_address = 0x48;
unsigned long ads_disconnect_count = 0;
unsigned long ads_reconnect_count = 0;
unsigned long last_i2c_check_time = 0;
String i2c_diagnostic_msg = "Inicializando...";

// Variables Canal 1 (AD8232 #1 -> ADS1115 Pin A0)
float ch1_voltage_mv = 0.0;
float ch1_baseline_mv = 1650.0;
float ch1_stress_index = 0.0;
String ch1_event = "steady";
float ch1_voltage_buffer[25];
int ch1_buffer_index = 0;

// Variables Canal 2 (AD8232 #2 -> ADS1115 Pin A1)
float ch2_voltage_mv = 0.0;
float ch2_baseline_mv = 1650.0;
float ch2_stress_index = 0.0;
String ch2_event = "steady";
float ch2_voltage_buffer[25];
int ch2_buffer_index = 0;

// Temporizadores
unsigned long last_sample_time = 0;
unsigned long last_mqtt_publish = 0;
const unsigned long MQTT_INTERVAL_MS = 5000; // Enviar cada 5 segundos

// =========================================================================
// 3. SCANNER Y TEST CONSTANTE DE CONEXIÓN I2C / ADS1115
// =========================================================================
bool test_ads1115_raw_i2c() {
  Wire.beginTransmission(ads_address);
  byte error = Wire.endTransmission();
  return (error == 0);
}

void diagnose_and_recover_i2c() {
  bool is_currently_connected = test_ads1115_raw_i2c();

  if (is_currently_connected) {
    if (!prev_ads_status) {
      ads_reconnect_count++;
      ads.setGain(GAIN_ONE);
      if (ads.begin(ads_address)) {
        ads_detected = true;
        prev_ads_status = true;
        i2c_diagnostic_msg = "ONLINE (0x" + String(ads_address, HEX) + ")";
        Serial.println("\n🟢 [ADS1115 RECONECTADO] Conexión I2C restablecida!");
      }
    }
  } else {
    if (prev_ads_status || ads_detected) {
      ads_disconnect_count++;
      ads_detected = false;
      prev_ads_status = false;
      i2c_diagnostic_msg = "DESCONECTADO (Error I2C)";
      Serial.println("\n🔴 [ALERTA ADS1115 DESCONECTADO] Intentando auto-recuperación...");
      Wire.begin(21, 22);
      Wire.setTimeOut(100);
    }
  }
}

void initial_i2c_scan() {
  Serial.println("\n🔍 [I2C SCAN INICIAL] Escaneando SDA=21, SCL=22...");
  byte count = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("   -> ✅ Dispositivo detectado en 0x%02X", address);
      if (address >= 0x48 && address <= 0x4B) {
        Serial.println(" (ADS1115 OK!)");
        ads_address = address;
        ads_detected = true;
        prev_ads_status = true;
      } else {
        Serial.println();
      }
      count++;
    }
  }
  if (count == 0) {
    Serial.println("   -> ❌ [ERROR] NO SE DETECTÓ ADS1115.");
    ads_detected = false;
    prev_ads_status = false;
  }
}

// =========================================================================
// 4. GESTIÓN MULTI-WIFI Y MQTT
// =========================================================================
void setup_wifi() {
  Serial.println("\n[Wi-Fi] Conectando...");
  wifiMulti.addAP(WIFI_1_SSID, WIFI_1_PASS);
  wifiMulti.addAP(WIFI_2_SSID, WIFI_2_PASS);

  int attempts = 0;
  while (wifiMulti.run() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Conectado!");
    Serial.print("[Wi-Fi] IP: ");
    Serial.println(WiFi.localIP());
  }
}

void reconnect_mqtt() {
  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    String clientId = "ESP32-Phyto-" + WiFi.macAddress();
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("[MQTT] Conectado al Broker!");
    } else {
      delay(1000);
    }
  }
}

// =========================================================================
// 5. LECTURA DUAL CON FILTRO NOTCH DE 50 Hz
// =========================================================================
void readFilteredDualChannels(float &v_ch1, float &v_ch2) {
  if (!ads_detected) {
    v_ch1 = 0.0;
    v_ch2 = 0.0;
    return;
  }

  float sum_ch1 = 0.0;
  float sum_ch2 = 0.0;
  const int num_samples = 10;
  int valid_samples = 0;

  for (int i = 0; i < num_samples; i++) {
    if (!test_ads1115_raw_i2c()) {
      ads_detected = false;
      break;
    }

    int16_t raw_ch1 = ads.readADC_SingleEnded(0); // Canal 1 (A0)
    int16_t raw_ch2 = ads.readADC_SingleEnded(1); // Canal 2 (A1)

    sum_ch1 += ads.computeVolts(raw_ch1) * 1000.0;
    sum_ch2 += ads.computeVolts(raw_ch2) * 1000.0;
    valid_samples++;

    delayMicroseconds(2000); // 20ms ciclo completo de 50 Hz
  }

  if (valid_samples > 0) {
    v_ch1 = sum_ch1 / (float)valid_samples;
    v_ch2 = sum_ch2 / (float)valid_samples;
  } else {
    v_ch1 = 0.0;
    v_ch2 = 0.0;
    ads_detected = false;
  }
}

// Función para mapear float
float mapFloat(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// =========================================================================
// 6. SETUP
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n🌱 BIOSENSOR ELECTROFISIOLOGÍA VEGETAL DUAL-CHANNEL");

  Wire.begin(21, 22);
  Wire.setTimeOut(100);

  initial_i2c_scan();

  if (ads_detected) {
    ads.setGain(GAIN_ONE);
    ads.begin(ads_address);
  }

  setup_wifi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setBufferSize(768);
}

// =========================================================================
// 7. LOOP PRINCIPAL CON CÁLCULO CALIBRADO DE ESTRÉS
// =========================================================================
void loop() {
  if (wifiMulti.run() != WL_CONNECTED) {
    delay(100);
  } else {
    if (!mqttClient.connected()) {
      reconnect_mqtt();
    }
    mqttClient.loop();
  }

  unsigned long now = millis();

  // Diagnóstico I2C cada 1s
  if (now - last_i2c_check_time >= 1000) {
    last_i2c_check_time = now;
    diagnose_and_recover_i2c();
  }

  // Muestreo bioeléctrico (~10 lecturas/seg)
  if (now - last_sample_time >= 100) {
    last_sample_time = now;

    if (ads_detected) {
      readFilteredDualChannels(ch1_voltage_mv, ch2_voltage_mv);

      // Líneas de base biológicas (media móvil lenta)
      ch1_baseline_mv = (ch1_baseline_mv * 0.995) + (ch1_voltage_mv * 0.005);
      ch2_baseline_mv = (ch2_baseline_mv * 0.995) + (ch2_voltage_mv * 0.005);

      // Buffers circulares
      ch1_voltage_buffer[ch1_buffer_index] = ch1_voltage_mv;
      ch1_buffer_index = (ch1_buffer_index + 1) % 25;

      ch2_voltage_buffer[ch2_buffer_index] = ch2_voltage_mv;
      ch2_buffer_index = (ch2_buffer_index + 1) % 25;

      // 1. Media local de la ventana reciente
      float ch1_mean = 0.0, ch2_mean = 0.0;
      for (int i = 0; i < 25; i++) {
        ch1_mean += ch1_voltage_buffer[i];
        ch2_mean += ch2_voltage_buffer[i];
      }
      ch1_mean /= 25.0;
      ch2_mean /= 25.0;

      // 2. Varianza local (descartando deriva lenta)
      float ch1_var = 0.0, ch2_var = 0.0;
      for (int i = 0; i < 25; i++) {
        float d1 = ch1_voltage_buffer[i] - ch1_mean;
        float d2 = ch2_voltage_buffer[i] - ch2_mean;
        ch1_var += (d1 * d1);
        ch2_var += (d2 * d2);
      }
      float ch1_sigma = sqrt(ch1_var / 25.0);
      float ch2_sigma = sqrt(ch2_var / 25.0);

      // 3. Índice de estrés biológico calibrado (5mV = 5%, 80mV = 100%)
      float target_stress_1 = constrain(mapFloat(ch1_sigma, 4.0, 75.0, 8.0, 100.0), 5.0, 100.0);
      float target_stress_2 = constrain(mapFloat(ch2_sigma, 4.0, 75.0, 8.0, 100.0), 5.0, 100.0);

      // Suavizado exponencial para evitar saltos bruscos
      ch1_stress_index = (ch1_stress_index * 0.85) + (target_stress_1 * 0.15);
      ch2_stress_index = (ch2_stress_index * 0.85) + (target_stress_2 * 0.15);

      // 4. Clasificación de Eventos Dinámicos
      float delta_1 = abs(ch1_voltage_mv - ch1_baseline_mv);
      if (delta_1 > 80.0) ch1_event = "stress_spike";
      else if (delta_1 > 30.0) ch1_event = "action_potential";
      else ch1_event = "steady";

      float delta_2 = abs(ch2_voltage_mv - ch2_baseline_mv);
      if (delta_2 > 80.0) ch2_event = "stress_spike";
      else if (delta_2 > 30.0) ch2_event = "action_potential";
      else ch2_event = "steady";

    } else {
      ch1_voltage_mv = 0.0;
      ch2_voltage_mv = 0.0;
      ch1_stress_index = 0.0;
      ch2_stress_index = 0.0;
      ch1_event = "ads1115_disconnected";
      ch2_event = "ads1115_disconnected";
    }
  }

  // Publicar cada 5 segundos en MQTT
  if (now - last_mqtt_publish >= MQTT_INTERVAL_MS) {
    last_mqtt_publish = now;

    if (mqttClient.connected()) {
      StaticJsonDocument<512> doc;
      doc["mac"]          = WiFi.macAddress();
      doc["room_id"]      = ROOM_ID;
      doc["plant_tag"]    = PLANT_TAG;
      doc["ads_online"]   = ads_detected;
      doc["i2c_status"]   = i2c_diagnostic_msg;
      doc["disconnects"]  = ads_disconnect_count;
      doc["reconnects"]   = ads_reconnect_count;

      JsonObject ch1 = doc.createNestedObject("ch1");
      ch1["voltage_mv"]   = serialized(String(ch1_voltage_mv, 2));
      ch1["baseline_mv"]  = serialized(String(ch1_baseline_mv, 2));
      ch1["stress_index"] = serialized(String(ch1_stress_index, 1));
      ch1["event"]        = ch1_event;

      JsonObject ch2 = doc.createNestedObject("ch2");
      ch2["voltage_mv"]   = serialized(String(ch2_voltage_mv, 2));
      ch2["baseline_mv"]  = serialized(String(ch2_baseline_mv, 2));
      ch2["stress_index"] = serialized(String(ch2_stress_index, 1));
      ch2["event"]        = ch2_event;

      doc["voltage_mv"]   = serialized(String(ch1_voltage_mv, 2));
      doc["baseline_mv"]  = serialized(String(ch1_baseline_mv, 2));
      doc["stress_index"] = serialized(String(ch1_stress_index, 1));
      doc["event"]        = ch1_event;

      char buffer[512];
      serializeJson(doc, buffer);

      if (mqttClient.publish(MQTT_TOPIC, buffer)) {
        if (ads_detected) {
          Serial.printf("📤 [MQTT OK] CH1: %.1fmV (S:%.0f%%) | CH2: %.1fmV (S:%.0f%%)\n", 
            ch1_voltage_mv, ch1_stress_index, ch2_voltage_mv, ch2_stress_index);
        }
      }
    }
  }
}
