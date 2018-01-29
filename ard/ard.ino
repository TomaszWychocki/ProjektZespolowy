#include <OneWire.h>
#include <DallasTemperature.h>
#include <max6675.h>
#include "points.h"

#define ONE_WIRE_BUS 2 //Heater temperature
#define HEAT 8   //Heater relay

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
DeviceAddress heaterThermometer;

int thermoDO = 4;
int thermoCS = 5;
int thermoCLK = 6;
MAX6675 thermocouple(thermoCLK, thermoCS, thermoDO);

String message;
bool heater = false;
bool action = true; //true - heating   false - keeping
bool endSent = true;
double time = 0.0;
double targetTemp = 0.0;
double last = 0.0;
double lastContentTempReadValue = 0.0, lastContentTempReadTime = 0.0;
double lastRelayChange = 0.0;

void setup() {
  Serial.setTimeout(20);
  Serial.begin(9600);
  
  sensors.begin();
  sensors.getAddress(heaterThermometer, 0);
  sensors.setResolution(heaterThermometer, 9);
  
  pinMode(HEAT, OUTPUT);
}

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
  double t = lastContentTempReadValue;
  if(millis() - lastContentTempReadTime >= 1000){
    lastContentTempReadTime = millis();
    t = thermocouple.readCelsius();
    lastContentTempReadValue = t;
  }
  return t * interpolate(t, contentPoints, 47, true);
}

double getHeaterTemperature() {
  sensors.requestTemperatures();
  double t = sensors.getTempC(heaterThermometer);
  return t * interpolate(t, heaterPoints, 47, true);
}

void loop() {
  while (Serial.available()) {
    message = Serial.readStringUntil("\n");
    if (message.startsWith("[getTEMP1]")) {
      String resp = "TEMP1{" + String(getContentTemperature(), 2) + "}";
      Serial.println(resp);
    }
    else if (message.startsWith("[getTEMP2]")) {
      String resp = "TEMP2{" + String(getHeaterTemperature(), 2) + "}";
      Serial.println(resp);
    }
    else if (message.startsWith("[getHEAT]")) {
      String resp = "HEAT{" + String(heater) + "}";
      Serial.println(resp);
    }
    else if (message.startsWith("[getTIME]")) {
      String resp = "TIME{" + String(time, 1) + "}";
      Serial.println(resp);
    }
    else if (message.startsWith("[setTEMP]")) { //[setTEMP]{60.3}
      String val = message.substring(10, message.indexOf('}'));
      targetTemp = val.toDouble();
      action = true;
      endSent = false;
      Serial.println("COMM{OK}");
    }
    else if (message.startsWith("[STOP]")) {
      targetTemp = 0.0;
      time = 0.0;
      action = true;
      endSent = false;
      Serial.println("COMM{OK}");
    }
    else if (message.startsWith("[setTIME]")) { //[setTIME]{4569795}
      String val = message.substring(10, message.indexOf('}'));
      time = val.toDouble();
      endSent = false;
      action = false;
      Serial.println("COMM{OK}");
    }
    else {
      Serial.println("COMM{ERR}");
    }
  }

  if (millis() - last >= 1000 && !action) {
    last = millis();
    time--;
  }

  if (time <= 0.0 && !action) {
    time = 0.0;
    if (!endSent) {
      Serial.println("COMM{END}");
      endSent = true;
    }
  }
  
  if (getContentTemperature() < targetTemp && getHeaterTemperature() < targetTemp + 5.0) {
    heater = true;
  }
  else {
    heater = false;
    if (!endSent && action && getContentTemperature() >= targetTemp) {
      Serial.println("COMM{END}");
      endSent = true;
    }
  }

  if (millis() - lastRelayChange >= 2000) {
    lastRelayChange = millis();
    digitalWrite(HEAT, heater);
  }
}
