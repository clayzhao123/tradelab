# V1 Visual Tokens (Frozen)

## Intent

This token set preserves an operator-focused, low-noise trading UI with explicit state feedback.
Tokens here are semantic and stable; component styles should consume semantic tokens instead of raw values.

## Color Tokens

### Surfaces

| Token | Light | Dark | Usage |
|---|---|---|---|
| `page` | `#ECEAE3` | `#1C1C1A` | Application background |
| `surface` | `#F5F4F0` | `#242422` | Panels and sidebars |
| `elevated` | `#FFFFFF` | `#2E2E2B` | Cards, controls, focused containers |
| `hover` | `#EDECEA` | `#323230` | Hover state for interactive rows/items |

### Borders

| Token | Light | Dark | Usage |
|---|---|---|---|
| `border-subtle` | `rgba(60,58,52,0.10)` | `rgba(255,255,255,0.06)` | Structure separation |
| `border-default` | `rgba(60,58,52,0.18)` | `rgba(255,255,255,0.10)` | Default control/card borders |
| `border-strong` | `rgba(60,58,52,0.32)` | `rgba(255,255,255,0.18)` | Active emphasis boundaries |

### Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `tx-primary` | `#1A1A18` | `#E8E6DF` | Primary content text |
| `tx-secondary` | `#5E5D58` | `#9C9A92` | Supporting labels |
| `tx-tertiary` | `#999890` | `#5E5D58` | Metadata and low-priority labels |

### State Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `up` | `#1A7A52` | `#34C77B` | Positive move, profit, healthy runtime |
| `down` | `#C0392B` | `#E05252` | Negative move, loss, failures |
| `up-bg` | `rgba(26,122,82,0.08)` | `rgba(52,199,123,0.10)` | Positive tinted backgrounds |
| `down-bg` | `rgba(192,57,43,0.08)` | `rgba(224,82,82,0.10)` | Negative tinted backgrounds |
| `accent` | `#5B4FBF` | `#8B7FE8` | Focus, active nav, selected states |
| `accent-bg` | `rgba(91,79,191,0.10)` | `rgba(139,127,232,0.12)` | Accent tint surfaces |
| `warning` | `#B36A00` | `#F0A830` | Caution, soft risk warnings |
| `warning-bg` | `rgba(179,106,0,0.08)` | `rgba(240,168,48,0.10)` | Warning tinted backgrounds |

## Motion and State Feedback

- Price tick feedback:
  - `flash-up`: 300ms ease-out from `up` to `tx-primary`
  - `flash-down`: 300ms ease-out from `down` to `tx-primary`
- Transitions:
  - Interactive controls: 150ms to 200ms
  - Avoid decorative motion that competes with market signals

## Density, Radius, and Shadow

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | `6px` | Inputs, compact tags |
| `radius-md` | `10px` | Buttons, cards, nav pills |
| `radius-lg` | `14px` | Elevated panels and major containers |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.06)` (dark tuned variant) | Lightweight separation |
| `shadow-md` | `0 2px 8px rgba(0,0,0,0.08)` (dark tuned variant) | Elevated overlays/cards |

## Typography

- Sans stack: `Inter`, `PingFang SC`, `Helvetica Neue`, `sans-serif`
- Mono stack: `JetBrains Mono`, `Fira Code`, `Menlo`, `monospace`
- Operational numeric values should prefer mono tokens.

## Required State Coverage

The token system must explicitly support:
- connected / disconnected
- running / paused / stopped
- loading / stale / refreshed
- success / warning / error
- positive / negative market moves

If a component introduces a new visual status, map it back to existing semantics above before adding new tokens.

