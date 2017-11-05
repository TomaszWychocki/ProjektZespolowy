#include "lib/OneWire/OneWire.h"
#include "lib/DS18B20/DS18B20.h"
#include "lib/MAX6675/max6675.h"

#define TEMP1 A0 //Content temperature
#define TEMP2 A1 //Heater temperature
#define HEAT 8   //Heater relay

String message;
bool heater = false;
bool action = false; //true - warming | false - wait
double time = 0.0;
double targetTemp = 0.0;
double last = 0.0;

void setup() {
  Serial.setTimeout(20);
  Serial.begin(9600);
  pinMode(HEAT, OUTPUT);
}

double getContentTemperature() {
  //....code
  double t = 24.52;
  return t;
}

double getHeaterTemperature() {
  //....code
  double t = 41.52;
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
    else if (message.startsWith("[getACTION]")) {
      String resp = "ACTION{" + String(action) + "}";
      Serial.println(resp);
    }
    else if (message.startsWith("[setTEMP]")) { //[setTEMP]{60.3}
      String val = message.substring(10, message.indexOf('}'));
      targetTemp = val.toDouble();
      Serial.println("OK");
    }
    else if (message.startsWith("[setTIME]")) { //[setTIME]{4569795}
      String val = message.substring(10, message.indexOf('}'));
      time = val.toDouble();
      Serial.println("OK");
    }
    else if (message.startsWith("[setACTI]")) { //[setACTI]{1}
      char val = message.charAt(10);
      if (val == '1')
        action = true;
      else
        action = false;
      Serial.println("OK");
    }
    else {
      Serial.println("ERR");
    }
  }

  if (millis() - last >= 1000) {
    last = millis();
    time--;
  }

  if (time <= 0.0) {
    time = 0.0;
    heater = false;
    if (targetTemp > 0) {
      Serial.println("END");
      targetTemp = -1.0;
    }
  }
  else {
    if (action && getContentTemperature() < targetTemp && getHeaterTemperature() < targetTemp + 5.0)
      heater = true;
    else
      heater = false;
  }

  digitalWrite(HEAT, heater);
}
