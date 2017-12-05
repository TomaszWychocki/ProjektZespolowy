#include <OneWire.h>
#include <DallasTemperature.h>
#include <max6675.h>

OneWire oneWire(2);
DallasTemperature sensors(&oneWire);
DeviceAddress heaterThermometer;

int thermoDO = 4;
int thermoCS = 5;
int thermoCLK = 6;
MAX6675 thermocouple(thermoCLK, thermoCS, thermoDO);

double getContentTemperature() {
  return thermocouple.readCelsius();
}

double getHeaterTemperature() {
  sensors.requestTemperatures();
  double tempC = sensors.getTempC(heaterThermometer);
  return tempC;
}

void setup() {
  Serial.begin(9600);
  sensors.begin();
  sensors.getAddress(heaterThermometer, 0);
  sensors.setResolution(heaterThermometer, 9);

  pinMode(7, OUTPUT);
  digitalWrite(7, HIGH);
  pinMode(8, OUTPUT);
  digitalWrite(8, LOW);
  delay(1000);
}

void loop() {
  Serial.print(getContentTemperature());
  Serial.print("\t");
  Serial.println(getHeaterTemperature());
  delay(15000);
}
