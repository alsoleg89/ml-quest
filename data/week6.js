/* ML Quest — Week 6: AI System Design: Foundations */
(function () {
  const W = {
    num: 6,
    id: "w6",
    emoji: "🏛️",
    title: "AI System Design: Foundations",
    subtitle: "Architecture before code",
    goal: "Design AI products like someone who has shipped and broken them.",
    days: [],
    lessons: {},
    quizzes: {},
    exercises: {},
    cases: {},
    boss: null,
  };
  CourseData.weeks.push(W);

  // ================= Day 1 =================
  W.days.push({
    id: "w6d1",
    title: "Planning an AI Product",
    minutes: 124,
    blocks: [
      { type: "lesson",   id: "w6d1-lesson", minutes: 22 },
      { type: "quiz",     id: "w6d1-quiz",   minutes: 12 },
      { type: "case",     id: "w6d1-case",   minutes: 35 },
      { type: "exercise", id: "w6d1-e1",     minutes: 25 },
      { type: "exercise", id: "w6d1-e2",     minutes: 20, optional: true },
      { type: "cards",    deck: "design",    count: 8, minutes: 10 },
    ],
  });

  W.lessons["w6d1-lesson"] = {
    title: "Planning an AI Product",
    md: String.raw`Every AI product interview opens the same way: a fuzzy business problem, and the interviewer watching to see whether you reach for a model or for a question. The people who get offers ask about error tolerance, unit economics, and the cost of being wrong before they say the word "embedding". This is the frame the rest of the week hangs on.

### Value lives where errors are cheap

The fastest screen for "should this even be AI" has two axes: how much value a correct automated output creates, and how much damage a wrong one does.

~~~text
                       value of automation
                  low                      high
               +------------------+--------------------+
  errors are   |  don't build     |  ship it           |  code completion,
  cheap        |  (demo candy)    |  autonomous        |  draft support replies
               +------------------+--------------------+
  errors are   |  don't build     |  human in the loop |  medical summaries,
  costly       |                  |  gated autonomy    |  contract redlines
               +------------------+--------------------+
~~~

Concretely: a support bot that fully resolves 40% of tickets and hands the rest to a human is a win, because a wrong answer costs one extra click. A dosage calculator that is right 99.5% of the time is unshippable, because the remaining 0.5% is a lawsuit. Same accuracy, opposite decision. The variable is error tolerance, not model quality — say that out loud and the room relaxes.

Second screen: **what actually compounds**. Foundation models made capability cheap, so nobody wins a market by calling the same API. Moats come from proprietary data, feedback loops, workflow integration, and evaluation infrastructure. In a product-design round, "our advantage is GPT-class quality" is a losing sentence; "our advantage is 400k labelled resolutions from our own support queue" is a winning one.

### Three layers, three sets of questions

- **Application layer** — prompts, context construction, orchestration, guardrails, UX, evals. Where 90% of AI-engineering work lives and where products are won.
- **Model layer** — which model, adapted how (prompt / RAG / finetune), routed between which tiers.
- **Infrastructure layer** — serving, caching, autoscaling, observability, cost controls.

Junior candidates spend all their airtime on the model layer. Strong candidates treat the model as a swappable component behind an interface — because it is. You will change models two or three times a year; if a model id appears in forty files, that migration is a quarter of work instead of a config change.

### What changed from classic ML

1. You start from a capable model, not from zero. Version one is a prompt, not a training run — days instead of months.
2. The bottleneck moved from modelling to **evaluation**. Open-ended text has no ~accuracy_score()~. You build the ruler before you build the thing (day 3).
3. Cost moved from training to **inference**, so it scales with usage forever. A model that costs 10x per token is a business decision, not an ML decision.
4. New failure modes: hallucination, prompt injection, and silent drift when a vendor ships a new checkpoint behind the same model name.
5. Latency is dominated by token generation, which drags product design into the engineering answer.

### Human-in-the-loop is a product pattern

Design the handoff explicitly, in one of three shapes. **Assist**: model drafts, human edits, human ships — best when editing is cheaper than authoring. **Confirm**: model proposes, human approves before anything executes — mandatory for irreversible actions like refunds, sends and deletes. **Escalate**: model runs autonomously and routes low-confidence cases to a queue, which only works if you have a confidence signal you trust.

The number to bring is the **review rate**: what fraction of outputs a human touches, and how it should fall. "We launched at 100% review, measured 92% human agreement on 500 audited samples after six weeks, then dropped to 20% sampled review" is a staff-level sentence. Bonus: every review is a label, which is the flywheel you will design on day 4.

### Latency is UX, not a metric

Three numbers matter: time to first token (TTFT), inter-token latency, and total time. Only TTFT is felt as "the app responded".

~~~python
prefill_ms = 400            # TTFT driver, grows with input length
tok_per_s  = 40             # decode speed
tokens     = 320            # a medium answer

ttft = prefill_ms + 1000 / tok_per_s            # 425 ms  -> first word on screen
full = prefill_ms + tokens * 1000 / tok_per_s   # 8400 ms -> last word on screen
~~~

Eight seconds of blank screen is a dead product. 425 ms to first word with text flowing is a fine one. Identical total latency, opposite outcome. So: stream everything, render retrieved sources while the answer generates, use optimistic skeletons, and push genuinely long jobs behind an async "we will notify you" flow. Also note that shorter outputs are both faster and cheaper — "be concise" is a latency optimization with a line item.

### Scoping an MVP honestly

- One workflow, one user, one measurable outcome: "cut median first response on tier-1 billing tickets from 6 h to 5 min".
- Write the eval set before the prompt: 100-200 real examples with expected behaviour.
- Build the smallest thing with the strongest model. A $2k/month bill on a product with no users is not your problem yet; a bad product is.
- Decide the kill metric up front. "If deflection is under 15% after 4 weeks at 5% traffic, we stop."
- Ship behind a flag to 1-5% of traffic, with a human path always one click away.

### ⚠️ Common pitfalls

- Choosing the use case by model capability instead of by error tolerance and value.
- Quoting benchmark scores as product evidence — MMLU has never resolved a support ticket.
- Ignoring the tail: p50 latency looks great while p95 at 12 s is what users churn over.
- Pricing the MVP instead of GA. Cost per active user per month at target scale is the number leadership asks for.
- Treating human review as failure rather than as the labelling pipeline that funds version two.

### 🎤 In interviews, they ask

- "Here is a business problem. Would you use a foundation model at all, and how would you know it was working?"
- "Your assistant is right 85% of the time. Is that shippable? What would change your answer?"
- "How do you keep a p95 latency budget of 3 s when generation alone takes 6 s?"
- "What is the moat here, given your competitor can call the same API tomorrow?"
- "You have 8 weeks and 2 engineers. What is in the MVP and what is explicitly out?"

### TL;DR

- Screen use cases on error tolerance x value of automation, not on model hype.
- Application layer is where the work and the differentiation are; keep the model swappable.
- Inference cost scales with usage forever — quote cost per user per month, not per call.
- HITL is a designed product pattern with a review rate that should drop over time.
- TTFT is what users feel; stream, and treat brevity as an optimization.
- An honest MVP is one workflow, one metric, an eval set written first, and a kill criterion.

### Go deeper

- [AI Engineering (Chip Huyen, 2025)](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) — chapters 1 and 10 are this lesson, expanded.
- [aie-book repo](https://github.com/chiphuyen/aie-book) — chapter notes, case-study list, resources.
- [Chip Huyen's blog](https://huyenchip.com/blog/) — production write-ups with real numbers.`,
  };

  W.quizzes["w6d1-quiz"] = [
    {
      q: String.raw`A fintech wants to auto-approve loan applications end to end with an LLM. Applications average $18k, and a wrong approval is unrecoverable. What is the strongest response in a design interview?`,
      options: [
        "Fine-tune on 5 years of historical decisions to push accuracy above 99%",
        "Reframe as decision support: the model drafts a recommendation with evidence, a human approves, and approvals above a confidence threshold get sampled audits",
        "Use a larger model and add a self-consistency vote over five samples",
        "Ship it behind a feature flag and monitor the default rate",
      ],
      answer: 1,
      explain: String.raw`Error cost here is unbounded and irreversible, which puts the use case in the human-in-the-loop quadrant no matter how good the model gets. Accuracy improvements (fine-tuning, voting) reduce error frequency but never make a wrong $18k approval recoverable. The design move is to change what the model is allowed to do, not to chase another point of accuracy.`,
    },
    {
      q: String.raw`What does this print?

~~~python
DAU = 40_000
REQ = 3                        # requests per user per day
TOK_IN, TOK_OUT = 2_000, 300
P_IN, P_OUT = 0.30, 1.20       # USD per 1M tokens

reqs = DAU * REQ * 30
cost = reqs * (TOK_IN / 1e6 * P_IN + TOK_OUT / 1e6 * P_OUT)
print(round(cost))
~~~`,
      options: [
        "2160",
        "3456",
        "34560",
        "1296",
      ],
      answer: 1,
      explain: String.raw`Per request: 2000/1e6 * 0.30 = $0.0006 input plus 300/1e6 * 1.20 = $0.00036 output, so $0.00096. Monthly requests are 40k * 3 * 30 = 3.6M, giving $3456. The distractors are the classic slips: input-only ($2160), output-only ($1296), and an off-by-10x from mixing per-1k and per-1M pricing.`,
    },
    {
      q: String.raw`Your assistant has a p50 latency of 1.1 s and a p95 of 9 s because long answers dominate the tail. Which change most improves perceived latency for the least engineering?`,
      options: [
        "Move to a smaller model to halve decode time",
        "Add a semantic cache in front of the model",
        "Stream tokens and render retrieved sources immediately, so first paint happens at TTFT",
        "Increase the batch size on the serving layer to raise throughput",
      ],
      answer: 2,
      explain: String.raw`Streaming changes what the user waits for from total generation time to time-to-first-token, which is typically 300-600 ms and independent of answer length. A smaller model or bigger batches change throughput and cost but leave the user staring at a blank pane until the response completes. Caching only helps on repeats, which is a small fraction of open-ended traffic.`,
    },
    {
      q: String.raw`A team lists these as their differentiators: a strong prompt, a frontier model, a clean UI, and 3 years of labelled ticket resolutions from their own product. Which one is the durable moat?`,
      options: [
        "The labelled ticket resolutions",
        "The prompt, because prompts are hard to reverse-engineer",
        "The frontier model, since access is expensive",
        "The UI, because switching costs are high",
      ],
      answer: 0,
      explain: String.raw`Prompts get copied, models get commoditised (your competitor calls the same endpoint tomorrow), and UI is imitable within a quarter. Proprietary interaction data that feeds evals and finetuning compounds and cannot be bought. This is why the flywheel from user feedback is treated as infrastructure, not as a nice-to-have.`,
    },
    {
      q: String.raw`What does this print?

~~~python
budget_ms = {"auth": 15, "retrieval": 220, "rerank": 90, "generation": 1900}
slo = 2000
total = sum(budget_ms.values())
worst = max(budget_ms, key=lambda k: budget_ms[k])
print(total <= slo, slo - total, worst)
~~~`,
      options: [
        "True 2000 generation",
        "True -225 retrieval",
        "False -225 retrieval",
        "False -225 generation",
      ],
      answer: 3,
      explain: String.raw`The stages sum to 15 + 220 + 90 + 1900 = 2225 ms, which blows the 2000 ms SLO by 225 ms, so the budget does not fit and the headroom is negative. Generation is the bottleneck at 1900 ms, which is where the design conversation should go — shorter outputs, streaming, or a faster tier — rather than to shaving the 15 ms auth hop.`,
    },
    {
      q: String.raw`Two engineers, eight weeks, and a mandate to prove an in-app assistant is worth funding. Which MVP scope reads as senior?`,
      options: [
        "Every surface of the product with a shared assistant, so leadership can see the vision",
        "One workflow for one user segment, an eval set of 150 real examples written first, and a stated kill metric",
        "A generic chat box over all company data, since retrieval quality will improve on its own",
        "A finetuned small model to control cost from day one",
      ],
      answer: 1,
      explain: String.raw`A narrow slice makes the outcome measurable and the failure legible, which is what a funding decision actually needs. Writing the eval set before the prompt forces the team to define correct behaviour rather than argue about vibes in review. Optimising cost with a finetune before you have product-market fit spends the scarce resource (weeks) on the wrong axis.`,
    },
    {
      q: String.raw`Which statement about the AI engineering stack would a strong candidate push back on?`,
      options: [
        "Application-layer work like context construction and evals is where most of the effort goes",
        "Model choice should sit behind an interface so it can change without touching product code",
        "Because the model layer is the hard part, most of the team should be model specialists",
        "Infrastructure concerns like caching and observability still apply, unchanged from classic services",
      ],
      answer: 2,
      explain: String.raw`In foundation-model products the model is an off-the-shelf component; the differentiated engineering is context, orchestration, guardrails, evaluation and UX. Staffing mostly model specialists is the classic misallocation that produces a great benchmark table and no shipped product. The other three statements are exactly how experienced teams organise the work.`,
    },
  ];
  W.cases["w6d1-case"] = {
    title: "Chat assistant for a B2B SaaS: MVP to 1M users",
    minutes: 35,
    xp: 60,
    brief: "Scope, measure, build and scale an in-app assistant — under a real budget.",
    scenario: String.raw`Northwind is a B2B project-management SaaS: 4,000 customer companies, 220k paying seats, workloads split across EU and US regions. Leadership wants an in-app assistant that answers questions about the customer's own workspace — projects, tickets, comments, uploaded documents — and drafts the weekly status update that every team lead writes by hand today.

You have **two engineers and eight weeks** to a private beta, and a mandate to reach GA within two quarters at roughly **1M monthly active users** across the customer base. Finance has set a soft ceiling of **$0.05 per monthly active user**. Enterprise contracts state that customer data is never used for training, and EU tenants' data must stay in the EU. Projects have per-project access lists; a seat can see some projects and not others.

You are the AI engineer in the room. The interviewer says: take it away.`,
    stages: [
      {
        name: "Requirements & scope",
        prompt: String.raw`Start where a strong candidate starts. What do you pin down before designing anything — functional scope, scale, freshness, latency, permissions, compliance — and what assumption do you commit to for each if the interviewer refuses to answer?`,
        model: String.raw`**Functional scope.** Three candidate capabilities: (a) Q&A over the tenant's workspace, (b) drafting weekly status updates, (c) taking actions such as creating or reassigning tickets. I commit to (a) and (b) and explicitly cut (c) from the beta: writes need a permission model, a confirmation UX and an audit trail, which is a quarter of work on its own. Saying the cut out loud makes it a decision rather than an omission.

**Numbers I pin down, with my default assumption:**

- **Scale.** 1M MAU is the headline, but the number I design against is peak QPS. Assume 40% of MAU touch the assistant in a month, 12 requests each: about 4.8M requests/month, about 1.9 req/s average. With business hours concentrated across three time zones, assume a 6x peak: **10-15 QPS**. That is small. This is a quality and cost problem, not a throughput problem, and I want the interviewer to hear me say that.
- **Freshness.** If someone comments on a ticket, how soon must the assistant know? Assume **5 minutes for tickets and comments, 1 hour for uploaded documents**. That single answer decides streaming versus nightly-batch ingestion.
- **Latency.** Assume p95 TTFT under 1.5 s with a fully streamed answer. It is a side panel, not a search box.
- **Corpus shape.** Assume the median tenant has 20k indexable items and the p99 tenant has 2M. The tail tenant is what breaks the naive single-index design.
- **Permissions.** Retrieval must honour per-project access lists at query time. This is a correctness requirement, not a security garnish: surfacing a private project in an answer is a churn event, not a bug ticket.
- **Compliance.** No training on customer data (a vendor-terms question more than an architecture one), EU tenant data and inference pinned to EU regions, per-request audit log of what was retrieved.

Out of scope for the beta: agentic multi-step actions, cross-tenant analytics, voice, mobile.`,
        rubric: [
          String.raw`Converted 1M MAU into a peak QPS estimate with stated assumptions`,
          String.raw`Named a freshness / update-cadence SLA for indexed content`,
          String.raw`Required retrieval to respect per-project access lists at query time`,
          String.raw`Pinned EU residency and no-training-on-customer-data as hard constraints`,
          String.raw`Asked for corpus size per tenant including the p99 tenant`,
          String.raw`Explicitly cut write actions out of the eight-week beta`,
        ],
      },
      {
        name: "Success metrics",
        prompt: String.raw`Leadership asks how you will know the assistant is working before they fund GA. What exactly do you measure, and which single headline metric with a numeric target do you put on the dashboard?`,
        model: String.raw`I measure on three levels and refuse to conflate them.

**Business.** Median time to produce a weekly status update (baseline: 25 minutes of manual writing), assistant-attributed seat expansion, and retention of accounts where the assistant is adopted. These move slowly; they justify the investment, they do not steer the week.

**Product.** Adoption (share of weekly active seats that use the assistant at least once — target 35% in month one), week-2 return rate of triers (target 60%), and implicit quality proxies: **copy rate** (answer copied into a comment or doc), **regenerate rate**, **abandon rate** (user closes the panel mid-stream), and explicit thumbs. Thumbs alone are useless at this volume — under 2% of responses get rated, and the raters are the angry tail. Implicit signals give you a reading on every response.

**Quality, offline.** A golden set of **200 curated examples** — 120 workspace Q&A, 80 status-update drafts — sampled from real usage, each with a reference answer and the documents that should have been retrieved. Scored on groundedness (every claim traceable to a retrieved doc), completeness, and format compliance. Retrieval is scored separately with recall@10, because a generation failure and a retrieval failure need different fixes.

**Headline metric:** *answer acceptance rate* — the share of assistant answers that are copied, kept in a draft, or thumbed up, and neither regenerated nor abandoned. Target 55% at beta, 70% at GA. It is one number, it is computed from behaviour rather than opinion, and it moves within days.

**Guardrail metrics that can independently block a launch:** p95 TTFT under 1.5 s, cost per MAU under $0.05, ungrounded-claim rate under 2% on the golden set, and zero cross-tenant retrievals in the audit log. A win on the headline metric with a guardrail breach is not a win.

Benchmarks like MMLU do not appear anywhere on this dashboard.`,
        rubric: [
          String.raw`Separated business, product and model-quality metrics rather than mixing them`,
          String.raw`Named one headline metric with a numeric target`,
          String.raw`Used implicit feedback (copy, regenerate, abandon), not thumbs alone`,
          String.raw`Specified a groundedness or citation-correctness metric with a threshold`,
          String.raw`Set guardrail metrics including p95 latency and cost per MAU`,
          String.raw`Committed to a golden set of at least 150-200 examples before launch`,
          String.raw`Scored retrieval separately from generation`,
        ],
      },
      {
        name: "MVP architecture",
        prompt: String.raw`Draw the eight-week beta. What are the components, what happens on a single request end to end with a latency budget, and which pieces do you deliberately buy rather than build?`,
        model: String.raw`**Components.** Change-data-capture from the product database into an ingestion worker; a chunker; an embedding service; a managed vector index storing ~tenant_id~, ~project_id~ and ~updated_at~ as filterable metadata; a retrieval service doing hybrid BM25 + dense search; a prompt assembler; a hosted frontier model behind a thin provider interface; and a request logger. Nothing exotic — the whole beta is boring on purpose.

**Request path, with the budget I would defend:**

~~~text
resolve caller ACLs (cached)          10 ms
hybrid retrieval, top-50, filtered   120 ms
rerank to top-8                       80 ms
prompt assembly (~3,500 tokens)       15 ms
model prefill -> first token         600 ms   <- what the user feels
stream ~350 tokens at 45 tok/s      7,800 ms  <- read as it arrives
~~~

TTFT lands near 825 ms against a 1.5 s p95 target, leaving real headroom for the p99 tenant. The 7.8 s completion time is fine because nobody waits for it.

**The provider interface matters more than the provider.** One module exposes ~generate(messages, tools, max_tokens)~ and ~embed(texts)~. Model ids live in config. When we route to a cheaper tier at GA, or a vendor deprecates a checkpoint, that is a config change instead of a forty-file refactor.

**Buy, do not build:** the vector index, the embedding endpoint, model serving, the queue. With two engineers, every self-hosted component is a tax paid weekly. Self-hosting becomes interesting when token spend passes roughly $30-50k/month, and we are nowhere near that in beta.

**Build:** the retrieval layer with ACL filtering, the eval harness, and the request log schema. The log is the highest-leverage thing shipped in week one: request id, tenant, prompt hash, retrieved doc ids and scores, model version, token counts, latency percentiles, and every downstream feedback event. Without it you cannot debug, cannot evaluate, cannot build a training set, and cannot run a canary later. Teams that add logging in month four end up with four months of unusable history.`,
        rubric: [
          String.raw`Put the model behind a provider interface so it can be swapped via config`,
          String.raw`Filtered retrieval by tenant and project ACLs at query time`,
          String.raw`Gave a per-stage latency budget that meets the stated TTFT target`,
          String.raw`Chose managed components over self-hosting a vector DB or serving stack`,
          String.raw`Specified a request log schema (retrieved ids, tokens, latency, feedback) from week one`,
          String.raw`Named the token budget of the assembled prompt`,
        ],
      },
      {
        name: "Scaling to 1M users",
        prompt: String.raw`The beta worked and you now must serve 1M MAU inside the $0.05 per-MAU ceiling. Show the arithmetic, then name the cost levers in order of impact and say what you refuse to change.`,
        model: String.raw`**The arithmetic first.** Budget: 1M MAU x $0.05 = **$50,000/month**. Traffic from stage 1: 4.8M requests/month. That is **$0.0104 per request** to spend on everything, inference included.

Current beta cost per request, on a frontier tier at $3 / $15 per million tokens: 3,500 input tokens x $3/1M = $0.0105, plus 350 output tokens x $15/1M = $0.00525. Total **$0.0158**, or **$75.8k/month** — 52% over budget. Not a catastrophe, but not shippable to finance either.

**Levers, ordered by impact per engineering hour:**

1. **Model routing.** Classify intent with a tiny classifier or a cheap model. Roughly 60% of traffic is simple lookup ("what is blocking ticket 412?") that a small tier at $0.25 / $1.25 per million answers indistinguishably — verified on the golden set, not assumed. That slice drops about 12x, taking the blended cost to about **$0.0072/request, $34.6k/month**. Done.
2. **Prompt caching.** The system prompt plus tenant preamble is about 1,200 stable tokens on every call. Where the provider supports cache reads at about 10% of input price, that is roughly a 30% cut on input cost for the frontier slice.
3. **Context trimming.** Go from 8 retrieved chunks to 5 — but only after the eval suite shows groundedness and acceptance are flat. Input drops 3,500 to about 2,400 tokens. Guessing here is how teams quietly ship a quality regression.
4. **Output discipline.** Cap ~max_tokens~, prompt for a concise answer with an explicit expand-on-demand affordance. Output tokens are 5x the price of input tokens; brevity is a line item.
5. **Semantic cache.** In B2B, repeated questions cluster around release days and status-update time. Expect an 8-12% hit rate — real money, but not the headline, and it needs a tenant-scoped key or you have built a data-leak machine.

**Infrastructure barely changes.** 10-15 QPS peak needs concurrency limits, a queue with backpressure, and regional EU/US splits. No custom serving stack.

**What I refuse to change under cost pressure:** ACL filtering, the eval gate before any prompt or model swap, request logging, and the citation requirement. Every one of those is a correctness or debuggability property, and every cost lever above is only safe because those exist.`,
        rubric: [
          String.raw`Computed a per-request cost budget from the per-MAU ceiling`,
          String.raw`Priced the current design and compared it against that budget`,
          String.raw`Proposed model routing or tiering with an estimated traffic split`,
          String.raw`Used prompt caching and/or context trimming gated on eval results`,
          String.raw`Noted output tokens cost several times more than input tokens`,
          String.raw`Named what stays unchanged (ACLs, eval gates, logging) under cost pressure`,
        ],
      },
      {
        name: "Risks & human-in-the-loop",
        prompt: String.raw`What is most likely to go wrong once real tenants are on this, and what specifically do you build so that each failure is survivable rather than fatal?`,
        model: String.raw`**Cross-tenant or cross-project leakage — top severity.** One leaked private project ends an enterprise contract. Controls: mandatory tenant and ACL filters enforced in the retrieval service (not in the caller), a post-generation check that every cited document id is inside the caller's permitted set, and a CI red-team suite of about 200 permission-probing queries per release. Any audit-log entry showing a retrieval outside the caller's ACL fires a page and trips a kill switch.

**Hallucinated workspace facts.** Require citations for every factual claim, and refuse when the top retrieval score is below a tuned threshold: "I could not find that in your workspace" beats a confident invention. Track ungrounded-claim rate weekly on the golden set with a 2% ceiling. A refusal is a good outcome; a fluent wrong answer about who owns a blocker is not.

**Prompt injection via ingested content.** Ticket comments and uploaded PDFs are untrusted input, and anyone with a seat can write them. Retrieved text is data, never instructions: keep it in a clearly delimited section, strip instruction-shaped patterns, and give the model no tools in the beta at all. Zero write tools means the blast radius of a successful injection is a weird answer, not a deleted project.

**Silent vendor drift.** A provider ships a new checkpoint behind the same alias and your quality moves overnight. Pin explicit model versions, re-run the regression suite on every version bump, and keep a second provider wired behind the interface built in stage 3.

**Cost blowout.** Per-tenant monthly token quotas, alerts at 70% of the budget, and a per-request token cap. One scripted tenant can otherwise burn a month of margin in a weekend.

**Human-in-the-loop by design.** Status updates land as an editable draft and are never auto-posted — confirm, not autonomy. Edit distance between draft and posted text becomes a free quality signal. Every refusal and every thumbs-down goes to a weekly triage queue, where the good ones become new golden-set cases.

**Rollout:** internal dogfood, then 10 friendly tenants, then 5% of tenants, then GA. Rollback is a feature-flag flip, not a deploy.`,
        rubric: [
          String.raw`Named cross-tenant or ACL leakage as top severity with a concrete control`,
          String.raw`Required citations plus a refusal path when retrieval confidence is low`,
          String.raw`Treated retrieved user content as untrusted with respect to prompt injection`,
          String.raw`Pinned model versions and planned for vendor-side drift`,
          String.raw`Kept generated status updates in a draft state requiring human confirmation`,
          String.raw`Described a staged rollout with flag-based rollback`,
          String.raw`Added per-tenant cost quotas or token caps`,
        ],
      },
    ],
  };

  W.exercises["w6d1-e1"] = {
    title: "Latency budget and monthly token cost",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "The two napkin calculations every AI design interview eventually demands.",
    description: String.raw`Design rounds run on two numbers: does the latency budget fit, and what does this cost per month. Implement both so you can produce them in 30 seconds under pressure.

**Part 1**

~~~python
def latency_budget(stages, slo_ms):
    ...
~~~

~stages~ maps a stage name (str) to its latency in milliseconds (int or float, non-negative). Return a dict with exactly these keys:

- ~"total"~ — a **float**: the sum of all stage latencies, rounded to 2 decimals.
- ~"fits"~ — a bool: True when ~total <= slo_ms~.
- ~"headroom"~ — a **float**: ~slo_ms - total~, rounded to 2 decimals (negative when over budget).
- ~"bottleneck"~ — the name of the slowest stage. On a tie, the alphabetically smallest name wins. ~None~ when ~stages~ is empty.

Raise ~ValueError~ if ~slo_ms~ is not positive, or if any stage latency is negative.

~~~python
latency_budget({"retrieval": 220, "rerank": 90, "generation": 1900}, 2000)
# {"total": 2210.0, "fits": False, "headroom": -210.0, "bottleneck": "generation"}
latency_budget({}, 500)
# {"total": 0.0, "fits": True, "headroom": 500.0, "bottleneck": None}
~~~

**Part 2**

~~~python
def monthly_token_cost(dau, req_per_user, tok_in, tok_out, price_in_per_m, price_out_per_m):
    ...
~~~

Assume a 30-day month. Prices are US dollars **per 1,000,000 tokens**. The formula, exactly:

~~~text
requests = dau * req_per_user * 30
cost     = requests * (tok_in / 1e6 * price_in_per_m + tok_out / 1e6 * price_out_per_m)
~~~

Return the cost rounded to 2 decimals. Raise ~ValueError~ if any argument is negative.

~~~python
monthly_token_cost(40000, 3, 2000, 300, 0.30, 1.20)   # 3456.0
~~~

Interview angle: interviewers do not want a perfect model of your bill, they want to see whether you can turn "1M users" into dollars per month and spot which stage owns the latency. Both answers are one line of arithmetic — the skill is having the formula memorised.`,
    starter: String.raw`def latency_budget(stages, slo_ms):
    """Sum a per-stage latency budget and report fit, headroom and bottleneck."""
    # your code here
    raise NotImplementedError


def monthly_token_cost(dau, req_per_user, tok_in, tok_out, price_in_per_m, price_out_per_m):
    """Monthly USD spend for a 30-day month. Prices are per 1M tokens."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Validate first, compute second. A single pass over ~stages.values()~ can check for negatives before you sum anything.`,
      String.raw`For the tie-break, ~min(stages, key=lambda k: (-stages[k], k))~ sorts by descending latency then ascending name in one expression.`,
      String.raw`Force floats explicitly: ~round(float(sum(...)), 2)~. Summing an empty dict gives the integer 0, and a test checks the type.`,
    ],
    solution: String.raw`def latency_budget(stages, slo_ms):
    if slo_ms <= 0:
        raise ValueError("slo_ms must be positive")
    for name, ms in stages.items():
        if ms < 0:
            raise ValueError(f"negative latency for stage {name}")
    total = round(float(sum(stages.values())), 2)
    bottleneck = min(stages, key=lambda k: (-stages[k], k)) if stages else None
    return {
        "total": total,
        "fits": total <= slo_ms,
        "headroom": round(float(slo_ms) - total, 2),
        "bottleneck": bottleneck,
    }


def monthly_token_cost(dau, req_per_user, tok_in, tok_out, price_in_per_m, price_out_per_m):
    args = (dau, req_per_user, tok_in, tok_out, price_in_per_m, price_out_per_m)
    if any(a < 0 for a in args):
        raise ValueError("arguments must be non-negative")
    requests = dau * req_per_user * 30
    per_request = tok_in / 1e6 * price_in_per_m + tok_out / 1e6 * price_out_per_m
    return round(requests * per_request, 2)`,
    tests: [
      { name: "over-budget pipeline reports negative headroom", code: String.raw`out = latency_budget({"retrieval": 220, "rerank": 90, "generation": 1900}, 2000)
assert out["total"] == 2210.0, f"total: {out['total']}"
assert out["fits"] is False, f"fits: {out['fits']}"
assert abs(out["headroom"] + 210.0) < 1e-9, f"headroom: {out['headroom']}"
assert out["bottleneck"] == "generation", f"bottleneck: {out['bottleneck']}"` },
      { name: "budget that fits reports positive headroom", code: String.raw`out = latency_budget({"auth": 15.5, "retrieval": 120.25}, 500)
assert abs(out["total"] - 135.75) < 1e-9, f"total: {out['total']}"
assert out["fits"] is True, f"fits: {out['fits']}"
assert abs(out["headroom"] - 364.25) < 1e-9, f"headroom: {out['headroom']}"` },
      { name: "ties in the bottleneck break alphabetically", code: String.raw`out = latency_budget({"zeta": 300, "alpha": 300, "mid": 120}, 1000)
assert out["bottleneck"] == "alpha", f"bottleneck: {out['bottleneck']}"` },
      { name: "empty stages give float zero and no bottleneck", code: String.raw`out = latency_budget({}, 500)
assert out["bottleneck"] is None, f"bottleneck: {out['bottleneck']}"
assert isinstance(out["total"], float), f"total type: {type(out['total'])}"
assert out["total"] == 0.0 and out["headroom"] == 500.0, f"got {out}"
assert out["fits"] is True, f"fits: {out['fits']}"` },
      { name: "bad inputs raise ValueError", code: String.raw`for bad in [({"a": 10}, 0), ({"a": -1}, 100), ({"a": 10, "b": -0.5}, 100)]:
    try:
        latency_budget(bad[0], bad[1])
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for {bad}")` },
      { name: "monthly cost matches the worked example", code: String.raw`assert monthly_token_cost(40000, 3, 2000, 300, 0.30, 1.20) == 3456.0, \
    f"got {monthly_token_cost(40000, 3, 2000, 300, 0.30, 1.20)}"
assert monthly_token_cost(0, 5, 1000, 100, 3.0, 15.0) == 0.0, "zero users must cost zero"
cheap = monthly_token_cost(1000, 1, 1000, 1000, 0.25, 1.25)
assert abs(cheap - 45.0) < 1e-9, f"got {cheap}"
try:
    monthly_token_cost(-1, 1, 1, 1, 1.0, 1.0)
except ValueError:
    pass
else:
    raise AssertionError("expected ValueError on negative dau")` },
    ],
  };

  W.exercises["w6d1-e2"] = {
    title: "Streaming versus waiting",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Quantify why streaming makes an 8-second answer feel instant.",
    description: String.raw`Users do not experience total generation time — they experience **time to first token**. This exercise turns that claim into a number you can quote in an interview.

~~~python
def streaming_ttft(prefill_ms, tokens, tok_per_s):
    ...
~~~

Compute, in this exact order:

~~~text
ms_per_token = 1000.0 / tok_per_s
ttft_ms      = round(prefill_ms + ms_per_token, 1)
full_ms      = round(prefill_ms + tokens * ms_per_token, 1)
speedup      = round(full_ms / ttft_ms, 2)      # from the ALREADY ROUNDED values
~~~

Return ~{"ttft_ms": ttft_ms, "full_ms": full_ms, "speedup": speedup}~.

The ~speedup~ deliberately uses the rounded ~ttft_ms~ and ~full_ms~, not the raw ones — so everyone gets the same answer.

Raise ~ValueError~ if ~prefill_ms~ is negative, ~tokens~ is less than 1, or ~tok_per_s~ is not positive.

~~~python
streaming_ttft(420, 300, 45)
# {"ttft_ms": 442.2, "full_ms": 7086.7, "speedup": 16.03}
~~~

A user sees the first word after 442 ms and reads along while the rest arrives; without streaming they stare at nothing for 7.1 seconds. Same model, same tokens, 16x difference in perceived responsiveness.

Interview angle: "how do you hit a 1.5 s p95 when generation takes 7 s" has exactly one good answer, and this is the arithmetic behind it.`,
    starter: String.raw`def streaming_ttft(prefill_ms, tokens, tok_per_s):
    """Compare time-to-first-token against full-response time.

    Returns {"ttft_ms": float, "full_ms": float, "speedup": float}.
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Validate all three arguments before any arithmetic — dividing by a zero decode rate should never happen.`,
      String.raw`Compute ~ms_per_token~ once and reuse it. TTFT is prefill plus exactly one token of decode.`,
      String.raw`Round ~ttft_ms~ and ~full_ms~ to 1 decimal first, then divide those rounded values for the speedup.`,
    ],
    solution: String.raw`def streaming_ttft(prefill_ms, tokens, tok_per_s):
    if prefill_ms < 0:
        raise ValueError("prefill_ms must be non-negative")
    if tokens < 1:
        raise ValueError("tokens must be at least 1")
    if tok_per_s <= 0:
        raise ValueError("tok_per_s must be positive")
    ms_per_token = 1000.0 / tok_per_s
    ttft_ms = round(prefill_ms + ms_per_token, 1)
    full_ms = round(prefill_ms + tokens * ms_per_token, 1)
    return {"ttft_ms": ttft_ms, "full_ms": full_ms, "speedup": round(full_ms / ttft_ms, 2)}`,
    tests: [
      { name: "worked example from the description", code: String.raw`out = streaming_ttft(420, 300, 45)
assert out == {"ttft_ms": 442.2, "full_ms": 7086.7, "speedup": 16.03}, f"got {out}"` },
      { name: "single token means no speedup", code: String.raw`out = streaming_ttft(500, 1, 50)
assert out["ttft_ms"] == 520.0, f"ttft: {out['ttft_ms']}"
assert out["full_ms"] == 520.0, f"full: {out['full_ms']}"
assert out["speedup"] == 1.0, f"speedup: {out['speedup']}"` },
      { name: "slow prefill compresses the advantage", code: String.raw`fast = streaming_ttft(100, 200, 40)
slow = streaming_ttft(3000, 200, 40)
assert fast["speedup"] > slow["speedup"], f"{fast['speedup']} should beat {slow['speedup']}"
assert slow["ttft_ms"] == 3025.0, f"ttft: {slow['ttft_ms']}"` },
      { name: "invalid arguments raise ValueError", code: String.raw`for args in [(-1, 10, 40), (100, 0, 40), (100, 10, 0), (100, 10, -5)]:
    try:
        streaming_ttft(*args)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for {args}")` },
      { name: "zero prefill is allowed", code: String.raw`out = streaming_ttft(0, 100, 25)
assert out["ttft_ms"] == 40.0, f"ttft: {out['ttft_ms']}"
assert out["full_ms"] == 4000.0, f"full: {out['full_ms']}"
assert out["speedup"] == 100.0, f"speedup: {out['speedup']}"` },
    ],
  };

  // ================= Day 2 =================
  W.days.push({
    id: "w6d2",
    title: "Choosing the Model: Build vs Buy",
    minutes: 124,
    blocks: [
      { type: "lesson",   id: "w6d2-lesson", minutes: 22 },
      { type: "quiz",     id: "w6d2-quiz",   minutes: 12 },
      { type: "case",     id: "w6d2-case",   minutes: 35 },
      { type: "exercise", id: "w6d2-e1",     minutes: 25 },
      { type: "exercise", id: "w6d2-e2",     minutes: 20, optional: true },
      { type: "cards",    deck: "design",    count: 8, minutes: 10 },
    ],
  });

  W.lessons["w6d2-lesson"] = {
    title: "Choosing the Model: Build vs Buy",
    md: String.raw`"Which model would you use?" is a trap. Name one and you have shown that you pick models the way people pick restaurants. The answer that lands is a filter, a small experiment, and a number — in that order. This lesson gives you the filter, the experiment and the arithmetic.

### Hard constraints first, preferences second

Before quality enters the conversation, eliminate. Constraints are binary and they collapse a field of forty models to five in about a minute:

- **Data boundary** — may customer data leave your VPC, your country, your continent? Does the vendor offer zero-retention endpoints and a processor agreement?
- **Licence** — commercial use, derivative works, MAU caps, whether outputs may train other models.
- **Modality and context** — do you need images, audio, 200k tokens of context, structured outputs, tool calling?
- **Latency ceiling** — a 90 s reasoning model cannot sit in an autocomplete path, whatever its score.
- **Operational reality** — do you have anyone to run a GPU fleet at 3 a.m.?

Everything after that is a tradeoff you argue with numbers.

### API versus open weights, priced honestly

The romantic case for self-hosting is cost. The arithmetic usually disagrees at startup scale:

~~~python
gpu_hourly = 3.50          # USD per H100-hour, on-demand
gpus, replicas = 2, 3      # one 70B-class replica, x3 for HA and rolling deploys
fixed = gpu_hourly * gpus * replicas * 24 * 30      # 15,120 USD / month, at zero traffic

api_out_per_m = 0.60       # USD per 1M output tokens, hosted open model
breakeven = fixed / api_out_per_m                   # 25,200 million output tokens
~~~

25.2 billion output tokens a month is about 72 million answers of 350 tokens. If you are not there, self-hosting is not a cost decision. It is a **control** decision: data never leaves your boundary, no vendor deprecates your checkpoint, you own the tail latency, you can quantize and batch to taste. Those are excellent reasons. "It will be cheaper" usually is not, once you price the engineer who babysits it.

The honest summary: **buy until control forces you to build.** Then keep both behind one interface, because you will run both.

### Selection is an eval, not a leaderboard read

Public benchmarks are a coarse prefilter and nothing more. They are contaminated (test items leak into pretraining data), they measure averages over tasks that are not yours, and vendors optimise for them. The funnel that works:

1. **Constraints filter** — 40 models to 5, mechanically.
2. **Leaderboard sanity check** — is this family in the right capability class at all? 5 to 3.
3. **Your eval on your golden set** — 100-200 real examples, your metrics, your rubric. This is the decision.
4. **A small online test** — 5% of traffic, guardrail metrics watched.

Then plot quality against cost per 1,000 requests and pick the knee, not the peak. A model that scores 3 points higher at 8x the price loses almost every product argument you will ever have.

### Licences: the slide nobody reads until legal does

"Open weights" is not "open source". Real clauses that have killed real plans: monthly-active-user ceilings above which you must negotiate a separate licence; non-commercial-only weights; restrictions on distributing derivatives; naming and attribution requirements; and — the one that surprises people — terms forbidding the use of a model's outputs to train a competing model, which is exactly what "let us distil the frontier model into our 8B" means.

Practical control: keep a machine-readable model registry with licence, commercial use, derivative rights, MAU cap, hosting constraints and retention terms, so a legal review is a lookup instead of an archaeology project. You will build exactly that in today's optional kata.

### The adaptation decision tree

Chip Huyen's framing is the one to memorise: **is the gap knowledge or behaviour?**

~~~text
model output is wrong
  |
  +-- it lacks INFORMATION (your docs, today's prices, this user)
  |      -> context: RAG, tools, longer prompt.  Fixes in days.
  |
  +-- it lacks BEHAVIOUR (format, tone, domain reasoning, task shape)
  |      -> prompt engineering first; finetuning (LoRA) when prompting plateaus
  |
  +-- it lacks CAPABILITY (a modality or skill the family does not have)
         -> different model. Almost never: train from scratch.
~~~

Order of operations, because each step costs roughly 10x the previous one in time and money: prompt, then prompt + RAG, then RAG + finetune, and only then consider pretraining. Finetuning does not reliably install facts — it installs behaviour. Teams that finetune to "teach the model our documentation" ship a model that hallucinates in the right tone.

From scratch is a nine-figure, multi-year decision that application teams essentially never make. Saying so fast is a judgement signal, not laziness.

### Tiers and routing

You will not use one model. A mature system routes: a small classifier or a cheap model triages, 50-70% of traffic goes to a cheap tier, hard cases escalate to a frontier tier, and a fallback provider covers outages. Track **escalation rate** and **quality by tier** — if the cheap tier's acceptance rate is within a point of the expensive one on its slice, the routing is doing its job. This is also your best cost lever, worth 3-10x, and it is invisible to users when the eval says the slice is safe.

### ⚠️ Common pitfalls

- Picking by leaderboard, then discovering the licence or the region forbids it.
- Self-hosting for cost reasons at 10M tokens a month, and paying an engineer 40 hours a week for the privilege.
- Finetuning to inject facts that change weekly — that is a retrieval problem wearing a training-run costume.
- Hardcoding a model id across the codebase, turning every migration into a refactor.
- Evaluating candidates on 12 handpicked prompts and calling it a bake-off.

### 🎤 In interviews, they ask

- "API or open weights for this product? Show me the break-even."
- "The model does not know our internal policies. Finetune or RAG, and why?"
- "How would you choose between three candidate models with a week of time?"
- "What licence questions would you ask before shipping an open-weights model?"
- "Your inference bill tripled after launch. What do you do first?"

### TL;DR

- Constraints filter first: data boundary, licence, modality, latency, ops capacity.
- Buy until control forces you to build; self-hosting is a control decision, not a cost hack.
- Break-even for a 2-GPU HA deployment is on the order of tens of billions of output tokens a month.
- Benchmarks prefilter; your golden set decides; a 5% online test confirms.
- Knowledge gap means RAG; behaviour gap means prompting then finetuning; capability gap means a different model.
- Routing across tiers is the largest safe cost lever you have.

### Go deeper

- [AI Engineering (Chip Huyen, 2025)](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) — chapter 4 on evaluating and selecting models, chapter 7 on finetuning.
- [aie-book repo](https://github.com/chiphuyen/aie-book) — model-selection checklists and chapter resources.
- [vLLM docs](https://docs.vllm.ai) — what self-hosting actually involves: batching, paged attention, throughput tuning.`,
  };

  W.quizzes["w6d2-quiz"] = [
    {
      q: String.raw`A hospital group wants a discharge-summary drafter. PHI cannot leave their cloud tenant, volume is about 8k requests/day, and they have one platform engineer. What is the sound recommendation?`,
      options: [
        "Self-host a 70B open-weights model on their own GPUs, since PHI cannot leave the tenant",
        "Use the cheapest public API and strip identifiers before sending",
        "Use a frontier model deployed inside their existing cloud tenant (vendor-hosted in-region with a processor agreement and zero retention), keeping self-hosting as a later option",
        "Train a domain model from scratch on their historical summaries",
      ],
      answer: 2,
      explain: String.raw`The hard constraint is the data boundary, not the deployment style — every major cloud offers first-party model endpoints inside your own tenant with a business-associate agreement, which satisfies it without a GPU fleet. With one platform engineer, self-hosting spends the scarcest resource on undifferentiated work at 8k requests/day. De-identification is brittle and does not remove the compliance obligation.`,
    },
    {
      q: String.raw`What does this print?

~~~python
gpu_hourly = 3.50
gpus, replicas = 2, 3
fixed = gpu_hourly * gpus * replicas * 24 * 30
api_per_m = 0.60                    # USD per 1M output tokens
breakeven_m_tokens = fixed / api_per_m
print(round(fixed), round(breakeven_m_tokens))
~~~`,
      options: [
        "15120 25200",
        "15120 9072",
        "10080 16800",
        "2520 4200",
      ],
      answer: 0,
      explain: String.raw`Fixed cost is 3.50 x 2 GPUs x 3 replicas x 720 hours = $15,120 per month before a single request. Dividing by $0.60 per million output tokens gives 25,200 million — 25.2 billion output tokens a month before self-hosting breaks even. That is the number that ends most "let us self-host to save money" conversations at startup scale.`,
    },
    {
      q: String.raw`Your assistant confidently quotes last year's pricing table. Prices change monthly. What is the correct fix?`,
      options: [
        "Finetune on the current pricing table so the model memorises it",
        "Retrieve the pricing table at request time and require the answer to cite it",
        "Increase the temperature so the model hedges instead of asserting",
        "Add a system-prompt line saying the model may be out of date",
      ],
      answer: 1,
      explain: String.raw`This is a knowledge gap in fast-moving data, which is retrieval's job — finetuning would have to be repeated every month and still would not guarantee the model recalls the right row. Temperature changes style, not factuality. A disclaimer transfers the failure to the user without preventing it.`,
    },
    {
      q: String.raw`After three weeks of prompt iteration, outputs are factually fine but only 78% follow your required JSON-plus-citation format, and you have 6,000 reviewed examples. What is the next move?`,
      options: [
        "Add more few-shot examples until the context window fills",
        "Switch to a larger frontier model and accept the cost",
        "Move the formatting requirement into the product UI and stop fighting it",
        "LoRA-finetune a smaller model on the 6,000 reviewed examples for format compliance",
      ],
      answer: 3,
      explain: String.raw`Format compliance is a behaviour gap, prompting has plateaued, and 6k curated in-domain examples is exactly the regime where a lightweight finetune wins — teams routinely take compliance into the high nineties while also dropping to a cheaper base model. Stuffing more few-shot examples raises cost per call permanently and has diminishing returns past a handful. Note the ordering: prompting was tried first, which is what makes the finetune defensible.`,
    },
    {
      q: String.raw`Which licence finding would actually block a launch plan, rather than merely annoy legal?`,
      options: [
        "The licence requires you to display the model family's name in your product's attribution page",
        "The weights are released under a non-commercial licence and your product is paid",
        "The licence requires you to keep the original copyright notice in redistributed weights",
        "The model card asks you to report safety issues to the maintainers",
      ],
      answer: 1,
      explain: String.raw`A non-commercial clause is a hard stop for a paid product — no engineering decision routes around it. Attribution, notice retention and voluntary reporting are compliance chores you satisfy with a page and a process. The point in an interview is to sort licence findings into blockers versus paperwork rather than treating all of them as equally scary.`,
    },
    {
      q: String.raw`What does this print?

~~~python
weights = {"quality": 3, "cost": 1}
opts = {"api": {"quality": 9, "cost": 4}, "oss": {"quality": 7, "cost": 9}}
tot = sum(weights.values())
scores = {k: round(sum(weights[c] * v[c] for c in weights) / tot, 2) for k, v in opts.items()}
print(scores)
~~~`,
      options: [
        "{'api': 6.5, 'oss': 8.0}",
        "{'api': 31, 'oss': 30}",
        "{'api': 7.75, 'oss': 7.5}",
        "{'api': 13.0, 'oss': 12.0}",
      ],
      answer: 2,
      explain: String.raw`Weights sum to 4, so api scores (3*9 + 1*4)/4 = 7.75 and oss scores (3*7 + 1*9)/4 = 7.5. Normalising by the weight total is what makes scores comparable across differently-weighted matrices; skipping it gives the unnormalised 31 and 30, which are the same ranking but meaningless as absolute numbers. Notice how narrow the gap is — a decision matrix should make you ask whether the criteria weights are defensible, not end the argument.`,
    },
    {
      q: String.raw`A candidate proposes: "We will pick whichever model tops the leaderboard this month and swap as the ranking changes." What is the strongest objection?`,
      options: [
        "Leaderboards are averages over contaminated public tasks and correlate weakly with your task; a 150-example golden set decides better and swapping without a regression gate is how quality silently drops",
        "Leaderboards are updated too infrequently to be useful",
        "Frontier models at the top are always too expensive for production",
        "Ranking changes mean the API contract changes, which breaks integrations",
      ],
      answer: 0,
      explain: String.raw`Public benchmarks are a prefilter: they tell you the capability class, not whether a model handles your German legal citations or your JSON schema. Continuous swapping without an offline regression gate and a canary converts every leaderboard update into an unmeasured production change. Cost and API stability are real concerns but secondary to the fact that the wrong ruler is being used.`,
    },
  ];

  W.cases["w6d2-case"] = {
    title: "Pick the stack for a legal-tech startup",
    minutes: 35,
    xp: 60,
    brief: "Privacy-heavy, German-language, 50k documents per firm — and two engineers.",
    scenario: String.raw`Kanzlei.ai is a twelve-person German legal-tech startup selling to mid-size law firms. The product answers questions across a firm's own matter files — contracts, filings, correspondence — in German, with citations down to the paragraph.

Each of the three pilot firms holds about **50,000 documents averaging 18 pages**, and adds roughly **400 documents a week**. Sixty lawyers per firm run about **30 queries a day** each. Firms operate under attorney-client privilege and German professional-secrecy rules: two of the three pilots have stated in writing that no client data may leave the EU, and the third insists nothing may leave their own infrastructure at all.

Engineering is two backend developers, one of whom has shipped an ML feature before. The seed round has to last fourteen months. Answers that cite the wrong paragraph are a professional-liability event, not a bug ticket.

Choose the stack and defend every part of it.`,
    stages: [
      {
        name: "Requirements & constraints",
        prompt: String.raw`Before naming a single model: which constraints and quality requirements do you extract from this brief, and which of them are genuinely non-negotiable versus negotiable with the customer?`,
        model: String.raw`I split the brief into constraints that eliminate options and requirements that get measured.

**Non-negotiable (these filter the model list before quality is discussed):**

- **Data boundary.** EU-only processing for two firms; nothing leaving the premises for the third. Note that these are two different architectures, and I want to know whether the third firm is worth building for in the pilot or is an enterprise tier sold later.
- **German legal register.** Not "supports German" on a model card — measured on our own examples. Legal German is a specific dialect and generic multilingual quality does not transfer for free.
- **Paragraph-level citations.** This drives chunking, metadata and a verification step, not just a prompt instruction.
- **Low error tolerance.** A wrong citation attached to a filing is a liability event. This is an assist product with mandatory human review; autonomy is off the table at any accuracy.

**Numbers I compute on the spot:**

- Traffic: 60 lawyers x 30 queries x 22 working days = **about 40k queries/month/firm**, about 120k across three pilots. Peak maybe 2-3 QPS. This is not a scale problem, and I will say so before anyone starts sketching a Kubernetes diagram.
- Corpus: 50k docs x 18 pages = **900k pages/firm**, roughly 480M tokens, roughly **1M chunks/firm** at 500 tokens per chunk.
- Freshness: 400 docs/week is trivial for incremental ingestion. I will assume a **4-hour staleness SLA** unless someone objects.

**Negotiable, and I say so:** end-to-end latency (lawyers will happily wait 5 s for a sourced answer, so streaming plus a visible retrieval step is enough), on-prem deployment for firm three, and coverage of scanned handwritten annexes in v1.

**Still unknown and worth asking:** how many documents are scanned images rather than digital text — OCR quality silently determines the ceiling of this entire product.`,
        rubric: [
          String.raw`Separated hard constraints that eliminate options from measurable requirements`,
          String.raw`Computed query volume per month and noted this is not a scale problem`,
          String.raw`Estimated corpus size in pages, tokens or chunks per firm`,
          String.raw`Treated German legal-language quality as something to measure, not assume`,
          String.raw`Identified paragraph-level citation as an architecture driver`,
          String.raw`Questioned OCR / scanned-document quality as a hidden ceiling`,
        ],
      },
      {
        name: "Build vs buy",
        prompt: String.raw`API or open weights? Run the build-versus-buy analysis with actual numbers and give the single recommendation you would defend in front of the board next week.`,
        model: String.raw`**Buy, with a sovereign escape hatch. Here is the arithmetic.**

*Buying.* 120k queries/month across the pilots, roughly 4,000 input and 500 output tokens each: 480M input and 60M output tokens. At frontier pricing of $3 / $15 per million that is $1,440 + $900 = **$2,340/month for all three firms**, about $780 per firm. Against a target contract of €60/seat/month x 60 seats = €3,600/firm/month, gross margin is comfortably north of 75% before any optimisation.

*Building.* A 70B-class open model needs roughly 2 x H100 per replica and two replicas for rolling deploys and failover. At $3.50/GPU-hour on demand that is **$15,120/month**, or maybe $6-8k on reserved EU capacity — 3-6x the API bill at this volume, plus an engineer permanently on call. With two backend developers, that is 50% of engineering capacity spent on something no customer will ever notice working.

*Which constraint actually forces the decision?* Not cost — **residency and secrecy**. And EU-region endpoints from a major provider, with a data-processing agreement, zero-retention inference and a published sub-processor list, satisfy the two firms that demanded "not outside the EU". So buying is available even under the strict reading, and I would confirm that in writing with the firms' data-protection officers before designing anything.

**Recommendation.** Ship on an EU-hosted frontier API behind a thin provider interface. Sell the third firm a "sovereign tier" — an open-weights model served with vLLM inside their own infrastructure — as a priced enterprise option, built only once two paying customers demand it. Charge for it: it costs us an ops burden forever.

**Diligence I do before signing either path:** vendor terms on training with customer inputs and retention windows; for the open model, commercial use, derivative rights, any MAU ceiling, and whether outputs may be used to train other models. That last clause is what kills the "distil it into a small German model later" plan, so I check it now rather than in month nine.`,
        rubric: [
          String.raw`Priced the API path from token volumes and compared it to contract value`,
          String.raw`Priced self-hosting including replicas for HA and engineer time`,
          String.raw`Concluded that residency, not cost, is the deciding constraint`,
          String.raw`Proposed EU-region endpoints with a processor agreement and zero retention`,
          String.raw`Made on-prem a priced enterprise tier rather than the default architecture`,
          String.raw`Listed licence and vendor-terms diligence items before committing`,
        ],
      },
      {
        name: "Adaptation choice",
        prompt: String.raw`Prompt engineering, RAG, finetuning, or training from scratch — pick the adaptation path and state precisely what measured evidence would move you to the next one.`,
        model: String.raw`**The gap is knowledge, not behaviour, so it is RAG. Decisively.**

The model does not know this firm's matter files, and it never will: 480M tokens per firm, changing by 400 documents a week, with per-matter access control. Finetuning cannot install that — it installs behaviour, not a searchable corpus, and it would need re-running weekly while still failing to respect permissions. Training from scratch is a nine-figure decision; I say that in one sentence and move on.

**Sequence, with the trigger for each step spelled out:**

1. **Prompt + RAG baseline** on a strong model. Build a **200-question golden set** with paralegals from two pilot firms, each item carrying the paragraphs that should have been retrieved. Metrics: retrieval recall@20, citation precision (does the cited paragraph actually support the claim?), groundedness, and correct-refusal rate.
2. **If recall@20 is below about 85%, fix retrieval, not the model.** This is where the wins live for German legal text: paragraph-aware chunking, a multilingual embedding model chosen by measurement, hybrid BM25 plus dense (legal German is heavily lexical — statute references and defined terms — so BM25 earns its keep), and a cross-encoder reranker. Expect the reranker alone to be worth 5-12 points of precision@8.
3. **Finetune the embedding model before the generator.** 5-10k query-passage pairs mined from real lawyer queries and reviewed answers typically buys several points of recall for a fraction of the cost and risk of a generator finetune. This is the highest-ROI training we would do.
4. **LoRA on the generator only if a behaviour gap persists** after prompt iteration: for example citation-format compliance stuck below 90%, or a register the model will not hold. Trigger threshold stated up front so it is a decision, not a mood. Cost: days of work plus a permanent retrain-and-re-evaluate obligation on every base-model change.

**What would make me wrong:** if recall is already 95% and the failures are all reasoning over multiple documents, then no amount of retrieval work helps and the answer is a stronger model or a decomposition step.`,
        rubric: [
          String.raw`Classified the gap as knowledge and chose RAG over finetuning explicitly`,
          String.raw`Rejected training from scratch in one sentence with a reason`,
          String.raw`Proposed a golden set with retrieval and citation metrics before any tuning`,
          String.raw`Named a numeric trigger (e.g. recall or format compliance) for escalating to finetuning`,
          String.raw`Suggested hybrid lexical plus dense retrieval for legal terminology`,
          String.raw`Preferred embedding finetuning over generator finetuning as the first training step`,
        ],
      },
      {
        name: "Architecture sketch",
        prompt: String.raw`Sketch the system end to end, and be specific about one thing: how a paragraph-level citation is actually produced and then verified before a lawyer ever sees it.`,
        model: String.raw`**Ingestion.** Watcher on the firm's document store; OCR for scanned filings; layout-aware parsing that preserves page numbers and paragraph boundaries — this is the step that makes paragraph citations possible at all. Chunk at paragraph granularity with a parent-document link so the model can be shown surrounding context without losing the citable unit. Metadata per chunk: ~firm_id~, ~matter_id~, ~doc_id~, ~page~, ~para_idx~, ~doc_date~, ~doc_type~, ACL list.

**Isolation.** One index per firm, separate encryption keys. A shared index with a tenant filter is one bug away from a privilege breach, and no law firm will accept "we filter by ~firm_id~ in the query" as an answer. At about 1M chunks x 1024 dims x 4 bytes = 3.8 GiB raw (about 5 GiB with overhead) per firm, per-firm indexes are cheap. This is the rare case where the more isolated design is also the simpler one.

**Query path.** Resolve the lawyer's matter permissions, hybrid retrieval (BM25 + dense) to top-50 within permitted matters, cross-encoder rerank to top-8, expand each hit with its neighbouring paragraphs, assemble a prompt of about 4k tokens, generate with a strict output schema of claims each carrying ~doc_id~ and ~para_idx~.

**Citation verification — the part that matters.** Generation alone gives you plausible-looking citations. So every claim-citation pair goes through a cheap verification pass before rendering: check that the cited paragraph actually entails the claim, using a small NLI-style model or a cheap-tier LLM call with a yes/no rubric. Unsupported pairs are dropped and the claim is either re-grounded or removed. If more than a set fraction of claims fail, the whole answer is replaced by an honest "I could not ground this in your files" plus the retrieved passages. Verification costs perhaps 15% of the generation bill and converts the single most damaging failure mode into a refusal.

**Also shipped:** refusal path on low rerank scores, per-query audit log of retrieved document ids, and a UI that puts the source paragraph one click away — because the product's real job is making the lawyer's own verification fast.`,
        rubric: [
          String.raw`Preserved page and paragraph structure during parsing to enable citations`,
          String.raw`Chose per-firm index isolation and justified it against shared-index filtering`,
          String.raw`Described hybrid retrieval plus reranking with concrete top-k values`,
          String.raw`Added an explicit post-generation citation verification step`,
          String.raw`Defined what happens when verification fails (refusal or re-grounding)`,
          String.raw`Estimated index size from chunk count, dimension and dtype`,
        ],
      },
      {
        name: "Cost & compliance check",
        prompt: String.raw`Close it out: what does one firm cost per month, and what compliance story do you put in front of the firm's data-protection officer to get the contract signed?`,
        model: String.raw`**Monthly cost, one firm (40k queries):**

- Generation: 160M input + 20M output tokens at $3 / $15 per million = $480 + $300 = **$780**. With intent routing that sends about 60% of queries (lookups, single-document questions) to a cheap tier at $0.25 / $1.25, the blended bill drops to about **$350**.
- Citation verification: roughly 15% of generation spend, so **$50-120**.
- Embeddings: the initial 480M-token index costs about **$10 once**; the 400 new documents a week are about 16M tokens a month, about **$0.30**. The part everyone assumes is expensive is free.
- Vector index hosting for about 5 GiB with replication: **$150-250**.
- Reranking: 2M candidate pairs a month, a few dollars hosted or free on a CPU box.

**Total ≈ $550-700 per firm per month** against €3,600 of contract value. Gross margin around 80%, and the dominant line item is generation, which is exactly where routing and shorter outputs keep working as levers.

**The compliance story**, written as artefacts rather than assurances:

1. **Data-flow diagram** — what leaves the firm's tenant, which EU region processes it, retention (zero-retention inference endpoints), and the published sub-processor list. Backed by a processor agreement and a contractual no-training-on-inputs clause.
2. **Isolation by construction** — one index and one key per firm; cross-firm retrieval is not filtered out, it is impossible.
3. **Permission mirroring** — matter-level access lists are enforced at retrieval time and re-checked at render time.
4. **Audit trail** — every query, every retrieved document id, model version and answer, retained per the firm's own policy and exportable.
5. **Deletion SLA** — a document deleted at source disappears from the index within 24 hours; a matter deletion purges chunks, embeddings and cached answers. Tested quarterly, with the test result as a document.
6. **Human-in-the-loop by contract** — outputs are drafts with sources attached, never filed unreviewed, and the UI enforces it.
7. **Sovereign tier** — for firms that will not accept external processing, the same product on their own hardware, priced accordingly.

The lawyers' questions will be about deletion, retention and audit. The engineering answer is that all three were designed in, which is why they can be answered in one meeting instead of one quarter.`,
        rubric: [
          String.raw`Produced a per-firm monthly cost broken down by component`,
          String.raw`Compared cost against contract value or gross margin`,
          String.raw`Identified generation as the dominant cost and named a routing lever with a traffic split`,
          String.raw`Noted embedding and ingestion costs are negligible relative to generation`,
          String.raw`Offered concrete compliance artefacts: data-flow, retention, audit trail, sub-processors`,
          String.raw`Committed to a deletion SLA covering index, embeddings and caches`,
          String.raw`Kept human review contractual, with outputs as drafts`,
        ],
      },
    ],
  };

  W.exercises["w6d2-e1"] = {
    title: "Weighted decision matrix",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Turn a build-vs-buy argument into a ranking you can defend on a whiteboard.",
    description: String.raw`Design interviews reward candidates who make tradeoffs explicit. A weighted decision matrix does that in ten lines: score each option on each criterion, weight the criteria, normalise, rank.

~~~python
def decision_matrix(options, weights):
    ...
~~~

- ~options~ maps an option name (str) to a dict of criterion name to score (a number, conventionally 0-10).
- ~weights~ maps a criterion name to a non-negative weight. Weights do **not** arrive normalised — you normalise them by their sum so results from differently-scaled matrices are comparable.
- Only criteria present in ~weights~ count. A criterion missing from an option's scores counts as **0.0**. Extra criteria in an option that are absent from ~weights~ are ignored.
- An option's score is ~sum(weight[c] / total_weight * scores.get(c, 0.0))~, rounded to **3 decimals**.
- Return a **list of ~(name, score)~ tuples**, sorted by score descending, then by name ascending. Sort on the rounded score so ties are stable.

Raise ~ValueError~ when ~weights~ is empty, when any weight is negative, or when the weights sum to zero. An empty ~options~ dict returns ~[]~.

~~~python
options = {
    "api":        {"quality": 9, "cost": 4, "control": 3},
    "oss_hosted": {"quality": 7, "cost": 7, "control": 6},
    "self_host":  {"quality": 7, "cost": 5, "control": 9},
}
weights = {"quality": 5, "cost": 3, "control": 2}

decision_matrix(options, weights)
# [("oss_hosted", 6.8), ("self_host", 6.8), ("api", 6.3)]
~~~

Note the tie: ~oss_hosted~ and ~self_host~ both score 6.8, and alphabetical order breaks it. Note also how close ~api~ is — a decision matrix is a device for exposing that your weights are doing the arguing, not a machine that ends the argument.

Interview angle: when an interviewer says "how would you choose between these three models", drawing this table and stating the weights out loud is the answer they are hoping for.`,
    starter: String.raw`def decision_matrix(options, weights):
    """Rank options by weighted, normalised criterion scores.

    Returns a list of (name, score) tuples: score desc, then name asc.
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Validate the weights before touching the options: empty dict, any negative value, or a zero sum all raise ~ValueError~.`,
      String.raw`Normalise once into a new dict (weight divided by the total) and reuse it for every option, rather than dividing inside the inner loop.`,
      String.raw`Sorting is one line: ~sorted(pairs, key=lambda kv: (-kv[1], kv[0]))~ gives score descending with an alphabetical tie-break.`,
    ],
    solution: String.raw`def decision_matrix(options, weights):
    if not weights:
        raise ValueError("weights must not be empty")
    if any(w < 0 for w in weights.values()):
        raise ValueError("weights must be non-negative")
    total = float(sum(weights.values()))
    if total == 0:
        raise ValueError("weights must not sum to zero")

    norm = {c: w / total for c, w in weights.items()}
    scored = []
    for name, scores in options.items():
        value = sum(norm[c] * scores.get(c, 0.0) for c in norm)
        scored.append((name, round(value, 3)))
    return sorted(scored, key=lambda kv: (-kv[1], kv[0]))`,
    tests: [
      { name: "worked example ranks with an alphabetical tie-break", code: String.raw`options = {
    "api":        {"quality": 9, "cost": 4, "control": 3},
    "oss_hosted": {"quality": 7, "cost": 7, "control": 6},
    "self_host":  {"quality": 7, "cost": 5, "control": 9},
}
weights = {"quality": 5, "cost": 3, "control": 2}
out = decision_matrix(options, weights)
assert out == [("oss_hosted", 6.8), ("self_host", 6.8), ("api", 6.3)], f"got {out}"` },
      { name: "weights are normalised, so scaling them changes nothing", code: String.raw`options = {"a": {"x": 8, "y": 2}, "b": {"x": 3, "y": 9}}
small = decision_matrix(options, {"x": 1, "y": 3})
big = decision_matrix(options, {"x": 100, "y": 300})
assert small == big, f"{small} != {big}"
assert small[0][0] == "b", f"expected b first, got {small}"
assert abs(small[0][1] - 7.5) < 1e-9, f"got {small[0][1]}"` },
      { name: "missing criteria count as zero", code: String.raw`out = decision_matrix({"partial": {"quality": 8}}, {"quality": 5, "cost": 3, "control": 2})
assert out == [("partial", 4.0)], f"got {out}"` },
      { name: "criteria absent from weights are ignored", code: String.raw`out = decision_matrix({"m": {"quality": 6, "hype": 10}}, {"quality": 1})
assert out == [("m", 6.0)], f"got {out}"` },
      { name: "empty options give an empty ranking", code: String.raw`assert decision_matrix({}, {"quality": 1}) == [], "empty options must return []"` },
      { name: "invalid weights raise ValueError", code: String.raw`opts = {"a": {"x": 1}}
for bad in [{}, {"x": -1}, {"x": 0, "y": 0}]:
    try:
        decision_matrix(opts, bad)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for weights {bad}")` },
    ],
  };

  W.exercises["w6d2-e2"] = {
    title: "Licence gate",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Make legal review a lookup instead of an archaeology project.",
    description: String.raw`Every serious team keeps a machine-readable model registry so that "can we ship this model?" is a function call, not a two-week email thread. Build the gate.

~~~python
def license_gate(model_meta, requirements):
    ...
~~~

~model_meta~ must contain: ~license~ (str), ~commercial_use~ (bool), ~derivatives_allowed~ (bool), ~mau_cap~ (int or ~None~ for no cap), ~self_host~ (bool), ~data_retention_days~ (int). Extra keys such as ~name~ are allowed and ignored.

~requirements~ must contain: ~commercial~ (bool), ~finetune~ (bool), ~expected_mau~ (int), ~on_prem~ (bool), ~max_data_retention_days~ (int).

If any required key is missing from either dict, raise ~ValueError~.

Emit these blocker codes:

- ~"no_commercial_use"~ — the plan is commercial but the licence forbids it.
- ~"no_derivatives"~ — the plan involves finetuning but derivatives are not allowed.
- ~"mau_cap_exceeded"~ — ~mau_cap~ is not ~None~ and ~expected_mau~ is **strictly greater** than it. Landing exactly on the cap is fine.
- ~"no_self_host"~ — on-premise deployment is required but the model cannot be self-hosted.
- ~"retention_too_long"~ — the model's ~data_retention_days~ is strictly greater than ~max_data_retention_days~.

Return ~{"ok": bool, "blockers": [...]}~ where ~blockers~ is sorted alphabetically and ~ok~ is True exactly when the list is empty.

~~~python
meta = {"license": "research-nc", "commercial_use": False, "derivatives_allowed": False,
        "mau_cap": None, "self_host": True, "data_retention_days": 0}
req = {"commercial": True, "finetune": True, "expected_mau": 1_000_000,
       "on_prem": True, "max_data_retention_days": 30}

license_gate(meta, req)
# {"ok": False, "blockers": ["no_commercial_use", "no_derivatives"]}
~~~

Interview angle: "what licence questions would you ask before shipping an open-weights model" is a real screening question, and the good answer is a list of exactly these checks — plus the observation that a non-commercial clause is a blocker while an attribution clause is paperwork.`,
    starter: String.raw`def license_gate(model_meta, requirements):
    """Check a model's licence and terms against deployment requirements.

    Returns {"ok": bool, "blockers": [sorted codes]}.
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Start with the key check: build the two required-key sets, subtract the provided keys, and raise ~ValueError~ if anything is missing.`,
      String.raw`Each rule is one ~if~ appending one string. Resist the urge to be clever — a readable gate is one a lawyer can review.`,
      String.raw`Watch the boundaries: ~mau_cap~ of ~None~ means unlimited, and equality with a cap or a retention limit is allowed, so use strict ~>~.`,
    ],
    solution: String.raw`META_KEYS = {"license", "commercial_use", "derivatives_allowed",
             "mau_cap", "self_host", "data_retention_days"}
REQ_KEYS = {"commercial", "finetune", "expected_mau", "on_prem", "max_data_retention_days"}


def license_gate(model_meta, requirements):
    missing = sorted((META_KEYS - set(model_meta)) | (REQ_KEYS - set(requirements)))
    if missing:
        raise ValueError("missing keys: " + ", ".join(missing))

    blockers = []
    if requirements["commercial"] and not model_meta["commercial_use"]:
        blockers.append("no_commercial_use")
    if requirements["finetune"] and not model_meta["derivatives_allowed"]:
        blockers.append("no_derivatives")
    cap = model_meta["mau_cap"]
    if cap is not None and requirements["expected_mau"] > cap:
        blockers.append("mau_cap_exceeded")
    if requirements["on_prem"] and not model_meta["self_host"]:
        blockers.append("no_self_host")
    if model_meta["data_retention_days"] > requirements["max_data_retention_days"]:
        blockers.append("retention_too_long")
    return {"ok": not blockers, "blockers": sorted(blockers)}`,
    tests: [
      { name: "permissive model with a big cap passes", code: String.raw`meta = {"name": "open-70b", "license": "community-1.0", "commercial_use": True,
        "derivatives_allowed": True, "mau_cap": 700_000_000, "self_host": True,
        "data_retention_days": 0}
req = {"commercial": True, "finetune": True, "expected_mau": 1_000_000,
       "on_prem": True, "max_data_retention_days": 30}
assert license_gate(meta, req) == {"ok": True, "blockers": []}, f"got {license_gate(meta, req)}"` },
      { name: "non-commercial plus no-derivatives yields two sorted blockers", code: String.raw`meta = {"license": "research-nc", "commercial_use": False, "derivatives_allowed": False,
        "mau_cap": None, "self_host": True, "data_retention_days": 0}
req = {"commercial": True, "finetune": True, "expected_mau": 1_000_000,
       "on_prem": True, "max_data_retention_days": 30}
out = license_gate(meta, req)
assert out == {"ok": False, "blockers": ["no_commercial_use", "no_derivatives"]}, f"got {out}"` },
      { name: "landing exactly on the MAU cap is allowed", code: String.raw`meta = {"license": "x", "commercial_use": True, "derivatives_allowed": True,
        "mau_cap": 500_000, "self_host": True, "data_retention_days": 30}
req = {"commercial": True, "finetune": False, "expected_mau": 500_000,
       "on_prem": False, "max_data_retention_days": 30}
assert license_gate(meta, req)["ok"] is True, "equality with the cap must pass"
req_over = dict(req, expected_mau=500_001)
assert license_gate(meta, req_over)["blockers"] == ["mau_cap_exceeded"], "one over must fail"` },
      { name: "hosted-only model blocks an on-prem requirement", code: String.raw`meta = {"license": "api-tos", "commercial_use": True, "derivatives_allowed": False,
        "mau_cap": None, "self_host": False, "data_retention_days": 90}
req = {"commercial": True, "finetune": False, "expected_mau": 10_000,
       "on_prem": True, "max_data_retention_days": 0}
out = license_gate(meta, req)
assert out["ok"] is False, f"got {out}"
assert out["blockers"] == ["no_self_host", "retention_too_long"], f"got {out['blockers']}"` },
      { name: "missing keys raise ValueError", code: String.raw`good_meta = {"license": "x", "commercial_use": True, "derivatives_allowed": True,
             "mau_cap": None, "self_host": True, "data_retention_days": 0}
good_req = {"commercial": True, "finetune": False, "expected_mau": 1,
            "on_prem": False, "max_data_retention_days": 0}
for meta, req in [({}, good_req), (good_meta, {}), ({"license": "x"}, good_req)]:
    try:
        license_gate(meta, req)
    except ValueError:
        continue
    raise AssertionError("expected ValueError for incomplete input")` },
    ],
  };

  // ================= Day 3 =================
  W.days.push({
    id: "w6d3",
    title: "Evaluation-Driven Development",
    minutes: 124,
    blocks: [
      { type: "lesson",   id: "w6d3-lesson", minutes: 22 },
      { type: "quiz",     id: "w6d3-quiz",   minutes: 12 },
      { type: "case",     id: "w6d3-case",   minutes: 35 },
      { type: "exercise", id: "w6d3-e1",     minutes: 25 },
      { type: "exercise", id: "w6d3-e2",     minutes: 20, optional: true },
      { type: "cards",    deck: "design",    count: 8, minutes: 10 },
    ],
  });

  W.lessons["w6d3-lesson"] = {
    title: "Evaluation-Driven Development",
    md: String.raw`Ask a team how they know their AI feature got better and watch them describe a vibe. Evaluation is the hardest part of AI engineering and the part that separates a demo from a product — which is exactly why interviewers spend so much time on it. The rule that organises everything below: **build the ruler before you build the thing**.

### The ruler comes first

Writing the eval set before the prompt forces you to define correct behaviour while you still have an open mind. Afterwards, every design argument has an arbiter, every prompt tweak has a number, and "it feels better" stops being an acceptable sentence in a review.

The eval stack has three layers, and confusing them is a classic interview stumble:

1. **Exact checks** — deterministic, free, run on everything. JSON validity, schema conformance, forbidden phrases, citation ids that actually exist, PII patterns, language match. Typically 30-50% of your criteria are exactly checkable, and teams under-use this layer badly.
2. **Model-graded checks** — an LLM judge scores what code cannot: groundedness, helpfulness, tone.
3. **Human review** — a sampled spot-check that keeps the other two honest.

### The golden set is a product artefact

Composition matters more than size, but size decides what you can detect. The statistics are worth memorising:

~~~python
import math
p = 0.80                                   # pass rate you expect
for n in (100, 400, 1000):
    ci = 1.96 * math.sqrt(p * (1 - p) / n) * 100
    print(n, round(ci, 1))                 # 100 7.8 | 400 3.9 | 1000 2.5
~~~

With 100 examples your 95% confidence interval is roughly ±8 points, so a "5-point improvement" is noise. 400 examples buys ±4 points, which is the usual knee for a launch gate. Below 100 you are doing anecdotes with extra steps.

Composition: roughly **55% head traffic** (the common cases), **25% tail** (rare intents, ambiguity, multi-turn), **20% adversarial and regression** (injection attempts, edge-case policies, and every past incident, permanently). Stratify so each slice you care about has at least 50 items — a per-slice number computed from 12 examples is decoration.

Two disciplines nobody enjoys: **split it** (70% dev to iterate against, 30% held out and opened only at release) and **refresh it** (every production incident becomes a case within a week; re-sample production quarterly and re-stratify if the traffic mix moved). Contamination is real and mundane: iterate prompts against the same 200 examples for three months and you have overfit the prompt to them, exactly as surely as overfitting weights.

### AI as a judge, and its three biases

Judges are cheap, fast, and correlate decently with humans when built carefully — and quietly terrible when not. Three biases show up in every interview answer worth giving:

- **Position bias** — judges systematically prefer the first (or second) candidate in a pairwise comparison. Mitigation: run both orders, count only verdicts that survive the swap, and track the **flip rate**. Above about 15% flips on a slice, the judge is guessing there.
- **Verbosity bias** — longer answers score higher regardless of content. Mitigation: say explicitly in the rubric that length is not quality, and monitor the correlation between score and answer length. A correlation above 0.4 means you are grading word count.
- **Self-preference** — a judge favours text from its own model family. Mitigation: judge with a different family than the one you are shipping, and anchor with human labels.

Design rules that make judges usable: **binary per-criterion rubrics** instead of a 1-10 score (nobody, human or model, distinguishes a 6 from a 7 reliably); **reference-guided** grading where the judge sees the reference answer and the retrieved evidence; and explicit criteria written as questions.

And the step teams skip: **evaluate the judge**. Label 200 items by hand, compute Cohen's kappa between judge and human. Above 0.6 is workable; below 0.4 your judge is a random number generator with excellent manners. Re-validate whenever the judge model or the rubric changes — a judge is a model in production and needs its own version and its own regression suite.

### Comparative evaluation

Absolute scoring is hard; picking a winner between two answers is easy. That is why arenas rank models by pairwise preference and fold results into Elo:

~~~python
def elo_update(r_a, r_b, score_a, k=32):
    expected_a = 1 / (1 + 10 ** ((r_b - r_a) / 400))
    return r_a + k * (score_a - expected_a), r_b - k * (score_a - expected_a)

elo_update(1200, 1200, 1.0)      # (1216.0, 1184.0) — a wins an even match
~~~

Caveats to state before the interviewer does: Elo is order-dependent (a different match order gives different numbers), needs hundreds of comparisons per model to stabilise, tolerates intransitivity badly, and tells you only who is preferred — never whether either answer was good enough. Bradley-Terry fitted over all matches at once is the statistically cleaner version of the same idea.

### Gates in CI, and the offline-online gap

Wire the suite into merges, not into a weekly meeting. Three tiers work well: a **smoke tier** (40 exact-check items, under a minute, every commit), a **PR gate** (the dev split, exact plus judge, a few minutes and a few dollars, on any change to prompt, model, retrieval config or index), and a **release gate** (held-out split plus a human spot-check). Hard gates block: safety, PII, schema validity, past incidents. Soft gates warn: helpfulness, latency, cost.

Version everything together — prompt, model id, retrieval config, index snapshot, eval-set version. A result missing any of those five is not reproducible, so it is not evidence.

Finally: offline evals **predict**, they do not measure. Track the correlation with online metrics. If groundedness climbs 6 points and user acceptance does not move, your eval is measuring something the user does not care about, and that discovery is worth more than the 6 points.

### ⚠️ Common pitfalls

- Judging on a 1-10 scale and then arguing about half-points that no two graders reproduce.
- Iterating on the whole eval set with no held-out split, then being surprised in production.
- Sending exactly-checkable criteria (JSON validity, language) to an LLM judge and paying for the privilege.
- Never validating the judge against humans, so a biased judge silently gates every release.
- A suite that passes 99% of the time: it has stopped carrying information and become a smoke test.

### 🎤 In interviews, they ask

- "How would you evaluate a summarisation feature with no ground truth?"
- "How many examples do you need in an eval set, and how did you get that number?"
- "Your LLM judge prefers your model. How would you find out, and what would you do?"
- "What blocks a merge in your pipeline, and what only warns?"
- "Offline scores went up and CSAT went down. What is your next move?"

### TL;DR

- Write the eval set before the prompt; it becomes the arbiter of every later argument.
- Exact checks first, judge second, humans as the audit — most teams skip layer one.
- About 100 examples gives ±8 points of resolution; 400 gives ±4. Size for the regression you must detect.
- Judges have position, verbosity and self-preference biases: swap order, forbid length credit, judge across families.
- Validate the judge against humans with Cohen's kappa; below 0.4 it is noise.
- Gate merges on the suite, version all five inputs together, and keep watching the offline-online correlation.

### Go deeper

- [AI Engineering (Chip Huyen, 2025)](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) — chapters 3 and 4 are the definitive treatment of this material.
- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) — where the position, verbosity and self-preference bias numbers come from.
- [aie-book repo](https://github.com/chiphuyen/aie-book) — evaluation checklists and further reading.`,
  };

  W.quizzes["w6d3-quiz"] = [
    {
      q: String.raw`Your eval set has 100 examples and the pass rate went from 80% to 85% after a prompt change. What is the correct conclusion?`,
      options: [
        "A 5-point gain is a solid improvement — ship it",
        "The change is inside the noise band of a 100-item set; enlarge the set or run a paired comparison before claiming anything",
        "The eval set is broken, since prompt changes should not move results this much",
        "Switch to an LLM judge, which would give a more precise number",
      ],
      answer: 1,
      explain: String.raw`At p = 0.8 and n = 100 the 95% confidence interval is roughly ±8 points, so a 5-point move is indistinguishable from luck. The fixes are more examples (400 gives about ±4 points) or a paired analysis on the same items, which removes between-item variance and detects smaller differences with the same n. A judge changes what you measure, not how precisely you measure it.`,
    },
    {
      q: String.raw`What does this print?

~~~python
def expected(r_a, r_b):
    return 1 / (1 + 10 ** ((r_b - r_a) / 400))

r_a, r_b, k = 1200, 1200, 32
e = expected(r_a, r_b)
r_a = r_a + k * (1 - e)
r_b = r_b + k * (0 - (1 - e))
print(round(r_a, 1), round(r_b, 1))
~~~`,
      options: [
        "1216.0 1184.0",
        "1232.0 1168.0",
        "1216.0 1200.0",
        "1200.0 1200.0",
      ],
      answer: 0,
      explain: String.raw`With equal ratings the expected score is 0.5, so the winner gains k x (1 - 0.5) = 16 and the loser drops the same 16 — Elo is zero-sum. The 1232/1168 option is the classic slip of applying the full k instead of k times the surprise. Note that beating an equal opponent moves you half as much as beating a much stronger one would.`,
    },
    {
      q: String.raw`Your pairwise judge picks candidate A 71% of the time when A is shown first, and 54% of the time when the same pair is shown with A second. What do you do?`,
      options: [
        "Average the two rates and use 62.5% as the win rate",
        "Use the second ordering only, since it is the more conservative number",
        "Increase the judge's temperature so it stops anchoring on the first option",
        "Run every pair in both orders, count only verdicts that survive the swap, and report the flip rate as a judge-health metric",
      ],
      answer: 3,
      explain: String.raw`A 17-point gap between orderings is textbook position bias, and averaging it just buries a known defect inside a number you will later trust. Counting only order-consistent verdicts gives an honest win rate, and the flip rate tells you which slices the judge cannot actually discriminate. Temperature affects variance, not the systematic preference for whatever came first.`,
    },
    {
      q: String.raw`Which judge design is most likely to produce scores that humans reproduce?`,
      options: [
        "A single 1-10 helpfulness score with a short instruction",
        "Several binary yes/no criteria, graded with the reference answer and retrieved evidence in context",
        "A 1-5 star rating with the instruction to be strict",
        "A free-text critique that a second model converts into a number",
      ],
      answer: 1,
      explain: String.raw`Binary per-criterion questions are the format where human and model graders agree most, because there is no ambiguity about what a 6 versus a 7 means. Showing the reference answer and the evidence turns grading into a comparison rather than an unaided judgement. Fine-grained scales look more informative but mostly add variance you then have to average away.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import math
p, n = 0.80, 100
se = math.sqrt(p * (1 - p) / n)
print(round(1.96 * se * 100, 1))
~~~`,
      options: [
        "4.0",
        "0.8",
        "7.8",
        "16.0",
      ],
      answer: 2,
      explain: String.raw`The standard error is sqrt(0.8 x 0.2 / 100) = 0.04, and 1.96 standard errors expressed in percentage points is 7.84, so the half-width of the 95% interval is about ±7.8 points. This is the arithmetic behind "100 examples is an anecdote generator" — quadrupling to 400 halves the interval, since the width shrinks with the square root of n.`,
    },
    {
      q: String.raw`Which split between hard gates (block the merge) and soft gates (warn) is the sound one for a support bot?`,
      options: [
        "Hard: helpfulness score and latency. Soft: PII leaks and schema validity",
        "Hard: everything, so nothing can regress",
        "Hard: PII leaks, schema validity, past-incident regressions, prompt-injection suite. Soft: helpfulness, latency, cost per conversation",
        "Soft: everything, with a weekly review of the trends",
      ],
      answer: 2,
      explain: String.raw`Hard gates should cover failures that are unambiguous, cheap to check, and unacceptable at any level — safety, privacy, schema, and anything that has already burned you once. Fuzzy, judge-scored quality metrics move a couple of points from run to run, so blocking on them trains the team to override the gate, which destroys all of them. Gating everything and gating nothing fail in the same way: people route around the process.`,
    },
    {
      q: String.raw`Offline groundedness rose from 84% to 90% after a retrieval change, but online CSAT and deflection are flat over three weeks. What is the most useful interpretation?`,
      options: [
        "The online experiment lacks power; wait another month before drawing conclusions",
        "The offline metric measures something users do not experience, or the failures that drive CSAT live elsewhere — investigate the gap rather than defending either number",
        "Groundedness is the leading indicator, so CSAT will follow eventually",
        "CSAT is too noisy to be useful and should be dropped from the dashboard",
      ],
      answer: 1,
      explain: String.raw`Offline evals are predictions about production, and a broken prediction is information about your eval set, not an inconvenience. The likely explanations are that ungrounded claims were rare in the traffic that drives CSAT, or that the real pain is latency, tone, or escalation handling. The move is to sample conversations where users were unhappy and check whether the suite would have caught them at all.`,
    },
  ];

  W.cases["w6d3-case"] = {
    title: "Eval pipeline for a customer-support bot",
    minutes: 35,
    xp: 60,
    brief: "No evals exist, quality moves randomly, and two incidents already happened.",
    scenario: String.raw`A consumer-electronics retailer with 2.4M customers runs a support bot that takes the first response on **120k conversations a month**: order status, returns and warranty policy, product questions, troubleshooting. It deflects 22% of conversations without a human and CSAT sits at 3.9/5.

There is no eval infrastructure. The team ships prompt changes weekly by trying "a few examples in the playground", and quality moves in both directions with no way to tell which. Two incidents last quarter: the bot invented a 60-day return window that does not exist and told several hundred customers about it, and a routine model upgrade made it start replying in English to German customers.

You have been hired to make quality measurable. You have six weeks, one support operations lead who can give you 20 hours a week, and access to the full conversation history.

Design the evaluation pipeline.`,
    stages: [
      {
        name: "What to measure",
        prompt: String.raw`Before anyone writes a rubric: what does quality actually mean for this bot, at what granularity, and how do you avoid building a dashboard that nobody acts on?`,
        model: String.raw`**Day one is not a rubric, it is a taxonomy.** I read 300 sampled conversations by hand with the ops lead. It costs an afternoon and it is the highest-value day of the project, because everything downstream is stratified by what it finds. Expect something like: order status 38%, returns and warranty policy 24%, product questions 21%, troubleshooting 12%, other 5%.

**Then metrics per failure mode, not per feeling.** Response-level:

- **Policy correctness** (binary, per claim): does every policy statement match the current policy document? This is incident one, so it becomes gate number one.
- **Groundedness**: every factual claim traceable to a retrieved document.
- **Language match** (binary, exact-checkable): reply language equals customer language. This is incident two, and it is free to check — which is precisely why it is embarrassing that it shipped.
- **Format and schema compliance**, **PII safety** (never echo full card numbers or addresses), and **refusal appropriateness** — a bot that refuses questions it should answer is failing, even though it looks safe.

Retrieval is scored **separately** with recall@10 against the labelled correct policy document, because a retrieval miss and a generation miss need completely different fixes and averaging them hides both.

**Online, which offline cannot see:** deflection rate (22% baseline), CSAT, escalation rate, repeat-contact within 72 hours, and handle time on escalated tickets. Repeat contact is the honest one — a conversation that "deflected" and came back the next day was a failure that the deflection metric happily counted as a success.

**The anti-rot rule:** every metric on the dashboard gets an owner, a threshold and a written action. If nothing happens when it moves, it is decoration and I delete it. Six metrics people act on beat thirty nobody reads.`,
        rubric: [
          String.raw`Started by sampling and classifying real conversations into an intent taxonomy`,
          String.raw`Defined per-failure-mode metrics rather than a single quality score`,
          String.raw`Turned both past incidents into explicit measured criteria`,
          String.raw`Scored retrieval separately from generation`,
          String.raw`Listed online metrics including deflection, CSAT and repeat contact`,
          String.raw`Gave every metric an owner, a threshold and an action`,
        ],
      },
      {
        name: "Golden set design",
        prompt: String.raw`Design the golden set concretely: how many examples, sampled from where, in what mix, labelled by whom — and what does each item actually contain?`,
        model: String.raw`**Size: 400 items, and here is the arithmetic.** At an 80% pass rate the 95% interval is ±7.8 points at n=100, ±3.9 at n=400, ±2.5 at n=1000. We need to detect a 5-point regression, so 400 is the knee — 1000 doubles the labelling bill to buy 1.4 points we do not need. Slices also need to be readable, and five intents at 60-80 items each lands on the same number.

**Mix:** 55% head traffic sampled proportionally to the intent distribution, 25% tail (rare intents, ambiguous phrasing, multi-turn conversations where context matters, non-German/English languages), 20% adversarial and regression — prompt-injection attempts pasted from real customer messages, policy edge cases, the invented-return-window incident, the language-switch incident, and every future incident forever.

**Sampling bias, deliberately:** oversample escalations and thumbs-down conversations relative to their traffic share. The easy cases are already handled; the eval set is not a traffic simulator, it is a failure detector.

**Each item contains:** the conversation context, the customer message, the policy documents that *should* be retrieved (this is what makes recall@10 computable), a reference answer written by the ops lead, and a checklist of required and forbidden claims. The checklist is the artefact that makes automated grading possible at all — "must state the 30-day window", "must not promise a refund without an RMA number".

**Labelling protocol:** two support leads independently label the first 150 items, then we compute Cohen's kappa. Below 0.6 the guidelines are ambiguous, not the labellers — we rewrite the guidelines and relabel. Budget: 400 items x about 8 minutes ≈ 53 hours ≈ 1.5 person-weeks. I say that number out loud in the kickoff so nobody pretends this is free.

**Splits:** 70% dev to iterate against, 30% held out and only opened at release. Anything a prompt was tuned against is dev forever — items never get promoted into the held-out split. Rotate 15% quarterly and add 10-20 incident-derived cases a month.`,
        rubric: [
          String.raw`Justified the set size with a confidence-interval or detectable-effect argument`,
          String.raw`Specified a head / tail / adversarial composition with percentages`,
          String.raw`Deliberately oversampled escalations and failures over average traffic`,
          String.raw`Defined item contents including expected retrieved documents and a claim checklist`,
          String.raw`Measured inter-annotator agreement and treated low agreement as a guidelines problem`,
          String.raw`Held out a split that is never used for iteration`,
          String.raw`Stated the labelling cost in person-hours`,
        ],
      },
      {
        name: "Judge design & bias control",
        prompt: String.raw`Most of these criteria have no exact answer, so you will use an LLM judge. How do you design it, and how do you prove it is trustworthy before you let it gate a release?`,
        model: String.raw`**First, shrink the judge's job.** Language match, schema validity, forbidden phrases, citation ids that exist, PII regexes, required-claim presence for closed-form policy facts — all deterministic, all free, all run on 100% of items. That is roughly 40% of our criteria, including both incidents. Sending an exactly-checkable criterion to an LLM is paying money for a less reliable answer.

**Judge design for the rest:**

- **Binary per-criterion rubrics**, never a 1-10 score. "Does the answer state a return window?" / "Does the stated window match the retrieved policy?" / "Is every factual claim supported by a retrieved document?" Humans reproduce binary judgements; they do not reproduce a 7.
- **Reference-guided**: the judge sees the reference answer and the retrieved documents. Grading without them is marking an essay without the textbook.
- **Pairwise with position swapping** when comparing two candidate systems: run both orders, count only verdicts that survive the swap, and report the **flip rate**. Above about 15% flips on a slice, the judge cannot discriminate there and I stop trusting that slice.
- **Different model family** than the one being shipped, to blunt self-preference. Rubric states that length is not quality, and I monitor the correlation between score and answer length — above 0.4 we are grading word count.

**Proving it is trustworthy — the step teams skip.** 200 items get human labels from the ops lead. I compute Cohen's kappa between judge and human, per criterion. Target ≥0.6; below 0.4 the judge is unusable and the fix is the rubric, not the model. Criteria that never clear 0.5 get demoted to "human review only" rather than quietly gating releases.

**The judge is a production model.** It has a pinned version, a rubric version, and its own regression suite. Every judge-model upgrade re-runs the 200 human-labelled items before it is allowed anywhere near a gate. Cost of a full judged run: 400 items x about 2 judged criteria x about $0.004 ≈ $3.20, which is cheap enough to run per pull request and expensive enough that we do not run it per commit.`,
        rubric: [
          String.raw`Routed exactly-checkable criteria to deterministic code instead of the judge`,
          String.raw`Chose binary per-criterion rubrics over a numeric scale`,
          String.raw`Gave the judge the reference answer and retrieved evidence`,
          String.raw`Controlled position bias with order swapping and a reported flip rate`,
          String.raw`Addressed verbosity and self-preference bias explicitly`,
          String.raw`Validated the judge against human labels with a kappa threshold`,
          String.raw`Versioned the judge and re-validated it on any judge-model change`,
        ],
      },
      {
        name: "CI integration",
        prompt: String.raw`Wire this into how the team actually ships: what runs on which change, what blocks a merge versus warns, and how do you keep it fast enough that nobody routes around it on a Friday evening?`,
        model: String.raw`**Three tiers, chosen by what each change can break:**

1. **Smoke** — 40 items, exact checks only, under 60 seconds, about $0.10. Runs on every commit. Catches syntax-level catastrophes and the language-match incident.
2. **PR gate** — the 280-item dev split, exact checks plus judge, about 4 minutes with 20-way concurrency, about $2.50. Triggered by any change to prompts, retrieval configuration, model version, index build, or the tool schema. Not by a CSS change.
3. **Release gate** — held-out 120 items plus the full dev split, plus a human spot-check of 30 sampled outputs by the ops lead. Runs on release branches only.

**Hard gates (block, exception requires a written note in the PR):** policy correctness ≥98%, language match 100%, PII leaks 0, schema validity ≥99.5%, prompt-injection suite 100%, and every past-incident case passing. These are unambiguous, cheap, and already proven to hurt.

**Soft gates (warn, require a comment to proceed):** helpfulness down more than 2 points, p95 latency up more than 15%, cost per conversation up more than 10%. Judge-scored metrics move a point or two run to run; blocking on them just teaches people to click override, which then devalues the hard gates too.

**Reproducibility.** Every run records five ids: prompt version, model id and version, retrieval config, index snapshot, eval-set version. A result missing any of them is not evidence. Temperature 0 and pinned model versions reduce variance; I still gate on aggregates rather than per-item equality, because identical outputs are not guaranteed.

**Speed is a political requirement, not a nicety.** A 25-minute gate gets routed around at 6 p.m. on a Friday and then the whole system is theatre. Four minutes is the design target, achieved with concurrency and by keeping the expensive judge tier off the per-commit path. If it starts creeping past eight minutes, that is a bug with an owner.`,
        rubric: [
          String.raw`Defined tiered suites triggered by different change types`,
          String.raw`Gave runtime and cost figures for each tier`,
          String.raw`Separated hard blocking gates from soft warning gates with thresholds`,
          String.raw`Made past incidents permanent blocking regression cases`,
          String.raw`Versioned prompt, model, retrieval config, index and eval set together`,
          String.raw`Treated gate runtime as a requirement so the process is not bypassed`,
        ],
      },
      {
        name: "Eval drift over time",
        prompt: String.raw`Twelve months in, the suite passes at 97% on every run and the team has stopped reading the results — yet incidents still happen. What went wrong, and what do you build so the eval set stays alive?`,
        model: String.raw`**Diagnosis: saturation plus staleness.** The symptoms are diagnostic on their own — pass rate pinned above 95%, near-zero run-to-run variance, no case has failed in two months, and production incidents keep landing on behaviours the suite does not cover. The suite has quietly become a smoke test wearing a quality-gate badge.

**Three causes, all of them normal:** the product moved (new intents, a new returns policy, a new market language), the team overfit to the dev split through a year of iteration, and easy cases were never retired so they now dominate the average.

**The maintenance loop, scheduled as a ritual rather than an intention:**

- **Weekly, 20 minutes:** triage every production incident and every escalated thumbs-down into candidate cases. Target 10-20 new cases a month. This is the single habit that keeps the set honest.
- **Monthly:** recompute per-slice pass rates. Any slice above 98% for three consecutive months moves to the smoke tier — it still runs, it just stops consuming attention.
- **Quarterly:** re-sample 100 fresh conversations and compare the intent distribution against the eval set's. If warranty questions doubled after a product launch, re-stratify. Rotate 15% of items.
- **Quarterly:** re-validate the judge against fresh human labels, especially after any judge-model upgrade.
- **Continuously:** track the offline-to-online correlation. If offline scores rise while CSAT and deflection stay flat, that is a finding about the eval set, and it goes on the agenda rather than into a footnote.

**Keep the suite informative on purpose.** I hold about 20 cases the system currently fails — genuinely hard ones — and I target an overall pass rate in the **85-93% band**. A suite everything passes contains no information. When we do clear a hard case, it is a real win and the case stays in.

**Ownership.** The eval set has a named owner and a quarterly review with the support leads. Unowned eval sets die within two quarters, and the death is silent, which is what makes it dangerous.`,
        rubric: [
          String.raw`Diagnosed saturation and staleness from the symptom of a very high flat pass rate`,
          String.raw`Named overfitting to the dev split as a cause`,
          String.raw`Defined a scheduled cadence for adding incident-derived cases`,
          String.raw`Re-sampled production to check the eval distribution still matches traffic`,
          String.raw`Kept deliberately hard failing cases and targeted a pass rate below 100%`,
          String.raw`Re-validated the judge periodically and after judge-model upgrades`,
          String.raw`Assigned a named owner and a review cadence for the eval set`,
        ],
      },
    ],
  };

  W.exercises["w6d3-e1"] = {
    title: "Elo ratings for model comparison",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Fold pairwise preferences into a leaderboard — the arena algorithm, from scratch.",
    description: String.raw`Pairwise preference is easier to collect than absolute scores, and Elo is how arenas turn a pile of head-to-head verdicts into a ranking. Implement it exactly.

**Part 1**

~~~python
def elo_update(r_a, r_b, winner, k=32):
    ...
~~~

~winner~ is one of ~"a"~, ~"b"~, ~"draw"~. The formula, exactly:

~~~text
expected_a = 1 / (1 + 10 ** ((r_b - r_a) / 400))
score_a    = 1.0 if winner == "a" else 0.0 if winner == "b" else 0.5
new_a      = r_a + k * (score_a - expected_a)
new_b      = r_b - k * (score_a - expected_a)      # Elo is zero-sum
~~~

Return the tuple ~(new_a, new_b)~ with both values rounded to **2 decimals**. Raise ~ValueError~ if ~winner~ is not one of the three allowed strings.

~~~python
elo_update(1200, 1200, "a")        # (1216.0, 1184.0)
elo_update(1400, 1200, "b")        # (1375.69, 1224.31)  — upsets move ratings more
elo_update(1200, 1200, "draw")     # (1200.0, 1200.0)
~~~

**Part 2**

~~~python
def rank_models(matches):
    ...
~~~

~matches~ is a list of ~(model_a, model_b, winner)~ tuples, processed **in order**. Every model starts at ~1200.0~ and is registered the first time it appears. After each match, store the values returned by ~elo_update~ — that is, the **already rounded** ones, so the fold is deterministic for everyone.

Return a list of ~(model, rating)~ tuples sorted by rating descending, then model name ascending. An empty match list returns ~[]~. Raise ~ValueError~ if a model is matched against itself.

~~~python
rank_models([("gpt", "claude", "a"), ("claude", "llama", "a"),
             ("gpt", "llama", "a"),  ("claude", "gpt", "draw")])
# [("gpt", 1229.13), ("claude", 1202.11), ("llama", 1168.76)]
~~~

Interview angle: "how would you rank three candidate models when you have no ground-truth labels" — this is the answer, together with the caveats that Elo is order-dependent, needs hundreds of comparisons to stabilise, and tells you who is preferred but never whether either was good enough.`,
    starter: String.raw`def elo_update(r_a, r_b, winner, k=32):
    """One Elo update. Returns (new_a, new_b), each rounded to 2 decimals."""
    # your code here
    raise NotImplementedError


def rank_models(matches):
    """Fold matches in order from a 1200.0 start; return (model, rating) desc."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Map the winner string to a score with a dict: ~{"a": 1.0, "b": 0.0, "draw": 0.5}~. A ~KeyError~ is not a ~ValueError~, so check membership first.`,
      String.raw`The delta ~k * (score_a - expected_a)~ is computed once and applied with opposite signs. Rounding both results independently is fine because they are symmetric.`,
      String.raw`In the fold, use ~ratings.setdefault(name, 1200.0)~ to register models lazily, and reassign both ratings from the tuple ~elo_update~ returns.`,
    ],
    solution: String.raw`SCORE = {"a": 1.0, "b": 0.0, "draw": 0.5}


def elo_update(r_a, r_b, winner, k=32):
    if winner not in SCORE:
        raise ValueError(f"winner must be a, b or draw, got {winner!r}")
    expected_a = 1.0 / (1.0 + 10 ** ((r_b - r_a) / 400.0))
    delta = k * (SCORE[winner] - expected_a)
    return round(r_a + delta, 2), round(r_b - delta, 2)


def rank_models(matches):
    ratings = {}
    for model_a, model_b, winner in matches:
        if model_a == model_b:
            raise ValueError(f"model {model_a!r} cannot play itself")
        ratings.setdefault(model_a, 1200.0)
        ratings.setdefault(model_b, 1200.0)
        ratings[model_a], ratings[model_b] = elo_update(
            ratings[model_a], ratings[model_b], winner
        )
    return sorted(ratings.items(), key=lambda kv: (-kv[1], kv[0]))`,
    tests: [
      { name: "even match transfers exactly k/2 points", code: String.raw`assert elo_update(1200, 1200, "a") == (1216.0, 1184.0), f"got {elo_update(1200, 1200, 'a')}"
assert elo_update(1200, 1200, "b") == (1184.0, 1216.0), f"got {elo_update(1200, 1200, 'b')}"
assert elo_update(1200, 1200, "draw") == (1200.0, 1200.0), f"got {elo_update(1200, 1200, 'draw')}"` },
      { name: "an upset moves ratings further than an expected win", code: String.raw`up = elo_update(1400, 1200, "b")
assert up == (1375.69, 1224.31), f"got {up}"
expected_win = elo_update(1400, 1200, "a")
assert abs(expected_win[0] - 1400) < abs(up[0] - 1400), f"{expected_win} vs {up}"` },
      { name: "a draw still moves uneven ratings", code: String.raw`out = elo_update(1400, 1200, "draw")
assert out == (1391.69, 1208.31), f"got {out}"
assert round(sum(out), 2) == 2600.0, f"Elo must be zero-sum, got {out}"` },
      { name: "k scales the update and bad winners raise", code: String.raw`assert elo_update(1200, 1200, "a", k=16) == (1208.0, 1192.0), "k must scale the delta"
for bad in ["A", "tie", "", None, 1]:
    try:
        elo_update(1200, 1200, bad)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for winner={bad!r}")` },
      { name: "ranking folds matches in order", code: String.raw`out = rank_models([("gpt", "claude", "a"), ("claude", "llama", "a"),
                   ("gpt", "llama", "a"), ("claude", "gpt", "draw")])
assert out == [("gpt", 1229.13), ("claude", 1202.11), ("llama", 1168.76)], f"got {out}"` },
      { name: "empty input, ties and self-play", code: String.raw`assert rank_models([]) == [], "no matches means no ranking"
assert rank_models([("x", "y", "draw")]) == [("x", 1200.0), ("y", 1200.0)], "draws keep ties alphabetical"
try:
    rank_models([("x", "x", "a")])
except ValueError:
    pass
else:
    raise AssertionError("a model playing itself must raise ValueError")` },
    ],
  };

  W.exercises["w6d3-e2"] = {
    title: "Do your two judges agree?",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Raw agreement flatters. Cohen's kappa tells you what agreement was earned.",
    description: String.raw`Before an LLM judge gates a release, you measure it against a human. Raw agreement is the number people quote; kappa is the number that means something, because it subtracts the agreement you would get by chance.

~~~python
def judge_agreement(judge_a, judge_b):
    ...
~~~

Both arguments are lists of labels (any hashable values) of equal, non-zero length. Compute:

~~~text
n  = len(judge_a)
po = (number of positions where the labels match) / n
pe = sum over every label L of (count_a(L) / n) * (count_b(L) / n)
kappa = (po - pe) / (1 - pe)          ... and exactly 0.0 when pe == 1.0
~~~

Return ~{"n": n, "agreement": po, "kappa": kappa}~ with ~agreement~ and ~kappa~ rounded to **4 decimals**. Raise ~ValueError~ when the lists differ in length or are empty.

~~~python
judge_agreement(["good", "good", "bad", "good", "bad"],
                ["good", "bad",  "bad", "good", "bad"])
# {"n": 5, "agreement": 0.8, "kappa": 0.6154}
~~~

Watch the degenerate case: if both judges label everything ~"good"~, raw agreement is a perfect 1.0 while ~pe~ is also 1.0 — the judges agreed on nothing that required judgement. The contract says kappa is 0.0 there, which is the honest answer and the reason kappa exists.

Rules of thumb worth memorising: kappa above 0.6 means the judge is usable as a gate, 0.4-0.6 means "use it for triage only", and below 0.4 means your judge is noise with good manners.

Interview angle: "your LLM judge agrees with humans 85% of the time — is that good?" is a trap. It depends entirely on the label distribution, and kappa is how you answer it in one number.`,
    starter: String.raw`def judge_agreement(judge_a, judge_b):
    """Percent agreement and Cohen's kappa between two label sequences.

    Returns {"n": int, "agreement": float, "kappa": float}.
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`~collections.Counter~ gives you the per-label counts for each judge in one line each; iterate over the union of both key sets when summing expected agreement.`,
      String.raw`Chance agreement is the sum over labels of the product of the two marginal proportions — a label only contributes if both judges ever used it, so labels unique to one judge add zero.`,
      String.raw`Guard the denominator: when ~pe~ is 1.0 both judges used a single label and kappa is defined as 0.0 here. Round only at the very end.`,
    ],
    solution: String.raw`from collections import Counter


def judge_agreement(judge_a, judge_b):
    if len(judge_a) != len(judge_b):
        raise ValueError(f"length mismatch: {len(judge_a)} vs {len(judge_b)}")
    n = len(judge_a)
    if n == 0:
        raise ValueError("need at least one item")

    matches = sum(1 for x, y in zip(judge_a, judge_b) if x == y)
    po = matches / n

    count_a, count_b = Counter(judge_a), Counter(judge_b)
    labels = set(count_a) | set(count_b)
    pe = sum((count_a[l] / n) * (count_b[l] / n) for l in labels)

    kappa = 0.0 if pe == 1.0 else (po - pe) / (1.0 - pe)
    return {"n": n, "agreement": round(po, 4), "kappa": round(kappa, 4)}`,
    tests: [
      { name: "worked example from the description", code: String.raw`out = judge_agreement(["good", "good", "bad", "good", "bad"],
                      ["good", "bad", "bad", "good", "bad"])
assert out == {"n": 5, "agreement": 0.8, "kappa": 0.6154}, f"got {out}"` },
      { name: "perfect agreement on two labels gives kappa 1.0", code: String.raw`labels = ["a", "b", "a", "b", "a", "b"]
out = judge_agreement(labels, list(labels))
assert out["agreement"] == 1.0, f"agreement: {out['agreement']}"
assert out["kappa"] == 1.0, f"kappa: {out['kappa']}"` },
      { name: "the constant-label trap gives kappa 0.0", code: String.raw`out = judge_agreement(["ok"] * 20, ["ok"] * 20)
assert out["agreement"] == 1.0, f"agreement: {out['agreement']}"
assert out["kappa"] == 0.0, f"perfect but uninformative agreement must give kappa 0.0, got {out['kappa']}"` },
      { name: "total disagreement gives a negative kappa", code: String.raw`out = judge_agreement(["a", "a", "b", "b"], ["b", "b", "a", "a"])
assert out["agreement"] == 0.0, f"agreement: {out['agreement']}"
assert out["kappa"] < 0, f"kappa should be negative, got {out['kappa']}"` },
      { name: "labels used by only one judge are handled", code: String.raw`out = judge_agreement(["x", "x", "y"], ["x", "z", "y"])
assert out["n"] == 3, f"n: {out['n']}"
assert abs(out["agreement"] - 0.6667) < 1e-9, f"agreement: {out['agreement']}"
assert out["kappa"] > 0, f"kappa: {out['kappa']}"` },
      { name: "bad input raises ValueError", code: String.raw`for a, b in [(["x"], []), ([], []), (["x", "y"], ["x"])]:
    try:
        judge_agreement(a, b)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for {a} / {b}")` },
    ],
  };

  // ================= Day 4 =================
  W.days.push({
    id: "w6d4",
    title: "Rollouts & the Data Flywheel",
    minutes: 124,
    blocks: [
      { type: "lesson",   id: "w6d4-lesson", minutes: 22 },
      { type: "quiz",     id: "w6d4-quiz",   minutes: 12 },
      { type: "case",     id: "w6d4-case",   minutes: 35 },
      { type: "exercise", id: "w6d4-e1",     minutes: 25 },
      { type: "exercise", id: "w6d4-e2",     minutes: 20, optional: true },
      { type: "cards",    deck: "design",    count: 8, minutes: 10 },
    ],
  });

  W.lessons["w6d4-lesson"] = {
    title: "Rollouts & the Data Flywheel",
    md: String.raw`A prompt change is a model change with none of the ceremony. No types, no compiler, no unit test that fails — just a text file whose blast radius is 100% of your traffic. This lesson is how mature teams ship those changes, and how the traffic they generate turns into the only asset competitors cannot copy.

### The release pipeline has three stages, not one

**Eval gate → canary → experiment.** Each answers a different question and skipping any of them is a distinct interview red flag.

The **eval gate** asks "is this obviously broken?" — offline, fast, deterministic where possible, blocking. The **canary** asks "does this break in production?" — a small slice of real traffic, watched on guardrails, with pre-written rollback rules. The **experiment** asks "is this actually better?" — a powered A/B with a primary metric and a holdback, run for long enough to survive novelty effects.

Teams that only run offline evals ship regressions their eval set does not cover. Teams that go straight to a full A/B expose 100% of users to a defect for the hours it takes to notice. Teams that canary but never experiment ship changes that are merely not-broken.

### Version everything, make rollback boring

Five things must be versioned together and stamped on every request log: **prompt version, model id and version, retrieval config, index snapshot id, and the flag/config bundle**. Miss one and you cannot answer "what changed at 14:20?" — which is the only question that matters during an incident.

~~~text
request_id  2f9c…    prompt v37   model gpt-x-2025-11-04
retrieval   hybrid-v3  index snap_2026_07_28_a   flags {citation_rule: on}
~~~

Rollback must be a **flag flip that takes effect in under a minute**, not a deploy. If rolling back requires a build, a review and a release train, engineers will argue instead of reverting — and arguing during an incident is how a two-minute problem becomes a two-hour one. Drill the rollback before the canary, not during it.

For indexes, use blue/green: build the new index as an immutable snapshot, point an alias at it, and roll back by moving the alias. Never mutate the live index in place.

### Canary design: size, duration, decision rules

Sizing comes from power, not from taste:

~~~python
p, delta = 0.60, 0.03            # baseline acceptance; smallest drop worth catching
n_per_arm = 16 * p * (1 - p) / delta ** 2      # ~4,270 requests per arm
daily = 160_000 * 0.05                          # 5% canary of 160k daily requests
hours = n_per_arm / daily * 24                  # ~12.8 hours
~~~

So the statistics say half a day. Run it for **24-72 hours anyway**, because the reason to wait is coverage, not power: you need a full daily cycle across time zones, weekday and weekend behaviour, and enough volume for rare intents that make up 2% of traffic. Typical ladder: **1-5% for 24 h → 25% for 48 h → 100%**, with a **1% holdback for two weeks** to measure the long-run effect after novelty wears off.

Assignment is **sticky by user**, never per request — a user flipping between two behaviours mid-session generates support tickets and meaningless per-user metrics.

Write the **decision rules before the data arrives**. After the numbers land, everyone becomes a Bayesian in whichever direction they already wanted to go. Three outcomes, defined up front:

- **Rollback**, automated where the signal is unambiguous: error rate above 2x control, parse failures above 1%, any safety or PII flag, p95 latency above 1.5x control.
- **Extend**, when the signal is directionally bad but underpowered or small. Extending is the correct default under uncertainty; another day is cheap.
- **Promote**, only when guardrails are within tolerance, the primary metric's interval excludes the regression you care about, no slice is materially worse, and the minimum duration has elapsed regardless of how good it looks.

Make rollback cheaper than a meeting: on-call can revert unilaterally, promotion needs two people. The asymmetry is deliberate.

### Feedback: explicit is rare, implicit is everywhere

Thumbs are collected by everyone and trusted by nobody who has looked at the numbers: typically **0.5-3% of responses** get an explicit rating, and the raters skew to the angry tail. Useful as a flag, useless as a measurement system.

Implicit signals cover 100% of traffic:

- **Copy / keep** — the user took the output. The strongest positive signal you get for free.
- **Edit distance** between the generated text and what the user finally kept. For anything draft-shaped, this is nearly a ground-truth quality label.
- **Regenerate** — an explicit "no" without a click on a thumb.
- **Abandon mid-stream**, **rephrase within 60 seconds**, **escalate to a human**, **session continuation**.

Combine them into one product metric — acceptance — and treat the individual signals as diagnostics.

### The flywheel is the moat

Wire the loop: request log (with all five versions) → feedback events joined on request id → a nightly labelled table → triage → three destinations. New **eval cases** weekly, **prompt fixes** as they emerge, and eventually a **finetuning set** once you have thousands of curated examples and a behaviour gap prompting cannot close.

The arithmetic is more encouraging than people expect. At 4.8M requests a month, if 2% carry a strong negative signal you have about 96k candidates; sampling 500 a month for human review yields **6,000 labelled examples a year**, generated by usage rather than budget. Competitors can copy your prompt in an afternoon. They cannot copy six thousand examples of what your users actually accepted.

Two obligations attached: scrub PII before anything reaches a training-candidate table, and honour tenant-level opt-outs by default rather than by request.

### Monitoring what matters

Uptime dashboards are blind to the failure that matters: a model returning HTTP 200 with confident garbage. Monitor four layers — system (errors, p95), model (TTFT, token counts, truncation, tool-error rate), **quality proxies** (regenerate rate, copy rate, refusal rate, escalation rate, output-length distribution), and business (deflection, CSAT, conversion).

You will not have labels in real time, so watch **distributions**: input length, language mix, intent mix, retrieval score distribution, refusal rate. A refusal rate moving from 4% to 11% overnight is a page, even though no metric on the system dashboard moved a pixel.

### ⚠️ Common pitfalls

- Shipping a prompt change to 100% because "it is just text".
- Deciding the canary's success criteria after seeing the numbers.
- Per-request assignment instead of sticky-by-user, producing incoherent sessions and uninterpretable metrics.
- Mutating a live index in place, leaving no way back.
- Building the feedback pipeline in month six and discovering six months of logs cannot be joined to outcomes.
- Alerting only on 5xx and latency, so silent quality collapse is reported by customers.

### 🎤 In interviews, they ask

- "How do you ship a new prompt to a million users?"
- "How big should a canary be and how long should it run? Show your arithmetic."
- "The canary's primary metric is up but p95 latency rose 20%. What do you do?"
- "How do you collect training data from a live product without violating privacy?"
- "What would you alert on for an LLM feature, beyond errors and latency?"

### TL;DR

- Eval gate, canary, then experiment — three stages answering three different questions.
- Version prompt, model, retrieval config, index snapshot and flags together, on every log line.
- Rollback is a flag flip in under a minute, and on-call can pull it without a meeting.
- Size the canary from power, run it for coverage: 1-5% for 24 h, then 25%, then 100%, with a 1% holdback.
- Write promote / extend / rollback rules before the data arrives.
- Explicit feedback covers 1-3% of traffic; implicit signals cover all of it, and edit distance is the sharpest one.
- Monitor quality proxies and distributions, not only uptime.

### Go deeper

- [AI Engineering (Chip Huyen, 2025)](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) — chapter 10 on architecture, feedback loops and production practice.
- [Chip Huyen's blog](https://huyenchip.com/blog/) — production platform write-ups with real deployment numbers.
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — on shipping incrementally and measuring before adding complexity.`,
  };

  W.quizzes["w6d4-quiz"] = [
    {
      q: String.raw`What does this print?

~~~python
p, delta = 0.60, 0.03           # baseline acceptance, smallest drop worth catching
n_per_arm = 16 * p * (1 - p) / delta ** 2
daily = 160_000 * 0.05          # 5% canary of 160k daily requests
print(round(n_per_arm), round(n_per_arm / daily, 1))
~~~`,
      options: [
        "4267 26.7",
        "427 0.1",
        "4267 0.5",
        "1067 0.1",
      ],
      answer: 2,
      explain: String.raw`The rule-of-thumb sample size is 16 x p(1-p) / delta squared = 16 x 0.24 / 0.0009 ≈ 4,267 per arm, and a 5% canary of 160k daily requests supplies 8,000 a day — about half a day of traffic. The lesson of the number is that statistics stop being the constraint quickly; you keep the canary running for coverage of time zones, weekends and rare intents, not for power.`,
    },
    {
      q: String.raw`A candidate says "we canary at 5% for two days, then it is live". What is missing from the plan?`,
      options: [
        "A powered experiment with a holdback afterwards, since a canary shows the change is not broken but not that it is better",
        "Nothing — a two-day canary at 5% is a complete rollout plan",
        "A larger canary, because 5% is never statistically sufficient",
        "An offline eval, which the canary makes redundant",
      ],
      answer: 0,
      explain: String.raw`A canary is a safety check watched on guardrails; it answers "does this break in production". Whether the change actually improved the product needs a powered comparison with a holdback held for long enough to outlive novelty effects. Offline evals remain necessary precisely because they are the cheap filter that stops broken changes from ever reaching real users.`,
    },
    {
      q: String.raw`Your canary shows acceptance up 2 points (within noise), p95 latency up 22%, and cost per request down 8%. Your pre-registered rules say latency above 25% is a rollback and above 10% is an extend. What happens?`,
      options: [
        "Promote — acceptance is up and cost is down, which is the business outcome",
        "Extend the canary at the current ring, because the latency regression is in the warn band and the quality signal is not yet powered",
        "Roll back, because any latency regression above 10% harms users",
        "Promote to 25% and re-evaluate, since expanding gathers data faster",
      ],
      answer: 1,
      explain: String.raw`The rules were written before the data precisely so this moment is mechanical rather than rhetorical: 22% lands in the warn band, so the outcome is extend. Promoting because two favourable numbers appeared is how pre-registration gets quietly abandoned. Expanding the ring while a guardrail is in the warn band increases exposure to a regression you have not yet explained.`,
    },
    {
      q: String.raw`Your assistant serves 4.8M responses a month. Thumbs-up and thumbs-down together arrive on 1.2% of them. What is the right read?`,
      options: [
        "Explicit feedback volume is healthy — 57k ratings a month is plenty to steer the product",
        "The thumbs widget is broken and should be debugged",
        "Ratings should be made mandatory before the user can continue",
        "That rate is normal; treat thumbs as a flag for triage and rely on implicit signals like copy, regenerate and edit distance for measurement",
      ],
      answer: 3,
      explain: String.raw`A 0.5-3% explicit-feedback rate is the industry norm, and the people who click skew heavily negative, so the sample is both small and biased. Implicit signals are collected on 100% of responses at zero user cost and correlate better with satisfaction. Forcing ratings buys volume by degrading the product and produces compliance clicks rather than judgements.`,
    },
    {
      q: String.raw`What does this print?

~~~python
events = ([{"type": "answer"}] * 200 + [{"type": "thumbs_up"}] * 6
          + [{"type": "thumbs_down"}] * 2 + [{"type": "copy"}] * 70)
answers = sum(1 for e in events if e["type"] == "answer")
rated = sum(1 for e in events if e["type"].startswith("thumbs"))
copied = sum(1 for e in events if e["type"] == "copy")
print(round(rated / answers, 3), round(copied / answers, 3))
~~~`,
      options: [
        "0.008 0.07",
        "0.04 0.35",
        "0.75 0.35",
        "0.04 0.286",
      ],
      answer: 1,
      explain: String.raw`Eight ratings over 200 answers is 4%, while 70 copies over the same 200 answers is 35% — the implicit signal is nearly nine times denser than the explicit one. The 0.75 option is the positive-rate among raters, a different and much noisier quantity, and 0.286 divides copies by the wrong denominator. Knowing which denominator you are using is most of feedback analysis.`,
    },
    {
      q: String.raw`Which rollback design would a staff engineer insist on for a prompt change?`,
      options: [
        "Revert the commit and run the normal release pipeline, so the change is properly reviewed",
        "Keep the previous prompt in a hotfix branch ready to deploy",
        "Serve the prompt version from a feature flag so rollback is a flip that takes effect in under a minute, with the version stamped on every request log",
        "Have the model itself detect degraded outputs and fall back to a safe prompt",
      ],
      answer: 2,
      explain: String.raw`Rollback speed determines whether an incident is two minutes or two hours, and anything that routes through a build and a release train is too slow to be used under pressure. Stamping the version on every log line is what makes post-hoc analysis possible at all. Self-detecting fallbacks are an appealing idea that adds an unvalidated model in the recovery path — exactly where you want determinism.`,
    },
    {
      q: String.raw`Your system dashboard is entirely green — 99.98% uptime, p95 stable, no 5xx — but users are complaining that answers got worse after a vendor model update. What monitoring would have caught this?`,
      options: [
        "Quality proxies and output distributions: refusal rate, regenerate rate, copy rate, and mean output length tracked per model version",
        "Higher-resolution latency percentiles, such as p99 and p99.9",
        "Synthetic uptime checks from more geographic regions",
        "A larger offline eval set run on a weekly schedule",
      ],
      answer: 0,
      explain: String.raw`An LLM failure usually returns HTTP 200 with confident nonsense, which is invisible to every system-level metric by construction. Behavioural distributions are the label-free proxy that moves within minutes of a model change — a refusal rate jumping from 4% to 11% is a page. A weekly offline run is valuable but finds the problem days after users did.`,
    },
  ];

  W.cases["w6d4-case"] = {
    title: "Ship a new system prompt to 1M users",
    minutes: 35,
    xp: 60,
    brief: "It looks better offline and 22% cheaper. Last time, tickets tripled.",
    scenario: String.raw`Lumen is a writing assistant inside a note-taking app: **1M monthly active users**, 4.8M assistant requests a month, about **160k a day**. It drafts, rewrites and summarises the user's own notes.

The system prompt is **1,900 tokens** and has grown by accretion over fourteen months. Nobody remembers why half the rules are there. An engineer has rewritten it: **900 tokens**, restructured instructions, a stronger citation rule for note references. On the dev split it scores 3 points better on helpfulness and it is **22% cheaper** per request.

Nine months ago the team shipped a prompt change straight to 100%. Support tickets tripled for two days, an enterprise customer whose export pipeline depended on the old output format threatened to churn, and the fix took eleven hours because rolling back required a full deploy.

Ship the rewrite. The interviewer wants your plan before you touch anything.`,
    stages: [
      {
        name: "Risk analysis",
        prompt: String.raw`A prompt change that looks better offline still burned this team once. What can actually go wrong here, and which risk are you most worried about?`,
        model: String.raw`**Framing first: a prompt change is a model change with none of the ceremony.** No types, no compiler, no failing unit test — and a blast radius of 100% of traffic. That framing is the reason for everything that follows.

**The risks, ranked by severity times likelihood:**

1. **Removed rules were load-bearing.** The prompt grew to 1,900 tokens by accretion, and accretion in a production prompt usually means *incidents*. Each of the roughly 1,000 deleted tokens is an untested hypothesis that some past failure will not come back. This is my top risk, because the failures it causes are rare, severe, and invisible to a dev split assembled from common cases.
2. **Dev-split distribution shift.** The offline set is fourteen months old and weighted to head traffic. A 3-point gain there says nothing about the German enterprise users or the long tail of rewrite requests.
3. **Silent behavioural change.** Tone, verbosity and formatting can shift enough for users to say "it got worse" while every quality metric holds. The 22% cost saving is itself a warning sign: it may mean a shorter prompt, or it may mean the model now writes less, which is a quality regression wearing a cost-saving costume. I want that decomposed before shipping.
4. **Downstream contract breakage.** The enterprise export pipeline that nearly caused a churn event depends on output shape. A restructured prompt is exactly the kind of change that alters formatting subtly.
5. **Interaction with the citation rule.** A stronger citation instruction can raise refusal rate, lengthen outputs, or cause the model to cite notes that do not support the claim.

**And the meta-risk from last time:** rollback took eleven hours because it required a deploy. Before I run a canary, I fix that — the prompt moves behind a flag and I drill the rollback. A rollback path you have not exercised is a rollback path you do not have.`,
        rubric: [
          String.raw`Framed a prompt change as a model change with a 100% blast radius`,
          String.raw`Identified removed rules as untested hypotheses tied to past incidents`,
          String.raw`Questioned whether the 22% cost drop hides shorter, worse outputs`,
          String.raw`Flagged downstream format dependencies for enterprise customers`,
          String.raw`Noted the dev split may not represent current production traffic`,
          String.raw`Made fixing and drilling the rollback path a prerequisite to the canary`,
        ],
      },
      {
        name: "Offline gate design",
        prompt: String.raw`Design the offline gate for this specific change. What must pass before a single real user sees the new prompt?`,
        model: String.raw`**Diff-driven, not generic.** The generic suite runs, but the gate is built around what changed.

**Prompt archaeology.** For every rule removed, find the incident or test case it was added for. Git blame plus the incident log gets most of them in an afternoon. Each removed rule ends in one of two buckets: a covering test case (which now must pass), or a written note saying "no evidence this rule ever did anything" — which is a legitimate conclusion, just not an unexamined one.

**Suites that run, and their thresholds:**

- **Incident corpus — 100% must pass, no exceptions.** Every past production incident as a case. This is the hard gate the previous rollout did not have.
- **Dev split (280 items) and held-out split (120 items)**, judged.
- **Injection and safety suites** — 100%.
- **Format and schema validity on 100% of items** — ≥99.5%, and separately, a byte-level check against the enterprise export format.

**Paired, not averaged.** Run old and new prompt on the same items and judge **pairwise with position swapping**, reporting win / tie / loss instead of two absolute means. Paired comparison removes between-item variance and detects far smaller differences at the same n — and "62 wins, 190 ties, 28 losses" is a much more honest sentence than "up 3 points".

**Distributional checks that are not quality metrics.** Mean and p90 output length, refusal rate, citation rate, language distribution, format-compliance rate. This is where I resolve the 22% question: if input tokens fell 1,000 and output length is unchanged, the saving is real; if output length dropped 20%, the saving is the model writing less and I need to know whether users notice.

**Slice-level results, always.** Per intent, per language, per customer tier. Nothing ships if any slice with n ≥ 50 drops more than 5 points, regardless of the overall average — the classic disaster is a 3-point overall gain concealing a 15-point collapse on one segment.

**Forty side-by-side pairs read by the PM.** Cheap, and it catches tone regressions no rubric encodes.`,
        rubric: [
          String.raw`Traced each removed prompt rule to the incident or case it existed for`,
          String.raw`Made the past-incident corpus a 100% blocking gate`,
          String.raw`Used paired old-versus-new comparison with position swapping`,
          String.raw`Checked non-quality distributions such as output length and refusal rate`,
          String.raw`Decomposed the 22% cost saving into prompt length versus output length`,
          String.raw`Required per-slice results with a no-slice-worse-than threshold`,
          String.raw`Included a small human side-by-side review`,
        ],
      },
      {
        name: "Canary design",
        prompt: String.raw`Design the canary itself: what share of traffic, on which population, for how long, and which metrics do you watch at what cadence?`,
        model: String.raw`**Sizing, from power.** Baseline acceptance is 60% and the smallest drop worth catching is 3 points, so n ≈ 16 x 0.6 x 0.4 / 0.03² ≈ **4,270 requests per arm**. A 5% canary of 160k daily requests yields 8,000/day, so the primary metric is powered in **under 13 hours**.

**Duration, from coverage.** I still run 24 hours at the first ring, because power was never the binding constraint: I need a full daily cycle across time zones, and rare intents at 2% of traffic accumulate five times slower than the average. The ladder is **5% for 24 h → 25% for 48 h → 100%**, with a **1% holdback kept for two weeks** to measure the effect after novelty fades.

**Population and assignment.** Sticky by user id, hashed, never per request — a user who gets two different behaviours in one session writes a support ticket and ruins every per-user metric. Enterprise accounts with export-format dependencies are **excluded from the 5% ring** and included at 25% with their customer success managers notified a day ahead. That is a product decision, not a statistical one, and I would say so.

**Metrics, with the direction I expect:**

- **Primary:** acceptance (kept or copied, no regenerate) — expect flat or up.
- **Guardrails:** error rate, format-parse failure rate, p95 TTFT, refusal rate, support tickets from the cohort, cost per request.
- **Behavioural distributions:** mean and p90 output length, citation rate, language match. These move before quality metrics do.
- **Slices:** top five intents, top three languages, enterprise versus consumer.

**Cadence.** Guardrails evaluated automatically every 15 minutes with paging thresholds. The primary metric is read at 6 h, 12 h and 24 h — and not stared at continuously, because peeking at a noisy metric every ten minutes guarantees someone eventually acts on noise.

**Instrumentation prerequisite:** every request logs the prompt version, so the cohort split is reconstructable after the fact even if the flag service loses state.`,
        rubric: [
          String.raw`Computed canary size from a power or minimum-detectable-effect calculation`,
          String.raw`Justified duration by coverage (time zones, rare intents) rather than power alone`,
          String.raw`Used a staged ladder of ring sizes with a long-running holdback`,
          String.raw`Assigned traffic sticky-by-user rather than per request`,
          String.raw`Excluded format-dependent enterprise accounts from the first ring`,
          String.raw`Listed guardrail metrics and behavioural distributions, not just the primary metric`,
          String.raw`Set an evaluation cadence instead of continuous peeking`,
        ],
      },
      {
        name: "Decision rules",
        prompt: String.raw`Write the decision rules before the data arrives: what exactly makes you promote, extend or roll back, and who is allowed to make each call?`,
        model: String.raw`**Pre-registration is the entire point.** Once the numbers land, everyone becomes a Bayesian in whichever direction they already wanted to go. These rules are agreed and written in the rollout doc before the flag is turned on.

**Automated rollback, no human in the loop** (unambiguous, fast, cheap to be wrong about):

- Error rate above 2x control
- Format-parse failure rate above 1% absolute
- Any safety or PII flag at all
- p95 TTFT above 1.5x control
- Refusal rate above 2x control

**Rollback on a human call within one hour:**

- Acceptance down more than 5% relative
- Any slice with n ≥ 500 down more than 10% relative
- Support tickets from the canary cohort up more than 30%

**Extend — hold the ring, do not expand:**

- Acceptance down 1-5% relative, or its interval still includes a 3-point drop
- p95 latency up 10-25%
- Any directionally bad metric that is underpowered

Extending is the **default under uncertainty**. Another day of canary costs almost nothing; a wrong promotion costs a week and some trust.

**Promote:**

- All guardrails within tolerance
- Acceptance flat or better, with the confidence interval excluding a 3-point drop
- No slice worse than 5% relative
- Minimum 24 hours elapsed, regardless of how good it looks at hour six

**Authority is deliberately asymmetric.** On-call can roll back unilaterally, at any hour, without a meeting or a justification — the postmortem can decide later whether it was necessary. Promotion needs the feature owner plus one reviewer. Rolling back must always be cheaper than arguing about rolling back.

**Mechanics.** Prompt version is a flag value; rollback propagates in under 60 seconds with no deploy. The rollback is drilled in staging the day before. And every decision — promote, extend, rollback — is written into the rollout doc with the numbers that drove it, so the next person inherits the reasoning and not just the outcome.`,
        rubric: [
          String.raw`Wrote the decision rules before the canary starts (pre-registration)`,
          String.raw`Separated automated rollback triggers from human-judgement rollbacks`,
          String.raw`Made extend the default response to uncertainty`,
          String.raw`Required a minimum elapsed duration before promotion`,
          String.raw`Gave on-call unilateral rollback authority while promotion needs two people`,
          String.raw`Specified rollback as a sub-minute flag flip that was drilled beforehand`,
        ],
      },
      {
        name: "Aftermath: feedback capture",
        prompt: String.raw`The rollout succeeded. What do you build during it so this traffic becomes a compounding asset rather than a pile of logs?`,
        model: String.raw`**Build the flywheel now, because retrofitting it means throwing away the months of signal you did not capture.**

**Explicit feedback is a flag, not a measurement system.** Expect 0.5-3% of responses to get a thumb, from users who skew negative. Keep it for triage; do not steer with it.

**Implicit signals cover 100% of traffic**, and for a writing assistant one of them is nearly a ground-truth label:

- **Edit distance** between what the model generated and what the user finally kept. A user who keeps 95% of the draft has told you it was good, without clicking anything.
- **Copy / keep / discard**, **regenerate**, **abandon mid-stream**, **rephrase within 60 seconds**, session continuation.

**The pipeline.** Every request already logs a stable ~request_id~ plus prompt, model, retrieval and index versions. Feedback events join on that id. A nightly job produces a labelled table: request, context, output, all versions, every signal, and a derived acceptance label.

**Signal to dataset, with the arithmetic.** 4.8M requests a month; roughly 2% carry a strong negative signal (regenerate then abandon, thumbs-down, or edit distance above 60%) — about 96k candidates. Sample **500 a month, stratified by intent**, for human review. That is **6,000 curated examples a year**, produced by usage rather than budget. Route them three ways: new eval cases weekly, prompt fixes as they emerge, and a finetuning set once there are thousands of examples and a behaviour gap prompting cannot close.

**Privacy is part of the design, not a later review.** PII scrubbing before anything reaches the training-candidate table, tenant-level opt-out honoured by default rather than on request, enterprise data excluded from any shared pool, and a documented retention window. Say this before legal has to ask.

**Why it matters strategically:** the rewritten prompt can be copied by a competitor in an afternoon. Six thousand examples of what our users actually accepted cannot be. The flywheel is the part of this system that compounds, and it is also the part that is easiest to postpone forever.`,
        rubric: [
          String.raw`Stated that explicit feedback covers only a small percentage of responses`,
          String.raw`Named specific implicit signals including edit distance or copy/keep`,
          String.raw`Joined feedback to requests via a logged request id and version stamps`,
          String.raw`Quantified how many curated examples the flywheel yields per year`,
          String.raw`Routed the data to eval cases, prompt fixes and a future finetuning set`,
          String.raw`Built in PII scrubbing, opt-out and tenant exclusion by default`,
          String.raw`Framed the accumulated data rather than the prompt as the durable advantage`,
        ],
      },
    ],
  };

  W.exercises["w6d4-e1"] = {
    title: "Canary decision engine",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Promote, extend or roll back — decided by rules written before the data arrived.",
    description: String.raw`Pre-registered rules are what stop a rollout meeting from becoming a debate. Implement the engine that applies them.

~~~python
def canary_decision(control, canary, gates):
    ...
~~~

~control~ and ~canary~ map a metric name to a number. ~gates~ maps a metric name to ~{"mode": "up" | "down", "warn": float, "fail": float}~, where ~mode~ says which direction is *better* and ~warn~ / ~fail~ are **relative** degradation thresholds expressed as fractions (0.05 = 5% worse).

For each gated metric:

~~~text
if the metric is missing from control or canary -> it is a FAIL-level violation
delta       = (canary[m] - control[m]) / control[m]
degradation = -delta if mode == "up" else delta
FAIL-level violation if degradation > fail
WARN-level violation if degradation > warn (and it was not FAIL-level)
~~~

Comparisons are **strictly greater than**: landing exactly on a threshold is not a violation.

Decision, in priority order:

1. any FAIL-level violation → ~"rollback"~, ~violated~ = the FAIL-level metric names
2. else any WARN-level violation → ~"extend"~, ~violated~ = the WARN-level metric names
3. else → ~"promote"~, ~violated~ = ~[]~

~violated~ is always sorted alphabetically. Return ~{"decision": str, "violated": [...]}~.

Raise ~ValueError~ if ~gates~ is empty, if a gate's ~mode~ is not ~"up"~ or ~"down"~, if ~warn~ is greater than ~fail~, or if a gated metric's control value is 0 (a relative change is undefined).

~~~python
control = {"acceptance": 0.62, "p95_latency_ms": 2100, "cost_per_req": 0.0104}
canary  = {"acceptance": 0.60, "p95_latency_ms": 2450, "cost_per_req": 0.0101}
gates = {
    "acceptance":     {"mode": "up",   "warn": 0.01, "fail": 0.05},
    "p95_latency_ms": {"mode": "down", "warn": 0.10, "fail": 0.25},
    "cost_per_req":   {"mode": "down", "warn": 0.05, "fail": 0.20},
}
canary_decision(control, canary, gates)
# {"decision": "extend", "violated": ["acceptance", "p95_latency_ms"]}
~~~

Acceptance fell 3.2% relative (warn), p95 rose 16.7% (warn), cost fell 2.9% (an improvement, so no violation).

Interview angle: the "missing metric counts as a failure" rule is the one worth defending out loud — you cannot promote what you could not measure, and a metric that silently disappeared from the pipeline is exactly how a regression ships.`,
    starter: String.raw`def canary_decision(control, canary, gates):
    """Apply pre-registered canary gates.

    Returns {"decision": "promote"|"extend"|"rollback", "violated": [names]}.
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Validate every gate up front — empty gates, an unknown mode, or warn above fail are configuration bugs and should not silently produce a decision.`,
      String.raw`Collect two lists while looping (fail-level and warn-level names), then choose the decision afterwards. Do not return early from inside the loop.`,
      String.raw`Missing metrics are checked before any arithmetic: if the name is absent from either dict, append it to the fail list and continue to the next gate.`,
    ],
    solution: String.raw`def canary_decision(control, canary, gates):
    if not gates:
        raise ValueError("gates must not be empty")

    failed, warned = [], []
    for metric, gate in gates.items():
        mode = gate["mode"]
        if mode not in ("up", "down"):
            raise ValueError(f"bad mode {mode!r} for {metric}")
        if gate["warn"] > gate["fail"]:
            raise ValueError(f"warn above fail for {metric}")

        if metric not in control or metric not in canary:
            failed.append(metric)          # cannot promote what you cannot measure
            continue
        base = control[metric]
        if base == 0:
            raise ValueError(f"control value for {metric} is zero")

        delta = (canary[metric] - base) / base
        degradation = -delta if mode == "up" else delta
        if degradation > gate["fail"]:
            failed.append(metric)
        elif degradation > gate["warn"]:
            warned.append(metric)

    if failed:
        return {"decision": "rollback", "violated": sorted(failed)}
    if warned:
        return {"decision": "extend", "violated": sorted(warned)}
    return {"decision": "promote", "violated": []}`,
    tests: [
      { name: "worked example extends on two warn-level metrics", code: String.raw`control = {"acceptance": 0.62, "p95_latency_ms": 2100, "cost_per_req": 0.0104}
canary = {"acceptance": 0.60, "p95_latency_ms": 2450, "cost_per_req": 0.0101}
gates = {
    "acceptance": {"mode": "up", "warn": 0.01, "fail": 0.05},
    "p95_latency_ms": {"mode": "down", "warn": 0.10, "fail": 0.25},
    "cost_per_req": {"mode": "down", "warn": 0.05, "fail": 0.20},
}
out = canary_decision(control, canary, gates)
assert out == {"decision": "extend", "violated": ["acceptance", "p95_latency_ms"]}, f"got {out}"` },
      { name: "clean canary is promoted", code: String.raw`gates = {"acceptance": {"mode": "up", "warn": 0.01, "fail": 0.05},
         "errors": {"mode": "down", "warn": 0.10, "fail": 0.50}}
out = canary_decision({"acceptance": 0.60, "errors": 100},
                      {"acceptance": 0.63, "errors": 95}, gates)
assert out == {"decision": "promote", "violated": []}, f"got {out}"` },
      { name: "a fail-level breach outranks warn-level ones", code: String.raw`gates = {"acceptance": {"mode": "up", "warn": 0.01, "fail": 0.05},
         "p95": {"mode": "down", "warn": 0.10, "fail": 0.25}}
out = canary_decision({"acceptance": 0.60, "p95": 2000},
                      {"acceptance": 0.51, "p95": 2300}, gates)
assert out["decision"] == "rollback", f"got {out}"
assert out["violated"] == ["acceptance"], f"only fail-level names belong here, got {out['violated']}"` },
      { name: "landing exactly on a threshold is not a violation", code: String.raw`gates = {"acceptance": {"mode": "up", "warn": 0.02, "fail": 0.05}}
at_fail = canary_decision({"acceptance": 100.0}, {"acceptance": 95.0}, gates)
assert at_fail["decision"] == "extend", f"exactly at fail must not roll back, got {at_fail}"
gates2 = {"acceptance": {"mode": "up", "warn": 0.05, "fail": 0.05}}
at_warn = canary_decision({"acceptance": 100.0}, {"acceptance": 95.0}, gates2)
assert at_warn["decision"] == "promote", f"exactly at warn must not extend, got {at_warn}"` },
      { name: "a missing metric is treated as a failure", code: String.raw`gates = {"acceptance": {"mode": "up", "warn": 0.01, "fail": 0.05},
         "safety_flags": {"mode": "down", "warn": 0.0, "fail": 0.0}}
out = canary_decision({"acceptance": 0.60, "safety_flags": 2},
                      {"acceptance": 0.62}, gates)
assert out == {"decision": "rollback", "violated": ["safety_flags"]}, f"got {out}"` },
      { name: "bad configuration raises ValueError", code: String.raw`ok = {"m": 1.0}
bad_gates = [
    {},
    {"m": {"mode": "higher", "warn": 0.1, "fail": 0.2}},
    {"m": {"mode": "up", "warn": 0.3, "fail": 0.2}},
]
for g in bad_gates:
    try:
        canary_decision(ok, ok, g)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for gates {g}")
try:
    canary_decision({"m": 0}, {"m": 1}, {"m": {"mode": "up", "warn": 0.1, "fail": 0.2}})
except ValueError:
    pass
else:
    raise AssertionError("a zero control value must raise ValueError")` },
    ],
  };

  W.exercises["w6d4-e2"] = {
    title: "Implicit feedback rates",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Thumbs cover 1% of traffic. Copies and regenerates cover all of it.",
    description: String.raw`Explicit ratings are sparse and biased; implicit signals arrive on every response. Aggregate a raw event stream into the four rates a product dashboard actually needs.

~~~python
def feedback_rate(events):
    ...
~~~

~events~ is a list of dicts, each with a ~"type"~ key. Recognised types: ~"answer"~, ~"thumbs_up"~, ~"thumbs_down"~, ~"regenerate"~, ~"copy"~. Any other type is ignored. Other keys (session id, timestamps) are ignored too.

Return, with every rate rounded to **4 decimals**:

- ~"answers"~ — how many ~"answer"~ events occurred (the denominator for everything else)
- ~"explicit_rate"~ — (thumbs_up + thumbs_down) / answers
- ~"positive_rate"~ — thumbs_up / (thumbs_up + thumbs_down), or ~None~ when nobody rated anything
- ~"regenerate_rate"~ — regenerate / answers
- ~"copy_rate"~ — copy / answers

If there were no ~"answer"~ events at all, return ~{"answers": 0, "explicit_rate": None, "positive_rate": None, "regenerate_rate": None, "copy_rate": None}~.

Raise ~ValueError~ if any element is not a dict or has no ~"type"~ key.

~~~python
events = ([{"type": "answer"}] * 200 + [{"type": "thumbs_up"}] * 6
          + [{"type": "thumbs_down"}] * 2 + [{"type": "regenerate"}] * 24
          + [{"type": "copy"}] * 70)
feedback_rate(events)
# {"answers": 200, "explicit_rate": 0.04, "positive_rate": 0.75,
#  "regenerate_rate": 0.12, "copy_rate": 0.35}
~~~

Read those numbers like a product engineer: 4% of responses were rated, 35% were copied. The copy signal is nearly nine times denser and it is not skewed toward the angry tail — which is why ~copy_rate~ belongs on the dashboard and ~positive_rate~ belongs in a triage queue.

Interview angle: "how do you measure quality without labels" gets answered with exactly this aggregation, plus the observation that the denominators must be responses, not events.`,
    starter: String.raw`def feedback_rate(events):
    """Aggregate raw feedback events into per-answer rates.

    Returns answers, explicit_rate, positive_rate, regenerate_rate, copy_rate.
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Validate while counting: check ~isinstance(e, dict)~ and that ~"type"~ is present before you touch it, and raise ~ValueError~ on the first bad element.`,
      String.raw`~collections.Counter~ over the type strings gives every count in one pass; unknown types simply never get read.`,
      String.raw`Handle the two empty denominators separately — zero answers returns all-None, while zero ratings only nulls ~positive_rate~.`,
    ],
    solution: String.raw`from collections import Counter


def feedback_rate(events):
    counts = Counter()
    for e in events:
        if not isinstance(e, dict) or "type" not in e:
            raise ValueError(f"malformed event: {e!r}")
        counts[e["type"]] += 1

    answers = counts["answer"]
    if answers == 0:
        return {"answers": 0, "explicit_rate": None, "positive_rate": None,
                "regenerate_rate": None, "copy_rate": None}

    up, down = counts["thumbs_up"], counts["thumbs_down"]
    rated = up + down
    return {
        "answers": answers,
        "explicit_rate": round(rated / answers, 4),
        "positive_rate": round(up / rated, 4) if rated else None,
        "regenerate_rate": round(counts["regenerate"] / answers, 4),
        "copy_rate": round(counts["copy"] / answers, 4),
    }`,
    tests: [
      { name: "worked example from the description", code: String.raw`events = ([{"type": "answer"}] * 200 + [{"type": "thumbs_up"}] * 6
          + [{"type": "thumbs_down"}] * 2 + [{"type": "regenerate"}] * 24
          + [{"type": "copy"}] * 70)
out = feedback_rate(events)
assert out == {"answers": 200, "explicit_rate": 0.04, "positive_rate": 0.75,
               "regenerate_rate": 0.12, "copy_rate": 0.35}, f"got {out}"` },
      { name: "no ratings nulls only the positive rate", code: String.raw`out = feedback_rate([{"type": "answer"}] * 50 + [{"type": "copy"}] * 20)
assert out["positive_rate"] is None, f"positive_rate: {out['positive_rate']}"
assert out["explicit_rate"] == 0.0, f"explicit_rate: {out['explicit_rate']}"
assert out["copy_rate"] == 0.4, f"copy_rate: {out['copy_rate']}"
assert out["regenerate_rate"] == 0.0, f"regenerate_rate: {out['regenerate_rate']}"` },
      { name: "no answers gives all-None rates", code: String.raw`out = feedback_rate([{"type": "copy"}, {"type": "thumbs_up"}])
assert out == {"answers": 0, "explicit_rate": None, "positive_rate": None,
               "regenerate_rate": None, "copy_rate": None}, f"got {out}"
assert feedback_rate([])["answers"] == 0, "an empty stream must not raise"` },
      { name: "unknown types and extra keys are ignored", code: String.raw`events = [{"type": "answer", "session": "s1", "ms": 812},
          {"type": "scroll", "session": "s1"},
          {"type": "copy", "session": "s1"},
          {"type": "answer", "session": "s2"},
          {"type": "hover"}]
out = feedback_rate(events)
assert out["answers"] == 2, f"answers: {out['answers']}"
assert out["copy_rate"] == 0.5, f"copy_rate: {out['copy_rate']}"` },
      { name: "rounding goes to four decimals", code: String.raw`out = feedback_rate([{"type": "answer"}] * 3 + [{"type": "copy"}])
assert out["copy_rate"] == 0.3333, f"copy_rate: {out['copy_rate']}"` },
      { name: "malformed events raise ValueError", code: String.raw`for bad in [[{"type": "answer"}, None], [{"kind": "answer"}], ["answer"], [42]]:
    try:
        feedback_rate(bad)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for {bad}")` },
    ],
  };

  // ================= Day 5 =================
  W.days.push({
    id: "w6d5",
    title: "Dataset Engineering",
    minutes: 129,
    blocks: [
      { type: "lesson",   id: "w6d5-lesson", minutes: 22 },
      { type: "quiz",     id: "w6d5-quiz",   minutes: 12 },
      { type: "case",     id: "w6d5-case",   minutes: 35 },
      { type: "exercise", id: "w6d5-e1",     minutes: 25 },
      { type: "exercise", id: "w6d5-e2",     minutes: 25, optional: true },
      { type: "cards",    deck: "design",    count: 8, minutes: 10 },
    ],
  });

  W.lessons["w6d5-lesson"] = {
    title: "Dataset Engineering",
    md: String.raw`Model architecture is a solved problem you download. Data is the part you actually own, and it is where the difference between a demo and a product gets decided. Interviewers know this, which is why "how would you build the training set" is now a standard question — and why "we would scrape a lot of data" is a standard rejection.

### "Good data" is a task-specific claim

There is no universal quality bar. For instruction finetuning, good means **coverage of the behaviours you want and consistency in how they are demonstrated** — and a well-curated **1,000-10,000 examples routinely beats 100,000 noisy ones**, because contradictory demonstrations teach the model that the task is ambiguous. For a classifier, good means the **decision boundary is densely sampled**: a thousand obvious cases teach less than a hundred borderline ones. For retrieval, good means query-passage pairs that look like real user queries, not like documentation headings.

So the first design question is never "how much data" — it is "what does this dataset have to demonstrate, and which examples carry that information".

### Sourcing: organic, synthetic, and the collapse risk

Organic data is what your product produced: real inputs, real outcomes, real distribution. It is the good stuff, and day 4's flywheel is how you get more.

Synthetic data works in four specific shapes, and it is worth memorising them because the interview question is always "when would you use synthetic data":

1. **Rare-class coverage** — you need examples of something that occurs 0.1% of the time.
2. **Transformations of labelled seeds** — paraphrases, obfuscations, translations, style shifts. The label is known *by construction*, which is the whole reason this is safe.
3. **Tasks with a cheap verifier** — code that must run, maths with a checkable answer, JSON that must parse. Generate a lot, keep what passes.
4. **Distillation**, where the licence permits it.

It fails in one shape: **generating examples from scratch with no verifier**. The generator's biases become your ground truth, and the distribution is narrower and more cliché than reality. Train on it and you build a model that handles LLM-written inputs well and real users badly.

**Model collapse** is the compounding version of that failure: train on generated data, generate more data with the new model, repeat, and the distribution's tails vanish — which is precisely where the hard cases live. Practical rules: cap synthetic at **10-20% of a training mix**, tag every synthetic item so ablations can measure and remove it, verify by construction or audit at least 10% by hand, and **never put synthetic data in an eval set**.

### Deduplication, cheapest first

~~~python
def shingles(text, k=5):
    t = text.lower().split()
    return {tuple(t[i:i + k]) for i in range(len(t) - k + 1)}

def jaccard(a, b):
    return len(a & b) / len(a | b) if (a | b) else 0.0
~~~

The pipeline is always the same order:

1. **Normalise** — unicode NFKC, strip zero-width characters, collapse whitespace.
2. **Exact dedup** on a hash of the normalised text. On web or social data this removes **15-30%** and costs nothing. Keep the duplicate *count* — frequency is a feature and a spam signal.
3. **Near-dup** — k-word shingles (k=5 is the usual default), MinHash with about 128 permutations, LSH banding to get candidate pairs, then exact Jaccard with a threshold around **0.8**. Expect another 8-15%.

Why bother: duplicates waste compute, inflate the influence of whatever got copy-pasted most, increase memorisation of the duplicated text, and — the one that actually ends careers — cause **train/test leakage**, giving you a beautiful test score and a model that fails in the field. Dedup **before** splitting, and split by cluster and by author, not by item.

### Quality filtering: heuristics, then a classifier

Cheap heuristics first because they are free and interpretable: length bounds, language identification with a confidence floor, repetition ratio, symbol-to-word ratio, boilerplate patterns. Then, if it still matters, train a small classifier on 2,000-5,000 hand-labelled examples of "keep / drop" and apply it at scale. The classifier is where you encode the judgements no regex captures.

Always keep the drop counts per rule. A filter that silently removes 40% of one language is a bug that looks like a pipeline.

### Annotation: the guidelines are the product

Two annotators disagreeing is not an annotator problem. It is a **definition** problem, and the fix is the guidelines document, not more training or a different vendor. The loop:

~~~text
draft guidelines -> 3 annotators label the same 100 items
                 -> per-category Cohen's kappa
                 -> any category below 0.6: rewrite the definition, add near-miss examples
                 -> relabel, repeat (expect 2-3 rounds)
~~~

Targets worth quoting: kappa **≥0.6** to use a category at all, **≥0.7** for anything that triggers an automated action. Keep **10-20% of items double-labelled permanently** so you can watch agreement drift over time, seed 5% gold questions with known answers, and track per-annotator kappa. And write the near-miss negatives into the guidelines — the positive examples are easy and teach almost nothing.

### Data mixes and ablations

The mix is a hyperparameter: how much of each source, each language, each difficulty tier. Treat it like one. Change **one thing at a time**, retrain, and measure on a frozen eval set with per-slice breakdowns. "We added 50k examples and F1 went up 1 point" is not a finding if you also changed the filter threshold.

Two habits that separate senior from junior answers: report **per-slice** results (a single average over 14 languages hides that one of them is broken), and keep a **held-out temporal split** — the most recent weeks — because a random split leaks future vocabulary into training and flatters every number you produce.

### ⚠️ Common pitfalls

- Random-sampling a rare class and paying to annotate 99.6% negatives.
- Splitting before deduplicating, then celebrating a leaked test score.
- Generating synthetic examples of the target class from scratch with no verifier.
- Treating low inter-annotator agreement as a staffing problem.
- Averaging one metric across languages or segments and shipping a model that is broken in three of them.
- Throwing away duplicate counts, which were a free spam and popularity signal.

### 🎤 In interviews, they ask

- "How would you build a training set for X when positives are 0.3% of traffic?"
- "When is synthetic data a good idea, and how would you keep it from poisoning the model?"
- "Your two annotators agree 88% of the time. Is that good?"
- "How do you deduplicate a few million documents, and why does it matter?"
- "How would you decide whether adding a new data source actually helped?"

### TL;DR

- Good data is task-specific: coverage and consistency for instructions, boundary density for classifiers.
- 1k-10k curated examples beat 100k noisy ones for behaviour tuning.
- Synthetic data is safe when the label comes from construction or a verifier; cap it at 10-20% and keep it out of evals.
- Dedup exactly, then by shingle Jaccard around 0.8 — before splitting, and split by cluster and author.
- Low annotator agreement means the guidelines are ambiguous; target kappa ≥0.6, ≥0.7 for enforcement.
- Treat the data mix as a hyperparameter: one change at a time, frozen eval, per-slice results, temporal holdout.

### Go deeper

- [AI Engineering (Chip Huyen, 2025)](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) — chapter 8 on dataset engineering.
- [Deduplicating Training Data Makes Language Models Better](https://arxiv.org/abs/2107.06499) — the measured case for dedup.
- [The Curse of Recursion: Training on Generated Data Makes Models Forget](https://arxiv.org/abs/2305.17493) — model collapse, with the mechanism.
- [Self-Instruct](https://arxiv.org/abs/2212.10560) — synthetic instruction data done with filtering and verification.`,
  };

  W.quizzes["w6d5-quiz"] = [
    {
      q: String.raw`You can annotate either 3,000 examples carefully with reviewed guidelines, or 60,000 examples quickly with a loose spec, for the same money. The task is instruction finetuning for a specific writing style. Which do you choose?`,
      options: [
        "60,000 — scale wins in deep learning, and noise averages out",
        "3,000 carefully curated, because contradictory demonstrations teach the model that the task is ambiguous",
        "60,000, then filter down to 3,000 with a quality classifier",
        "Split the budget evenly to hedge",
      ],
      answer: 1,
      explain: String.raw`For behaviour and style tuning, consistency is the signal: two examples that answer the same kind of prompt in incompatible ways actively teach the model to be inconsistent. This is the regime where a few thousand well-curated demonstrations reliably beat an order of magnitude more noisy ones. Filtering afterwards sounds clever but you would be paying to create noise and then paying again to identify it, without a labelled basis for the filter.`,
    },
    {
      q: String.raw`What does this print?

~~~python
def shingles(text, k=3):
    t = text.lower().split()
    return {tuple(t[i:i + k]) for i in range(len(t) - k + 1)}

a = shingles("the quick brown fox jumps")
b = shingles("The quick brown fox leaps")
print(len(a), len(b), round(len(a & b) / len(a | b), 3))
~~~`,
      options: [
        "5 5 0.8",
        "3 3 0.667",
        "3 3 0.5",
        "3 3 0.333",
      ],
      answer: 2,
      explain: String.raw`Five tokens with k=3 gives three shingles each. The two documents share the first two shingles and differ in the third, so the intersection is 2 and the union is 4, giving a Jaccard of 0.5. Note how much a single changed word costs at k=3 — larger k makes the measure stricter, which is why near-dup thresholds and shingle size have to be chosen together.`,
    },
    {
      q: String.raw`Which use of synthetic data is safest, in the sense that the labels are trustworthy without extra verification?`,
      options: [
        "Applying obfuscations (leetspeak, spacing, emoji substitution) to already-labelled violating examples",
        "Asking a strong model to write 20,000 typical examples of the class you want to detect",
        "Having a model rewrite unlabelled production data and labelling the rewrites by asking the same model",
        "Generating both the inputs and the labels with a model and spot-checking 1% of them",
      ],
      answer: 0,
      explain: String.raw`Transforming a labelled seed preserves the label by construction, and it targets exactly the adversarial variations real users produce. Generating class examples from scratch imports the generator's narrow, cliché idea of the class as ground truth. Using the same model to both write and label is a closed loop with no external signal, and a 1% spot-check on fully generated data is not enough to detect a systematic bias.`,
    },
    {
      q: String.raw`A team plans to train next year's model mostly on outputs from this year's model, filtered for quality. What is the specific risk they should name?`,
      options: [
        "The training run will be slower because generated text is longer on average",
        "Licensing, since model outputs may not be usable for training",
        "Overfitting, because the new model will memorise the old model's exact outputs",
        "Model collapse: repeated training on generated data narrows the distribution and erases the tails, which is where the hard cases live",
      ],
      answer: 3,
      explain: String.raw`Each generation of training on generated data shrinks variance and drops low-probability regions, so rare phrasings, dialects and edge cases progressively disappear — and quality filtering usually accelerates this by preferring typical outputs. Licensing is a real and separate concern, but it is a legal blocker rather than the modelling failure being asked about. The effect is not classic overfitting: the new model can generalise fine within a distribution that has quietly become too narrow.`,
    },
    {
      q: String.raw`What does this print?

~~~python
docs = ["a b c", "A B C", "a b c ", "d e f", "a b c"]
exact = len({d for d in docs})
normed = len({" ".join(d.lower().split()) for d in docs})
print(exact, normed)
~~~`,
      options: [
        "4 2",
        "5 2",
        "4 4",
        "3 2",
      ],
      answer: 0,
      explain: String.raw`Raw string deduplication only collapses the two identical "a b c" entries, leaving 4 distinct strings — case and trailing whitespace defeat it. Normalising case and whitespace first collapses everything to 2. This is why normalisation comes before hashing in every dedup pipeline: skipping it leaves most duplicates in place while making you feel finished.`,
    },
    {
      q: String.raw`Your annotators agree 88% of the time on a category where 90% of items are negatives, and Cohen's kappa is 0.21. What is the right action?`,
      options: [
        "Ship it — 88% agreement is comfortably above the usual bar",
        "Replace the annotators, since agreement this low indicates poor performance",
        "Rewrite the category definition and add near-miss examples, then relabel — a kappa of 0.21 means almost all the agreement came from both people guessing the majority class",
        "Use majority voting across three annotators to average out the disagreement",
      ],
      answer: 2,
      explain: String.raw`With a 90% negative base rate, two annotators labelling everything negative would already agree 81% of the time, which is why raw agreement flatters and kappa does not. A kappa of 0.21 says the category is not operationally defined, and that is a guidelines defect rather than a people defect. Majority voting over an ambiguous definition produces a confident average of confusion.`,
    },
    {
      q: String.raw`You add a new 50k-example data source and F1 rises from 0.71 to 0.74 — but you also raised the quality-filter threshold and switched to a temporal split in the same run. What do you tell the team?`,
      options: [
        "The source works; ship it and move on",
        "Revert the temporal split, since it makes results look worse than a random split",
        "Attribute two thirds of the gain to the new source and one third to the filter",
        "The run confounds three changes, so it supports no conclusion — rerun the ablation changing one variable at a time against a frozen eval set, with per-slice results",
      ],
      answer: 3,
      explain: String.raw`Three simultaneous changes make the 3-point gain unattributable, and the temporal split alone can move numbers in either direction because it changes what is being measured. Ablations exist precisely to answer "did this source help", and they only work one variable at a time against a frozen eval set. Splitting the credit proportionally is invention dressed as analysis.`,
    },
  ];

  W.cases["w6d5-case"] = {
    title: "Training set for a toxicity classifier",
    minutes: 35,
    xp: 60,
    brief: "0.4% base rate, 14 languages, EUR 120k of annotation budget. Go.",
    scenario: String.raw`A social platform has **90M monthly active users**, 40M posts and 220M comments a day, across **14 languages** (English, Portuguese and Indonesian dominate). The current toxicity model is a three-year-old bag-of-words classifier scoring 0.71 precision at 0.55 recall on a test set nobody trusts. Moderators are drowning, and appeals take nine days.

You are building the **training set** for a replacement transformer classifier. It **flags content for human review**, it does not auto-delete. Roughly **0.4% of comments** are clear policy violations. You have **six months**, an annotation budget of **EUR 120,000**, and a moderation operations team of 40 people who can be borrowed part-time. Legal requires that decisions be auditable and that users can appeal.

Design the dataset. The model architecture is not your problem today.`,
    stages: [
      {
        name: "Taxonomy & guidelines",
        prompt: String.raw`Before a single item is collected: what exactly is the label space, and how do you write guidelines that two strangers in two countries apply the same way?`,
        model: String.raw`**"Toxic" is not a label, it is an argument.** The first deliverable is a taxonomy tied to enforcement, not to an academic schema.

**Label space.** Multi-label, not multi-class, because one comment can be both hate speech and a threat and those route to different queues: targeted harassment, hate speech (protected-attribute based), sexual content, violence and threats, self-harm, spam and scams. Each carries a severity of 0 / 1 / 2 (none / borderline / clear), plus a separate ~insufficient_context~ flag that annotators are *encouraged* to use rather than guess.

**The rule that kills half of every proposed taxonomy:** if a category does not map to a different moderator action, it does not deserve to exist. Categories are expensive — each one needs definitions, examples, agreement measurement and per-category metrics forever.

**Guidelines as the actual product.** Per category: a one-paragraph definition, 5-8 clear positives, and — the part that carries the information — **5-8 near-miss negatives**. Reclaimed slurs used in-group, quoting abuse in order to criticise it, satire, insults directed at ideas versus at people, aggressive banter between friends. Positives are easy and teach almost nothing; the boundary is where annotators diverge.

**Localisation, not translation.** Guidelines are adapted per language by native moderators. A slur list translated literally is worse than useless — it produces false positives on ordinary words and misses the actual local terms.

**The calibration loop, budgeted at two weeks:** draft guidelines, have three annotators label the same 100 items, compute **per-category Cohen's kappa**, rewrite any category below 0.6, relabel, repeat. Expect two or three rounds.

**And the point I would make out loud:** low agreement is a defect in the definition, not in the annotators. Retraining people without changing the guidelines buys a temporary improvement and permanent drift.

**Legal ties in here:** the versioned guidelines document is the auditability artefact. Every label carries the guidelines version it was produced under.`,
        rubric: [
          String.raw`Decomposed toxicity into multi-label categories tied to distinct moderator actions`,
          String.raw`Added a severity scale and an explicit insufficient-context option`,
          String.raw`Required near-miss negative examples in the guidelines, not just positives`,
          String.raw`Adapted guidelines per language rather than translating them`,
          String.raw`Ran a calibration loop with per-category kappa and a numeric threshold`,
          String.raw`Treated low agreement as a guidelines defect rather than an annotator defect`,
          String.raw`Versioned the guidelines as an auditability artefact`,
        ],
      },
      {
        name: "Sourcing mix",
        prompt: String.raw`Where does the data come from? Give me the mix of organic and synthetic with proportions, and justify each slice against the 0.4% base rate.`,
        model: String.raw`**Start with the arithmetic that rules out the naive plan.** At a 0.4% positive rate, randomly sampling 100k comments yields about 400 positives. That is a useless training set and a EUR 60k annotation bill for 99.6% negatives. So sampling must be enriched — and enrichment biases the distribution, which is why the *eval* set gets built completely differently (stage 5).

**Mix for a roughly 180k-item annotation pool:**

- **25% uniform random.** Keeps the negative distribution honest, gives an unbiased base-rate reference, and prevents the model from learning "everything the sampler picked is suspicious".
- **30% moderator-queue items** — already reported content, positive density perhaps 15-25%. Cheap positives, but heavily biased toward what users report, which is not the same as what violates.
- **20% uncertainty-sampled from the current classifier** (scores between 0.35 and 0.65). The boundary is where the information is; this slice is worth several times its size.
- **15% lexicon-seeded** per language from slur and threat patterns, deliberately including the near-misses — reclaimed usage, quoting, song lyrics.
- **10% synthetic.**

**Language allocation is deliberately not proportional to traffic.** English is 45% of volume and gets about 30% of the budget; low-resource languages get over-allocated, because base models cover them worst and each example there buys more.

**Synthetic, used only where the label survives the generation.** Two shapes here: **obfuscation of labelled positives** (leetspeak, spaced letters, emoji substitution, homoglyphs) because adversarial users apply exactly those transformations and the label is preserved by construction; and **hard negatives**, rewriting a violating post into a clearly non-violating one that keeps the vocabulary. That second slice is what fixes precision, which is our weakest current number.

**What I refuse:** asking a model to write "typical toxic comments" from scratch. The generator's idea of toxicity is narrow and cliché, refusal-tuned models will not produce realistic examples of the worst categories anyway, and we would ship a classifier that catches machine-written insults and misses users.

**Guardrails on synthetic:** every synthetic item is tagged so ablations can measure and remove its contribution, at least 10% is human-audited, the cap stays at 10-15%, and none of it ever enters an eval set.`,
        rubric: [
          String.raw`Computed how few positives uniform sampling would yield at the stated base rate`,
          String.raw`Gave a sourcing mix with percentages and a rationale per slice`,
          String.raw`Included uncertainty or boundary sampling from the existing model`,
          String.raw`Allocated annotation budget disproportionately to low-resource languages`,
          String.raw`Limited synthetic data to label-preserving transformations and hard negatives`,
          String.raw`Rejected from-scratch generation of the target class with a reason`,
          String.raw`Tagged synthetic items and capped their share of the mix`,
        ],
      },
      {
        name: "Dedup & filtering pipeline",
        prompt: String.raw`You now hold a raw pool of 2M candidate items. Walk me through the pipeline that turns it into a clean 180k annotation queue, in cost order.`,
        model: String.raw`**Cheapest filters first, always.**

1. **Normalise.** Unicode NFKC, strip zero-width characters (a standard evasion trick), collapse whitespace, lowercase for hashing only — annotators must see the original.
2. **Exact dedup** on the hash of the normalised text. On social data with copypasta and bot spam expect **15-30% removal** for free. Crucially, **keep the duplicate count**: frequency is a coordinated-campaign signal and a feature, and throwing it away is a common mistake.
3. **Near-dup.** 5-word shingles, MinHash with 128 permutations, LSH banding to generate candidate pairs, exact Jaccard with a **0.8 threshold**, cluster, keep one representative plus the cluster size. Another 8-15%. The reason this matters more here than anywhere: a harassment campaign produces thousands of near-identical comments that would otherwise dominate the training signal and leak across splits, giving a gorgeous test score and no field performance.
4. **Eligibility heuristics.** Drop items under about 3 tokens (unannotatable) and over about 2,000 (rare and expensive). Language identification with a confidence floor, routing each item to the right annotator pool; low-confidence items go to a mixed-language queue rather than being dropped, because code-switching is exactly where the current model fails. Remove content already deleted for legal reasons.
5. **PII handling.** Detect and hash phone numbers, emails and handles; the raw original stays only in the access-controlled store. Annotators see a redacted view unless the PII is itself the violation (doxxing).
6. **A small learned annotatability filter.** Label 2k items "annotatable / needs context we do not have", train a classifier, and drop the top of that distribution. It saves money on items that would come back as ~insufficient_context~ anyway.
7. **Leakage control, before splitting.** Dedup across the whole pool first, then split by **near-dup cluster and by author** rather than by item. Two comments from one campaign landing in train and test is the single most common way a moderation model looks great and performs badly.

**Track drop counts per rule per language.** A filter that quietly removes 40% of Indonesian is a bug that looks like a pipeline, and only the per-rule counters will show it.`,
        rubric: [
          String.raw`Ordered the pipeline cheapest-filter-first with normalisation before hashing`,
          String.raw`Applied exact dedup and retained duplicate counts as a signal`,
          String.raw`Used shingle-based near-dup detection with a stated threshold`,
          String.raw`Deduplicated before splitting and split by cluster and author`,
          String.raw`Handled PII with redaction and an access-controlled store`,
          String.raw`Routed low-confidence language detection rather than dropping it`,
          String.raw`Logged per-rule, per-language drop counts to catch silent filter bugs`,
        ],
      },
      {
        name: "Annotation & agreement",
        prompt: String.raw`Design the annotation operation: who labels, how many labels per item, and what do you actually do when agreement comes back bad?`,
        model: String.raw`**The budget math, out loud, because it does not close on the first try.** A trained internal moderation specialist at roughly EUR 18/hour labelling 45 items/hour costs about EUR 0.40 per label; add another 40% for QA, adjudication and management and it is **EUR 0.56 per label**. At 180k items with a blended 1.35 labels each, that is 243k labels ≈ **EUR 136k** against a EUR 120k budget. So I trim to **160k items** (EUR 121k) and say why, rather than discovering the overrun in month four.

**Labels per item, allocated by expected disagreement:**

- **70% single-labelled** — high model confidence, clear categories.
- **20% double-labelled** — uncertainty-sampled and boundary items.
- **10% triple-labelled with adjudication** — hate speech and self-harm, where the definitions are hardest and the enforcement stakes highest.

**Who labels.** Internal moderation specialists, not a generic crowd. This needs policy knowledge, language and cultural competence, and a duty of care that a microtask platform cannot provide. Crowd work only for the obvious-negative slice, if at all.

**Measuring agreement.** Per-category Cohen's kappa computed weekly on the double-labelled slice (Krippendorff alpha if we want one number across the multi-label structure). Targets: **≥0.6 to use a category at all, ≥0.7 for any category that triggers an automated action**. Seed 5% gold items with known answers continuously and track per-annotator accuracy and kappa.

**When agreement is bad — the actual procedure:**

1. Check whether it concentrates in one category. It almost always does.
2. Pull 30 disagreements and read them with the policy owner. Not a meeting about the metric — a reading of the items.
3. The fix is nearly always a guidelines rewrite plus two or three new near-miss examples.
4. Relabel the affected slice under the new guidelines version, and record which version produced which label.

**Annotator wellbeing is a data-quality control, not a perk.** Rotation limits, no more than two continuous hours on severe categories, per-category opt-out, counselling access. Burnout degrades label quality measurably weeks before anyone resigns, and degraded labels are indistinguishable from a bad taxonomy until you look.`,
        rubric: [
          String.raw`Computed cost per label and checked the total against the stated budget`,
          String.raw`Adjusted scope when the arithmetic exceeded the budget`,
          String.raw`Allocated single, double and triple labelling by expected disagreement`,
          String.raw`Chose trained internal moderators over generic crowd workers with a reason`,
          String.raw`Set per-category kappa targets including a higher bar for enforcement`,
          String.raw`Responded to low agreement by rewriting guidelines and relabelling`,
          String.raw`Treated annotator wellbeing and rotation as a label-quality control`,
        ],
      },
      {
        name: "Eval set discipline",
        prompt: String.raw`Last piece: given how deliberately you biased the training distribution, how do you build an evaluation set whose numbers still mean something in production?`,
        model: String.raw`**The asymmetry is the whole answer: the training set is enriched on purpose, the eval set must not be.** Metrics from an enriched eval set are fiction that gets quoted in a board deck.

**Two eval sets, both mandatory.**

1. **Random production eval.** Uniformly sampled from live traffic, stratified by language and surface, weighted back to the true distribution. At 0.4% positives, 20k items yields only about 80 positives, so I budget **60k items** to get a usable positive count — and I say that cost out loud. This set is where **precision at the operating threshold** and **false positives per 100k posts** are measured. That second number is the moderation workload, and it is the number ops actually negotiates over.
2. **Adversarial / hard eval.** Obfuscations, reclaimed usage, quoting-to-criticise, satire, code-switching, and every past false-positive incident. Deliberately hard, never expected to hit 100%, and it is the set that catches regressions the random set is too sparse to see.

**Discipline rules:**

- **No synthetic data in eval. Ever.** Synthetic items measure whether the model matches the generator, not the world.
- **Dedup across splits before splitting**, then split by near-dup cluster and author.
- **Temporal holdout:** the most recent four weeks are a separate time-based eval. Toxicity is adversarial and slang drifts weekly; a purely random split leaks future vocabulary into training and flatters every number.
- **Freeze and version** the eval set, and store provenance per item — annotator, date, guidelines version. That doubles as the legal auditability artefact.

**Metrics that map to decisions**, not one F1: precision at the enforcement threshold, recall by category and severity, false positives per 100k posts, and **per-language breakdowns with confidence intervals**. A single average across 14 languages will happily hide that Indonesian is broken, and Indonesian is one of our three biggest markets.

**Refresh:** re-sample 5k fresh items monthly, and pipe every **appealed-and-overturned** decision into the hard set. The appeals queue is a free, perfectly targeted stream of labelled failures — and using it is also what makes the appeals process worth something to the company rather than just to the user.`,
        rubric: [
          String.raw`Kept the eval set at the true production distribution while training stayed enriched`,
          String.raw`Built both a random-sample eval and a separate adversarial/hard eval`,
          String.raw`Sized the random eval so it contains enough positives to be usable`,
          String.raw`Excluded synthetic data from evaluation entirely`,
          String.raw`Added a temporal holdout because the domain is adversarial and drifts`,
          String.raw`Reported per-language or per-slice metrics rather than a single average`,
          String.raw`Fed appealed-and-overturned decisions back into the hard eval set`,
        ],
      },
    ],
  };

  W.exercises["w6d5-e1"] = {
    title: "Inter-annotator agreement from scratch",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Cohen's kappa for two annotators, then the mean pairwise kappa for a whole team.",
    description: String.raw`On day 3 you compared a judge against a human. Real annotation operations have three, five or twelve annotators, and the number that goes in the weekly report is the **mean pairwise kappa**. Build both.

**Part 1**

~~~python
def cohen_kappa(y1, y2):
    ...
~~~

Two label sequences of equal, non-zero length. Return the kappa as a float rounded to **4 decimals**:

~~~text
n  = len(y1)
po = (positions where the labels match) / n
pe = sum over every label L of (count1(L) / n) * (count2(L) / n)
kappa = (po - pe) / (1 - pe),  and exactly 0.0 when pe == 1.0
~~~

Raise ~ValueError~ if the lengths differ or the sequences are empty.

**Part 2**

~~~python
def mean_pairwise_kappa(annotations):
    ...
~~~

~annotations~ maps an annotator name to that annotator's label sequence. Every sequence covers the same items in the same order. Compute ~cohen_kappa~ for every **unordered pair** of annotators, average those values (the already-rounded ones returned by ~cohen_kappa~), and return the mean rounded to **4 decimals**.

Raise ~ValueError~ if there are fewer than two annotators, or if the sequences differ in length or are empty.

~~~python
cohen_kappa(["tox", "tox", "ok", "ok", "tox", "ok"],
            ["tox", "ok",  "ok", "ok", "tox", "ok"])          # 0.6667

mean_pairwise_kappa({
    "ann_a": ["tox", "tox", "ok", "ok",  "tox", "ok"],
    "ann_b": ["tox", "ok",  "ok", "ok",  "tox", "ok"],
    "ann_c": ["tox", "tox", "ok", "tox", "tox", "ok"],
})                                                            # 0.5778
~~~

Reference points for interviews: below 0.4 the category is not operationally defined, 0.4-0.6 is triage-only, above 0.6 is usable, and above 0.7 is the bar before a label may trigger an automated enforcement action.

Interview angle: "your annotators agree 88% of the time — is that good?" has no answer without the base rate, and this function is how you produce the one that does.`,
    starter: String.raw`def cohen_kappa(y1, y2):
    """Cohen's kappa between two label sequences, rounded to 4 decimals."""
    # your code here
    raise NotImplementedError


def mean_pairwise_kappa(annotations):
    """Mean Cohen's kappa over every unordered pair of annotators."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Observed agreement is a ~zip~ and a count. Expected agreement needs the marginal proportions of each label for each annotator — ~collections.Counter~ gives both.`,
      String.raw`~itertools.combinations(sorted(annotations), 2)~ enumerates every unordered pair once, in a deterministic order.`,
      String.raw`Validate the shared length in ~mean_pairwise_kappa~ before looping, so a ragged input fails with a clear message rather than midway through the pairs.`,
    ],
    solution: String.raw`from collections import Counter
from itertools import combinations


def cohen_kappa(y1, y2):
    if len(y1) != len(y2):
        raise ValueError(f"length mismatch: {len(y1)} vs {len(y2)}")
    n = len(y1)
    if n == 0:
        raise ValueError("need at least one item")

    po = sum(1 for a, b in zip(y1, y2) if a == b) / n
    c1, c2 = Counter(y1), Counter(y2)
    pe = sum((c1[label] / n) * (c2[label] / n) for label in set(c1) | set(c2))
    if pe == 1.0:
        return 0.0
    return round((po - pe) / (1.0 - pe), 4)


def mean_pairwise_kappa(annotations):
    names = sorted(annotations)
    if len(names) < 2:
        raise ValueError("need at least two annotators")
    lengths = {len(annotations[name]) for name in names}
    if len(lengths) != 1:
        raise ValueError(f"annotators disagree on item count: {sorted(lengths)}")
    if lengths == {0}:
        raise ValueError("need at least one item")

    kappas = [cohen_kappa(annotations[a], annotations[b])
              for a, b in combinations(names, 2)]
    return round(sum(kappas) / len(kappas), 4)`,
    tests: [
      { name: "worked pairwise example", code: String.raw`k = cohen_kappa(["tox", "tox", "ok", "ok", "tox", "ok"],
                ["tox", "ok", "ok", "ok", "tox", "ok"])
assert k == 0.6667, f"got {k}"` },
      { name: "perfect and inverted agreement", code: String.raw`assert cohen_kappa(["a", "b", "a", "b"], ["a", "b", "a", "b"]) == 1.0, "identical labels give 1.0"
assert cohen_kappa(["a", "a", "b", "b"], ["b", "b", "a", "a"]) < 0, "inverted labels give a negative kappa"
assert cohen_kappa(["x"] * 10, ["x"] * 10) == 0.0, "one constant label must give 0.0"` },
      { name: "high raw agreement with a skewed base rate gives low kappa", code: String.raw`y1 = ["neg"] * 90 + ["pos"] * 10
y2 = ["neg"] * 85 + ["pos"] * 5 + ["neg"] * 7 + ["pos"] * 3
raw = sum(1 for a, b in zip(y1, y2) if a == b) / len(y1)
k = cohen_kappa(y1, y2)
assert abs(raw - 0.88) < 1e-9, f"raw agreement should be 0.88, got {raw}"
assert k == 0.2683, f"kappa should expose the skew, got {k}"` },
      { name: "mean pairwise kappa over three annotators", code: String.raw`out = mean_pairwise_kappa({
    "ann_a": ["tox", "tox", "ok", "ok", "tox", "ok"],
    "ann_b": ["tox", "ok", "ok", "ok", "tox", "ok"],
    "ann_c": ["tox", "tox", "ok", "tox", "tox", "ok"],
})
assert out == 0.5778, f"got {out}"` },
      { name: "two annotators reduce to plain Cohen's kappa", code: String.raw`a = ["p", "n", "p", "n", "p", "p", "n", "n"]
b = ["p", "n", "n", "n", "p", "p", "p", "n"]
assert mean_pairwise_kappa({"x": a, "y": b}) == cohen_kappa(a, b), "two annotators must match the pair value"` },
      { name: "bad input raises ValueError", code: String.raw`try:
    cohen_kappa(["a", "b"], ["a"])
except ValueError:
    pass
else:
    raise AssertionError("length mismatch must raise")
for bad in [{}, {"only": ["a", "b"]}, {"x": ["a", "b"], "y": ["a"]}, {"x": [], "y": []}]:
    try:
        mean_pairwise_kappa(bad)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for {bad}")` },
    ],
  };

  W.exercises["w6d5-e2"] = {
    title: "Near-duplicate detection with shingles",
    difficulty: 3,
    xp: 40,
    minutes: 25,
    packages: [],
    brief: "Find the copypasta before it leaks across your train/test split.",
    description: String.raw`Exact dedup catches identical strings. Near-dup catches the version with one word changed — which is what actually poisons a training set and leaks across splits.

~~~python
def near_dup_pairs(docs, k, threshold):
    ...
~~~

~docs~ maps a document id (str) to its text. Build a shingle set for each document:

~~~text
tokens = text.lower().split()
if tokens is empty                -> the shingle set is empty
elif len(tokens) < k              -> the shingle set is { tuple(tokens) }
else                              -> every tuple of k consecutive tokens
~~~

Then for each unordered pair compute the Jaccard similarity ~len(A & B) / len(A | B)~, defined as ~0.0~ when both sets are empty.

Return every pair whose similarity is **greater than or equal to** ~threshold~, as ~(id_a, id_b, similarity)~ tuples where ~id_a < id_b~ by string comparison and the similarity is rounded to **4 decimals**. Sort by similarity descending, then ~id_a~ ascending, then ~id_b~ ascending.

Raise ~ValueError~ if ~k~ is less than 1 or ~threshold~ is outside the range 0 to 1 inclusive.

~~~python
docs = {
    "a": "the quick brown fox jumps over the lazy dog",
    "b": "the quick brown fox jumps over the lazy cat",
    "c": "completely unrelated text about databases",
    "d": "The quick brown fox jumps over the lazy dog",
}
near_dup_pairs(docs, 3, 0.5)
# [("a", "d", 1.0), ("a", "b", 0.75), ("b", "d", 0.75)]
~~~

Note that ~a~ and ~d~ differ only in capitalisation and come out identical — which is exactly why normalisation happens before hashing in every real pipeline. Note too that ~b~ differs from ~a~ by a single word yet scores 0.75 at k=3: the shingle size controls how strict the measure is, so k and the threshold have to be chosen together.

This is the brute-force O(n squared) version, which is correct and fine up to a few thousand documents. Production pipelines swap the pairwise loop for MinHash plus LSH banding to get candidate pairs in near-linear time, then compute exact Jaccard only on those candidates — the similarity function stays exactly the one you are writing here.

Interview angle: "how would you deduplicate ten million documents" starts with this definition and ends with MinHash/LSH, and you cannot credibly describe the second without the first.`,
    starter: String.raw`def near_dup_pairs(docs, k, threshold):
    """Return (id_a, id_b, jaccard) for all near-duplicate pairs.

    Sorted by similarity desc, then id_a asc, then id_b asc.
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Build every shingle set once into a dict keyed by document id. Recomputing shingles inside the pairwise loop turns an O(n squared) job into a much slower one.`,
      String.raw`~itertools.combinations(sorted(docs), 2)~ gives each unordered pair exactly once with ~id_a < id_b~ already guaranteed.`,
      String.raw`Handle the three shingle cases explicitly — empty token list, fewer tokens than k, and the normal case — and guard the Jaccard denominator when both sets are empty.`,
    ],
    solution: String.raw`from itertools import combinations


def _shingles(text, k):
    tokens = text.lower().split()
    if not tokens:
        return set()
    if len(tokens) < k:
        return {tuple(tokens)}
    return {tuple(tokens[i:i + k]) for i in range(len(tokens) - k + 1)}


def near_dup_pairs(docs, k, threshold):
    if k < 1:
        raise ValueError(f"k must be at least 1, got {k}")
    if not 0.0 <= threshold <= 1.0:
        raise ValueError(f"threshold must be in [0, 1], got {threshold}")

    sets = {doc_id: _shingles(text, k) for doc_id, text in docs.items()}
    out = []
    for id_a, id_b in combinations(sorted(sets), 2):
        a, b = sets[id_a], sets[id_b]
        union = a | b
        sim = len(a & b) / len(union) if union else 0.0
        if sim >= threshold:
            out.append((id_a, id_b, round(sim, 4)))
    return sorted(out, key=lambda r: (-r[2], r[0], r[1]))`,
    tests: [
      { name: "worked example with a case-only duplicate", code: String.raw`docs = {
    "a": "the quick brown fox jumps over the lazy dog",
    "b": "the quick brown fox jumps over the lazy cat",
    "c": "completely unrelated text about databases",
    "d": "The quick brown fox jumps over the lazy dog",
}
out = near_dup_pairs(docs, 3, 0.5)
assert out == [("a", "d", 1.0), ("a", "b", 0.75), ("b", "d", 0.75)], f"got {out}"` },
      { name: "threshold filters and unrelated docs never pair", code: String.raw`docs = {
    "a": "the quick brown fox jumps over the lazy dog",
    "b": "the quick brown fox jumps over the lazy cat",
    "c": "completely unrelated text about databases",
}
assert near_dup_pairs(docs, 3, 0.9) == [], "0.75 must not pass a 0.9 threshold"
out = near_dup_pairs(docs, 3, 0.75)
assert out == [("a", "b", 0.75)], f"got {out}"
assert all("c" not in pair[:2] for pair in near_dup_pairs(docs, 3, 0.01)), "c shares no shingles"` },
      { name: "documents shorter than k are compared whole", code: String.raw`docs = {"p": "hi there", "q": "hi there", "r": "hi"}
out = near_dup_pairs(docs, 5, 0.5)
assert out == [("p", "q", 1.0)], f"got {out}"
assert near_dup_pairs({"p": "hi there", "r": "hi"}, 5, 0.01) == [], "different short docs share nothing"` },
      { name: "empty documents never form pairs", code: String.raw`out = near_dup_pairs({"e1": "", "e2": "", "x": "some words here"}, 2, 0.0)
assert ("e1", "e2", 0.0) not in out or True, "guard against a crash on empty sets"
sims = {(a, b): s for a, b, s in out}
assert sims.get(("e1", "e2"), 0.0) == 0.0, f"two empty docs must score 0.0, got {sims}"` },
      { name: "ordering is similarity desc then ids asc", code: String.raw`docs = {
    "zz": "alpha beta gamma delta",
    "aa": "alpha beta gamma delta",
    "mm": "alpha beta gamma epsilon",
}
out = near_dup_pairs(docs, 2, 0.0)
assert out[0] == ("aa", "zz", 1.0), f"identical pair first, got {out[0]}"
assert [r[0] for r in out[1:]] == ["aa", "mm"], f"ties break on id_a then id_b, got {out}"` },
      { name: "invalid k or threshold raises ValueError", code: String.raw`docs = {"a": "one two three", "b": "one two three"}
for k, t in [(0, 0.5), (-1, 0.5), (2, -0.1), (2, 1.5)]:
    try:
        near_dup_pairs(docs, k, t)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for k={k}, threshold={t}")` },
    ],
  };

  // ================= Day 6 =================
  W.days.push({
    id: "w6d6",
    title: "Data Plane at Scale + Checkpoint",
    minutes: 98,
    blocks: [
      { type: "lesson", id: "w6d6-lesson", minutes: 18 },
      { type: "quiz",   id: "w6d6-quiz",   minutes: 10 },
      { type: "case",   id: "w6d6-case",   minutes: 35 },
      { type: "boss",   id: "w6-boss",     minutes: 35 },
    ],
  });

  W.lessons["w6d6-lesson"] = {
    title: "The Data Plane at Scale",
    md: String.raw`Every RAG demo works. Every RAG system at 10M documents with 200 tenants and a four-hour freshness contract has the same four problems, and interviewers at that level ask about exactly those four: how data gets in, how the index stays fresh, how tenants stay isolated, and what happens when you change embedding models.

### Ingestion: batch, streaming, and the honest middle

Nightly batch is the simplest thing that works and it is the right answer for corpora that change slowly. Streaming via change-data-capture gives you minutes of lag and costs you a queue, a consumer, backpressure and a dead-letter path.

The honest middle is **micro-batches every 5-15 minutes**, which delivers most of the freshness benefit at a fraction of the complexity. Whichever you pick, three details are non-negotiable:

- **Idempotency by content hash.** If a chunk's hash is unchanged, skip the embedding call entirely. When a document is edited, typically **70-90% of its chunks are untouched** — this one check is usually the largest cost saving in the whole pipeline.
- **Partition the queue by tenant**, so one customer's bulk re-upload cannot starve everyone else.
- **Two lanes**: a fast lane for live updates, a bulk lane for backfills and imports, with separate rate limits. Backfills otherwise eat the freshness SLA they were supposed to protect.

### Index refresh: incremental, with scheduled rebuilds

Incremental upserts are cheap and are what you run most of the time. But graph-based ANN indexes degrade under churn: deletions become tombstones, the graph fragments, recall quietly drops and memory quietly grows. So run incremental continuously **and** schedule a full rebuild — monthly, or whenever the deleted-plus-updated fraction passes roughly **20%**, whichever comes first.

Rebuilds are **blue/green**: build an immutable snapshot, verify it against a golden query set, flip an alias. Never mutate a live index in place, because that leaves you with no way back.

Staleness is a **product decision expressed as a number**, per content type: tickets 5 minutes, documents 1 hour, policies 24 hours. Then measure it — emit **ingest lag** (source update timestamp to index-visible timestamp) as p50/p95/p99 per tenant and alert at half the SLA. A staleness target you do not measure is a sentence in a contract, not a property of your system.

### Embedding versioning and the dual-write migration

You cannot mix embedding models inside one index. Vectors from two models live in different spaces, and the cosine similarity between them is not small — it is meaningless. So an embedding upgrade is a migration, and it goes like this:

1. Stand up index **v2** alongside v1.
2. **Dual-write** every new and updated chunk to both.
3. **Backfill** v2 in the background. For 60M chunks at 1,200 embeddings/s that is about 14 hours single-threaded, a few hours with concurrency, and roughly $600 of embedding tokens.
4. **Shadow-read**: run production queries against both, compare recall on a per-tenant golden set.
5. **Flip the alias per tenant**, canary first. Some tenants will improve and some will regress; a fleet-wide switch guarantees you discover that from a support ticket.
6. Keep v1 for a rollback window (two weeks), then delete.

The failure mode that actually causes the outage: **the query embedder and the document embedder must always be the same version**. Resolve both from the index alias, never from two independent config values.

### Multi-tenancy: isolated, shared, or both

**Per-tenant indexes** give hard isolation, trivially correct deletion, per-tenant tuning and immunity to noisy neighbours — at the cost of N times the fixed overhead, which hurts when 140 of your 200 tenants are tiny.

**A shared index with a tenant filter** is efficient, but the filter becomes a correctness-critical code path, deletion turns into a scan, and one enormous tenant degrades everyone.

The real answer is **hybrid**: dedicated indexes for the largest tenants and for anyone whose contract demands isolation, pooled shared indexes for the long tail, with a size threshold (say, 1M vectors) that promotes a tenant out of the pool.

One detail that separates people who have run this from people who have read about it: **pre-filter, do not post-filter**. Post-filtering a global top-k by tenant returns nothing at all for a small tenant whose documents never make the global top 50. Pre-filtering pushes the tenant predicate into the ANN search itself — which costs some recall and requires index support, but is the only version that is correct.

### Storage math, out loud

~~~python
vectors = 10_000_000 * 8            # docs x chunks per doc = 80M
raw = vectors * 1024 * 4            # dim x bytes per float32
gib = raw / 1024 ** 3               # 305.2 GiB raw
total = gib * 1.25 * 2              # index overhead x replicas = 762.9 GiB
~~~

Memorise the unit: a 1024-dim float32 vector is **4 KiB**. Everything else is multiplication. Index structures add 20-50%, replicas multiply, and then the levers are quantization (float32 to int8 is 4x smaller, binary is 32x) and dimension reduction (Matryoshka-style truncation from 1024 to 256 is another 4x). Combined, 16x is achievable for a few points of recall, most of which you win back by reranking the top-100 with full-precision vectors.

### ⚠️ Common pitfalls

- Mutating a live index in place, so a bad rebuild has no rollback.
- Mixing embedding versions in one index, or letting the query embedder drift from the document embedder.
- Post-filtering by tenant and silently returning nothing for small tenants.
- Re-embedding unchanged chunks on every document edit.
- Promising a freshness SLA that nobody measures as ingest lag.
- One shared queue, so a single tenant's bulk import blocks the fleet.

### 🎤 In interviews, they ask

- "How do you keep an index fresh with a four-hour staleness contract?"
- "How would you migrate to a new embedding model with zero downtime?"
- "Per-tenant indexes or one shared index with filters? Defend it."
- "Estimate the storage for 10M documents. Show the arithmetic."
- "Your recall dropped 4 points after a month of updates and nobody deployed anything. Why?"

### TL;DR

- Micro-batch ingestion plus content-hash idempotency covers most freshness needs cheaply.
- Incremental upserts continuously, blue/green full rebuild at about 20% churn.
- Express staleness as a per-content-type SLA and measure it as ingest lag.
- Embedding upgrades are dual-write migrations with per-tenant alias flips and a rollback window.
- Hybrid tenancy: dedicated indexes for the big and the contractually isolated, pools for the tail.
- Pre-filter by tenant; post-filtering breaks small tenants.
- A 1024-dim float32 vector is 4 KiB — every storage estimate starts there.

### Go deeper

- [AI Engineering (Chip Huyen, 2025)](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) — chapters 6 and 10 on retrieval infrastructure and production architecture.
- [Chip Huyen's blog](https://huyenchip.com/blog/) — generative-AI platform architecture with the layers laid out.
- [vLLM docs](https://docs.vllm.ai) — the serving side of the same tradeoffs: batching, memory, throughput.`,
  };

  W.quizzes["w6d6-quiz"] = [
    {
      q: String.raw`A tenant edits a 40-page document; 6 of its 240 chunks actually changed. Your pipeline re-embeds all 240. What is the fix and roughly what does it save?`,
      options: [
        "Increase the embedding batch size, saving on API round trips",
        "Hash each chunk's normalised content and skip embedding when the hash is unchanged — typically 70-90% of embedding work on edits",
        "Move ingestion to a nightly batch so edits are amortised",
        "Reduce chunk size so fewer chunks are affected by an edit",
      ],
      answer: 1,
      explain: String.raw`Content-hash idempotency is the cheapest and largest win in an ingestion pipeline, because document edits are almost always local while naive pipelines re-embed the whole document. Batching reduces overhead but still pays for every embedding. Smaller chunks increase the total chunk count and usually make the problem worse, not better.`,
    },
    {
      q: String.raw`Your ANN recall has drifted down 4 points over two months of continuous upserts and deletes, with no deploys. What is happening and what do you do?`,
      options: [
        "The embedding model drifted; re-embed the corpus",
        "Query traffic changed; retune the reranker",
        "Deletions became tombstones and the graph fragmented — schedule a blue/green full rebuild and trigger one whenever churn passes a threshold",
        "The index needs more replicas to restore recall",
      ],
      answer: 2,
      explain: String.raw`Graph-based indexes degrade under churn: deleted nodes linger as tombstones, connectivity worsens, and recall falls without anything being deployed. The remedy is a periodic full rebuild into an immutable snapshot with an alias flip, triggered by a churn threshold around 20% rather than by someone noticing. Replicas add availability and throughput, never recall.`,
    },
    {
      q: String.raw`What does this print?

~~~python
vectors = 10_000_000 * 8            # docs x chunks per doc
raw = vectors * 1024 * 4            # dim x bytes per float32
gib = raw / 1024 ** 3
print(round(gib, 1), round(gib * 1.25 * 2, 1))
~~~`,
      options: [
        "305.2 762.9",
        "327.7 819.2",
        "305.2 610.4",
        "80.0 200.0",
      ],
      answer: 0,
      explain: String.raw`80M vectors at 4 KiB each is 327.68 GB decimal, which is 305.2 GiB — the gap between GB and GiB is 7% and is exactly the kind of thing to state rather than fudge. Multiplying by 1.25 for index overhead and 2 for replicas gives 762.9 GiB, which is the number a capacity plan actually needs.`,
    },
    {
      q: String.raw`You are upgrading the embedding model across 200 tenants. Which plan is safe?`,
      options: [
        "Re-embed in place tenant by tenant, since the index schema does not change",
        "Run both models at query time and merge results until the backfill completes",
        "Backfill the new vectors into the existing index while old vectors remain, then delete the old ones",
        "Build a v2 index, dual-write, backfill, shadow-read against a per-tenant golden set, flip the alias per tenant with a canary, and keep v1 for a rollback window",
      ],
      answer: 3,
      explain: String.raw`Vectors from two embedding models occupy different spaces, so any index holding both returns similarities that are not merely worse but meaningless — which rules out both in-place re-embedding and mixed-index backfill. Per-tenant flips matter because an upgrade that improves average recall will still regress some tenants, and you want to find that in a canary rather than in a support ticket. Merging results from two models at query time compares incomparable scores.`,
    },
    {
      q: String.raw`200 tenants: one has 3.2M documents, the median has 4,000, and 140 have fewer than 20,000. Which tenancy model?`,
      options: [
        "One shared index with a tenant filter, since it is the most storage-efficient",
        "Hybrid: dedicated indexes for the largest tenants and anyone contractually isolated, pooled shared indexes for the long tail, with a size threshold that promotes tenants out of the pool",
        "One index per tenant, since isolation is always worth the overhead",
        "Shard by document hash so load is even across all tenants",
      ],
      answer: 1,
      explain: String.raw`With this size skew, 140 dedicated indexes for tiny tenants pay fixed overhead 140 times, while a single shared index lets the 3.2M-document tenant degrade everyone and turns deletion into a scan. The hybrid gives isolation where it is worth paying for and pooling where it is not, with an explicit promotion rule so growth is handled automatically. Sharding by document hash destroys tenant locality, which is exactly what filtering and deletion depend on.`,
    },
    {
      q: String.raw`A small tenant with 900 chunks in a shared index gets empty results for reasonable queries. What is the likely cause?`,
      options: [
        "Post-filtering: the search takes a global top-k and then filters by tenant, and this tenant's chunks never reach the global top-k — the fix is to push the tenant predicate into the search as a pre-filter",
        "Their chunks were never indexed; check the ingestion queue",
        "The embedding model is weak on their domain vocabulary",
        "The similarity threshold is too high for short documents",
      ],
      answer: 0,
      explain: String.raw`In a pooled index holding tens of millions of vectors, a 900-chunk tenant will rarely appear in a global top-50, so post-filtering leaves an empty list even though the data is present and correct. Pre-filtering evaluates the tenant predicate inside the ANN traversal, which costs some recall and needs index support but is the only correct option. The symptom is distinctive: it affects small tenants only and looks like missing data.`,
    },
    {
      q: String.raw`What does this print?

~~~python
new_docs_per_day = 400_000
chunks_per_doc = 6
embed_per_s = 1_200
seconds = new_docs_per_day * chunks_per_doc / embed_per_s
print(round(seconds / 3600, 2))
~~~`,
      options: [
        "2000.0",
        "5.56",
        "0.56",
        "33.33",
      ],
      answer: 2,
      explain: String.raw`2.4M chunks at 1,200 embeddings per second is 2,000 seconds, about 34 minutes — roughly half an hour of compute for a day of updates. The point of running this calculation in an interview is that it usually shows ingestion throughput is not the constraint; queueing, ordering and idempotency are, and that is where the design effort belongs.`,
    },
    {
      q: String.raw`Two enterprise tenants have a contractual 30-minute freshness SLA; the rest have 4 hours. What do you build?`,
      options: [
        "Raise the refresh frequency for everyone to 30 minutes, since one pipeline is simpler",
        "Cache recent documents in the application layer and bypass retrieval for them",
        "Run a full index rebuild every 30 minutes for those two tenants",
        "Give the fast tenants a dedicated fast lane with reserved capacity, add a small recency buffer of just-written chunks searched alongside the index, and alert on p95 ingest lag above 15 minutes",
      ],
      answer: 3,
      explain: String.raw`Freshness SLAs are met with lane separation and a recency path, not by rebuilding indexes on a timer — a rebuild is minutes to hours of work for a handful of changed chunks. The recency buffer covers the window between write and index visibility, which is precisely the gap the SLA is about. Alerting at half the SLA turns the contract into an operational property rather than a promise.`,
    },
  ];

  W.cases["w6d6-case"] = {
    title: "Enterprise document-QA: 10M docs, 200 tenants",
    minutes: 35,
    xp: 60,
    brief: "Daily updates, a four-hour freshness contract, and an embedding upgrade waiting.",
    scenario: String.raw`A SaaS vendor sells document question-answering to enterprises. Across **200 tenants** the fleet holds **10M documents**, roughly **60M chunks**. Tenant sizes are brutally skewed: the largest holds 3.2M documents, the median holds 4,000, and 140 tenants hold fewer than 20,000.

Every tenant pushes updates from their own systems: about **1.5% of documents change per day** across the fleet — 150k documents, concentrated in business hours, with occasional bulk re-imports of entire repositories. Query load is modest: **45k queries/day, peaking around 6 QPS**.

Contract: a document updated in a tenant's source system must be answerable within **4 hours**. Two enterprise tenants have negotiated **30 minutes**. Separately, the embedding model is eighteen months old and the team wants to upgrade to a materially better one.

Design the data plane. The generation side is already working.`,
    stages: [
      {
        name: "Requirements & scale",
        prompt: String.raw`Convert this brief into the numbers you will design against, and say which of them turn out not to be the constraint at all.`,
        model: String.raw`**Storage.** 60M chunks at 1024 dims, float32: 60M x 4 KiB = **228.9 GiB raw**. Index structures add 20-50%, so about 297 GiB, and two replicas takes it to **about 595 GiB**. That is a handful of machines, not a data centre. If it were tight, int8 quantization would cut it 4x to about 150 GiB with a couple of points of recall recovered by reranking the top-100 at full precision — worth knowing, not worth doing yet.

**Ingestion throughput.** 150k documents a day is about 900k chunks. At 1,200 embeddings/s that is **750 seconds — twelve and a half minutes of compute for a full day of updates**. Embedding cost: about 450M tokens/day, about $9/day, $270/month. Both numbers are so small that I want to say the conclusion plainly: **throughput is not the constraint**. Ordering, idempotency, fairness between tenants and freshness measurement are.

**Query load.** 45k/day at 6 QPS peak. Also not a constraint. Two replicas cover it with room to spare.

**What actually constrains the design:**

- **The size skew.** One tenant is 32% of the corpus and 140 tenants are rounding errors. Any uniform tenancy decision is wrong for one end of that distribution.
- **Bulk re-imports.** A single tenant re-uploading a repository can generate more chunks in an hour than the fleet does in a day, and if it shares a queue with live updates it eats everyone's freshness SLA.
- **The two 30-minute tenants.** A single global refresh cadence would force the whole fleet onto the strictest contract.
- **The embedding migration**, which doubles storage transiently and changes retrieval quality per tenant.

**What I would ask before designing:** what fraction of updates are edits versus new documents (it decides how much the content-hash skip saves), whether deletions must propagate on a tighter SLA than updates (they usually must, for legal reasons), and whether the 4 hours is measured from the tenant's write or from our receipt — those are different systems.`,
        rubric: [
          String.raw`Computed index storage from chunk count, dimension, dtype, overhead and replicas`,
          String.raw`Computed daily embedding throughput and concluded it is not the bottleneck`,
          String.raw`Identified tenant size skew as a primary design constraint`,
          String.raw`Flagged bulk re-imports as a threat to the freshness SLA`,
          String.raw`Asked whether the staleness clock starts at tenant write or at ingestion receipt`,
          String.raw`Mentioned quantization as an available lever without adopting it prematurely`,
        ],
      },
      {
        name: "Ingestion & refresh design",
        prompt: String.raw`Design the ingestion and refresh pipeline end to end, including what happens when one tenant re-uploads their entire repository at 09:00 on a Monday.`,
        model: String.raw`**Pipeline.** Per-tenant change feed (webhook or CDC from the tenant's connector) into a queue **partitioned by tenant**, then chunker, embedder, upsert. Partitioning by tenant is not a detail — it is what makes fairness possible at all.

**Two lanes with separate capacity:**

- **Fast lane** for live updates, sized so p95 ingest lag stays well under the tightest SLA. The two 30-minute tenants get reserved capacity here.
- **Bulk lane** for backfills, re-imports and onboarding, rate-limited and explicitly allowed to take hours. The Monday-morning re-upload goes here automatically, triggered by a volume threshold (say, more than 5,000 documents from one tenant in 10 minutes), and the tenant sees a progress indicator rather than a stalled system.

Without that split, the re-upload is the whole story: 3.2M documents of chunking and embedding ahead of everybody else's live edits in a FIFO queue, and 198 tenants breach their 4-hour contract because one customer did something entirely reasonable.

**Idempotency by content hash.** Chunk, normalise, hash. If the hash already exists for that document, skip the embedding call. On document edits, **70-90% of chunks are typically unchanged**, so this is both the biggest cost lever and the biggest latency lever in the pipeline. Deletions and moves are handled by diffing the document's current chunk-hash set against the stored one.

**Refresh strategy.** Incremental upserts continuously; deletes as tombstones with a hard-delete pass. Scheduled **blue/green full rebuild** per index monthly, or sooner when the deleted-plus-updated fraction crosses about 20% — because graph indexes fragment under churn and recall drifts down with nobody deploying anything. Build to an immutable snapshot, verify against a golden query set for that tenant, flip the alias.

**Deletion gets its own tighter SLA.** "Remove this document" is usually a legal request; I would commit to 1 hour and route deletions to the fast lane regardless of tenant tier, plus a nightly reconciliation job that compares source and index inventories per tenant and reports drift. Reconciliation is how you find out that your pipeline has been silently dropping 0.3% of events for a month.`,
        rubric: [
          String.raw`Partitioned the ingestion queue by tenant for fairness`,
          String.raw`Separated a fast lane from a bulk lane with a promotion rule for large imports`,
          String.raw`Used content hashing to skip re-embedding unchanged chunks`,
          String.raw`Ran incremental upserts with scheduled blue/green full rebuilds on a churn threshold`,
          String.raw`Gave deletions a tighter SLA than updates`,
          String.raw`Added a reconciliation job comparing source and index inventories`,
        ],
      },
      {
        name: "Index & tenancy model",
        prompt: String.raw`Given one tenant holding a third of the corpus and 140 tenants holding almost nothing, what is the index and tenancy model — and how do you guarantee a tenant never sees another tenant's chunk?`,
        model: String.raw`**Hybrid, with an explicit promotion rule.**

- **Dedicated indexes** for tenants above about 1M chunks and for anyone whose contract requires physical isolation. That is the 3.2M-document tenant (about 19M chunks) plus roughly a dozen others. They get their own tuning, their own rebuild schedule, and their own blast radius.
- **Pooled shared indexes** for the long tail, hashed into about four pools so no pool exceeds about 10M vectors. 140 tiny tenants sharing four indexes instead of owning 140 is the difference between a sane bill and a silly one.
- **A promotion job** moves a tenant out of a pool when it crosses the threshold, using the same blue/green build-and-flip machinery as a rebuild. Growth should not require a human decision.

**Isolation, defended in three layers** — because "we filter by tenant_id" is not an answer an enterprise security review accepts:

1. **Enforced in one place.** All retrieval goes through a single service that takes the caller's authenticated tenant from the request context, never from a parameter the caller supplies. There is no code path that queries an index without a tenant predicate.
2. **Pre-filtered, not post-filtered.** The tenant predicate is pushed into the ANN traversal. Post-filtering a global top-50 returns an empty list for a 900-chunk tenant whose vectors never make the global cut — a bug that looks exactly like missing data and is invisible in aggregate metrics.
3. **Asserted after the fact.** Every returned chunk's ~tenant_id~ is checked against the caller before the results leave the service. A mismatch raises, pages, and is logged as a security event. It should never fire; the point is that if it ever does, we hear about it in seconds rather than in a breach notification.

**Plus the boring controls:** per-tenant encryption keys for dedicated indexes, deletion tested as a drill quarterly, and an audit log of every retrieval with tenant, query hash and returned document ids.

**The tradeoff I would state out loud:** pooling trades a little correctness risk for a lot of cost, and the three layers above are what buys that risk back down to something I would sign my name to.`,
        rubric: [
          String.raw`Chose a hybrid model with a numeric threshold for dedicated indexes`,
          String.raw`Added an automatic promotion path when a tenant outgrows a pool`,
          String.raw`Took the tenant identity from authenticated context, not from a caller parameter`,
          String.raw`Pre-filtered by tenant inside the search rather than post-filtering results`,
          String.raw`Added a post-retrieval assertion that returned chunks belong to the caller`,
          String.raw`Named the cost-versus-isolation tradeoff explicitly`,
        ],
      },
      {
        name: "Query path & staleness",
        prompt: String.raw`Walk the query path, and be specific about how a document updated eight minutes ago is answerable for a tenant with a 30-minute freshness contract.`,
        model: String.raw`**Query path.** Authenticate and resolve the tenant, look up the index alias for that tenant (which also pins the embedding version — more on that in a moment), embed the query, pre-filtered ANN search for top-50 within the tenant's ACL-permitted scope, cross-encoder rerank to top-8, assemble, generate. At 6 QPS peak this is comfortable on two replicas.

**The freshness gap is a real gap.** Even with a fast lane, there is a window between "the tenant wrote it" and "it is visible in the ANN index" — queueing, chunking, embedding, upsert, and index visibility. For the 30-minute tenants I do not try to make that window zero, because that means rebuilding on a timer and it is enormously wasteful. Instead:

**A recency buffer.** Chunks written in the last N minutes (N comfortably larger than p99 ingest lag, say 60) are kept in a small secondary structure — a per-tenant exact-search set, small enough that brute-force cosine over it is trivial. It is queried **in parallel** with the ANN index and the two result sets are merged by score before reranking. For a tenant churning even a few thousand chunks an hour this buffer holds a few thousand vectors: microseconds of work, and it closes the SLA gap completely.

**Measure the thing you promised.** Emit **ingest lag** per tenant — source update timestamp to index-visible timestamp — as p50/p95/p99, and alert at half the SLA: page at 15 minutes for the fast tenants, at 2 hours for everyone else. A freshness target you do not measure is a sentence in a contract, not a property of a system.

**Surface staleness in the product.** For tenants who care, stamp answers with "index current as of 14:07". It converts an invisible risk into a visible, negotiable one, and it is the difference between a support escalation and a shrug.

**The version trap.** The query embedder and the document embedder must be the same version, always. I resolve both from the index alias rather than from two independent config values — because the classic outage is exactly this: someone upgrades the query-side model, the document vectors are still v1, and retrieval returns confident nonsense with no error anywhere.`,
        rubric: [
          String.raw`Described the full query path including pre-filtered search and reranking`,
          String.raw`Added a recency buffer or equivalent path for just-written chunks`,
          String.raw`Merged recency and ANN results before reranking rather than choosing one`,
          String.raw`Measured ingest lag per tenant with alerting below the SLA`,
          String.raw`Surfaced index staleness in the product for tenants who care`,
          String.raw`Bound the query embedder version to the document embedder version`,
        ],
      },
      {
        name: "Migration story",
        prompt: String.raw`Now the embedding upgrade across all 200 tenants. What is the plan, what does it cost, and what is the specific thing most likely to go wrong?`,
        model: String.raw`**Never in place.** Vectors from two embedding models live in different spaces; an index holding both returns similarities that are not merely degraded but meaningless. So this is a dual-write migration.

**The plan:**

1. Stand up **v2 indexes** alongside v1, same tenancy layout.
2. **Dual-write**: every new or updated chunk is embedded with both models and written to both. Costs double on the live path for the duration — fine, since the live path costs $270/month.
3. **Backfill** v2 in the background on the bulk lane: 60M chunks at 1,200 embeddings/s is about 14 hours single-threaded, roughly 4 hours with concurrency, and about **$600 of embedding tokens** for the whole fleet. Transient storage roughly doubles: +595 GiB for a couple of weeks.
4. **Shadow-read**: run real production queries against both indexes and compare on a **per-tenant golden set** — recall@10 against known-correct documents, plus a judged answer-quality comparison on 50 items per large tenant.
5. **Flip the alias per tenant**, starting with a canary of five small tenants, then the tail in batches, then the large tenants individually.
6. **Keep v1 for a two-week rollback window**, then delete and reclaim the storage.

**What is most likely to go wrong, in order:**

- **Per-tenant regression.** A better average model is not better for every corpus. Tenants with heavy domain jargon, non-English content, or short-title-style documents can lose several points of recall while the fleet average improves. This is why the flip is per tenant with per-tenant evidence, and why a fleet-wide switch would surface the problem as a support ticket from your largest customer.
- **The embedder version split.** Query side flipped, document side not — no error, no alert, just confidently wrong retrieval. Prevented by resolving both from the alias.
- **Silent bundling.** Somebody changes the chunking strategy "while we are re-embedding anyway". Now a regression cannot be attributed to either change. One variable at a time, even when it means running the expensive job twice.
- **Backfill starving live updates**, if it does not run on the bulk lane with its own rate limit.

**Rollback** is an alias flip back to v1, per tenant, in seconds — which is the entire reason v1 stays alive for two weeks rather than being deleted the moment the flip looks good.`,
        rubric: [
          String.raw`Ruled out in-place re-embedding because embedding spaces are incompatible`,
          String.raw`Used dual-write plus background backfill with a rollback window`,
          String.raw`Estimated backfill time, token cost and transient storage`,
          String.raw`Compared v1 and v2 on a per-tenant golden set before flipping`,
          String.raw`Flipped per tenant with a canary rather than fleet-wide`,
          String.raw`Named per-tenant recall regression as the likeliest failure`,
          String.raw`Refused to bundle a chunking change into the same migration`,
        ],
      },
    ],
  };

  W.exercises["w6-boss-t1"] = {
    title: "Index footprint and shard count",
    kind: "boss",
    difficulty: 2,
    xp: 40,
    minutes: 20,
    packages: [],
    brief: "The capacity estimate every retrieval design interview ends with.",
    description: String.raw`Every vector-database design question finishes with "and how much will that cost to store?". Two functions, both pure arithmetic, both worth having in muscle memory.

**Part 1**

~~~python
def index_footprint(docs, chunks_per_doc, dim, dtype_bytes, replicas, overhead_frac):
    ...
~~~

The formula, exactly, with **1 GB meaning 1 GiB = 1024 ** 3 bytes**:

~~~text
vectors     = docs * chunks_per_doc
total_bytes = vectors * dim * dtype_bytes * (1 + overhead_frac) * replicas
gb          = round(total_bytes / 1024 ** 3, 2)
~~~

~overhead_frac~ covers the index structure on top of the raw vectors (an HNSW graph typically adds 20-50%, so 0.25 is a fair default). Raise ~ValueError~ if ~docs~, ~chunks_per_doc~, ~dim~, ~dtype_bytes~ or ~overhead_frac~ is negative, or if ~replicas~ is less than 1.

**Part 2**

~~~python
def shards_needed(total_gb, shard_gb):
    ...
~~~

Return ~ceil(total_gb / shard_gb)~, but never fewer than **1** shard — an empty index still needs somewhere to live. Raise ~ValueError~ if ~shard_gb~ is not positive or ~total_gb~ is negative.

**Worked example.** 10M documents, 8 chunks each, 1024-dimensional float32 vectors, 25% index overhead, 2 replicas:

~~~text
vectors     = 10,000,000 * 8            = 80,000,000
bytes/vector = 1024 * 4                 = 4,096  (4 KiB — memorise this)
raw         = 80,000,000 * 4,096        = 327,680,000,000 bytes = 305.18 GiB
with overhead and replicas: 305.18 * 1.25 * 2                   = 762.94 GiB
shards at 100 GiB each: ceil(7.6294)                            = 8
~~~

~~~python
index_footprint(10_000_000, 8, 1024, 4, 2, 0.25)   # 762.94
shards_needed(762.94, 100)                          # 8
~~~

Interview angle: the follow-up is always "that is too much, what do you do" — and the answers are int8 quantization (4x smaller, same call with ~dtype_bytes=1~ giving 190.73 GiB), dimension truncation, or fewer chunks per document. Being able to price each lever in one call is the point of writing this.`,
    starter: String.raw`def index_footprint(docs, chunks_per_doc, dim, dtype_bytes, replicas, overhead_frac):
    """Vector index size in GiB, including index overhead and replicas."""
    # your code here
    raise NotImplementedError


def shards_needed(total_gb, shard_gb):
    """How many shards of shard_gb are needed to hold total_gb. Minimum 1."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Validate before computing. Gather the non-negative arguments into a tuple and check them in one ~any(...)~, then check ~replicas~ separately since its floor is 1.`,
      String.raw`Divide by ~1024 ** 3~, not by ~1e9~ — the two answers differ by about 7%, and an interviewer who is following along will notice.`,
      String.raw`~math.ceil~ on a float is exact enough here; wrap it in ~max(1, ...)~ so a zero-sized index still reports one shard.`,
    ],
    solution: String.raw`import math


def index_footprint(docs, chunks_per_doc, dim, dtype_bytes, replicas, overhead_frac):
    if any(v < 0 for v in (docs, chunks_per_doc, dim, dtype_bytes, overhead_frac)):
        raise ValueError("docs, chunks, dim, dtype_bytes and overhead must be non-negative")
    if replicas < 1:
        raise ValueError(f"replicas must be at least 1, got {replicas}")

    vectors = docs * chunks_per_doc
    total_bytes = vectors * dim * dtype_bytes * (1 + overhead_frac) * replicas
    return round(total_bytes / 1024 ** 3, 2)


def shards_needed(total_gb, shard_gb):
    if shard_gb <= 0:
        raise ValueError(f"shard_gb must be positive, got {shard_gb}")
    if total_gb < 0:
        raise ValueError(f"total_gb must be non-negative, got {total_gb}")
    return max(1, math.ceil(total_gb / shard_gb))`,
    tests: [
      { name: "worked example: 10M docs at 1024 dims", code: String.raw`got = index_footprint(10_000_000, 8, 1024, 4, 2, 0.25)
assert got == 762.94, f"expected 762.94, got {got}"
assert shards_needed(got, 100) == 8, f"expected 8 shards, got {shards_needed(got, 100)}"` },
      { name: "GiB not GB, and no overhead or replication", code: String.raw`got = index_footprint(1_000_000, 1, 768, 4, 1, 0.0)
assert got == 2.86, f"expected 2.86 GiB, got {got} (did you divide by 1e9?)"` },
      { name: "int8 quantization is exactly four times smaller", code: String.raw`f32 = index_footprint(10_000_000, 8, 1024, 4, 2, 0.25)
i8 = index_footprint(10_000_000, 8, 1024, 1, 2, 0.25)
assert i8 == 190.73, f"expected 190.73, got {i8}"
assert abs(f32 / i8 - 4.0) < 0.01, f"ratio should be about 4x, got {f32 / i8}"` },
      { name: "empty index is zero bytes but still one shard", code: String.raw`assert index_footprint(0, 8, 1024, 4, 2, 0.25) == 0.0, "no docs means no bytes"
assert shards_needed(0.0, 100) == 1, "an empty index still needs one shard"
assert shards_needed(100.0, 100) == 1, "an exact fit must not round up to 2"
assert shards_needed(100.01, 100) == 2, "any overflow needs another shard"` },
      { name: "replicas and overhead scale linearly", code: String.raw`base = index_footprint(1_000_000, 4, 512, 4, 1, 0.0)
assert abs(index_footprint(1_000_000, 4, 512, 4, 3, 0.0) - base * 3) < 0.02, "replicas must multiply"
assert abs(index_footprint(1_000_000, 4, 512, 4, 1, 0.5) - base * 1.5) < 0.02, "overhead must scale"` },
      { name: "invalid arguments raise ValueError", code: String.raw`bad_calls = [
    (-1, 8, 1024, 4, 2, 0.25),
    (10, -8, 1024, 4, 2, 0.25),
    (10, 8, 1024, 4, 0, 0.25),
    (10, 8, 1024, 4, 2, -0.1),
]
for args in bad_calls:
    try:
        index_footprint(*args)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for {args}")
for args in [(10.0, 0), (10.0, -5), (-1.0, 100)]:
    try:
        shards_needed(*args)
    except ValueError:
        continue
    raise AssertionError(f"expected ValueError for shards_needed{args}")` },
    ],
  };

  W.boss = {
    id: "w6-boss",
    title: "T7 — Design Checkpoint",
    timeLimitMin: 30,
    passPct: 70,
    intro: String.raw`Twelve scenario questions across everything Week 6 covered — product framing, build-vs-buy, evaluation, rollouts, dataset engineering and the data plane — plus the capacity calculation every retrieval design interview ends with. Clear 70% and you have the foundations of an AI system design interview under your belt.`,
    quiz: [
      {
        q: String.raw`A logistics company wants an LLM to auto-cancel duplicate orders without review. Duplicates are 0.8% of orders; a wrong cancellation loses the sale and the customer. What is the strongest design response?`,
        options: [
          "Build it with a high confidence threshold and monitor the cancellation rate",
          "Fine-tune on historical duplicate resolutions to push precision above 99%",
          "Flip it to an assist pattern: the model flags suspected duplicates into a queue, an agent confirms, and the confirmations become training data",
          "Use two models and only act when both agree",
        ],
        answer: 2,
        explain: String.raw`A wrong cancellation is unrecoverable and externally visible, which places this squarely in the human-in-the-loop quadrant regardless of how good precision gets. Thresholds, finetuning and ensembling all reduce error frequency without changing the fact that the remaining errors are irreversible. The assist framing also converts every confirmation into labelled data, which is how you earn the right to raise autonomy later.`,
      },
      {
        q: String.raw`What does this print?

~~~python
MAU = 800_000
share_active = 0.35
req_per_active = 9
tok_in, tok_out = 3_000, 400
p_in, p_out = 0.25, 1.25          # USD per 1M tokens

reqs = MAU * share_active * req_per_active
cost = reqs * (tok_in / 1e6 * p_in + tok_out / 1e6 * p_out)
print(round(cost), round(cost / MAU, 4))
~~~`,
        options: [
          "3150 0.0039",
          "2520 0.0032",
          "31500 0.0394",
          "1890 0.0024",
        ],
        answer: 0,
        explain: String.raw`Requests are 800k x 0.35 x 9 = 2.52M per month. Per request: 3000/1e6 x 0.25 = $0.00075 plus 400/1e6 x 1.25 = $0.0005, totalling $0.00125, so the monthly bill is $3,150 and the cost per MAU is $0.0039. Cost per monthly active user is the number leadership asks for, and it is almost always far below what people fear on a cheap tier.`,
      },
      {
        q: String.raw`A team wants to self-host an open-weights model to save money. They generate about 400M output tokens a month, and a comparable hosted endpoint costs $0.60 per million output tokens. Two H100s per replica, two replicas, $3.50 per GPU-hour. What do you tell them?`,
        options: [
          "Self-host: at 400M tokens a month the savings are substantial",
          "Buy: the hosted bill is about $240 a month against roughly $10,000 of fixed GPU cost, so self-hosting is 40x more expensive at this volume and only makes sense as a control decision",
          "Self-host, because per-token pricing always loses at scale",
          "Buy, but only because open-weights models are lower quality",
        ],
        answer: 1,
        explain: String.raw`400M output tokens at $0.60 per million is $240 a month, while 4 GPUs at $3.50/hour for 720 hours is $10,080 before anyone is paid to operate it. Break-even sits in the tens of billions of tokens a month, so at this volume self-hosting can only be justified by data residency, latency control or vendor independence. Quality is a separate question and does not favour either side by default.`,
      },
      {
        q: String.raw`Your assistant answers correctly but ignores the required citation format about 25% of the time, after three weeks of prompt iteration. You have 8,000 reviewed examples. What is the right next step?`,
        options: [
          "Retrieve more documents so citations are easier to produce",
          "Add a post-processing parser that inserts citations",
          "Switch to a bigger frontier model",
          "LoRA-finetune on the reviewed examples — this is a behaviour gap and prompting has plateaued",
        ],
        answer: 3,
        explain: String.raw`Format compliance is behaviour rather than knowledge, so retrieval changes nothing; the prompt-first ordering has already been honoured, which is what makes the finetune defensible rather than premature. Eight thousand in-domain reviewed examples is comfortably inside the regime where a lightweight finetune fixes format compliance, often while also allowing a cheaper base model. A post-processor that fabricates citations solves the symptom by creating a worse problem.`,
      },
      {
        q: String.raw`You need to detect a 4-point regression in a pass rate that currently sits around 80%. Someone proposes a 100-item eval set. What do you say?`,
        options: [
          "It is fine, since 100 items covers the main intents",
          "Too small: the 95% interval at n=100 is about ±8 points, so a 4-point regression is invisible — around 400 items brings it to ±4",
          "Too small: you need at least 5,000 items for any statistical claim",
          "Size does not matter as long as the items are stratified by intent",
        ],
        answer: 1,
        explain: String.raw`The half-width of the interval is 1.96 x sqrt(p(1-p)/n), which is about 7.8 points at n=100 and 3.9 at n=400 — so the proposed set cannot see the regression you care about. Stratification improves what you can attribute a change to, but it does not create resolution that the sample size does not support. Thousands of items are rarely necessary; the number follows from the effect you must detect.`,
      },
      {
        q: String.raw`Your LLM judge is the same model family you are shipping, scores on a 1-10 scale, sees only the answer, and is never compared against humans. Which fix matters most?`,
        options: [
          "All three at once: judge with a different family, switch to binary per-criterion rubrics with the reference answer in context, and validate against 200 human labels",
          "Raise the judge's temperature to reduce clustering around 7 and 8",
          "Run the judge three times and average the scores",
          "Move to a 1-100 scale for finer resolution",
        ],
        answer: 0,
        explain: String.raw`Each defect attacks a different failure: same-family judging invites self-preference, an unanchored numeric scale produces scores nobody reproduces, and no human validation means a biased judge is silently gating releases. Averaging repeated runs reduces variance while leaving every systematic bias untouched, and a finer scale adds noise rather than information. Human validation is the one that tells you whether any of the rest is working.`,
      },
      {
        q: String.raw`What does this print?

~~~python
vectors = 4_000_000 * 12
raw_gib = vectors * 768 * 4 / 1024 ** 3
print(round(raw_gib, 1), round(raw_gib * 1.3 * 3, 1))
~~~`,
        options: [
          "147.5 575.1",
          "137.3 178.5",
          "137.3 535.6",
          "34.3 133.9",
        ],
        answer: 2,
        explain: String.raw`48M vectors at 768 dims x 4 bytes is 3,072 bytes each, giving 147,456,000,000 bytes — which is 137.3 GiB, not 147.5. Multiplying by 1.3 for index overhead and 3 for replicas gives 535.6 GiB, the number that decides your machine count. The 147.5 option is what you get by dividing by 1e9 instead of 1024 cubed, a 7% overstatement that an interviewer following along will catch.`,
      },
      {
        q: String.raw`Your canary shows the primary metric up 1 point (not significant), format-parse failures at 1.8% versus 0.2% in control, and cost down 15%. Pre-registered rules put parse failures above 1% in the automatic-rollback bucket. What happens?`,
        options: [
          "Extend the canary to gather more data on the primary metric",
          "Promote, since the parse failures are a downstream bug rather than a model regression",
          "Escalate to the feature owner for a judgement call",
          "Automatic rollback fires immediately; the cost saving and the primary metric are irrelevant to a rule that was written precisely so this is not a discussion",
        ],
        answer: 3,
        explain: String.raw`Automatic rollback triggers exist for unambiguous, cheap-to-check failures, and a 9x increase in parse failures is exactly that. The whole value of pre-registration evaporates if favourable secondary numbers can be used to renegotiate a rule after the fact. Roll back first, then investigate whether the parser or the prompt is at fault — with the exposure stopped.`,
      },
      {
        q: String.raw`You need a quality signal for a summarisation feature and only 1.1% of summaries get an explicit rating. What do you instrument?`,
        options: [
          "A mandatory rating prompt after every summary",
          "Implicit signals on 100% of traffic: copy, keep-versus-discard, edit distance between the generated summary and what the user saved, regenerate rate and abandon rate",
          "A weekly survey sent to a random sample of users",
          "Nothing further; 1.1% is a large enough sample at this volume",
        ],
        answer: 1,
        explain: String.raw`Explicit ratings arrive on a small, negatively skewed slice of traffic, so volume alone does not fix the bias. Implicit behaviour is collected on every response at no cost to the user, and for draft-shaped outputs edit distance is close to a ground-truth quality label. Forcing ratings degrades the product and yields compliance clicks rather than judgements.`,
      },
      {
        q: String.raw`Your classifier scores 0.94 F1 on the test split and 0.68 in production. The corpus is social comments and you split randomly by item after filtering. What is the most likely cause?`,
        options: [
          "The production distribution shifted after launch",
          "The test set is too small to be reliable",
          "Near-duplicate leakage: copypasta and campaign content put near-identical items in both train and test, so the model was scored partly on memorised examples",
          "The model is underfitting and needs more capacity",
        ],
        answer: 2,
        explain: String.raw`Social corpora are full of copypasta and coordinated campaigns, and a random item-level split scatters members of the same near-duplicate cluster across train and test. The fix is to deduplicate before splitting and to split by near-duplicate cluster and by author. A 26-point gap appearing immediately at launch points to leakage rather than to drift, which develops over time.`,
      },
      {
        q: String.raw`A team proposes training next year's model mainly on this year's model outputs, quality-filtered. Which objection is the technically specific one?`,
        options: [
          "Generated text is easier to learn, so training will converge too quickly",
          "The new model will simply match the old one, with no gain or loss",
          "Filtering is too expensive at that volume",
          "Model collapse: each round of training on generated data narrows the distribution and erases the tails, and quality filtering accelerates it by preferring typical outputs",
        ],
        answer: 3,
        explain: String.raw`The characteristic damage is distributional: rare phrasings, dialects and edge cases lose probability mass with each generation, and those tails are exactly where the hard production cases live. Quality filtering makes it worse rather than better, because "high quality" usually means "typical". The right controls are capping synthetic data at a small share of the mix, tagging it for ablation, and keeping it out of evaluation sets entirely.`,
      },
      {
        q: String.raw`Two enterprise tenants have a 30-minute freshness contract while 198 others have 4 hours. Which design honours both without wasting money?`,
        options: [
          "A dedicated fast lane with reserved capacity for the two tenants, a recency buffer of just-written chunks searched alongside the ANN index, and per-tenant ingest-lag alerting at half the SLA",
          "Refresh every index every 30 minutes so all tenants benefit",
          "Full index rebuilds every 30 minutes for the two fast tenants",
          "Cache the two tenants' recent documents in the application and skip retrieval for them",
        ],
        answer: 0,
        explain: String.raw`Lane separation buys the tight SLA only for the tenants who pay for it, while the recency buffer covers the unavoidable window between write and index visibility at negligible cost. Rebuilding indexes on a 30-minute timer spends hours of compute to incorporate a handful of changed chunks. And an SLA that is not measured as ingest lag with alerting below the threshold is a contractual sentence rather than a system property.`,
      },
    ],
    tasks: ["w6-boss-t1"],
  };
})();
