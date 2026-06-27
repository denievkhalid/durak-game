# Требования к коду — DurakJS

Документ задаёт обязательные правила разработки проекта. Все PR и новый код должны им соответствовать.

---

## 1. Стек

| Слой | Технология |
|------|------------|
| UI | React 18+ |
| Язык | TypeScript (strict) |
| Сборка | Vite |
| Стили | Tailwind CSS |
| Состояние UI | Zustand |
| Тесты | Vitest |
| Линтинг | ESLint + Prettier |

Картинки карт на MVP не используются — только текстовое/CSS-представление (`rank` + `suit`).

---

## 2. Архитектура

### 2.1. Два контура

```
┌─────────────────────────────────────┐
│  app/ → pages/ → widgets/           │  React UI (FSD-lite)
│       → features/ → entities/       │
│       → shared/                     │
└──────────────┬──────────────────────┘
               │ DTO in / DTO out
┌──────────────▼──────────────────────┐
│  engine/                            │  Чистая логика (без React/DOM)
│    modules/ workflows/ core/        │
└─────────────────────────────────────┘
```

- **`engine/`** — источник истины для правил игры. Не импортирует React, Tailwind, Zustand, browser API.
- **UI-слои (FSD-lite)** — отображение, ввод пользователя, анимации, роутинг.

### 2.2. FSD-lite (не strict FSD)

Используем **правило импортов** и **разделение по ответственности**, без dogmatic slices на каждый файл.

```
src/
  app/           # bootstrap, providers, router, global styles
  pages/         # route-level композиция
  widgets/       # крупные блоки (GameBoard, PlayerPanel)
  features/      # user actions (play-card, take-cards, pass-round)
  entities/      # доменные UI-сущности (Card, Player, Deck)
  shared/        # ui-kit, lib, config, types для UI
  engine/        # игровая логика (исключение из FSD)
```

### 2.3. Направление зависимостей

```
app → pages → widgets → features → entities → shared
features → engine
engine ↛ UI (запрещено)
entities ↛ features (запрещено)
shared ↛ entities (запрещено)
```

Нарушение границ слоёв — блокер для merge.

### 2.4. URL и роутинг (apps/game)

Онлайн-игра открывается по адресу:

```
/game/:id
```

где `id` — MongoDB `_id` партии из API (`POST /games`).

| URL | Страница | Назначение |
|-----|----------|------------|
| `/` | Home | Лобби, создание игры |
| `/game/:id` | Game | Игра + восстановление после F5 |

Константы маршрутов — в `shared/config/routes.ts` (`ROUTES.game(id)`), не строки inline.

После создания лобби клиент делает `navigate(ROUTES.game(gameId))`. При загрузке `/game/:id` — `GET /games/:id` и `game:join` по сокету.

---

## 3. Паттерны проектирования (по мотивам MedusaJS)

MedusaJS используется как **референс архитектурных идей**, не как фреймворк. Переносим адаптированные паттерны:

### 3.1. Module isolation (изоляция модулей)

Каждый engine-модуль — самодостаточный домен с одной зоной ответственности.

```
engine/modules/
  deck/       # колода, перемешивание, раздача
  hand/       # рука игрока
  table/      # стол (атака / защита)
  turn/       # очерёдность хода
  rules/      # валидация ходов
```

**Правила:**

- Модуль **не импортирует** другие engine-модули напрямую.
- Межмодульная координация — только через **workflows** (см. §3.2).
- Публичный API модуля — через `index.ts` (barrel export).
- Внутренние детали не экспортируются.

```typescript
// ✅ engine/workflows/play-card.ts
import { validatePlayStep } from "./steps/validate-play-step"
import { applyPlayStep } from "./steps/apply-play-step"

// ❌ engine/modules/hand/hand-service.ts
import { TableService } from "../table/table-service" // cross-module import
```

### 3.2. Workflows (сценарии / use cases)

