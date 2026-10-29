
#ifndef SENSORS_H
#define SENSORS_H

typedef struct {
    double temperature;
    double voltage;
    double current;
    double oil_level;
} SensorReading;

SensorReading generate_reading(void);

#endif
