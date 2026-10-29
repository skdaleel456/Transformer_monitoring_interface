#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>

#include "server.h"
#include "database.h"
#include "sensors.h"

#define PORT 8080

static void send_response(SOCKET client, const char *type,
                          const char *body)
{
    char response[65536];

    int length = (int)strlen(body);
    int total = snprintf(response, sizeof(response),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %d\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Connection: close\r\n\r\n%s",
        type, length, body);

    if (total > 0 && total < (int)sizeof(response)) {
        int sent = 0;
        while (sent < total) {
            int n = send(client, response + sent, total - sent, 0);
            if (n == SOCKET_ERROR || n == 0) break;
            sent += n;
        }
    }
}

void start_server(void)
{
    WSADATA wsa;
    SOCKET server_socket;
    struct sockaddr_in address;

    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        printf("Winsock initialization failed.\n");
        return;
    }

    server_socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (server_socket == INVALID_SOCKET) {
        printf("Could not create socket.\n");
        WSACleanup();
        return;
    }

    memset(&address, 0, sizeof(address));
    address.sin_family = AF_INET;
    address.sin_port = htons(PORT);
    address.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(server_socket, (struct sockaddr *)&address,
             sizeof(address)) == SOCKET_ERROR) {
        printf("Could not use port %d. Is another server running?\n", PORT);
        closesocket(server_socket);
        WSACleanup();
        return;
    }

    if (listen(server_socket, 5) == SOCKET_ERROR) {
        printf("Could not start listening.\n");
        closesocket(server_socket);
        WSACleanup();
        return;
    }

    printf("Server running at http://127.0.0.1:%d\n", PORT);

    for (;;) {
        SOCKET client = accept(server_socket, NULL, NULL);
        if (client == INVALID_SOCKET) continue;

        char request[2048] = {0};
        int received = recv(client, request, sizeof(request) - 1, 0);

        if (received <= 0) {
            closesocket(client);
            continue;
        }

        if (strncmp(request, "GET /api/readings ", 17) == 0) {
            SensorReading r = generate_reading();
            int saved = save_reading(r.temperature, r.voltage,
                                     r.current, r.oil_level);

            char json[512];
            snprintf(json, sizeof(json),
                "{\"temperature\":%.1f,\"voltage\":%.1f,"
                "\"current\":%.1f,\"oil_level\":%.1f,\"saved\":%s}",
                r.temperature, r.voltage, r.current, r.oil_level,
                saved ? "true" : "false");

            send_response(client, "application/json; charset=utf-8", json);
        } else if (strncmp(request, "GET / ", 6) == 0 ||
                   strncmp(request, "GET /index.html ", 16) == 0) {
            FILE *file = fopen("index.html", "rb");

            if (file) {
                char html[30000];
                size_t size = fread(html, 1, sizeof(html) - 1, file);
                html[size] = '\0';
                fclose(file);
                send_response(client, "text/html; charset=utf-8", html);
            } else {
                send_response(client, "text/plain; charset=utf-8",
                              "Could not find index.html. Run the program from your project folder.");
            }
        } else if (strncmp(request, "GET /styles.css ", 16) == 0 ||
                   strncmp(request, "GET /app.js ", 12) == 0) {
            const char *filename =
                strncmp(request, "GET /styles.css ", 16) == 0
                ? "styles.css" : "app.js";

            const char *type =
                strcmp(filename, "styles.css") == 0
                ? "text/css; charset=utf-8"
                : "application/javascript; charset=utf-8";

            FILE *file = fopen(filename, "rb");

            if (file) {
                char content[30000];
                size_t size = fread(content, 1, sizeof(content) - 1, file);
                content[size] = '\0';
                fclose(file);
                send_response(client, type, content);
            } else {
                send_response(client, "text/plain; charset=utf-8",
                              "File not found.");
            }
        } else {
            send_response(client, "text/plain; charset=utf-8",
                          "404 Not Found");
        }

        shutdown(client, SD_SEND);
        closesocket(client);
    }
}