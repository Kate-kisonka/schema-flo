# 🌙 Schema Flo

> Personal mental health tracker combining schema therapy, CBT, and menstrual cycle tracking — built with React.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-in%20development-orange)

---

## What is this?

Schema Flo is a single-page web app for daily psychological self-tracking. It connects emotional states, active schema therapy patterns, and menstrual cycle phases — helping you see patterns over time.

**Core features:**
- Step-by-step daily diary (moods, body symptoms, schemas, notes)
- 18 schemas from Young's Schema Therapy with descriptions
- Menstrual cycle tracker with phase-aware psychological commentary
- Practice library: crisis techniques, schema therapy exercises, CBT tools
- Silence practice (#Тишина) — a structured daily practice for crisis periods
- AI-powered support chat with session history (Claude API)
- History with charts, calendar view, and smart pattern insights
- CSV + JSON export for therapist sharing or data backup

---

## Quick Start

**Prerequisites:** Node.js 18+ and npm

```bash
# 1. Clone the repo
git clone https://github.com/Kate-kisonka/schema-flo.git
cd schema-flo

# 2. Create a Vite + React project and copy the app
npm create vite@latest . -- --template react
npm install

# 3. Replace src/App.jsx with schema-app.jsx
cp schema-app.jsx src/App.jsx

# 4. Set your Anthropic API key (for AI chat feature)
echo "VITE_ANTHROPIC_KEY=your_key_here" > .env 

# 5. Run
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — done.

> **Note:** The AI chat feature requires an [Anthropic API key](https://console.anthropic.com). The rest of the app works without it.

---

## Project Structure

```
schema-flo/
├── schema-app.jsx      # Main application (single-file React component)
├── README.md
└── .env.example        # API key template
```

This is intentionally a single-file architecture — simple to understand, easy to refactor.

---

## Data Storage

All data is stored in **browser localStorage** — no backend, no account required. Your data stays on your device.

| Key | Contents |
|-----|----------|
| `schema_logs` | Daily diary entries |
| `period_history` | Menstrual cycle history |
| `silence_logs` | Silence practice entries |
| `ai_sessions` | Support chat history |
| `cycleDay` | Current cycle day |
| `period_start_date` | Last period start |

**To back up your data:** use the Export buttons in the History tab (CSV or full JSON backup).

---

## Roadmap

- [ ] Wrap into proper Vite project with `package.json`
- [ ] Dockerize for local and production deployment
- [ ] Replace localStorage with a real backend (Supabase)
- [ ] CI/CD pipeline (GitHub Actions → deploy)
- [ ] User authentication
- [ ] Mobile PWA support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 (hooks only, no class components) |
| Styling | Inline CSS with design token object |
| State | useState / useEffect (no external state library) |
| Storage | localStorage |
| AI | Anthropic Claude API (claude-sonnet-4) |
| Build | Vite (recommended) |

---

## Development Notes

The app is a single React component exported as default from `schema-app.jsx`. All data constants (schemas, moods, cycle phases, etc.) are defined at the top of the file. Component logic is organized into clearly labeled sections with comments.

To explore the code, start from:
1. `// ─── DATA` — all static content
2. `// ─── APP` — main component, all state
3. `renderHome()`, `renderPractices()`, `renderSupport()`, `renderHistory()` — four screen renderers

---

## License

MIT — use freely, modify, learn from.

---

*This project is used as a personal DevOps learning project — CI/CD, Docker, and deployment practice.*
