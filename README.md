# NatureQuest Audio Explorer 🌲🎧

[![Hacktoberfest Challenge](https://img.shields.io/badge/Hacktoberfest%202026-Week%201%3A%20Touch%20Grass-10b981.svg)](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)
[![Agent Framework](https://img.shields.io/badge/Agent%20Engine-Mastra-6366f1.svg)](https://mastra.ai/)
[![Model](https://img.shields.io/badge/Open--Weight%20LLM-Gemma%202--9B--IT-f59e0b.svg)](https://ai.google.dev/gemma)
[![Voice](https://img.shields.io/badge/Audio%20Synthesis-ElevenLabs-ec4899.svg)](https://elevenlabs.io/)
[![Database](https://img.shields.io/badge/Persistent%20Memory-MongoDB%20Atlas-00ed64.svg)](https://www.mongodb.com/atlas)
[![Deployment](https://img.shields.io/badge/Cloud%20Deploy-Render-46e3b7.svg)](https://render.com/)

**NatureQuest Audio Explorer** is an open-source agentic web application designed to break the doomscroll and inspire people to step outside into the natural world.

Simply input any city, neighborhood, or park, and NatureQuest orchestrates an autonomous AI agent to:
1. **Discover verified nature trails & parks** in real time via **SerpApi**.
2. **Synthesize a mindful, 3-sentence sensory quest** using the open-weight **Gemma 2-9B** model (via Groq or OpenAI-compatible endpoints).
3. **Generate a high-fidelity spoken audio guide** with **ElevenLabs**, complete with playback controls, scrubbers, and download options for offline trails.
4. **Persist the adventure into a global community vault** hosted on **MongoDB Atlas**.

---

## 🏗️ Architecture & Agentic Workflow

NatureQuest uses **Mastra** agent concepts to cleanly decouple tools, memory, and reasoning:

```
[ User Input: Location ]
         │
         ▼
┌────────────────────────────────────────────────────────┐
│               Mastra Agent Orchestrator                │
├────────────────────────────────────────────────────────┤
│ 1. Tool Execution: natureSearchTool (SerpApi)          │
│    └── Discovers trailheads, nature preserves & parks  │
│                                                        │
│ 2. Agentic Reasoning: Gemma 2-9B (Groq / Open-Weight)   │
│    └── Generates 3-sentence sensory outdoor quest      │
│                                                        │
│ 3. Tool Execution: elevenLabsTtsTool (ElevenLabs)      │
│    └── Neural voice synthesis (audio guide companion)  │
│                                                        │
│ 4. Memory Persistence: questMemoryTool (MongoDB Atlas) │
│    └── Logs quests to the Community Vault database     │
└────────────────────────────────────────────────────────┘
         │
         ▼
[ Next.js Interactive Audio Player & Community Vault ]
```

---

## ✨ Features

- **Autonomous Agentic Flow:** Uses Mastra's `Agent` class (`natureGuideAgent`) and `createTool` abstractions to orchestrate external capabilities (discovery, voice synthesis, persistent memory).
- **Open-Weight Gemma Model:** Native support for Google's Gemma 2-9B-IT via Groq, with configurable model fallbacks and offline procedural generation.
- **Dual Audio Architecture:** Immediate base64 audio preview on generation paired with clean binary MP3 audio streaming (`GET /api/quest?id=...&audio=1`) for lightweight community vault browsing.
- **Full Audio Companion:** Real-time audio playback controls with interactive timeline scrubber, elapsed duration, waveform animation, mute toggle, and offline `.mp3` download.
- **MongoDB Atlas Community Vault:** Explores and replays adventures crafted by fellow hikers across the globe (`GET /api/quest`).
- **Production Hardening:** In-memory sliding-window rate limiting with timer unref, Zod schema validation, sanitized error logging, and resilient connection handling.
- **Zero-Config Fallback:** Runs effortlessly out of the box even without API keys via built-in procedural nature heuristics.

---

## 🚀 Quickstart

### 1. Clone & Install Dependencies
```bash
cd nature-quest
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your API keys:
```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Recommended | Groq API Key for open-weight Gemma (`gemma2-9b-it`) inference. |
| `OPENAI_API_KEY` | Optional | Fallback model endpoint if Groq is not used. |
| `ELEVENLABS_API_KEY` | Recommended | ElevenLabs Key for speech synthesis (Rachel voice). |
| `SERPAPI_API_KEY` | Recommended | SerpApi Key for live Google nature trails search. |
| `MONGODB_URI` | Recommended | MongoDB Atlas URI for logging and reading quest history. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry DSN for performance and error telemetry. |

*(If no keys are provided, the app runs in procedural demo mode so you can experience the full UI and workflow immediately!)*

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment

### Deploy on Render (Recommended)
This repository includes a native `render.yaml` Blueprint:
1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Blueprint** and select `render.yaml`.
3. Add your environment variables in the Render dashboard.

### Deploy with Docker
Build and run the production multi-stage container:
```bash
docker build -t nature-quest .
docker run -p 3000:3000 --env-file .env.local nature-quest
```

---

## 🏆 Hacktoberfest Prize Categories Targeted

- **Best Use of Mastra:** Implements Mastra tool definitions (`createTool`), agent workflow orchestration, and structured memory persistence.
- **Best Use of Gemma:** Leverages Google's Gemma open-weight model (`gemma2-9b-it`) for sensory outdoor quest crafting.
- **Best Use of ElevenLabs:** Produces calming spoken audio narratives designed for headphones while walking outdoors.
- **Best Use of SerpApi:** Fetches authentic, localized green spaces, nature reserves, and trails.
- **Best Use of MongoDB Atlas:** Manages an exploratory memory vault of global quests with high availability.
- **Best Use of Render:** One-click deployment with declarative infrastructure (`render.yaml`).

---

## 📜 Scripts

- `npm run dev` — Launches Next.js Turbopack development server.
- `npm run build` — Compiles production Next.js build.
- `npm run start` — Boots production server.
- `npm run lint` — Runs ESLint verification.
