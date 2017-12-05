#include <OneWire.h>
#include <DallasTemperature.h>
#include <max6675.h>
#include "points.h"

OneWire oneWire(2);
DallasTemperature sensors(&oneWire);
DeviceAddress heaterThermometer;

int thermoDO = 4;
int thermoCS = 5;
int thermoCLK = 6;
MAX6675 thermocouple(thermoCLK, thermoCS, thermoDO);

double interpolate(double x, double pointsArray[][2], int size, bool extrapolate) {
  if (x <= 24)
    return 1.0;
  
  int i = 0;
  if (x >= pointsArray[size - 2][0])
    i = size - 2;
  else
    while (x > pointsArray[i + 1][0]) i++;

  double xL = pointsArray[i][0], yL = pointsArray[i][1], xR = pointsArray[i + 1][0], yR = pointsArray[i + 1][1];

  if (!extrapolate) {
    if (x < xL) yR = yL;
    if (x > xR) yL = yR;
  }

  double dydx = (yR - yL) / (xR - xL);
  return yL + dydx * (x - xL);
}

double getContentTemperature() {
  double t = thermocouple.readCelsius();
  return t * interpolate(t, contentPoints, 94, true);
}

double getHeaterTemperature() {
  sensors.requestTemperatures();
  double t = sensors.getTempC(heaterThermometer);
  return t * interpolate(t, heaterPoints, 94, true);
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
  delay(200);
}
