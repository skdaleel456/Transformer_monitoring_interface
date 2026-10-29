
#include <stdlib.h>
#include <time.h>
#include "sensors.h"

SensorReading generate_reading(void)
{
    static int seeded = 0;

    if (!seeded) {
        srand((unsigned int)time(NULL));
        seeded = 1;
    }

    SensorReading reading;

    reading.temperature = 65.0 + (rand() % 301) / 10.0;
    reading.voltage = 225.0 + (rand() % 101) / 10.0;
    reading.current = 8.0 + (rand() % 121) / 10.0;
    reading.oil_level = 75.0 + (rand() % 251) / 10.0;

    return reading;
}
