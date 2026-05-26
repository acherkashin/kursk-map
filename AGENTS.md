# Project Overview
Single-app frontend на `Vite + React + TypeScript` для интерактивной карты лучших мест Курской области. Приложение показывает карту с точками интереса и открывает карточку выбранного места с описанием, адресом и ссылкой на подробности. Данные и статические ассеты живут внутри репозитория и готовятся локально.

# Implementation Notes
- Карта использует `MapLibre`: до `zoom < 15` отображаются GeoJSON points со встроенной кластеризацией, `clusterMaxZoom = 14`, а с `zoom >= 15` обычные point/cluster layers скрываются и вместо них показываются отдельные `photo-marker`.
- Это переключение нужно для оптимизации: на дальних масштабах карта работает с агрегированными точками и не перегружается сотнями DOM-маркеров, а на ближнем масштабе richer photo markers создаются только для точек, попавших в текущий `bounds`.
- Базовый стиль карты должен оставаться минималистичным и малошумным. Видимые слои подписей: водные объекты, главные и второстепенные дороги, топонимы населённых пунктов уровня village / town / city / state.
- Скрытые слои подписей: аэропорты, служебные метки (country, прочие второстепенные), подписи пешеходных маршрутов.
- Для текстовых подписей приоритет — русское название; при его отсутствии используется значение поля `name`.

# Project Structure
```text
.
├── DESIGN_SYSTEM.md              # standalone спецификация будущей UI дизайн-системы
├── src/                           # основной код приложения
│   ├── components/                # UI-компоненты карты и боковой панели
│   ├── featured-objects.json      # дефолтный короткий набор меток
│   ├── all-objects.json           # полный старый набор меток для ?dataset=all
│   ├── dozapravka-objects.json    # подборка do zapravka для ?dataset=dozapravka
│   └── test/                      # test setup и вспомогательная тестовая инфраструктура
├── public/                        # статические ассеты приложения
│   ├── map-styles/                # MapLibre style JSON для базовой карты
│   └── place-thumbnails/          # миниатюры для photo markers и карточек
├── e2e/                           # Playwright e2e-сценарии
├── supabase/                      # SQL setup scripts and Edge Functions for external Supabase project state
│   └── functions/                 # Supabase Edge Functions used by auth/backend adapters
├── .codex/skills/                  # локальные для репозитория Codex skills
└── scripts/                       # служебные скрипты подготовки данных и ассетов
```

- Top-level конфиги приложения существуют в корне репозитория; используй их как точки входа для настройки сборки, TypeScript и e2e.
- Для новых компонентов и для компонентов, которые существенно перерабатываются, придерживайся папочной структуры внутри `src/components/`:

```text
ComponentName/
├── ComponentName.tsx
├── ComponentName.css
└── index.tsx
```

- Это правило задаёт целевую структуру для новых и заметно изменяемых компонентов, но не требует немедленного рефактора всех текущих плоских файлов в `src/components/`.

# Commands
- `npm run dev` — локальный запуск Vite dev server.
- `npm run build` — production build через `tsc -b && vite build`.
- `npm run preview` — локальный просмотр собранного production bundle.
- `npm run test` — запуск unit/integration tests через Vitest.
- `npm run test:e2e` — запуск e2e tests через Playwright.
- `npm run generate:thumbnails` — пересборка миниатюр из скрипта `scripts/generate-thumbnails.mjs`.
- `supabase functions deploy yandex-userinfo --no-verify-jwt` — деплой адаптера Yandex userinfo для Supabase Auth.

# Conventions
- Не переноси нормализацию сырых данных в UI-компоненты; преобразование данных должно оставаться в `src/data.ts`.
- По умолчанию приложение использует `src/featured-objects.json`; полный старый набор из `src/all-objects.json` открывается через `?dataset=all`, подборка do zapravka из `src/dozapravka-objects.json` — через `?dataset=dozapravka`.
- E2E test hooks открывай только через `?e2e=1`; не делай их доступными в обычном runtime.
- E2E tests пиши только для критических пользовательских путей; не покрывай ими каждую мелкую деталь интерфейса по умолчанию.
- Перед добавлением любых тестов отдельно перепроверь, действительно ли изменению нужно тестовое покрытие.
- Не предполагай unit/integration/e2e покрытие автоматически: сначала уточни, какие именно тесты нужно написать.
- JSON-стили в `public/map-styles/` поддерживай минималистичными и с русским label fallback через `coalesce(name:ru, name)`.
- Edge Functions в `supabase/functions/` не должны хранить секреты в коде; для публичных auth callbacks отключай JWT verification только если внешний сервис передаёт не Supabase JWT.

# Engineering Principles
- Strictly follow SOLID, KISS, and DRY principles.
- Prefer readability and maintainability over clever solutions.
- Avoid premature optimization, but do not write obviously inefficient code.
- Keep functions and React components small, focused, and single-purpose.
- Do not mix business logic with UI logic; React components should focus on rendering and UI composition.
- Move non-trivial business logic into hooks, helper files, classes, or focused abstractions when it makes responsibilities clearer.
- Do not introduce new abstractions unless they provide clear value for the current code.
- Handle edge cases explicitly.
- Respect existing project conventions and patterns.

# Boundaries
## MUST
- Обновляй `AGENTS.md`, если меняется структура проекта, набор команд или критичные ручные ограничения.
- При изменениях карты сохраняй оптимизационную схему: aggregation на дальнем зуме, photo markers только на ближнем и только для видимых точек.
- md файлы должны быть на русском

## ASK
- Спрашивай перед добавлением новых npm-зависимостей.
- Спрашивай, нужны ли вообще тесты для конкретного изменения, и какие именно тесты писать, прежде чем добавлять новое покрытие.
- Спрашивай перед изменением формата исходных данных, пайплайна миниатюр или принципа переключения clusters/markers.
- Спрашивай перед изменением набора видимых label layers в стиле карты.

## MUST NOT
- Не возвращай скрытые label layers и не делай карту визуально шумнее без согласования.
