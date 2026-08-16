/* ML Quest — Week 4: LLMs & RAG */
(function () {
  const W = {
    num: 4,
    id: "w4",
    emoji: "🧠",
    title: "LLMs & RAG",
    subtitle: "How large models think, shrink, and cite",
    goal: "Reason about LLM internals, adaptation, and retrieval systems like someone who has shipped them.",
    days: [],
    lessons: {},
    quizzes: {},
    exercises: {},
    boss: null,
  };
  CourseData.weeks.push(W);

  // ================= Day 1 =================
  W.days.push({
    id: "w4d1",
    title: "Inside an LLM",
    minutes: 124,
    blocks: [
      { type: "lesson",   id: "w4d1-lesson", minutes: 25 },
      { type: "quiz",     id: "w4d1-quiz",   minutes: 12 },
      { type: "exercise", id: "w4d1-e1",     minutes: 25 },
      { type: "exercise", id: "w4d1-e2",     minutes: 32 },
      { type: "exercise", id: "w4d1-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "llm", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w4d1-lesson"] = {
    title: "Inside an LLM",
    md: String.raw`"Explain what happens when I call the API with a prompt" is the LLM interview's opening handshake. The candidates who wave their hands about "AI magic" get filed under *user*; the ones who narrate tokens, logits, a sampling step, and a growing KV cache get filed under *engineer*. This day is that narration, made concrete.

### The generation loop

A modern chat model is a **decoder-only transformer**: it eats a sequence of token ids and emits a probability distribution over the *next* token. Generation is that one step, run in a loop:

~~~text
prompt -> tokenize -> [ids]
loop:
  ids -> model -> logits over the whole vocab (~32k-128k numbers)
  logits -> (temperature, top-k, top-p) -> pick one token id
  append the id to the sequence
  stop if the id is the EOS token or a stop sequence matched
detokenize the appended ids -> text
~~~

Two facts fall out immediately. First, the model does not "plan a sentence" — it commits **one token at a time**, and every token is conditioned on everything before it. Second, output is *serial*: token N+1 cannot start until token N exists. That is why time-to-first-token and tokens-per-second are separate metrics, and why streaming exists.

### Context window economics

The **context window** is the maximum number of tokens (prompt + generation) the model can attend to — 8k, 128k, or 1M depending on the model. It is a hard budget you spend on system prompt, chat history, retrieved documents, and the answer. Two rules of thumb worth memorizing: roughly **1 token ~ 4 characters ~ 0.75 English words**, and cost scales with tokens *in both directions*. A 100k-token context is not free just because the model advertises it — attention is the reason.

### The KV cache: why it exists and what it costs

Self-attention lets each new token look back at every previous token by comparing a **query** against the **key** of each past token and mixing in that token's **value**. Naively, generating token N would recompute the keys and values of all N-1 earlier tokens every step — quadratic wasted work. The fix is the **KV cache**: after a token is processed, its per-layer key and value vectors are stored and reused forever.

With the cache, each new token computes its own Q, K, V once, then attends over the cached K/V of the past. So per-token work is **O(n)** in sequence length (one new query against n cached keys), and total generation is O(n^2) — but you never recompute a key twice. The price is memory. The cache size is:

~~~text
kv_bytes = 2 * n_layers * n_heads * head_dim * seq_len * bytes_per_elem
           ^-- K and V
~~~

Plug in Llama-2-7B (32 layers, 32 heads, head_dim 128) at seq_len 4096 in fp16 (2 bytes): 2*32*32*128*4096*2 = 2.1 GB — for **one** sequence. Batch 10 requests and the KV cache alone can dwarf the weights. This is the single biggest reason long-context serving is expensive, and why tricks like grouped-query attention (fewer K/V heads) and paged attention (vLLM) exist.

### Sampling: turning logits into a token

Raw logits are unnormalized scores. How you collapse them to one token is the knob users actually feel:

~~~python
# temperature: divide logits BEFORE softmax
probs = softmax(logits / T)   # T<1 sharpens, T>1 flattens, T->0 -> greedy
~~~

- **Greedy** (~argmax~): always the top token. Repetitive, but reproducible.
- **Temperature** ~T~: scales logits by ~1/T~. Low T is conservative, high T is creative-to-unhinged.
- **Top-k**: keep only the k highest-logit tokens, renormalize, sample. Caps the tail.
- **Top-p (nucleus)**: keep the *smallest* set of tokens whose cumulative probability reaches ~p~ (e.g. 0.9), renormalize, sample. Adapts the cutoff to how peaked the distribution is.
- **Repetition penalty**: divide the logits of already-seen tokens by a factor > 1 so the model stops looping.
- **Stop sequences**: strings that end generation the moment they appear (a closing ~</answer>~ tag, a newline).

A subtle interview favorite: **temperature 0 is not perfectly deterministic across providers.** Greedy decoding is deterministic *given identical logits*, but production stacks batch your request with others, and floating-point reductions (matmuls, all-reduces) are not associative — sum order changes with batch shape, nudging a logit, occasionally flipping the argmax. Same math, different token.

### ⚠️ Common pitfalls

- Thinking the model generates whole sentences at once — it is strictly one token per forward pass.
- Forgetting the KV cache grows *linearly with every generated token*; OOM at long context is a cache problem, not a weights problem.
- Applying temperature *after* softmax. Temperature scales **logits**, before the softmax, or the math is wrong.
- Treating a 128k window as free headroom — you pay for every token in latency and money.
- Assuming ~temperature=0~ guarantees identical outputs across runs or providers.

### 🎤 In interviews, they ask

- "Walk me through what happens between my prompt and the first streamed token."
- "What exactly is stored in the KV cache, and how big does it get?"
- "Explain top-k vs top-p. When would you prefer nucleus sampling?"
- "Why can two calls with temperature 0 return different text?"
- "Your long-context endpoint OOMs under load but the model fits in memory. Diagnose it."

### TL;DR

- An LLM is a next-token predictor run in a loop: logits -> sample -> append -> repeat until EOS/stop.
- The context window is a shared token budget for prompt, history, retrieval, and answer.
- The KV cache trades memory for speed: per-token work stays O(n), cache size = 2 * layers * heads * head_dim * seq * bytes.
- Temperature scales logits before softmax; top-k caps the tail by count, top-p (nucleus) caps it by cumulative mass.
- Temperature 0 is greedy, not bit-reproducible — batching plus float non-associativity can flip a token.

### Go deeper

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
- [vLLM docs — paged attention & KV cache](https://docs.vllm.ai)
- [Hugging Face LLM course](https://huggingface.co/learn)`,
  };

  W.quizzes["w4d1-quiz"] = [
    {
      q: String.raw`During autoregressive generation with a KV cache, what does the model store after processing each token?`,
      options: [
        "The full logit vector over the vocabulary for that token",
        "The key and value vectors of that token at every layer",
        "The sampled token's embedding only",
        "The attention softmax weights for later reuse",
      ],
      answer: 1,
      explain: String.raw`The KV cache holds the per-layer key and value projections of every past token so attention never recomputes them. Logits are consumed immediately to pick a token and are not cached; the query is recomputed fresh each step against the cached keys.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
rng = np.random.default_rng(0)
logits = np.array([0.0, 0.0, 50.0])
def softmax(z):
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()
p = softmax(logits)
print(int(rng.choice(3, p=p)))
~~~`,
      options: [
        "It varies from run to run",
        "0",
        "1",
        "2",
      ],
      answer: 3,
      explain: String.raw`softmax([0, 0, 50]) is essentially [0, 0, 1] — the mass collapses onto index 2, so sampling returns 2 no matter the RNG state. A sufficiently peaked distribution makes even a "random" sampler deterministic; this is why low temperature looks greedy.`,
    },
    {
      q: String.raw`Why is top-p (nucleus) sampling often preferred over a fixed top-k?`,
      options: [
        "It is cheaper because it never sorts the logits",
        "It guarantees the single most likely token is always chosen",
        "Its cutoff adapts to the shape of the distribution instead of a fixed count",
        "It removes the need for a temperature parameter",
      ],
      answer: 2,
      explain: String.raw`Top-k always keeps exactly k tokens, which is too many when the model is confident and too few when it is unsure. Top-p keeps the smallest set whose cumulative probability reaches p, so a peaked distribution keeps 1-2 tokens and a flat one keeps many. Both still sort; neither replaces temperature.`,
    },
    {
      q: String.raw`A Llama-style model has 32 layers, 32 heads, and head_dim 128. Roughly how does its fp16 KV cache change if you double the sequence length from 4k to 8k?`,
      options: [
        "It doubles",
        "It quadruples",
        "It stays the same; only weights depend on length",
        "It grows by the square of the length",
      ],
      answer: 0,
      explain: String.raw`Cache size = 2 * layers * heads * head_dim * seq_len * bytes, which is linear in seq_len. Doubling the sequence doubles the cache. The quadratic cost in transformers is compute (attention over all past tokens), not the KV storage itself.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
logits = np.array([1.0, 2.0, 3.0, 4.0])
k = 2
idx = np.argsort(logits)[-k:]
mask = np.full(4, -np.inf)
mask[idx] = logits[idx]
e = np.exp(mask - mask.max())
p = e / e.sum()
print(int(np.count_nonzero(p > 1e-9)))
~~~`,
      options: [
        "2",
        "4",
        "1",
        "3",
      ],
      answer: 0,
      explain: String.raw`argsort(logits)[-2:] selects the indices of the two largest logits (3.0 and 4.0). Everything else is set to -inf, whose exp is 0, so exactly two probabilities survive renormalization. That is precisely what a top-k filter does: keep k, zero the rest.`,
    },
    {
      q: String.raw`Two API calls with temperature=0 and the same prompt sometimes return different text. What is the most accurate explanation?`,
      options: [
        "temperature=0 still injects a little randomness by design",
        "Server-side batching plus non-associative floating-point can flip the argmax",
        "The model retrains between requests",
        "The tokenizer is nondeterministic",
      ],
      answer: 1,
      explain: String.raw`Greedy decoding is deterministic only if the logits are bit-identical. In production your request is batched with others, and float reductions in matmuls/all-reduces depend on order and batch shape, so a logit can shift enough to change the top token. The tokenizer is deterministic; the model is not retraining.`,
    },
    {
      q: String.raw`Your long-context endpoint OOMs under load, yet the model weights comfortably fit in GPU memory. What is the most likely cause?`,
      options: [
        "The optimizer state is loaded at inference time",
        "The tokenizer vocabulary is too large",
        "The KV cache across concurrent long sequences exceeds free memory",
        "Gradient buffers are being allocated during generation",
      ],
      answer: 2,
      explain: String.raw`At inference there is no optimizer state or gradient buffer. The variable, per-request cost is the KV cache, which grows with layers, heads, and sequence length for every concurrent request — long contexts times high concurrency can exceed the memory left after the weights. This motivates paged attention and grouped-query attention.`,
    },
  ];

  W.exercises["w4d1-e1"] = {
    title: "Temperature, greedy, and sampling",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "Build the three primitives every decoder uses to turn logits into a token.",
    description: String.raw`Implement the sampling core of a decoder. Given a 1-D array of ~logits~ (raw scores over the vocabulary), you turn them into a chosen token id.

**1. ~apply_temperature(logits, T)~** — return ~logits / T~ as a float array. Temperature scales logits *before* any softmax: ~T < 1~ sharpens, ~T > 1~ flattens. Raise ~ValueError~ if ~T <= 0~ (temperature 0 means greedy, handled separately).

**2. ~greedy_pick(logits)~** — return the index of the largest logit as a Python ~int~ (this is ~argmax~).

**3. ~sample_from(logits, rng)~** — convert logits to probabilities with a **numerically stable softmax** (subtract the max before ~exp~), then draw one index with ~rng.choice(len(probs), p=probs)~. ~rng~ is a ~numpy.random.Generator~. Return a Python ~int~.

~~~python
apply_temperature(np.array([2.0, 4.0]), 2.0)   # array([1., 2.])
greedy_pick(np.array([1.0, 3.0, 2.0]))          # 1
rng = np.random.default_rng(0)
sample_from(np.array([0.0, 0.0, 50.0]), rng)    # always 2 (mass collapses there)
~~~

Constraints: numpy only, no loops needed. Softmax must not overflow even for logits like 1000.

Interview angle: "write me temperature sampling from logits" is a standard 15-minute LLM screen. The tell of someone who has shipped it is the stable softmax (max-subtraction) and knowing that temperature divides the *logits*, not the probabilities.`,
    starter: String.raw`import numpy as np


def apply_temperature(logits, T):
    """Return logits / T (a float array). Raise ValueError if T <= 0."""
    raise NotImplementedError


def greedy_pick(logits):
    """Return the argmax index as a Python int."""
    raise NotImplementedError


def sample_from(logits, rng):
    """Stable softmax over logits, then sample one index with rng.choice.
    rng is a numpy.random.Generator. Return a Python int."""
    raise NotImplementedError`,
    hints: [
      String.raw`apply_temperature is one line once you guard T: convert with np.asarray(logits, dtype=float) and divide. Greedy is int(np.argmax(...)).`,
      String.raw`A stable softmax subtracts the max first: z = logits - logits.max(); e = np.exp(z); probs = e / e.sum(). Subtracting the max cannot change the result (softmax is shift-invariant) but stops exp from overflowing.`,
      String.raw`Draw the token with int(rng.choice(len(probs), p=probs)). Because probs sums to 1, choice interprets it as a categorical distribution.`,
    ],
    solution: String.raw`import numpy as np


def apply_temperature(logits, T):
    logits = np.asarray(logits, dtype=float)
    if T <= 0:
        raise ValueError("temperature must be > 0")
    return logits / T


def greedy_pick(logits):
    return int(np.argmax(np.asarray(logits)))


def _softmax(logits):
    z = np.asarray(logits, dtype=float)
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def sample_from(logits, rng):
    probs = _softmax(logits)
    return int(rng.choice(len(probs), p=probs))`,
    tests: [
      {
        name: "temperature scales logits and rejects T<=0",
        code: String.raw`import numpy as np
assert np.allclose(apply_temperature(np.array([2.0, 4.0]), 2.0), [1.0, 2.0])
assert np.allclose(apply_temperature(np.array([2.0, 4.0]), 0.5), [4.0, 8.0])
for bad in (0.0, -1.0):
    try:
        apply_temperature(np.array([1.0]), bad)
        assert False, "T<=0 must raise ValueError"
    except ValueError:
        pass`,
      },
      {
        name: "greedy_pick returns the argmax index as int",
        code: String.raw`import numpy as np
out = greedy_pick(np.array([1.0, 3.0, 2.0]))
assert out == 1 and isinstance(out, int), f"expected int 1, got {out!r}"`,
      },
      {
        name: "sample_from collapses onto a peaked distribution",
        code: String.raw`import numpy as np
rng = np.random.default_rng(0)
for _ in range(50):
    assert sample_from(np.array([0.0, 0.0, 50.0]), rng) == 2`,
      },
      {
        name: "sample_from is reproducible for a fixed seed",
        code: String.raw`import numpy as np
logits = np.array([0.5, 0.2, 0.9, 0.1])
a = sample_from(logits, np.random.default_rng(7))
b = sample_from(logits, np.random.default_rng(7))
assert a == b, f"same seed must give same draw, got {a} vs {b}"`,
      },
      {
        name: "sample_from covers all classes under a uniform distribution",
        code: String.raw`import numpy as np
from collections import Counter
rng = np.random.default_rng(1)
counts = Counter(sample_from(np.array([0.0, 0.0, 0.0, 0.0]), rng) for _ in range(8000))
assert all(counts[i] > 1500 for i in range(4)), f"uneven coverage: {dict(counts)}"`,
      },
      {
        name: "softmax stays finite for huge logits (no overflow)",
        code: String.raw`import numpy as np
rng = np.random.default_rng(2)
tok = sample_from(np.array([1000.0, 999.0, -1000.0]), rng)
assert tok in (0, 1), f"expected 0 or 1, got {tok}"`,
      },
      {
        name: "higher temperature flattens the distribution",
        code: String.raw`import numpy as np
def sm(z):
    z = z - z.max(); e = np.exp(z); return e / e.sum()
low = sm(apply_temperature(np.array([0.0, 5.0]), 1.0))
high = sm(apply_temperature(np.array([0.0, 5.0]), 100.0))
assert abs(high[0] - high[1]) < abs(low[0] - low[1]), "high T should be more uniform"`,
      },
    ],
  };

  W.exercises["w4d1-e2"] = {
    title: "Top-k and top-p (nucleus) filtering",
    difficulty: 3,
    xp: 40,
    minutes: 32,
    packages: ["numpy"],
    brief: "Implement the two truncation samplers every serious decoder ships with.",
    description: String.raw`Truncation samplers throw away the unreliable tail of the distribution before sampling. You implement both.

**1. ~top_k_filter(logits, k)~** — keep only the ~k~ highest-logit tokens, drop the rest, and return a **renormalized probability distribution** (same length as ~logits~) whose kept entries softmax to 1 and whose dropped entries are exactly 0. Raise ~ValueError~ if ~k <= 0~; if ~k~ exceeds the vocabulary, keep everything.

**2. ~top_p_filter(probs, p)~** — ~probs~ is already a probability distribution. Keep the **smallest set of tokens whose cumulative probability reaches ~p~** (the nucleus), including the boundary token that crosses ~p~, zero out the rest, and return the renormalized distribution. Raise ~ValueError~ unless ~0 < p <= 1~.

The boundary rule is the whole exercise. For ~probs = [0.5, 0.3, 0.2]~ and ~p = 0.8~: 0.5 alone is not enough, 0.5 + 0.3 = 0.8 reaches ~p~, so you keep the first **two** tokens (0.5 and the boundary 0.3) and drop 0.2.

~~~python
top_k_filter(np.array([1.0, 2.0, 3.0, 4.0]), 2)   # [0, 0, p2, p3], sums to 1
top_p_filter(np.array([0.5, 0.3, 0.2]), 0.8)      # [0.625, 0.375, 0.0]
top_p_filter(np.array([0.5, 0.3, 0.2]), 0.5)      # [1.0, 0.0, 0.0]
~~~

Constraints: numpy only. Sort once, be careful with the inclusive boundary, and guard against floating-point making the cutoff off by one.

Interview angle: nucleus sampling is the default in most APIs, and "keep the boundary token or not?" is exactly the off-by-one that separates a correct implementation from a plausible-looking wrong one.`,
    starter: String.raw`import numpy as np


def top_k_filter(logits, k):
    """Keep the k largest logits, zero the rest, return renormalized probs.
    Raise ValueError if k <= 0. If k > len(logits), keep everything."""
    raise NotImplementedError


def top_p_filter(probs, p):
    """Keep the smallest nucleus whose cumulative prob reaches p (boundary
    token included), zero the rest, return renormalized probs.
    Raise ValueError unless 0 < p <= 1."""
    raise NotImplementedError`,
    hints: [
      String.raw`For top_k: find the kept indices with np.argsort(logits)[-k:], build a boolean mask, replace non-kept logits with -np.inf, then run a stable softmax. exp(-inf) is 0, so dropped tokens vanish automatically.`,
      String.raw`For top_p: sort the probabilities descending (np.argsort(probs)[::-1]) and take the cumulative sum. The number to keep is (how many cumulative values are still below p) + 1 — the +1 is the boundary token that crosses the threshold.`,
      String.raw`Guard the boundary with a tiny epsilon: n_keep = int(np.sum(cum < p - 1e-9)) + 1. Comparing against p - 1e-9 stops floating-point rounding from keeping one token too many. Then mask, zero the rest, and divide by the kept sum.`,
    ],
    solution: String.raw`import numpy as np


def top_k_filter(logits, k):
    logits = np.asarray(logits, dtype=float)
    if k <= 0:
        raise ValueError("k must be >= 1")
    k = min(k, logits.size)
    keep = np.argsort(logits)[-k:]
    mask = np.zeros(logits.shape, dtype=bool)
    mask[keep] = True
    masked = np.where(mask, logits, -np.inf)
    z = masked - masked.max()
    e = np.exp(z)
    return e / e.sum()


def top_p_filter(probs, p):
    probs = np.asarray(probs, dtype=float)
    if not (0 < p <= 1):
        raise ValueError("p must be in (0, 1]")
    order = np.argsort(probs)[::-1]
    sorted_p = probs[order]
    cum = np.cumsum(sorted_p)
    n_keep = int(np.sum(cum < p - 1e-9)) + 1
    n_keep = min(n_keep, probs.size)
    keep = order[:n_keep]
    mask = np.zeros(probs.shape, dtype=bool)
    mask[keep] = True
    kept = np.where(mask, probs, 0.0)
    return kept / kept.sum()`,
    tests: [
      {
        name: "top_k keeps exactly k tokens and renormalizes",
        code: String.raw`import numpy as np
out = top_k_filter(np.array([1.0, 2.0, 3.0, 4.0]), 2)
assert out[0] == 0.0 and out[1] == 0.0, f"tail must be zero, got {out}"
assert out[2] > 0 and out[3] > 0
assert abs(out.sum() - 1.0) < 1e-9, f"must renormalize, sum={out.sum()}"`,
      },
      {
        name: "top_k with k=1 is a one-hot at the argmax",
        code: String.raw`import numpy as np
out = top_k_filter(np.array([1.0, 5.0, 2.0]), 1)
assert np.allclose(out, [0.0, 1.0, 0.0]), f"got {out}"`,
      },
      {
        name: "top_k does not overflow for extreme logits and guards k<=0",
        code: String.raw`import numpy as np
out = top_k_filter(np.array([1000.0, 999.0, -1000.0]), 2)
assert np.isfinite(out).all() and abs(out.sum() - 1.0) < 1e-9
try:
    top_k_filter(np.array([1.0, 2.0]), 0)
    assert False, "k<=0 must raise"
except ValueError:
    pass`,
      },
      {
        name: "top_p keeps the boundary token that crosses p",
        code: String.raw`import numpy as np
out = top_p_filter(np.array([0.5, 0.3, 0.2]), 0.8)
assert out[2] == 0.0, f"0.2 token must be dropped, got {out}"
assert out[0] > 0 and out[1] > 0, "boundary token 0.3 must be KEPT"
assert abs(out[0] - 0.625) < 1e-9 and abs(out[1] - 0.375) < 1e-9, f"got {out}"`,
      },
      {
        name: "top_p keeps the minimal nucleus (no off-by-one)",
        code: String.raw`import numpy as np
one = top_p_filter(np.array([0.5, 0.3, 0.2]), 0.5)
assert np.allclose(one, [1.0, 0.0, 0.0]), f"p=0.5 needs only the 0.5 token, got {one}"
two = top_p_filter(np.array([0.5, 0.3, 0.2]), 0.51)
assert np.count_nonzero(two) == 2, f"p just above 0.5 needs two tokens, got {two}"`,
      },
      {
        name: "top_p with p=1 keeps every token",
        code: String.raw`import numpy as np
out = top_p_filter(np.array([0.5, 0.3, 0.2]), 1.0)
assert np.count_nonzero(out) == 3 and abs(out.sum() - 1.0) < 1e-9`,
      },
      {
        name: "top_p rejects p outside (0, 1]",
        code: String.raw`import numpy as np
for bad in (0.0, -0.1, 1.5):
    try:
        top_p_filter(np.array([0.5, 0.5]), bad)
        assert False, "must raise for p outside (0,1]"
    except ValueError:
        pass`,
      },
    ],
  };

  W.exercises["w4d1-e3"] = {
    title: "Sizing the KV cache",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Turn the KV-cache formula into a memory number you can defend in an interview.",
    description: String.raw`When someone asks "why does long-context serving cost so much?", you answer with a number. Implement the KV-cache size formula.

**~kv_cache_mb(layers, heads, head_dim, seq_len, dtype_bytes)~** — return the size of the key/value cache for **one** sequence, in mebibytes (MiB, i.e. bytes / (1024 * 1024)). The cache stores both a key and a value tensor per layer:

~~~text
kv_bytes = 2 * layers * heads * head_dim * seq_len * dtype_bytes
kv_MiB   = kv_bytes / (1024 * 1024)
~~~

Worked example (Llama-2-7B): ~layers=32~, ~heads=32~, ~head_dim=128~, ~seq_len=4096~, fp16 so ~dtype_bytes=2~:

~~~text
2 * 32 * 32 * 128 * 4096 * 2 = 2,147,483,648 bytes = 2048.0 MiB = 2 GiB (one sequence!)
~~~

Constraints: pure arithmetic, no imports. Return a float.

Interview angle: this one formula explains why batch size is capped, why grouped-query attention (fewer K/V heads) exists, and why vLLM's paged attention was a big deal. Being able to produce "about 2 GB per 4k sequence" on the whiteboard is the flex.`,
    starter: String.raw`def kv_cache_mb(layers, heads, head_dim, seq_len, dtype_bytes):
    """Return the KV-cache size for one sequence in MiB (bytes / 1024**2)."""
    raise NotImplementedError`,
    hints: [
      String.raw`The factor of 2 is because you cache both K and V. Multiply all the dimensions together with that 2.`,
      String.raw`MiB means divide the byte count by 1024 * 1024, not 1000 * 1000. Return the result as a float.`,
    ],
    solution: String.raw`def kv_cache_mb(layers, heads, head_dim, seq_len, dtype_bytes):
    total_bytes = 2 * layers * heads * head_dim * seq_len * dtype_bytes
    return total_bytes / (1024 * 1024)`,
    tests: [
      {
        name: "matches the Llama-2-7B worked example (2048 MiB)",
        code: String.raw`got = kv_cache_mb(32, 32, 128, 4096, 2)
assert abs(got - 2048.0) < 1e-6, f"expected 2048.0, got {got}"`,
      },
      {
        name: "doubling the sequence length doubles the cache",
        code: String.raw`a = kv_cache_mb(32, 32, 128, 4096, 2)
b = kv_cache_mb(32, 32, 128, 8192, 2)
assert abs(b - 2 * a) < 1e-6, f"expected linear growth, got {a} then {b}"`,
      },
      {
        name: "int8 (1 byte) halves the fp16 cache",
        code: String.raw`fp16 = kv_cache_mb(32, 32, 128, 4096, 2)
int8 = kv_cache_mb(32, 32, 128, 4096, 1)
assert abs(int8 - fp16 / 2) < 1e-6, f"got {int8} vs {fp16}"`,
      },
      {
        name: "tiny config gives the exact byte fraction",
        code: String.raw`got = kv_cache_mb(1, 1, 1, 1, 1)
assert abs(got - 2 / (1024 * 1024)) < 1e-12, f"got {got}"`,
      },
    ],
  };

  // ================= Day 2 =================
  W.days.push({
    id: "w4d2",
    title: "How LLMs Are Made (and Shrunk)",
    minutes: 124,
    blocks: [
      { type: "lesson",   id: "w4d2-lesson", minutes: 25 },
      { type: "quiz",     id: "w4d2-quiz",   minutes: 12 },
      { type: "exercise", id: "w4d2-e1",     minutes: 25 },
      { type: "exercise", id: "w4d2-e2",     minutes: 32 },
      { type: "exercise", id: "w4d2-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "llm", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w4d2-lesson"] = {
    title: "How LLMs Are Made (and Shrunk)",
    md: String.raw`"How would you adapt a base model to our domain on one GPU?" is where the LLM-engineer interview gets real. The winning answer is a pipeline — pretrain, fine-tune, align — plus two efficiency stories, LoRA and quantization, told with actual parameter and byte counts. Vocabulary alone does not pass; math does.

### The training pipeline

A chat model is built in stages, each cheaper and more targeted than the last:

~~~text
1. Pretraining   next-token prediction on trillions of tokens of raw text.
                 This is the expensive part (millions of GPU-hours). Output: a
                 base model that completes text but does not follow instructions.
2. SFT           supervised fine-tuning on (instruction, good answer) pairs.
                 Teaches the format of being helpful. Thousands to millions of pairs.
3. Alignment     RLHF or DPO on preference data to make it helpful/harmless/honest.
~~~

**RLHF** (reinforcement learning from human feedback) trains a separate *reward model* on human "A is better than B" comparisons, then optimizes the LLM against that reward with PPO. Powerful, but a fiddly multi-model loop. **DPO** (direct preference optimization) skips the reward model and PPO: it turns the same preference pairs into a single classification-style loss that directly raises the probability of the preferred answer and lowers the rejected one. Simpler, more stable, and now the common default.

### LoRA: fine-tune 0.3% of the weights

Full fine-tuning updates every weight — for a 7B model that is 7B trainable parameters plus optimizer state, easily 60+ GB. **LoRA** (Low-Rank Adaptation) freezes the base weights and learns a tiny low-rank update beside each targeted matrix. For a weight ~W~ of shape ~(d_in, d_out)~, LoRA adds ~W + A @ B~ where ~A~ is ~(d_in, r)~ and ~B~ is ~(r, d_out)~ with rank ~r~ tiny (8, 16, 64):

~~~text
trainable(one adapter) = d_in*r + r*d_out = r * (d_in + d_out)
example: d=4096, r=8  ->  8 * (4096 + 4096) = 65,536 params
full matrix            ->  4096 * 4096       = 16,777,216 params
that adapter is 0.39% of the matrix -> ~256x fewer trainable params
~~~

Adapters usually attach to the attention projections (~q_proj~, ~v_proj~, sometimes ~k_proj~/~o_proj~) and often the MLP. Because the base is frozen, you store only the megabytes of adapter weights, swap adapters per task, and merge them back at inference for zero latency cost. LoRA is one of a **PEFT** (parameter-efficient fine-tuning) family that includes prefix tuning, prompt tuning, and (IA)^3 — LoRA just won on simplicity and quality.

### Quantization: fewer bits per weight

Weights ship in fp32/fp16/bf16 (4 or 2 bytes). **Quantization** stores them in int8 or int4 to cut memory and bandwidth. The simplest scheme is **symmetric absmax**: pick one scale so the largest-magnitude weight maps to the edge of the integer range.

~~~text
scale = max(|w|) / 127               # int8 range is [-127, 127]
q     = round(w / scale)             # small integers
w_hat = q * scale                    # dequantized approximation
~~~

Round-trip error per weight is at most ~scale/2~ — half a quantization step. Two ways to do it: **PTQ** (post-training quantization) quantizes an already-trained model, sometimes with a small calibration set (GPTQ, AWQ); **QAT** (quantization-aware training) simulates the rounding during training so the model learns to be robust — more accurate, more expensive. In practice you meet ~bitsandbytes~ for on-the-fly int8/int4, GPTQ/AWQ for calibrated 4-bit, and **GGUF** files for ~llama.cpp~ CPU/edge inference. **QLoRA** is the killer combo: load the base in 4-bit, train LoRA adapters in fp16 on top — a 65B model fine-tunes on a single 48 GB GPU.

### ⚠️ Common pitfalls

- Saying "LoRA updates all the weights" — it freezes the base and trains only the low-rank ~A~ and ~B~ matrices.
- Confusing rank ~r~ with a layer count; ~r~ is the inner dimension of the adapter, typically 8-64.
- Believing quantization is free — int4 saves ~4x memory but costs some accuracy; calibration (GPTQ/AWQ) exists to limit the damage.
- Quantizing with a per-tensor scale when outliers are large; a single absmax scale wastes range on one spike (per-channel scales help).
- Thinking QLoRA quantizes the adapters — the *base* is 4-bit, the LoRA adapters stay in higher precision.

### 🎤 In interviews, they ask

- "Full fine-tuning vs LoRA vs prompting — how do you choose?"
- "Roughly how many trainable parameters does LoRA add to a 4096-wide attention layer at r=8?"
- "Explain symmetric int8 quantization. What is the scale, and what is the worst-case error?"
- "What is QLoRA, and why does it fit a 65B model on one GPU?"
- "RLHF vs DPO — what does DPO remove, and why is that nice?"

### TL;DR

- Base models learn next-token prediction; SFT teaches instruction-following; RLHF/DPO align to human preferences.
- DPO drops the reward model and PPO, optimizing preferences with a single stable loss.
- LoRA freezes the base and trains ~A(d_in,r)~ and ~B(r,d_out)~: r*(d_in+d_out) params, often <1% of the matrix.
- Symmetric int8: scale = max|w|/127, dequant = q*scale, worst-case error scale/2.
- QLoRA = 4-bit frozen base + fp16 LoRA adapters, the standard one-GPU fine-tuning recipe.

### Go deeper

- [LoRA paper (arXiv 2106.09685)](https://arxiv.org/abs/2106.09685)
- [Hugging Face LLM course — fine-tuning & PEFT](https://huggingface.co/learn)
- [sebastianraschka.com — LLM training and LoRA notes](https://sebastianraschka.com)`,
  };

  W.quizzes["w4d2-quiz"] = [
    {
      q: String.raw`What does LoRA actually train?`,
      options: [
        "Every weight of the base model, but at a lower learning rate",
        "A quantized 4-bit copy of the full model",
        "Only the token embedding table",
        "Two small low-rank matrices A and B beside frozen base weights",
      ],
      answer: 3,
      explain: String.raw`LoRA freezes the pretrained weights and learns a low-rank update A @ B (shapes (d_in, r) and (r, d_out)) added to targeted matrices. The base never updates, which is why LoRA is cheap to train and store. Quantizing the base is a separate idea (that combination is QLoRA).`,
    },
    {
      q: String.raw`What does this print?

~~~python
d_in, d_out, r = 4096, 4096, 8
trainable = r * (d_in + d_out)
full = d_in * d_out
print(round(100 * trainable / full, 2))
~~~`,
      options: [
        "0.39",
        "3.9",
        "12.5",
        "50.0",
      ],
      answer: 0,
      explain: String.raw`trainable = 8 * 8192 = 65,536 and full = 4096 * 4096 = 16,777,216, so the ratio is 0.0039, or 0.39%. That is the headline LoRA number: a rank-8 adapter on a 4096-wide matrix trains well under one percent of its parameters.`,
    },
    {
      q: String.raw`In symmetric absmax int8 quantization, what is the scale?`,
      options: [
        "The mean of the weights divided by 255",
        "The standard deviation of the weights",
        "Always 1/256 regardless of the weights",
        "max(|w|) / 127, so the largest-magnitude weight maps to the range edge",
      ],
      answer: 3,
      explain: String.raw`Symmetric quantization uses one scale = max(|w|) / 127 so the biggest-magnitude weight lands at +/-127 and zero stays zero. Dequantizing is q * scale, and the worst-case per-weight error is half a step, scale/2. It is symmetric because the range is centered on zero.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
w = np.array([-2.0, 0.5, 1.0])
scale = np.abs(w).max() / 127
q = np.round(w / scale).astype(np.int8)
print(int(q[0]))
~~~`,
      options: [
        "-128",
        "-2",
        "-127",
        "-100",
      ],
      answer: 2,
      explain: String.raw`max(|w|) is 2.0, so scale = 2/127 and w[0]/scale = -2 / (2/127) = -127. The largest-magnitude weight always maps to the edge of the symmetric range, which is -127 (not -128 — symmetric int8 deliberately leaves -128 unused so zero stays exact).`,
    },
    {
      q: String.raw`Why is DPO often preferred over classic RLHF?`,
      options: [
        "It drops the separate reward model and PPO loop for a single stable loss",
        "It needs no preference data at all",
        "It trains the model with no gradient updates",
        "It only works on base models before SFT",
      ],
      answer: 0,
      explain: String.raw`DPO reuses the same (preferred, rejected) preference pairs but reformulates alignment as one classification-style loss, eliminating the separate reward model and the finicky PPO reinforcement loop. Fewer moving parts means more stable, cheaper training. It still needs preference data.`,
    },
    {
      q: String.raw`What is QLoRA?`,
      options: [
        "LoRA adapters quantized to 4 bits, base left in fp16",
        "Quantization-aware training of the entire model",
        "A 4-bit frozen base model with fp16 LoRA adapters trained on top",
        "A method that removes the need for fine-tuning entirely",
      ],
      answer: 2,
      explain: String.raw`QLoRA loads the base model in 4-bit (frozen) and trains standard LoRA adapters in higher precision on top, so gradients flow only through the small adapters. That is what lets a 65B model be fine-tuned on a single 48 GB GPU. The adapters are not the quantized part — the base is.`,
    },
    {
      q: String.raw`You must fine-tune a 7B model to your support-ticket style on a single 24 GB GPU. Which approach fits best?`,
      options: [
        "Full fine-tuning in fp16",
        "QLoRA: 4-bit base plus LoRA adapters",
        "Retrain the model from scratch on your tickets",
        "Increase the context window instead",
      ],
      answer: 1,
      explain: String.raw`Full fp16 fine-tuning of 7B needs the weights plus optimizer state — far past 24 GB. QLoRA quantizes the frozen base to 4-bit (roughly 4-5 GB) and only the tiny LoRA adapters carry gradients, so it fits comfortably. Retraining from scratch is absurdly expensive, and context size does not teach style.`,
    },
  ];

  W.exercises["w4d2-e1"] = {
    title: "LoRA parameter math",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Count LoRA's trainable parameters and prove how much cheaper it is than full fine-tuning.",
    description: String.raw`Turn LoRA from a buzzword into arithmetic you can defend on a whiteboard.

**1. ~lora_params(d_in, d_out, r)~** — the number of trainable parameters in one LoRA adapter for a weight of shape ~(d_in, d_out)~. The adapter is ~A~ of shape ~(d_in, r)~ plus ~B~ of shape ~(r, d_out)~, so the count is ~r * (d_in + d_out)~.

**2. ~lora_total(layers, targets_per_layer, d, r)~** — total LoRA parameters when every targeted matrix is square ~(d, d)~: ~layers~ transformer blocks, each with ~targets_per_layer~ adapted matrices.

**3. ~reduction_factor(layers, targets_per_layer, d, r)~** — how many times fewer trainable parameters LoRA uses than full fine-tuning of those same matrices. Full fine-tuning trains ~layers * targets_per_layer * d * d~ weights; return the ratio ~full / lora_total~ (which simplifies to ~d / (2r)~).

~~~python
lora_params(4096, 4096, 8)            # 65536
lora_total(32, 4, 4096, 8)            # 32 * 4 * 65536 = 8,388,608
reduction_factor(32, 4, 4096, 8)      # 4096 / 16 = 256.0
~~~

Constraints: pure arithmetic, no imports. Return ints for the counts and a float for the ratio.

Interview angle: "how many parameters does LoRA add?" separates people who have run a fine-tune from people who have read about one. The clean punchline — reduction is ~d/(2r)~, independent of layer count — is the kind of derivation interviewers love.`,
    starter: String.raw`def lora_params(d_in, d_out, r):
    """Trainable params in one LoRA adapter: r * (d_in + d_out)."""
    raise NotImplementedError


def lora_total(layers, targets_per_layer, d, r):
    """Total LoRA params across all adapted square (d, d) matrices."""
    raise NotImplementedError


def reduction_factor(layers, targets_per_layer, d, r):
    """full_finetune_params / lora_total, as a float."""
    raise NotImplementedError`,
    hints: [
      String.raw`lora_params is literally r * (d_in + d_out) — that is |A| + |B| = d_in*r + r*d_out.`,
      String.raw`For a square matrix d_in = d_out = d, so one adapter is r * 2d. Multiply by layers and targets_per_layer for lora_total.`,
      String.raw`Full fine-tuning of those matrices trains layers * targets_per_layer * d * d weights. Divide that by lora_total; the layers and targets cancel, leaving d / (2r).`,
    ],
    solution: String.raw`def lora_params(d_in, d_out, r):
    return r * (d_in + d_out)


def lora_total(layers, targets_per_layer, d, r):
    return layers * targets_per_layer * lora_params(d, d, r)


def reduction_factor(layers, targets_per_layer, d, r):
    full = layers * targets_per_layer * d * d
    return full / lora_total(layers, targets_per_layer, d, r)`,
    tests: [
      {
        name: "single adapter parameter count",
        code: String.raw`assert lora_params(4096, 4096, 8) == 65536, lora_params(4096, 4096, 8)
assert lora_params(1024, 4096, 16) == 16 * (1024 + 4096) == 81920`,
      },
      {
        name: "non-square shapes are handled",
        code: String.raw`assert lora_params(768, 3072, 4) == 4 * (768 + 3072)
assert lora_params(1, 1, 1) == 2`,
      },
      {
        name: "total scales with layers and targets",
        code: String.raw`assert lora_total(32, 4, 4096, 8) == 32 * 4 * 65536
assert lora_total(1, 1, 4096, 8) == 65536`,
      },
      {
        name: "reduction factor equals d / (2r) and ignores layer count",
        code: String.raw`assert abs(reduction_factor(1, 1, 4096, 8) - 256.0) < 1e-9
assert abs(reduction_factor(32, 4, 4096, 8) - 256.0) < 1e-9
assert abs(reduction_factor(12, 2, 768, 8) - 768 / 16) < 1e-9`,
      },
      {
        name: "larger rank means less reduction",
        code: String.raw`assert reduction_factor(1, 1, 4096, 16) < reduction_factor(1, 1, 4096, 8)
assert abs(reduction_factor(1, 1, 4096, 16) - 128.0) < 1e-9`,
      },
    ],
  };

  W.exercises["w4d2-e2"] = {
    title: "Symmetric int8 quantization",
    difficulty: 3,
    xp: 40,
    minutes: 32,
    packages: ["numpy"],
    brief: "Quantize a weight tensor to int8 and bound the round-trip error.",
    description: String.raw`Implement the symmetric absmax int8 scheme and prove its error bound.

**1. ~quantize_int8(w)~** — return ~(q, scale)~ where ~scale = max(|w|) / 127~ and ~q = round(w / scale)~ as an ~int8~ array, clipped to ~[-127, 127]~. If every weight is 0, use ~scale = 1.0~ (and ~q~ all zeros) to avoid dividing by zero.

**2. ~dequantize(q, scale)~** — return ~q * scale~ as a float array (the reconstructed weights).

**3. ~max_abs_error(w)~** — quantize then dequantize ~w~ and return the largest absolute reconstruction error ~max(|w - w_hat|)~ as a float.

The guarantee you are demonstrating: because rounding moves each value by at most half a step, ~max_abs_error(w) <= scale / 2~.

~~~python
q, scale = quantize_int8(np.array([-1.0, 0.0, 0.5, 1.0]))
# scale = 1/127; q = [-127, 0, 64, 127]; the max-magnitude weights hit +/-127
dequantize(q, scale)[0]     # -1.0 (exact at the range edge)
max_abs_error(np.array([-1.0, 0.5, 1.0])) <= scale / 2   # True
~~~

Constraints: numpy only. Use ~np.round~ and ~.astype(np.int8)~; clip before casting so nothing wraps around.

Interview angle: "implement int8 quantization and tell me the error" tests whether you understand that quantization is lossy in a *bounded* way. The scale/2 bound is the sentence that lands.`,
    starter: String.raw`import numpy as np


def quantize_int8(w):
    """Return (q, scale): symmetric absmax int8. scale = max(|w|)/127,
    q = clip(round(w/scale), -127, 127) as int8. If all zero, scale = 1.0."""
    raise NotImplementedError


def dequantize(q, scale):
    """Return q * scale as a float array."""
    raise NotImplementedError


def max_abs_error(w):
    """Round-trip w and return max(|w - w_hat|) as a float."""
    raise NotImplementedError`,
    hints: [
      String.raw`max_abs is np.abs(w).max(). Guard the all-zero case: if it is 0, set scale = 1.0 so you never divide by zero (q ends up all zeros anyway).`,
      String.raw`Quantize with np.clip(np.round(w / scale), -127, 127).astype(np.int8). The clip protects against a rounded value landing exactly on 128 before the cast.`,
      String.raw`Dequantize by casting q back to float and multiplying by scale. For max_abs_error, quantize, dequantize, and take float(np.abs(w - w_hat).max()).`,
    ],
    solution: String.raw`import numpy as np


def quantize_int8(w):
    w = np.asarray(w, dtype=float)
    max_abs = np.abs(w).max()
    scale = (max_abs / 127.0) if max_abs > 0 else 1.0
    q = np.clip(np.round(w / scale), -127, 127).astype(np.int8)
    return q, scale


def dequantize(q, scale):
    return q.astype(float) * scale


def max_abs_error(w):
    w = np.asarray(w, dtype=float)
    q, scale = quantize_int8(w)
    w_hat = dequantize(q, scale)
    return float(np.abs(w - w_hat).max())`,
    tests: [
      {
        name: "scale and range edges are correct",
        code: String.raw`import numpy as np
q, s = quantize_int8(np.array([-1.0, 0.0, 0.5, 1.0]))
assert q.dtype == np.int8
assert abs(s - 1.0 / 127) < 1e-12, f"scale should be 1/127, got {s}"
assert q[0] == -127 and q[3] == 127, f"edges should hit +/-127, got {q}"
assert q.min() >= -127 and q.max() <= 127`,
      },
      {
        name: "the largest-magnitude weight maps to +/-127",
        code: String.raw`import numpy as np
q, s = quantize_int8(np.array([3.0, -1.5, 0.2]))
assert q[0] == 127, f"max weight must map to 127, got {q[0]}"`,
      },
      {
        name: "dequantize is exact at the range edges",
        code: String.raw`import numpy as np
q, s = quantize_int8(np.array([-1.0, 1.0]))
assert np.allclose(dequantize(q, s), [-1.0, 1.0])`,
      },
      {
        name: "round-trip error never exceeds scale/2",
        code: String.raw`import numpy as np
rng = np.random.default_rng(0)
w = rng.normal(size=2000)
q, s = quantize_int8(w)
assert max_abs_error(w) <= s / 2 + 1e-9, f"error {max_abs_error(w)} > scale/2 {s/2}"`,
      },
      {
        name: "all-zero weights are handled without dividing by zero",
        code: String.raw`import numpy as np
q, s = quantize_int8(np.zeros(4))
assert np.all(q == 0) and s == 1.0
assert max_abs_error(np.zeros(4)) == 0.0`,
      },
    ],
  };

  W.exercises["w4d2-e3"] = {
    title: "Will the model fit on the GPU?",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Estimate model memory from parameter count and precision, then answer the deployment question.",
    description: String.raw`The most common capacity question in an ML infra interview: "will an N-billion-parameter model fit on this GPU?" Answer it with two functions.

**1. ~model_memory_gb(params_b, bytes_per_param, overhead_frac)~** — memory in GB for a model with ~params_b~ **billions** of parameters at ~bytes_per_param~ bytes each, plus a fractional overhead for activations/KV/fragmentation. Because a billion params times B bytes is exactly ~params_b * B~ GB, the formula is:

~~~text
memory_gb = params_b * bytes_per_param * (1 + overhead_frac)
~~~

**2. ~can_it_fit(params_b, bytes_per_param, overhead_frac, gpu_gb)~** — return ~True~ if ~model_memory_gb(...) <= gpu_gb~, else ~False~.

~~~python
model_memory_gb(7, 2, 0.2)              # 7 * 2 * 1.2 = 16.8  (7B in fp16 + 20%)
can_it_fit(7, 2, 0.2, 24)               # True  (16.8 <= 24)
can_it_fit(70, 2, 0.2, 80)             # False (168 > 80: 70B fp16 needs ~2 GPUs)
can_it_fit(70, 0.5, 0.2, 48)           # True  (int4 70B ~= 42 GB fits a 48 GB card)
~~~

Constraints: pure arithmetic, no imports. bytes_per_param is 2 for fp16/bf16, 1 for int8, 0.5 for int4.

Interview angle: this is the napkin math behind "we need an A100 80GB" vs "an L4 will do". Being fluent in "7B fp16 is ~15 GB, quantize to int4 and it is ~4 GB" makes you sound like you have actually deployed something.`,
    starter: String.raw`def model_memory_gb(params_b, bytes_per_param, overhead_frac):
    """GB for params_b billion params at bytes_per_param bytes, plus overhead."""
    raise NotImplementedError


def can_it_fit(params_b, bytes_per_param, overhead_frac, gpu_gb):
    """True if the model fits in gpu_gb, else False."""
    raise NotImplementedError`,
    hints: [
      String.raw`A billion parameters at B bytes each is exactly params_b * B gigabytes, so you do not multiply by 1e9 anywhere. Then scale by (1 + overhead_frac).`,
      String.raw`can_it_fit just compares model_memory_gb(...) <= gpu_gb and returns that boolean.`,
    ],
    solution: String.raw`def model_memory_gb(params_b, bytes_per_param, overhead_frac):
    return params_b * bytes_per_param * (1 + overhead_frac)


def can_it_fit(params_b, bytes_per_param, overhead_frac, gpu_gb):
    return model_memory_gb(params_b, bytes_per_param, overhead_frac) <= gpu_gb`,
    tests: [
      {
        name: "7B in fp16 with 20% overhead is 16.8 GB",
        code: String.raw`assert abs(model_memory_gb(7, 2, 0.2) - 16.8) < 1e-9, model_memory_gb(7, 2, 0.2)`,
      },
      {
        name: "zero overhead is just params times bytes",
        code: String.raw`assert abs(model_memory_gb(70, 2, 0.0) - 140.0) < 1e-9
assert abs(model_memory_gb(13, 2, 0.0) - 26.0) < 1e-9`,
      },
      {
        name: "fit decisions for common configs",
        code: String.raw`assert can_it_fit(7, 2, 0.2, 24) is True
assert can_it_fit(70, 2, 0.2, 80) is False`,
      },
      {
        name: "int4 quantization makes a 70B model fit a 48 GB card",
        code: String.raw`assert can_it_fit(70, 0.5, 0.2, 48) is True
assert can_it_fit(70, 1, 0.2, 48) is False`,
      },
    ],
  };

  // ================= Day 3 =================
  W.days.push({
    id: "w4d3",
    title: "Prompting, Structured Output & Evals",
    minutes: 121,
    blocks: [
      { type: "lesson",   id: "w4d3-lesson", minutes: 25 },
      { type: "quiz",     id: "w4d3-quiz",   minutes: 12 },
      { type: "exercise", id: "w4d3-e1",     minutes: 22 },
      { type: "exercise", id: "w4d3-e2",     minutes: 32 },
      { type: "exercise", id: "w4d3-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "llm", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w4d3-lesson"] = {
    title: "Prompting, Structured Output & Evals",
    md: String.raw`Prompting is where most engineers start and most stop. The interview signal is higher up: can you make a model return machine-parseable output *reliably*, keep it from confidently making things up, and *measure* whether your changes helped? Prompt whispering is a party trick; structured output, grounding, and evals are the job.

### Roles and the anatomy of a request

Chat APIs take a list of messages with roles. Each earns its keep:

~~~text
system    : durable instructions, persona, rules, output contract. Set once.
user      : the actual request / question / data.
assistant : the model's replies (and, in few-shot, example replies you seed).
~~~

**Instructions vs few-shot**: tell the model what to do *and*, when the task is fiddly (a specific format, a tricky classification boundary), *show* it 2-5 examples as alternating user/assistant turns. Few-shot examples beat paragraphs of description for format-following. Keep them representative — a biased example set biases the output.

**Chain-of-thought** (CoT): asking the model to reason step by step before answering raises accuracy on multi-step math and logic, because it spends more tokens computing. Use it when the task is genuinely multi-step; skip it when latency matters or the task is a lookup. In production you often hide the reasoning and return only the final answer.

### Structured output: stop parsing prose

If a downstream system consumes the model, you need JSON, not vibes. Two mechanisms:

- **JSON / schema mode**: constrain decoding so output conforms to a JSON schema. The model literally cannot emit an unclosed brace.
- **Function / tool calling**: you declare typed functions; the model returns a structured call with arguments matching your schema. This is how agents act.

Even so, parse **defensively** on the client — models wrap JSON in prose, add trailing commas, or emit markdown. A robust extractor finds the first balanced object and validates it:

~~~python
import json

def extract_first_json(text):
    depth, start = 0, None
    for i, ch in enumerate(text):
        if ch == "{":
            if start is None:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                return json.loads(text[start:i + 1])
    raise ValueError("no JSON object found")
~~~

(The real version must also ignore braces *inside strings* — that is today's exercise.)

### Hallucinations: causes and mitigations

An LLM is a fluent next-token predictor with no built-in notion of truth, so it will produce confident, well-formed, wrong answers — especially for facts outside its training data or after its cutoff. Mitigations, roughly in order of leverage:

- **Grounding / RAG**: put the authoritative text in context and instruct "answer only from the provided context." This is the biggest lever and the whole back half of this week.
- **Citations**: require the model to cite which passage each claim came from; unciteable claims get dropped.
- **Refusal room**: explicitly allow "I don't know" so the model is not cornered into inventing.
- **Verification**: for high-stakes output, check claims with a second call, a validator, or a tool.

Note the trap: **RAG reduces hallucinations, it does not eliminate them** — the model can still misread or ignore the context.

### Evals: measure or you are guessing

"We improved the prompt" means nothing without numbers.

- **Perplexity** = ~exp(mean negative log-likelihood)~ over held-out tokens. Lower is better; it is an intrinsic language-modeling metric, not a task metric. A model 50% sure of every token has perplexity 2.
- **Exact match / F1** for extractive QA: EM is all-or-nothing; token-level F1 gives partial credit for overlapping answer spans.
- **LLM-as-judge**: use a strong model to grade outputs. Fast and flexible, but biased — **position bias** (favoring the first answer shown), **length bias** (favoring longer answers), and **self-preference** (favoring its own style). Mitigate by randomizing order, controlling length, and using rubrics.
- **Regression evals in CI**: freeze a labeled set and run it on every prompt/model change, so you catch the quiet regressions a demo would miss.

### ⚠️ Common pitfalls

- Parsing model output with a naive brace match that breaks on braces inside strings.
- Using chain-of-thought everywhere — it burns latency and tokens on tasks that do not need it.
- Trusting an LLM judge's raw score without controlling for position and length bias.
- Reporting a single cherry-picked example instead of a metric on a frozen eval set.
- Believing schema mode makes the *content* correct — it guarantees shape, not truth.

### 🎤 In interviews, they ask

- "How do you get reliable JSON out of an LLM, and how do you parse it safely?"
- "What causes hallucinations and how do you reduce them?"
- "How would you evaluate a summarization or QA feature before shipping?"
- "What is perplexity, and what does it not tell you?"
- "What biases does LLM-as-judge have and how do you control them?"

### TL;DR

- Roles: system = durable contract, user = request, assistant = replies/few-shot examples.
- Few-shot shows format; chain-of-thought trades tokens for multi-step accuracy — use it selectively.
- Prefer schema/tool calling for structure, but still parse defensively (first balanced JSON object).
- Grounding, citations, refusal room, and verification cut hallucinations; RAG reduces, never eliminates them.
- Evals: perplexity (intrinsic), EM/F1 (QA), LLM-as-judge (watch position/length/self bias), regression suites in CI.

### Go deeper

- [Anthropic — building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Chip Huyen — evaluation and LLM systems](https://huyenchip.com)
- [Hugging Face LLM course — evaluation](https://huggingface.co/learn)`,
  };

  W.quizzes["w4d3-quiz"] = [
    {
      q: String.raw`What does this print?

~~~python
import math
lp = [math.log(0.5)] * 4
print(round(math.exp(-sum(lp) / len(lp)), 1))
~~~`,
      options: [
        "2.0",
        "0.5",
        "4.0",
        "1.0",
      ],
      answer: 0,
      explain: String.raw`Perplexity = exp(mean negative log-likelihood). Every token has log-prob ln(0.5), so the mean NLL is -ln(0.5) = ln(2), and exp(ln 2) = 2.0. A model that assigns probability 0.5 to each true token is "as confused as" a fair choice between 2 options.`,
    },
    {
      q: String.raw`Which statement about RAG and hallucinations is correct?`,
      options: [
        "RAG eliminates hallucinations entirely",
        "RAG only affects latency, not factual accuracy",
        "RAG makes citations unnecessary",
        "RAG reduces hallucinations by grounding answers, but the model can still misread the context",
      ],
      answer: 3,
      explain: String.raw`Grounding the model in retrieved, authoritative text is the strongest single lever against hallucination, but it is not a guarantee — the model can still ignore or misinterpret the passage. That residual risk is exactly why citations and verification stay in the pipeline.`,
    },
    {
      q: String.raw`What does this print?

~~~python
text = 'result: {"a": 1, "b": {"c": 2}} done'
depth, start = 0, None
for i, ch in enumerate(text):
    if ch == "{":
        if start is None:
            start = i
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            print(text[start:i + 1])
            break
~~~`,
      options: [
        "{\"a\": 1, \"b\": {\"c\": 2}",
        "{\"a\": 1",
        "{\"a\": 1, \"b\": {\"c\": 2}}",
        "done",
      ],
      answer: 2,
      explain: String.raw`Counting depth (+1 on "{", -1 on "}") and stopping only when depth returns to 0 correctly captures the full nested object, including the inner {"c": 2}. A naive "stop at the first }" would truncate at the inner brace — which is the classic parsing bug.`,
    },
    {
      q: String.raw`When is chain-of-thought prompting most worth its cost?`,
      options: [
        "On every request, since more tokens always help",
        "On simple lookups where latency matters",
        "Only when the model is in JSON mode",
        "On multi-step reasoning tasks like math or logic",
      ],
      answer: 3,
      explain: String.raw`Chain-of-thought helps when the answer requires several dependent steps, because the extra tokens let the model actually compute intermediate results. On simple lookups it just adds latency and cost, and it is orthogonal to JSON mode.`,
    },
    {
      q: String.raw`You use a strong LLM to judge which of two answers is better. What bias should you actively control for?`,
      options: [
        "Position and length bias: it can favor whichever answer is shown first or is longer",
        "The judge always prefers the shorter answer",
        "The judge refuses to compare answers",
        "The judge only works if both answers are identical",
      ],
      answer: 0,
      explain: String.raw`LLM judges exhibit position bias (favoring the first option), length bias (favoring longer, more elaborate answers), and self-preference (favoring their own style). You mitigate by randomizing answer order, controlling for length, and grading against an explicit rubric.`,
    },
    {
      q: String.raw`What does JSON schema (structured output) mode guarantee?`,
      options: [
        "The output is factually correct",
        "The model will never hallucinate",
        "The output conforms to the requested structure/shape",
        "The answer is shorter than free text",
      ],
      answer: 2,
      explain: String.raw`Constrained decoding guarantees the *shape* — valid JSON matching your schema — so parsing never fails. It says nothing about whether the field values are true. Correctness still depends on the model and its grounding; schema mode and factuality are independent concerns.`,
    },
    {
      q: String.raw`Why keep a frozen, labeled eval set that runs on every prompt or model change?`,
      options: [
        "To make the model train faster",
        "To catch regressions that a single demo example would hide",
        "Because perplexity cannot be computed otherwise",
        "To replace the need for any human review",
      ],
      answer: 1,
      explain: String.raw`A prompt tweak that fixes one case often quietly breaks three others. A fixed labeled set turned into a CI check gives you a stable metric across changes, surfacing regressions that cherry-picked demos never would. It complements, not replaces, human review.`,
    },
  ];

  W.exercises["w4d3-e1"] = {
    title: "Perplexity from log-probs",
    difficulty: 1,
    xp: 20,
    minutes: 22,
    packages: [],
    brief: "Turn a list of token log-probabilities into the classic language-model metric.",
    description: String.raw`Perplexity is the standard intrinsic metric for language models. Implement it from per-token log-probabilities.

**~perplexity(logprobs)~** — ~logprobs~ is a list of natural-log probabilities the model assigned to each true next token. Return ~exp(-mean(logprobs))~. Raise ~ValueError~ on an empty list (perplexity is undefined with no tokens).

~~~text
perplexity = exp( - (1/N) * sum(logprobs) )
~~~

~~~python
import math
perplexity([math.log(0.5)] * 4)     # 2.0  (50% sure of every token)
perplexity([0.0, 0.0])              # 1.0  (prob 1.0 each -> perfect)
perplexity([-math.log(10)] * 3)     # 10.0 (uniform over 10 options)
~~~

Constraints: ~math~ only. Lower perplexity is better; a value of V means the model is as uncertain as a uniform choice among V tokens.

Interview angle: "how do you measure a language model without a downstream task?" Perplexity is the answer, and knowing it is ~exp~ of the mean negative log-likelihood (not the mean probability) is the detail that matters.`,
    starter: String.raw`import math


def perplexity(logprobs):
    """exp(-mean(logprobs)). Raise ValueError if logprobs is empty."""
    raise NotImplementedError`,
    hints: [
      String.raw`Guard the empty case first: if not logprobs, raise ValueError.`,
      String.raw`Mean negative log-likelihood is -(sum(logprobs) / len(logprobs)). Perplexity is math.exp of that.`,
    ],
    solution: String.raw`import math


def perplexity(logprobs):
    if not logprobs:
        raise ValueError("logprobs must be non-empty")
    mean_ll = sum(logprobs) / len(logprobs)
    return math.exp(-mean_ll)`,
    tests: [
      {
        name: "50% confidence per token gives perplexity 2",
        code: String.raw`import math
assert abs(perplexity([math.log(0.5)] * 4) - 2.0) < 1e-9`,
      },
      {
        name: "perfect prediction gives perplexity 1",
        code: String.raw`assert abs(perplexity([0.0, 0.0, 0.0]) - 1.0) < 1e-9`,
      },
      {
        name: "uniform over 10 tokens gives perplexity 10",
        code: String.raw`import math
assert abs(perplexity([-math.log(10)] * 3) - 10.0) < 1e-9`,
      },
      {
        name: "more confident predictions lower perplexity",
        code: String.raw`import math
confident = perplexity([math.log(0.9)] * 5)
unsure = perplexity([math.log(0.3)] * 5)
assert confident < unsure, f"{confident} should be < {unsure}"`,
      },
      {
        name: "empty input raises ValueError",
        code: String.raw`try:
    perplexity([])
    assert False, "empty logprobs must raise"
except ValueError:
    pass`,
      },
    ],
  };

  W.exercises["w4d3-e2"] = {
    title: "Extract JSON from messy model output",
    difficulty: 3,
    xp: 40,
    minutes: 32,
    packages: [],
    brief: "Pull the first balanced JSON object out of prose, honoring strings and escapes.",
    description: String.raw`LLMs love to wrap JSON in "Sure! Here you go:" and trailing commentary. Write the defensive parser that survives it.

**~extract_json(text)~** — find the **first balanced ~{...}~ object** in ~text~, parse it with ~json.loads~, and return the resulting Python object. Raise ~ValueError~ if there is no complete balanced object.

The catch is that braces and quotes can appear **inside string values**, where they must not affect nesting. Scan character by character tracking whether you are inside a JSON string (opened by ~"~) and whether the current character is escaped by a backslash. Only count ~{~ and ~}~ that are outside strings.

~~~python
extract_json('Sure! {"name": "Bob", "age": 3} hope that helps')
# {'name': 'Bob', 'age': 3}

extract_json('{"a": {"b": 1}}')          # {'a': {'b': 1}}  (nested)
extract_json('{"text": "a } b { c"}')     # {'text': 'a } b { c'}  (braces in string ignored)
extract_json('{"a":1} {"b":2}')           # {'a': 1}  (first object only)
extract_json('no json here')              # raises ValueError
~~~

Constraints: ~json~ only. Track string state and escapes; do not use regex (it cannot balance nested braces).

Interview angle: "the model returns JSON but sometimes with extra text — parse it" is a real production task. Handling braces-inside-strings and escaped quotes is exactly what separates a robust extractor from one that works in the demo and breaks in prod.`,
    starter: String.raw`import json


def extract_json(text):
    """Return the first balanced {...} object parsed via json.loads.
    Ignore braces/quotes inside JSON strings. Raise ValueError if none."""
    raise NotImplementedError`,
    hints: [
      String.raw`Walk the characters. Before you have seen an opening brace, just look for the first "{" to mark the start. After that, maintain depth for "{" and "}".`,
      String.raw`Track an in_string flag. While inside a string, ignore braces; a '"' toggles the flag, but only if the previous character was not an escaping backslash.`,
      String.raw`Handle escapes with a one-step flag: if you are in a string and see a backslash, mark the next character as escaped and skip its special meaning. When depth returns to 0, slice text[start:i+1] and json.loads it.`,
    ],
    solution: String.raw`import json


def extract_json(text):
    start = None
    depth = 0
    in_str = False
    escape = False
    for i, ch in enumerate(text):
        if start is None:
            if ch == "{":
                start = i
                depth = 1
            continue
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == "\"":
                in_str = False
            continue
        if ch == "\"":
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])
    raise ValueError("no balanced JSON object found")`,
    tests: [
      {
        name: "extracts a JSON object embedded in prose",
        code: String.raw`out = extract_json('Sure! {"name": "Bob", "age": 3} hope that helps')
assert out == {"name": "Bob", "age": 3}, f"got {out}"`,
      },
      {
        name: "handles nested objects",
        code: String.raw`assert extract_json('{"a": {"b": 1}}') == {"a": {"b": 1}}`,
      },
      {
        name: "braces and quotes inside strings do not break nesting",
        code: String.raw`import json
obj = {"note": 'has "quotes" and } brace {here'}
text = "prefix " + json.dumps(obj) + " suffix"
assert extract_json(text) == obj, f"got {extract_json(text)}"`,
      },
      {
        name: "returns only the first object",
        code: String.raw`assert extract_json('{"a":1} {"b":2}') == {"a": 1}`,
      },
      {
        name: "raises when there is no JSON",
        code: String.raw`try:
    extract_json("no json here at all")
    assert False, "must raise on missing JSON"
except ValueError:
    pass`,
      },
      {
        name: "raises on an unbalanced object",
        code: String.raw`try:
    extract_json('text { "a": 1 with no close')
    assert False, "unbalanced object must raise"
except ValueError:
    pass`,
      },
    ],
  };

  W.exercises["w4d3-e3"] = {
    title: "A tiny prompt template renderer",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Fill {placeholder} slots in a prompt template, with literal-brace escaping.",
    description: String.raw`Prompt templates need a renderer that substitutes variables but still lets you write literal braces. Build a small one.

**~render_prompt(template, variables)~** — replace each ~{name}~ placeholder in ~template~ with ~str(variables["name"])~. Rules:

- A doubled ~{{~ renders as a literal ~{~, and ~}}~ renders as a literal ~}~ (so you can show braces in the output).
- A ~{name}~ whose key is missing from ~variables~ raises ~KeyError~.
- A single unmatched ~{~ or ~}~ raises ~ValueError~.

~~~python
render_prompt("Hello {name}!", {"name": "Bob"})     # "Hello Bob!"
render_prompt("{{literal}}", {})                    # "{literal}"
render_prompt("{a} and {b}", {"a": 1, "b": 2})      # "1 and 2"
render_prompt("{missing}", {})                      # raises KeyError
~~~

Constraints: pure python, no imports, and do **not** use ~str.format~ — implement the scan yourself so the rules are explicit. (Note we use ~{name}~ style, never dollar-brace.)

Interview angle: every prompt framework ships a templating layer, and the interesting cases are exactly the escaping rules — literal braces and missing-key errors — that a naive replace() gets wrong.`,
    starter: String.raw`def render_prompt(template, variables):
    """Substitute {name} from variables. {{ and }} are literal braces.
    Missing key -> KeyError; unmatched single brace -> ValueError."""
    raise NotImplementedError`,
    hints: [
      String.raw`Scan with an index i so you can look ahead one character. When you see "{", first check if the next char is also "{" (literal) before treating it as a placeholder start.`,
      String.raw`For a placeholder, find the next "}" with template.find('}', i+1); if there is none, raise ValueError. The text between is the key (strip it); raise KeyError if it is not in variables.`,
      String.raw`Do the same doubling check for "}": a lone "}" that is not part of "}}" is an error. Accumulate characters in a list and join at the end.`,
    ],
    solution: String.raw`def render_prompt(template, variables):
    out = []
    i = 0
    n = len(template)
    while i < n:
        ch = template[i]
        if ch == "{":
            if i + 1 < n and template[i + 1] == "{":
                out.append("{")
                i += 2
                continue
            j = template.find("}", i + 1)
            if j == -1:
                raise ValueError("unmatched '{' in template")
            key = template[i + 1:j].strip()
            if key not in variables:
                raise KeyError(key)
            out.append(str(variables[key]))
            i = j + 1
        elif ch == "}":
            if i + 1 < n and template[i + 1] == "}":
                out.append("}")
                i += 2
                continue
            raise ValueError("unmatched '}' in template")
        else:
            out.append(ch)
            i += 1
    return "".join(out)`,
    tests: [
      {
        name: "substitutes a placeholder",
        code: String.raw`assert render_prompt("Hello {name}!", {"name": "Bob"}) == "Hello Bob!"`,
      },
      {
        name: "doubled braces become literal braces",
        code: String.raw`assert render_prompt("{{literal}}", {}) == "{literal}"
assert render_prompt("{{{name}}}", {"name": "x"}) == "{x}"`,
      },
      {
        name: "multiple placeholders and non-string values",
        code: String.raw`assert render_prompt("{a} and {b}", {"a": 1, "b": 2}) == "1 and 2"
assert render_prompt("no vars here", {}) == "no vars here"`,
      },
      {
        name: "missing key raises KeyError",
        code: String.raw`try:
    render_prompt("{missing}", {})
    assert False, "missing key must raise KeyError"
except KeyError:
    pass`,
      },
      {
        name: "unmatched single brace raises ValueError",
        code: String.raw`try:
    render_prompt("open { but never close", {})
    assert False, "unmatched brace must raise ValueError"
except ValueError:
    pass`,
      },
    ],
  };

  // ================= Day 4 =================
  W.days.push({
    id: "w4d4",
    title: "RAG I — Retrieval Mechanics",
    minutes: 121,
    blocks: [
      { type: "lesson",   id: "w4d4-lesson", minutes: 25 },
      { type: "quiz",     id: "w4d4-quiz",   minutes: 12 },
      { type: "exercise", id: "w4d4-e1",     minutes: 22 },
      { type: "exercise", id: "w4d4-e2",     minutes: 32 },
      { type: "exercise", id: "w4d4-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "rag", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w4d4-lesson"] = {
    title: "RAG I — Retrieval Mechanics",
    md: String.raw`"How would you build document Q&A over our internal wiki?" is the most-asked LLM system-design question of the last two years, and the answer is retrieval-augmented generation. But RAG is mostly a *retrieval* problem wearing an LLM hat — get retrieval wrong and the world's best model confidently answers from garbage. Today is the retrieval half, told with the numbers that make you sound like you have tuned one.

### RAG vs fine-tuning vs long-context

Three ways to give a model knowledge it did not have; pick with the tradeoff triangle:

~~~text
Fine-tuning   teaches style/format and stable skills. Bad for facts that change;
              retraining to add one document is absurd.
Long-context  just paste everything into the prompt. Simple, but costs scale with
              tokens, and quality sags in the middle of huge contexts.
RAG           fetch only the relevant passages per query. Fresh, cheap, auditable
              (citations), and updates by re-indexing. The default for knowledge.
~~~

Rule of thumb: **facts and freshness -> RAG; behavior and format -> fine-tuning; small-and-static -> long-context.** They compose (a fine-tuned model over a RAG pipeline is common).

### The pipeline

~~~text
offline:  documents -> chunk -> embed -> vector index (+ keyword index)
online:   query -> embed -> retrieve top-N -> (rerank) -> assemble context -> LLM -> answer + citations
~~~

### Chunking: the unglamorous decider

You cannot embed a whole document usefully — you split it into chunks. This choice quietly sets your ceiling:

- **Fixed-size**: e.g. **200-500 tokens** with **10-20% overlap**. Overlap keeps a fact from being split across a boundary. Simple and robust.
- **Structure-aware**: split on headings, paragraphs, or code blocks so a chunk is a coherent unit. Better retrieval, more work.

Too-large chunks dilute the embedding (one vector for many topics) and waste context; too-small chunks lose the surrounding meaning. 300 tokens with 50 overlap is a sane default to state in an interview.

### Two model types: bi-encoder vs cross-encoder

- **Bi-encoder (embeddings)**: encode query and each document *separately* into vectors (typically **768-3072 dims**); similarity is a cheap dot product. You precompute all document vectors, so search is fast — but the query and doc never "see" each other.
- **Cross-encoder (reranker)**: feed query and document *together* through a model that outputs one relevance score. Far more accurate, far too slow to run over millions of docs.

The production pattern is **retrieve-then-rerank**: a bi-encoder pulls a cheap top-100, a cross-encoder reranks down to the **top-5** you actually send to the LLM.

### Exact vs approximate search, and HNSW

Exact nearest-neighbor over millions of vectors is too slow. **ANN** (approximate nearest neighbor) trades a sliver of recall for orders-of-magnitude speed. **HNSW** (Hierarchical Navigable Small World) is the common index: it builds a multi-layer graph where upper layers have long-range links for fast coarse hops and lower layers have dense local links for accuracy. A search greedily walks toward the query, descending layers. You tune ~ef_search~ (higher = more accurate, slower) and accept ~95-99%~ recall for huge speedups.

### BM25: keyword scoring that still wins

Embeddings miss exact terms (product codes, names, rare jargon). **BM25** is the strong lexical baseline — TF-IDF with saturation and length normalization:

~~~text
score(q,d) = sum over query terms t of
             idf(t) * ( f(t,d) * (k1 + 1) ) / ( f(t,d) + k1 * (1 - b + b * |d|/avgdl) )
idf(t)     = ln( 1 + (N - df(t) + 0.5) / (df(t) + 0.5) )
k1 = 1.5   b = 0.75
~~~

~f(t,d)~ is term frequency in the doc, ~df(t)~ how many docs contain ~t~, ~N~ total docs, ~|d|~ this doc's length, ~avgdl~ the average. ~k1~ controls TF saturation (more of a word helps, with diminishing returns); ~b~ controls length penalty. This idf variant is always positive.

### Hybrid search + reciprocal rank fusion

Dense (embeddings) and sparse (BM25) each catch what the other misses, so run **both** and fuse. **Reciprocal rank fusion** needs no score calibration — it uses only ranks:

~~~text
RRF(d) = sum over rankers of 1 / (k + rank_of_d)     # k = 60 by convention
~~~

A document ranked high by either retriever floats up; being top-5 in both beats being top-1 in one.

### ⚠️ Common pitfalls

- Chunking as an afterthought — it caps retrieval quality more than the embedding model does.
- Skipping the reranker: pure bi-encoder recall looks fine until precision@5 tanks on hard queries.
- Dropping BM25 entirely; embeddings famously miss exact IDs, names, and rare terms.
- Assuming ANN is exact — you are trading a little recall for speed; measure it.
- Fusing raw dense and BM25 scores directly; they are on different scales. Fuse by rank (RRF) or normalize first.

### 🎤 In interviews, they ask

- "RAG vs fine-tuning vs long-context — when do you reach for each?"
- "How do you choose chunk size and overlap, and why does it matter?"
- "Bi-encoder vs cross-encoder — where does each go in the pipeline?"
- "Explain BM25. What do k1 and b control?"
- "What is HNSW, and what does ef_search trade off?"

### TL;DR

- RAG is for facts/freshness; fine-tuning for behavior; long-context for small static inputs — and they compose.
- Chunk to 200-500 tokens with 10-20% overlap; chunking quietly sets your quality ceiling.
- Bi-encoders make fast candidates; cross-encoder rerankers turn top-100 into an accurate top-5.
- HNSW is the standard ANN graph index; ef_search trades recall for latency.
- BM25 (k1=1.5, b=0.75) is the lexical baseline; hybrid + reciprocal rank fusion (1/(60+rank)) beats either alone.

### Go deeper

- [RAG paper (arXiv 2005.11401)](https://arxiv.org/abs/2005.11401)
- [Chip Huyen — building RAG and retrieval systems](https://huyenchip.com)
- [Hugging Face LLM course — retrieval](https://huggingface.co/learn)`,
  };

  W.quizzes["w4d4-quiz"] = [
    {
      q: String.raw`Your knowledge base changes daily and answers must cite sources. Which approach fits best?`,
      options: [
        "Fine-tune the model nightly on the new documents",
        "Paste the entire knowledge base into every prompt",
        "RAG: re-index changed docs and retrieve per query with citations",
        "Increase the model's parameter count",
      ],
      answer: 2,
      explain: String.raw`Frequently changing facts plus a citation requirement is the textbook RAG case: re-indexing is cheap, retrieval is per-query, and returned passages give you citations. Nightly fine-tuning is slow and forgets how to cite; pasting everything blows the token budget and degrades in long contexts.`,
    },
    {
      q: String.raw`What does this print?

~~~python
def chunk(words, size, overlap):
    step = size - overlap
    out, i, n = [], 0, len(words)
    while i < n:
        out.append(words[i:i + size])
        if i + size >= n:
            break
        i += step
    return out
print(len(chunk(list(range(10)), 4, 1)))
~~~`,
      options: [
        "5",
        "2",
        "4",
        "3",
      ],
      answer: 3,
      explain: String.raw`With size 4 and overlap 1 the step is 3: chunks start at 0, 3, 6. The chunk at 6 spans indices 6-9 and reaches the end (6 + 4 >= 10), so the loop stops. That is 3 chunks. The stop-at-end check is what prevents a degenerate 1-element trailing chunk.`,
    },
    {
      q: String.raw`In the retrieve-then-rerank pattern, what does the cross-encoder reranker do?`,
      options: [
        "It scores query and document jointly to reorder a small candidate set",
        "It replaces the vector index entirely",
        "It encodes documents offline so search is fast",
        "It compresses embeddings to save memory",
      ],
      answer: 0,
      explain: String.raw`A cross-encoder feeds the query and a candidate document through the model together, producing a precise joint relevance score — accurate but too slow for the whole corpus. So a fast bi-encoder retrieves a top-100 and the cross-encoder reranks it to a top-5. Encoding docs offline is the bi-encoder's job.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import math
N, df = 10, 9
idf = math.log(1 + (N - df + 0.5) / (df + 0.5))
print(round(idf, 3))
~~~`,
      options: [
        "-0.147",
        "0.147",
        "0.0",
        "2.350",
      ],
      answer: 1,
      explain: String.raw`idf = ln(1 + (10 - 9 + 0.5)/(9 + 0.5)) = ln(1 + 1.5/9.5) = ln(1.158) = 0.147. Note it is positive even for a term in 9 of 10 docs — the "1 +" inside the log is exactly why BM25's idf never goes negative, unlike the classic idf formula.`,
    },
    {
      q: String.raw`Why combine BM25 with dense embeddings in a hybrid retriever?`,
      options: [
        "BM25 is always more accurate than embeddings",
        "Embeddings can miss exact terms (IDs, names, rare words) that BM25 catches",
        "It removes the need for chunking",
        "Dense vectors cannot be indexed",
      ],
      answer: 1,
      explain: String.raw`Embeddings capture meaning but often miss literal matches — product codes, proper nouns, rare jargon — which lexical BM25 nails. Each covers the other's blind spot, so hybrid retrieval beats either alone. Neither replaces chunking, and dense vectors index fine (that is what ANN is for).`,
    },
    {
      q: String.raw`What does HNSW's ef_search parameter trade off?`,
      options: [
        "Model size versus vocabulary",
        "Chunk size versus overlap",
        "Search recall versus query latency",
        "Training time versus inference time",
      ],
      answer: 2,
      explain: String.raw`HNSW is an approximate index; ef_search controls how many candidates the graph walk explores. Higher ef_search finds more true neighbors (higher recall) but costs more time per query. You tune it to sit at, say, 95-99% recall for a large speedup over exact search.`,
    },
    {
      q: String.raw`Why does reciprocal rank fusion use 1 / (k + rank) instead of adding the retrievers' raw scores?`,
      options: [
        "Raw dense and BM25 scores are on different, uncalibrated scales",
        "Ranks are impossible to compute",
        "It makes retrieval exact rather than approximate",
        "It eliminates the need for a second retriever",
      ],
      answer: 0,
      explain: String.raw`A cosine similarity around 0.3 and a BM25 score of 12 are not comparable, so summing them lets one retriever dominate for the wrong reason. RRF discards magnitudes and fuses by position only, so a document ranked high by either retriever rises. The constant k (about 60) softens the very top ranks.`,
    },
  ];

  W.exercises["w4d4-e1"] = {
    title: "Word chunking with overlap",
    difficulty: 1,
    xp: 20,
    minutes: 22,
    packages: [],
    brief: "Split a token list into overlapping chunks — the front door of every RAG pipeline.",
    description: String.raw`Chunking sets the quality ceiling of a RAG system. Implement the fixed-size overlapping chunker.

**~chunk_words(words, size, overlap)~** — split the list ~words~ into consecutive chunks of length ~size~ that advance by ~step = size - overlap~ each time. Keep the final partial chunk if the list does not divide evenly. Validate inputs: raise ~ValueError~ unless ~size >= 1~ and ~0 <= overlap < size~ (overlap must be smaller than size or you would never move forward).

Stop cleanly: once a chunk reaches the end of the list, do not emit a redundant trailing chunk.

~~~python
chunk_words([1, 2, 3, 4], 2, 0)          # [[1, 2], [3, 4]]
chunk_words([1, 2, 3, 4, 5], 3, 1)       # [[1, 2, 3], [3, 4, 5]]   (word 3 overlaps)
chunk_words([1, 2, 3, 4, 5], 2, 0)       # [[1, 2], [3, 4], [5]]     (last partial kept)
chunk_words([], 3, 1)                     # []
~~~

Constraints: pure python, list slicing only.

Interview angle: this is the "warm-up" coding question in a RAG system-design round. The off-by-one — whether overlap is handled correctly and whether the last partial chunk survives — is exactly what the interviewer is watching.`,
    starter: String.raw`def chunk_words(words, size, overlap):
    """Split words into size-length chunks advancing by (size - overlap).
    Keep the last partial chunk. Require size >= 1 and 0 <= overlap < size."""
    raise NotImplementedError`,
    hints: [
      String.raw`Validate first: if size <= 0 raise ValueError, and if not (0 <= overlap < size) raise ValueError. Then step = size - overlap.`,
      String.raw`Walk an index i from 0, appending words[i:i+size] each time. Slicing past the end is safe in Python, so the last partial chunk comes for free.`,
      String.raw`To avoid a redundant trailing chunk, break as soon as i + size >= len(words); otherwise advance i += step.`,
    ],
    solution: String.raw`def chunk_words(words, size, overlap):
    if size <= 0:
        raise ValueError("size must be >= 1")
    if not (0 <= overlap < size):
        raise ValueError("need 0 <= overlap < size")
    step = size - overlap
    chunks = []
    i = 0
    n = len(words)
    while i < n:
        chunks.append(words[i:i + size])
        if i + size >= n:
            break
        i += step
    return chunks`,
    tests: [
      {
        name: "exact fit with no overlap",
        code: String.raw`assert chunk_words([1, 2, 3, 4], 2, 0) == [[1, 2], [3, 4]]`,
      },
      {
        name: "overlap repeats the boundary word",
        code: String.raw`assert chunk_words([1, 2, 3, 4, 5], 3, 1) == [[1, 2, 3], [3, 4, 5]]`,
      },
      {
        name: "last partial chunk is kept",
        code: String.raw`assert chunk_words([1, 2, 3, 4, 5], 2, 0) == [[1, 2], [3, 4], [5]]`,
      },
      {
        name: "empty and single-word inputs",
        code: String.raw`assert chunk_words([], 3, 1) == []
assert chunk_words([7], 3, 1) == [[7]]`,
      },
      {
        name: "invalid overlap is rejected",
        code: String.raw`for ov in (2, 3, -1):
    try:
        chunk_words([1, 2, 3], 2, ov)
        assert False, f"overlap {ov} must raise"
    except ValueError:
        pass`,
      },
      {
        name: "no-overlap chunks reconstruct the original list",
        code: String.raw`flat = [w for c in chunk_words(list(range(10)), 4, 0) for w in c]
assert flat == list(range(10)), f"got {flat}"`,
      },
    ],
  };

  W.exercises["w4d4-e2"] = {
    title: "BM25 scoring",
    difficulty: 3,
    xp: 40,
    minutes: 32,
    packages: [],
    brief: "Implement the lexical retrieval baseline that still beats embeddings on exact terms.",
    description: String.raw`BM25 is the strong keyword baseline every retrieval system is measured against. The corpus statistics are precomputed for you; you implement the scorer.

Provided in the starter (do not modify): **~build_stats(corpus)~** takes a list of token-lists and returns ~{"N": doc_count, "df": {token: doc_frequency}, "avgdl": average_doc_length}~.

**~bm25_score(query_tokens, doc_tokens, stats, k1=1.5, b=0.75)~** — score one document against a query using:

~~~text
score = sum over query terms t of
        idf(t) * ( f(t,d) * (k1 + 1) ) / ( f(t,d) + k1 * (1 - b + b * |d|/avgdl) )
idf(t) = ln( 1 + (N - df(t) + 0.5) / (df(t) + 0.5) )
~~~

where ~f(t,d)~ is how often ~t~ appears in ~doc_tokens~, ~|d|~ is ~len(doc_tokens)~, and ~N~, ~df~, ~avgdl~ come from ~stats~. Terms not in the document contribute 0; a term absent from the corpus has ~df = 0~ (its idf is still defined by the formula).

~~~python
corpus = [["cat", "sat", "mat"], ["dog", "ran", "park"], ["cat", "cat", "hat"]]
stats = build_stats(corpus)          # N=3, df={cat:2, ...}, avgdl=3.0
bm25_score(["cat"], ["cat", "sat", "mat"], stats)   # ~0.470 (idf of cat; TF term = 1)
bm25_score(["cat"], ["cat", "cat", "hat"], stats)   # higher: cat appears twice
~~~

Constraints: ~math~ and ~collections~ only.

Interview angle: "implement BM25" is a genuine retrieval-team question. The details that matter are the saturating TF term (why two occurrences is not twice one) and the length-normalization term (1 - b + b*|d|/avgdl).`,
    starter: String.raw`import math
from collections import Counter


def build_stats(corpus):
    """PROVIDED. corpus is a list of token-lists.
    Returns {"N": #docs, "df": {token: #docs with token}, "avgdl": mean length}."""
    N = len(corpus)
    df = {}
    total_len = 0
    for doc in corpus:
        total_len += len(doc)
        for tok in set(doc):
            df[tok] = df.get(tok, 0) + 1
    return {"N": N, "df": df, "avgdl": total_len / N if N else 0.0}


def bm25_score(query_tokens, doc_tokens, stats, k1=1.5, b=0.75):
    """Score doc_tokens against query_tokens using the BM25 formula above."""
    raise NotImplementedError`,
    hints: [
      String.raw`Count term frequencies in the document once with Counter(doc_tokens). Pull N, df, and avgdl out of stats, and let dl = len(doc_tokens).`,
      String.raw`Loop over query terms. Skip a term whose frequency f in the doc is 0 (it adds nothing). For the rest, idf = math.log(1 + (N - df_t + 0.5) / (df_t + 0.5)) with df_t = stats["df"].get(t, 0).`,
      String.raw`The document term is (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avgdl)). Multiply by idf and accumulate into the score.`,
    ],
    solution: String.raw`import math
from collections import Counter


def build_stats(corpus):
    N = len(corpus)
    df = {}
    total_len = 0
    for doc in corpus:
        total_len += len(doc)
        for tok in set(doc):
            df[tok] = df.get(tok, 0) + 1
    return {"N": N, "df": df, "avgdl": total_len / N if N else 0.0}


def bm25_score(query_tokens, doc_tokens, stats, k1=1.5, b=0.75):
    N = stats["N"]
    df = stats["df"]
    avgdl = stats["avgdl"]
    dl = len(doc_tokens)
    tf = Counter(doc_tokens)
    score = 0.0
    for t in query_tokens:
        f = tf.get(t, 0)
        if f == 0:
            continue
        d_t = df.get(t, 0)
        idf = math.log(1 + (N - d_t + 0.5) / (d_t + 0.5))
        denom = f + k1 * (1 - b + b * dl / avgdl)
        score += idf * (f * (k1 + 1)) / denom
    return score`,
    tests: [
      {
        name: "single term score equals its idf when dl == avgdl and f == 1",
        code: String.raw`import math
corpus = [["cat", "sat", "mat"], ["dog", "ran", "park"], ["cat", "cat", "hat"]]
st = build_stats(corpus)
idf = math.log(1 + (3 - 2 + 0.5) / (2 + 0.5))
got = bm25_score(["cat"], ["cat", "sat", "mat"], st)
assert abs(got - idf) < 1e-9, f"expected {idf}, got {got}"`,
      },
      {
        name: "higher term frequency scores higher (but saturates)",
        code: String.raw`corpus = [["cat", "sat", "mat"], ["dog", "ran", "park"], ["cat", "cat", "hat"]]
st = build_stats(corpus)
one = bm25_score(["cat"], ["cat", "sat", "mat"], st)
two = bm25_score(["cat"], ["cat", "cat", "hat"], st)
assert two > one, f"two occurrences should beat one: {two} vs {one}"
assert two < 2 * one, f"TF must saturate, not double: {two} vs {2 * one}"`,
      },
      {
        name: "rarer terms carry higher idf",
        code: String.raw`corpus = [["cat", "sat", "mat"], ["dog", "ran", "park"], ["cat", "cat", "hat"]]
st = build_stats(corpus)
common = bm25_score(["cat"], ["cat", "sat", "mat"], st)   # df 2
rare = bm25_score(["dog"], ["dog", "ran", "park"], st)     # df 1
assert rare > common, f"rare term should score higher: {rare} vs {common}"`,
      },
      {
        name: "missing query terms contribute zero",
        code: String.raw`corpus = [["cat", "sat", "mat"], ["dog", "ran", "park"], ["cat", "cat", "hat"]]
st = build_stats(corpus)
assert bm25_score([], ["cat"], st) == 0.0
assert bm25_score(["zebra"], ["cat", "sat"], st) == 0.0`,
      },
      {
        name: "score sums over multiple matching query terms",
        code: String.raw`corpus = [["cat", "sat", "mat"], ["dog", "ran", "park"], ["cat", "cat", "hat"]]
st = build_stats(corpus)
combo = bm25_score(["cat", "sat"], ["cat", "sat", "mat"], st)
just_cat = bm25_score(["cat"], ["cat", "sat", "mat"], st)
just_sat = bm25_score(["sat"], ["cat", "sat", "mat"], st)
assert abs(combo - (just_cat + just_sat)) < 1e-9, f"terms should add: {combo}"`,
      },
    ],
  };

  W.exercises["w4d4-e3"] = {
    title: "Reciprocal rank fusion",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Fuse several ranked lists into one, using ranks only — the hybrid-search glue.",
    description: String.raw`Hybrid search runs multiple retrievers and merges their results. Reciprocal rank fusion (RRF) does it without any score calibration.

**~rrf_fuse(rankings, k=60)~** — ~rankings~ is a list of ranked lists (each a list of document ids, best first). Every document accumulates a score of ~1 / (k + rank)~ from each list it appears in, where ~rank~ is its **1-based** position in that list. Return the document ids sorted by descending fused score. Break ties deterministically by the string form of the id (ascending).

~~~text
RRF(d) = sum over rankings of 1 / (k + rank_of_d_in_that_ranking)
~~~

~~~python
rrf_fuse([["x", "y", "z"], ["x", "z", "y"], ["y", "x", "z"]])
# ["x", "y", "z"]  -- x is near the top of all three

rrf_fuse([["a", "b"], ["a", "c"]])
# ["a", ...]  -- a appears (and ranks well) in both lists
~~~

Constraints: pure python, ~sorted~ with a key. Note that a document strong in two lists beats one that is rank-1 in a single list.

Interview angle: RRF is the standard, boringly-effective way to combine dense and sparse retrieval. Knowing it fuses by rank (not score) — so you never have to normalize a cosine against a BM25 score — is the point.`,
    starter: String.raw`def rrf_fuse(rankings, k=60):
    """Fuse ranked lists of doc ids by reciprocal rank fusion.
    Score(doc) = sum of 1/(k + rank) over lists (rank is 1-based).
    Return ids sorted by descending score, ties broken by str(id) ascending."""
    raise NotImplementedError`,
    hints: [
      String.raw`Accumulate into a dict. For each ranking, enumerate with start=1 so rank is 1-based, and add 1.0 / (k + rank) to that doc's running score.`,
      String.raw`Sort the doc ids with sorted(scores, key=lambda d: (-scores[d], str(d))): descending score, then ascending string id as a stable tie-break.`,
    ],
    solution: String.raw`def rrf_fuse(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, doc in enumerate(ranking, start=1):
            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=lambda d: (-scores[d], str(d)))`,
    tests: [
      {
        name: "document strong across lists ranks first",
        code: String.raw`out = rrf_fuse([["x", "y", "z"], ["x", "z", "y"], ["y", "x", "z"]])
assert out == ["x", "y", "z"], f"got {out}"`,
      },
      {
        name: "appearing in more lists beats a single high rank",
        code: String.raw`out = rrf_fuse([["a", "b"], ["a", "c"]])
assert out[0] == "a", f"a should win, got {out}"`,
      },
      {
        name: "a single ranking is returned in its own order",
        code: String.raw`assert rrf_fuse([["p", "q", "r"]]) == ["p", "q", "r"]`,
      },
      {
        name: "custom k changes the reciprocal weights",
        code: String.raw`out = rrf_fuse([["a", "b", "c"]], k=0)
assert out == ["a", "b", "c"]
# with k=0 the rank-1 doc scores 1/1 = 1.0
scores_top = 1.0 / (0 + 1)
assert abs(scores_top - 1.0) < 1e-9`,
      },
      {
        name: "every input document appears in the output",
        code: String.raw`out = rrf_fuse([["a", "b"], ["c", "d"]])
assert sorted(out) == ["a", "b", "c", "d"], f"got {out}"`,
      },
    ],
  };

  // ================= Day 5 =================
  W.days.push({
    id: "w4d5",
    title: "RAG II — Systems That Answer Truthfully",
    minutes: 124,
    blocks: [
      { type: "lesson",   id: "w4d5-lesson", minutes: 25 },
      { type: "quiz",     id: "w4d5-quiz",   minutes: 12 },
      { type: "exercise", id: "w4d5-e1",     minutes: 25 },
      { type: "exercise", id: "w4d5-e2",     minutes: 32 },
      { type: "exercise", id: "w4d5-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "rag", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w4d5-lesson"] = {
    title: "RAG II — Systems That Answer Truthfully",
    md: String.raw`Yesterday you built retrieval. Today you turn retrieved passages into an answer a user can *trust* — grounded, cited, and measured. This is where RAG demos become RAG products, and where the interview shifts from "can you retrieve?" to "how do you know it is right, and what breaks?"

### The full production pipeline

~~~text
INGEST:   load docs -> clean -> chunk -> embed -> build vector + keyword index
QUERY:    rewrite query -> retrieve (hybrid) -> rerank -> assemble context ->
          generate grounded answer -> attach citations -> (optionally) verify
~~~

Every stage can fail independently, which is why you evaluate them separately.

### Query transformation

The user's raw question is often a bad search query. Cheap, high-leverage fixes:

- **Query rewriting**: expand abbreviations, resolve "it/that" from chat history into a standalone question.
- **Multi-query**: generate 2-4 paraphrases, retrieve for each, union the results — catches vocabulary mismatch.
- **HyDE** (Hypothetical Document Embeddings): ask the LLM to *draft a fake answer*, embed that, and search with it — the hypothetical answer is often closer to the real passage than the terse question was.

### Context assembly: what you feed the model matters

Retrieval gives candidates; assembly decides what actually enters the prompt:

- **Deduplicate**: overlapping chunks and near-duplicate docs waste context and bias the model by repetition.
- **Order deliberately**: models suffer **lost-in-the-middle** — recall is highest for content at the *start and end* of a long context and sags in the middle. Put the strongest passages at the edges.
- **Budget**: you have a token cap; more chunks is not better once you pass the top handful. Top-5 focused beats top-50 noisy.

### Grounded generation and citations

The instruction is blunt on purpose: "Answer using **only** the provided context. If the answer is not in the context, say you do not know. Cite the source id for each claim." Then you make citations mechanical — tag each chunk with an id and require the model to reference it, e.g. ~[doc_3]~. Citations are not decoration: they make answers auditable and let you catch a claim that no retrieved passage supports.

### Evaluating RAG: two halves

You cannot fix what you cannot locate, so score retrieval and generation separately.

**Retrieval metrics** (is the right chunk in the results?):

- **Recall@k**: fraction of relevant documents that appear in the top ~k~.
- **MRR** (mean reciprocal rank): average of ~1/rank~ of the first relevant hit — rewards putting the answer high.
- **nDCG**: rank-weighted relevance when results have graded (not just binary) relevance.

**Generation metrics** (is the answer good, given what was retrieved?):

- **Faithfulness / groundedness**: is every claim supported by the retrieved context? (Often scored by an LLM judge.)
- **Answer relevance**: does it actually address the question?

Split them because a wrong answer has two very different cures: bad retrieval (fix chunking/embeddings/reranking) vs bad generation (fix the prompt/grounding).

### Failure taxonomy and when RAG is wrong

~~~text
Retrieval miss     the right chunk was never fetched      -> chunking, hybrid, rerank
Right chunk ignored model didn't use it                   -> prompt, ordering, fewer chunks
Ungrounded answer  model added facts not in context       -> stricter grounding, citations
Stale index        docs changed, index didn't             -> re-index / freshness pipeline
~~~

And know when **not** to reach for RAG: pure reasoning or math problems (no document helps), tasks needing the *whole* corpus at once (summarize every ticket), or behavior/style changes (that is fine-tuning). RAG adds facts; it does not add reasoning.

### ⚠️ Common pitfalls

- Claiming citations guarantee truth — they make claims *checkable*, but a model can still cite the wrong passage.
- Stuffing 50 chunks in "to be safe" — noise and lost-in-the-middle drop quality below a tight top-5.
- Reporting one end-to-end number; without separate retrieval vs generation scores you cannot tell what to fix.
- Ignoring index freshness — a correct pipeline over a stale index confidently serves last month's answer.
- Forgetting to dedupe — repeated near-identical chunks bias and crowd out the context window.

### 🎤 In interviews, they ask

- "Walk me through a production RAG pipeline end to end."
- "Retrieval looks fine but answers are wrong. How do you localize the failure?"
- "What is lost-in-the-middle and how do you mitigate it?"
- "How do you evaluate a RAG system — retrieval and generation?"
- "When is RAG the wrong tool?"

### TL;DR

- Production RAG = ingest/index offline, then rewrite -> retrieve -> rerank -> assemble -> generate -> cite online.
- Query rewriting, multi-query, and HyDE bridge the gap between how users ask and how documents are written.
- Assemble deliberately: dedupe, put strong passages at the edges (lost-in-the-middle), keep the top-k tight.
- Ground generation ("answer only from context, else say you don't know") and make citations mechanical.
- Evaluate retrieval (recall@k, MRR, nDCG) and generation (faithfulness, answer relevance) separately.

### Go deeper

- [Anthropic — building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Chip Huyen — RAG evaluation and failure modes](https://huyenchip.com)
- [Hugging Face LLM course](https://huggingface.co/learn)`,
  };

  W.quizzes["w4d5-quiz"] = [
    {
      q: String.raw`What does this print?

~~~python
def recall_at_k(relevant, retrieved, k):
    relevant = set(relevant)
    hits = sum(1 for d in retrieved[:k] if d in relevant)
    return hits / len(relevant)
print(round(recall_at_k({"a", "b", "c"}, ["a", "x", "b", "y"], 3), 2))
~~~`,
      options: [
        "0.5",
        "1.0",
        "0.67",
        "0.33",
      ],
      answer: 2,
      explain: String.raw`The top-3 retrieved are [a, x, b]; two of the three relevant docs (a and b) are present, so recall@3 = 2/3 = 0.67. Recall is measured against the number of *relevant* docs (3), not the number retrieved. Document c is relevant but missing, capping recall below 1.`,
    },
    {
      q: String.raw`What is "lost-in-the-middle" in long-context generation?`,
      options: [
        "Tokens in the middle of a document are never embedded",
        "The model attends best to the start and end of a long context, worst to the middle",
        "The vector index drops middle-ranked results",
        "Chunk overlap loses the middle of each chunk",
      ],
      answer: 1,
      explain: String.raw`Empirically, models recall information placed at the beginning or end of a long context far better than material buried in the middle. The mitigation is deliberate ordering — put your strongest retrieved passages at the edges — and keeping the context tight rather than dumping everything.`,
    },
    {
      q: String.raw`Retrieval clearly surfaces the correct passage, but the model's answer adds a fact that is not in it. Which metric caught this, and what do you fix?`,
      options: [
        "Faithfulness dropped; tighten grounding and citations",
        "Recall@k dropped; fix the embeddings",
        "MRR dropped; fix the reranker",
        "Perplexity rose; retrain the model",
      ],
      answer: 0,
      explain: String.raw`Retrieval was fine (recall/MRR are about whether the right chunk was fetched, and it was). The defect is an ungrounded claim, which is a generation problem measured by faithfulness/groundedness. The cure is a stricter "answer only from context" prompt plus citation enforcement, not touching retrieval.`,
    },
    {
      q: String.raw`What does HyDE (Hypothetical Document Embeddings) do?`,
      options: [
        "Deduplicates chunks before indexing",
        "Compresses embeddings to fit more in memory",
        "Reranks candidates with a cross-encoder",
        "Drafts a hypothetical answer with the LLM, then embeds it to search",
      ],
      answer: 3,
      explain: String.raw`HyDE asks the LLM to write a plausible answer to the query, then embeds that hypothetical answer and searches with its vector. A drafted answer tends to sit closer in embedding space to the real supporting passage than the short question does, improving recall for terse queries.`,
    },
    {
      q: String.raw`What does this print?

~~~python
def reciprocal_rank(relevant, retrieved):
    for rank, d in enumerate(retrieved, start=1):
        if d in relevant:
            return 1 / rank
    return 0.0
print(reciprocal_rank({"b"}, ["a", "b", "c"]))
~~~`,
      options: [
        "1.0",
        "0.5",
        "0.3333333333333333",
        "0.0",
      ],
      answer: 1,
      explain: String.raw`The first (and only) relevant doc "b" appears at rank 2, so the reciprocal rank is 1/2 = 0.5. MRR averages this across queries; it rewards ranking the first relevant hit as high as possible, which is why rank 1 scores 1.0 and rank 2 already halves it.`,
    },
    {
      q: String.raw`Why deduplicate chunks during context assembly?`,
      options: [
        "Near-duplicate passages waste the token budget and bias the model by repetition",
        "Deduplication is required for the embeddings to normalize",
        "Vector indexes cannot store duplicate vectors",
        "It converts dense retrieval into sparse retrieval",
      ],
      answer: 0,
      explain: String.raw`Overlapping chunks and duplicate documents eat into a fixed context budget and, by repeating a claim, can make the model over-weight it. Removing near-duplicates leaves room for genuinely new evidence. It has nothing to do with embedding normalization or index storage limits.`,
    },
    {
      q: String.raw`Which task is RAG the wrong tool for?`,
      options: [
        "Answering questions from a frequently-updated policy wiki",
        "Looking up a product's specifications from a manual",
        "A pure multi-step math word problem with no relevant documents",
        "Citing sources for a factual claim",
      ],
      answer: 2,
      explain: String.raw`RAG supplies facts from documents; it does not add reasoning. A self-contained math problem has no passage to retrieve that would help, so retrieval is wasted effort. The other three are exactly what RAG excels at: fresh facts, manual lookups, and citeable answers.`,
    },
  ];

  W.exercises["w4d5-e1"] = {
    title: "Retrieval metrics: recall@k and MRR",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Score a retriever the way every RAG eval harness does.",
    description: String.raw`You cannot improve retrieval you do not measure. Implement the two workhorse metrics.

**1. ~recall_at_k(relevant, retrieved, k)~** — ~relevant~ is a collection of relevant doc ids, ~retrieved~ is the ranked list your retriever returned. Return the fraction of relevant docs that appear in the top ~k~: ~|relevant intersect retrieved[:k]| / |relevant|~. Raise ~ValueError~ if ~relevant~ is empty (recall is undefined with nothing to find).

**2. ~mrr(queries)~** — ~queries~ is a list of ~(relevant, retrieved)~ pairs. For each query, the reciprocal rank is ~1 / rank~ of the **first** retrieved id that is relevant (1-based), or ~0.0~ if none is. Return the mean reciprocal rank over all queries. Raise ~ValueError~ on an empty ~queries~ list.

~~~python
recall_at_k({"a", "b"}, ["a", "c", "b", "d"], 2)   # 0.5  (only a is in top-2)
recall_at_k({"a", "b"}, ["a", "c", "b", "d"], 3)   # 1.0  (a and b in top-3)
mrr([({"a"}, ["x", "a", "y"]), ({"b"}, ["b", "c"])])  # (1/2 + 1/1)/2 = 0.75
~~~

Constraints: pure python, use ~set~ membership. Do not print.

Interview angle: "how do you evaluate retrieval?" should trigger recall@k and MRR immediately. The subtlety graders look for is that recall's denominator is the number of *relevant* docs, and MRR only cares about the *first* relevant hit.`,
    starter: String.raw`def recall_at_k(relevant, retrieved, k):
    """Fraction of relevant ids present in retrieved[:k].
    Raise ValueError if relevant is empty."""
    raise NotImplementedError


def mrr(queries):
    """Mean of 1/rank of the first relevant hit per (relevant, retrieved) query.
    0 for a query with no relevant hit. Raise ValueError if queries is empty."""
    raise NotImplementedError`,
    hints: [
      String.raw`For recall_at_k, make relevant a set, slice retrieved[:k], and count how many of that slice are in the set. Divide by len(relevant).`,
      String.raw`For MRR, loop each query; enumerate retrieved with start=1 and return 1/rank at the first id found in the relevant set, else 0.0.`,
      String.raw`Average the per-query reciprocal ranks by summing and dividing by len(queries). Guard both empty cases with ValueError before you divide.`,
    ],
    solution: String.raw`def recall_at_k(relevant, retrieved, k):
    relevant = set(relevant)
    if not relevant:
        raise ValueError("relevant must be non-empty")
    topk = retrieved[:k]
    hits = sum(1 for d in topk if d in relevant)
    return hits / len(relevant)


def mrr(queries):
    if not queries:
        raise ValueError("queries must be non-empty")
    total = 0.0
    for relevant, retrieved in queries:
        relevant = set(relevant)
        rr = 0.0
        for rank, d in enumerate(retrieved, start=1):
            if d in relevant:
                rr = 1.0 / rank
                break
        total += rr
    return total / len(queries)`,
    tests: [
      {
        name: "recall counts relevant docs in the top k",
        code: String.raw`assert recall_at_k({"a", "b"}, ["a", "c", "b", "d"], 2) == 0.5
assert recall_at_k({"a", "b"}, ["a", "c", "b", "d"], 3) == 1.0`,
      },
      {
        name: "recall is zero when no relevant doc is retrieved",
        code: String.raw`assert recall_at_k({"a"}, ["b", "c", "d"], 3) == 0.0`,
      },
      {
        name: "recall rejects an empty relevant set",
        code: String.raw`try:
    recall_at_k(set(), ["a"], 1)
    assert False, "empty relevant must raise"
except ValueError:
    pass`,
      },
      {
        name: "MRR averages reciprocal ranks of the first hit",
        code: String.raw`got = mrr([({"a"}, ["x", "a", "y"]), ({"b"}, ["b", "c"])])
assert abs(got - 0.75) < 1e-9, f"expected 0.75, got {got}"`,
      },
      {
        name: "a query with no relevant hit contributes zero",
        code: String.raw`assert mrr([({"z"}, ["a", "b"])]) == 0.0
mixed = mrr([({"a"}, ["a", "b"]), ({"z"}, ["a", "b"])])
assert abs(mixed - 0.5) < 1e-9, f"expected 0.5, got {mixed}"`,
      },
      {
        name: "empty query list raises ValueError",
        code: String.raw`try:
    mrr([])
    assert False, "empty queries must raise"
except ValueError:
    pass`,
      },
    ],
  };

  W.exercises["w4d5-e2"] = {
    title: "A tiny cosine retriever with citations",
    difficulty: 3,
    xp: 40,
    minutes: 32,
    packages: [],
    brief: "Index a toy corpus, retrieve by cosine similarity, and assemble a cited context.",
    description: String.raw`Build the retrieval-and-assembly core of a RAG system over a toy corpus, with no ML libraries.

Provided in the starter (do not modify): a deterministic **~embed(text)~** (a hashing embedding that maps text to a normalized vector) and **~CORPUS~**, a dict of 8 ~doc_id -> text~ facts. A helper **~cosine(a, b)~** is also provided.

Implement three functions:

**1. ~index_corpus(corpus)~** — return a list of ~(doc_id, vector)~ pairs, one per doc, using ~embed~ on each document's text.

**2. ~retrieve(query, index, k)~** — embed the query, score every indexed doc by ~cosine~ similarity, and return the top ~k~ as a list of ~(doc_id, score)~ sorted by descending score (break ties by ~doc_id~ ascending).

**3. ~assemble_context(hits, corpus)~** — given ~hits~ (the ~(doc_id, score)~ list from ~retrieve~) and the ~corpus~ dict, return a single string with one line per hit formatted as ~[doc_id] <document text>~, joined by newlines. Those bracketed ids are the citations the LLM will echo.

~~~python
idx = index_corpus(CORPUS)
retrieve("what produces ATP energy in the cell", idx, 3)[0][0]   # "d1"
assemble_context(retrieve("Python language", idx, 2), CORPUS)   # "[d2] ...\n[d5] ..."
~~~

Constraints: pure python (the provided ~embed~ uses ~hashlib~ + ~re~ + ~math~; you only need ~cosine~ and sorting). Because the vectors are already normalized, cosine is just a dot product.

Interview angle: this is RAG stripped to its skeleton — vectorize, score by similarity, assemble a grounded, cited context. The citation format ([doc_id]) is what makes the downstream answer auditable.`,
    starter: String.raw`import hashlib
import math
import re


def embed(text, dim=256):
    """PROVIDED. Deterministic hashing embedding -> normalized dim-vector."""
    vec = [0.0] * dim
    for tok in re.findall(r"[a-z0-9]+", text.lower()):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0 if (h // dim) % 2 == 0 else -1.0
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm > 0 else vec


def cosine(a, b):
    """PROVIDED. Dot product (inputs are already unit-normalized)."""
    return sum(x * y for x, y in zip(a, b))


CORPUS = {
    "d1": "The mitochondria is the powerhouse of the cell and produces ATP energy.",
    "d2": "Python is a programming language created by Guido van Rossum.",
    "d3": "The Great Wall of China is over thirteen thousand miles long.",
    "d4": "Photosynthesis lets plants convert sunlight into chemical energy.",
    "d5": "The speed of light is about three hundred thousand kilometers per second.",
    "d6": "Shakespeare wrote Hamlet, Macbeth, and many other famous plays.",
    "d7": "Water boils at one hundred degrees Celsius at sea level pressure.",
    "d8": "The human heart pumps blood through arteries and veins.",
}


def index_corpus(corpus):
    """Return a list of (doc_id, vector) for every doc in the corpus dict."""
    raise NotImplementedError


def retrieve(query, index, k):
    """Embed query; return top-k (doc_id, score) by cosine, desc (ties by id asc)."""
    raise NotImplementedError


def assemble_context(hits, corpus):
    """Join '[doc_id] text' lines (one per hit) with newlines."""
    raise NotImplementedError`,
    hints: [
      String.raw`index_corpus is a comprehension: [(doc_id, embed(text)) for doc_id, text in corpus.items()].`,
      String.raw`In retrieve, embed the query once, then score with [(doc_id, cosine(qv, vec)) for doc_id, vec in index]. Sort with key=lambda t: (-t[1], t[0]) and slice [:k].`,
      String.raw`assemble_context builds "[" + doc_id + "] " + corpus[doc_id] for each hit and joins them with a newline character.`,
    ],
    solution: String.raw`import hashlib
import math
import re


def embed(text, dim=256):
    vec = [0.0] * dim
    for tok in re.findall(r"[a-z0-9]+", text.lower()):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0 if (h // dim) % 2 == 0 else -1.0
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm > 0 else vec


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))


CORPUS = {
    "d1": "The mitochondria is the powerhouse of the cell and produces ATP energy.",
    "d2": "Python is a programming language created by Guido van Rossum.",
    "d3": "The Great Wall of China is over thirteen thousand miles long.",
    "d4": "Photosynthesis lets plants convert sunlight into chemical energy.",
    "d5": "The speed of light is about three hundred thousand kilometers per second.",
    "d6": "Shakespeare wrote Hamlet, Macbeth, and many other famous plays.",
    "d7": "Water boils at one hundred degrees Celsius at sea level pressure.",
    "d8": "The human heart pumps blood through arteries and veins.",
}


def index_corpus(corpus):
    return [(doc_id, embed(text)) for doc_id, text in corpus.items()]


def retrieve(query, index, k):
    qv = embed(query)
    scored = [(doc_id, cosine(qv, vec)) for doc_id, vec in index]
    scored.sort(key=lambda t: (-t[1], t[0]))
    return scored[:k]


def assemble_context(hits, corpus):
    return "\n".join("[" + doc_id + "] " + corpus[doc_id] for doc_id, _ in hits)`,
    tests: [
      {
        name: "index has one vector per document",
        code: String.raw`idx = index_corpus(CORPUS)
assert len(idx) == 8
assert all(len(vec) == 256 for _, vec in idx)`,
      },
      {
        name: "retrieve returns k results, sorted by descending score",
        code: String.raw`idx = index_corpus(CORPUS)
hits = retrieve("energy in the cell", idx, 3)
assert len(hits) == 3
scores = [s for _, s in hits]
assert scores == sorted(scores, reverse=True), f"not sorted: {scores}"`,
      },
      {
        name: "the objectively right doc surfaces first for three queries",
        code: String.raw`idx = index_corpus(CORPUS)
cases = [("what produces ATP energy in the cell", "d1"),
         ("who created the Python programming language", "d2"),
         ("at what temperature does water boil", "d7")]
for q, want in cases:
    top = retrieve(q, idx, 3)
    assert top[0][0] == want, f"query {q!r} -> {top[0][0]}, expected {want}"`,
      },
      {
        name: "identical text has cosine similarity 1.0 with itself",
        code: String.raw`assert abs(cosine(embed("hello world"), embed("hello world")) - 1.0) < 1e-9`,
      },
      {
        name: "assembled context uses [doc_id] citation format",
        code: String.raw`idx = index_corpus(CORPUS)
ctx = assemble_context(retrieve("Python programming language", idx, 2), CORPUS)
lines = ctx.split("\n")
assert len(lines) == 2, f"expected 2 lines, got {len(lines)}"
assert lines[0].startswith("[d2] "), f"first line should cite d2, got {lines[0]!r}"
assert CORPUS["d2"] in ctx`,
      },
    ],
  };

  W.exercises["w4d5-e3"] = {
    title: "Deduplicate near-identical chunks",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Drop redundant chunks by Jaccard similarity before they crowd the context.",
    description: String.raw`Overlapping chunks and duplicated passages waste context and bias the model. Filter them with a keep-first dedup.

**~jaccard(a, b)~** — Jaccard similarity of two texts on their lowercased word sets: ~|A intersect B| / |A union B|~. Two empty texts count as identical (return 1.0).

**~dedupe_chunks(chunks, jaccard_threshold)~** — iterate ~chunks~ in order, keeping a chunk only if its ~jaccard~ similarity to every already-kept chunk is **strictly below** ~jaccard_threshold~. Preserve original order (keep-first).

~~~python
jaccard("the cat sat", "the cat ran")          # 0.5  ({the,cat} of {the,cat,sat,ran})
dedupe_chunks(["a b c", "a b c"], 0.9)          # ["a b c"]      (exact dup dropped)
dedupe_chunks(["the cat sat", "the cat ran"], 0.4)   # ["the cat sat"]  (0.5 >= 0.4)
dedupe_chunks(["the cat sat", "the cat ran"], 0.6)   # both kept        (0.5 < 0.6)
~~~

Constraints: pure python + ~re~ for tokenizing (~re.findall(r"[a-z0-9]+", text.lower())~).

Interview angle: dedup is a small but real part of context assembly. The keep-first policy and the strict-inequality threshold are the details that make the behavior predictable.`,
    starter: String.raw`import re


def jaccard(a, b):
    """Jaccard similarity of the lowercased word sets of a and b.
    Two empty texts are identical (1.0)."""
    raise NotImplementedError


def dedupe_chunks(chunks, jaccard_threshold):
    """Keep-first dedup: keep a chunk only if its jaccard to every kept chunk
    is strictly below jaccard_threshold. Preserve order."""
    raise NotImplementedError`,
    hints: [
      String.raw`Tokenize to sets with set(re.findall(r"[a-z0-9]+", text.lower())). Jaccard is len(A & B) / len(A | B); handle the empty-union case (both empty) by returning 1.0.`,
      String.raw`For dedupe, keep a running list. For each chunk, add it only if all(jaccard(chunk, kept) < threshold for kept in kept_list).`,
    ],
    solution: String.raw`import re


def _tokens(text):
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def jaccard(a, b):
    sa, sb = _tokens(a), _tokens(b)
    union = sa | sb
    if not union:
        return 1.0
    return len(sa & sb) / len(union)


def dedupe_chunks(chunks, jaccard_threshold):
    kept = []
    for ch in chunks:
        if all(jaccard(ch, k) < jaccard_threshold for k in kept):
            kept.append(ch)
    return kept`,
    tests: [
      {
        name: "jaccard of partially overlapping texts",
        code: String.raw`assert abs(jaccard("the cat sat", "the cat ran") - 0.5) < 1e-9
assert jaccard("a b", "a b") == 1.0
assert jaccard("a b", "c d") == 0.0`,
      },
      {
        name: "two empty texts are identical",
        code: String.raw`assert jaccard("", "") == 1.0`,
      },
      {
        name: "exact duplicates are dropped",
        code: String.raw`assert dedupe_chunks(["a b c", "a b c"], 0.9) == ["a b c"]`,
      },
      {
        name: "threshold decides near-duplicates (strict inequality)",
        code: String.raw`assert dedupe_chunks(["the cat sat", "the cat ran"], 0.4) == ["the cat sat"]
assert dedupe_chunks(["the cat sat", "the cat ran"], 0.6) == ["the cat sat", "the cat ran"]`,
      },
      {
        name: "distinct chunks are all kept, in order",
        code: String.raw`assert dedupe_chunks(["a b", "c d", "e f"], 0.5) == ["a b", "c d", "e f"]`,
      },
      {
        name: "keep-first policy preserves the earliest of duplicates",
        code: String.raw`assert dedupe_chunks(["x y", "z w", "x y"], 0.9) == ["x y", "z w"]`,
      },
    ],
  };

  // ================= Day 6 (homework + boss) =================
  W.days.push({
    id: "w4d6",
    title: "The RAG Design Question",
    minutes: 140,
    blocks: [
      { type: "lesson",   id: "w4d6-lesson", minutes: 15 },
      { type: "quiz",     id: "w4d6-quiz",   minutes: 10 },
      { type: "homework", id: "w4-hw",       minutes: 75 },
      { type: "boss",     id: "w4-boss",     minutes: 40 },
    ],
  });

  W.lessons["w4d6-lesson"] = {
    title: "The RAG Design Question",
    md: String.raw`"Design a document-QA system for our support docs." This is the capstone LLM system-design prompt, and it is graded less on what you build than on how you *think*. Here is the structure that scores.

### Clarify before you architect

Never draw a box until you have asked. Six questions that reshape the whole design:

1. **Corpus size and type** — a thousand PDFs or a hundred million web pages? PDFs, HTML, tables, code?
2. **Update frequency** — static, daily, or streaming? This decides your indexing pipeline.
3. **Query volume and latency budget** — 10 queries/day internal, or 1000 QPS with a 500 ms SLA?
4. **Accuracy vs coverage** — is a wrong answer worse than "I don't know"? (Support: usually yes.)
5. **Citations required?** — regulated or high-trust domains need every claim traceable.
6. **Who are the users** — experts who tolerate jargon, or the public who need refusals and safety?

### A reference architecture

State it as two paths:

~~~text
Ingestion (offline): load -> clean -> structure-aware chunk (~300 tok, ~50 overlap)
                      -> embed (bi-encoder) -> vector index (HNSW) + BM25 index
Serving (online):    query -> rewrite -> hybrid retrieve (dense + BM25, RRF)
                      -> cross-encoder rerank (top-100 -> top-5) -> assemble (dedupe,
                      edge-order) -> grounded generate -> citations -> log for eval
~~~

### Napkin math, out loud

Interviewers love a candidate who estimates. 1M docs at ~5 chunks each = 5M chunks. At 768-dim fp32 that is 768 * 4 = ~3 KB/vector, so ~15 GB of vectors — fits in RAM on one big box; past that you shard or use disk-backed ANN. Latency budget: embed query (~10 ms) + ANN search (~10-50 ms) + rerank 100 candidates (the cross-encoder is the pole, ~50-200 ms) + LLM generation (streaming, hundreds of ms to first token). The rerank and generation dominate; that tells you where to cache and where to cut ~k~.

### The five traps

Name these before the interviewer does:

- **No eval plan.** "We'll eyeball it" fails. Commit to recall@k and MRR for retrieval, faithfulness and answer-relevance for generation, on a frozen labeled set in CI.
- **No reranker.** Bi-encoder recall looks fine but precision@5 is mediocre; a cross-encoder is the cheapest large quality win.
- **Chunking hand-waving.** "We split the docs" is not an answer. State size, overlap, and structure-awareness, and tie them to your corpus.
- **Ignoring updates.** A pipeline with no re-indexing story serves stale answers with total confidence. Describe incremental upserts and deletes.
- **No citation story.** For support/regulated use, unciteable answers are unshippable. Make citations mechanical and enforce grounding.

### 🎤 In interviews, they ask

- "Design document QA over our knowledge base — walk me through it."
- "How would you evaluate it before and after launch?"
- "The corpus updates hourly. What does your indexing pipeline look like?"
- "Where is your latency spent, and what do you cache?"

### TL;DR

- Clarify first: corpus, updates, latency, accuracy-vs-coverage, citations, users.
- Reference design: structure-aware chunking, hybrid retrieval + RRF, cross-encoder rerank, grounded cited generation.
- Do the napkin math on vector storage and per-stage latency; rerank and generation dominate.
- Evaluate retrieval and generation separately, on a frozen set, in CI.
- Avoid the five traps: no eval, no reranker, vague chunking, no update path, no citations.

### Go deeper

- [Anthropic — building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Chip Huyen — RAG system design](https://huyenchip.com)
- [Hugging Face LLM course](https://huggingface.co/learn)`,
  };

  W.quizzes["w4d6-quiz"] = [
    {
      q: String.raw`You are asked to "design document QA for our support docs." What should you do first?`,
      options: [
        "Pick a vector database and start indexing",
        "Clarify corpus size, update frequency, latency, accuracy needs, and citation requirements",
        "Choose the largest available LLM",
        "Fine-tune the model on the support docs",
      ],
      answer: 1,
      explain: String.raw`System-design rounds grade your process. The corpus size, update cadence, latency budget, accuracy-vs-coverage tradeoff, and citation requirement each reshape the architecture, so eliciting them first is the signal interviewers want — jumping straight to a tool is the anti-signal.`,
    },
    {
      q: String.raw`Which is the cheapest large quality win once a bi-encoder retriever is in place?`,
      options: [
        "Doubling the embedding dimension",
        "Switching to a bigger LLM",
        "Adding a cross-encoder reranker over the top candidates",
        "Removing BM25",
      ],
      answer: 2,
      explain: String.raw`Bi-encoder recall is usually fine, but precision@5 is mediocre because query and document are encoded separately. A cross-encoder reranking the top-100 into a top-5 scores them jointly and is the highest-leverage, lowest-effort improvement. Bigger embeddings or LLMs cost far more for less.`,
    },
    {
      q: String.raw`What does this print?

~~~python
chunks = 5_000_000
dims = 768
bytes_per = 4
gb = chunks * dims * bytes_per / (1024 ** 3)
print(round(gb, 1))
~~~`,
      options: [
        "14.3",
        "143.0",
        "1.4",
        "30.5",
      ],
      answer: 0,
      explain: String.raw`5M chunks * 768 dims * 4 bytes is ~15.4 billion bytes, which is 14.3 GiB. That comfortably fits in RAM on one large machine, so sharding is unnecessary at this scale — exactly the napkin-math estimate a design round rewards.`,
    },
    {
      q: String.raw`The corpus updates hourly. What must your design include?`,
      options: [
        "A larger context window",
        "An incremental indexing pipeline with upserts and deletes",
        "A higher temperature at generation time",
        "More few-shot examples",
      ],
      answer: 1,
      explain: String.raw`Freshness is an indexing problem: without incremental upserts (and deletes for removed docs), a perfectly correct retriever serves last hour's answer with full confidence. Context size, temperature, and few-shot examples do nothing for stale data.`,
    },
    {
      q: String.raw`For a regulated support product, why insist on citations?`,
      options: [
        "They make generation faster",
        "They reduce the embedding dimension",
        "They make every claim auditable and catch unsupported statements",
        "They remove the need for retrieval",
      ],
      answer: 2,
      explain: String.raw`Citations tie each claim back to a source passage, so a human (or an automated check) can verify it and flag anything the retrieved context does not support. In regulated or high-trust domains, unciteable answers are simply unshippable. They do not speed up generation or replace retrieval.`,
    },
    {
      q: String.raw`What does this print?

~~~python
hits = [("warranty", 0.9), ("product", 0.7)]
context = "\n".join("[" + d + "] " + str(round(s, 1)) for d, s in hits)
print(context.split("\n")[0])
~~~`,
      options: [
        "warranty 0.9",
        "[warranty]",
        "[product] 0.7",
        "[warranty] 0.9",
      ],
      answer: 3,
      explain: String.raw`The generator builds one "[doc_id] score" line per hit, joined by newlines; splitting on the newline and taking [0] returns the first line, "[warranty] 0.9". That bracketed id is the mechanical citation the LLM echoes so every claim traces back to a source.`,
    },
    {
      q: String.raw`Which is a genuine RAG design trap to call out proactively?`,
      options: [
        "Committing to recall@k and faithfulness metrics",
        "Describing chunk size and overlap explicitly",
        "Planning incremental re-indexing",
        "Hand-waving chunking as just splitting the docs",
      ],
      answer: 3,
      explain: String.raw`Vague chunking ("we split the docs") is a classic trap because chunk size, overlap, and structure-awareness cap retrieval quality more than the embedding model does. The other three options are exactly the good practices that avoid traps: real metrics, explicit chunking, and an update path.`,
    },
  ];

  W.exercises["w4-hw"] = {
    title: "Mini-RAG Engine",
    kind: "homework",
    difficulty: 3,
    xp: 100,
    minutes: 75,
    packages: [],
    brief: "Assemble a hybrid (embedding + BM25) retriever over a toy corpus and answer questions with citations.",
    description: String.raw`Put the week together: build a small but complete RAG engine over a 12-document toy corpus about a fictional company, **Nimbus Robotics**. No ML libraries — the primitives you need are provided; you compose them into a working hybrid retriever.

**Provided in the starter (do not modify):** ~COMPANY_DOCS~ (a dict of 12 ~doc_id -> text~ facts), a ~STOPWORDS~ set, ~tokenize(text)~ (lowercase word tokens with stopwords removed), ~embed(text)~ (a deterministic hashing embedding into a normalized vector), ~cosine(a, b)~, ~build_stats(corpus)~, and ~bm25_score(query_tokens, doc_tokens, stats)~.

**Implement five functions:**

1. **~chunk_doc(text, size, overlap)~** — split ~text~ into word chunks of ~size~ words advancing by ~size - overlap~, keeping the last partial chunk; each chunk is a **string** (words re-joined by a space). Return ~[]~ for empty text. Raise ~ValueError~ unless ~size >= 1~ and ~0 <= overlap < size~.

2. **~build_index(docs, size=40, overlap=10)~** — for every doc, chunk it, and for each chunk store a record ~{"chunk_id", "doc_id", "text", "tokens", "vec"}~ (tokens via ~tokenize~, vec via ~embed~). Return ~{"chunks": [records], "stats": build_stats(all_chunk_token_lists)}~. Give chunks unique ids like ~"c0"~, ~"c1"~, ...

3. **~hybrid_score(cos, bm_norm, alpha=0.5)~** — return ~alpha * cos + (1 - alpha) * bm_norm~.

4. **~search(query, index, k=3, alpha=0.5)~** — for every chunk compute cosine similarity (query vs chunk vec) and BM25 (query tokens vs chunk tokens). **Normalize each score by its max over all chunks** (guard divide-by-zero), combine with ~hybrid_score~, and return the top ~k~ as ~(chunk_record, score)~ pairs sorted by descending score (tie-break by ~chunk_id~).

5. **~answer(query, index, k=3, alpha=0.5)~** — run ~search~ and return ~{"answer": best_chunk_text, "source": best_doc_id, "citations": ["[doc_id]", ...]}~ where citations list the distinct doc ids of the top-k hits in ~[doc_id]~ form, best first.

~~~python
idx = build_index(COMPANY_DOCS)
answer("who is the CEO of Nimbus", idx)["source"]      # "ceo"
answer("how long is the hardware warranty", idx)["citations"][0]   # "[warranty]"
~~~

Constraints: pure python. The normalization is what lets one ~alpha~ fairly balance a cosine (0-1) against a raw BM25 score (unbounded).

Interview angle: this is a RAG system in miniature — chunk, dual-index, hybrid-score, retrieve, and answer with citations. If you can build and explain this, you can whiteboard the real thing.`,
    starter: String.raw`import re
import math
import hashlib
from collections import Counter

COMPANY_DOCS = {
    "about": "Nimbus Robotics is a company founded in 2018 that designs autonomous warehouse robots for logistics.",
    "ceo": "The CEO of Nimbus Robotics is Dr. Elena Vasquez, who co-founded the company and leads its executive team.",
    "hq": "Nimbus Robotics is headquartered in Austin, Texas, with a second engineering office in Berlin.",
    "product": "The flagship product of Nimbus Robotics is the SwiftPick arm, a robotic picker for warehouse shelves.",
    "employees": "As of 2024 Nimbus Robotics employs about 450 people across engineering, sales, and support teams.",
    "funding": "Nimbus Robotics raised a Series B funding round of 60 million dollars led by Horizon Ventures.",
    "refund": "Customers may request a full refund within 30 days of purchase by contacting the billing department.",
    "warranty": "Every SwiftPick arm ships with a two year hardware warranty covering parts and labor.",
    "support": "For technical support, email the help desk and expect a reply within one business day.",
    "mission": "The mission of Nimbus Robotics is to make warehouse automation affordable for small businesses.",
    "battery": "The SwiftPick arm battery lasts eight hours on a single charge and recharges in ninety minutes.",
    "safety": "Nimbus robots use lidar sensors and force limits to operate safely alongside human workers.",
}

STOPWORDS = {
    "the", "a", "an", "is", "are", "of", "to", "in", "for", "and", "on", "with",
    "by", "how", "do", "i", "what", "where", "who", "many", "much", "long",
    "does", "it", "at", "as", "that", "this", "from", "be", "or", "was", "were",
    "can", "my", "you", "your", "we", "our",
}


def tokenize(text):
    """PROVIDED. Lowercase word tokens with stopwords removed."""
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS]


def embed(text, dim=256):
    """PROVIDED. Deterministic hashing embedding -> normalized vector."""
    vec = [0.0] * dim
    for tok in tokenize(text):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0 if (h // dim) % 2 == 0 else -1.0
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm > 0 else vec


def cosine(a, b):
    """PROVIDED. Dot product of two already-normalized vectors."""
    return sum(x * y for x, y in zip(a, b))


def build_stats(corpus):
    """PROVIDED. corpus is a list of token-lists -> BM25 statistics."""
    N = len(corpus)
    df = {}
    total_len = 0
    for doc in corpus:
        total_len += len(doc)
        for tok in set(doc):
            df[tok] = df.get(tok, 0) + 1
    return {"N": N, "df": df, "avgdl": total_len / N if N else 0.0}


def bm25_score(query_tokens, doc_tokens, stats, k1=1.5, b=0.75):
    """PROVIDED. BM25 score of one document against a query."""
    N, df, avgdl = stats["N"], stats["df"], stats["avgdl"]
    dl = len(doc_tokens)
    tf = Counter(doc_tokens)
    score = 0.0
    for t in query_tokens:
        f = tf.get(t, 0)
        if f == 0:
            continue
        d_t = df.get(t, 0)
        idf = math.log(1 + (N - d_t + 0.5) / (d_t + 0.5))
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avgdl))
    return score


# ---------- implement below ----------

def chunk_doc(text, size, overlap):
    """Split text into size-word chunks (strings), advancing by size - overlap."""
    raise NotImplementedError


def build_index(docs, size=40, overlap=10):
    """Return {"chunks": [record...], "stats": bm25_stats}."""
    raise NotImplementedError


def hybrid_score(cos, bm_norm, alpha=0.5):
    """alpha * cos + (1 - alpha) * bm_norm."""
    raise NotImplementedError


def search(query, index, k=3, alpha=0.5):
    """Top-k (chunk_record, score) by normalized hybrid cosine + BM25."""
    raise NotImplementedError


def answer(query, index, k=3, alpha=0.5):
    """{"answer": text, "source": doc_id, "citations": ["[doc_id]", ...]}."""
    raise NotImplementedError`,
    hints: [
      String.raw`chunk_doc mirrors day 4's chunk_words but joins each word slice back into a string: " ".join(words[i:i+size]). Validate size and overlap the same way, and return [] for empty text.`,
      String.raw`build_index loops docs.items(); for each chunk from chunk_doc, append a dict with a running "c" + str(i) id, doc_id, text, tokens=tokenize(text), vec=embed(text). Collect the token lists and pass them to build_stats for the "stats" field.`,
      String.raw`In search, gather all cosines and all BM25 scores first so you can divide each by its max (guard max == 0 -> contribute 0). Build (record, hybrid_score(cos_n, bm_n, alpha)) tuples, then sorted(..., key=lambda t: (-t[1], t[0]["chunk_id"]))[:k].`,
      String.raw`answer calls search, takes the top hit's text and doc_id, and builds citations by walking the hits and appending "[" + doc_id + "]" once per distinct doc, best first.`,
    ],
    solution: String.raw`import re
import math
import hashlib
from collections import Counter

COMPANY_DOCS = {
    "about": "Nimbus Robotics is a company founded in 2018 that designs autonomous warehouse robots for logistics.",
    "ceo": "The CEO of Nimbus Robotics is Dr. Elena Vasquez, who co-founded the company and leads its executive team.",
    "hq": "Nimbus Robotics is headquartered in Austin, Texas, with a second engineering office in Berlin.",
    "product": "The flagship product of Nimbus Robotics is the SwiftPick arm, a robotic picker for warehouse shelves.",
    "employees": "As of 2024 Nimbus Robotics employs about 450 people across engineering, sales, and support teams.",
    "funding": "Nimbus Robotics raised a Series B funding round of 60 million dollars led by Horizon Ventures.",
    "refund": "Customers may request a full refund within 30 days of purchase by contacting the billing department.",
    "warranty": "Every SwiftPick arm ships with a two year hardware warranty covering parts and labor.",
    "support": "For technical support, email the help desk and expect a reply within one business day.",
    "mission": "The mission of Nimbus Robotics is to make warehouse automation affordable for small businesses.",
    "battery": "The SwiftPick arm battery lasts eight hours on a single charge and recharges in ninety minutes.",
    "safety": "Nimbus robots use lidar sensors and force limits to operate safely alongside human workers.",
}

STOPWORDS = {
    "the", "a", "an", "is", "are", "of", "to", "in", "for", "and", "on", "with",
    "by", "how", "do", "i", "what", "where", "who", "many", "much", "long",
    "does", "it", "at", "as", "that", "this", "from", "be", "or", "was", "were",
    "can", "my", "you", "your", "we", "our",
}


def tokenize(text):
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS]


def embed(text, dim=256):
    vec = [0.0] * dim
    for tok in tokenize(text):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0 if (h // dim) % 2 == 0 else -1.0
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm > 0 else vec


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))


def build_stats(corpus):
    N = len(corpus)
    df = {}
    total_len = 0
    for doc in corpus:
        total_len += len(doc)
        for tok in set(doc):
            df[tok] = df.get(tok, 0) + 1
    return {"N": N, "df": df, "avgdl": total_len / N if N else 0.0}


def bm25_score(query_tokens, doc_tokens, stats, k1=1.5, b=0.75):
    N, df, avgdl = stats["N"], stats["df"], stats["avgdl"]
    dl = len(doc_tokens)
    tf = Counter(doc_tokens)
    score = 0.0
    for t in query_tokens:
        f = tf.get(t, 0)
        if f == 0:
            continue
        d_t = df.get(t, 0)
        idf = math.log(1 + (N - d_t + 0.5) / (d_t + 0.5))
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avgdl))
    return score


def chunk_doc(text, size, overlap):
    if size <= 0 or not (0 <= overlap < size):
        raise ValueError("need size >= 1 and 0 <= overlap < size")
    words = text.split()
    if not words:
        return []
    step = size - overlap
    chunks = []
    i = 0
    n = len(words)
    while i < n:
        chunks.append(" ".join(words[i:i + size]))
        if i + size >= n:
            break
        i += step
    return chunks


def build_index(docs, size=40, overlap=10):
    chunks = []
    token_lists = []
    cid = 0
    for doc_id, text in docs.items():
        for ctext in chunk_doc(text, size, overlap):
            toks = tokenize(ctext)
            chunks.append({
                "chunk_id": "c" + str(cid),
                "doc_id": doc_id,
                "text": ctext,
                "tokens": toks,
                "vec": embed(ctext),
            })
            token_lists.append(toks)
            cid += 1
    return {"chunks": chunks, "stats": build_stats(token_lists)}


def hybrid_score(cos, bm_norm, alpha=0.5):
    return alpha * cos + (1 - alpha) * bm_norm


def search(query, index, k=3, alpha=0.5):
    q_tokens = tokenize(query)
    q_vec = embed(query)
    chunks = index["chunks"]
    stats = index["stats"]
    coss = [cosine(q_vec, c["vec"]) for c in chunks]
    bms = [bm25_score(q_tokens, c["tokens"], stats) for c in chunks]
    max_cos = max(coss) if coss else 0.0
    max_bm = max(bms) if bms else 0.0
    results = []
    for c, cos, bm in zip(chunks, coss, bms):
        cn = cos / max_cos if max_cos > 0 else 0.0
        bn = bm / max_bm if max_bm > 0 else 0.0
        results.append((c, hybrid_score(cn, bn, alpha)))
    results.sort(key=lambda t: (-t[1], t[0]["chunk_id"]))
    return results[:k]


def answer(query, index, k=3, alpha=0.5):
    hits = search(query, index, k=k, alpha=alpha)
    if not hits:
        return {"answer": "", "source": None, "citations": []}
    best = hits[0][0]
    citations = []
    for c, _ in hits:
        cite = "[" + c["doc_id"] + "]"
        if cite not in citations:
            citations.append(cite)
    return {"answer": best["text"], "source": best["doc_id"], "citations": citations}`,
    tests: [
      {
        name: "chunk_doc splits words into strings, keeping the last partial",
        code: String.raw`assert chunk_doc("a b c d e", 2, 0) == ["a b", "c d", "e"]
assert chunk_doc("one two three four", 3, 1) == ["one two three", "three four"]`,
      },
      {
        name: "chunk_doc handles empty text and rejects bad overlap",
        code: String.raw`assert chunk_doc("", 5, 2) == []
try:
    chunk_doc("a b c", 3, 3)
    assert False, "overlap == size must raise"
except ValueError:
    pass`,
      },
      {
        name: "build_index produces one stats row per chunk",
        code: String.raw`idx = build_index(COMPANY_DOCS, size=40, overlap=10)
assert len(idx["chunks"]) >= 12, f"expected >=12 chunks, got {len(idx['chunks'])}"
assert idx["stats"]["N"] == len(idx["chunks"])`,
      },
      {
        name: "each chunk record carries tokens and an embedding",
        code: String.raw`idx = build_index(COMPANY_DOCS)
rec = idx["chunks"][0]
assert set(["chunk_id", "doc_id", "text", "tokens", "vec"]).issubset(rec.keys())
assert isinstance(rec["tokens"], list) and len(rec["vec"]) == 256`,
      },
      {
        name: "hybrid_score interpolates cosine and normalized BM25",
        code: String.raw`assert abs(hybrid_score(1.0, 0.0, 0.5) - 0.5) < 1e-9
assert abs(hybrid_score(0.0, 1.0, 0.25) - 0.75) < 1e-9
assert abs(hybrid_score(0.8, 0.4, 1.0) - 0.8) < 1e-9`,
      },
      {
        name: "answer routes a CEO question to the ceo doc",
        code: String.raw`idx = build_index(COMPANY_DOCS)
a = answer("who is the CEO of Nimbus", idx)
assert a["source"] == "ceo", f"got {a['source']}"
assert a["citations"][0] == "[ceo]", f"got {a['citations']}"`,
      },
      {
        name: "answer routes a refund question to the refund doc",
        code: String.raw`idx = build_index(COMPANY_DOCS)
a = answer("how do I request a refund", idx)
assert a["source"] == "refund", f"got {a['source']}"`,
      },
      {
        name: "answer routes a warranty question with correct citation format",
        code: String.raw`idx = build_index(COMPANY_DOCS)
a = answer("how long is the hardware warranty", idx)
assert a["source"] == "warranty", f"got {a['source']}"
assert a["citations"][0] == "[warranty]", f"got {a['citations']}"`,
      },
      {
        name: "battery and funding questions hit their objectively right docs",
        code: String.raw`idx = build_index(COMPANY_DOCS)
assert answer("how long does the battery last", idx)["source"] == "battery"
assert answer("how much funding was raised", idx)["source"] == "funding"`,
      },
      {
        name: "search returns k results and hybrid surfaces the warranty chunk",
        code: String.raw`idx = build_index(COMPANY_DOCS)
assert len(search("warehouse robot", idx, k=3)) == 3
res = search("SwiftPick arm warranty", idx, k=2, alpha=0.5)
assert res[0][0]["doc_id"] == "warranty", f"got {res[0][0]['doc_id']}"`,
      },
    ],
  };

  W.exercises["w4-boss-t1"] = {
    title: "Nucleus (top-p) sampling",
    kind: "boss",
    difficulty: 3,
    xp: 40,
    minutes: 25,
    packages: ["numpy"],
    brief: "The full decoder move: softmax, nucleus truncation, renormalize, and sample.",
    description: String.raw`The boss build: implement nucleus sampling end to end, the default sampler behind most chat APIs.

**~nucleus_sample(logits, p, rng)~** — given raw ~logits~, a nucleus threshold ~p~, and a ~numpy.random.Generator~ ~rng~:

1. Convert logits to probabilities with a **numerically stable softmax** (subtract the max first).
2. Keep the **smallest set of tokens whose cumulative probability reaches ~p~** (sorted descending), *including* the boundary token that crosses ~p~.
3. Zero the rest and **renormalize** the kept probabilities to sum to 1.
4. Sample one token index with ~rng.choice~ and return it as a Python ~int~.

~~~python
rng = np.random.default_rng(0)
nucleus_sample(np.array([0.0, 0.0, 10.0]), 0.9, rng)   # 2 (mass collapses there)
nucleus_sample(np.array([1.0, 2.0, 3.0]), 0.05, rng)   # 2 (tiny p -> only the argmax)
~~~

Constraints: numpy only. The softmax must not overflow for large logits, and the nucleus must include the boundary token but never a token beyond it (guard the floating-point cutoff).

Interview angle: this ties the whole "logits to token" story together — stability, the inclusive top-p boundary, renormalization, and seeded sampling. It is the single most complete "do you actually understand decoding?" exercise.`,
    starter: String.raw`import numpy as np


def nucleus_sample(logits, p, rng):
    """Stable softmax -> top-p nucleus (boundary included) -> renormalize ->
    sample one index with rng.choice. Return a Python int."""
    raise NotImplementedError`,
    hints: [
      String.raw`Stable softmax: z = logits - logits.max(); probs = exp(z) / exp(z).sum(). Then sort probs descending via order = np.argsort(probs)[::-1].`,
      String.raw`Take the cumulative sum of the sorted probs. The number to keep is (how many cumulative values are still below p) + 1 — the +1 keeps the boundary token that crosses p. Use n_keep = int(np.sum(cum < p - 1e-9)) + 1 to dodge floating-point off-by-one.`,
      String.raw`Build a boolean mask over the kept original indices, zero the rest, divide by the kept sum to renormalize, then return int(rng.choice(len(probs), p=renormalized)).`,
    ],
    solution: String.raw`import numpy as np


def _softmax(logits):
    z = np.asarray(logits, dtype=float)
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def nucleus_sample(logits, p, rng):
    probs = _softmax(logits)
    order = np.argsort(probs)[::-1]
    sorted_p = probs[order]
    cum = np.cumsum(sorted_p)
    n_keep = int(np.sum(cum < p - 1e-9)) + 1
    n_keep = min(n_keep, probs.size)
    keep = order[:n_keep]
    mask = np.zeros(probs.shape, dtype=bool)
    mask[keep] = True
    filtered = np.where(mask, probs, 0.0)
    filtered = filtered / filtered.sum()
    return int(rng.choice(probs.size, p=filtered))`,
    tests: [
      {
        name: "a peaked distribution always samples the top token",
        code: String.raw`import numpy as np
rng = np.random.default_rng(0)
for _ in range(50):
    assert nucleus_sample(np.array([0.0, 0.0, 10.0]), 0.9, rng) == 2`,
      },
      {
        name: "tiny p keeps only the argmax (deterministic)",
        code: String.raw`import numpy as np
rng = np.random.default_rng(1)
for _ in range(50):
    assert nucleus_sample(np.array([1.0, 2.0, 3.0]), 0.05, rng) == 2`,
      },
      {
        name: "same seed gives the same draw (reproducible)",
        code: String.raw`import numpy as np
logits = np.array([1.0, 0.5, 0.2, 2.0])
a = nucleus_sample(logits, 0.9, np.random.default_rng(9))
b = nucleus_sample(logits, 0.9, np.random.default_rng(9))
assert a == b, f"same seed must match, got {a} vs {b}"`,
      },
      {
        name: "tokens outside the nucleus are never sampled",
        code: String.raw`import numpy as np
rng = np.random.default_rng(2)
# softmax([2,1,0]) with p=0.9 keeps the top 2 tokens; index 2 is excluded
seen = set(nucleus_sample(np.array([2.0, 1.0, 0.0]), 0.9, rng) for _ in range(5000))
assert seen == {0, 1}, f"expected only {{0,1}}, saw {seen}"`,
      },
      {
        name: "the returned value is a valid Python int index",
        code: String.raw`import numpy as np
rng = np.random.default_rng(3)
out = nucleus_sample(np.array([0.5, 1.5, 0.5, 0.5]), 0.8, rng)
assert isinstance(out, int) and 0 <= out < 4, f"got {out!r}"`,
      },
    ],
  };

  W.boss = {
    id: "w4-boss",
    title: "T4+T5 — LLM & RAG",
    timeLimitMin: 35,
    passPct: 70,
    intro: String.raw`Fourteen questions across the whole week — decoding internals, KV cache, LoRA and quantization, prompting and evals, chunking, BM25, hybrid retrieval, and grounded generation — then one capstone build: nucleus sampling from scratch. Clear 70% to claim the T4+T5 badge.`,
    quiz: [
      {
        q: String.raw`What does this print?

~~~python
def kv_mb(layers, heads, head_dim, seq, b):
    return 2 * layers * heads * head_dim * seq * b / (1024 * 1024)
print(kv_mb(32, 32, 128, 4096, 2))
~~~`,
        options: [
          "1024.0",
          "2048.0",
          "4096.0",
          "512.0",
        ],
        answer: 1,
        explain: String.raw`2 * 32 * 32 * 128 * 4096 * 2 = 2,147,483,648 bytes, and dividing by 1024*1024 gives 2048.0 MiB — about 2 GB of KV cache for a single 4k-token sequence. This one number is why long-context serving is memory-bound.`,
      },
      {
        q: String.raw`How does top-p (nucleus) sampling choose which tokens to keep?`,
        options: [
          "It keeps a fixed number k of the highest-probability tokens",
          "It keeps every token above a fixed probability value",
          "It keeps the smallest set whose cumulative probability reaches p",
          "It keeps tokens at random weighted by temperature",
        ],
        answer: 2,
        explain: String.raw`Nucleus sampling sorts tokens by probability and keeps the smallest prefix whose cumulative mass reaches p, including the boundary token. That makes the cutoff adaptive: a confident distribution keeps 1-2 tokens, a flat one keeps many. Top-k, by contrast, always keeps a fixed count.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import numpy as np
def softmax(z):
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()
p = softmax(np.array([1.0, 1.0, 1.0]) / 0.5)
print(round(float(p[0]), 3))
~~~`,
        options: [
          "0.333",
          "0.5",
          "0.667",
          "1.0",
        ],
        answer: 0,
        explain: String.raw`When all logits are equal, temperature scaling leaves them equal, so the softmax is uniform: 1/3 for each of three tokens, i.e. 0.333. Temperature only changes the *relative* sharpness of differing logits; with identical logits there is nothing to sharpen.`,
      },
      {
        q: String.raw`Which statement about LoRA is true?`,
        options: [
          "It quantizes the base model to 4 bits",
          "It updates every weight at reduced precision",
          "It replaces attention with a low-rank approximation",
          "It freezes the base weights and trains small low-rank matrices A and B",
        ],
        answer: 3,
        explain: String.raw`LoRA leaves the pretrained weights frozen and learns a low-rank update A @ B beside targeted matrices, training well under 1% of the parameters. Quantizing the base is a separate technique (combine them and you get QLoRA); LoRA does not touch precision or replace attention.`,
      },
      {
        q: String.raw`What does this print?

~~~python
d, r = 2048, 8
pct = 100 * (r * 2 * d) / (d * d)
print(round(pct, 2))
~~~`,
        options: [
          "7.8",
          "1.56",
          "0.78",
          "0.39",
        ],
        answer: 2,
        explain: String.raw`A LoRA adapter on a square (d, d) matrix has r * 2d trainable params, so the fraction is (8 * 2 * 2048) / (2048 * 2048) = 0.0078, or 0.78%. The reduction is d/(2r) = 128x — the headline "fine-tune under one percent of the weights" claim.`,
      },
      {
        q: String.raw`In symmetric int8 quantization, dequantizing recovers a weight as:`,
        options: [
          "q + scale",
          "q / scale",
          "q - 127",
          "q * scale, with worst-case error scale/2",
        ],
        answer: 3,
        explain: String.raw`Quantizing is q = round(w / scale) with scale = max(|w|)/127; dequantizing is the inverse, w_hat = q * scale. Because rounding shifts each value by at most half a step, the reconstruction error is bounded by scale/2. It is a lossy but predictably-bounded compression.`,
      },
      {
        q: String.raw`What lets QLoRA fine-tune a 65B model on a single GPU?`,
        options: [
          "It trains only the embedding layer",
          "It skips the alignment stage",
          "The base is loaded in 4-bit and only small fp16 LoRA adapters carry gradients",
          "It uses a smaller vocabulary",
        ],
        answer: 2,
        explain: String.raw`QLoRA quantizes the frozen base to 4-bit (cutting its footprint roughly 4x) and trains standard LoRA adapters in higher precision on top, so gradients and optimizer state exist only for the tiny adapters. That combination is what fits a 65B fine-tune on one 48 GB card.`,
      },
      {
        q: String.raw`Your facts change weekly and answers must cite sources. Which approach fits best?`,
        options: [
          "RAG with a re-indexing pipeline and citations",
          "Fine-tune the base model every week",
          "Rely on the model's pretraining knowledge",
          "Raise the sampling temperature",
        ],
        answer: 0,
        explain: String.raw`Changing facts plus a citation requirement is the canonical RAG case: re-index the changed docs and retrieve per query, returning passages you can cite. Weekly fine-tuning is slow and does not produce citations; pretraining knowledge goes stale; temperature is irrelevant to factuality.`,
      },
      {
        q: String.raw`What does this print?

~~~python
def chunk(words, size, overlap):
    step = size - overlap
    out, i, n = [], 0, len(words)
    while i < n:
        out.append(words[i:i + size])
        if i + size >= n:
            break
        i += step
    return out
print(len(chunk(list(range(12)), 5, 2)))
~~~`,
        options: [
          "6",
          "5",
          "3",
          "4",
        ],
        answer: 3,
        explain: String.raw`Step = 5 - 2 = 3, so chunks start at 0, 3, 6, 9. The chunk starting at 9 spans indices 9-11 and reaches the end (9 + 5 >= 12), so the loop stops there: 4 chunks. The stop-at-end check prevents an extra tiny trailing chunk.`,
      },
      {
        q: String.raw`In BM25, what does the k1 parameter control?`,
        options: [
          "The number of documents retrieved",
          "How quickly term-frequency saturates",
          "The embedding dimension",
          "The size of the vocabulary",
        ],
        answer: 1,
        explain: String.raw`k1 (default ~1.5) governs term-frequency saturation: more occurrences of a query term raise the score with diminishing returns, so a word appearing 10 times is not 10x a single occurrence. The separate b parameter controls document-length normalization. Neither touches retrieval count or embeddings.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import math
N, df = 100, 1
print(round(math.log(1 + (N - df + 0.5) / (df + 0.5)), 2))
~~~`,
        options: [
          "4.21",
          "0.0",
          "-4.21",
          "2.0",
        ],
        answer: 0,
        explain: String.raw`idf = ln(1 + (100 - 1 + 0.5)/(1 + 0.5)) = ln(1 + 66.33) = ln(67.33) = 4.21. A term in just 1 of 100 docs is highly discriminative, so its idf is large. The "1 +" inside the log keeps this BM25 idf variant positive even for common terms.`,
      },
      {
        q: String.raw`Why does hybrid search fuse dense and BM25 results by reciprocal rank rather than by adding scores?`,
        options: [
          "Adding scores is computationally impossible",
          "Cosine and BM25 scores live on different, uncalibrated scales",
          "Reciprocal rank makes the search exact",
          "It lets you drop one of the two retrievers",
        ],
        answer: 1,
        explain: String.raw`A cosine of 0.3 and a BM25 score of 12 are not comparable, so summing them lets one retriever dominate arbitrarily. Reciprocal rank fusion uses only positions — 1/(k + rank) — so magnitude never matters and a doc ranked high by either retriever rises. It fuses, it does not replace, retrievers.`,
      },
      {
        q: String.raw`What is the fix for "lost-in-the-middle" when assembling a long context?`,
        options: [
          "Increase the model temperature",
          "Embed the query with a larger model",
          "Add more chunks to be safe",
          "Put the strongest passages at the start and end of the context",
        ],
        answer: 3,
        explain: String.raw`Models recall content at the edges of a long context better than material in the middle, so you place your most relevant retrieved passages first and last, and keep the context tight. Piling on more chunks makes it worse; temperature and embedding size are unrelated to positional recall.`,
      },
      {
        q: String.raw`A candidate says "we added RAG, so the model can't hallucinate anymore." What is wrong?`,
        options: [
          "RAG has no effect on hallucination",
          "RAG only works with fine-tuning",
          "RAG reduces hallucination but the model can still ignore or misread the context",
          "RAG increases hallucination by adding noise",
        ],
        answer: 2,
        explain: String.raw`Grounding in retrieved text is the strongest single lever against hallucination, but it is not absolute: the model can still misread a passage, blend in prior knowledge, or answer when the context does not actually support it. That residual risk is exactly why citations, grounding instructions, and verification stay in the pipeline.`,
      },
    ],
    tasks: ["w4-boss-t1"],
  };
})();
