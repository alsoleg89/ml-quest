# ML Quest — Content Authoring Spec (v1)

This is the **contract** for all course content files (`data/week1.js` … `data/week5.js`,
`data/cards.js`). The app, the validator (`tools/validate.js`), and the solution checker
(`tools/check_solutions.py`) all depend on it. Follow it exactly.

## 0. Golden rules

1. All long strings use `String.raw` template literals: `String.raw` + backtick … backtick.
2. **The backtick character must NEVER appear inside content strings** (it would terminate
   the literal). Markdown code uses `~~~` fences and `~inline~` instead (see §3).
3. **The sequence `${` must NEVER appear anywhere in the file** (template interpolation).
   Python f-strings like `f"got {x}"` are fine — there is no `$` before `{`.
4. Content language: **English**. Tone: energizing, direct, second person, concise,
   interview-focused. Light humor welcome; no fluff.
5. Every exercise `solution` MUST pass its own `tests` (machine-verified — see §7).
6. All code must be **Pyodide-safe** (see §5).

## 1. File shape (week files)

Each `data/weekN.js` is a plain classic script (no imports/exports) that registers one
week object. Structure it so content can be appended chunk-by-chunk:

```js
/* ML Quest — Week 2: Classic ML Arena */
(function () {
  const W = {
    num: 2,
    id: "w2",
    emoji: "📊",
    title: "Classic ML Arena",
    subtitle: "From numpy to gradient descent",
    goal: "Explain and implement the core classic-ML toolkit from scratch.",
    days: [],
    lessons: {},
    quizzes: {},
    exercises: {},
    boss: null,
  };
  CourseData.weeks.push(W);

  // ================= Day 1 =================
  W.days.push({
    id: "w2d1",
    title: "NumPy & Pandas Survival Kit",
    minutes: 150,
    blocks: [
      { type: "lesson",   id: "w2d1-lesson", minutes: 25 },
      { type: "quiz",     id: "w2d1-quiz",   minutes: 12 },
      { type: "exercise", id: "w2d1-e1",     minutes: 20 },
      { type: "exercise", id: "w2d1-e2",     minutes: 25 },
      { type: "exercise", id: "w2d1-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "classic-ml", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w2d1-lesson"] = { title: "…", md: String.raw`…markdown…` };

  W.quizzes["w2d1-quiz"] = [
    { q: String.raw`…`, options: ["A", "B", "C", "D"], answer: 2,
      explain: String.raw`2–4 sentences teaching WHY.` },
    // 6–8 items per day quiz
  ];

  W.exercises["w2d1-e1"] = { /* see §4 */ };

  // ================= Day 6 (homework + boss day) =================
  // blocks: [ {type:"homework", id:"w2-hw", minutes:70}, {type:"boss", id:"w2-boss", minutes:35} ]
  // homework lives in W.exercises["w2-hw"] with kind:"homework"
  // boss task exercises live in W.exercises with kind:"boss"

  W.boss = {
    id: "w2-boss",
    title: "T2 — Classic ML",
    timeLimitMin: 30,
    passPct: 70,
    intro: String.raw`1–2 sentences of hype + what it covers.`,
    quiz: [ /* 10–14 quiz items, same schema as day quizzes */ ],
    tasks: ["w2-boss-t1"],   // ids of exercises with kind:"boss"
  };
})();
```

**Day plan per week: exactly 6 days.** Days 1–5: teaching days. Day 6: homework +
boss (+ a short lesson allowed). Teaching-day template: 1 lesson + 1 quiz (6–8 items) +
2 core exercises + 1 optional exercise (`optional: true`) + 1 cards block.
Day `minutes` = sum of block minutes, must land in 120–200.

IDs are strict: week `w2`, day `w2d1`, lesson `w2d1-lesson`, quiz `w2d1-quiz`,
exercises `w2d1-e1..e3`, homework `w2-hw` (or `w2-hw1`, `w2-hw2` if two), boss `w2-boss`,
boss tasks `w2-boss-t1..t2`. All ids globally unique.

## 2. Lessons

`{ title, md }`. **700–1200 words** (validator wants 2500–12000 chars). Required structure:

- Opening hook: 2–3 sentences — why this topic decides interviews.
- 3–5 sections with `###` headings; every concept illustrated with a short code fence.
- `### ⚠️ Common pitfalls` — 3–5 bullets.
- `### 🎤 In interviews, they ask` — 3–5 realistic interview questions as bullets.
- `### TL;DR` — 4–7 punchy bullets.
- `### Go deeper` — 2–4 links, ONLY well-known stable URLs (docs.python.org,
  numpy.org/doc, pandas.pydata.org/docs, scikit-learn.org/stable, huggingface.co/learn,
  jalammar.github.io/illustrated-transformer, karpathy.ai / YouTube "Zero to Hero",
  sebastianraschka.com, huyenchip.com, fastapi.tiangolo.com, docs.vllm.ai,
  python.langchain.com, arxiv.org abstracts). Never invent URLs.

