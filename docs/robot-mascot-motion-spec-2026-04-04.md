# Tradelab Robot Mascot Motion Spec

## Goal

Give the small robot a clear "system companion" role instead of a static logo.
The mascot should reflect what the user is doing now, what the trading system is doing now, and whether the current bot state is healthy or risky.

This first version is designed to be:

- Lightweight enough for the current React + Tailwind stack
- Driven by existing frontend data sources
- Extendable into richer narrative states later

## Current State

Current implementation is a static `lucide-react` `Bot` icon with a running dot:

- Location: `frontend/src/app/layouts/RootLayout.tsx`
- Current signals already available:
  - `activeRun`
  - `accountSummary.equity`
  - `accountSummary.drawdownPct`
  - `riskEvents`
  - `historyRuns`
  - websocket connection status
  - page route
  - backtest local page state (`isRunning`, `result`)

So the first animated version does not require new backend APIs.

## Design Principles

1. One primary state at a time
Avoid visual noise. The robot should always have one dominant behavior, with one optional overlay cue.

2. Scene first, market second
The user's current task should win priority over background bot state.

3. Small, readable, non-distracting
The robot is a UI assistant, not a loading spinner. Motions should be legible within a 48-72px frame.

4. Motion should explain status
Each animation must map to a clear meaning: thinking, scanning, watching market, celebrating, stressed, sleeping.

## State Priority

Use this priority order when multiple conditions are true:

1. Critical risk / severe drawdown
2. Current page task state
3. Active bot runtime state
4. Connection state
5. Idle ambient state

## Motion Table

| State ID | Scenario | Trigger | Robot behavior | Overlay prop | Loop rhythm | Exit rule |
| --- | --- | --- | --- | --- | --- | --- |
| `idle` | Default resting state | No task running, no active bot, no critical risk | Gentle floating, slow blink, antenna micro sway | None | 3.2s | Leave when higher-priority state appears |
| `thinking-strategy` | User on strategy page editing or creating strategy | Route is `/strategy`; form dirty or create/update pending | Head tilts 4deg left/right, one eye narrows slightly, blink slower | Small light bulb pops above head, fades in/out | 1.8s | Leave after save success or route change |
| `deploying` | User starts bot deployment | Route `/runner`; `isSubmitting` true or `startRun()` pending | Body leans forward, tiny arm pulses, feet bounce once every cycle | Rotating gear or progress ring behind head | 1.1s | End on success/failure resolution |
| `running-watch` | Bot deployed and stable | `activeRun` exists and no strong pnl/risk signal | Robot sits upright, eyes scan left/right, antenna heartbeat pulse | Small green live dot | 2.4s | Replace by pnl/risk states |
| `backtesting` | Backtest is running | Route `/backtest`; local `isRunning` true | Eyes track side-to-side, head nods subtly as if reading chart | Mini candlestick panel slides in beside head | 1.4s | End when backtest response returns |
| `backtest-success` | Backtest completed with usable result | Route `/backtest`; `result` exists and no error | Quick happy bounce, eyes brighten, short nod | Tiny upward sparkline flash once then fade | One-shot + settle to idle | 2.2s then back to route ambient |
| `backtest-warning` | Backtest completed but weak result | Route `/backtest`; result exists and return < 0 or stability low | Shoulder slump, one blink pause, subtle side glance | Small amber warning bar over chart | One-shot + low-energy loop | 2.2s then route ambient |
| `pnl-up` | Active bot in profit | `activeRun` exists and pnl above positive threshold | Slight upward bob, smiling mouth, bright blink cadence | Green arrow/spark above head | 1.6s | Fall back if pnl returns neutral |
| `pnl-flat` | Active bot near breakeven | `activeRun` exists and pnl near zero | Calm watch posture, neutral face, normal blink | Tiny flat line badge | 2.4s | Switch when pnl crosses threshold |
| `pnl-down` | Active bot losing | `activeRun` exists and pnl below negative threshold | Body dips slightly, eyes narrow, antenna droops a bit | Red down tick near shoulder | 1.8s | Switch when pnl recovers or worsens |
| `risk-alert` | Drawdown or risk event warning | New `riskEvents` item or drawdown crosses warn threshold | Short recoil, red blink, tense posture | Red exclamation badge pulses | 0.9s | Downgrade after cooldown if risk no longer active |
| `paused` | Bot stopped / no active run | No active run after previous running state | Robot exhales, returns to neutral, eyelids lower briefly | Live dot disappears | One-shot then idle | Settle into `idle` |
| `disconnected` | Websocket down | `wsStatus` is `closed` or `error` | Freeze motion briefly, then low-power blink | Small broken-link cloud / gray antenna | 2.8s | Recover when websocket returns `open` |

