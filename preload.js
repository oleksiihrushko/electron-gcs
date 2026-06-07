const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fcAPI", {
  // Телеметрія — для index.html
  onTelemetry: (callback) =>
    ipcRenderer.on("telemetry", (_, data) => callback(data)),

  // Статус підключення — для index.html
  onPortConnected: (callback) =>
    ipcRenderer.on("port-connected", (_, data) => callback(data)),
  onPortDisconnected: (callback) =>
    ipcRenderer.on("port-disconnected", () => callback()),
  onPortError: (callback) =>
    ipcRenderer.on("port-error", (_, msg) => callback(msg)),

  // Вибір порту — для select-port.html
  getPorts: () => ipcRenderer.invoke("get-ports"),
  connectPort: (opts) => ipcRenderer.send("connect-port", opts),
  cancelSelect: () => ipcRenderer.send("cancel-select"),
});
