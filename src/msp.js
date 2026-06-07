function crc8DvbS2(data) {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? (crc << 1) ^ 0xd5 : crc << 1;
      crc &= 0xff;
    }
  }
  return crc;
}

function buildRequest(command, payload = Buffer.alloc(0)) {
  const header = Buffer.from([
    0x24,
    0x58,
    0x3c,
    0x00,
    command & 0xff,
    (command >> 8) & 0xff,
    payload.length & 0xff,
    (payload.length >> 8) & 0xff,
  ]);
  const crcData =
    payload.length > 0
      ? Buffer.concat([header.slice(3), payload])
      : header.slice(3);
  const crc = crc8DvbS2(crcData);
  return Buffer.concat([header, payload, Buffer.from([crc])]);
}

function parseResponse(buf) {
  if (buf[0] !== 0x24 || buf[1] !== 0x58 || buf[2] !== 0x3e) return null;
  const command = buf.readUInt16LE(4);
  const payloadLen = buf.readUInt16LE(6);
  const payload = buf.slice(8, 8 + payloadLen);
  return { command, payload };
}

const COMMANDS = {
  STATUS: 101,
  RAW_GPS: 106,
  ANALOG: 110,
};

module.exports = { buildRequest, parseResponse, COMMANDS };