## Visual Language By State

### 1. Strategy thinking

- Emotion: clever, focused, slightly playful
- Main cues:
  - light bulb
  - head tilt
  - asymmetric blink
- Why it works:
  - communicates "正在想策略" without looking like generic loading

### 2. Backtesting

- Emotion: analytical, data-reading
- Main cues:
  - eye tracking
  - candlestick overlay
  - occasional nod
- Why it works:
  - directly matches the user's mental model of "机器人在看K线"

### 3. Deployment

- Emotion: executing, booting, activating
- Main cues:
  - gear/progress ring
  - forward lean
  - faster motion cadence

### 4. Runtime PnL mood

- Emotion: portfolio-linked feedback
- Main cues:
  - posture changes, not only color changes
  - smile vs neutral vs tension
  - subtle badges to avoid noisy flashing

### 5. Risk alert

- Emotion: urgent but not panic-inducing
- Main cues:
  - short pulse burst
  - red accent only on overlay, not full robot repaint

## Recommended Thresholds For V1

Use simple thresholds first, then tune later:

- `pnl-up`: active run total pnl >= `+1.5%`
- `pnl-flat`: `-1.5% < pnl < +1.5%`
- `pnl-down`: active run total pnl <= `-1.5%`
- `risk-alert`: any new `riskEvents` in recent 30s, or `drawdownPct >= 0.08`
- `critical-risk`: optional later, `drawdownPct >= 0.15`

If real-time active-run pnl is not exposed cleanly enough in V1, use a proxy:

- `equity - initialCash` from active run summary if available
- otherwise `accountSummary.equity` delta versus last deployment baseline captured in frontend

## Motion System Structure

### Mascot layers

Split the robot into small independently animated parts:

- `head`
- `eyes`
- `mouth`
- `antenna`
- `body`
- `shadow`
- `statusOverlay`

This gives enough expressiveness without needing frame-by-frame art.

### Animation categories

Use three categories together:

1. Ambient loop
- breathing
- floating
- blink

2. State loop
- thinking tilt
- chart watching
- profit bounce
- drawdown droop

3. Event burst
- save success flash
- deploy start burst
- risk alert pulse

## Recommended Frontend Architecture

### 1. Create a dedicated mascot component

Suggested files:

- `frontend/src/app/components/mascot/RobotMascot.tsx`
- `frontend/src/app/components/mascot/RobotMascotScene.tsx`
- `frontend/src/app/components/mascot/robotMascotState.ts`
- `frontend/src/app/components/mascot/robotMascot.css`

Do not keep the robot inline inside `RootLayout.tsx`.

### 2. Separate "state derivation" from "rendering"

Recommended split:

- `deriveRobotMascotState(input) -> MascotState`
- `RobotMascotScene` only receives a final state and renders animation classes

This prevents UI logic from spreading across pages.

### 3. Add a thin UI event channel for page-local actions

Global data handles runtime states well, but page actions like "strategy save pending" and "backtest running" are local.

Recommended lightweight approach:

- Create a `MascotContext` or store with transient UI actions
- Pages can publish short-lived intents:
  - `strategyThinking`
  - `deployPending`
  - `backtestRunning`
  - `backtestResult`

### 4. Keep route-aware ambient defaults

If no transient action is active:

- `/strategy` -> prefer `thinking-strategy`
- `/backtest` -> prefer calm analytical idle
- `/runner` -> prefer deployment-ready stance
- other pages -> normal `idle` or `running-watch`

## Data Wiring Plan

### Global inputs from existing app

From `useData()`:

- `activeRun`
- `accountSummary`
- `riskEvents`
- `wsStatus`
- `historyRuns`

From router:

- current pathname

From page-local UI:

- strategy saving / editing dirty
- backtest running / result tone
- deployment submitting

### Derived model

Suggested type:

