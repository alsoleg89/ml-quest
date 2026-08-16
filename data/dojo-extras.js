/* ML Quest — Dojo extra practice cases (standalone library, Dojo tab only) */
(function () {
  CourseData.dojoExtras.push(
    {
      id: "xtra-smart-compose",
      title: "Smart Compose for an email client",
      brief: "Inline sentence autocompletion with a sub-100 ms budget and a privacy minefield.",
      minutes: 35,
      xp: 60,
      scenario: String.raw`Mailbird is a cross-platform email client with 40 million monthly active users, roughly 60% on desktop web and 40% on native mobile apps. Product wants **Smart Compose**: grey inline text that predicts the rest of the sentence as the user types, accepted with Tab on desktop or a swipe on mobile. The bar leadership set is the Gmail bar — suggestions must feel instant, must not be embarrassing, and must never surface another person's private text.

The engineering context: the compose box already round-trips to the server for draft autosave with a **p50 of 90 ms in-region and 240 ms cross-region**. The mobile fleet ranges from 2019 Android midrange phones to current iPhones. Legal has drawn one hard line: message bodies may be used to improve the product only under an explicit opt-in, and no user's content may ever appear in another user's suggestion.

You are the AI engineer on the call. Design the system end to end and defend the latency, quality and privacy decisions.`,
      stages: [
        {
          name: "Requirements & latency budget",
          prompt: String.raw`Take it from the top. What do you pin down before designing anything, what numbers do you commit to if the interviewer refuses to give you any, and where exactly does "suggestions must feel instant" start to hurt?`,
          model: String.raw`**Scope first.** Three things get called Smart Compose in product meetings: sentence completion inside the compose box, subject-line generation, and full reply drafting. I commit to sentence completion only. Reply drafting is a different product with a different model, a different eval set and a different failure mode, and merging them into one eight-week project is how both ship badly.

**Latency is the binding constraint, and it is unusual.** A suggestion is only useful if it renders before the user types the next character. A fast typist hits 5-7 characters per second, so I have **140-200 ms between keystrokes** and I want to be well inside that: target **p95 under 100 ms from keystroke to grey text**. The existing autosave round trip is 90 ms p50 in-region and 240 ms cross-region. That single fact decides the architecture: a naive server call cannot make the budget outside the home region, so the design is either on-device inference or an edge model with a much tighter trigger policy.

**Scale, from MAU.** 40M MAU, assume 45% daily active, 4 composed messages per day, and about 8 prediction calls per message after debouncing: roughly 576M requests/day, about **6.7k QPS average and 20k QPS at peak**. That is a serving problem stacked on top of a 100 ms budget, which is the second argument for pushing inference to the device.

**Quality bar: precision over recall.** A wrong suggestion is more expensive than a missing one — the user reads it, rejects it, and loses their train of thought. I would rather show a suggestion 20% of the time and be right 30% of those than show one constantly.

**Privacy.** No cross-user content, ever. Personalization must be per-user and deletable.

**Coverage.** English only at launch: the trigger threshold, the eval set and the safety blocklist all need per-language work.`,
          rubric: [
            String.raw`Converted MAU into an estimated peak QPS for the suggestion endpoint`,
            String.raw`Set a numeric end-to-end latency target at or under about 100 ms`,
            String.raw`Compared that budget against the stated 90 ms server round trip`,
            String.raw`Argued precision over recall: a wrong suggestion costs more than none`,
            String.raw`Named no-cross-user-content as a hard requirement, not a nice-to-have`,
            String.raw`Cut reply generation or subject lines out of scope explicitly`,
            String.raw`Committed to a launch language scope instead of assuming all languages`,
          ],
        },
        {
          name: "Metrics & evaluation",
          prompt: String.raw`How do you know this model is good before any user sees it, and what do you watch once it is live? Name the specific metrics with targets, and say which one you put on the wall.`,
          model: String.raw`**Offline: ExactMatch@N.** Take held-out messages, cut each at a random point, ask the model for a completion, and measure the fraction where the prediction exactly matches the next N words of the real message. I report the curve, not one number: exact match collapses as N grows, so a system at 40% for N=1 might be at 15% for N=4. Word-level exact match is harsh and that is the point — it correlates with acceptance far better than perplexity does. Perplexity stays on the dashboard as a training health signal only; I have seen perplexity improve while acceptance drops because the model got more generic.

**The trigger is part of the model.** Because the system chooses when to show a suggestion, every offline number must be reported as a **coverage/precision pair**: coverage is the share of typing contexts where we would show something, precision is exact match among those. Tuning the threshold walks a curve, and the launch decision is a point on that curve, e.g. 20% coverage at 35% exact match rather than 60% coverage at 12%.

**Online.** Headline metric: **acceptance rate = accepted / shown**, target 25-30%. Value metric: **characters saved per active user per day** — this is what actually justifies the GPU bill and it can rise while acceptance falls, because longer accepted suggestions save more.

**Counter-metrics that can block a launch:** accepted-then-deleted within 5 seconds (a false accept, target under 3%), typing throughput regression, compose abandonment, and p95 suggestion latency.

**Slices.** Device tier, platform, reply vs new message, first sentence vs later sentences, and account type. A model that is great on desktop and useless on a 2019 Android is a rollout plan, not a rejected model.

**Human review** of a fixed 500-sample sweep per release for anything embarrassing: sensitive, biased or oddly specific completions.`,
          rubric: [
            String.raw`Named ExactMatch@N as the offline metric and reported it as a curve over N`,
            String.raw`Separated coverage (how often we show) from precision (how often we are right)`,
            String.raw`Defined acceptance rate as accepted over shown with a numeric target`,
            String.raw`Added a value metric such as characters saved per user per day`,
            String.raw`Included a counter-metric for accepted-then-deleted suggestions`,
            String.raw`Sliced metrics by device tier or platform`,
            String.raw`Stated that perplexity alone does not predict acceptance`,
          ],
        },
        {
          name: "Model & data strategy",
          prompt: String.raw`What model actually runs, how do you train it, and how do you make it sound like this particular user without ever training on anyone else's mail?`,
          model: String.raw`**Model.** A small decoder-only language model: about 6 layers, hidden size 512, a 16k word-piece vocabulary, roughly 40-60M parameters, int8-quantized to about **45 MB on disk** with a per-token cost near 1-2 ms on a mid-tier phone. Anything larger cannot make the budget on the device fleet, and the marginal exact-match gain from a 1B-parameter model is far smaller than the latency it costs. I train a much bigger teacher and **distill** it into this student, which typically recovers most of the quality gap at a fraction of the size.

**Context encoding.** The prompt is not just the current prefix. Subject line, the previous sentences of the draft, and the message being replied to all matter. But full attention over a long quoted thread is unaffordable, so the thread and subject are encoded cheaply — averaged token embeddings fed in as a prefix vector — while only the current draft gets real attention. This is exactly the tradeoff the original Gmail system made, and it buys most of the context benefit for almost no latency.

**Data.** Opt-in corpus only, de-identified, and then the rule that matters most: **drop any n-gram that does not appear in the mail of at least 50 distinct accounts**. Rare phrases are precisely the ones that are somebody's invoice number, address or medical detail. After that filter, whatever the model memorizes is by construction a common phrase.

**Personalization without leakage.** Three options, in ascending cost: (a) a local n-gram cache of the user's own frequent phrases, interpolated with the model at decode time; (b) an on-device adapter trained on the user's sent mail and never uploaded; (c) federated learning with secure aggregation and differential privacy for population-level gains. Ship (a) first — it captures greetings, signatures and the four phrases the user reuses daily, costs nothing to train, and is deleted by clearing one local table.`,
          rubric: [
            String.raw`Sized a small model with an explicit parameter count or on-device footprint`,
            String.raw`Justified the size against the per-token latency on low-end devices`,
            String.raw`Encoded thread or subject context cheaply rather than with full attention`,
            String.raw`Applied a rare-phrase or k-anonymity filter to the training corpus`,
            String.raw`Kept personalization on-device or federated, never a per-user server fine-tune`,
            String.raw`Proposed a cheap interpolation with user phrases as version one`,
            String.raw`Used distillation or quantization to reach the device footprint`,
          ],
        },
        {
          name: "Serving & triggering policy",
          prompt: String.raw`Walk one keystroke end to end with a budget. Beam search or greedy? Where does caching actually save you? And what makes you decide not to show a suggestion at all?`,
          model: String.raw`**Decoding: greedy, with a hard cap.** Beam search with width 3 costs roughly 3x the compute for a few points of exact match. At 20k QPS with a 100 ms budget on phones that number is not affordable, and the product is latency. I ship greedy decoding, stop at a sentence boundary or after 8 words, and spend the saved budget on a better trigger threshold instead — tuning the threshold moves acceptance more than beam width does.

**The trigger policy is the real product dial.** Show a suggestion only when all of these hold: mean per-token log-probability above a tuned threshold; at least 3 characters typed in the current sentence; the user has not rejected a suggestion in this sentence already; and the cursor is not inside quoted text, a URL, an address block or a pasted snippet. Raising the threshold cuts coverage and lifts acceptance — that curve from stage 2 is what I tune, per platform, because a slow platform needs a higher bar to be worth the interruption.

**Debounce and cancel.** Never fire per keystroke. Wait for a typing pause of about 50 ms, cancel any in-flight request when a new character arrives, and drop responses that come back after the prefix has changed. This alone removes over half the naive request volume.

**Caching, in order of value:**

1. **Prefix KV cache** — as the user types forward, reuse the cached keys/values for the draft and run inference for one new token instead of the whole prefix. This is what makes per-keystroke prediction viable at all.
2. **Type-through cache** — when the user types exactly the characters we already predicted, serve the remaining suffix from the last suggestion with zero inference. In practice a large share of impressions are free.
3. **Shared opener cache** — a small table of the most common sentence starts ("Thanks for the update, ") served from memory.

**Placement.** On-device for native apps; on web, a WebAssembly build for desktop and an in-region edge service with a raised threshold where the device cannot run it.`,
          rubric: [
            String.raw`Chose greedy or a very small beam and justified it with latency arithmetic`,
            String.raw`Defined a confidence threshold as the trigger dial with the coverage tradeoff`,
            String.raw`Debounced keystrokes and cancelled or discarded stale in-flight requests`,
            String.raw`Reused the prefix KV cache across successive keystrokes`,
            String.raw`Served a typed-through suggestion from cache without new inference`,
            String.raw`Suppressed suggestions in unsafe contexts such as quoted text or URLs`,
            String.raw`Split on-device versus server placement with an explicit rule`,
          ],
        },
        {
          name: "Rollout, guardrails & feedback loop",
          prompt: String.raw`The model clears your offline bar. How do you ship it, what could embarrass the company on launch day, and how does user behaviour become training signal without becoming a privacy incident?`,
          model: String.raw`**Rollout.** Dogfood, then 1%, 5%, 25%, 100%, each step held for at least three days and gated on acceptance rate, p95 latency, false-accept rate and typing throughput. The flag is scoped per platform and per locale so a bad interaction on old Android is a flag flip, not a rollback of the whole launch. Every model swap re-runs the full offline suite plus the 500-sample human sweep.

**The embarrassment surface, in severity order.**

*Memorized private data.* The model completes "my account number is" with something real. Defences at three layers: the 50-account n-gram filter in the data, a runtime suppressor that refuses completions containing long digit strings, emails, phone numbers or addresses, and a **verbatim-extraction canary test** — prompt the trained model with 10k rare prefixes drawn from training and assert nothing is reproduced word for word. That test runs on every training run and blocks release.

*Biased completions.* Predicting a pronoun after a role noun is a guess about someone's gender that shows up as a product opinion. The pragmatic move, and the one Gmail actually made, is to **suppress gendered pronoun predictions entirely** — the exact-match cost is under a point and the downside is a news story.

*Toxic or inappropriate suffixes.* Blocklist plus a tiny classifier over the candidate string before it renders.

**Feedback loop.** Log events, not text: context hash, suggestion length, shown, accepted, edited-after-accept, latency, device tier, locale. Accepted suggestions are positive labels; shown-and-typed-over are negatives. The trigger threshold is retuned weekly from this; the language model is retrained monthly on the opt-in corpus only.

**The trap in that loop:** we only observe outcomes for suggestions the current policy chose to show, so the data is censored by the policy and re-training on it entrenches it. Fix with **randomized exploration** — on 0.5% of traffic, show suggestions below the threshold and log the result, giving an unbiased estimate of what we are missing.

**Deletion.** Local adaptation is wiped instantly on request; opt-in training contributions are excluded from the next retrain. Since a trained model cannot be un-trained, the retrain cadence is the honest deletion SLA and I would say so out loud rather than promise otherwise.`,
          rubric: [
            String.raw`Staged rollout with named gating metrics and a per-platform kill switch`,
            String.raw`Named memorized private data as the top risk with a data-level mitigation`,
            String.raw`Added a runtime suppressor for digits, emails or addresses in suggestions`,
            String.raw`Proposed a verbatim-extraction canary test that blocks release`,
            String.raw`Suppressed gendered pronoun or otherwise sensitive completions`,
            String.raw`Logged interaction events rather than raw message text`,
            String.raw`Added randomized exploration below threshold to de-bias the feedback loop`,
          ],
        },
      ],
    },
  );
})();

