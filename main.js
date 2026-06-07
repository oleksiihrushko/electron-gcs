const { app, BrowserWindow, ipcMain } = require("electron");
const { SerialPort } = require("serialport");
const path = require("path");
const { buildRequest, parseResponse, COMMANDS } = require("./src/msp");
const { parseStatus, parseAnalog, parseRawGPS } = require("./src/parsers");

let mainWindow;
let port;
let buffer = Buffer.alloc(0);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  mainWindow.loadFile("index.html");
}

function connectFC() {
  port = new SerialPort({ path: "COM3", baudRate: 115200 });

  port.on("open", () => {
    console.log("FC підключено");
    const poll = () => {
      if (port.isOpen) {
        port.write(buildRequest(COMMANDS.STATUS));
        port.write(buildRequest(COMMANDS.ANALOG));
        port.write(buildRequest(COMMANDS.RAW_GPS));
      }
    };
    poll();
    setInterval(poll, 1000);
  });

  port.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 9) {
      const payloadLen = buffer.readUInt16LE(6);
      const totalLen = 9 + payloadLen;
      if (buffer.length < totalLen) break;

      const frame = buffer.slice(0, totalLen);
      buffer = buffer.slice(totalLen);
      const response = parseResponse(frame);
      if (!response) continue;

      if (response.command === COMMANDS.STATUS) {
        const d = parseStatus(response.payload);
        mainWindow?.webContents.send("telemetry", { type: "status", data: d });
      }
      if (response.command === COMMANDS.ANALOG) {
        const d = parseAnalog(response.payload);
        mainWindow?.webContents.send("telemetry", { type: "analog", data: d });
      }
      if (response.command === COMMANDS.RAW_GPS) {
        const d = parseRawGPS(response.payload);
        mainWindow?.webContents.send("telemetry", { type: "gps", data: d });
      }
    }
  });

  port.on("error", (err) => console.error("Помилка:", err.message));
}

app.whenReady().then(() => {
  createWindow();
  connectFC();
});

app.on("window-all-closed", () => app.quit());
