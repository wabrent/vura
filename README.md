# PolyEdge Quant Terminal

Аналитический терминал для работы с prediction market платформой **Polymarket**.

## 🚀 Возможности

### Реальные данные (v4.0)
- **Alpha Score** — расчёт на основе объёма, волатильности и времени до завершения рынка
- **Arbitrage Gap** — сравнение implied probability с реальными ценами Binance
- **Spread** — арбитражный спред бинарных исходов (Yes + No - 1)
- **Whale Flow** — отслеживание крупных транзакций в реальном времени

### Фильтрация и поиск
- Категории: Crypto, Politics, Sports
- Поиск по названию рынка
- Экспорт сигналов в CSV

### Интеграции
- **Polymarket API** — данные о рынках и сделках
- **Binance API** — цены криптоактивов

---

## 📁 Структура проекта

```
polyedge-main/
├── index.html          # UI терминала
├── app.js              # Основная логика (real-time данные)
├── styles.css          # Стили (cyberpunk/trading terminal)
├── vercel.json         # Конфиг для Vercel
├── logo.png            # Логотип
├── .gitignore          # Игнорируемые файлы
└── api/
    └── proxy.js        # Serverless функция для CORS proxy
```

---

## 🛠️ Установка и запуск

### Локально (Live Server)
```bash
# Открой index.html в браузере или используй Live Server
# VS Code: установи расширение "Live Server" → Right Click → Open with Live Server
```

### Деплой на Vercel
```bash
# 1. Установи Vercel CLI
npm i -g vercel

# 2. Задеплой
vercel

# Или подключи репозиторий на vercel.com
```

---

## 📊 Как работает

### Alpha Score
```
Базовый: 5.0
+ Объём торгов: до +2 (> $1M = +2)
+ Волатильность: до +2 (>15% = +2)
+ Время до завершения: до +1 (<24ч = +1)
─────────────────────────────────────
Максимум: 10.0
```

### Arbitrage Gap
```
Gap = (impliedProb × 100 - 50) - (Binance 24h change / 10)

Где:
- impliedProb = цена Yes на Polymarket
- Положительный Gap = потенциальная арбитражная возможность
```

### Spread
```
Spread = |Yes Price + No Price - 1|

- Spread > 0.02 (2¢) = ⚠️ ARB сигнал
- Spread < 0.02 = ✓ (норма)
```

### Whale Flow
```
- Мониторит топ-5 активных рынков
- Загружает последние сделки через Polymarket API
- Показывает сделки ≥ $10,000
- 🔥 WHALE = сделки ≥ $50,000
```

---

## ⚙️ Конфигурация

В `app.js` можно настроить:

```javascript
const CONFIG = {
    API: "https://gamma-api.polymarket.com/events?...",
    PROXY: "/api/proxy?url=",
    REFRESH: 12000,              // Обновление данных (мс)
    WHALE_THRESHOLD_USD: 10000   // Порог для whale алерта
};
```

---

## 📝 Лицензия

MIT

---

## 📬 Контакты

Telegram: [@waabrent](https://t.me/waabrent)
