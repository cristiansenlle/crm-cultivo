#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>

// ==========================================
// CONFIGURACIÓN MQTT
// ==========================================
const char* mqtt_server = "109.199.99.126"; // IP del VPS Contabo
const int mqtt_port = 1883;

// ==========================================
// CONFIGURACIÓN DE PINES (Sensores Capacitivos)
// ==========================================
// NOTA IMPORTANTE: Sólo usar pines del ADC1 (32, 33, 34, 35, 36, 39) 
// ya que el WiFi bloquea los pines del ADC2.
const int sensor1Pin = 32;
const int sensor2Pin = 33;
const int sensor3Pin = 34;
const int sensor4Pin = 35;
const int sensor5Pin = 36;

// ==========================================
// CALIBRACIÓN DE SENSORES
// ==========================================
const int airValue = 3350;  
const int waterValue = 1500; 

WiFiClient espClient;
PubSubClient client(espClient);

void reconnect() {
  while (!client.connected()) {
    Serial.print("Intentando conexión MQTT...");
    String clientId = "ESP32-Suelo-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("conectado al broker MQTT");
    } else {
      Serial.print("falló, rc=");
      Serial.print(client.state());
      Serial.println(" reintentando en 5 segundos...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // Configurar atenuación del ADC a 11db (rango completo 0-3.3V)
  analogReadResolution(12); // Resolucion 0-4095
  
  // Iniciar WiFiManager
  WiFiManager wm;
  
  // Si no se conecta en 3 minutos, reinicia el ESP32
  wm.setConfigPortalTimeout(180);
  
  // Crea el punto de acceso para configurar el WiFi
  if (!wm.autoConnect("ESP32-Suelo-Setup")) {
    Serial.println("Fallo al conectar o tiempo agotado");
    delay(3000);
    ESP.restart();
  }

  Serial.println("");
  Serial.println("WiFi conectado!");
  Serial.print("Dirección IP: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 1. Leer valores crudos
  int rawValue1 = analogRead(sensor1Pin);
  int rawValue2 = analogRead(sensor2Pin);
  int rawValue3 = analogRead(sensor3Pin);
  int rawValue4 = analogRead(sensor4Pin);
  int rawValue5 = analogRead(sensor5Pin);

  // 2. Mapear a porcentaje
  int moisturePercent1 = map(rawValue1, airValue, waterValue, 0, 100);
  int moisturePercent2 = map(rawValue2, airValue, waterValue, 0, 100);
  int moisturePercent3 = map(rawValue3, airValue, waterValue, 0, 100);
  int moisturePercent4 = map(rawValue4, airValue, waterValue, 0, 100);
  int moisturePercent5 = map(rawValue5, airValue, waterValue, 0, 100);

  // 3. Acotar valores entre 0 y 100
  moisturePercent1 = constrain(moisturePercent1, 0, 100);
  moisturePercent2 = constrain(moisturePercent2, 0, 100);
  moisturePercent3 = constrain(moisturePercent3, 0, 100);
  moisturePercent4 = constrain(moisturePercent4, 0, 100);
  moisturePercent5 = constrain(moisturePercent5, 0, 100);

  // 4. Armar JSON
  String payload = "{\"mac\":\"" + WiFi.macAddress() + "\",";
  payload += "\"s1_raw\":" + String(rawValue1) + ",\"s1_pct\":" + String(moisturePercent1) + ",";
  payload += "\"s2_raw\":" + String(rawValue2) + ",\"s2_pct\":" + String(moisturePercent2) + ",";
  payload += "\"s3_raw\":" + String(rawValue3) + ",\"s3_pct\":" + String(moisturePercent3) + ",";
  payload += "\"s4_raw\":" + String(rawValue4) + ",\"s4_pct\":" + String(moisturePercent4) + ",";
  payload += "\"s5_raw\":" + String(rawValue5) + ",\"s5_pct\":" + String(moisturePercent5) + "}";

  Serial.print("Publicando datos MQTT: ");
  Serial.println(payload);

  client.publish("cultivo/soil/esp32/status", payload.c_str());

  // Esperar 1 minuto antes de enviar la siguiente lectura
  delay(60000);
}
