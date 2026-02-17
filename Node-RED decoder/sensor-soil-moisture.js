const lat = 41.41699213293235;
const lon = 2.1352364970297626;
const description = 'sensor de humedad del terreno (vwc)';
const device = 'HC-SOIL-BIO-01';
const tipo = 'HC-SOIL-BIO'
const deviceID = msg.payload.device;
const unit = 'm3/m3'; // Volumetric Water Content

function decodeHexString(hexString) {

    // Validación: La trama 'hexString' debe tener 24 caracteres (12 bytes)
    if (typeof hexString !== 'string' || hexString.length !== 24) {
        return `Trama descartada: la trama de datos ('${hexString}') no tiene 24 caracteres.`;
    }

    let battery = `${parseInt(hexString[0], 16)}i`;
    const channelOneVoltage = parseInt(hexString.substring(1, 8), 16) / 1000000;

    if (channelOneVoltage == 0) return null;

    const vwc = getVWC(channelOneVoltage);

    return [{
        battery,
        vwc,
        lat,
        lon
    },
    {
        description,
        device,
        deviceID,
        tipo,
        unit
    }];
}

/**
 * Calcula el Contenido Volumétrico de Agua (VWC).
 * Fórmula: VWC = 4.824e-10 * mV^3 - 2.278e-6 * mV^2 + 3.898e-3 * mV - 2.154
 * Donde mV = Voltage * 1000
 * Límites: Min 0, Max 0.90
 *
 * @param {number} inputVoltage - El valor del voltaje en Voltios.
 * @returns {number|null} El VWC en m3/m3.
 */
function getVWC(inputVoltage) {
    // Verificación de seguridad
    if (typeof inputVoltage !== 'number' || isNaN(inputVoltage)) {
        return null;
    }

    // La fórmula requiere Vread * 1000 (es decir, milivoltios)
    const mv = inputVoltage * 1000;

    // Aplicación de la fórmula polinómica
    // VWC = A*x^3 - B*x^2 + C*x - D
    let calculatedVWC = 
        (4.824 * Math.pow(10, -10) * Math.pow(mv, 3)) - 
        (2.278 * Math.pow(10, -6)  * Math.pow(mv, 2)) + 
        (3.898 * Math.pow(10, -3)  * mv) - 
        2.154;

    // Aplicar límites (Clamping)
    // MAX: 0.90 m3/m3
    // MIN: 0 m3/m3
    if (calculatedVWC > 0.90) {
        calculatedVWC = 0.90;
    } else if (calculatedVWC < 0) {
        calculatedVWC = 0.0;
    }

    // Opcional: Redondear a 4 decimales para limpieza
    return parseFloat(calculatedVWC.toFixed(4));
}

const hexString = msg.payload.data;
// Validación: La trama 'hexString' debe tener 24 caracteres (12 bytes)
if (typeof hexString !== 'string' || hexString.length !== 24) {
    return null;
}
const decodedData = decodeHexString(hexString);
msg.payload = decodedData;
return msg;