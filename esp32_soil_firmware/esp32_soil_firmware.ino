#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "109.199.99.126";
const int mqtt_port = 1883;
const char* mqtt_topic = "cultivo/soil/esp32/status";

WiFiClient espClient;
PubSubClient client(espClient);

String macAddr;

// Pines donde conectaste los sensores (SVP, SVN, 34, 35, 32)
const int sensorPins[5] = {36, 39, 34, 35, 32};
const int NUM_SENSORS = 5;

// Valores de Calibración
const int DRY_VALUE = 3350;
const int WET_VALUE = 1400;

// Temporizador
unsigned long lastMsg = 0;
// Publicar cada 5 minutos (5 * 60 * 1000 milisegundos)
const unsigned long PUBLISH_INTERVAL = 5 * 60 * 1000; 

void setup() {
  Serial.begin(115200);
  
  // WiFiManager
  WiFiManager wm;
  // wm.resetSettings(); // Descomentar esta línea una vez si querés borrar el WiFi guardado
  
  Serial.println("Iniciando WiFiManager...");
  Serial.println("Si la placa no conoce el WiFi, conectate a la red 'ESP32-Suelo' desde tu celular.");
  
  // Intentará conectarse al WiFi guardado. Si no puede, creará el punto de acceso
  bool res = wm.autoConnect("ESP32-Suelo"); 
  
  if(!res) {
    Serial.println("Fallo al conectar WiFi o se agotó el tiempo");
    ESP.restart(); // Reiniciar si falla
  } 
  
  Serial.println("¡WiFi Conectado Exitosamente!");
  macAddr = WiFi.macAddress();
  Serial.print("Dirección MAC: ");
  Serial.println(macAddr);

  client.setServer(mqtt_server, mqtt_port);
}

void reconnect() {
  // Loop hasta que estemos conectados
  while (!client.connected()) {
    Serial.print("Intentando conexión MQTT a Contabo...");
    
    // Crear un ID de cliente aleatorio
    String clientId = "ESP32-Suelo-";
    clientId += String(random(0xffff), HEX);
    
    // Intentar conectar
    if (client.connect(clientId.c_str())) {
      Serial.println("¡Conectado a MQTT!");
    } else {
      Serial.print("Falló, código de error = ");
      Serial.print(client.state());
      Serial.println(" intentando de nuevo en 5 segundos...");
      delay(5000);
    }
  }
}

int calculateMoisture(int rawValue) {
  // map(value, fromLow, fromHigh, toLow, toHigh)
  int moisture = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  
  // Limitar los valores para que no superen el 100% ni bajen del 0%
  if (moisture < 0) moisture = 0;
  if (moisture > 100) moisture = 100;
  
  return moisture;
}

void publishData() {
  // Crear el documento JSON
  StaticJsonDocument<512> doc;
  doc["mac"] = macAddr;
  
  Serial.println("--- LEYENDO SENSORES ---");
  for(int i = 0; i < NUM_SENSORS; i++) {
    int raw = analogRead(sensorPins[i]);
    int pct = calculateMoisture(raw);
    
    // Las claves que espera tu servidor son s1_pct, s1_raw, s2_pct...
    String keyPct = "s" + String(i+1) + "_pct";
    String keyRaw = "s" + String(i+1) + "_raw";
    
    doc[keyPct] = pct;
    doc[keyRaw] = raw;
    
    Serial.print("Sensor "); Serial.print(i+1);
    Serial.print(" (Pin "); Serial.print(sensorPins[i]); Serial.print("): ");
    Serial.print("Crudo="); Serial.print(raw);
    Serial.print(" | Humedad="); Serial.print(pct); Serial.println("%");
  }
  Serial.println("------------------------");

  // Serializar el JSON a un texto
  char jsonString[512];
  serializeJson(doc, jsonString);
  
  Serial.print("Publicando en MQTT Topic: ");
  Serial.println(mqtt_topic);
  Serial.println(jsonString);
  
  // Publicar el texto en el broker
  client.publish(mqtt_topic, jsonString);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  
  // Publicar inmediatamente al arrancar, y luego cada 5 minutos
  if (lastMsg == 0 || (now - lastMsg > PUBLISH_INTERVAL)) {
    lastMsg = now;
    publishData();
  }
}
