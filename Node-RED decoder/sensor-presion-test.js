const lat = 41.41699213293235;
const lon = 2.1352364970297626;
const description = 'sensor de presión de agua';
const device = 'HC-KUBIK-BAR-LEV';
const tipo = 'HC-BAR'
const deviceID = 'hola';
const unit = 'mm';

function decodeHexString(hexString) {

    // Validación: La trama 'hexString' debe tener 24 caracteres (12 bytes)
    if (typeof hexString !== 'string' || hexString.length !== 24) {
        return `Trama descartada: la trama de datos ('${hexString}') no tiene 24 caracteres.`;
    }

    let battery = `${parseInt(hexString[0], 16)}i`;
    const channelOneVoltage = parseInt(hexString.substring(1, 8), 16) / 1000000;

    if (channelOneVoltage == 0) return null;

    const altura = getAltitude(channelOneVoltage);

    return [{
        battery,
        altura,
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
 * Calcula la altura de presión de la columna de agua.
 * Fórmula basada en Excel: = (1.4 * G8) + 0.004
 *
 * @param {number} inputVoltage - El valor del voltage para el cual se quiere encontrar la altura.
 * @returns {number|null} La altura en mm.
 */
function getAltitude(inputVoltage) {
    // Verificación de seguridad: si no es un número, devolvemos null
    if (typeof inputVoltage !== 'number' || isNaN(inputVoltage)) {
        return null;
    }
    return ((1.4 * inputVoltage) + 0.004) * 1000;
}

const hexString = "5000a3b00000000000000000";
// Validación: La trama 'hexString' debe tener 24 caracteres (12 bytes)
if (typeof hexString !== 'string' || hexString.length !== 24) {
    return null;
}
const decodedData = decodeHexString(hexString);
console.log(decodedData);