## 3. Markdown dialect (rendered by js/md.js)

Supported: `##` `###` `####` headings · `**bold**` · `*italic*` · `~inline code~` ·
fenced blocks `~~~python` / `~~~text` … closed by `~~~` · `- ` bullets · `1. ` numbered ·
`[text](https://url)` · `> ` blockquote. NOT supported (do not use): tables, images,
raw HTML, backticks. Fences must be balanced (validator counts `~~~`).

Example inside a `String.raw` literal:

```text
### Mutability bites

~~~python
def add_item(item, bucket=[]):   # classic trap
    bucket.append(item)
    return bucket
~~~

Default args are evaluated **once**. Use ~None~ as the sentinel instead.
```

## 4. Exercises

```js
W.exercises["w2d1-e1"] = {
  title: "Vectorized pairwise distances",
  kind: undefined,          // undefined | "homework" | "boss"
  difficulty: 2,            // 1 | 2 | 3
  xp: 30,                   // difficulty 1→20, 2→30, 3→40; homework→100; boss task→40
  minutes: 20,
  packages: ["numpy"],      // [] | ["numpy"] | ["pandas"] | ["numpy","pandas"]
  asyncMode: false,         // true only for asyncio exercises (see §5)
  brief: "One-line hook shown on the day card.",
  description: String.raw`Problem statement in markdown: what to implement, the exact
function signature(s), 1–2 worked examples (~~~python fence), constraints, and an
"Interview angle:" line saying why this is asked.`,
  starter: String.raw`import numpy as np

def pairwise_dist(X):
    """Return the (n, n) matrix of euclidean distances. No python loops!"""
    # your code here
    raise NotImplementedError`,
  hints: [
    String.raw`Hint 1 — conceptual nudge.`,
    String.raw`Hint 2 — the approach, no code.`,
    String.raw`Hint 3 — nearly the code.`,
  ],
  solution: String.raw`import numpy as np

def pairwise_dist(X):
    sq = (X * X).sum(axis=1)
    d2 = sq[:, None] + sq[None, :] - 2 * (X @ X.T)
    return np.sqrt(np.clip(d2, 0, None))`,
  tests: [
    { name: "2x2 known case", code: String.raw`import numpy as np
X = np.array([[0.0, 0.0], [3.0, 4.0]])
D = pairwise_dist(X)
assert D.shape == (2, 2), f"expected shape (2,2), got {D.shape}"
assert abs(D[0, 1] - 5.0) < 1e-9, f"expected 5.0, got {D[0, 1]}"` },
    // 3–6 tests (homework: 6–12). Each independent, runs after user code in same namespace.
  ],
};
```

Test rules: use `assert cond, f"helpful message with actual values"`. Deterministic —
seed all randomness (`random.seed(0)`, `rng = np.random.default_rng(0)`). Float compares
via `math.isclose` / `abs(a-b) < 1e-6` / `np.allclose`. Tests never print. Test `name` is
shown to the learner — make it descriptive ("handles empty input", not "test 3").
Starter must be valid syntax and define the right signatures (body may `raise NotImplementedError`).
Solutions should be clean, idiomatic, commented only where genuinely non-obvious.

## 5. Python runtime constraints (Pyodide in a browser worker)

Allowed stdlib: `math, random, statistics, itertools, functools, collections, heapq,
bisect, re, json, string, dataclasses, typing, abc, enum, copy, io, contextlib, textwrap,
time (perf_counter only), asyncio (only with asyncMode:true)`.
Allowed packages (declare in `packages`): `numpy`, `pandas`.

FORBIDDEN in starter/solution/tests: file IO (`open`), network, `input()`, `threading`,
`multiprocessing`, `subprocess`, `sys.exit`, `matplotlib`, `sklearn`, `torch`,
`transformers`, `pip`, `time.sleep` (except `asyncio.sleep(x)` with x ≤ 0.05 in
asyncMode). Libraries may be *discussed* in lessons freely — they just can't run here.

`asyncMode: true`: tests may use top-level `await`; harness compiles with
top-level-await support. Keep total awaited sleep per test under 0.3s.

## 6. Quizzes

6–8 items per teaching day; 10–14 for a boss. Exactly 4 `options`, exactly one correct
`answer` (0-based index). `explain` (2–4 sentences) must teach the why, not restate the
answer. Per quiz include ≥2 code-reading questions ("What does this print?") with a
`~~~python` fence inside `q`. Distractors must be plausible (common misconceptions).
Vary `answer` positions — do not favor one index (validator warns if any index takes
more than 45% of a quiz).

