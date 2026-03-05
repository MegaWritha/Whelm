# Whelm — AI Workforce Platform

## Overview

Whelm is a mobile-first application (React Native / Expo) that lets solo founders and micro-businesses manage a team of AI "workers." Each AI worker has a defined role, personality, skill set, and the ability to produce real, ready-to-use deliverables (social media posts, copy, briefs, etc.). Founders onboard their company profile once, and every AI worker is automatically briefed on the brand. Workers chat with founders, generate work, and submit deliverables to an approval inbox before anything goes live.

The app runs as an Expo mobile app with a companion Express backend server that proxies all AI (Anthropic Claude) calls. State is persisted locally via AsyncStorage on the device, while the server layer uses a PostgreSQL database (via Drizzle ORM) for conversations and messages.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework:** Expo SDK 54 with Expo Router v6 for file-based navigation.
- **Structure:** Uses the `app/` directory convention:
  - `app/(tabs)/` — main tab screens: Dashboard, Team (Workers), Inbox, Settings.
  - `app/worker/[id].tsx` — dynamic route for individual worker chat screens.
  - `app/onboarding.tsx` — multi-step onboarding flow for new companies.
- **State Management:** React Context (`AppContext`) combined with AsyncStorage for local persistence. Holds company profile, hired workers list, inbox items, and per-worker chat history. TanStack React Query is set up for server data fetching.
- **UI:** Dark navy/teal design system defined in `constants/colors.ts`. Uses Inter font (via `@expo-google-fonts/inter`), Expo Linear Gradient, Expo Blur, and platform-adaptive tab navigation (native liquid glass on supported iOS, classic tabs elsewhere).
- **Typed Routes:** Expo's experimental `typedRoutes` is enabled for type-safe navigation.

### Backend (Express)

- **Framework:** Express 5 running on Node.js, written in TypeScript, bundled with esbuild for production.
- **Entry:** `server/index.ts` sets up CORS (allowing Replit domains and localhost), JSON body parsing, and registers routes.
- **Key Routes (`server/routes.ts`):**
  - `POST /api/worker/chat` — streams an AI response back to the client using Server-Sent Events (SSE). Uses Anthropic's streaming API.
  - `POST /api/worker/generate-work` — generates a complete work deliverable from a task prompt, then returns it for inbox submission.
- **Replit Integration Modules (`server/replit_integrations/`):**
  - `chat/` — conversation and message CRUD routes + storage against the PostgreSQL database.
  - `batch/` — utility for concurrent, rate-limited batch processing of Anthropic requests with retry logic.

### Data Storage

- **Local (Device):** AsyncStorage stores all user-facing state — company profile, onboarding status, hired workers, inbox items, and chat histories. This means no login is required; state is per-device.
- **Database (PostgreSQL + Drizzle ORM):** Used for the server-side conversation/message persistence layer.
  - `shared/schema.ts` defines a `users` table.
  - `shared/models/chat.ts` defines `conversations` and `messages` tables.
  - Drizzle config points to `DATABASE_URL` environment variable.
  - Currently `server/storage.ts` uses in-memory storage for users; PostgreSQL storage is used for chat conversations via `chatStorage`.
- **Migrations:** Stored in `./migrations`, managed with `drizzle-kit push`.

### AI Worker System

- **Worker Definitions (`data/workers.ts`):** All AI workers are defined statically as a typed array (`ALL_WORKERS`). Each worker has: id, name, role, department, personality, greeting, skills, task templates, and a system prompt template.
- **Departments:** Creative, Growth, Operations, Technical, Strategy — each with a distinct color in the UI.
- **System Prompts:** Built dynamically by `buildWorkerSystemPrompt()`, injecting the company profile into the worker's base prompt so every worker knows the brand context.
- **Output Rule:** A strict rule is injected into every worker system prompt requiring them to produce finished, copy-paste-ready deliverables rather than advice or descriptions.
- **Streaming Chat:** The mobile client opens an SSE connection to `/api/worker/chat`, streams tokens in real time, and renders them incrementally.
- **Work Generation → Inbox:** Workers can also run autonomous "generate work" tasks that land directly in the approval inbox (`InboxItem`) with `pending` status. Founders approve or reject from the Inbox tab.

### Navigation Flow

1. App launches → checks AsyncStorage for `onboardingComplete`.
2. If not complete → redirects to `app/onboarding.tsx` (multi-step company profile form).
3. If complete → lands on Dashboard tab showing hired workers, stats, and quick actions.
4. Workers tab → browse/hire/fire AI workers, trigger auto-work generation.
5. Worker card tap → opens `app/worker/[id].tsx` chat screen.
6. Inbox tab → review, approve, or reject submitted work with badge count.
7. Settings tab → edit company profile, view stats, reset onboarding.

---

## External Dependencies

### AI / LLM
- **Anthropic Claude** (`@anthropic-ai/sdk`): All AI generation goes through Claude (model: `claude-haiku-4-5` for chat, configurable for generation). API key read from `AI_INTEGRATIONS_ANTHROPIC_API_KEY`. Base URL overridable via `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` (for Replit's AI integration proxy).

### Database
- **PostgreSQL**: Required via `DATABASE_URL` environment variable.
- **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`): Schema definition, query building, and migrations. Dialect is PostgreSQL.
- **Drizzle Zod** (`drizzle-zod`): Auto-generates Zod validation schemas from Drizzle table definitions.
- **`pg`**: Node.js PostgreSQL client used under the hood.

### Mobile / Expo Packages
- `expo-router` — file-based navigation
- `expo-blur`, `expo-glass-effect` — platform-native visual effects
- `expo-haptics` — tactile feedback on approve/reject actions
- `expo-linear-gradient` — gradient UI elements
- `expo-image-picker` — image selection (for future asset uploads)
- `expo-location` — location access (available for location-aware workers)
- `react-native-gesture-handler`, `react-native-reanimated` — gesture and animation support
- `react-native-keyboard-controller` — keyboard-aware scroll behavior

### State & Networking
- **TanStack React Query** (`@tanstack/react-query`): Set up for server data fetching; query client configured in `lib/query-client.ts`.
- **AsyncStorage** (`@react-native-async-storage/async-storage`): Primary local persistence for all app state.
- **`http-proxy-middleware`**: Used in dev server setup to proxy between Expo and Express.

### Utilities
- **`p-limit`**, **`p-retry`**: Concurrency limiting and retry logic for batch AI requests.
- **`@stardazed/streams-text-encoding`**, **`@ungap/structured-clone`**: Polyfills for stream text encoding and structured cloning in React Native environments.

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic base URL (Replit proxy) |
| `EXPO_PUBLIC_DOMAIN` | Public domain used by the mobile client to reach the Express API |
| `REPLIT_DEV_DOMAIN` | Replit dev tunnel domain (set automatically in Replit) |
| `REPLIT_DOMAINS` | Comma-separated list of allowed CORS origins |