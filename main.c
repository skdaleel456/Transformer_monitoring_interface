
#include <stdio.h>
#include "server.h"
#include "database.h"

int main(void)
{
    printf("====================================\n");
    printf(" Transformer Monitoring System\n");
    printf("====================================\n");

    if (!init_database()) {
        printf("Database initialization failed.\n");
        return 1;
    }

    printf("Starting web server...\n");
    start_server();

    close_database();
    return 0;
}
// To run first run this in the terminal - gcc -g -Wall -Wextra main.c server.c database.c sensors.c -o transformer_monitor.exe -lws2_32 -lsqlite3
//next- .\transformer_monitor.exe