## 7. Author workflow (do this loop until green)

```bash
cd "/Users/alsoleg/ML Course"
node tools/validate.js data/week2.js          # schema + string hygiene
node tools/extract.js data/week2.js /tmp/w2.json
./.venv/bin/python tools/check_solutions.py /tmp/w2.json   # or python3 if venv missing
```

`check_solutions.py` runs every solution against every test (and syntax-checks starters).
Anything failing = not done. Fix content, not the tools.

Append content in chunks with `cat >> data/week2.js <<'EOF' … EOF` (quoted heredoc keeps
backslashes and quotes literal) or the Edit tool. Keep the whole file inside the IIFE —
easiest: write header first ending with `})();` on the last line only after the final chunk,
or append plain `W.…` statements before a final closer chunk. Validate after each chunk.

## 8. Flashcards (`data/cards.js`)

```js
/* ML Quest — Interview flashcard bank */
(function () {
  CourseData.cards.push(
    { id: "py-001", deck: "python", level: 1, tags: ["basics"],
      q: String.raw`What is the difference between ~is~ and ~==~?`,
      a: String.raw`~==~ compares values by calling __eq__; ~is~ compares identity
(same object in memory). Use ~is~ only for singletons like ~None~. Small-int and
string interning can make ~is~ *appear* to work for values — never rely on it.` },
    // …
  );
})();
```

Decks (fixed enum) and minimum counts: `python` ≥ 22, `classic-ml` ≥ 28, `nlp` ≥ 28,
`llm` ≥ 22, `rag` ≥ 14, `agents` ≥ 10, `opt` ≥ 12 (PEFT/LoRA/training & optimization),
`inf` ≥ 8 (serving, vLLM, Triton, Docker/K8s basics), `qtz` ≥ 8 (quantization),
`prd` ≥ 10 (production: monitoring, drift, safety, cost). Multiple `push` blocks allowed.

`q` = a real interview question. `a` = the model answer you'd want to give: 3–8 tight
sentences or short bullets, 300–1400 chars, with the key terms named explicitly.
`level`: 1 junior / 2 mid / 3 senior-flavor. Ids: deck prefix + 3 digits (`rag-004`).

## 9a. Design cases (Weeks 6-7 "Design Dojo")

A case is a staged mock system-design interview. It lives in `W.cases` and is referenced
by a day block `{ type: "case", id: "w6d1-case", minutes: 35 }`.

```js
W.cases["w6d1-case"] = {
  title: "Chat product: MVP to 1M users",
  minutes: 35,
  xp: 60,                    // 60 regular; 100 for the week-7 capstone
  brief: "One-liner shown on the day card.",
  scenario: String.raw`The interviewer's opening prompt in markdown: the product, the
constraints, the numbers. 3-8 sentences. End with what the candidate is asked to do.`,
  stages: [
    {
      name: "Requirements & scope",
      prompt: String.raw`Stage question to the candidate (what would you clarify/decide here?).`,
      model: String.raw`The model answer in markdown — what a strong candidate covers, with
concrete numbers and tradeoffs. 150-400 words.`,
      rubric: [
        String.raw`Named the freshness/update-cadence requirement`,
        String.raw`Asked about scale: DAU, QPS, doc count`,
        // 3-8 short, binary-checkable items per stage
      ],
    },
    // 4-8 stages, typically: requirements → metrics/evals → data → architecture →
    // serving/scale → reliability/cost → monitoring/rollout
  ],
};
```

The player shows one stage at a time: the learner types their own answer first, then
reveals the model answer + rubric and self-ticks what they covered. XP = case.xp scaled
by rubric coverage (min 40%). Rubric items must be concrete and binary ("Proposed a
reranker", not "Understood retrieval"). Model answers must argue tradeoffs, not list
buzzwords.

Standalone library cases (not referenced by any day) are allowed in `W.cases` and in
`data/dojo-extras.js` via `CourseData.dojoExtras.push({ id, ...same schema })` — they
appear only in the Dojo tab as optional practice.

## 9b. Extra deck

Deck `design` (System Design) exists alongside the ten §8 decks: patterns, decision
frameworks, numbers-to-memorize (typical latency budgets, context costs, index sizes).
Minimum 20 cards.

## 9. XP economy (for reference — the app computes rewards)

Lesson read 15 · quiz question 5 · exercise 20/30/40 by difficulty · optional exercises
same · homework 100 · boss task 40 · boss pass bonus 150 · flashcard review 2.
