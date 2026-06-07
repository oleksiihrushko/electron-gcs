function parseStatus(p) {
  return {
    cycleTime: p.readUInt16LE(0),
    i2cErrors: p.readUInt16LE(2),
    sensors: {
      gyro: !!(p.readUInt16LE(4) & 0x0001),
      accel: !!(p.readUInt16LE(4) & 0x0002),
      baro: !!(p.readUInt16LE(4) & 0x0004),
      compass: !!(p.readUInt16LE(4) & 0x0008),
      gps: !!(p.readUInt16LE(4) & 0x0020),
    },
    flightMode: p.readUInt32LE(6),
    profile: p[10],
  };
}

function parseAnalog(p) {
  return {
    voltage: p[0] / 10,
    mAhDrawn: p.readUInt16LE(1),
    rssi: p.readUInt16LE(3),
    current: p.readInt16LE(5) / 100,
  };
}

const fixTypeMap = ["No fix", "2D fix", "3D fix"];

function parseRawGPS(p) {
  return {
    fixType: fixTypeMap[p[0]] || p[0],
    numSat: p[1],
    lat: p.readInt32LE(2) / 10000000,
    lon: p.readInt32LE(6) / 10000000,
    altitude: p.readInt16LE(10),
    speed: p.readUInt16LE(12) / 100,
    heading: p.readUInt16LE(14) / 10,
  };
}

module.exports = { parseStatus, parseAnalog, parseRawGPS };
