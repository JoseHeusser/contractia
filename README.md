# ContractIA — Análisis de contratos de salud chilenos con IA

AI-powered platform that explains Chilean health insurance contracts (Isapres) in plain language. Upload a contract PDF, get the key benefits, exclusions, and personalized alerts in minutes.

> 🔗 **Live:** <https://contractia-one.vercel.app>

## Why

Chilean private health insurance contracts are long, technical, and intentionally opaque. ContractIA reads the contract for you, surfaces the clauses that actually matter, and lets you chat with an AI to drill into specifics — with citations back to the source contract.

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Auth & DB:** Supabase (SSR + middleware-based session handling)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **AI:** LLM integration via `/api/chat/message`
- **File handling:** `react-dropzone`
- **Deployment:** Vercel

## Architecture

```
src/
├── app/
│   ├── (auth)/              # login & signup
│   ├── (app)/app/           # authenticated workspace
│   ├── api/chat/message/    # streaming AI chat endpoint
│   └── auth/callback/       # Supabase auth callback
├── components/              # ContractCard, EvidencePopover,
│                            # AlertsPanel, ProcessingStatus, …
├── lib/supabase/            # SSR / client / middleware
└── middleware.ts            # auth-aware route protection
```

## Features

- 📄 Upload PDF contracts via drag-and-drop
- 🤖 AI extracts benefits, exclusions, waiting periods
- 💬 Conversational interface with **citations to source contract**
- 🔔 Personalized alerts based on the user's profile
- 🔐 Supabase auth + RLS-backed multi-tenant data

## Local development

```bash
npm install
cp .env.example .env.local   # add your Supabase + LLM keys
npm run dev
```

Required env vars (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=   # or OPENAI_API_KEY
```

## License

MIT — see [LICENSE](./LICENSE).

---

Built by [Jose Heusser](https://github.com/JoseHeusser) · [Oxidelabs](https://oxidelabs.cl) · AI-assisted development with Claude Code & Cursor.
