# V1 Page Semantics and Navigation Labels

## Scope

This document freezes V1 information architecture for page-level behavior.
The goal is one clear purpose per page and stable naming for navigation, routes, and API integration.

## Canonical Navigation

Use these labels and paths as the single source of truth in V1:

| Route | Nav Label | Primary Purpose | Primary Data Dependencies |
|---|---|---|---|
| `/` | Live Dashboard | Real-time market and account overview to support fast situation awareness. | `/quotes`, `/klines`, `/scan/results`, `/account/summary`, websocket snapshot/updates |
| `/orders` | Orders & Activity | Place/cancel orders and inspect order/fill lifecycle in one operational screen. | `/orders`, `/fills`, websocket `order.updated` and `fill.created` |
| `/strategy` | Strategy Lab | Create, edit, and version strategy configuration parameters. | `/strategies` CRUD APIs |
| `/runner` | Bot Deployment | Start/stop one active run and monitor runtime state. | `/runs`, `/runs/start`, `/runs/:id/stop`, websocket `run.updated` and `account.updated` |
| `/history` | Session History | Inspect completed runs with metrics, fills, risk events, and snapshots. | `/history/runs`, `/history/runs/:id` |

## Out of V1 Navigation

The template includes `backtest`; V1 does not include it in primary navigation.
Reason: it is not in P10 delivery scope and would create mismatched expectations for backend capabilities.

## Page Semantic Contracts

### 1) Live Dashboard
- Focus: monitor, not configure.
- Must answer: "What is happening now?"
- Must surface: market state, scan highlights, account summary, connectivity/realtime status.

### 2) Orders & Activity
- Focus: execution and traceability.
- Must answer: "What did we send, what got filled, and what is still open?"
- Must include deterministic order states and fill linkage.

### 3) Strategy Lab
- Focus: strategy definition lifecycle.
- Must answer: "What rules will the runner execute?"
- Must preserve editable persisted configuration, not ephemeral page state.

### 4) Bot Deployment
- Focus: runtime control and safety.
- Must answer: "Is the system running, and can I control it safely?"
- Must enforce single-active-run semantics in UI affordances.

### 5) Session History
- Focus: post-run analysis and audit.
- Must answer: "What happened during previous runs and why?"
- Must include run-level metrics and linked event timeline.

## Global Interaction Semantics

- Realtime state is authoritative from websocket events; HTTP is for initial load and explicit refresh.
- Hardcoded mock outputs are forbidden in shipped V1 flows.
- Labels above are frozen for V1; any rename requires synchronized updates to docs, routes, and UI copy.