Многошаговые действия оформляются как workflow — аналог `core-flows` в Medusa.

```
engine/workflows/
  start-game.ts
  play-card.ts
  defend-card.ts
  throw-in-card.ts
  take-cards.ts
  pass-round.ts
```

**Структура workflow:**

1. Validate — проверка входных данных и правил.
2. Transform — подготовка данных для мутации.
3. Apply — изменение состояния (чистая функция или сервис).
4. Emit — публикация доменного события (при успехе).

```typescript
type WorkflowResult<TState, TView> =
  | { ok: true; state: TState; view: TView; events: DomainEvent[] }
  | { ok: false; error: GameError }

function playCardWorkflow(
  state: GameState,
  input: PlayCardDTO
): WorkflowResult<GameState, GameViewDTO> {
  const validation = validatePlayStep(state, input)
  if (!validation.ok) return validation

  const nextState = applyPlayStep(state, input)
  const view = toGameViewDTO(nextState, input.playerId)
  const events = buildPlayEvents(state, nextState, input)

  return { ok: true, state: nextState, view, events }
}
```

Workflow — **единственное место**, где координируются несколько engine-модулей.

### 3.3. Service layer (сервисы домена)

Логика внутри модуля инкапсулируется в сервисах с явным интерфейсом.

```typescript
// engine/modules/deck/types.ts
interface IDeckService {
  create(shuffled?: boolean): Deck
  draw(deck: Deck, count: number): { deck: Deck; cards: Card[] }
  peekTrump(deck: Deck): Card | null
}

// engine/modules/deck/deck-service.ts
class DeckService implements IDeckService {
  create(shuffled = true): Deck { /* ... */ }
  draw(deck: Deck, count: number) { /* ... */ }
  peekTrump(deck: Deck): Card | null { /* ... */ }
}
```

**Правила сервисов (по мотивам MedusaService):**

- Публичные методы — тонкие: валидация → делегирование → возврат DTO/результата.
- Приватные методы (`_*` или `#`) — фактическая логика мутации.
- Один сервис — один агрегат/домен (Deck, Hand, Table).
- Сервисы **stateless**; состояние передаётся аргументами и возвращается immutably.

### 3.4. DTO boundary (граница данных)

Разделяем **внутренние модели** и **DTO для UI/API**.

| Тип | Назначение | Пример |
|-----|------------|--------|
| Entity / Model | Внутреннее состояние engine | `GameState`, `Card`, `Hand` |
| Input DTO | Команда от UI | `PlayCardDTO`, `DefendCardDTO` |
| View DTO | Данные для отображения | `GameViewDTO`, `PlayerViewDTO` |
| Filter DTO | Запросы/фильтры | `LegalMovesFilterDTO` |

**Правила:**

- React-компоненты работают **только с View DTO**, не с `GameState`.
- Маппинг `GameState → GameViewDTO` — в `engine/core/mappers/`.
- View DTO **скрывает** скрытую информацию (карты соперника → `{ count: number }`).

```typescript
type PlayerViewDTO = {
  id: string
  name: string
  hand: CardDTO[] | { count: number } // полная рука или только количество
  isAttacker: boolean
  isDefender: boolean
}
```

### 3.5. Event-driven side effects (события)

Доменные события отделяют **правила** от **побочных эффектов** (анимации, звук, аналитика).

```typescript
type DomainEvent =
  | { type: "card.played"; payload: { playerId: string; card: CardDTO } }
  | { type: "round.passed"; payload: { attackerId: string } }
  | { type: "game.ended"; payload: { loserId: string } }
```

- Engine/workflows **эмитят** события, но не знают о UI.
- Zustand store или подписчик в `features/` обрабатывает события для UI.
- Запрещено: вызывать React setState из engine.

### 3.6. Factory / Builder (фабрики)

Повторяющееся создание сущностей — через фабрики, не копипаст.