```ts
type MascotState =
  | "idle"
  | "thinking-strategy"
  | "deploying"
  | "running-watch"
  | "backtesting"
  | "backtest-success"
  | "backtest-warning"
  | "pnl-up"
  | "pnl-flat"
  | "pnl-down"
  | "risk-alert"
  | "paused"
  | "disconnected";
```

Suggested payload:

```ts
type MascotSnapshot = {
  state: MascotState;
  mood: "neutral" | "positive" | "warning" | "danger";
  overlay?: "bulb" | "gear" | "candles" | "spark" | "down" | "alert" | "live";
  message?: string;
};
```

## Animation Technology Recommendation

### V1 recommendation

Use SVG + CSS keyframes first.

Why:

- No new dependency required
- Small bundle impact
- Easy to theme with CSS variables
- Good enough for head tilt, blink, pulse, float, overlay icons

### V2 option

If later we want richer choreography, upgrade to `framer-motion`.

When to justify it:

- state transitions become complex
- need spring-based sequencing
- want gesture or hover personality

For this first release, CSS keyframes are the right tradeoff.

## Placement Recommendation

Because your request mentions "右上角", but current robot is in the left brand block, the component should be built location-agnostic.

Recommendation:

- Keep one shared `RobotMascot` component
- Render compact version in top-right `TopBar`
- Optionally keep a quiet static brand version in sidebar

This gives:

- higher visibility for motion
- less conflict with navigation branding
- cleaner future expansion into tooltip/status text

If we do not want a layout move yet, we can still ship V1 in the current sidebar location first.

## Development Plan

### Phase 1 - Foundation

Goal: replace static icon with a real mascot component and baseline states.

Tasks:

1. Extract robot into its own component
2. Build SVG structure with separate animated parts
3. Add base states:
   - `idle`
   - `running-watch`
   - `paused`
   - `disconnected`
4. Wire global data from `RootLayout`

Output:

- mascot component live in UI
- no page-level behavior yet

### Phase 2 - Task-driven motion

Goal: make robot react to what the user is doing now.

Tasks:

1. Add a small `MascotContext`
2. `Strategy.tsx` publishes `thinking-strategy`
3. `Backtest.tsx` publishes `backtesting`, `backtest-success`, `backtest-warning`
4. `BotRunner.tsx` publishes `deploying`

Output:

- robot reflects deploy/backtest/strategy authoring scenes

### Phase 3 - Runtime mood

Goal: make robot reflect live bot performance.

Tasks:

1. Derive active bot pnl bucket
2. Add states:
   - `pnl-up`
   - `pnl-flat`
   - `pnl-down`
3. Add `risk-alert` cooldown logic

Output:

- robot becomes a live portfolio companion

### Phase 4 - Polish

Goal: improve delight without adding clutter.

Tasks:

1. Add tooltip text per state
2. Add reduced-motion fallback
3. Tune thresholds and timing
4. Add simple visual tests / state story gallery

## Reduced Motion And Accessibility

Must include:

- `prefers-reduced-motion` fallback
- keep essential meaning via icon/overlay/color even when animation is reduced
- do not use rapid flashing
- avoid constant large-scale motion in peripheral vision

Recommended reduced-motion behavior:

- freeze float/bounce loops
- keep only fade-in/fade-out and single opacity pulse

## Risks

### Risk 1: too many states feel noisy

Mitigation:

- enforce priority system
- limit overlay props to one at a time

### Risk 2: page-local state becomes messy

Mitigation:

- page publishes only small intent events
- central derivation decides final visible state

### Risk 3: PnL logic is not stable enough yet

Mitigation:

- use coarse buckets only
- do not animate on every tiny equity tick
- debounce state switches for 3-5s

## Suggested First Build Scope

If we want the fastest valuable first ship, implement only these six states:

- `idle`
- `thinking-strategy`
- `backtesting`
- `deploying`
- `pnl-up`
- `pnl-down`

This already covers the exact scenarios you described and keeps scope tight.

## Recommendation

The best V1 is:

- build the mascot as a reusable SVG component
- place it in a visible top-right slot
- use CSS keyframes
- drive it from a central state derivation layer
- launch with 6 core states first, then add risk and celebratory polish

This gives a Claude Code style "alive assistant" feel without overengineering the first iteration.
