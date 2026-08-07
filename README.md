# Baklava Shell

**Baklava** — лёгкая ОС-подобная оболочка для браузера в стиле Material Design 3, вдохновлённая дизайном Caelestia Shell.

## Структура проекта

```
/
├── index.html              # Главный HTML-файл
├── css/
│   └── styles.css          # Все стили (MD3 + кастомные)
├── js/
│   ├── main.js             # Точка входа
│   ├── core/
│   │   ├── BaklavaCore.js      # Ядро системы
│   │   ├── StorageManager.js   # Хранение состояния
│   │   └── ThemeManager.js     # Темы и акценты
│   └── managers/
│       ├── FrameManager.js     # SVG рамка с инвертированной заливкой
│       ├── PanelManager.js     # Панели (drawers) и левый бар
│       ├── WindowManager.js    # Оконная система
│       ├── PopupManager.js     # Всплывающие окна
│       ├── AppManager.js       # Управление приложениями
│       ├── PermissionManager.js# Система разрешений
│       ├── NotificationManager.js# Уведомления
│       ├── WidgetManager.js    # Виджеты рабочего стола
│       ├── ModalManager.js     # Модальные окна
│       └── ScreenManager.js    # Навигация по экранам
├── assets/
│   ├── icons/              # Иконки приложений
│   └── fonts/              # Шрифты
└── README.md               # Этот файл
```

## Особенности

### Дизайн (Material Design 3 + Caelestia)
- **Единая SVG рамка** с инвертированной заливкой (чёрная в тёмной теме, белая в светлой)
- **Левая панель (Bar)** — часть рамки без собственного фона
- **Панели (Drawers)** — выезжают/вытягиваются без фона, объединяются в общий контур рамки
- **Анимации** с пружинной кривой `cubic-bezier(0.2, 0.9, 0.4, 1)`
- **Тёмная/светлая тема** с полным набором MD3 цветовых ролей
- **Настраиваемый акцентный цвет**

### Оконная система
- Создание, закрытие, сворачивание окон
- Перетаскивание за заголовок
- Изменение размера
- Fullscreen режим
- Анимации открытия/закрытия
- Таблетка состояния в заголовке

### Панели
| Панель | Сторона | Тип | Размеры |
|--------|---------|-----|---------|
| Уведомления | Правая, сверху | Вытягивание | 380px × 70% |
| Быстрые настройки (QS) | Правая, снизу | Вытягивание | 420px × 60% |
| Launcher | Нижняя | Вытягивание | 80% × 65% |
| Меню питания | Правая, центр | Вытягивание | 280px × авто |
| Громкость | Правая, низ | Наведение | 240px × авто |
| Modules | Верхняя | Вытягивание | 80% × 50% |

### Система разрешений
Приложения работают в изолированном контексте и должны запрашивать разрешения:
- `notifications` — показ уведомлений
- `internet` — доступ к сети
- `storage` — локальное хранилище
- `camera` — камера
- `microphone` — микрофон
- `geolocation` — геолокация
- `system_overlay` — системное перекрытие

### API для приложений
```javascript
api.requestPermission('notifications') // Promise<boolean>
api.notify({ title, text, icon, app }) // id
api.window.setTitle(title)
api.window.setStatusTab(label, icon)
api.tray.addIcon({ id, icon, label })
api.widgets.register({ id, name, content, interval })
api.screens.push({ id, title, content })
api.modal.show({ title, message, buttons })
api.storage.set(key, value)
api.storage.get(key)
```

## Запуск

Просто откройте `index.html` в современном браузере (Chrome, Firefox, Edge).

**Требуется:**
- Поддержка ES6 модулей
- Локальный сервер рекомендуется (из-за CORS для модулей)

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Затем откройте `http://localhost:8000`

## Сохранение состояния

Все настройки сохраняются в `localStorage` под ключом `baklava_state`:
- Позиции иконок рабочего стола
- Позиции виджетов
- Разрешения приложений
- Настройки панелей (режимы открытия)
- Тема (тёмная/светлая)
- Акцентный цвет
- Обои
- Радиус скругления рамки

## Настройка

### Изменение радиуса скругления рамки
```javascript
window.baklava.frame.setCornerRadius(32);
```

### Переключение темы
```javascript
window.baklava.theme.setTheme('light');
window.baklava.theme.toggleTheme();
```

### Установка акцентного цвета
```javascript
window.baklava.theme.setAccentColor('#FF6B6B');
```

### Сброс состояния
```javascript
window.baklava.reset();
```

## Лицензия

MIT License

---

**Baklava** — это проект с открытым исходным кодом, созданный для демонстрации возможностей современных веб-технологий в создании десктопных интерфейсов.