```typescript
// engine/core/factories/card-factory.ts
function createCard(suit: Suit, rank: Rank): Card {
  return { id: `${suit}_${rank}`, suit, rank }
}

function createDeck36(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => createCard(suit, rank))
  )
}
```

### 3.7. Strategy (стратегия)

Разные режимы игры и AI — через Strategy, не через `if/else` по всему коду.

```typescript
interface IRulesStrategy {
  canThrowIn(state: GameState, card: Card, playerId: string): boolean
  canTransfer(state: GameState, card: Card): boolean
}

class PodkidnoyRules implements IRulesStrategy { /* ... */ }
class PerevodnoyRules implements IRulesStrategy { /* ... */ }
```

### 3.8. Command (команды)

Каждое действие игрока — типизированная команда.

```typescript
type GameCommand =
  | { type: "attack"; cardId: string }
  | { type: "defend"; cardId: string; pairIndex: number }
  | { type: "throw_in"; cardId: string }
  | { type: "take" }
  | { type: "pass" }
```

UI отправляет команды в store → store вызывает соответствующий workflow.

### 3.9. Lightweight DI (упрощённый DI)

Без Awilix. Engine-сервисы регистрируются в простом контейнере:

```typescript
// engine/core/container.ts
type EngineContainer = {
  deck: IDeckService
  rules: IRulesStrategy
}

function createEngineContainer(mode: GameMode): EngineContainer {
  return {
    deck: new DeckService(),
    rules: mode === "podkidnoy" ? new PodkidnoyRules() : new PerevodnoyRules(),
  }
}
```

Workflows получают контейнер аргументом — тестируемо без глобального singleton.

---

## 4. Запрет дублирования (DRY)

### 4.1. Обязательные правила

| Ситуация | Решение |
|----------|---------|
| Одинаковая валидация в UI и engine | Только в engine; UI показывает результат |
| Повторяющиеся CRUD-операции над сущностями | Factory / generic helper |
| Одинаковые multi-step flows | Workflow + reusable steps |
| Общие типы engine ↔ UI | `shared/types` или `engine/core/types` + re-export |
| Повторяющийся UI | `shared/ui` компоненты |
| Форматирование карты, масти, ранга | Одна функция в `shared/lib/card-format.ts` |
| Проверка «можно ли сыграть» | Только `rules` module / workflow step |

### 4.2. Rule of Three

Абстракцию выносим **после второго повторения** (на третьем использовании). Не создаём premature abstractions на первом.

### 4.3. Запрещено

- Копировать блоки правил игры между features и engine.
- Дублировать типы `Card`, `Suit`, `Rank` в UI и engine — один source of truth.
- Писать отдельные `handleAttack`, `handleDefend` с одинаковой обвязкой — использовать общий `executeCommand(command)`.

---

## 5. TypeScript

