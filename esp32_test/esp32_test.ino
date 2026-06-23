const int sensor1Pin = 36;
const int sensor2Pin = 39;
const int sensor3Pin = 34;
const int sensor4Pin = 35;
const int sensor5Pin = 32;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("--- INICIANDO PRUEBA DE 5 SENSORES ---");
}

void loop() {
  int val1 = analogRead(sensor1Pin);
  int val2 = analogRead(sensor2Pin);
  int val3 = analogRead(sensor3Pin);
  int val4 = analogRead(sensor4Pin);
  int val5 = analogRead(sensor5Pin);

  Serial.print("S1 (SVP): "); Serial.print(val1);
  Serial.print(" | S2 (SVN): "); Serial.print(val2);
  Serial.print(" | S3 (34): ");  Serial.print(val3);
  Serial.print(" | S4 (35): ");  Serial.print(val4);
  Serial.print(" | S5 (32): ");  Serial.println(val5);

  delay(1000); 
}
