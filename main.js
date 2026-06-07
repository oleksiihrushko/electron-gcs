const { app, BrowserWindow, ipcMain } = require("electron");
const { SerialPort } = require("serialport");
const path = require("path");
const { buildRequest, parseResponse, COMMANDS } = require("./src/msp");
const { parseStatus, parseAnalog, parseRawGPS } = require("./src/parsers");

let mainWindow;
let selectWindow;
let port;
let buffer = Buffer.alloc(0);
let pollInterval;

// ── ВІКНО ВИБОРУ ПОРТУ ──────────────────────────────────
function createSelectWindow() {
  selectWindow = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  selectWindow.loadFile("select-port.html");
  selectWindow.setMenuBarVisibility(false);
}

// ── ГОЛОВНЕ ВІКНО GCS ───────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  mainWindow.loadFile("index.html");
}

// ── ПІДКЛЮЧЕННЯ ДО FC ───────────────────────────────────
function connectFC(portPath, baudRate) {
  buffer = Buffer.alloc(0);
  port = new SerialPort({ path: portPath, baudRate });

  port.on("open", () => {
    console.log(`FC підключено: ${portPath} @ ${baudRate}`);

    // Повідомити renderer про успішне підключення
    mainWindow?.webContents.send("port-connected", { portPath, baudRate });

    const poll = () => {
      if (port.isOpen) {
        port.write(buildRequest(COMMANDS.STATUS));
        port.write(buildRequest(COMMANDS.ANALOG));
        port.write(buildRequest(COMMANDS.RAW_GPS));
      }
    };
    poll();
    pollInterval = setInterval(poll, 1000);
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

  port.on("error", (err) => {
    console.error("Помилка порту:", err.message);
    mainWindow?.webContents.send("port-error", err.message);
  });

  port.on("close", () => {
    clearInterval(pollInterval);
    mainWindow?.webContents.send("port-disconnected");
  });
}

// ── IPC HANDLERS ────────────────────────────────────────

// Renderer запитує список доступних портів
ipcMain.handle("get-ports", async () => {
  const ports = await SerialPort.list();
  return ports;
});

// Renderer обрав порт — підключаємось і відкриваємо GCS
ipcMain.on("connect-port", (_, { portPath, baudRate }) => {
  selectWindow?.close();
  selectWindow = null;
  createMainWindow();
  // Невелика затримка щоб вікно встигло завантажитись
  mainWindow.webContents.once("did-finish-load", () => {
    connectFC(portPath, baudRate);
  });
});

// Renderer закрив вікно вибору без підключення
ipcMain.on("cancel-select", () => {
  app.quit();
});

// ── СТАРТ ───────────────────────────────────────────────
app.whenReady().then(() => {
  createSelectWindow();
});

app.on("window-all-closed", () => app.quit());
