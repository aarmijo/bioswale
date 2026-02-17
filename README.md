# Bioswale - Sensores de humedad del terreno Sigfox

Sistema de monitorización IoT de humedad y altura de agua en terrenos. Utiliza sensores **HC-ANA-SIG-Z1** (Sigfox) configurados como grupo en el backend de Sigfox, con procesamiento de datos mediante Node-RED.

## Arquitectura del sistema

```
Sensores HC-ANA-SIG-Z1 (Sigfox)
        │
        ▼
Backend Sigfox (callback DATA ADVANCED)
        │  POST JSON
        ▼
Node-RED (webhook /sigfox/pirozzini)
        │
        ├─ Switch (identifica sensor por device ID)
        │       │
        │       ▼
        │  Decoder (función JS por tipo de sensor)
        │       │
        │       ▼
        └─ InfluxDB (bucket: pirozzini, org: tecnalia)
```

## Sensores (adaptar)

El proyecto utiliza tres tipos de sensores NTC, todos conectados a dispositivos HC-ANA-SIG-Z1:

### Sensor de temperatura y humedad ambiental

| Campo | Valor |
|---|---|
| Sensor NTC | **NTCAIMME3C90373** |
| Tipo | HC-TEMP-HUM |
| Canales | 2 (canal 1: temperatura NTC, canal 2: humedad) |
| Rango temperatura | -32.1 °C a 105.0 °C |
| Resolución tabla | 0.1 °C (1371 puntos de calibración) |
| Resistencia de referencia | 100 kΩ (divisor de tensión) |
| Tensión de alimentación | 3.3 V |
| Salida | temperatura (°C), humedad (%), batería |

### Sensor de temperatura radiante

| Campo | Valor |
|---|---|
| Sensor NTC | **Kennlinie NTC 10kOhm** |
| Tipo | HC-SOLAR-RAD |
| Canales | 1 (canal 1: temperatura NTC) |
| Rango temperatura | -40 °C a 125 °C |
| Resolución tabla | 1 °C (166 puntos de calibración) |
| Resistencia de referencia | 100 kΩ (divisor de tensión) |
| Tensión de alimentación | 3.3 V |
| Salida | temperatura (°C), batería |

### Sensor de temperatura de pavimento (asfalto)

| Campo | Valor |
|---|---|
| Sensor NTC | **B57703M1104A002** |
| Tipo | HC-TEMP-ASF |
| Canales | 3 (tres sondas NTC independientes) |
| Rango temperatura | 10 °C a 200 °C |
| Resolución tabla | 5 °C (39 puntos de calibración) |
| Resistencia de referencia | 100 kΩ (divisor de tensión) |
| Tensión de alimentación | 3.3 V |
| Salida | temp_1 (°C), temp_2 (°C), temp_3 (°C), batería |

## Inventario de dispositivos

### Temperatura y humedad ambiental

| Nombre | Device ID Sigfox | Zona | Descripción |
|---|---|---|---|
| HC-TEMP-HUM-01 | `C0F9F9` | Zona 1 | Sensor temperatura y humedad ambiental en zona 1 |

### Temperatura radiante

| Nombre | Device ID Sigfox | Zona | Descripción |
|---|---|---|---|
| HC-TEMP-RAD-04 | `C0F09C` | Zona 1 | Sensor de temperatura radiante zona 1 cara al cielo |
| HC-SOLAR-RAD-01 | `20320DB` | Zona 1 | Sensor de temperatura radiante zona 1 cara al pavimento |
| HC-SOLAR-RAD-02 | `2031AAC` | Zona 2 | Sensor de temperatura radiante zona 2 cara al pavimento |
| HC-SOLAR-RAD-03 | `2032956` | Zona 3 | Sensor de temperatura radiante zona 3 cara al pavimento |

### Temperatura de pavimento (asfalto)

| Nombre | Device ID Sigfox | Zona | Descripción |
|---|---|---|---|
| HC-TEMP-ASF-01 | `2032029` | Zona 1 | Sensor de temperatura de pavimento zona 1 capa de arriba |
| HC-TEMP-ASF-02 | `2032198` | Zona 1 | Sensor de temperatura de pavimento zona 1 capa de abajo |
| HC-TEMP-ASF-03 | `C0F8CE` | Zona 2 | Sensor de temperatura de pavimento zona 2 |
| HC-TEMP-ASF-04 | `C0FF67` | Zona 2 | Sensor de temperatura de pavimento zona 2 |
| HC-TEMP-ASF-05 | `C0F2D1` | Zona 3 | Sensor de temperatura de pavimento zona 3 |
| HC-TEMP-ASF-06 | `C0F2CF` | Zona 3 | Sensor de temperatura de pavimento zona 3 |