(function () {
  CourseData.dojoExtras.push(
    {
      id: "xtra-semantic-search",
      title: "Semantic search for an e-commerce catalog",
      brief: "2M SKUs, typo-heavy queries and merchandisers who want control. Hybrid retrieval, done properly.",
      minutes: 35,
      xp: 60,
      scenario: String.raw`Kettu is a marketplace: **2M SKUs** across 900 categories from 40k third-party merchants, **6M weekly active shoppers**. Search is the revenue path — 68% of sessions start with a query and search-attributed GMV is 55% of the total.

Today search is Elasticsearch BM25 over title plus description with a hand-tuned boost file that three people are afraid to edit. Three complaints landed in the same quarter. **18% of queries return zero results**, mostly typos ("nkie air force", "wireless earbufs") and descriptive queries ("shoes for wide feet office"). Merchandising cannot reliably control what appears for high-intent head queries. And p95 search latency is already 380 ms.

The catalog moves constantly: **400k price or stock updates per day** and about 30k new SKUs. Leadership has decided the answer is "semantic search" and has asked you to design it. Take the whole system, from the query box to the index, and say what you would actually build.`,
      stages: [
        {
          name: "Requirements & scope",
          prompt: String.raw`Before touching embeddings: what exactly are you being asked to fix, what numbers do you commit to, and what part of the current system are you explicitly not replacing?`,
          model: String.raw`**What semantic search is actually being asked to fix.** Three distinct problems got merged into one word. Zero results at 18% is mostly a *query understanding* problem (typos, unmatched vocabulary). Descriptive queries failing is a *recall* problem that embeddings genuinely solve. Merchandising's complaint is a *ranking control* problem that embeddings make worse, not better. I want the interviewer to hear that these need three different fixes.

**What I do not replace.** BM25 for head queries. For "iphone 15 pro case" lexical matching is already near-optimal, and a dense retriever will happily return the iPhone 14 case because those strings live next to each other in embedding space. Any design that rips out lexical retrieval is a regression waiting to be discovered in the A/B test.

**Numbers I commit to.**

- **Traffic.** 6M WAU, assume 2.5M DAU and 4 searches each: 10M searches/day, about **115 QPS average, 500 QPS at peak**, and I design headroom for a 5x seasonal peak at **2,500 QPS**.
- **Latency.** p95 end to end **under 300 ms** — search latency is a revenue metric, not an engineering metric. Of that, 120 ms for retrieval, 60 ms for ranking, the rest for the app tier.
- **Query mix.** Assume Zipf: the top 1,000 queries carry about half the volume. Head is where the money is, tail is where semantic retrieval earns its keep. I will report every metric split that way.
- **Freshness.** Price and stock correct within **60 seconds**; a new SKU searchable within **15 minutes**.
- **Control.** Merchandising rules, sponsored placements and regional restrictions are hard requirements that must survive the redesign.

**Success criteria.** Zero-result rate below 3%, search-to-purchase conversion up, and a hard guardrail: **no relevance regression on head queries**.`,
          rubric: [
            String.raw`Estimated peak QPS from the stated user numbers with explicit assumptions`,
            String.raw`Set a numeric p95 latency budget and split it across retrieval and ranking`,
            String.raw`Separated head from tail traffic and said where semantic retrieval actually wins`,
            String.raw`Refused to remove lexical retrieval and gave a failure example`,
            String.raw`Gave freshness targets for price/stock and for new SKUs separately`,
            String.raw`Named merchandising control and filters as hard requirements`,
            String.raw`Set a zero-result-rate target plus a no-regression guardrail on head queries`,
          ],
        },
        {
          name: "Query understanding",
          prompt: String.raw`Most of the 18% zero-result queries are typos or descriptive phrasing. What sits in front of retrieval, and which of these problems do you refuse to solve with the embedding model?`,
          model: String.raw`**Normalization** is table stakes: unicode folding, lowercasing, punctuation stripping, singularization, and unit normalization ("42eu" and "eu 42").

**Spell correction built from the catalog, not a dictionary.** A general English dictionary turns "nkie" into "nice". The correction index must be built over *catalog terms and query logs*, weighted by frequency, with an edit-distance structure such as a symmetric-delete index for speed. The best training signal is free and already logged: **session reformulation pairs** — a shopper searches X, gets nothing or clicks nothing, searches Y, and buys. Mining a few million of those gives a correction table that no dictionary can match, including slang and abbreviations.

**Do not over-correct.** Brand names look exactly like typos. The rule: correct only when the corrected query is far more frequent in the catalog than the original, and always show it — "showing results for nike, search instead for nkie". Silent rewriting destroys trust for the small number of people who typed exactly what they meant.

**Attribute extraction into filters.** Run a lightweight NER over the query for brand, colour, size, category and numeric constraints ("under 50", "size 44"). These become **structured filters**, not text sent to the retriever. This is the part candidates skip and it matters most: an embedding of "under 50 euros" does not encode a price bound, it encodes vibes. Hard constraints belong in filters.

**Intent classification and routing.** Navigational ("airpods pro 2"), descriptive ("gift for a runner"), and browse ("summer dresses") behave differently. Route navigational queries lexical-heavy and descriptive ones dense-heavy rather than using one fusion weight for everything.

**What I refuse to hand to embeddings:** model numbers, sizes, prices, availability. Embeddings smooth precisely the distinctions that make the sale wrong.`,
          rubric: [
            String.raw`Built spell correction over catalog vocabulary rather than a generic dictionary`,
            String.raw`Mined session reformulation pairs from logs as correction training data`,
            String.raw`Guarded against over-correcting brands and kept a visible "showing results for" affordance`,
            String.raw`Extracted brand, size or price constraints into structured filters`,
            String.raw`Argued that numeric and hard constraints must not be left to embeddings`,
            String.raw`Classified query intent and routed lexical versus dense accordingly`,
          ],
        },
        {
          name: "Retrieval architecture",
          prompt: String.raw`Design retrieval itself. Do vectors replace BM25 or sit beside it, how are the two candidate lists combined, and what are the index sizing and latency numbers?`,
          model: String.raw`**Hybrid, because each side fails differently.** BM25 nails rare tokens, model numbers and merchant attribute strings; it fails on paraphrase. A dense bi-encoder nails paraphrase and description; it fails on exact identifiers. Running both and fusing is not fence-sitting, it is the only configuration that covers both failure modes.

**The embedding model must be fine-tuned.** An off-the-shelf general text embedding is trained on web prose, not on "Nike Air Force 1 07 White Mens Sz 10". Train a bi-encoder on **query to purchased-SKU pairs** from logs — tens of millions are available — with in-batch negatives plus **hard negatives mined from BM25 top results that were shown and not clicked**. That fine-tune is the single highest-ROI model task in the project.

**Sizing.** Dimension 384, not 1536: 2M vectors x 384 x 4 bytes is about **3 GB** in float32, or roughly 770 MB with int8 quantization, so the whole index sits in RAM on one machine with replicas for QPS. HNSW with M=32, ~efSearch~ tuned until recall@100 against exact search reaches 0.95.

**Filters are the trap.** Post-filtering after ANN silently destroys recall when filters are selective — "red, size 44, in stock, ships to DE" can cut 100 candidates to 2. Use filtered ANN search with the filter pushed into graph traversal, or partition indexes by top-level category, and monitor how often a filtered query returns fewer than k results.

**The funnel.** Lexical top 300 plus dense top 300, fused with **Reciprocal Rank Fusion** (k=60) rather than a weighted score sum, because BM25 scores and cosine similarities are not on comparable scales and per-query normalization is fragile. Then **collapse variants** — 2M SKUs are maybe 600k products, and eight colours of one shoe filling the first row is a relevance failure — and pass the top 200 products to ranking.

**Budget:** lexical 25 ms, query embedding 8 ms (cached for head queries), ANN 20 ms, fusion and collapse 10 ms. About 65 ms, inside the 120 ms allocation.`,
          rubric: [
            String.raw`Kept lexical and dense retrieval side by side with a concrete failure case for each`,
            String.raw`Fine-tuned the embedding model on click or purchase pairs with hard negatives`,
            String.raw`Gave index sizing with dimension and memory footprint`,
            String.raw`Set an ANN recall target against exact search`,
            String.raw`Flagged that post-filtering after ANN destroys recall on selective filters`,
            String.raw`Fused candidate lists with rank fusion and justified it over score blending`,
            String.raw`Collapsed product variants before ranking`,
          ],
        },
        {
          name: "Ranking & business rules",
          prompt: String.raw`Two hundred candidates come back. How do you order them, and how do merchandisers get real control without recreating the hand-tuned boost file nobody can debug?`,
          model: String.raw`**A learned ranker over the candidates.** Gradient-boosted trees with a ranking objective (LambdaMART-style) still beat neural rankers on tabular e-commerce features, train in minutes, and are inspectable — which matters when a category manager asks why a SKU dropped.

**Features in four groups.** *Relevance*: BM25 score, cosine similarity, title-match ratio, attribute-match count. *Engagement*: query-SKU historical CTR, add-to-cart rate and conversion, all smoothed toward the category prior so a SKU with three impressions does not outrank a proven one. *Quality*: rating, review count, return rate, seller fulfilment SLA, image presence. *Personalization*: size affinity, brand and category history.

**Labels must be graded, not clicks.** Purchase beats add-to-cart beats click beats impression. Training on clicks alone bakes in **position bias** — the top result gets clicked because it is on top — and the model then learns to reproduce whatever the old system ranked first. Fix it with inverse propensity weighting from a randomization experiment, or include position as a feature at training time and set it to a constant at serving. Say which one you chose and why.

**Business rules live outside the model.** This is the answer to the merchandising complaint. Three layers, each auditable:

1. **Hard filters** before ranking: out of stock, region restrictions, regulated goods, banned merchants. Non-negotiable, never a score.
2. **A rules engine** after ranking for pinned SKUs, campaign boosts and category-level adjustments, each rule scoped to a query pattern with an owner and an expiry date, and each result carrying an explanation ("position 1: pinned by campaign SUMMER24").
3. **Sponsored placements in fixed slots**, allocated by bid times predicted relevance, with a relevance floor so an ad cannot be junk.

Putting margin or a campaign directly into the model score makes the model unauditable and un-rollback-able. Keeping rules in a separate layer means a merchandiser can change tomorrow's homepage without a retrain.

**Diversity**: cap results per seller and per brand in the top 10, and blend sub-categories for ambiguous queries like "mouse".`,
          rubric: [
            String.raw`Chose a learned ranker and named the model family with a reason`,
            String.raw`Grouped features into relevance, engagement, quality and personalization`,
            String.raw`Used graded labels (purchase over cart over click) rather than raw clicks`,
            String.raw`Handled position bias explicitly with propensity weighting or a neutralized feature`,
            String.raw`Kept business rules in an auditable layer separate from the model score`,
            String.raw`Gave sponsored results fixed slots with a relevance floor`,
            String.raw`Enforced per-seller or per-brand diversity in the top results`,
          ],
        },
        {
          name: "Index freshness & migration",
          prompt: String.raw`400k price and stock updates plus 30k new SKUs land every day, and one day you will want a better embedding model. How does data reach the index, and what do you refuse to recompute?`,
          model: String.raw`**Split the document by mutability.** Price, stock, shipping and rating change constantly and carry no semantic weight. Title, description and attributes change rarely and are what the vector encodes. Two pipelines, not one.

**Mutable path.** Change data capture from the merchant database streams into (a) a partial update on the lexical document and (b) a live key-value store consulted at filter and ranking time. Target p95 under 60 seconds from merchant edit to search behaviour. Critically, **availability is filtered from the live store at query time, not from the index** — the index is eventually consistent and an out-of-stock top result is a support ticket.

**Text path.** Re-embed only when the **content hash of the text fields** changes. A price change must never trigger an embedding: the vector is identical and you would burn GPU to write the same numbers back. Volume is 30k new SKUs plus maybe 50k text edits per day — under 1 QPS of embedding work, which is nothing.

**Full re-embedding happens only on a model version change,** and that is the sharp edge. You cannot mix vectors from two model versions in one index; cosine similarity between them is meaningless. The migration:

1. Stamp every vector with an ~embedding_version~.
2. Build the new index **offline in shadow**, backfilling all 2M SKUs — at a few thousand embeddings per second per GPU this is single-digit GPU-hours, so quote it as an afternoon, not a quarter.
3. Replay a frozen query set through both indexes and compare recall and nDCG before anything is live.
4. Flip an **alias** atomically, keep the old index warm for at least a week, and keep rollback a one-line change.

**Deletes and takedowns** need a tombstone path measured in seconds — a merchant pulling a counterfeit listing cannot wait for nightly compaction, so the filter layer consults a deny set while the index catches up.`,
          rubric: [
            String.raw`Split mutable price/stock updates from text changes into separate pipelines`,
            String.raw`Refused to re-embed on price or stock changes and explained why`,
            String.raw`Triggered re-embedding from a content hash of the text fields`,
            String.raw`Filtered availability from a live store at query time rather than trusting the index`,
            String.raw`Stamped an embedding version on every vector`,
            String.raw`Planned a shadow index build with an atomic alias flip and a rollback window`,
            String.raw`Gave a fast tombstone path for takedowns and deletions`,
          ],
        },
        {
          name: "Evaluation & experimentation",
          prompt: String.raw`How do you prove the new system beats the BM25 stack that currently pays everyone's salary — offline first, then online, and with what decision rule?`,
          model: String.raw`**Offline, two artifacts.** First a **graded relevance set**: 1,500 query-SKU pairs sampled by traffic stratum (head, torso, tail) and graded 0-3. Human raters set the standard; an LLM judge can scale it, but only after calibrating on 300 human-labelled pairs and reporting agreement — I want a Cohen kappa above about 0.6 before I trust it, and I re-calibrate whenever the judge prompt changes. Metrics: **nDCG@10** for the ranked page and **recall@100 measured separately for retrieval**, because you cannot rank what you never retrieved and a single blended number hides which half broke.

Second, a **CI regression suite** of a few hundred head queries with expected top results. If "airpods pro" stops returning AirPods Pro at position one, the build fails. This catches the entire class of embarrassing regressions that offline averages happily absorb.

**Online, in two steps.** Screen candidates with **team-draft interleaving**: each user sees results drafted from both rankers, so the comparison is within-user and needs roughly an order of magnitude less traffic than an A/B test to detect a ranking difference. Cheap, fast, and it kills bad ideas in a day.

Then run an **A/B test** for the business decision, because interleaving measures ranking preference, not revenue. Primary metric: search-to-purchase conversion rate. Secondary: revenue per session, search abandonment, queries per session (which can rise for a bad reason). Guardrails that can independently fail the test: p95 latency, zero-result rate, and ads revenue.

**Power up front.** At 10M searches/day and a 3.5% baseline conversion, detecting a 1% relative lift takes millions of sessions per arm — roughly a week at a 50/50 split. I state that before launch so nobody reads day-two noise as a result.

**And I expect the offline-to-online gap.** nDCG gains routinely fail to transfer. When they disagree, the online test wins and the judged set gets re-examined.`,
          rubric: [
            String.raw`Built a graded relevance set stratified by head, torso and tail traffic`,
            String.raw`Reported nDCG for ranking and recall separately for retrieval`,
            String.raw`Calibrated any LLM judge against human labels with an agreement number`,
            String.raw`Kept a CI regression suite of head queries with expected results`,
            String.raw`Proposed interleaving as a cheap online screen before a full A/B test`,
            String.raw`Named an A/B primary metric plus guardrails that can fail the launch`,
            String.raw`Estimated experiment duration or sample size before launching`,
          ],
        },
      ],
    },
  );
})();

