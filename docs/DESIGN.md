# ML Quest — Design Document

Date: 2026-07-23 · Status: approved (user delegated design decisions)

## What this is

**ML Quest** — a local, gamified, interactive 5-week course app that takes the user
(rusty-junior Python, strong general IT background) from Python refresh to ML/NLP/LLM
interview readiness. Content is in English. The app runs fully in the browser with an
**in-browser Python trainer** (Pyodide/WebAssembly) — no IDE required.

Based on a friend's roadmap: Part 1 (Python + Classic ML, tests T1–T2, OOP + async
homeworks, FastAPI classification homework) and Part 2 (NLP: transformers, LLM, RAG,
Agents, tests T3–T6) plus cross-cutting interview question banks (OPT / INF / QTZ / PRD).
Compressed from 15 weeks to 5 weeks at ~2–3.5 h/day, 6 sessions/week.

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| Delivery | Local static web app in this folder, no build step | Zero-friction start (double-click `start-course.command`), user owns it, easy to extend |
| Python runtime | Pyodide v0.26.4 from jsdelivr CDN, in a Web Worker | Real Python + numpy/pandas in browser; worker allows kill on infinite loops |
| Not a claude.ai Artifact | Artifacts block CDN requests (CSP), so Pyodide can't load there | A theory-only artifact could be a later companion |
| Editor | CodeMirror 5 from CDN, styled `<textarea>` fallback | Simple, reliable, no build |
| Content format | Plain JS data files (`data/*.js`), `String.raw` strings, custom markdown dialect (`~~~` fences, `~inline~` code) | Avoids backtick/`${}` escaping traps; validated by `tools/validate.js` |
| Gamification | XP, levels with titles, streak + streak freezes, badges, daily quest, weekly Boss exams (T1–T6), confetti | Anti-procrastination: tiny first steps, soft locks only, "comeback" mechanics instead of shame |
| Persistence | `localStorage` + JSON export/import | No accounts, no server |
| Verification | `tools/validate.js` (schema), `tools/check_solutions.py` (every solution passes its tests), in-app `#/qa` route (same, but inside real Pyodide runtime), manual e2e in browser | Content at this scale must be machine-checked |

## Structure (course map)

- **Week 1 — Python Reforged**: data model, functions/closures/decorators, OOP ×2,
  generators/typing, concurrency & asyncio. HW1 (OOP), HW2 (async). **Boss T1**.
- **Week 2 — Classic ML Arena**: NumPy/pandas, ML framing & validation, linear/logistic +
  gradient descent, metrics from scratch, trees/ensembles/kmeans. HW3 (end-to-end
  from-scratch ML pipeline). **Boss T2**.
- **Week 3 — NLP & Transformers**: text pipeline & TF-IDF, embeddings/word2vec, attention,
  transformer deep dive (BERT vs GPT), subword tokenization (BPE) & fine-tuning practice.
  HW4 (text classification); optional IDE-track FastAPI homework. **Boss T3**.
- **Week 4 — LLMs & RAG**: LLM anatomy & sampling, training pipeline (SFT/RLHF/LoRA/
  quantization), prompting & evals, RAG retrieval (BM25/vectors), RAG system design.
  HW5 (mini-RAG engine in trainer). **Boss T4+T5**.
- **Week 5 — Agents & Production**: agents/tool-calling, serving & inference optimization,
  production ML (monitoring/drift/safety), ML system design interviews, interview marathon.
  **Final Boss (T6 + Interview Gauntlet)**.

Flashcard decks: `python`, `classic-ml`, `nlp`, `llm`, `rag`, `agents`, plus cross-cutting
`opt` (PEFT/training), `inf` (inference/serving/Docker/K8s), `qtz` (quantization),
`prd` (production) — mirroring the roadmap's OPT-xx / INF-xx / QTZ-xx / PRD-xx question codes.

## App architecture

```
index.html            — shell, CDN tags, embedded Pyodide worker source (text/plain)
assets/style.css      — dark theme (light toggle), design tokens
js/config.js          — constants: XP economy, levels, badges, deck metadata, CDN URLs
js/md.js              — markdown dialect renderer + tiny Python syntax highlighter
js/store.js           — state, XP/levels, streaks, badges, SRS for flashcards
js/runner.js          — Pyodide worker lifecycle, run/submit queue, timeouts
js/ui.js              — DOM helpers, modals, toasts, confetti, progress rings
js/views_*.js         — home / map / session player / trainer / cards / boss / qa
js/app.js             — hash router + boot
data/week1..5.js      — course content (authored per content-spec)
data/cards.js         — interview flashcard bank (~170 cards)
tools/                — validate.js, extract.js, check_solutions.py (content CI)
docs/content-spec.md  — authoring contract (how to add/edit content)
start-course.command  — double-click launcher (http.server + open browser)
```

Exercise flow: user code + tests run in worker; per-test pass/fail with assertion
messages; hints reveal progressively; solution reveal allowed (half XP before pass).
Async exercises use top-level-await harness (`asyncMode`). Infinite loops → worker
terminated and recreated.

## Out of scope (v1)

Real threading/multiprocessing execution (theory + quiz only — Pyodide limitation),
sklearn/torch execution (theory only; from-scratch implementations instead — better for
interviews anyway), accounts/cloud sync, mobile layout polish.
