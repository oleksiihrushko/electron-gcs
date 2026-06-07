const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fcAPI", {
  onTelemetry: (callback) =>
    ipcRenderer.on("telemetry", (_, data) => callback(data)),
});