(function () {
  CourseData.dojoExtras.push(
    {
      id: "xtra-text-to-image",
      title: "Text-to-image inside a design tool",
      brief: "Seconds-scale GPU jobs, an abuse surface that ends companies, and unit economics that must survive success.",
      minutes: 35,
      xp: 60,
      scenario: String.raw`Canvasly is a browser design tool: **3.5M monthly actives, 400k paying seats** on a $12/month plan, mostly small-business marketers producing social posts, banners and ads. Product wants a **Generate image** panel — type a prompt, get four images on the canvas, iterate, drop the keeper into the design.

The positioning is "brand-safe imagery you can actually publish", which is the whole difficulty: customers put these images into paid ads, so output has to be commercially usable and must not contain someone's face, someone's logo, or something that gets the account banned. Traffic is concentrated — about **70% of generations happen inside nine business hours** across three time zones — and marketing plans a launch campaign that could multiply volume by five in a week.

Finance's constraint: the feature must cost less than **15% of the subscription revenue it defends**. You are the AI engineer. Design the feature end to end, and be specific about what runs where and what it costs.`,
      stages: [
        {
          name: "Requirements & abuse surface",
          prompt: String.raw`Scope it. What are the product and scale numbers you commit to, why is the latency conversation different from every other AI feature, and what abuse categories do you name before you touch architecture?`,
          model: String.raw`**Product shape.** Four images per generation at 1024x1024, upscale on demand, prompt plus a style preset. Cut from v1: video, inpainting, and per-customer style fine-tuning — that last one is a training pipeline and a storage problem masquerading as a feature.

**Latency is a different conversation here.** A diffusion generation is seconds, not milliseconds: an SDXL-class model at 30 steps on an L4-class GPU is roughly 4-8 seconds per 1024px image, and a batch of four lands around 12-15 seconds. No amount of engineering makes that feel like autocomplete, so the UX contract changes: this is an **async job with visible progress**, and the metric is p95 **time to first visible preview** (target under 3 seconds via intermediate latents) with total completion under 20 seconds. Designing this as a synchronous HTTP call is the mistake that forces a rewrite later.

**Volume.** 400k paying seats, assume 30% adopt and each runs 20 generations/month: **2.4M generations, 9.6M images per month**, about 80k generations/day. With 70% inside nine hours, that is roughly **1.7 generations/second sustained and 4/second at peak** — 16 images per second at peak. That number sizes the GPU pool.

**Commercial use is an architecture constraint, not a legal footnote.** Customers publish these as ads, so training-data provenance and vendor indemnification filter the model shortlist before quality does.

**Abuse surface, named up front because each needs a different control:** sexual content and above all CSAM, which is a company-ending and legally reportable category; real people and public figures (deepfakes); trademarked characters and brand logos, which is where a customer's ad becomes a lawsuit; graphic violence; and misleading political imagery.

**One more requirement:** prompts contain customers' unreleased campaign ideas. Prompt logs are confidential data with retention limits, not free training material.`,
          rubric: [
            String.raw`Converted seats into a peak generations-per-second and images-per-second estimate`,
            String.raw`Stated per-image generation time and set a p95 in seconds, not milliseconds`,
            String.raw`Treated generation as an async job with progress rather than a synchronous call`,
            String.raw`Made commercial licensing or provenance a hard model-selection constraint`,
            String.raw`Enumerated abuse categories including CSAM, real people and trademarks`,
            String.raw`Cut video, inpainting or per-customer fine-tuning out of v1`,
            String.raw`Treated user prompts as confidential business data`,
          ],
        },
        {
          name: "Model choice: buy or host",
          prompt: String.raw`Pick the model and where it runs. Show the arithmetic for a hosted image API versus self-hosted GPUs, and say what would make you change the decision later.`,
          model: String.raw`**The budget first.** 400k seats x $12 = $4.8M/month of defended revenue, so the 15% ceiling is **$720k/month**. Volume is 9.6M images/month.

**Hosted API.** At 2025-2026 market rates of roughly $0.02-0.04 per 1024px image, call it $0.03: **about $288k/month**. That fits under the ceiling, and it ships in two weeks with zero GPU ops. But notice the shape — it scales exactly linearly with success, so the better the feature does, the worse the margin.

**Self-hosted.** An L4 or A10G-class GPU rents for roughly $0.60-1.00/hour and, batching four images at 1024px and 30 steps, produces about one image every 3 seconds sustained, so roughly 1,200 images/hour, or **$0.0006-0.0009 per image** — an order of magnitude cheaper per image. Peak of 16 images/second needs about 50 GPUs, with a baseline nearer 15. At an average of 25 GPUs running continuously, that is **about $15-20k/month of compute** plus a meaningful ops burden: checkpoint management, driver hell, autoscaling, on-call.

**The decision.** Launch on the hosted API behind a thin provider interface, because the first risk is that nobody uses the feature and burning a quarter on GPU infrastructure to find that out is malpractice. Instrument cost per image from day one and set an explicit migration trigger: **when API spend passes about $60k/month, or two months of sustained demand, whichever comes first**, move the base load in-house and keep the API wired as burst and fallback. That threshold is roughly where a dedicated infra engineer pays for themselves.

**Choosing between candidate checkpoints** is decided on 200 prompts drawn from actual customer work — product shots, banners, social posts — not on gallery art. Two selection criteria dominate for this audience: **legible text rendering inside the image** ("50% OFF" on a banner) which models differ on wildly, and vendor indemnification for commercial use.`,
          rubric: [
            String.raw`Computed the monthly budget ceiling from the revenue and the stated percentage`,
            String.raw`Priced the hosted API per image and multiplied out to a monthly number`,
            String.raw`Computed a GPU-hour cost per image for the self-hosted option`,
            String.raw`Chose to launch on the API and named a concrete migration trigger`,
            String.raw`Kept the model behind a provider interface so it can be swapped`,
            String.raw`Evaluated candidate models on real customer prompts including in-image text`,
            String.raw`Weighed indemnification or licensing alongside raw image quality`,
          ],
        },
        {
          name: "Serving architecture",
          prompt: String.raw`Jobs take seconds and traffic swings by an order of magnitude. Draw the serving path, and tell me exactly what the user sees when the queue is 900 jobs deep.`,
          model: String.raw`**The path.** The API validates and moderates the prompt, writes a job to a queue, and returns a job id immediately. The client subscribes over a websocket for progress and results. Workers pull jobs, generate, write images to object storage, and publish completion events. Nothing holds an HTTP connection for fifteen seconds.

**Queue design.** Priority classes — paid ahead of trial, interactive ahead of bulk — plus a **per-user concurrency cap of two in-flight generations**. That cap is both a fairness mechanism and the cheapest abuse control in the system: one scripted account cannot occupy the pool.

**GPU pool and the real bottleneck: cold start.** A worker that pulls a 7 GB checkpoint and loads it into VRAM takes 60-180 seconds to become useful, which is longer than the spike you are scaling for. So: keep a warm baseline sized to p50 traffic, bake weights into the image or mount a pre-populated cache volume, keep models resident and multiplexed across requests, and **autoscale on queue wait time, not CPU utilization** — CPU is meaningless on a GPU worker.

**Batching.** The four images of one request go in one batch. Cross-request batching for identical resolution and step settings is worth it with a cap of about 200 ms on batch-forming wait, beyond which you are trading a user's latency for throughput they did not agree to.

**At 900 jobs deep, in order:** spill overflow to the hosted API and pay more per image for a while rather than degrade the experience — that is exactly what the hybrid from stage 2 buys. If spend caps are hit, walk the degradation ladder: 30 steps to 20, four images to two, 1024px to 768px with upscale on the keeper. Then, only then, queue — and show an honest estimate ("about 40 seconds") rather than an indeterminate spinner. Under sustained overload, trial tier is throttled before paid.

**Two details that pay for themselves:** stream intermediate previews so tiles fill in progressively, and key a result cache on prompt plus seed plus parameters so an identical regeneration is free and "undo" is instant.`,
          rubric: [
            String.raw`Made generation an async job with an id and a push channel for results`,
            String.raw`Added per-user concurrency caps and priority classes in the queue`,
            String.raw`Named GPU cold start as the scaling bottleneck with a concrete mitigation`,
            String.raw`Autoscaled on queue depth or wait time rather than CPU utilization`,
            String.raw`Batched images per request with a bounded batch-forming wait`,
            String.raw`Defined an ordered degradation ladder under overload`,
            String.raw`Spilled overflow to the hosted API and showed an honest wait estimate`,
          ],
        },
        {
          name: "Moderation pipeline",
          prompt: String.raw`These images end up in published ads. Describe the moderation pipeline in both directions, the different actions per category, and what you do about the false positives it will certainly produce.`,
          model: String.raw`**Two gates, because either alone fails.** Prompt-only filtering is trivially bypassed by euphemism. Image-only filtering burns GPU generating things you should have refused. Both, always.

**Pre-generation, on the prompt** (under 50 ms): a blocklist for hard categories, a small text classifier, a match against a public-figure name list, and a trademark term list. Cheap, catches the obvious, and every block is logged.

**Post-generation, on the image:** an NSFW classifier; **CSAM detection via hash matching plus a classifier**; face-similarity against public-figure embeddings; and logo detection for the top few thousand marks. This gate exists because a benign prompt can still produce an unsafe image — diffusion models are not deterministic about what they put in frame.

**Different categories get different actions, and this is the part most candidates flatten.**

- **CSAM:** no threshold tuning, no user-facing appeal path, hard block plus preservation and escalation through the defined legal reporting process. This is a compliance obligation, not a product decision.
- **NSFW and graphic violence:** hard block with a generic message.
- **Possible public figure:** soft block with an explanation and an appeal route, because the classifier will be wrong about ordinary faces.
- **Possible trademark:** **warn, do not block** — "this may contain protected characters or marks; publishing rights are your responsibility". Hard-blocking every cartoon mouse would be constant false positives on legitimate work.

**False positives are the real product risk.** Over-blocking a lingerie brand's legitimate ad or a wine campaign churns paying customers, and it is invisible unless you measure it. So: log every block with prompt, category and classifier scores; human-review a sample of 200 blocks per week; track **block rate by customer segment with a target under about 2% on paying accounts** and treat a breach as a bug. Repeat offenders escalate at the account level rather than being silently blocked forever.

**Provenance:** attach content credentials and an invisible watermark to every generated image — required for disclosure in some markets and useful when an image comes back as evidence.`,
          rubric: [
            String.raw`Filtered the prompt before generation and the image after it, with a reason for both`,
            String.raw`Routed CSAM through a distinct legal escalation rather than an ordinary block`,
            String.raw`Assigned different actions per abuse category instead of one blocklist`,
            String.raw`Chose to warn rather than hard-block on trademark or likeness ambiguity`,
            String.raw`Measured false positives with sampling and a block-rate target`,
            String.raw`Attached watermarking or provenance metadata to generated images`,
            String.raw`Escalated repeat abuse at the account level`,
          ],
        },
        {
          name: "Cost control & evaluation",
          prompt: String.raw`Six months in, the CFO wants the unit economics and the PM wants to ship a new checkpoint. How do you keep cost honest, and how do you decide whether the new model is actually better?`,
          model: String.raw`**Cost levers, ordered by size.**

1. **Stop generating four full-resolution images.** Users keep roughly one of four, so three quarters of full-res compute is thrown away. Generate the grid at 768px and **upscale only the kept image**. This is typically a 40-50% cut and it is the first thing I would ship.
2. **Steps.** 30 to 22 steps is about a 25% saving. Whether it is free depends on a preference test — run it, do not assume it.
3. **Cache.** Prompt plus seed plus parameters is a cache key; identical regenerations cost nothing.
4. **Plan quotas.** 100 generations included per seat per month, metered above that. A pricing lever usually beats every engineering lever and it also caps the tail user.
5. **Spot GPUs** for bulk and non-interactive jobs at a 60-70% discount with a relaxed SLA.

**The unit that matters is cost per *kept* image, not cost per generated image.** Reporting the latter makes lever 1 look like a quality cut instead of a win.

**Evaluating a new checkpoint.** Image quality has no ground truth, so the primary instrument is human preference: a frozen suite of **300 prompts sampled from real usage**, segmented by category (product shot, social banner, illustration, background), judged side by side by five raters each, reported as win rate with confidence intervals. Automated proxies — CLIP score for prompt adherence, an aesthetic predictor — run alongside as directional signals and are never the decision.

**Score dimensions separately**, because a checkpoint often trades them: prompt adherence, aesthetics, **text legibility inside the image**, and **style consistency** — the same preset must produce a recognisably similar look twice, measured as embedding distance between generations under one preset. A brand cannot use a model that reinvents itself every session.

**Online:** ship behind a flag at 5% and compare **keep rate** (images actually placed in a design), download and publish rate, regenerate rate, and cost per kept image. A checkpoint that wins on aesthetics and loses on keep rate does not ship.`,
          rubric: [
            String.raw`Generated the grid at lower resolution and upscaled only the kept image`,
            String.raw`Tuned diffusion steps against a measured preference test, not by guess`,
            String.raw`Used plan quotas or metering as a pricing-side cost lever`,
            String.raw`Defined cost per kept image rather than cost per generated image`,
            String.raw`Built a human preference suite over real-usage prompts with multiple raters`,
            String.raw`Scored prompt adherence, text legibility and style consistency separately`,
            String.raw`Gated the new checkpoint on an online keep-rate comparison behind a flag`,
          ],
        },
      ],
    },
  );
})();

