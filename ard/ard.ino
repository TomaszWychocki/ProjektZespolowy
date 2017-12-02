#include "lib/OneWire/OneWire.h"
#include "lib/DS18B20/DS18B20.h"
#include "lib/MAX6675/max6675.h"

#define TEMP1 A0 //Content temperature
#define TEMP2 A1 //Heater temperature
#define HEAT 8   //Heater relay
#define DEBUG

String message;
bool heater = false;
bool action = true; //true - heating   false - keeping
bool endSent = true;
double time = 0.0;
double targetTemp = 0.0;
double last = 0.0;

void setup() {
  Serial.setTimeout(20);
  Serial.begin(9600);
  pinMode(HEAT, OUTPUT);
}

double getContentTemperature() {
  double t = 41.52;
  #ifdef DEBUG
    t = 0.12 * analogRead(TEMP1);
  #endif
  return t;
}

double getHeaterTemperature() {
  double t = 41.52;
  #ifdef DEBUG
    t = 0.12 * analogRead(TEMP2);
  #endif
  return t;
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
    if (!endSent && action) {
      Serial.println("COMM{END}");
      endSent = true;
    }
  }

  digitalWrite(HEAT, heater);
}
