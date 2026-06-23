# Estado del Proyecto: Sensores de Humedad de Suelo (ESP32)

## 📌 Resumen de lo logrado hasta ahora (12 de Junio de 2026)
1. **Infraestructura lista:** Descargamos e instalamos `arduino-cli` en la computadora para poder compilar y grabar código en placas ESP32 de forma 100% automática desde PowerShell.
2. **Código desarrollado:** Se creó el archivo `esp32_soil_sensors.ino` con la lógica completa para:
   - Leer hasta 3 sensores capacitivos de humedad simultáneamente.
   - Conectarse al Wi-Fi usando un portal cautivo inteligente (`WiFiManager`), para no tener que quemar las contraseñas en el código fuente.
   - Enviar las lecturas por MQTT al servidor VPS (Contabo) en el tópico `cultivo/soil/esp32/status`.
3. **Grabación exitosa:** Compilamos el código junto con las librerías `PubSubClient` y `WiFiManager`, y lo flasheamos correctamente en la placa ESP32 por el puerto `COM3`.

## 🛑 Punto de pausa
El proyecto se pausó a la espera de adquirir **cables jumper (Dupont)** para poder hacer una conexión prolija y estable entre los sensores capacitivos y el microcontrolador ESP32.

## 🚀 Próximos pasos al retomar
1. **Conexión de Hardware:**
   - **VCC** de los sensores al pin **3.3V** del ESP32.
   - **GND** de los sensores al pin **GND** del ESP32.
   - **AOUT Sensor 1** al pin **D32**.
   - **AOUT Sensor 2** al pin **D33**.
   - **AOUT Sensor 3** al pin **D34**.
2. **Configuración Wi-Fi:** Encender el ESP32, buscar la red `ESP32-Suelo-Setup` desde el celular y pasarle las credenciales del Wi-Fi de la casa/cultivo.
3. **Calibración:** Sumergir los sensores en agua y luego dejarlos al aire libre para ajustar las variables `airValue` y `waterValue` en el código, logrando así un porcentaje de humedad preciso (0% a 100%).
4. **Integración Web:** Conectar los datos que entran por MQTT (`109.199.99.126`) con la aplicación Next.js y el logger de la base de datos (Supabase).