(function () {
  CourseData.dojoExtras.push(
    {
      id: "xtra-translation",
      title: "Real-time translation for a chat app",
      brief: "Billions of six-word messages, a Zipf of language pairs, and BLEU lying to your face.",
      minutes: 35,
      xp: 60,
      scenario: String.raw`Loop is a mobile-first group chat app: **90M monthly actives**, strongest in India, Brazil, Indonesia, Germany and the US. About **22% of groups are already multilingual** — someone types in one language and gets answered in another, often mixing scripts inside a single message.

Product wants inline translation. Every message gets a Translate toggle, and a user can set a group to auto-translate everything into their own language. Messages are short: **median 6 words, p95 28 words**, and they arrive in bursts. The audience is heavily on cheap Android devices over unreliable mobile networks.

One product decision is already made: 1:1 chats are end-to-end encrypted and will not be translated server-side, so translation is offered only in large groups where the server can read the message. Retention rules for that text are yours to propose.

You are the AI engineer. Design the translation service — models, serving, evaluation, and what happens when it goes wrong.`,
      stages: [
        {
          name: "Requirements & scope",
          prompt: String.raw`Set the frame. What throughput are you designing for, what is the latency contract in a chat medium, and which language pairs are you actually promising to support?`,
          model: String.raw`**Throughput.** 90M MAU, assume 45M DAU sending 40 messages/day: 1.8B messages/day. Only multilingual groups need translation — 22% of groups, and inside those maybe 60% of messages need at least one target language: roughly **240M translations/day, about 2,800 QPS average and 8,500 QPS at peak**. That number rules things out immediately. This is a throughput and cost problem, not a frontier-quality problem.

**The latency contract, and the most important design decision in this stage: translation never blocks delivery.** The original message is delivered and rendered instantly; the translation replaces or accompanies it when it arrives. Target p95 **under 300 ms** for a median message and under 500 ms at p95 length. Making delivery wait on a translation service means a translation outage is a chat outage, and chat outages are what people uninstall over.

**Language pairs are Zipf, and saying "all pairs" is the wrong answer.** With five strong markets, the **top 20 pairs will carry 85-90% of volume** — English to Spanish, Portuguese, Hindi, Indonesian, German and back. I design two tiers: dedicated capacity for hot pairs, and a generic multilingual path for the tail, with pivoting through English accepted there along with its quality cost.

**Register is a product decision, not a model detail.** Chat is informal. Languages with a T-V distinction (German, French, Spanish, Portuguese) and honorific systems (Japanese, Korean) force a choice on every sentence, and defaulting to formal in a friend group is *wrong even when it is grammatical*. Default informal, allow a per-group override.

**Privacy.** Server-side translation only where the server can already read the text. Message text is used for the request and a short-lived cache, not retained for training without an explicit opt-in.

**Devices.** On-device translation ships only for a user's top one or two pairs and offline use; the fleet cannot hold a hundred models.`,
          rubric: [
            String.raw`Estimated translation QPS from user numbers with explicit assumptions`,
            String.raw`Set a p95 latency target suited to a conversational medium`,
            String.raw`Refused to block message delivery on the translation service`,
            String.raw`Treated language pairs as a Zipf distribution with hot pairs plus a tail strategy`,
            String.raw`Named formality or register as a product decision and picked a default`,
            String.raw`Bounded translation to readable surfaces with an explicit retention rule`,
          ],
        },
        {
          name: "Model strategy",
          prompt: String.raw`Dedicated neural MT models or an LLM? Commit to an answer, show the cost difference, and say whether the answer changes between the top pair and a rare one.`,
          model: String.raw`**Tiered, and the tiers are chosen by arithmetic.**

**Hot pairs get dedicated NMT.** A transformer encoder-decoder at 60-100M parameters, batched on an L4-class GPU, handles hundreds of short messages per second per GPU; 8,500 QPS peak lands around **20-30 GPUs, roughly $20-25k/month**. Routing the same traffic to even a cheap LLM at 30 input and 25 output tokens per message costs about $0.00002 each, which at 240M/day is **on the order of $150k/month** — six to eight times more, at several times the latency. For the head of the distribution, small dedicated models win outright.

**The tail goes to a many-to-many multilingual model** (NLLB-style) or to an LLM API for genuinely rare pairs, where volume is negligible and per-request quality matters more than per-request cost.

**But LLMs are better at exactly what chat is made of** — idiom, slang, ellipsis, sarcasm, and choosing the right pronoun. So I take that quality without paying for it at serving time: **distil the LLM into the hot-pair models**. Use a strong LLM to produce chat-register parallel data, spot-check it with bilingual reviewers, and fine-tune the small models on it. This is the highest-leverage trick in the design.

**Context is not optional.** A message-at-a-time translator gets gender, formality and referents wrong because a six-word message has no disambiguating information — "it was great" cannot be gendered correctly without the previous turn. Feed the **previous 3-5 messages** as context to the encoder. This fixes measurable error classes and costs almost nothing.

**Training data must match the register.** Models trained on parliamentary proceedings and news translate "kk brb" into something formal and wrong. Conversational corpora such as subtitle data, plus mined in-product corrections, are worth more than another million sentences of news.`,
          rubric: [
            String.raw`Tiered the strategy: dedicated models for hot pairs, multilingual or API for the tail`,
            String.raw`Compared per-message cost of an LLM against small NMT with numbers`,
            String.raw`Passed conversation context in and named the error classes it fixes`,
            String.raw`Proposed distilling an LLM teacher into the small hot-pair models`,
            String.raw`Chose conversational training data over news or parliamentary corpora`,
            String.raw`Accepted pivoting through English only for the tail and named its cost`,
          ],
        },
        {
          name: "Serving architecture",
          prompt: String.raw`Design the serving path for 8,500 tiny requests per second. Where does batching help, where does caching, when is streaming a mistake, and what does the client do?`,
          model: String.raw`**Batching, with length bucketing.** The payloads are tiny, so per-request overhead dominates. Dynamic batching with a 5-10 ms collection window multiplies throughput at a latency cost nobody can perceive. Critically, **bucket by source length before batching** — a batch padded to its longest member wastes compute on every short message, and with a median of 6 words and a p95 of 28, naive batching wastes most of the GPU.

**Cache, and expect it to be huge.** Chat is absurdly repetitive: "ok", "thanks", "good morning", "haha", single emoji. Keying on normalized source text plus source and target language should give a **25-40% exact hit rate**, which removes a third of the fleet. Alongside it, skip translation entirely when the detected source equals the target, when the message is only emoji, a URL, or digits, and when the text is too short for language ID to be meaningful.

**Language identification is its own service and its own failure mode.** LID on two words is unreliable, and getting it wrong means translating English into English, which looks broken to the user. Combine the LID score with **priors**: what languages has this user written in, what languages exist in this group. The prior carries the short messages.

**Translate once per target language, not once per recipient**, and store the result with the message. A message in a 200-person group with four languages present is four translations, not two hundred — and because messages are read far more often than they are written, storing the translation instead of recomputing it on each read is a large multiplier.

**Streaming is usually the wrong tool here.** Six-word messages do not need it, and word order is not monotone across languages — a verb-final German source produces a partial English prefix that has to be revised, which reads as flickering. Stream only for long messages, chunked at sentence boundaries.

**Client.** Render the original immediately, request translations lazily **only for messages actually on screen** rather than the whole scrollback, cache locally, and fall back to the on-device model when offline.`,
          rubric: [
            String.raw`Used dynamic batching with length bucketing and named a batching window`,
            String.raw`Cached on normalized source plus language pair with an expected hit rate`,
            String.raw`Skipped translation for same-language, emoji-only or trivial messages`,
            String.raw`Translated once per target language and stored results rather than per recipient`,
            String.raw`Treated language identification as a separate service with user or group priors`,
            String.raw`Argued when streaming helps and noted the word-order revision problem`,
            String.raw`Had the client translate only messages currently on screen`,
          ],
        },
        {
          name: "Quality evaluation",
          prompt: String.raw`How do you measure whether the translations are any good, offline and in production? BLEU is the reflex answer — argue with it, then tell me what you would actually put on the dashboard.`,
          model: String.raw`**Why BLEU is a poor primary metric here.** BLEU scores n-gram overlap against one reference. On six-word chat messages a single legitimate word choice can swing it wildly, there are many correct translations of "see you later", and it is blind to meaning — a translation that inverts a negation can score well. I keep BLEU only for continuity with historical numbers; I do not make decisions on it.

**Primary offline metric: COMET**, a neural metric trained on human judgments, which correlates with human ranking far better than n-gram overlap. The bigger unlock is its **reference-free variant**: quality estimation lets me score *live production traffic* where no reference translation exists, so quality becomes a monitored production signal per language pair rather than a quarterly offline exercise.

**Test sets that look like the product.** 500 chat-style segments per hot pair, with conversation context, sampled from real traffic under the consent rules. Plus **challenge sets** that aggregate scores would hide: pronoun and gender agreement, formality choice, idioms, emoji-adjacent text, and code-switched input. Regressions show up there first.

**Human evaluation for anything that ships.** Bilingual raters do MQM-style error annotation on about 200 segments per pair — errors categorized as accuracy (mistranslation, omission, addition), fluency, or terminology. That tells me *what* broke, which no automatic metric does, and it is what I would use to sign off a model swap.

**Online signals.** The best implicit dissatisfaction signal is **reverting to the original** after reading a translation. Alongside it: explicit "bad translation" reports, reply rate and reply latency in translated threads, and retention of multilingual groups. Headline: share of translated messages where the reader never opened the original.

**Report per pair, never as one average.** Quality between English and Spanish and quality between Indonesian and German are different systems, and a launch gate has to be a per-pair bar.`,
          rubric: [
            String.raw`Criticized BLEU concretely for short conversational text`,
            String.raw`Chose COMET or another neural metric as primary with a stated reason`,
            String.raw`Used reference-free quality estimation to monitor live production traffic`,
            String.raw`Built challenge sets for pronouns, formality, idiom or code-switching`,
            String.raw`Ran human evaluation with MQM-style error categories before shipping`,
            String.raw`Defined an implicit online dissatisfaction signal such as reverting to the original`,
            String.raw`Reported and gated quality per language pair rather than on one average`,
          ],
        },
        {
          name: "Edge cases & fallbacks",
          prompt: String.raw`Real chat is messy. Walk me through code-switching, romanized input, profanity, an unsupported pair, and the model service going down.`,
          model: String.raw`**Code-switching.** "vamos to the party manana" is normal in these markets, and sentence-level NMT mangles it. Detect it from high language-ID entropy and route those messages to the LLM tier, which handles mixed input far better. Also respect that many users *do not want* mixed messages normalized — translate only when the reader's language genuinely differs and confidence is high.

**Romanized input is the failure mode that dominates an India-heavy product.** Hindi typed in Latin script ("kya kar rahe ho") defeats both language ID trained on Devanagari and NMT trained on native script. It needs an explicit transliteration step or training data in romanized form. A candidate who names this without prompting has clearly shipped something.

**Profanity: stay faithful, but never introduce it.** Sanitizing a swear into something polite is a mistranslation and users notice instantly. The asymmetric risk is the other direction — a mistranslation that turns a neutral phrase or somebody's name into a slur. Control: check the output against a target-language slur list, and if a slur appears with no counterpart in the source, fall back to a more literal decode or suppress the translation. That rate is its own monitored metric.

**Preserve what must not change.** Mask named entities, numbers, URLs, at-mentions and emoji before translation and restore them after. A translated phone number is an obvious bug that erodes trust in everything else.

**Unsupported pair.** Pivot through English and mark the result as lower confidence, or decline honestly — "translation is not available for this language". Declining beats confidently emitting garbage.

**Outage.** A fallback chain: dedicated model, then multilingual model, then LLM API, then cache, then simply show the original with a quiet notice. Because stage 1 refused to block delivery on translation, the worst case degrades to *no translation*, not *no chat*.

**One abuse note:** translation is a moderation bypass — write the slur in a low-resource language. Moderation must run on translated or pivoted text, not only on the source.`,
          rubric: [
            String.raw`Detected code-switching and routed it to a model that handles mixed input`,
            String.raw`Named romanized or transliterated input as a distinct failure mode`,
            String.raw`Kept profanity faithful while guarding against introducing slurs`,
            String.raw`Masked and restored entities, numbers, URLs and mentions`,
            String.raw`Gave explicit behaviour for unsupported pairs instead of silent garbage`,
            String.raw`Defined a fallback chain ending in showing the original message`,
            String.raw`Noted that moderation must also inspect translated text`,
          ],
        },
      ],
    },
  );
})();