## Configuración del backend Sigfox

### Callback

| Parámetro | Valor |
|---|---|
| Callback type | SERVICE / DATA ADVANCED |
| Channel | URL |
| Url pattern | `https://node-red.tecshm.com/sigfox/bioswale` |
| HTTP Method | POST |
| Send SNI | True |
| Header | `Authorization` |
| Header value | `Basic YWFtaW46c3htX26jX25yXzczOTgq` |
| Content type | `application/json` |

### Body del callback

```json
{
    "device": "{device}",
    "data": "{data}",
    "time": {time},
    "seqNumber": {seqNumber},
    "lqi": "{lqi}",
    "linkQuality": {linkQuality},
    "fixedLat": {fixedLat},
    "fixedLng": {fixedLng},
    "operatorName": "{operatorName}",
    "countryCode": {countryCode},
    "deviceTypeId": "{deviceTypeId}",
    "duplicates": {duplicates},
    "computedLocation": {computedLocation}
}
```

## Flujo Node-RED

![Flujo Node-RED](nodered.png)

El flujo está respaldado en `Node-RED backup/flows.json`. Su estructura es:

1. **HTTP Input** (`POST /sigfox/pirozzini`): Recibe los callbacks del backend Sigfox.
2. **HTTP Response**: Devuelve respuesta al backend Sigfox.
3. **Switch nodes**: Cada sensor tiene un nodo switch que filtra por `msg.payload.device` (device ID Sigfox). El mensaje entrante se envía en paralelo a todos los switches.
4. **Decoder (function nodes)**: Cada switch conecta a una función JavaScript que decodifica la trama hexadecimal del sensor.
5. **InfluxDB Output**: Los datos decodificados se almacenan en InfluxDB (bucket: `pirozzini`, org: `tecnalia`, measurement: `pavimento`).

## Decodificación de tramas

Todos los sensores envían tramas de **12 bytes (24 caracteres hexadecimales)**. La estructura de la trama es:

```
[B][CCCCCCC][DDDDDDD][EEEEEEE][FF]
 │     │         │         │     │
 │     │         │         │     └─ Últimos 2 caracteres (no usados en el cálculo)
 │     │         │         └─ Canal 3: 7 caracteres hex (posiciones 15-21)
 │     │         └─ Canal 2: 7 caracteres hex (posiciones 8-14)
 │     └─ Canal 1: 7 caracteres hex (posiciones 1-7)
 └─ Batería: 1 carácter hex (posición 0)
```

### Cálculo de voltaje y resistencia

Para cada canal:

```
voltaje = parseInt(hexSubstring, 16) / 1000000    (en voltios)
resistencia = 100000 × ((3.3 / voltaje) - 1)      (en ohmios)
```

### Interpolación de temperatura

La temperatura se calcula mediante **interpolación lineal** entre los puntos de la tabla resistencia-temperatura del sensor NTC correspondiente:

```
T = T_superior + (R_entrada - R_superior) × (T_inferior - T_superior) / (R_inferior - R_superior)
```

Donde `R_superior` y `R_inferior` son los valores de resistencia de la tabla que encierran al valor medido.

### Cálculo de humedad (sensor ambiental)

La humedad relativa se calcula a partir del voltaje del canal 2 y la temperatura:

```
humedad = ((V_canal2 - 3.3 × 0.1515) / (3.3 × 0.00636)) × (1.0546 - 0.00216 × T) + ajuste
```

Donde `ajuste` es un offset de calibración (por defecto 0).

## Estructura del proyecto

```
pirozzini/
├── README.md                              # Este archivo
├── Node-RED backup/
│   └── flows.json                         # Backup del flujo Node-RED completo
└── Node-RED decoder/
    ├── temp-hum-ambiental.js              # Decoder: temperatura y humedad ambiental
    ├── temp-hum-ambiental_test.js         # Decoder de test (device ID fijo: C0F9F9)
    ├── temp-radiante.js                   # Decoder: temperatura radiante
    └── temp-asfalto.js                    # Decoder: temperatura de pavimento (3 canales)
```

## Base de datos

| Parámetro | Valor |
|---|---|
| Motor | InfluxDB 2.0 |
| URL | `http://192.168.1.6:8086` |
| Organización | `tecnalia` |
| Bucket | `pirozzini` |
| Measurement | `pavimento` |