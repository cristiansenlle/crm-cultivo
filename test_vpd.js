function calculateVPD(T, RH) {
    const es = 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
    const vpd = es * (1 - RH / 100);
    return parseFloat(vpd.toFixed(2));
}

const T = 25.7;
const RH = 42;
console.log(`T: ${T}, RH: ${RH}%`);
console.log(`VPD: ${calculateVPD(T, RH)} kPa`);