### 5.1. Compiler options

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "exactOptionalPropertyTypes": true
}
```

### 5.2. Конвенции типов (по мотивам Medusa)

| Kind | Pattern | Example |
|------|---------|---------|
| Interface (контракт) | `I*Service`, `I*Strategy` | `IDeckService` |
| DTO | `*DTO` | `GameViewDTO`, `PlayCardDTO` |
| Input | `Create*DTO`, `Update*DTO` | `CreateGameDTO` |
| Error | `*Error`, enum кодов | `GameErrorCode` |
| Workflow step | `*-step.ts`, `*Step` | `validatePlayStep` |
| Workflow | `*-workflow.ts`, `*Workflow` | `playCardWorkflow` |
| Enum / union | PascalCase | `Suit`, `Rank`, `GamePhase` |

### 5.3. Запрещено

- `any` (исключение: явный комментарий с обоснованием).
- Type assertion (`as`) без guard или комментария.
- `@ts-ignore` — использовать `@ts-expect-error` с пояснением.
- Enum TypeScript для простых union — предпочитаем `as const` + derived type.

```typescript
const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const
type Suit = (typeof SUITS)[number]
```

### 5.5. Константы вместо магических значений

Строковые и числовые литералы с доменным смыслом **не пишем inline** в бизнес-логике, сравнениях, switch и API-ответах. Выносим в именованные константы рядом с типом или в `shared/config` / `entities/*/constants`.

**Обязательно:**

- Статусы, фазы, коды ошибок, роли, лимиты — через `as const` + derived type или объект-константу (`GAME_STATUS`, `GAME_PHASE`).
- Одно значение — одно место определения; переиспользуем импорт, не дублируем литерал `"finished"` в десяти файлах.
- Mongoose enum в схеме собираем из тех же констант, что и runtime-проверки.

```typescript
// ✅ entities/game/constants/game-status.ts
export const GAME_STATUS = {
  waiting: "waiting",
  active: "active",
  finished: "finished",
} as const

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS]

// ✅ modules/game/service/game.service.ts
if (game.status === GAME_STATUS.finished) {
  throw new AppError("Game is finished", 400)
}

// ❌ магическая строка
if (game.status === "finished") {
  throw new AppError("Game is finished", 400)
}
```

**Допустимые исключения** (без константы):

- Технические значения без доменного смысла: `"Bearer "`, HTTP-методы в роутере, ключи env.
- Тестовые фикстуры — если литерал очевиден из контекста describe/it.

**Engine** — образец: `HUMAN_PLAYER_ID`, `GAME_PHASE`, `GAME_COMMAND_TYPE`. **API и UI** следуют тому же правилу.

### 5.6. Форматирование

- Без semicolons (как в Medusa).
- Double quotes.
- 2 spaces indent.
- Trailing comma — es5.

---

## 6. Именование файлов и символов

| Kind | Pattern | Example |
|------|---------|---------|
| Files | kebab-case | `deck-service.ts`, `play-card.ts` |
| React components | PascalCase | `Card.tsx`, `GameBoard.tsx` |
| Hooks | `use*` | `useGameActions.ts` |
| Constants | SCREAMING_SNAKE | `MAX_TABLE_PAIRS`, `DECK_SIZE` |
| Private fields | trailing `_` | `rules_`, `container_` |
| Barrel exports | `index.ts` | один public API на slice/module |

---

## 7. React + Tailwind

### 7.1. Компоненты

- **Presentational** (`entities/`, `shared/ui`) — без бизнес-логики, только props.
- **Container** (`features/`, `widgets/`) — связь UI ↔ store ↔ engine.
- Компонент > 150 строк — повод декомпозиции.
- Логику не держать в `useEffect` для игровых правил — только для side effects (таймеры, подписки).

### 7.2. State

- Игровое состояние — в Zustand store (`features/game-model/`).
- Store хранит `GameViewDTO`, не мутирует engine state напрямую из компонентов.
- Локальный UI state (hover, drag) — `useState` в компоненте.

### 7.3. Tailwind

- Design tokens в `tailwind.config` (цвета мастей, размер карты).
- Утилита `cn()` (clsx + tailwind-merge) в `shared/lib/cn.ts`.
- Длинные className — через `@apply` в CSS module только при повторении 3+ раз.
- Запрещено: inline-стили для статичного layout.

### 7.4. Без картинок (MVP)

```tsx
// entities/card/ui/card-view.tsx
function CardView({ card, playable }: CardViewProps) {
  return (
    <div
      className={cn(
        "flex h-24 w-16 flex-col items-center justify-center rounded-lg border-2 bg-white shadow",
        suitColorClass[card.suit],
        playable && "ring-2 ring-green-400"
      )}
    >
      <span className="text-lg font-bold">{formatRank(card.rank)}</span>
      <span className="text-2xl">{suitSymbol[card.suit]}</span>
    </div>
  )
}
```

---

## 8. Обработка ошибок

```typescript
type GameError = {
  code: GameErrorCode
  message: string
}

enum GameErrorCode {
  INVALID_PHASE = "INVALID_PHASE",
  CARD_NOT_IN_HAND = "CARD_NOT_IN_HAND",
  ILLEGAL_MOVE = "ILLEGAL_MOVE",
  NOT_YOUR_TURN = "NOT_YOUR_TURN",
}
```

- Engine возвращает `{ ok: false, error }`, не бросает исключения для ожидаемых ошибок.
- `throw` — только для programmer errors (impossible state).
- UI показывает user-friendly message по `error.code`.

---

## 9. Тестирование

### 9.1. Обязательное покрытие

| Слой | Что тестируем |
|------|---------------|
| `engine/modules/` | Сервисы, чистые функции |
| `engine/workflows/` | Сценарии, legal/illegal moves |
| `engine/core/mappers/` | DTO mapping, hidden info |
| `shared/lib/` | Утилиты |

### 9.2. Не обязательно на MVP

- Snapshot-тесты React-компонентов.
- E2E (добавим позже, Playwright).

### 9.3. Именование тестов

```
deck-service.test.ts
play-card-workflow.test.ts
```

```typescript
describe("playCardWorkflow", () => {
  it("allows attacker to play lowest trump when phase is attack", () => {
    // ...
  })

  it("rejects defend when card cannot beat attack", () => {
    // ...
  })
})
```

---

## 10. Структура engine-модуля (шаблон)

```
engine/modules/deck/
  index.ts              # public exports
  deck-service.ts       # IDeckService implementation
  types.ts              # Deck, IDeckService
  deck-service.test.ts
```

```
engine/workflows/play-card/
  index.ts
  play-card-workflow.ts
  steps/
    validate-play-step.ts
    apply-play-step.ts
  play-card-workflow.test.ts
```

---

## 11. Структура UI feature (шаблон)

```
features/play-card/
  index.ts
  model/
    use-play-card.ts    # hook → store → workflow
  ui/
    play-card-button.tsx
```

Feature **не содержит** правил игры — только вызывает store/workflow.

---

## 12. Git и PR

- Один PR — одна feature/fix.
- Не коммитить: `node_modules`, `.env`, assets без необходимости.
- Перед PR: `npm run lint`, `npm run test`, `npm run build`.

### Checklist PR

- [ ] Нет дублирования логики с engine в UI
- [ ] Workflow для multi-step action
- [ ] View DTO на границе engine ↔ UI
- [ ] Импорты не нарушают слои FSD
- [ ] Тесты на новую логику в engine
- [ ] Нет `any`, нет лишних `@ts-expect-error`
- [ ] Tailwind tokens, не magic numbers
- [ ] Доменные строки/числа — через константы (§5.5), не inline-литералы

---

## 13. Референс: MedusaJS

При сомнениях в архитектуре ориентируемся на [medusajs/medusa](https://github.com/medusajs/medusa):

| Medusa | DurakJS |
|--------|---------|
| Module | `engine/modules/*` |
| MedusaService | Domain service (`DeckService`, `RulesService`) |
| core-flows / workflows | `engine/workflows/*` |
| DTO (`@medusajs/types`) | `*DTO` types, mappers |
| `@EmitEvents()` | Domain events после успешного workflow |
| API routes (thin) | Zustand actions / hooks (thin) |
| Module isolation | No cross-imports between engine modules |

**Не переносим:** Awilix, ORM, migrations, HTTP API, decorators backend.

---

## 14. MVP scope

Первый релиз:

- [ ] Колода 36 карт
- [ ] Подкидной дурак, 2 игрока (1 human + 1 bot)
- [ ] Полный цикл: атака → защита → подкидывание → бито/взять
- [ ] Text/CSS карты (без изображений)
- [ ] Bot с простой стратегией (Strategy pattern)

Вне MVP (не реализуем без отдельной задачи):

- Онлайн-мультиплеер
- Картинки карт
- Переводной дурак
- Звук, анимации Framer Motion

---

*Версия: 1.0 · Обновляется по мере роста проекта*
