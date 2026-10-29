
#ifndef DATABASE_H
#define DATABASE_H

int init_database(void);
void close_database(void);

int save_reading(double temperature, double voltage,
                 double current, double oil_level);

#endif