(function () {
  CourseData.dojoExtras.push(
    {
      id: "xtra-code-assistant",
      title: "Code-completion assistant for an enterprise",
      brief: "Copilot behind a bank's firewall: 200 ms budgets, repo ACLs, and a lawyer in the room.",
      minutes: 35,
      xp: 60,
      scenario: String.raw`Meridian Bank employs **4,200 engineers** across 11 countries working in a 90M-line codebase — Java, Kotlin, Python and TypeScript, plus 6M lines of COBOL that nobody wants to touch and everybody depends on. Security policy is absolute: **source code may not leave the corporate network**, so every third-party SaaS coding assistant has already been rejected.

Leadership has read the vendor claims about large productivity gains and wants an internal Copilot-style completion assistant in the IDE. You have an on-prem cluster of **64 H100 GPUs** shared with other teams, engineers split between IntelliJ and VS Code, and internal network hops that add 20-40 ms to any call. Repository access is not uniform: regulated systems, M&A work and payment infrastructure are restricted to specific teams.

Legal has two hard requirements: no completion may pull copyleft-licensed code into the codebase, and nothing from a repository an engineer cannot read may ever appear in their editor.

You are the AI engineer. Design the assistant end to end.`,
      stages: [
        {
          name: "Requirements & trust model",
          prompt: String.raw`Frame the problem. What is in scope, what latency are you committing to and why that number, and what does "no code leaves the network" actually force in the design — including inside the company?`,
          model: String.raw`**Scope.** Inline completion — grey ghost text at the cursor — is the product. A chat sidebar is a different latency profile and a different eval set; agentic multi-file refactoring is a different product entirely. V1 is completion, v1.5 adds chat, and I say the cut out loud so it is a decision rather than an omission.

**Latency defines the product.** A suggestion that arrives after the developer has typed the next token is worse than no suggestion, because it costs attention and delivers nothing. Target **p95 time-to-first-token under 200 ms** and a full single-line suggestion under 500 ms. Past about half a second, acceptance falls off a cliff — developers simply keep typing. Every later decision, model size included, is subordinate to this number.

**Volume, and a useful realisation.** 4,200 engineers, assume 2,500 active on a given day, 6 coding hours, roughly 45 completion requests per hour after debouncing: about **675k requests/day, 25-40 QPS average, maybe 100 QPS at peak**. That is small. This system is **latency-bound, not throughput-bound**, which is unusual and it changes what to optimize.

**Self-hosting is decided by policy, not economics.** With code unable to leave the network, hosted APIs are out before any cost comparison starts. That is a one-line answer, and the interesting constraint is the internal one.

**Internal permissions are the real trust problem.** Not every engineer may read every repo. Two consequences: retrieval must filter by the **caller's repo ACLs at query time**, and — the part candidates miss — **I will not fine-tune on restricted repositories**. A fine-tune is a lossy copy of its training data; training on payments code and serving the resulting model to everyone launders the access control. Fine-tune only on code the whole audience can already read; reach restricted code exclusively through permission-filtered retrieval.

**Telemetry.** Prompts contain proprietary source. Log metadata and hashes by default, full text only for opt-in engineers into a restricted store with a retention limit.`,
          rubric: [
            String.raw`Set a numeric TTFT target and justified it by developer attention behaviour`,
            String.raw`Estimated request volume and noticed the system is latency-bound, not throughput-bound`,
            String.raw`Derived self-hosting from the policy constraint rather than from cost`,
            String.raw`Required per-repository ACL filtering on retrieval at query time`,
            String.raw`Refused to fine-tune on restricted repos because it launders permissions`,
            String.raw`Defined telemetry that does not log proprietary source by default`,
            String.raw`Scoped v1 to inline completion and cut chat or agentic editing`,
          ],
        },
        {
          name: "Context building",
          prompt: String.raw`The model gets a few thousand tokens of context. What goes into them, in what priority, and how do you assemble that inside a few milliseconds without blowing the latency budget?`,
          model: String.raw`**Fill-in-the-middle, not left-to-right.** The cursor almost always has code after it, and that suffix is the strongest available signal about what the completion must produce — its return type, the closing brace, the next statement. The model must be trained and prompted with FIM sentinels so it sees prefix *and* suffix. A design that sends only the prefix throws away half the information and is the single most common mistake here.

**Context sources, in priority order.**

1. Current file prefix and suffix around the cursor.
2. **Open tabs and recently edited files** — the developer's working set is extraordinarily high signal and costs nothing to collect.
3. **Structural neighbours resolved by the language server**: the definitions of the symbols near the cursor, the imported types, the interface being implemented. For code, structural retrieval beats semantic retrieval — the IDE already knows exactly what type that variable is, so guessing with cosine similarity is strictly worse.
4. Embedding plus lexical retrieval over the wider monorepo, as the fallback for "similar code elsewhere".
5. Repo conventions: lint configuration, a style document.

**Index construction.** Chunk by syntactic unit using a parser — function or class, not fixed 500-token windows that cut a method in half. Prefix every chunk with its file path and enclosing symbol, because in a 90M-line monorepo the path is a strong relevance signal by itself.

**Budget.** With an 8k window: roughly 3k prefix, 1k suffix, 3k retrieved, 1k reserved for generation. Assembly must finish in about 30 ms, so retrieval runs against a warm local index with a **hard timeout: if retrieval is slow, send the request without it.** Degrade context, never latency — a slightly worse suggestion in 180 ms beats a better one in 600 ms that the developer has already typed past.

**COBOL needs its own answer.** Public training data barely exists, so it leans much harder on retrieval and in-context examples, and expectations for it are set lower from day one.`,
          rubric: [
            String.raw`Used fill-in-the-middle with both prefix and suffix rather than prefix only`,
            String.raw`Prioritized open tabs and recently edited files as high-signal context`,
            String.raw`Used language-server or structural symbol resolution, not only embedding search`,
            String.raw`Chunked the index by syntactic unit with file-path headers`,
            String.raw`Gave an explicit token budget split across context sources`,
            String.raw`Enforced a retrieval timeout that drops context instead of missing the latency budget`,
            String.raw`Gave low-resource languages such as COBOL a different context strategy`,
          ],
        },
        {
          name: "Model & latency budget",
          prompt: String.raw`Choose the model and prove the 200 ms budget works on your own hardware. Show where the milliseconds go and which serving tricks you are relying on.`,
          model: String.raw`**Two models, routed.** A 1-3B code model for single-line completions, which are the overwhelming majority of requests, and a 7-15B model for explicitly requested multi-line blocks. A 34B model produces better code and roughly triples decode time — on this budget that trade is unaffordable for inline suggestions, and I would rather spend the quality budget on context and a LoRA.

**Where the milliseconds go, for p95 TTFT of 200 ms:**

~~~text
IDE debounce (deliberate)            40 ms
in-network round trip                25 ms
context assembly + retrieval         30 ms  (hard timeout)
prefill of 4k tokens, 7B on H100     45 ms
first token decode                   10 ms
--------------------------------------------
                                    150 ms   with real headroom
~~~

Then decoding 40 more tokens at 70 tok/s is another 550 ms, which is exactly why single-line is the default and why the suggestion streams.

**The serving tricks that make this work:**

- **Prefix KV caching.** As the developer types, the file prefix is almost identical to the previous request. Reusing that cache cuts prefill dramatically and is the highest-value optimization in the system.
- **Speculative decoding** with a small draft model, worth 2-3x on decode here. Code is unusually predictable — closing braces, boilerplate, repeated identifiers — so draft acceptance rates are high. This is a genuinely better fit than in prose.
- **Continuous batching** in the serving stack, and FP8 quantization.
- **Cancellation.** The IDE must cancel in-flight requests on the next keystroke. Without it, most GPU time is spent generating suggestions nobody will ever see.

**Capacity.** At about 60 ms of GPU time per request and 100 QPS peak, that is roughly 6 GPU-equivalents; with replicas, both model tiers and headroom, **16-24 GPUs** of the 64 available, leaving room for eval and fine-tuning jobs.

**Fine-tuning.** A LoRA on permitted internal code teaches the bank's own APIs and idioms — that in-domain adaptation is where the real gain over a stock public model lives. Keep the base model unmodified so it can be upgraded.`,
          rubric: [
            String.raw`Chose model sizes explicitly justified against the TTFT budget`,
            String.raw`Gave a millisecond breakdown that adds up to the stated target`,
            String.raw`Relied on prefix or KV caching across successive keystrokes`,
            String.raw`Proposed speculative decoding and explained why code suits it`,
            String.raw`Cancelled in-flight requests on new keystrokes to avoid wasted GPU work`,
            String.raw`Sized the GPU fleet from QPS and per-request GPU time`,
            String.raw`Routed single-line and multi-line completions to different model tiers`,
          ],
        },
        {
          name: "Evaluation",
          prompt: String.raw`The CTO has read that assistants deliver 30% more productivity and wants that number for the board. What do you actually measure, offline and online, and how do you keep it honest?`,
          model: String.raw`**Public benchmarks do not answer this question.** HumanEval and MBPP measure synthesising a standalone Python function from a docstring. The product completes partially written code inside an existing 90M-line repository using internal APIs. A model can win on HumanEval and be useless here.

**Build the benchmark from your own git history.** Take real commits, mask a region, ask the model to fill it, and score against what the engineer actually wrote: exact match, an edit-similarity metric, and — the strongest signal — **does it compile and do the repository's own tests still pass**. This benchmark is automatically in-domain, covers internal APIs, includes COBOL, and refreshes itself every week for free.

**Online primary: acceptance rate**, accepted over shown, with a realistic expectation of **20-30%** for inline completion. But acceptance alone is gameable: lower the trigger threshold, show more, watch the raw count rise.

**So the metric that matters is retention.** Do the accepted characters still exist 5 minutes later, and at commit time? An accepted-then-deleted suggestion is *negative* value — the developer read it, tried it, reverted it, and lost the thread. Report **share of assistant-authored characters surviving to commit**, and treat acceptance and retention as a pair.

**On the 30% claim: refuse to fabricate it from acceptance counts.** If leadership wants a productivity number, it needs a **staggered or randomized enablement** across teams with cycle time (PR opened to merged), throughput and rework measured before and after. Say plainly that these metrics are noisy, need months and many teams, and that a vendor's headline number is marketing rather than a measurement of Meridian.

**Counter-metrics.** Review comments per PR, revert rate, incident rate, and test coverage in assistant-heavy files. A tool that increases output and defects is a negative.

**Slice by language, tenure and IDE** — TypeScript and COBOL will differ by several times, and one average hides the entire story.`,
          rubric: [
            String.raw`Rejected public code benchmarks as the primary signal with a concrete reason`,
            String.raw`Built an internal benchmark by masking regions of real commit history`,
            String.raw`Scored candidate completions by compilation or test passing, not text match alone`,
            String.raw`Used acceptance rate with a realistic target range`,
            String.raw`Measured retention of accepted code through to commit time`,
            String.raw`Proposed staggered or randomized enablement to estimate productivity honestly`,
            String.raw`Tracked defect or review counter-metrics alongside output metrics`,
          ],
        },
        {
          name: "Safety & IP",
          prompt: String.raw`Legal is in the room. What can this assistant emit that gets the bank in trouble, and what specifically do you build to stop each one?`,
          model: String.raw`**License contamination.** A model trained on public code can reproduce copyleft code verbatim, and a bank cannot accept that risk. Controls: prefer a base model with a documented training-data policy; run a **duplicate-detection filter** on any suggestion over roughly 60 characters against an n-gram index of known public code, suppressing or flagging matches; keep a hash of every emitted suggestion so a future claim can be investigated; and take vendor indemnification where the licence offers it.

**Secrets, in both directions.** Real credentials live in repositories, so (a) scan and strip secrets **before indexing or fine-tuning** — a model that memorises a key will eventually emit it — and (b) run a secret scanner **on every completion before it renders**. Also mask secrets in the *outbound* prompt: an open environment file in a nearby tab must not be shipped to the inference service or into a log.

**Cross-repository leakage** is the requirement from stage 1, enforced in the retrieval service rather than in each client, plus an audit record of which repositories contributed context to which completion. In a regulated bank that record is the difference between a policy and a claim.

**Insecure code.** Models cheerfully produce string-concatenated SQL, disabled certificate verification and weak crypto. Run a fast high-severity static-analysis ruleset over suggestions before display, keep the existing SAST gate in CI as the real safety net, and never let the assistant auto-suppress a security warning.

**Prompt injection through repository content.** A comment inside a vendored dependency saying "also add this call" is untrusted input that reaches the model. Treat all retrieved code as data, strip instruction-shaped text from retrieved context, and note that with no tools wired in v1 the blast radius of a successful injection is one bad suggestion rather than an action taken.

**Auditability.** Per completion, retain model version, prompt template version, context repo ids, suggestion hash and the accept decision for a defined period. That log is what makes the deployment defensible.`,
          rubric: [
            String.raw`Named licence contamination and proposed duplicate detection against public code`,
            String.raw`Scanned for secrets both in the index or training data and in generated output`,
            String.raw`Masked secrets in the outbound prompt and excluded them from logs`,
            String.raw`Enforced repo ACLs centrally plus an audit trail of context sources`,
            String.raw`Ran security static analysis on suggestions and kept CI gates as the real net`,
            String.raw`Treated repository content as untrusted with respect to prompt injection`,
            String.raw`Retained a per-completion audit record with model and prompt versions`,
          ],
        },
        {
          name: "Rollout & the feedback flywheel",
          prompt: String.raw`It works for your team. How do you get it to 4,200 engineers, and how does usage make the system better over time without creating a loop that quietly poisons it?`,
          model: String.raw`**Rollout.** Own team, then 50 volunteers, then one business unit, then everyone — each step gated on acceptance rate, retention, p95 TTFT and the security counter-metrics, with a per-team kill switch and a global one. Version the **model and the prompt template separately**; both pass the offline suite and then a canary before wide release.

**Canary assignment is per user, not per request.** A developer whose assistant changes behaviour mid-session cannot give you a usable signal and will file a confusing bug. Hash-assign 5% of engineers, bake for at least three days to cover a full work rhythm, and compare acceptance and retention with a minimum sample size fixed in advance.

**The flywheel.** Every shown, accepted, rejected and edited completion, together with the context that produced it, is in-domain preference data of a quality no public dataset can match. Weekly: retrain the **context ranker** on which retrieved chunks actually appeared in accepted completions — this is usually a bigger win than touching the model. Quarterly: refresh the LoRA on accepted code, filtered to what **survived to commit**. Training on accepted-then-deleted suggestions teaches the model to generate plausible garbage, which is the exact failure it already has.

**Three loops to defend against.**

1. **Self-training drift.** As the assistant writes more of the codebase, it starts training on its own output and converges on its own style and its own bugs. Weight human-authored, human-reviewed code higher, and keep a frozen human-only evaluation set that never gets refreshed from generated code.
2. **Exposure bias.** You only observe outcomes for suggestions the trigger threshold chose to show, so the log is censored by the current policy. Keep a small exploration slice that shows sub-threshold suggestions to measure what you are missing.
3. **Goodharting acceptance.** A team measured on acceptance will lower the threshold and flood the editor. Retention is the paired metric that makes that unprofitable.

**Plus a human channel:** a "this was wrong or dangerous" button whose reports are triaged weekly straight into the eval set.`,
          rubric: [
            String.raw`Staged rollout with gating metrics and per-team plus global kill switches`,
            String.raw`Versioned model and prompt template separately, each through a canary`,
            String.raw`Assigned canary traffic per user rather than per request, with a reason`,
            String.raw`Turned accepted completions and their context into training data`,
            String.raw`Filtered flywheel training data on retention rather than acceptance alone`,
            String.raw`Named the self-training drift risk with a concrete mitigation`,
            String.raw`Kept an exploration slice to de-bias the trigger-threshold data`,
          ],
        },
      ],
    },
  );
})();
