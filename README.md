# Учёт заявок 2-й волны — Программа трансляционных исследований ЦУ

Локальное одностраничное приложение для учёта заявок 2-й волны отбора.
Данные хранятся в браузере (IndexedDB + резерв в localStorage) и никуда не отправляются.

## Структура

```
index.html            — каркас и разметка
styles.css            — все стили
config.js             — справочники, статусы, дедлайны, правила (правит непрограммист)
app.js                — логика приложения
lib/xlsx.full.min.js  — локальная библиотека SheetJS (импорт/экспорт Excel)
tools/build.py        — сборка единого офлайн-HTML
dist/                 — собранные файлы (в .gitignore, генерируется)
```

## Запуск локально

Приложение работает как обычные статические файлы, сервер не нужен
для работы базовых функций, но для корректной работы IndexedDB лучше
запускать через локальный сервер:

```bash
python3 -m http.server 8000
# затем открыть http://localhost:8000/
```

Либо просто открыть `index.html` двойным кликом — работает тоже
(в режиме file:// IndexedDB может быть недоступна, тогда включается
резервное хранилище localStorage — функциональность сохраняется).

## Публикация (GitHub Pages)

1. Settings → Pages → Deploy from a branch → Branch: `main`, `/ (root)` → Save.
2. Через ~1 минуту приложение доступно по адресу:
   `https://as-delekeev.github.io/transresearch-CU/`

Библиотека SheetJS лежит локально в `lib/`, поэтому Pages работает офлайн-независимо.

## Офлайн-файл для раздачи (единый HTML)

```bash
python3 tools/build.py
# получится dist/transresearch-wave2-offline.html — один файл, открывается двойным кликом
```

## Типовые правки без программиста

Открыть `config.js`, изменить значение, обновить страницу (Ctrl+F5):

- дедлайн подачи — `CONFIG.app.deadlineSubmit`;
- окно презентаций — `CONFIG.app.presentationsWindow`;
- правила программы — `CONFIG.rules` (лимиты бюджета, ФОТ, накладных, TRL);
- статусы — `CONFIG.statuses`; релевантность — `CONFIG.relevance`;
- корпорации и приоритеты — `CONFIG.corporations`;
- карта направлений — `CONFIG.directionMap`, `CONFIG.directions`, `CONFIG.genFormToMap`.

## Данные

- Хранилище: IndexedDB (`transresearch_wave2`), fallback — localStorage.
- Резервная копия и восстановление: экран «Импорт / экспорт» → JSON.
- Снимок «только для чтения»: там же, отдельный автономный HTML.
