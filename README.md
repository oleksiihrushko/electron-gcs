# electron-gcs

Десктопна наземна станція керування (GCS) для дронів на базі Electron.
Підключається до flight controller по USB/UART і відображає телеметрію в реальному часі.

---

## Можливості

- Live-дашборд: напруга, струм, витрата mAh
- Статус FC: cycle time, I2C помилки, активні сенсори
- GPS: тип фіксу, кількість супутників, висота
- Графік напруги в реальному часі (останні 60 точок, Chart.js)
- Колірна індикація рівня батареї (зелений / жовтий / червоний)

---

## Вимоги

- Node.js 18+
- Flight controller з увімкненим MSP на UART (iNAV, Betaflight)
- Підключення FC до ПК по USB

---

## Встановлення

```bash
git clone https://github.com/oleksiihrushko/electron-gcs
cd electron-gcs
npm install
```

---

## Налаштування

Відкрий `main.js` і вкажи свій COM-порт:

```js
port = new SerialPort({ path: "COM3", baudRate: 115200 });
```

На Linux/macOS порт виглядає як `/dev/ttyUSB0` або `/dev/tty.usbserial-*`.

---

## Запуск

```bash
npm start
```

---

## Структура проєкту

```
electron-gcs/
├── main.js          # Electron main process: вікно, SerialPort, MSP polling
├── preload.js       # контекстний міст між main і renderer (contextIsolation)
├── index.html       # UI: дашборд, графік, логіка рендера
├── src/
│   ├── msp.js       # MSP V2 парсер: buildRequest(), parseResponse(), COMMANDS
│   └── parsers.js   # парсери payload: parseStatus(), parseAnalog(), parseRawGPS()
└── package.json
```

### Архітектура

```
FC (iNAV)
  └── USB/UART
        └── SerialPort (main process)
              └── MSP V2 parser
                    └── IPC: webContents.send("telemetry")
                          └── preload.js → fcAPI.onTelemetry()
                                └── index.html (renderer) → Chart.js / DOM
```

Main process опитує FC кожну **1 секунду** (STATUS, ANALOG, RAW\_GPS), парсить відповіді і передає дані в renderer через Electron IPC. Renderer оновлює UI і графік без перезавантаження.

---

## Індикація батареї

| Напруга     | Колір   | Стан              |
|-------------|---------|-------------------|
| ≥ 11.1V     | білий   | нормальний         |
| 10.5–11.1V  | жовтий  | низький заряд      |
| < 10.5V     | червоний| критичний рівень   |

Пороги розраховані для 3S LiPo (3 × 3.5V / 3.7V / 4.2V).

---

## Залежності

| Пакет        | Версія  | Призначення                     |
|--------------|---------|---------------------------------|
| `serialport` | ^13.0.0 | читання даних з UART/USB        |
| `chart.js`   | ^4.5.1  | графік напруги в реальному часі |
| `electron`   | ^42.1.0 | десктопний shell (devDep)       |

---

## Зв'язок з msp-client

[msp-client](https://github.com/oleksiihrushko/msp-client) — консольна версія цього ж парсера без Electron. Зручна для швидкої діагностики FC в терміналі. Модулі `msp.js` і `parsers.js` спільні між обома проєктами.
