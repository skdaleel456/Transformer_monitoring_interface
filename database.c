
#include <stdio.h>
#include <sqlite3.h>
#include "database.h"

static sqlite3 *db = NULL;

int init_database(void)
{
    int result = sqlite3_open("transformer.db", &db);

    if (result != SQLITE_OK) {
        fprintf(stderr, "Database error: %s\n",
                db ? sqlite3_errmsg(db) : "Could not open database");
        close_database();
        return 0;
    }

    const char *sql =
        "CREATE TABLE IF NOT EXISTS readings ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "temperature REAL NOT NULL,"
        "voltage REAL NOT NULL,"
        "current REAL NOT NULL,"
        "oil_level REAL NOT NULL,"
        "timestamp DATETIME DEFAULT CURRENT_TIMESTAMP"
        ");";

    char *error_message = NULL;
    result = sqlite3_exec(db, sql, NULL, NULL, &error_message);

    if (result != SQLITE_OK) {
        fprintf(stderr, "Table creation error: %s\n", error_message);
        sqlite3_free(error_message);
        close_database();
        return 0;
    }

    printf("SQLite database initialized successfully.\n");
    return 1;
}

int save_reading(double temperature, double voltage,
                 double current, double oil_level)
{
    const char *sql =
        "INSERT INTO readings (temperature, voltage, current, oil_level) "
        "VALUES (?, ?, ?, ?);";

    sqlite3_stmt *statement = NULL;

    if (sqlite3_prepare_v2(db, sql, -1, &statement, NULL) != SQLITE_OK) {
        fprintf(stderr, "Prepare error: %s\n", sqlite3_errmsg(db));
        return 0;
    }

    sqlite3_bind_double(statement, 1, temperature);
    sqlite3_bind_double(statement, 2, voltage);
    sqlite3_bind_double(statement, 3, current);
    sqlite3_bind_double(statement, 4, oil_level);

    int result = sqlite3_step(statement);
    sqlite3_finalize(statement);

    if (result != SQLITE_DONE) {
        fprintf(stderr, "Save error: %s\n", sqlite3_errmsg(db));
        return 0;
    }

    return 1;
}

void close_database(void)
{
    if (db != NULL) {
        sqlite3_close(db);
        db = NULL;
    }
}
