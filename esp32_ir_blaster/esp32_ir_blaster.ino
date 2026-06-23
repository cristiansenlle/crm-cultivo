#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <IRremoteESP8266.h>
#include <IRrecv.h>
#include <IRutils.h>
#include <IRsend.h>

// --------------------------------------------------------
// CONFIGURACIÓN DE PINES
// --------------------------------------------------------
const uint16_t kRecvPin = 13; // Pin conectado al módulo receptor (RX)
const uint16_t kIrLed = 4;    // Pin conectado al módulo emisor (TX)

// --------------------------------------------------------
// CREDENCIALES MQTT
// --------------------------------------------------------
const char* mqtt_server = "109.199.99.126";
const int mqtt_port = 1883;
const char* mqtt_user = "mqtt";
const char* mqtt_password = "crm-cultivo-2024";

WiFiClient espClient;
PubSubClient client(espClient);

// Instancias de IR
IRrecv irrecv(kRecvPin, 1024, 50, true);
decode_results results;
IRsend irsend(kIrLed);

bool isLearning = false;
unsigned long learningStartTime = 0;
const unsigned long LEARNING_TIMEOUT = 30000; // 30 segundos para aprender

void setup_wifi() {
  WiFiManager wm;
  // wm.resetSettings(); // Descomentar si necesitas borrar el WiFi guardado
  
  Serial.println("Conectando a WiFi...");
  bool res = wm.autoConnect("Cultivo_IR_Blaster", "admin123"); 

  if(!res) {
    Serial.println("Fallo al conectar. Reiniciando...");
    delay(3000);
    ESP.restart();
  } 
  Serial.println("WiFi Conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Conectando a MQTT...");
    String clientId = "ESP32-IR-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println("Conectado!");
      client.subscribe("cultivo/broadlink/command");
      client.subscribe("cultivo/broadlink/learn");
    } else {
      Serial.print("Fallo, rc=");
      Serial.print(client.state());
      Serial.println(" reintentando en 5s");
      delay(5000);
    }
  }
}

void sendRawCode(String rawString) {
  // Convertimos el string separado por comas "8950,4450,600..." a un array de uint16_t
  int count = 1;
  for (int i = 0; i < rawString.length(); i++) {
    if (rawString.charAt(i) == ',') count++;
  }

  uint16_t* rawData = new uint16_t[count];
  int idx = 0;
  int startIdx = 0;
  
  for (int i = 0; i <= rawString.length(); i++) {
    if (rawString.charAt(i) == ',' || i == rawString.length()) {
      rawData[idx++] = rawString.substring(startIdx, i).toInt();
      startIdx = i + 1;
    }
  }

  Serial.print("Enviando código RAW. Longitud: ");
  Serial.println(count);
  
  irsend.sendRaw(rawData, count, 38); // Emite a 38kHz (frecuencia estándar IR)
  
  delete[] rawData;
  Serial.println("¡Señal enviada!");
}

void callback(char* topic, byte* payload, unsigned int length) {
  String messageTemp;
  for (int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  
  Serial.print("Mensaje MQTT recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(messageTemp);

  if (String(topic) == "cultivo/broadlink/learn") {
    Serial.println("¡Modo aprendizaje ACTIVADO por 30 segundos!");
    isLearning = true;
    learningStartTime = millis();
    irrecv.enableIRIn(); // Empezar a escuchar
  } 
  else if (String(topic) == "cultivo/broadlink/command") {
    // El comando llega como {"code":"8950,4450,600,..."}
    StaticJsonDocument<4096> doc; // Buffer grande porque las señales crudas (RAW) son largas
    DeserializationError error = deserializeJson(doc, messageTemp);
    
    if (error) {
      Serial.print("Error leyendo JSON: ");
      Serial.println(error.c_str());
      return;
    }

    const char* codeStr = doc["code"];
    if (codeStr) {
      sendRawCode(String(codeStr));
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  setup_wifi();
  
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(4096); // Tamaño ampliado para señales IR largas
  
  irsend.begin();
  irrecv.enableIRIn(); // Empezamos escuchando
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Modo Aprendizaje
  if (isLearning) {
    if (millis() - learningStartTime > LEARNING_TIMEOUT) {
      Serial.println("Tiempo de aprendizaje agotado.");
      isLearning = false;
    } 
    else if (irrecv.decode(&results)) {
      Serial.println("¡Señal Infrarroja Capturada!");
      
      // Convertir las temporizaciones RAW a string separado por comas
      String rawCodeStr = "";
      for (uint16_t i = 1; i < results.rawlen; i++) {
        uint32_t usecs;
        for (usecs = results.rawbuf[i] * kRawTick; usecs > UINT16_MAX; usecs -= UINT16_MAX) {
          rawCodeStr += String(UINT16_MAX);
          if (i % 2) rawCodeStr += ",0,";
          else rawCodeStr += ",0,";
        }
        rawCodeStr += String(usecs);
        if (i < results.rawlen - 1) rawCodeStr += ",";
      }

      // Preparar JSON para mandar a Supabase por MQTT
      StaticJsonDocument<4096> doc;
      doc["code"] = rawCodeStr;
      
      char buffer[4096];
      serializeJson(doc, buffer);
      
      // Publicar al broker
      client.publish("cultivo/broadlink/learned_code", buffer);
      Serial.println("Código mandado al servidor MQTT.");
      
      isLearning = false; // Desactivar aprendizaje tras captura exitosa
      irrecv.resume();
    }
  } else {
    // Si no está en aprendizaje, limpiar la cola por si llegan rebotes
    if (irrecv.decode(&results)) {
      irrecv.resume();
    }
  }
}
