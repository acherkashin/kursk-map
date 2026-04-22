# Project Overview
Single-app frontend на `Vite + React + TypeScript` для интерактивной карты лучших мест Курской области. Приложение показывает карту с точками интереса и открывает карточку выбранного места с описанием, адресом и ссылкой на подробности. Данные и статические ассеты живут внутри репозитория и готовятся локально.

# Implementation Notes
- Карта использует `MapLibre`: до `zoom < 15` отображаются GeoJSON points со встроенной кластеризацией, `clusterMaxZoom = 14`, а с `zoom >= 15` обычные point/cluster layers скрываются и вместо них показываются отдельные `photo-marker`.
- Это переключение нужно для оптимизации: на дальних масштабах карта работает с агрегированными точками и не перегружается сотнями DOM-маркеров, а на ближнем масштабе richer photo markers создаются только для точек, попавших в текущий `bounds`.
- Базовый стиль карты должен оставаться минималистичным и малошумным. В локальном стиле `custom` сейчас видны подписи водных объектов, major/minor roads и place labels для `village`, `town`, `city`, `state`.
- В локальном стиле скрыты `airport`, `label_other`, `country` labels и `highway-name-path`.
- Для текстовых подписей используется правило `coalesce(name:ru, name)`: русский язык приоритетный, `name` служит fallback.

# Project Structure
```text
.
├── DESIGN_SYSTEM.md              # standalone спецификация будущей UI дизайн-системы
├── src/                           # основной код приложения
│   ├── components/                # UI-компоненты карты и боковой панели
│   └── test/                      # test setup и вспомогательная тестовая инфраструктура
├── public/                        # статические ассеты приложения
│   ├── map-styles/                # MapLibre style JSON для базовой карты
│   └── place-thumbnails/          # миниатюры для photo markers и карточек
├── e2e/                           # Playwright e2e-сценарии
└── scripts/                       # служебные скрипты подготовки данных и ассетов
```

- Top-level конфиги приложения существуют в корне репозитория; используй их как точки входа для настройки сборки, TypeScript и e2e.

# Commands
- `npm run dev` — локальный запуск Vite dev server.
- `npm run build` — production build через `tsc -b && vite build`.
- `npm run preview` — локальный просмотр собранного production bundle.
- `npm run test` — запуск unit/integration tests через Vitest.
- `npm run test:e2e` — запуск e2e tests через Playwright.
- `npm run generate:thumbnails` — пересборка миниатюр из скрипта `scripts/generate-thumbnails.mjs`.

# Conventions
- Не добавляй `position: relative` к `.photo-marker`: это ломает позиционирование на карте и раскрытие кластеров.
- Не переноси нормализацию сырых данных в UI-компоненты; преобразование данных должно оставаться в `src/data.ts`.
- E2E test hooks открывай только через `?e2e=1`; не делай их доступными в обычном runtime.
- JSON-стили в `public/map-styles/` поддерживай минималистичными и с русским label fallback через `coalesce(name:ru, name)`.

# Boundaries
## MUST
- Обновляй `AGENTS.md`, если меняется структура проекта, набор команд или критичные ручные ограничения.
- При изменениях карты сохраняй оптимизационную схему: aggregation на дальнем зуме, photo markers только на ближнем и только для видимых точек.

## ASK
- Спрашивай перед добавлением новых npm-зависимостей.
- Спрашивай перед изменением формата исходных данных, пайплайна миниатюр или принципа переключения clusters/markers.
- Спрашивай перед изменением набора видимых label layers в стиле карты.

## MUST NOT
- Не добавляй `position: relative` к `.photo-marker`.
- Не возвращай скрытые label layers и не делай карту визуально шумнее без согласования.
