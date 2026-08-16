/* ML Quest — Week 3: NLP & Transformers */
(function () {
  const W = {
    num: 3,
    id: "w3",
    emoji: "🤖",
    title: "NLP & Transformers",
    subtitle: "From bag-of-words to attention",
    goal: "Explain the transformer stack from tokenizer to logits — and implement its core math.",
    days: [],
    lessons: {},
    quizzes: {},
    exercises: {},
    boss: null,
  };
  CourseData.weeks.push(W);

  // ================= Day 1 =================
  W.days.push({
    id: "w3d1",
    title: "From Raw Text to Features",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w3d1-lesson", minutes: 25 },
      { type: "quiz",     id: "w3d1-quiz",   minutes: 12 },
      { type: "exercise", id: "w3d1-e1",     minutes: 25 },
      { type: "exercise", id: "w3d1-e2",     minutes: 35 },
      { type: "exercise", id: "w3d1-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "nlp", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w3d1-lesson"] = {
    title: "From Raw Text to Features",
    md: String.raw`Half of all NLP screening interviews open with a deceptively humble question: how do you turn text into numbers? Nail the classic pipeline — tokenize, normalize, vectorize — and you sound like someone who shipped search or spam filters before transformers were cool. Fumble it, and no amount of GPT trivia will save you, because every modern model still starts exactly here.

### The classic pipeline

Every text system, from 1998 spam filters to GPT-4 preprocessing, runs some version of this:

~~~text
raw text -> tokenize -> normalize -> vectorize -> model
~~~

Each arrow is a design decision that throws information away on purpose. Good NLP engineering is knowing *which* information you can afford to lose. Lowercasing loses "US" vs "us". Removing punctuation loses "great!" vs "great?". The interview skill is naming the tradeoff, not reciting the steps.

### Tokenization: three levels

- **Word-level**: split on whitespace/punctuation. Simple, but the vocabulary explodes (English easily hits 300k+ types) and any unseen word becomes ~UNK~ — the out-of-vocabulary (OOV) problem.
- **Character-level**: ~26-100~ symbols, zero OOV, but sequences get 5x longer and the model must learn spelling before semantics.
- **Subword-level** (BPE, WordPiece): the modern compromise — a fixed vocab of ~30k-50k~ pieces, frequent words stay whole, rare words split into parts. This is what BERT and GPT use; we implement it on day 5.

A practical word tokenizer is one regex away:

~~~python
import re

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

tokenize("Cats can't stop won't stop!")
# ['cats', 'can', 't', 'stop', 'won', 't', 'stop']
~~~

### Normalization: what to keep, what to burn

- **Lowercasing**: almost always helps for topic tasks; hurts when case carries meaning (NER: "Apple" the company vs "apple" the fruit).
- **Stemming** (Porter): rule-based suffix chopping — fast, crude, produces non-words ("studies" -> "studi").
- **Lemmatization**: dictionary + part-of-speech aware — returns real dictionary forms ("better" -> "good"), slower, needs linguistic resources.
- **Stopword removal**: kills high-frequency glue words ("the", "is"). Great for topic classification, *catastrophic* for sentiment — "not good" becomes "good". Rule of thumb: never remove stopwords when negation, style, or word order matters.

### Bag-of-words, n-grams, and the sparsity tax

Bag-of-words (BoW) represents a document as token counts and forgets order entirely: "dog bites man" == "man bites dog". You buy back local order with **n-grams** — contiguous token windows. Bigrams of "the cat sat" are "the cat" and "cat sat". Cost: an n-gram vocabulary grows roughly with corpus size squared, and your vectors get extremely **sparse**. A 20-word email over a 50k vocabulary fills 0.04% of its vector; storing dense arrays would be insane, which is why classic NLP lives on dict-like sparse structures (and scipy sparse matrices in production).

### TF-IDF: the exact math

Raw counts let "the" dominate every document. TF-IDF rescales: a term matters if it is frequent *in this document* but rare *across documents*. We use the smoothed variant (this exact formula powers today's exercise, and it matches scikit-learn's ~smooth_idf~ up to normalization):

~~~text
tf(t, d)  = count(t, d) / len(d)          # term share of the document
idf(t)    = ln((1 + N) / (1 + df(t))) + 1  # N docs total, df = docs containing t
tfidf(t, d) = tf(t, d) * idf(t)
~~~

The ~1 +~ inside the log is smoothing: it pretends one extra document exists that contains every term, so ~df = 0~ can never divide by zero. The ~+ 1~ outside keeps terms that appear in *every* document (idf would be ~ln(1) = 0~) from being erased completely — they get weight 1.0 instead of 0.

Worked example with ~N = 2~ docs, ~d0 = "cat sat"~, ~d1 = "dog sat"~: for "cat", ~tf = 1/2~, ~df = 1~, ~idf = ln(3/2) + 1 = 1.405~, weight ~0.703~. For "sat", ~df = 2~, ~idf = ln(3/3) + 1 = 1.0~, weight ~0.5~. The rarer word wins.

### Comparing documents: cosine similarity

Two documents of wildly different lengths can be about the same thing. Euclidean distance punishes length; cosine ignores it by measuring the *angle*:

~~~text
cos(a, b) = (a . b) / (|a| * |b|)     # 1 = same direction, 0 = orthogonal
~~~

For non-negative TF-IDF vectors cosine lives in [0, 1]. Doubling every count in a document leaves its cosine to anything unchanged — exactly the invariance you want for text.

### ⚠️ Common pitfalls

- Removing stopwords before sentiment analysis and silently deleting "not", "no", "never".
- Fitting TF-IDF (vocabulary + df counts) on train+test together — that leaks test statistics; fit on train, transform test.
- Forgetting idf smoothing and crashing on unseen terms with ~df = 0~.
- Comparing raw count vectors with euclidean distance, so long documents look "far" from short ones about the same topic.
- Assuming word tokenization is trivial for all languages — Chinese has no spaces, German glues compounds together.

### 🎤 In interviews, they ask

- Walk me through turning a corpus of support tickets into features for a classifier.
- Why TF-IDF over raw counts? What does the log in idf do?
- When would stopword removal hurt? When does lowercasing hurt?
- Stemming vs lemmatization — tradeoffs, and when do you skip both?
- Why cosine similarity instead of euclidean distance for documents?

### TL;DR

- Pipeline: tokenize -> normalize -> vectorize; every step deletes information on purpose.
- Word tokens = OOV pain, char tokens = long sequences, subwords = the modern middle ground.
- BoW forgets order; n-grams buy some back at an exponential vocabulary cost.
- ~tfidf = tf * idf~ with ~idf = ln((1+N)/(1+df)) + 1~ — frequent-here, rare-everywhere wins.
- Vectors are sparse: dict-based or scipy-sparse, never dense 50k-wide arrays.
- Cosine similarity compares direction, not length — the right metric for text.

### Go deeper

- [scikit-learn: text feature extraction](https://scikit-learn.org/stable/modules/feature_extraction.html)
- [Hugging Face NLP course — chapter 1](https://huggingface.co/learn/nlp-course)
- [Sebastian Raschka's blog — ML and NLP fundamentals](https://sebastianraschka.com/blog/)
`,
  };

  W.quizzes["w3d1-quiz"] = [
    {
      q: String.raw`What does the idf term in TF-IDF actually accomplish?`,
      options: [
        "It boosts words that appear in many documents, since they are clearly important",
        "It down-weights words that appear in many documents, so corpus-wide glue words stop dominating",
        "It normalizes each document vector to unit length",
        "It removes stopwords from the vocabulary automatically",
      ],
      answer: 1,
      explain: String.raw`idf = ln((1+N)/(1+df)) + 1 shrinks as df grows: a word in every document gets idf 1.0 (the floor), a rare word gets a large multiplier. It is a soft, data-driven alternative to a hand-made stopword list. Normalization is a separate step, and nothing is removed — just re-weighted.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import re
text = "Cats CATS cat's cat-like"
print(re.findall(r"[a-z]+", text.lower()))
~~~`,
      options: [
        "['cats', 'cats', 'cat', 's', 'cat', 'like']",
        "['cats', 'cats', \"cat's\", 'cat-like']",
        "['cats', 'cat', 'cat', 'like']",
        "It raises a re.error because of the apostrophe",
      ],
      answer: 0,
      explain: String.raw`After lower(), the regex [a-z]+ matches maximal runs of letters only, so the apostrophe and hyphen act as separators: cat's splits into cat and s, cat-like into cat and like. Nothing deduplicates, so both cats survive. This is exactly why tokenizer regex choices are a real design decision.`,
    },
    {
      q: String.raw`Which statement about stemming vs lemmatization is correct?`,
      options: [
        "Stemming uses a dictionary of valid words; lemmatization chops suffixes with rules",
        "Both always return valid dictionary words, they just differ in speed",
        "Stemming chops suffixes with crude rules and may produce non-words; lemmatization uses vocabulary and morphology to return dictionary forms",
        "Lemmatization only works on verbs, stemming on nouns",
      ],
      answer: 2,
      explain: String.raw`Porter-style stemmers apply mechanical suffix rules, happily producing studi from studies — fast but crude. A lemmatizer maps better to good using a vocabulary and part-of-speech info, which is slower and resource-hungry. In interviews, mention that subword tokenization has made both largely optional in the transformer era.`,
    },
    {
      q: String.raw`For which task is aggressive stopword removal most likely to HURT accuracy?`,
      options: [
        "Topic classification of long news articles",
        "Clustering documents by broad subject",
        "Keyword-based document retrieval",
        "Sentiment analysis of short reviews",
      ],
      answer: 3,
      explain: String.raw`Stopword lists usually contain not, no, never — the very tokens that flip sentiment polarity. In a 10-word review, deleting them turns 'not good at all' into 'good'. Topic tasks over long documents barely notice, because topical content words dominate the signal there.`,
    },
    {
      q: String.raw`Using tf = count/len_doc and idf = ln((1+N)/(1+df)) + 1, what is the TF-IDF weight of "sat" in doc 0?

~~~python
docs = ["cat sat", "dog sat"]
~~~`,
      options: [
        "0.0, because it appears in every document",
        "0.5, because tf = 1/2 and idf = ln(3/3) + 1 = 1.0",
        "1.0, because tf = 1 and idf = 1",
        "0.703, because idf = ln(3/2) + 1",
      ],
      answer: 1,
      explain: String.raw`With N = 2 and df("sat") = 2, idf = ln(3/3) + 1 = 0 + 1 = 1.0 — the +1 floor keeps everywhere-words at weight 1 instead of erasing them. tf = 1 occurrence / 2 tokens = 0.5, so the weight is 0.5. The 0.703 value belongs to "cat", which is rarer (df = 1).`,
    },
    {
      q: String.raw`What does this print?

~~~python
tokens = ["the", "cat", "sat"]
grams = [" ".join(tokens[i:i+2]) for i in range(len(tokens) - 1)]
print(grams)
~~~`,
      options: [
        "['the', 'cat', 'sat']",
        "['the cat sat']",
        "['the cat', 'cat sat']",
        "[('the', 'cat'), ('cat', 'sat')]",
      ],
      answer: 2,
      explain: String.raw`The loop slides a window of size 2 over the tokens: indices 0..1 and 1..2, joined with spaces into strings. That is exactly a bigram extractor — n-grams recover local word order that bag-of-words throws away, at the price of a much larger vocabulary.`,
    },
    {
      q: String.raw`Documents a = [2, 0, 4] and b = [4, 0, 8] (b is a with every count doubled). What is their cosine similarity?`,
      options: [
        "1.0 — cosine ignores vector length, only direction matters",
        "0.5 — b is twice as long, so similarity halves",
        "0.0 — the vectors are different objects",
        "It depends on the vocabulary size",
      ],
      answer: 0,
      explain: String.raw`b = 2a points in exactly the same direction, and cosine = dot(a,b)/(|a||b|) divides out both magnitudes, giving 1.0. This scale invariance is why cosine beats euclidean for documents: a long article and its summary can still be neighbors. Euclidean distance between a and b here is decidedly non-zero.`,
    },
    {
      q: String.raw`A bag-of-words vector uses a 50,000-word vocabulary. A typical 25-token tweet fills at most what fraction of it?`,
      options: [
        "About 50% — half the vocabulary appears in any real text",
        "About 5% — a few thousand entries",
        "Exactly 100% — every dimension gets a count",
        "About 0.05% — at most 25 nonzero entries out of 50,000",
      ],
      answer: 3,
      explain: String.raw`A document can light up at most as many dimensions as it has distinct tokens — here 25 of 50,000, i.e. 0.05%. This extreme sparsity is why classic NLP uses dicts and sparse matrices instead of dense arrays, and it is the standard interview segue into why dense embeddings were such a big deal.`,
    },
  ];

  W.exercises["w3d1-e1"] = {
    title: "Tokenizer and vocabulary builder",
    difficulty: 1,
    xp: 20,
    minutes: 25,
    packages: [],
    brief: "Write the two functions every NLP pipeline starts with: tokenize and build_vocab.",
    description: String.raw`Implement the front door of every text pipeline.

**1. ~tokenize(text)~** — return a list of lowercase tokens. A token is a maximal run of latin letters or digits: use ~re.findall~ with the pattern ~[a-z0-9]+~ on the lowercased text. Punctuation, apostrophes and hyphens act as separators.

**2. ~build_vocab(docs, min_freq=1)~** — ~docs~ is a list of strings. Tokenize each doc, count total occurrences of every token across the whole corpus, keep tokens whose count is ~>= min_freq~, and return them as a list sorted by **descending frequency, ties broken alphabetically** — i.e. sort key ~(-freq, token)~.

~~~python
tokenize("Cats love cats!")
# ['cats', 'love', 'cats']

build_vocab(["the cat sat", "the dog sat on the mat"])
# ['the', 'sat', 'cat', 'dog', 'mat', 'on']
#  the:3  sat:2  then the four 1-count tokens alphabetically
~~~

Constraints: pure python + ~re~ + ~collections~. No prints.

Interview angle: "write me a tokenizer and a vocabulary" is a real 10-minute screen at search and ads teams — it checks you can handle counting, sorting with composite keys, and edge cases (empty corpus) without a library.`,
    starter: String.raw`import re
from collections import Counter

def tokenize(text):
    """Lowercase, then return all runs of [a-z0-9] as a list of tokens."""
    # your code here
    raise NotImplementedError

def build_vocab(docs, min_freq=1):
    """Count tokens across all docs; keep freq >= min_freq;
    return tokens sorted by (-frequency, token)."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`re.findall returns all non-overlapping matches as a list — combine it with text.lower() and you are done with tokenize.`,
      String.raw`For build_vocab, feed every doc's tokens into one collections.Counter, then filter items by min_freq.`,
      String.raw`sorted(items, key=lambda kv: (-kv[1], kv[0])) gives descending count with alphabetical tie-break; return just the tokens.`,
    ],
    solution: String.raw`import re
from collections import Counter

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

def build_vocab(docs, min_freq=1):
    counts = Counter()
    for doc in docs:
        counts.update(tokenize(doc))
    kept = [(tok, c) for tok, c in counts.items() if c >= min_freq]
    kept.sort(key=lambda kv: (-kv[1], kv[0]))
    return [tok for tok, _ in kept]`,
    tests: [
      {
        name: "tokenize lowercases and splits on punctuation",
        code: String.raw`out = tokenize("Cats love cats!")
assert out == ["cats", "love", "cats"], f"expected ['cats','love','cats'], got {out}"
out2 = tokenize("Don't stop-me now")
assert out2 == ["don", "t", "stop", "me", "now"], f"got {out2}"`,
      },
      {
        name: "tokenize keeps digits and returns [] for empty text",
        code: String.raw`out = tokenize("GPT-4 has 175B params")
assert out == ["gpt", "4", "has", "175b", "params"], f"got {out}"
assert tokenize("") == [], f"empty text should give [], got {tokenize('')}"
assert tokenize("!!! ???") == [], f"punctuation-only should give [], got {tokenize('!!! ???')}"`,
      },
      {
        name: "build_vocab sorts by -freq then alphabetically",
        code: String.raw`v = build_vocab(["the cat sat", "the dog sat on the mat"])
assert v == ["the", "sat", "cat", "dog", "mat", "on"], f"got {v}"`,
      },
      {
        name: "min_freq filters rare tokens",
        code: String.raw`v = build_vocab(["the cat sat", "the dog sat on the mat"], min_freq=2)
assert v == ["the", "sat"], f"expected ['the','sat'], got {v}"
v3 = build_vocab(["a a a b"], min_freq=4)
assert v3 == [], f"nothing reaches freq 4, got {v3}"`,
      },
      {
        name: "alphabetical tie-break on equal counts",
        code: String.raw`v = build_vocab(["b b a a"])
assert v == ["a", "b"], f"equal counts must sort alphabetically, got {v}"`,
      },
      {
        name: "empty corpus gives empty vocab",
        code: String.raw`assert build_vocab([]) == [], f"got {build_vocab([])}"
assert build_vocab(["", "  "]) == [], f"got {build_vocab(['', '  '])}"`,
      },
    ],
  };

  W.exercises["w3d1-e2"] = {
    title: "TF-IDF and cosine similarity from scratch",
    difficulty: 3,
    xp: 40,
    minutes: 35,
    packages: [],
    brief: "Implement the exact TF-IDF formulas from the lesson and compare documents with cosine similarity — dicts only.",
    description: String.raw`Build the vectorizer that powered a decade of search engines. Sparse style: documents become dicts mapping token -> weight.

**1. ~tf_idf(docs)~** — ~docs~ is a list of strings. Tokenize with the day's regex recipe (lowercase, ~[a-z0-9]+~ — ~tokenize~ is already provided in the starter). Return a list with one dict per document using exactly:

~~~text
tf(t, d)  = count(t, d) / len(d)           # len(d) = number of tokens in d
idf(t)    = ln((1 + N) / (1 + df(t))) + 1   # N = number of docs
weight    = tf * idf
~~~

~df(t)~ = number of documents containing ~t~ at least once. A document with zero tokens becomes an empty dict.

**2. ~cosine_sim(vec_a, vec_b)~** — both are dicts token -> float. Return ~dot / (norm_a * norm_b)~ where the dot product runs over shared keys. If either vector is empty or has zero norm, return ~0.0~.

~~~python
vecs = tf_idf(["cat sat", "dog sat"])
# vecs[0]["sat"] == 0.5            (tf 1/2, idf ln(3/3)+1 = 1.0)
# vecs[0]["cat"] == 0.5 * (ln(1.5) + 1)   # ~0.7027
cosine_sim({"x": 1.0, "y": 1.0}, {"x": 1.0})   # ~0.7071
~~~

Constraints: pure python + ~math~ + ~collections~. Do not normalize the vectors inside ~tf_idf~.

Interview angle: implementing TF-IDF end-to-end proves you understand *why* the formula is shaped this way — the follow-up is always "what does the log do?" and "what if a term appears in every document?" — and dict-based sparse math mirrors how real systems store these vectors.`,
    starter: String.raw`import math
from collections import Counter

def tokenize(text):
    import re
    return re.findall(r"[a-z0-9]+", text.lower())

def tf_idf(docs):
    """Return a list of dicts token -> tf*idf, using:
    tf = count/len_doc, idf = ln((1+N)/(1+df)) + 1."""
    # your code here
    raise NotImplementedError

def cosine_sim(vec_a, vec_b):
    """Cosine similarity of two dict-vectors; 0.0 if either norm is 0."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`First pass: tokenize every doc once and store the token lists. Compute df with a Counter over each doc's set of tokens.`,
      String.raw`idf depends only on the corpus, so precompute idf[t] for every token in any doc, then build each doc dict as count/len * idf[t].`,
      String.raw`For cosine, iterate over the smaller dict's keys for the dot product; norms are sqrt of the sum of squared values of each dict alone.`,
    ],
    solution: String.raw`import math
from collections import Counter

def tokenize(text):
    import re
    return re.findall(r"[a-z0-9]+", text.lower())

def tf_idf(docs):
    token_lists = [tokenize(d) for d in docs]
    N = len(docs)
    df = Counter()
    for toks in token_lists:
        df.update(set(toks))
    idf = {t: math.log((1 + N) / (1 + d)) + 1 for t, d in df.items()}
    vecs = []
    for toks in token_lists:
        if not toks:
            vecs.append({})
            continue
        counts = Counter(toks)
        n = len(toks)
        vecs.append({t: (c / n) * idf[t] for t, c in counts.items()})
    return vecs

def cosine_sim(vec_a, vec_b):
    if not vec_a or not vec_b:
        return 0.0
    small, big = (vec_a, vec_b) if len(vec_a) <= len(vec_b) else (vec_b, vec_a)
    dot = sum(v * big[k] for k, v in small.items() if k in big)
    na = math.sqrt(sum(v * v for v in vec_a.values()))
    nb = math.sqrt(sum(v * v for v in vec_b.values()))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)`,
    tests: [
      {
        name: "hand-computed weights on a 2-doc corpus",
        code: String.raw`import math
vecs = tf_idf(["cat sat", "dog sat"])
assert len(vecs) == 2, f"expected 2 vectors, got {len(vecs)}"
expected_cat = 0.5 * (math.log(1.5) + 1)
assert math.isclose(vecs[0]["sat"], 0.5, rel_tol=1e-9), f"sat: expected 0.5, got {vecs[0]['sat']}"
assert math.isclose(vecs[0]["cat"], expected_cat, rel_tol=1e-9), f"cat: expected {expected_cat}, got {vecs[0]['cat']}"
assert math.isclose(vecs[1]["dog"], expected_cat, rel_tol=1e-9), f"dog: expected {expected_cat}, got {vecs[1]['dog']}"`,
      },
      {
        name: "repeated tokens use tf = count/len_doc",
        code: String.raw`import math
vecs = tf_idf(["cat cat dog"])
# single doc: every df=1, N=1 -> idf = ln(2/2)+1 = 1.0
assert math.isclose(vecs[0]["cat"], 2 / 3, rel_tol=1e-9), f"expected 2/3, got {vecs[0]['cat']}"
assert math.isclose(vecs[0]["dog"], 1 / 3, rel_tol=1e-9), f"expected 1/3, got {vecs[0]['dog']}"`,
      },
      {
        name: "idf floor: token in every doc keeps weight (idf = 1.0)",
        code: String.raw`import math
vecs = tf_idf(["sat", "sat", "sat"])
# df = N = 3 -> idf = ln(4/4) + 1 = 1.0; tf = 1.0
for i, v in enumerate(vecs):
    assert math.isclose(v["sat"], 1.0, rel_tol=1e-9), f"doc {i}: expected 1.0, got {v['sat']}"`,
      },
      {
        name: "empty document becomes an empty dict",
        code: String.raw`vecs = tf_idf(["cat sat", ""])
assert vecs[1] == {}, f"empty doc must give empty dict, got {vecs[1]}"
assert "cat" in vecs[0], f"doc 0 should still be vectorized, got {vecs[0]}"`,
      },
      {
        name: "cosine_sim: parallel, partial overlap, empty",
        code: String.raw`import math
assert math.isclose(cosine_sim({"a": 1.0}, {"a": 2.0}), 1.0, rel_tol=1e-9), "parallel vectors must give 1.0"
got = cosine_sim({"x": 1.0, "y": 1.0}, {"x": 1.0})
assert math.isclose(got, 1 / math.sqrt(2), rel_tol=1e-9), f"expected {1/math.sqrt(2)}, got {got}"
assert cosine_sim({}, {"a": 1.0}) == 0.0, "empty vector must give 0.0"
assert cosine_sim({"a": 1.0}, {"b": 1.0}) == 0.0, "disjoint vectors must give 0.0"`,
      },
      {
        name: "end-to-end: shared vocab beats no shared vocab",
        code: String.raw`vecs = tf_idf(["the cat sat", "the dog ran", "cats and dogs"])
sim01 = cosine_sim(vecs[0], vecs[1])
sim02 = cosine_sim(vecs[0], vecs[2])
assert sim01 > 0, f"docs 0 and 1 share 'the', expected sim > 0, got {sim01}"
assert sim02 == 0.0, f"docs 0 and 2 share no token, expected 0.0, got {sim02}"
assert sim01 > sim02, f"expected sim01 > sim02, got {sim01} vs {sim02}"`,
      },
    ],
  };

  W.exercises["w3d1-e3"] = {
    title: "Character n-grams and Jaccard similarity",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Fuzzy string matching the fastText way: character n-grams plus Jaccard overlap.",
    description: String.raw`Word-level features think "night" and "nacht" have nothing in common. Character n-grams disagree — this trick powers fastText embeddings, typo-tolerant search, and language identification.

**1. ~char_ngrams(word, n)~** — return the list of all contiguous character n-grams of ~word~, left to right, duplicates preserved. If ~n > len(word)~, return ~[]~.

**2. ~jaccard(a, b)~** — ~a~ and ~b~ are iterables of hashable items (e.g. n-gram lists). Convert both to sets and return ~|intersection| / |union|~. If both sets are empty, return ~1.0~ (two empty things are identical).

~~~python
char_ngrams("cat", 2)              # ['ca', 'at']
char_ngrams("aaa", 2)              # ['aa', 'aa']
jaccard(char_ngrams("night", 2), char_ngrams("nacht", 2))
# night: {ni, ig, gh, ht} | nacht: {na, ac, ch, ht} -> 1 shared / 7 total = 0.1428...
~~~

Constraints: pure python, no imports needed.

Interview angle: this is the classic warm-up before "how does fastText handle out-of-vocabulary words?" — the answer being: an OOV word is represented by the sum of its char n-gram vectors, which your two functions make concrete.`,
    starter: String.raw`def char_ngrams(word, n):
    """All contiguous n-grams of word, in order, duplicates kept. [] if n > len(word)."""
    # your code here
    raise NotImplementedError

def jaccard(a, b):
    """|set(a) & set(b)| / |set(a) | set(b)|; 1.0 if both are empty."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`A slice word[i:i+n] for i in range(len(word) - n + 1) enumerates every n-gram; range() handles the too-short case almost for free.`,
      String.raw`Careful: range(len(word) - n + 1) is empty when n > len(word), which is exactly the [] you want.`,
      String.raw`For jaccard, build sa = set(a), sb = set(b); guard the both-empty case before dividing by len(sa | sb).`,
    ],
    solution: String.raw`def char_ngrams(word, n):
    return [word[i:i + n] for i in range(len(word) - n + 1)]

def jaccard(a, b):
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / len(sa | sb)`,
    tests: [
      {
        name: "bigrams and trigrams of a short word",
        code: String.raw`assert char_ngrams("cat", 2) == ["ca", "at"], f"got {char_ngrams('cat', 2)}"
assert char_ngrams("cat", 3) == ["cat"], f"got {char_ngrams('cat', 3)}"
assert char_ngrams("night", 2) == ["ni", "ig", "gh", "ht"], f"got {char_ngrams('night', 2)}"`,
      },
      {
        name: "n larger than the word gives [] and duplicates are kept",
        code: String.raw`assert char_ngrams("cat", 4) == [], f"got {char_ngrams('cat', 4)}"
assert char_ngrams("", 1) == [], f"got {char_ngrams('', 1)}"
assert char_ngrams("aaa", 2) == ["aa", "aa"], f"duplicates must be preserved, got {char_ngrams('aaa', 2)}"`,
      },
      {
        name: "jaccard basics: identical, disjoint, both empty",
        code: String.raw`import math
assert math.isclose(jaccard(["a", "b"], ["b", "a"]), 1.0), "same sets must give 1.0"
assert jaccard(["a"], ["b"]) == 0.0, "disjoint sets must give 0.0"
assert jaccard([], []) == 1.0, "two empty inputs must give 1.0"
assert jaccard([], ["a"]) == 0.0, f"empty vs non-empty must give 0.0, got {jaccard([], ['a'])}"`,
      },
      {
        name: "night vs nacht share 1 of 7 bigrams",
        code: String.raw`import math
sim = jaccard(char_ngrams("night", 2), char_ngrams("nacht", 2))
assert math.isclose(sim, 1 / 7, rel_tol=1e-9), f"expected 1/7 = {1/7}, got {sim}"`,
      },
      {
        name: "duplicates collapse inside jaccard (set semantics)",
        code: String.raw`import math
sim = jaccard(["aa", "aa"], ["aa"])
assert math.isclose(sim, 1.0), f"multiset duplicates must not matter, got {sim}"`,
      },
    ],
  };

  // ================= Day 2 =================
  W.days.push({
    id: "w3d2",
    title: "Embeddings — Meaning as Geometry",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w3d2-lesson", minutes: 25 },
      { type: "quiz",     id: "w3d2-quiz",   minutes: 12 },
      { type: "exercise", id: "w3d2-e1",     minutes: 25 },
      { type: "exercise", id: "w3d2-e2",     minutes: 30 },
      { type: "exercise", id: "w3d2-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "nlp", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w3d2-lesson"] = {
    title: "Embeddings — Meaning as Geometry",
    md: String.raw`"king - man + woman = queen" is the most quoted equation in NLP, and interviewers love asking why it works at all. Today you learn the answer: embeddings turn a philosophical claim — *you shall know a word by the company it keeps* — into geometry you can do arithmetic on. This idea is the bridge between yesterday's sparse counts and everything transformer-shaped.

### From one-hot cliffs to dense hills

A one-hot vector over a 50k vocabulary is 50,000 dimensions of nothing: every pair of distinct words has dot product 0 and euclidean distance sqrt(2). "cat" is exactly as far from "kitten" as from "carburetor". No similarity signal, absurd dimensionality, and every new word grows the space.

Dense embeddings flip every property: ~50-1024~ dimensions (word2vec era: 300; BERT: 768), real-valued, and **learned** so that similar contexts produce nearby vectors. Similarity becomes a dot product away.

~~~python
one_hot_cat = [0, 0, 1, 0, 0]        # says nothing about meaning
dense_cat   = [0.0, 0.1, 0.9, 0.0]   # each axis a learned latent feature
~~~

The **distributional hypothesis** (Harris 1954, Firth 1957) is the engine: words appearing in similar contexts ("pour the ___", "drink the ___") tend to have similar meanings, so a model trained to predict contexts is forced to place tea near coffee.

### word2vec: two ways to slice a window

word2vec (2013) trains a tiny network on (center, context) pairs from sliding windows:

- **Skip-gram**: given the *center* word, predict each *context* word. One window of size 2 around "sat" in "the cat sat on mats" produces pairs (sat, cat), (sat, the), (sat, on), (sat, mats). Slower, but excellent for rare words — each rare center still gets its own training signal.
- **CBOW** (continuous bag of words): average the *context* vectors, predict the *center*. Faster, smooths over rare words.

The "network" is just two embedding matrices; after training you keep the input matrix as your word vectors. The real cost lives in the output softmax over the whole vocabulary — computing it for 100k words per training pair is brutal.

**Negative sampling** in two sentences: instead of a full softmax, train a binary classifier to score the true (center, context) pair high and ~k~ (5-20) randomly sampled fake pairs low. This turns one 100k-way softmax into ~k+1~ sigmoid updates and is the reason word2vec trains on billions of tokens on a laptop.

### GloVe and fastText, briefly

**GloVe** skips windows-as-SGD-stream and factorizes the *global co-occurrence matrix*: it fits vectors so that ~dot(w_i, w_j)~ approximates ~log(count(i, j))~. Same geometry, different route — counts first, then algebra.

**fastText** represents a word as the sum of its character n-gram vectors (plus the word itself). "unbelievable" shares ~un-~, ~-able~ pieces with known words, so morphology transfers — and an OOV word still gets a decent vector from its pieces. This fixed word2vec's blind spot: unknown words.

### Cosine, not euclidean

Embedding norms absorb frequency effects — frequent words tend to grow longer vectors. Cosine similarity divides the norms out and compares *direction*, which is where meaning lives:

~~~text
cos(u, v) = dot(u, v) / (|u| * |v|)      # 1 same direction, 0 orthogonal, -1 opposite
~~~

Euclidean distance mixes direction with magnitude, so a frequent word and its rare synonym can look far apart. Every "find similar words / documents" system defaults to cosine (often equivalently: normalize all vectors, then dot product).

### Arithmetic that shouldn't work, but does

Relations become directions. The vector ~king - man~ points along "royalty minus generic maleness"; add ~woman~ and the nearest vector is ~queen~. The standard evaluation: compute ~b - a + c~ and search for the nearest word **excluding a, b, c** (otherwise the query words themselves win — a classic gotcha you will implement today).

### The ceiling: one vector per word

Static embeddings assign one frozen vector per *type*. "bank" in "river bank" and "bank account" gets the same point — polysemy is averaged into mush. Sarcasm, negation scope, syntax roles: all need the *sentence* to disambiguate. That demand — context-dependent representations — is literally the motivation for attention and transformers, i.e. tomorrow.

### ⚠️ Common pitfalls

- Comparing embeddings with euclidean distance and wondering why frequent words cluster weirdly — use cosine.
- Forgetting to exclude the query words in analogy search: b - a + c is usually closest to... b.
- Averaging word vectors into a "sentence embedding" and expecting negation to survive ("not good" averages suspiciously close to "good").
- Saying "word2vec is a deep network" — it is a shallow log-linear model; its power is data scale, not depth.
- Treating embedding dimensions as interpretable features — individual axes rarely mean anything; directions (differences) sometimes do.

### 🎤 In interviews, they ask

- Explain the distributional hypothesis and how word2vec exploits it.
- Skip-gram vs CBOW — architecture difference, and which handles rare words better?
- What problem does negative sampling solve, exactly?
- How does fastText produce a vector for a word it has never seen?
- Why does king - man + woman land near queen? Why can static embeddings never handle "bank" properly?

### TL;DR

- One-hot: all words equidistant, no semantics. Dense: learned ~50-1024~ dim vectors where geometry = meaning.
- Skip-gram predicts context from center (good for rare words); CBOW predicts center from averaged context (faster).
- Negative sampling replaces a vocab-wide softmax with k+1 binary classifications.
- GloVe factorizes global co-occurrence counts; fastText sums char n-gram vectors, solving OOV.
- Compare with cosine; do analogies via b - a + c excluding the query words.
- One vector per word cannot represent polysemy — the opening argument for contextual models.

### Go deeper

- [The Illustrated Word2vec — Jay Alammar](https://jalammar.github.io/illustrated-word2vec/)
- [word2vec paper: Efficient Estimation of Word Representations](https://arxiv.org/abs/1301.3781)
- [Hugging Face NLP course](https://huggingface.co/learn/nlp-course)
`,
  };

  W.quizzes["w3d2-quiz"] = [
    {
      q: String.raw`What is the architectural difference between skip-gram and CBOW?`,
      options: [
        "Skip-gram predicts context words from the center word; CBOW predicts the center from the averaged context",
        "Skip-gram uses a deep network; CBOW is linear",
        "CBOW predicts context words from the center word; skip-gram averages contexts",
        "Skip-gram works on characters, CBOW on words",
      ],
      answer: 0,
      explain: String.raw`Both are shallow two-matrix models trained on sliding windows; they differ only in prediction direction. Skip-gram gives every (center, context) pair its own update, which is why it wins on rare words, while CBOW averages the context and trains faster. Neither is deep — the leverage is data volume.`,
    },
    {
      q: String.raw`What does this print?

~~~python
tokens = ["we", "love", "nlp"]
pairs = []
for i in range(len(tokens)):
    for j in range(max(0, i - 1), min(len(tokens), i + 2)):
        if j != i:
            pairs.append((tokens[i], tokens[j]))
print(len(pairs))
~~~`,
      options: [
        "6",
        "9",
        "4",
        "3",
      ],
      answer: 2,
      explain: String.raw`This is skip-gram pair generation with window 1. Center 0 has one right neighbor, center 1 has both neighbors, center 2 has one left neighbor: 1 + 2 + 1 = 4 pairs. Edge tokens have truncated windows — an off-by-one interviewers love to probe.`,
    },
    {
      q: String.raw`What problem does negative sampling solve in word2vec training?`,
      options: [
        "It removes stopwords from the training windows",
        "It replaces the full-vocabulary softmax with a few binary classifications against sampled fake pairs",
        "It prevents overfitting by dropping random embedding dimensions",
        "It balances positive and negative sentiment words in the corpus",
      ],
      answer: 1,
      explain: String.raw`The output softmax normalizes over the entire vocabulary — hundreds of thousands of logits per training pair. Negative sampling instead asks a sigmoid to score the observed pair high and k randomly drawn pairs low, cutting the per-pair cost from O(vocab) to O(k). It is a training trick, not a regularizer.`,
    },
    {
      q: String.raw`How does fastText produce an embedding for a word absent from its training vocabulary?`,
      options: [
        "It returns the zero vector for unknown words",
        "It falls back to the UNK token embedding",
        "It retrains the model on the new word on the fly",
        "It sums the vectors of the word's character n-grams",
      ],
      answer: 3,
      explain: String.raw`fastText represents every word as the sum of its character n-gram vectors (3- to 6-grams, plus the whole word). An unseen word like 'unbelievableness' still decomposes into known pieces, so it gets a meaningful vector — unlike word2vec, which can only shrug with UNK or zeros.`,
    },
    {
      q: String.raw`Why is cosine similarity preferred over euclidean distance for comparing word embeddings?`,
      options: [
        "Cosine is faster to compute than euclidean distance",
        "Euclidean distance only works in 2 or 3 dimensions",
        "Vector norms absorb frequency effects; cosine compares direction only, where the semantic signal lives",
        "Cosine similarity is always positive, which simplifies ranking",
      ],
      answer: 2,
      explain: String.raw`Embedding magnitude correlates with word frequency and training artifacts, while relative meaning shows up as direction. Cosine divides out both norms, so a frequent word and its rare synonym can still score near 1. Cosine can be negative, and euclidean works in any dimension — those options are bait.`,
    },
    {
      q: String.raw`What does this print, and what does it demonstrate?

~~~python
cat = [1, 0, 0]
dog = [0, 1, 0]
print(sum(c * d for c, d in zip(cat, dog)))
~~~`,
      options: [
        "0 — one-hot vectors are orthogonal, encoding zero similarity between any two words",
        "1 — one-hot vectors overlap in the zero entries",
        "2 — the dot product counts matching dimensions",
        "It raises a ValueError because the vectors are sparse",
      ],
      answer: 0,
      explain: String.raw`The dot product multiplies element-wise and sums: 1*0 + 0*1 + 0*0 = 0. Every pair of distinct one-hot vectors is orthogonal, so 'cat' is exactly as unrelated to 'dog' as to 'carburetor'. Dense embeddings exist precisely to make this dot product meaningful.`,
    },
    {
      q: String.raw`Static embeddings like word2vec fundamentally cannot handle which phenomenon?`,
      options: [
        "Words with many synonyms",
        "Polysemy — one word form with multiple senses gets a single averaged vector",
        "Very frequent words like 'the'",
        "Languages with large vocabularies",
      ],
      answer: 1,
      explain: String.raw`One vector per word type means 'bank' (river) and 'bank' (money) collapse into a single point — a frequency-weighted average of both senses. Only context-dependent representations, computed per sentence by models like BERT, can separate them. This limitation is the standard motivation for attention.`,
    },
    {
      q: String.raw`What training signal does GloVe fit its vectors to?`,
      options: [
        "Predicting the next word in a sentence, left to right",
        "Classifying true vs sampled fake word pairs",
        "Reconstructing masked-out words in context",
        "Global co-occurrence counts: dot products approximate log co-occurrence",
      ],
      answer: 3,
      explain: String.raw`GloVe first builds the corpus-wide co-occurrence matrix, then fits vectors so dot(w_i, w_j) tracks log(count(i,j)) — closer to matrix factorization than to word2vec's streaming prediction. Next-word prediction describes language models, and masked reconstruction is BERT territory.`,
    },
  ];

  W.exercises["w3d2-e1"] = {
    title: "Cosine similarity and nearest neighbors",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Implement cosine similarity and a most_similar search over a toy embedding table.",
    description: String.raw`The starter ships ~EMB~: a hand-crafted toy embedding table (13 words, 4 dimensions, axes roughly meaning royalty / masculinity / pet-ness / food-ness). Relationships hold: kings are near princes, kittens near cats.

**1. ~cosine(u, v)~** — cosine similarity of two equal-length lists of floats: ~dot(u, v) / (|u| * |v|)~. If either vector has zero norm, return ~0.0~.

**2. ~most_similar(word, emb, topn=3)~** — return the ~topn~ words from ~emb~ most similar to ~word~ by cosine, **excluding the query word itself**, sorted by similarity descending (break exact ties alphabetically for determinism).

~~~python
cosine([1, 0], [0, 1])          # 0.0
most_similar("king", EMB, 2)    # ['prince', 'man']
most_similar("cat", EMB, 3)     # ['kitten', 'dog', 'puppy']
~~~

Constraints: pure python + ~math~. Your functions must work on ANY embedding dict, not just ~EMB~.

Interview angle: "given embeddings, find the nearest neighbors" is the most common warm-up at semantic-search and recommendation teams — and forgetting to exclude the query itself is the classic bug they wait for.`,
    starter: String.raw`import math

# Toy embeddings: [royalty, masculinity, pet-ness, food-ness]
EMB = {
    "king":     [0.9, 0.8, 0.1, 0.0],
    "queen":    [0.9, -0.8, 0.1, 0.0],
    "man":      [0.1, 0.8, 0.1, 0.0],
    "woman":    [0.1, -0.8, 0.1, 0.0],
    "prince":   [0.7, 0.7, 0.1, 0.0],
    "princess": [0.7, -0.7, 0.1, 0.0],
    "apple":    [0.0, 0.0, 0.05, 0.9],
    "banana":   [0.0, 0.0, 0.0, 0.85],
    "fruit":    [0.0, 0.0, 0.1, 0.8],
    "cat":      [0.0, 0.1, 0.9, 0.0],
    "kitten":   [0.0, 0.05, 0.8, 0.0],
    "dog":      [0.0, 0.15, 0.85, 0.05],
    "puppy":    [0.0, 0.12, 0.7, 0.08],
}

def cosine(u, v):
    """Cosine similarity of two equal-length lists; 0.0 if a norm is zero."""
    # your code here
    raise NotImplementedError

def most_similar(word, emb, topn=3):
    """Top-n words by cosine to emb[word], excluding word itself.
    Sort by similarity desc; break exact ties alphabetically."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`dot = sum(a * b for a, b in zip(u, v)); the norms are math.sqrt of each vector's dot with itself.`,
      String.raw`Score every candidate word except the query, then sort. You need similarity DESCENDING but ties alphabetical ASCENDING.`,
      String.raw`sorted(scores, key=lambda kv: (-kv[1], kv[0])) does both orderings in one key; slice [:topn] and keep the words.`,
    ],
    solution: String.raw`import math

# Toy embeddings: [royalty, masculinity, pet-ness, food-ness]
EMB = {
    "king":     [0.9, 0.8, 0.1, 0.0],
    "queen":    [0.9, -0.8, 0.1, 0.0],
    "man":      [0.1, 0.8, 0.1, 0.0],
    "woman":    [0.1, -0.8, 0.1, 0.0],
    "prince":   [0.7, 0.7, 0.1, 0.0],
    "princess": [0.7, -0.7, 0.1, 0.0],
    "apple":    [0.0, 0.0, 0.05, 0.9],
    "banana":   [0.0, 0.0, 0.0, 0.85],
    "fruit":    [0.0, 0.0, 0.1, 0.8],
    "cat":      [0.0, 0.1, 0.9, 0.0],
    "kitten":   [0.0, 0.05, 0.8, 0.0],
    "dog":      [0.0, 0.15, 0.85, 0.05],
    "puppy":    [0.0, 0.12, 0.7, 0.08],
}

def cosine(u, v):
    dot = sum(a * b for a, b in zip(u, v))
    nu = math.sqrt(sum(a * a for a in u))
    nv = math.sqrt(sum(b * b for b in v))
    if nu == 0.0 or nv == 0.0:
        return 0.0
    return dot / (nu * nv)

def most_similar(word, emb, topn=3):
    query = emb[word]
    scores = [(w, cosine(query, vec)) for w, vec in emb.items() if w != word]
    scores.sort(key=lambda kv: (-kv[1], kv[0]))
    return [w for w, _ in scores[:topn]]`,
    tests: [
      {
        name: "cosine on orthogonal, parallel and opposite vectors",
        code: String.raw`import math
assert math.isclose(cosine([1, 0], [0, 2]), 0.0, abs_tol=1e-12), f"orthogonal: got {cosine([1,0],[0,2])}"
assert math.isclose(cosine([1, 2], [2, 4]), 1.0, rel_tol=1e-9), f"parallel: got {cosine([1,2],[2,4])}"
assert math.isclose(cosine([1, 0], [-1, 0]), -1.0, rel_tol=1e-9), f"opposite: got {cosine([1,0],[-1,0])}"`,
      },
      {
        name: "cosine returns 0.0 for a zero vector",
        code: String.raw`got = cosine([0.0, 0.0], [1.0, 2.0])
assert got == 0.0, f"zero-norm vector must give 0.0, got {got}"`,
      },
      {
        name: "king's neighbors are prince then man",
        code: String.raw`got = most_similar("king", EMB, 2)
assert got == ["prince", "man"], f"expected ['prince', 'man'], got {got}"`,
      },
      {
        name: "cat's neighbors ranked kitten, dog, puppy",
        code: String.raw`got = most_similar("cat", EMB, 3)
assert got == ["kitten", "dog", "puppy"], f"expected ['kitten', 'dog', 'puppy'], got {got}"`,
      },
      {
        name: "query word is excluded and topn is respected",
        code: String.raw`got = most_similar("apple", EMB, 5)
assert "apple" not in got, f"query word must be excluded, got {got}"
assert len(got) == 5, f"expected 5 results, got {len(got)}"
assert got[:2] == ["banana", "fruit"], f"expected banana, fruit first, got {got[:2]}"`,
      },
      {
        name: "works on a custom embedding dict (no hardcoding)",
        code: String.raw`tiny = {"a": [1.0, 0.0], "b": [0.9, 0.1], "c": [0.0, 1.0]}
got = most_similar("a", tiny, 1)
assert got == ["b"], f"expected ['b'], got {got}"
got2 = most_similar("c", tiny, 2)
assert got2[0] == "b", f"b has cosine > 0 with c while a has 0; got {got2}"`,
      },
    ],
  };

  W.exercises["w3d2-e2"] = {
    title: "Skip-gram training pairs",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: [],
    brief: "Generate the (center, context) pairs word2vec actually trains on — window edges included.",
    description: String.raw`Before any embedding is learned, the corpus must become supervision. Implement the pair generator at the heart of skip-gram.

**~skipgram_pairs(tokens, window)~** — for every position ~i~ (the center), emit one ~(center, context)~ tuple for every position ~j~ with ~i - window <= j <= i + window~, ~j != i~, and ~j~ inside the list bounds. Order matters and must be deterministic: centers left to right; for each center, contexts left to right.

~~~python
skipgram_pairs(["a", "b", "c"], 1)
# [('a', 'b'), ('b', 'a'), ('b', 'c'), ('c', 'b')]

skipgram_pairs(["the", "cat", "sat", "down"], 2)
# 10 pairs; the first three: ('the', 'cat'), ('the', 'sat'), ('cat', 'the')
~~~

Constraints: pure python, return a list of tuples. Tokens can repeat — emit pairs by *position*, not by word identity.

Interview angle: this tiny function is a favorite "show me you can code windows without off-by-ones" screen, and it doubles as a comprehension check: whoever writes it correctly understands exactly what skip-gram optimizes and why edge tokens get fewer updates.`,
    starter: String.raw`def skipgram_pairs(tokens, window):
    """All (center, context) pairs within the window, in deterministic order:
    centers left to right, contexts left to right, j != i, bounds respected."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Two nested loops: i over range(len(tokens)), j over a clamped range around i.`,
      String.raw`Clamp with max(0, i - window) and min(len(tokens), i + window + 1) — the +1 because range is end-exclusive.`,
      String.raw`Skip j == i, append (tokens[i], tokens[j]). Iterating j in increasing order gives the required determinism for free.`,
    ],
    solution: String.raw`def skipgram_pairs(tokens, window):
    pairs = []
    n = len(tokens)
    for i in range(n):
        lo = max(0, i - window)
        hi = min(n, i + window + 1)
        for j in range(lo, hi):
            if j != i:
                pairs.append((tokens[i], tokens[j]))
    return pairs`,
    tests: [
      {
        name: "window 1 over three tokens, exact order",
        code: String.raw`got = skipgram_pairs(["a", "b", "c"], 1)
expected = [("a", "b"), ("b", "a"), ("b", "c"), ("c", "b")]
assert got == expected, f"expected {expected}, got {got}"`,
      },
      {
        name: "window 2 over four tokens: 10 pairs, edges truncated",
        code: String.raw`got = skipgram_pairs(["the", "cat", "sat", "down"], 2)
expected = [("the", "cat"), ("the", "sat"),
            ("cat", "the"), ("cat", "sat"), ("cat", "down"),
            ("sat", "the"), ("sat", "cat"), ("sat", "down"),
            ("down", "cat"), ("down", "sat")]
assert got == expected, f"expected {expected}, got {got}"`,
      },
      {
        name: "pair count formula holds for 6 tokens, window 2",
        code: String.raw`got = skipgram_pairs(list("abcdef"), 2)
# per-center context counts: 2,3,4,4,3,2 = 18
assert len(got) == 18, f"expected 18 pairs, got {len(got)}"`,
      },
      {
        name: "empty and single-token inputs give no pairs",
        code: String.raw`assert skipgram_pairs([], 2) == [], f"got {skipgram_pairs([], 2)}"
assert skipgram_pairs(["solo"], 3) == [], f"got {skipgram_pairs(['solo'], 3)}"`,
      },
      {
        name: "repeated tokens are paired by position",
        code: String.raw`got = skipgram_pairs(["a", "a"], 1)
assert got == [("a", "a"), ("a", "a")], f"expected two ('a','a') pairs, got {got}"`,
      },
      {
        name: "window larger than the list covers everything",
        code: String.raw`got = skipgram_pairs(["x", "y", "z"], 99)
assert len(got) == 6, f"every ordered pair should appear once, got {len(got)}"
assert ("x", "z") in got and ("z", "x") in got, f"long-range pairs missing: {got}"`,
      },
    ],
  };

  W.exercises["w3d2-e3"] = {
    title: "Word analogies via vector arithmetic",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "king - man + woman = ? Implement the famous analogy search, excluding the query words.",
    description: String.raw`Implement the evaluation that made word2vec famous.

**~analogy(a, b, c, emb)~** — solve "~a~ is to ~b~ as ~c~ is to ?": compute the target vector ~emb[b] - emb[a] + emb[c]~ and return the word whose embedding has the **highest cosine similarity** to it, **excluding ~a~, ~b~ and ~c~** from the candidates. Break exact ties alphabetically. The starter provides the same toy ~EMB~ table as e1 (13 words, 4 dims) plus a ready ~cosine~.

~~~python
analogy("man", "king", "woman", EMB)      # 'queen'
analogy("cat", "kitten", "dog", EMB)      # 'puppy'
~~~

Why exclude a, b, c? Because ~b - a + c~ is usually closest to ~b~ or ~c~ themselves — without the exclusion the method "solves" every analogy with its own inputs, a famous evaluation gotcha.

Constraints: pure python + ~math~; must work on any embedding dict.

Interview angle: interviewers use this to test whether you know the exclusion detail and can articulate WHY relations appear as directions — the follow-up is "when does this arithmetic fail?" (rare words, polysemy, antonyms).`,
    starter: String.raw`import math

# Toy embeddings: [royalty, masculinity, pet-ness, food-ness]
EMB = {
    "king":     [0.9, 0.8, 0.1, 0.0],
    "queen":    [0.9, -0.8, 0.1, 0.0],
    "man":      [0.1, 0.8, 0.1, 0.0],
    "woman":    [0.1, -0.8, 0.1, 0.0],
    "prince":   [0.7, 0.7, 0.1, 0.0],
    "princess": [0.7, -0.7, 0.1, 0.0],
    "apple":    [0.0, 0.0, 0.05, 0.9],
    "banana":   [0.0, 0.0, 0.0, 0.85],
    "fruit":    [0.0, 0.0, 0.1, 0.8],
    "cat":      [0.0, 0.1, 0.9, 0.0],
    "kitten":   [0.0, 0.05, 0.8, 0.0],
    "dog":      [0.0, 0.15, 0.85, 0.05],
    "puppy":    [0.0, 0.12, 0.7, 0.08],
}

def cosine(u, v):
    dot = sum(x * y for x, y in zip(u, v))
    nu = math.sqrt(sum(x * x for x in u))
    nv = math.sqrt(sum(y * y for y in v))
    if nu == 0.0 or nv == 0.0:
        return 0.0
    return dot / (nu * nv)

def analogy(a, b, c, emb):
    """Return the word d (not in {a, b, c}) whose vector is most cosine-similar
    to emb[b] - emb[a] + emb[c]. Break exact ties alphabetically."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Build the target with one zip: [bb - aa + cc for aa, bb, cc in zip(emb[a], emb[b], emb[c])].`,
      String.raw`Score every word except a, b, c against the target with cosine — reuse the provided function.`,
      String.raw`Sort the scored candidates by (-similarity, word) and return the first one — that handles both the ranking and the alphabetical tie-break.`,
    ],
    solution: String.raw`import math

# Toy embeddings: [royalty, masculinity, pet-ness, food-ness]
EMB = {
    "king":     [0.9, 0.8, 0.1, 0.0],
    "queen":    [0.9, -0.8, 0.1, 0.0],
    "man":      [0.1, 0.8, 0.1, 0.0],
    "woman":    [0.1, -0.8, 0.1, 0.0],
    "prince":   [0.7, 0.7, 0.1, 0.0],
    "princess": [0.7, -0.7, 0.1, 0.0],
    "apple":    [0.0, 0.0, 0.05, 0.9],
    "banana":   [0.0, 0.0, 0.0, 0.85],
    "fruit":    [0.0, 0.0, 0.1, 0.8],
    "cat":      [0.0, 0.1, 0.9, 0.0],
    "kitten":   [0.0, 0.05, 0.8, 0.0],
    "dog":      [0.0, 0.15, 0.85, 0.05],
    "puppy":    [0.0, 0.12, 0.7, 0.08],
}

def cosine(u, v):
    dot = sum(x * y for x, y in zip(u, v))
    nu = math.sqrt(sum(x * x for x in u))
    nv = math.sqrt(sum(y * y for y in v))
    if nu == 0.0 or nv == 0.0:
        return 0.0
    return dot / (nu * nv)

def analogy(a, b, c, emb):
    target = [bb - aa + cc for aa, bb, cc in zip(emb[a], emb[b], emb[c])]
    exclude = {a, b, c}
    scored = [(w, cosine(vec, target)) for w, vec in emb.items() if w not in exclude]
    scored.sort(key=lambda kv: (-kv[1], kv[0]))
    return scored[0][0]`,
    tests: [
      {
        name: "man : king :: woman : queen",
        code: String.raw`got = analogy("man", "king", "woman", EMB)
assert got == "queen", f"expected 'queen', got '{got}'"`,
      },
      {
        name: "cat : kitten :: dog : puppy",
        code: String.raw`got = analogy("cat", "kitten", "dog", EMB)
assert got == "puppy", f"expected 'puppy', got '{got}'"`,
      },
      {
        name: "king : queen :: prince : princess",
        code: String.raw`got = analogy("king", "queen", "prince", EMB)
assert got == "princess", f"expected 'princess', got '{got}'"`,
      },
      {
        name: "query words are never returned",
        code: String.raw`for q in [("man", "king", "woman"), ("king", "queen", "prince"), ("apple", "fruit", "banana")]:
    got = analogy(q[0], q[1], q[2], EMB)
    assert got not in q, f"analogy{q} returned one of its inputs: '{got}'"`,
      },
      {
        name: "exact arithmetic on a custom dict (no hardcoding)",
        code: String.raw`tiny = {"a": [1.0, 0.0], "b": [2.0, 0.0], "c": [1.0, 1.0], "d": [2.0, 1.0], "e": [-1.0, -1.0]}
got = analogy("a", "b", "c", tiny)
assert got == "d", f"b - a + c = [2, 1] which is exactly d; got '{got}'"`,
      },
    ],
  };

  // ================= Day 3 =================
  W.days.push({
    id: "w3d3",
    title: "Attention Is All You Need (Really)",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w3d3-lesson", minutes: 25 },
      { type: "quiz",     id: "w3d3-quiz",   minutes: 12 },
      { type: "exercise", id: "w3d3-e1",     minutes: 25 },
      { type: "exercise", id: "w3d3-e2",     minutes: 30 },
      { type: "exercise", id: "w3d3-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "nlp", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w3d3-lesson"] = {
    title: "Attention Is All You Need (Really)",
    md: String.raw`Attention is the one mechanism you cannot fake your way past in a transformer interview. If you can write scaled dot-product attention on a whiteboard and explain why there is a square root in the denominator, you clear the bar most candidates trip on. Everything else this week — heads, BERT, GPT, fine-tuning — is scaffolding around this single idea.

### Why RNNs and LSTMs lost

For years, sequence models processed text one token at a time, carrying a hidden state forward. RNNs and their gated cousin the LSTM worked, but two problems were fatal.

- **Sequential computation**: token ~t~ cannot be computed until token ~t-1~ is done. No parallelism, so training on modern hardware crawled.
- **The seq2seq bottleneck**: an encoder had to cram an entire source sentence into one fixed-size vector before the decoder saw a single word. A 5-word sentence and a 50-word sentence got the same-sized summary. Long-range dependencies leaked away.

~~~text
RNN encoder:  the cat sat on the mat -> [one 512-d vector] -> decoder
                                          everything must fit here
~~~

Attention was born (Bahdanau, 2014) as a patch: let the decoder *look back* at all encoder states, weighting the relevant ones. The 2017 "Attention Is All You Need" paper took the radical step of throwing away recurrence entirely and keeping only attention.

### Attention as a soft dictionary lookup

The cleanest mental model: attention is a **differentiable dictionary**. A normal dict does exact-match lookup on a key. Attention does *soft* lookup — every key matches a little, weighted by similarity.

- **Query (Q)**: what the current token is looking for.
- **Key (K)**: what each token advertises about itself.
- **Value (V)**: what each token actually contributes if selected.

You score the query against every key, turn scores into weights that sum to 1, and return the weighted average of the values. "The animal didn't cross the street because *it* was tired" — the query from ~it~ scores high against the key for ~animal~, so the value pulled in is mostly the animal's representation. That is coreference resolved by geometry.

### Scaled dot-product attention: the exact math

Stack the queries, keys and values into matrices ~Q~ (shape ~n_q x d_k~), ~K~ (~n_k x d_k~), ~V~ (~n_k x d_v~). The whole operation is one formula:

~~~text
Attention(Q, K, V) = softmax(Q @ K.T / sqrt(d_k)) @ V
~~~

Read it left to right: ~Q @ K.T~ is every query dotted with every key (an ~n_q x n_k~ score matrix), divide by ~sqrt(d_k)~, softmax each row into weights, then multiply by ~V~ to get the weighted values.

### Why the square root of d_k

This is the interview question. Assume each component of ~q~ and ~k~ is independent with mean 0 and variance 1. Their dot product is a sum of ~d_k~ such products:

~~~text
q . k = sum_{i=1..d_k} q_i * k_i
mean(q . k) = 0
var(q . k)  = d_k        # variance adds over independent terms
std(q . k)  = sqrt(d_k)
~~~

So with ~d_k = 64~, raw scores swing by roughly ~+/- 8~. Feed values that large into softmax and it saturates: one weight goes to ~0.999~, the rest to near zero, and the gradient through softmax collapses toward zero — training stalls. Dividing by ~sqrt(d_k)~ rescales the score variance back to 1, keeping softmax in its responsive region. It is variance control, nothing more mystical.

### Softmax: the properties that matter

~~~text
softmax(x)_i = exp(x_i) / sum_j exp(x_j)
~~~

- Outputs are positive and sum to 1 — a probability distribution over positions.
- **Shift invariant**: ~softmax(x) == softmax(x - c)~ for any constant ~c~. This is not just trivia — subtracting the row max is how you avoid ~exp(1000) = inf~ overflow. You will use exactly this in today's first exercise.
- It is smooth and monotonic, so bigger scores always get bigger weights.

### Masking, previewed

Sometimes a position must not be attended to: padding tokens carry no meaning, and a decoder must not peek at future tokens. The trick is to add a large negative number (~-1e9~) to those score entries *before* the softmax, so ~exp~ drives them to ~0~. We build causal and padding masks properly tomorrow — today just know that masking happens on the scores, not after.

### ⚠️ Common pitfalls

- Forgetting the ~sqrt(d_k)~ scaling and watching attention weights collapse to one-hot early in training.
- Computing softmax without subtracting the max, so large logits overflow to ~inf~ and produce ~nan~.
- Confusing the axes: softmax must normalize over the *keys* dimension (each query's weights sum to 1), not over queries.
- Thinking Q, K, V are three different inputs — in self-attention they are three linear projections of the *same* input.
- Applying the mask after softmax instead of before, which leaves nonzero leaked weight on forbidden positions.

### 🎤 In interviews, they ask

- Write scaled dot-product attention from the formula. Why divide by sqrt(d_k)?
- What problem with RNN seq2seq did attention originally solve?
- Explain Q, K and V in one sentence each. Where do they come from in self-attention?
- Why does softmax need the max-subtraction trick numerically?
- How would you prevent a decoder from attending to future tokens?

### TL;DR

- RNN/LSTM died from sequential compute and the fixed-vector seq2seq bottleneck.
- Attention is a soft dictionary lookup: score a query against keys, weight the values.
- ~Attention(Q,K,V) = softmax(Q @ K.T / sqrt(d_k)) @ V~.
- The ~sqrt(d_k)~ divisor keeps dot-product variance at 1 so softmax gradients survive.
- Softmax is shift-invariant; subtract the row max for numerical stability.
- Masking adds ~-1e9~ to forbidden scores *before* softmax.

### Go deeper

- [The Illustrated Transformer — Jay Alammar](https://jalammar.github.io/illustrated-transformer/)
- [Attention Is All You Need (the paper)](https://arxiv.org/abs/1706.03762)
- [Karpathy — Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html)
`,
  };

  W.quizzes["w3d3-quiz"] = [
    {
      q: String.raw`Why does scaled dot-product attention divide the scores by sqrt(d_k)?`,
      options: [
        "To make the attention weights sum to exactly 1",
        "To keep the dot-product variance near 1 so softmax does not saturate and kill gradients",
        "To speed up the matrix multiplication on a GPU",
        "To convert the scores into a probability distribution",
      ],
      answer: 1,
      explain: String.raw`A dot product of two d_k-dimensional unit-variance vectors has variance d_k, hence std sqrt(d_k). Unscaled, large d_k pushes softmax into a near one-hot regime where its gradient vanishes and learning stalls. Dividing by sqrt(d_k) restores variance to 1. Softmax itself, not this divisor, is what makes the weights sum to 1.`,
    },
    {
      q: String.raw`In self-attention, where do the Query, Key and Value matrices come from?`,
      options: [
        "Three separate input sentences fed to the model",
        "Q from the encoder, K and V from the decoder",
        "Three different learned linear projections of the same input sequence",
        "Q and K are learned, but V is the raw one-hot token ids",
      ],
      answer: 2,
      explain: String.raw`Self-attention projects one input X through three learned weight matrices, X@Wq, X@Wk, X@Wv, to get Q, K and V. They are different views of the same tokens, which is exactly why a token can query information about its neighbors. Cross-attention is the case where K and V come from a different sequence than Q.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
x = np.array([1000.0, 1000.0, 1000.0])
shifted = x - x.max()
e = np.exp(shifted)
print(e / e.sum())
~~~`,
      options: [
        "[nan nan nan] because exp(1000) overflows",
        "[0.333... 0.333... 0.333...]",
        "[1. 0. 0.]",
        "[1000. 1000. 1000.]",
      ],
      answer: 1,
      explain: String.raw`Subtracting the max turns every entry into exp(0)=1, so the normalized result is a uniform [1/3, 1/3, 1/3]. Without the shift, exp(1000) overflows to inf and the ratio becomes nan. This shift-invariance of softmax is the standard numerical-stability trick used inside every attention implementation.`,
    },
    {
      q: String.raw`Which single limitation of RNN-based seq2seq did the original attention mechanism most directly address?`,
      options: [
        "RNNs could not run on GPUs at all",
        "RNNs required subword tokenization to function",
        "LSTMs had no way to represent word embeddings",
        "The whole source sentence was squeezed into one fixed-size vector, losing long-range detail",
      ],
      answer: 3,
      explain: String.raw`Classic seq2seq forced the encoder to compress an arbitrarily long input into a single context vector, so distant dependencies faded. Attention let the decoder read a weighted combination of all encoder states instead, removing that bottleneck. Full removal of recurrence for parallelism came later, with the transformer.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
Q = np.array([[1.0, 0.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0]])
scores = Q @ K.T
print(scores.shape, scores[0].tolist())
~~~`,
      options: [
        "(1, 2) [1.0, 0.0]",
        "(2, 1) [1.0, 0.0]",
        "(1, 2) [0.0, 1.0]",
        "(2, 2) [1.0, 0.0]",
      ],
      answer: 0,
      explain: String.raw`Q is 1x2 and K.T is 2x2, so Q @ K.T is 1x2 — one query scored against two keys. The dot products are [1*1+0*0, 1*0+0*1] = [1.0, 0.0], showing the query aligns with the first key. Getting these shapes right is half of implementing attention correctly.`,
    },
    {
      q: String.raw`Over which dimension must the softmax in attention normalize?`,
      options: [
        "Over the queries, so each key's incoming weight sums to 1",
        "Over the value dimension d_v",
        "Over the keys, so each query's attention weights sum to 1",
        "Over both queries and keys jointly",
      ],
      answer: 2,
      explain: String.raw`Each query produces a distribution over the available keys/values, so softmax runs along the keys axis (the last axis of the n_q x n_k score matrix). Normalizing over queries instead would let unrelated tokens compete for a fixed budget, which is not what attention means. This axis bug is a classic silent error.`,
    },
    {
      q: String.raw`To stop a decoder from attending to future tokens, what do you do to the score matrix?`,
      options: [
        "Zero out the future entries after applying softmax",
        "Add a large negative number to future entries before softmax so they receive ~0 weight",
        "Multiply future entries by sqrt(d_k)",
        "Remove future tokens from the value matrix entirely",
      ],
      answer: 1,
      explain: String.raw`Masking is done on the raw scores: set forbidden positions to a large negative value (like -1e9) so that after softmax their exp is effectively 0. Doing it after softmax would require renormalizing and still leaks gradient. Values are never deleted — every position stays, it just gets ~0 weight.`,
    },
    {
      q: String.raw`With d_k = 64, roughly how large is the standard deviation of an unscaled dot-product score between two unit-variance vectors?`,
      options: [
        "About 64",
        "About 1",
        "About 8",
        "About 4096",
      ],
      answer: 2,
      explain: String.raw`Variance of the dot product equals d_k = 64, so the standard deviation is sqrt(64) = 8. Scores swinging by roughly +/-8 already push softmax toward saturation, which is precisely why the sqrt(d_k) = 8 divisor exists. It rescales the spread back down to about 1.`,
    },
  ];

  W.exercises["w3d3-e1"] = {
    title: "Numerically stable softmax",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "Implement the softmax that powers attention — and does not explode on logits of 1000.",
    description: String.raw`Softmax turns raw scores into a probability distribution, and it sits inside every attention layer. A naive implementation overflows the moment logits get large, so you will build the stable version.

**~softmax(x, axis=-1)~** — given a numpy array ~x~, return an array of the same shape where values along ~axis~ are exponentiated and normalized to sum to 1. Subtract the maximum along ~axis~ (with ~keepdims=True~) before exponentiating so that ~exp~ never overflows.

~~~python
softmax(np.array([0.0, 0.0]))          # [0.5, 0.5]
softmax(np.array([1000.0, 1000.0]))    # [0.5, 0.5]  (no overflow!)
M = np.array([[1.0, 2.0], [3.0, 4.0]])
softmax(M, axis=-1)                     # each ROW sums to 1
softmax(M, axis=0)                      # each COLUMN sums to 1
~~~

Constraints: ~numpy~ only. Must work for 1-D and 2-D arrays and for both ~axis=-1~ and ~axis=0~. Never call any library softmax.

Interview angle: "implement a numerically stable softmax" is a top-5 ML coding screen. The interviewer is watching for the max-subtraction and correct ~keepdims~ broadcasting — miss either and the array shapes or the numerics break.`,
    starter: String.raw`import numpy as np

def softmax(x, axis=-1):
    """Stable softmax: subtract the max along axis before exponentiating.
    Returns an array of the same shape that sums to 1 along axis."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Compute m = np.max(x, axis=axis, keepdims=True); keepdims lets it broadcast back against x.`,
      String.raw`Exponentiate x - m, not x. That is the entire stability trick and it never changes the result because softmax is shift-invariant.`,
      String.raw`Divide by np.sum(exp, axis=axis, keepdims=True) so the normalizer broadcasts over the same axis.`,
    ],
    solution: String.raw`import numpy as np

def softmax(x, axis=-1):
    x = np.asarray(x, dtype=float)
    m = np.max(x, axis=axis, keepdims=True)
    e = np.exp(x - m)
    return e / np.sum(e, axis=axis, keepdims=True)`,
    tests: [
      {
        name: "1-D softmax sums to 1 and is monotonic",
        code: String.raw`import numpy as np
out = softmax(np.array([1.0, 2.0, 3.0]))
assert np.isclose(out.sum(), 1.0), f"must sum to 1, got {out.sum()}"
assert out[2] > out[1] > out[0], f"bigger logits need bigger weights, got {out}"`,
      },
      {
        name: "uniform logits give a uniform distribution",
        code: String.raw`import numpy as np
out = softmax(np.array([0.0, 0.0, 0.0, 0.0]))
assert np.allclose(out, 0.25), f"expected all 0.25, got {out}"`,
      },
      {
        name: "no overflow on logits of 1000",
        code: String.raw`import numpy as np
out = softmax(np.array([1000.0, 1000.0]))
assert not np.any(np.isnan(out)), f"overflow produced nan: {out}"
assert np.allclose(out, 0.5), f"expected [0.5, 0.5], got {out}"`,
      },
      {
        name: "shift invariance: softmax(x) == softmax(x + 100)",
        code: String.raw`import numpy as np
x = np.array([-1.0, 0.5, 2.0])
assert np.allclose(softmax(x), softmax(x + 100.0)), "softmax must be shift invariant"`,
      },
      {
        name: "2-D axis=-1 normalizes each row",
        code: String.raw`import numpy as np
M = np.array([[1.0, 2.0], [3.0, 4.0]])
out = softmax(M, axis=-1)
assert np.allclose(out.sum(axis=-1), [1.0, 1.0]), f"rows must sum to 1, got {out.sum(axis=-1)}"
assert np.allclose(out[0], out[1]), f"both rows have the same gap so identical weights, got {out}"`,
      },
      {
        name: "2-D axis=0 normalizes each column",
        code: String.raw`import numpy as np
M = np.array([[1.0, 2.0], [3.0, 4.0]])
out = softmax(M, axis=0)
assert np.allclose(out.sum(axis=0), [1.0, 1.0]), f"columns must sum to 1, got {out.sum(axis=0)}"`,
      },
      {
        name: "known two-value case matches the logistic formula",
        code: String.raw`import numpy as np
out = softmax(np.array([2.0, 0.0]))
expected = np.exp(2.0) / (np.exp(2.0) + 1.0)
assert np.isclose(out[0], expected), f"expected {expected}, got {out[0]}"`,
      },
    ],
  };

  W.exercises["w3d3-e2"] = {
    title: "Scaled dot-product attention",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: ["numpy"],
    brief: "Assemble the one equation the whole transformer is built on, mask support included.",
    description: String.raw`Implement the heart of the transformer.

**~scaled_dot_product_attention(Q, K, V, mask=None)~** — with ~Q~ shape ~(n_q, d_k)~, ~K~ shape ~(n_k, d_k)~, ~V~ shape ~(n_k, d_v)~:

1. Compute scores ~Q @ K.T / sqrt(d_k)~ — shape ~(n_q, n_k)~.
2. If ~mask~ is given (same shape as scores, ~1~ = keep, ~0~ = block), set blocked entries to ~-1e9~ before softmax.
3. Softmax over the last axis (the keys) to get ~weights~ — each row sums to 1.
4. Return the tuple ~(output, weights)~ where ~output = weights @ V~ has shape ~(n_q, d_v)~.

Use a numerically stable softmax (subtract the row max).

~~~python
Q = np.array([[10.0, 0.0]])
K = np.array([[10.0, 0.0], [0.0, 10.0]])
V = np.array([[1.0, 1.0], [2.0, 2.0]])
out, w = scaled_dot_product_attention(Q, K, V)
# w ~ [[~1, ~0]]  ->  out ~ [[1.0, 1.0]]   (query locks onto key 0)
~~~

Constraints: ~numpy~ only. A blocked position must end up with essentially zero weight, and every weight row must still sum to 1.

Interview angle: this is the canonical transformer whiteboard task. Interviewers check the ~K.T~ transpose, the ~sqrt(d_k)~ scale, softmax on the right axis, and that masking happens on the scores — before softmax, not after.`,
    starter: String.raw`import numpy as np

def scaled_dot_product_attention(Q, K, V, mask=None):
    """Return (output, weights).
    scores = Q @ K.T / sqrt(d_k); optional mask (1 keep / 0 block) -> -1e9;
    weights = softmax(scores, last axis); output = weights @ V."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`d_k is Q.shape[-1]; scale the raw scores by 1/np.sqrt(d_k) right after the Q @ K.T matmul.`,
      String.raw`Apply the mask with np.where(mask == 0, -1e9, scores) BEFORE softmax so blocked keys get ~0 weight.`,
      String.raw`Reuse the stable softmax pattern (subtract np.max(..., axis=-1, keepdims=True)) then do weights @ V for the output.`,
    ],
    solution: String.raw`import numpy as np

def _softmax(x, axis=-1):
    m = np.max(x, axis=axis, keepdims=True)
    e = np.exp(x - m)
    return e / np.sum(e, axis=axis, keepdims=True)

def scaled_dot_product_attention(Q, K, V, mask=None):
    Q = np.asarray(Q, dtype=float)
    K = np.asarray(K, dtype=float)
    V = np.asarray(V, dtype=float)
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)
    if mask is not None:
        scores = np.where(np.asarray(mask) == 0, -1e9, scores)
    weights = _softmax(scores, axis=-1)
    output = weights @ V
    return output, weights`,
    tests: [
      {
        name: "output and weight shapes are correct",
        code: String.raw`import numpy as np
Q = np.zeros((2, 4)); K = np.zeros((3, 4)); V = np.zeros((3, 5))
out, w = scaled_dot_product_attention(Q, K, V)
assert out.shape == (2, 5), f"expected output (2,5), got {out.shape}"
assert w.shape == (2, 3), f"expected weights (2,3), got {w.shape}"`,
      },
      {
        name: "every weight row sums to 1",
        code: String.raw`import numpy as np
rng = np.random.default_rng(0)
Q = rng.standard_normal((3, 8)); K = rng.standard_normal((5, 8)); V = rng.standard_normal((5, 2))
out, w = scaled_dot_product_attention(Q, K, V)
assert np.allclose(w.sum(axis=-1), np.ones(3)), f"rows must sum to 1, got {w.sum(axis=-1)}"`,
      },
      {
        name: "a query locks onto the matching key",
        code: String.raw`import numpy as np
Q = np.array([[10.0, 0.0]])
K = np.array([[10.0, 0.0], [0.0, 10.0]])
V = np.array([[1.0, 1.0], [2.0, 2.0]])
out, w = scaled_dot_product_attention(Q, K, V)
assert w[0, 0] > 0.99, f"query should attend to key 0, weights {w}"
assert np.allclose(out[0], [1.0, 1.0], atol=1e-2), f"output should be ~key-0 value, got {out[0]}"`,
      },
      {
        name: "uniform scores give a uniform average of values",
        code: String.raw`import numpy as np
Q = np.zeros((1, 3))
K = np.zeros((4, 3))
V = np.array([[4.0], [0.0], [0.0], [0.0]])
out, w = scaled_dot_product_attention(Q, K, V)
assert np.allclose(w, 0.25), f"all-zero scores -> uniform weights, got {w}"
assert np.isclose(out[0, 0], 1.0), f"mean of values is 1.0, got {out[0,0]}"`,
      },
      {
        name: "masked positions receive essentially zero weight",
        code: String.raw`import numpy as np
Q = np.array([[1.0, 1.0]])
K = np.array([[1.0, 1.0], [1.0, 1.0]])
V = np.array([[5.0], [9.0]])
mask = np.array([[1, 0]])
out, w = scaled_dot_product_attention(Q, K, V, mask=mask)
assert w[0, 1] < 1e-6, f"masked key must get ~0 weight, got {w[0,1]}"
assert np.isclose(w[0, 0], 1.0), f"remaining weight must be 1.0, got {w[0,0]}"
assert np.isclose(out[0, 0], 5.0), f"output should equal the unmasked value 5.0, got {out[0,0]}"`,
      },
      {
        name: "masked rows still sum to 1",
        code: String.raw`import numpy as np
Q = np.ones((2, 2))
K = np.ones((3, 2))
V = np.arange(3.0).reshape(3, 1)
mask = np.array([[1, 1, 0], [0, 1, 1]])
out, w = scaled_dot_product_attention(Q, K, V, mask=mask)
assert np.allclose(w.sum(axis=-1), [1.0, 1.0]), f"masked rows must renormalize to 1, got {w.sum(axis=-1)}"`,
      },
    ],
  };

  W.exercises["w3d3-e3"] = {
    title: "Sinusoidal positional encodings",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "Self-attention is order-blind. Give it a sense of position, straight from the paper.",
    description: String.raw`Attention treats its input as a set — shuffle the tokens and the output just permutes. The original transformer injects order with fixed sinusoidal position vectors added to the embeddings.

**~sinusoidal_positions(seq_len, d_model)~** — return an array of shape ~(seq_len, d_model)~ (~d_model~ even) where, for position ~pos~ and dimension index ~i~:

~~~text
angle(pos, i) = pos / 10000 ** (2 * (i // 2) / d_model)
PE[pos, 2k]   = sin(angle at that column)   # even columns
PE[pos, 2k+1] = cos(angle at that column)   # odd columns
~~~

Even-indexed columns use ~sin~, odd-indexed columns use ~cos~, and a pair of columns ~(2k, 2k+1)~ shares the same angular frequency.

~~~python
PE = sinusoidal_positions(4, 8)
PE.shape            # (4, 8)
PE[0]               # [0, 1, 0, 1, 0, 1, 0, 1]  (sin(0)=0, cos(0)=1)
PE[1, 0], PE[1, 1]  # (sin(1), cos(1)) ~ (0.8415, 0.5403)  because column-0 frequency is 1
~~~

Constraints: ~numpy~ only. All values lie in ~[-1, 1]~.

Interview angle: positional encoding separates people who memorized "transformers use sin and cos" from those who can say *why* (order-invariance of attention) and *how* (geometric-progression frequencies letting the model attend by relative offset).`,
    starter: String.raw`import numpy as np

def sinusoidal_positions(seq_len, d_model):
    """Return (seq_len, d_model) sinusoidal position encodings.
    Even columns use sin, odd columns use cos; column pair (2k, 2k+1)
    shares frequency 1 / 10000 ** (2k / d_model)."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Build pos as a column vector np.arange(seq_len)[:, None] and i as a row np.arange(d_model)[None, :].`,
      String.raw`The divisor uses 2 * (i // 2) so columns 0 and 1 share an exponent, 2 and 3 share the next, and so on.`,
      String.raw`Compute angles once, then write sines into the even columns [:, 0::2] and cosines into the odd columns [:, 1::2].`,
    ],
    solution: String.raw`import numpy as np

def sinusoidal_positions(seq_len, d_model):
    pos = np.arange(seq_len)[:, None]
    i = np.arange(d_model)[None, :]
    div = np.power(10000.0, (2 * (i // 2)) / d_model)
    angles = pos / div
    pe = np.zeros((seq_len, d_model))
    pe[:, 0::2] = np.sin(angles[:, 0::2])
    pe[:, 1::2] = np.cos(angles[:, 1::2])
    return pe`,
    tests: [
      {
        name: "shape is (seq_len, d_model)",
        code: String.raw`pe = sinusoidal_positions(4, 8)
assert pe.shape == (4, 8), f"expected (4,8), got {pe.shape}"`,
      },
      {
        name: "position 0 is alternating sin(0)=0 and cos(0)=1",
        code: String.raw`import numpy as np
pe = sinusoidal_positions(3, 6)
assert np.allclose(pe[0], [0.0, 1.0, 0.0, 1.0, 0.0, 1.0]), f"row 0 wrong: {pe[0]}"`,
      },
      {
        name: "column 0 is sin(pos), column 1 is cos(pos)",
        code: String.raw`import numpy as np
pe = sinusoidal_positions(5, 4)
pos = np.arange(5)
assert np.allclose(pe[:, 0], np.sin(pos)), f"column 0 must be sin(pos), got {pe[:,0]}"
assert np.allclose(pe[:, 1], np.cos(pos)), f"column 1 must be cos(pos), got {pe[:,1]}"`,
      },
      {
        name: "all values stay within [-1, 1]",
        code: String.raw`import numpy as np
pe = sinusoidal_positions(20, 16)
assert pe.max() <= 1.0 + 1e-9 and pe.min() >= -1.0 - 1e-9, f"out of range: min {pe.min()}, max {pe.max()}"`,
      },
      {
        name: "a column pair shares its frequency",
        code: String.raw`import numpy as np
pe = sinusoidal_positions(6, 8)
# columns 2 and 3 share angle = pos / 10000 ** (2/8)
div = 10000.0 ** (2.0 / 8)
pos = np.arange(6)
assert np.allclose(pe[:, 2], np.sin(pos / div)), f"column 2 frequency wrong: {pe[:,2]}"
assert np.allclose(pe[:, 3], np.cos(pos / div)), f"column 3 frequency wrong: {pe[:,3]}"`,
      },
    ],
  };

  // ================= Day 4 =================
  W.days.push({
    id: "w3d4",
    title: "Transformer Anatomy: BERT vs GPT",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w3d4-lesson", minutes: 25 },
      { type: "quiz",     id: "w3d4-quiz",   minutes: 12 },
      { type: "exercise", id: "w3d4-e1",     minutes: 25 },
      { type: "exercise", id: "w3d4-e2",     minutes: 30 },
      { type: "exercise", id: "w3d4-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "nlp", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w3d4-lesson"] = {
    title: "Transformer Anatomy: BERT vs GPT",
    md: String.raw`Yesterday you built one attention head. Today you learn the block that wraps it and the two dynasties — BERT and GPT — that stack it in different ways. Interviewers love this territory because a single sentence ("BERT is a decoder") instantly reveals whether you actually understand the architecture or just the buzzwords.

### One block, stacked N times

A transformer is not complicated; it is one block repeated. BERT-base and GPT-2 small both stack 12 identical blocks. Each block is exactly two sub-layers, each wrapped in a residual connection and a LayerNorm:

~~~text
x -> [ multi-head self-attention ] -> add x -> LayerNorm
  -> [ position-wise feed-forward ] -> add   -> LayerNorm
~~~

The residual ("add x") lets gradients flow straight through, so you can stack dozens of blocks without the signal dying. LayerNorm keeps each token's activations at a stable scale. That is the entire skeleton.

### Multi-head attention: why split?

A single attention head computes one weighted average — it can focus on one kind of relationship at a time. Multi-head attention runs ~h~ heads in parallel, each in a smaller subspace, then concatenates them:

~~~text
d_model = 768,  h = 12  ->  head_dim = d_model / h = 64
each head:  project to 64 dims, do attention, get a 64-d output
concat 12 heads -> 768 -> final linear projection
~~~

Because ~head_dim = d_model / h~, the total compute stays roughly constant — you are slicing the same budget, not adding to it. The payoff: one head can track subject-verb agreement while another tracks coreference and a third tracks position. Different heads specialize in different **representation subspaces**.

### The feed-forward network and its 4x expansion

After attention mixes information *across* tokens, the FFN transforms each token *independently*. It is two linear layers with a nonlinearity, and it expands the dimension by 4x in the middle:

~~~text
FFN(x) = W2 @ gelu(W1 @ x + b1) + b2
768 -> 3072 -> 768        # d_ff = 4 * d_model
~~~

This is where most of a transformer's parameters actually live — two big matrices per block. The wide hidden layer gives the model room to compute richer per-token features before squeezing back down.

### Residuals and LayerNorm: pre vs post

The original 2017 paper used **post-LN**: normalize *after* adding the residual. Modern models (GPT-2 onward) use **pre-LN**: normalize *before* the sub-layer, inside the residual branch. Pre-LN keeps a clean identity path for gradients, which makes very deep stacks train stably without delicate learning-rate warmup. One-liner for the interview: *pre-LN is more stable and easier to train deep; post-LN can reach slightly better final quality but is finicky.*

### Encoder, decoder, encoder-decoder

The same block powers three families, differing only in **masking** and **training objective**:

- **Encoder (BERT)**: every token attends to every other token — fully bidirectional. Trained with **masked language modeling (MLM)**: hide ~15%~ of tokens and predict them from both sides. The special ~[CLS]~ token's final state is used as a whole-sequence summary for classification. Great for understanding tasks (classification, NER, retrieval).
- **Decoder (GPT)**: **causal** masking blocks every token from seeing the future, so the model can be trained to predict the next token. This autoregressive objective is what makes GPT a generator.
- **Encoder-decoder (T5, original transformer)**: an encoder reads the source, a decoder generates while cross-attending to it. Natural for translation and summarization.

The punchline candidates miss: BERT and GPT run the *same* block. The difference is the mask and the objective, not some exotic layer.

### Counting parameters

A back-of-envelope count interviewers ask for, ignoring biases and LayerNorm:

~~~text
embeddings         = vocab * d_model
per block:
  attention (Wq,Wk,Wv,Wo) = 4 * d_model^2
  FFN (two matrices)      = 2 * d_model * d_ff
total = vocab*d_model + n_layers * (4*d_model^2 + 2*d_model*d_ff)
~~~

Plug in BERT-base (~vocab~ ~30k, ~d_model~ 768, 12 layers, ~d_ff~ 3072): embeddings ~23M, each block ~7.1M, times 12 ~85M, total ~108M — right next to the quoted 110M. Today's optional exercise makes this exact.

### ⚠️ Common pitfalls

- Saying "BERT is a decoder" or "GPT is bidirectional" — the fastest way to fail a transformer screen.
- Forgetting ~head_dim = d_model / h~, then claiming multi-head multiplies the parameter count.
- Believing most parameters live in attention — the FFN's 4x block usually dominates.
- Dropping the residual connection and wondering why a deep stack will not train.
- Thinking encoder vs decoder is a different layer type, rather than the same block with a different mask and objective.

### 🎤 In interviews, they ask

- Draw a transformer block. Where are the residuals and LayerNorms?
- BERT vs GPT: architecture, masking, and pretraining objective for each.
- Why split attention into heads? What is head_dim if d_model=512 and h=8?
- Pre-LN vs post-LN — which trains more stably and why?
- Estimate the parameter count of a transformer given vocab, d_model, layers and d_ff.

### TL;DR

- A transformer is one block (attention + FFN, each with residual + LayerNorm) stacked N times.
- Multi-head splits d_model into h heads of size d_model/h; heads specialize, compute stays constant.
- The FFN expands 4x (d_model -> 4*d_model -> d_model) and holds most of the parameters.
- Pre-LN (norm before sub-layer) trains deep stacks more stably than post-LN.
- BERT = bidirectional encoder + MLM + [CLS]; GPT = causal decoder + next-token prediction. Same block, different mask/objective.
- Params ~ vocab*d_model + n_layers*(4*d_model^2 + 2*d_model*d_ff).

### Go deeper

- [The Illustrated Transformer — Jay Alammar](https://jalammar.github.io/illustrated-transformer/)
- [Hugging Face NLP course — transformer architectures](https://huggingface.co/learn/nlp-course)
- [Understanding encoder/decoder LLMs — Sebastian Raschka](https://sebastianraschka.com/blog/)
`,
  };

  W.quizzes["w3d4-quiz"] = [
    {
      q: String.raw`Why does multi-head attention split d_model into h heads instead of running one big attention over all d_model dimensions?`,
      options: [
        "It reduces the total parameter count compared to single-head attention",
        "Each head must be fed a different input sentence",
        "Each head attends in its own representation subspace (syntax, coreference, position) in parallel, and the outputs are concatenated",
        "Splitting is required so the softmax does not overflow",
      ],
      answer: 2,
      explain: String.raw`With head_dim = d_model / h, the heads split the same budget, so total compute and parameters stay roughly constant — not reduced. The value is specialization: different heads learn to focus on different relationships, and concatenating them gives a richer mixture. Softmax stability is handled by the sqrt(d_k) scaling, not by head splitting.`,
    },
    {
      q: String.raw`In a standard transformer block, the position-wise feed-forward network expands the hidden dimension by what factor before projecting back down?`,
      options: [
        "4x, e.g. 768 -> 3072 -> 768",
        "2x, e.g. 768 -> 1536 -> 768",
        "It keeps the dimension constant throughout",
        "16x, e.g. 768 -> 12288 -> 768",
      ],
      answer: 0,
      explain: String.raw`The convention from the original paper is d_ff = 4 * d_model, so BERT-base goes 768 -> 3072 -> 768. This wide middle layer is where most transformer parameters live (two big matrices per block), which is why FFN size dominates attention in the parameter budget.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
X = np.zeros((5, 12))          # (seq_len, d_model)
h = 4
head_dim = X.shape[1] // h
heads = X.reshape(5, h, head_dim).transpose(1, 0, 2)
print(heads.shape)
~~~`,
      options: [
        "(5, 4, 3)",
        "(4, 5, 3)",
        "(4, 3, 5)",
        "(5, 12, 4)",
      ],
      answer: 1,
      explain: String.raw`d_model=12 splits into h=4 heads of head_dim=3. reshape gives (5, 4, 3) = (seq_len, heads, head_dim), then transpose(1,0,2) swaps the first two axes to (4, 5, 3) = (heads, seq_len, head_dim). Putting heads first is the standard layout so each head can be attended independently.`,
    },
    {
      q: String.raw`What is the practical difference between post-LN (original transformer) and pre-LN (most modern LLMs)?`,
      options: [
        "Pre-LN removes layer normalization entirely",
        "Post-LN is used only in encoders and pre-LN only in decoders",
        "They are identical; the terms just refer to different deep-learning frameworks",
        "Pre-LN normalizes before each sub-layer (inside the residual branch), giving cleaner gradient flow and more stable deep training",
      ],
      answer: 3,
      explain: String.raw`Pre-LN applies LayerNorm before attention/FFN, leaving an unnormalized identity path for the residual, which stabilizes gradients and lets very deep stacks train without fragile warmup. Post-LN normalizes after the add and can reach marginally better quality but is harder to train. Neither removes normalization, and both appear in encoders and decoders.`,
    },
    {
      q: String.raw`Which statement correctly describes BERT and GPT?`,
      options: [
        "BERT is a bidirectional encoder trained with masked language modeling; GPT is a causal decoder trained to predict the next token",
        "BERT is a decoder and GPT is an encoder",
        "Both are encoder-decoder models like the original transformer",
        "BERT uses causal masking while GPT sees the whole sequence bidirectionally",
      ],
      answer: 0,
      explain: String.raw`BERT stacks encoder blocks with full bidirectional attention and learns by filling in masked tokens; GPT stacks decoder blocks with causal masking and learns by predicting the next token. Swapping those roles (a favorite distractor) is the classic wrong answer. Only T5-style models are encoder-decoder.`,
    },
    {
      q: String.raw`Why can BERT use bidirectional context during pretraining while GPT cannot?`,
      options: [
        "BERT simply has more parameters than GPT",
        "GPT uses subword tokenization and BERT uses whole words",
        "BERT was trained on a much larger corpus",
        "BERT's masked-LM objective hides the target tokens, so seeing both sides is safe; GPT predicts the next token, so it must be blocked from seeing the future",
      ],
      answer: 3,
      explain: String.raw`The objective dictates the masking. Since BERT hides the tokens it must predict, letting the rest of the sentence (left and right) inform the guess is not cheating. GPT predicts token t+1 from tokens up to t, so bidirectional attention would leak the answer — hence the causal mask. It is about the training task, not model size, data, or tokenizer.`,
    },
    {
      q: String.raw`What does this print?

~~~python
vocab, d, L, d_ff = 100, 8, 2, 32
params = vocab * d + L * (4 * d * d + 2 * d * d_ff)
print(params)
~~~`,
      options: [
        "800",
        "2336",
        "1536",
        "3072",
      ],
      answer: 1,
      explain: String.raw`Embeddings = 100*8 = 800. Per block = 4*8*8 + 2*8*32 = 256 + 512 = 768, and with L=2 that is 1536. Total = 800 + 1536 = 2336. This is the standard rough parameter count (biases and LayerNorm ignored) that interviewers ask you to estimate.`,
    },
    {
      q: String.raw`In BERT, what is the [CLS] token used for?`,
      options: [
        "It marks the end of every sentence",
        "It is the padding token for short sequences",
        "Its final-layer hidden state serves as an aggregate representation of the whole sequence for classification",
        "It is the mask token that hides words during pretraining",
      ],
      answer: 2,
      explain: String.raw`[CLS] is prepended to the input, and after the encoder its top-layer vector is treated as a pooled summary of the sentence, fed to a classifier head. [SEP] marks boundaries, [PAD] handles padding, and [MASK] is the token hidden during MLM — mixing these up is a common slip.`,
    },
  ];

  W.exercises["w3d4-e1"] = {
    title: "Split and merge attention heads",
    difficulty: 3,
    xp: 40,
    minutes: 25,
    packages: ["numpy"],
    brief: "Reshape one big attention into h parallel heads — and put them back exactly.",
    description: String.raw`Multi-head attention slices the model dimension into ~h~ heads, attends within each, then stitches them back. You will implement the reshape plumbing that makes this exact and reversible.

**1. ~split_heads(X, h)~** — ~X~ has shape ~(seq_len, d_model)~. Split it into ~h~ heads of size ~head_dim = d_model / h~ and return an array of shape ~(h, seq_len, head_dim)~. Head ~k~ must own columns ~[k*head_dim : (k+1)*head_dim]~ of ~X~. Raise (an ~AssertionError~ is fine) if ~h~ does not divide ~d_model~.

**2. ~merge_heads(X)~** — the exact inverse. Given ~(h, seq_len, head_dim)~, return ~(seq_len, d_model)~ so that ~merge_heads(split_heads(X, h))~ reproduces the original ~X~.

~~~python
X = np.arange(12).reshape(1, 12)     # (seq_len=1, d_model=12)
heads = split_heads(X, 3)            # shape (3, 1, 4)
heads[0]                             # [[0, 1, 2, 3]]  -> head 0 owns the first 4 cols
merge_heads(heads)                   # back to the original (1, 12)
~~~

Constraints: ~numpy~ only, reshape and transpose — no python loops over elements.

Interview angle: candidates routinely botch the axis order here. The tell is whether you reshape to ~(seq_len, h, head_dim)~ and *then* transpose to bring heads to the front, versus reshaping straight to ~(h, ...)~ which scrambles the data.`,
    starter: String.raw`import numpy as np

def split_heads(X, h):
    """(seq_len, d_model) -> (h, seq_len, head_dim), head_dim = d_model // h.
    Head k owns columns [k*head_dim:(k+1)*head_dim]."""
    # your code here
    raise NotImplementedError

def merge_heads(X):
    """(h, seq_len, head_dim) -> (seq_len, h*head_dim); inverse of split_heads."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Split first into (seq_len, h, head_dim) with reshape, THEN transpose(1, 0, 2) to bring heads to the front — order matters.`,
      String.raw`Guard with assert d_model % h == 0 before reshaping so a bad h fails loudly.`,
      String.raw`merge_heads reverses it: transpose(1, 0, 2) back to (seq_len, h, head_dim), then reshape to (seq_len, h*head_dim).`,
    ],
    solution: String.raw`import numpy as np

def split_heads(X, h):
    seq_len, d_model = X.shape
    assert d_model % h == 0, f"h={h} must divide d_model={d_model}"
    head_dim = d_model // h
    return X.reshape(seq_len, h, head_dim).transpose(1, 0, 2)

def merge_heads(X):
    h, seq_len, head_dim = X.shape
    return X.transpose(1, 0, 2).reshape(seq_len, h * head_dim)`,
    tests: [
      {
        name: "split produces (h, seq_len, head_dim)",
        code: String.raw`import numpy as np
X = np.zeros((5, 12))
heads = split_heads(X, 4)
assert heads.shape == (4, 5, 3), f"expected (4,5,3), got {heads.shape}"`,
      },
      {
        name: "head k owns the correct column block",
        code: String.raw`import numpy as np
X = np.arange(12).reshape(1, 12)
heads = split_heads(X, 3)
assert heads.shape == (3, 1, 4), f"expected (3,1,4), got {heads.shape}"
assert heads[0, 0].tolist() == [0, 1, 2, 3], f"head 0 wrong: {heads[0,0].tolist()}"
assert heads[1, 0].tolist() == [4, 5, 6, 7], f"head 1 wrong: {heads[1,0].tolist()}"
assert heads[2, 0].tolist() == [8, 9, 10, 11], f"head 2 wrong: {heads[2,0].tolist()}"`,
      },
      {
        name: "merge_heads is an exact inverse of split_heads",
        code: String.raw`import numpy as np
rng = np.random.default_rng(0)
X = rng.standard_normal((7, 16))
for h in (1, 2, 4, 8, 16):
    assert np.allclose(merge_heads(split_heads(X, h)), X), f"round-trip failed for h={h}"`,
      },
      {
        name: "merge shape is (seq_len, d_model)",
        code: String.raw`import numpy as np
heads = np.zeros((4, 6, 5))
merged = merge_heads(heads)
assert merged.shape == (6, 20), f"expected (6,20), got {merged.shape}"`,
      },
      {
        name: "an h that does not divide d_model is rejected",
        code: String.raw`import numpy as np
raised = False
try:
    split_heads(np.zeros((4, 12)), 5)
except (AssertionError, ValueError):
    raised = True
assert raised, "split_heads must reject h=5 when d_model=12"`,
      },
    ],
  };

  W.exercises["w3d4-e2"] = {
    title: "Causal masking for decoders",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: ["numpy"],
    brief: "Build the lower-triangular mask that stops GPT from reading the future.",
    description: String.raw`A decoder must never attend to tokens that come later in the sequence. You will build the causal mask and the function that applies it to a score matrix.

**1. ~causal_mask(n)~** — return an ~(n, n)~ integer array that is lower-triangular: entry ~[i, j] = 1~ if ~j <= i~ (token ~i~ may attend to token ~j~) and ~0~ otherwise.

**2. ~apply_mask(scores, mask)~** — return a copy of ~scores~ where every position with ~mask == 0~ is replaced by ~-1e9~, leaving allowed positions untouched. After a softmax those ~-1e9~ entries collapse to ~0~ weight.

~~~python
causal_mask(3)
# [[1, 0, 0],
#  [1, 1, 0],
#  [1, 1, 1]]

apply_mask(np.zeros((3, 3)), causal_mask(3))
# lower triangle stays 0.0, the strict upper triangle becomes -1e9
~~~

Constraints: ~numpy~ only. ~apply_mask~ must not mutate its input array.

Interview angle: "how does a decoder avoid seeing the future?" almost always leads to writing this triangular mask. The subtlety they probe: the diagonal is allowed (a token sees itself), so it is ~j <= i~, not ~j < i~.`,
    starter: String.raw`import numpy as np

def causal_mask(n):
    """(n, n) lower-triangular mask of 1s; entry [i,j]=1 iff j <= i."""
    # your code here
    raise NotImplementedError

def apply_mask(scores, mask):
    """Return a copy of scores with mask==0 positions set to -1e9."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`np.tril(np.ones((n, n), dtype=int)) is the lower-triangular ones matrix in one call.`,
      String.raw`np.where(mask == 0, -1e9, scores) returns a new array without touching the original.`,
      String.raw`Remember the diagonal is 1: a token is allowed to attend to itself, so the condition is j <= i.`,
    ],
    solution: String.raw`import numpy as np

def causal_mask(n):
    return np.tril(np.ones((n, n), dtype=int))

def apply_mask(scores, mask):
    return np.where(np.asarray(mask) == 0, -1e9, np.asarray(scores, dtype=float))`,
    tests: [
      {
        name: "causal_mask(3) is exactly lower-triangular",
        code: String.raw`import numpy as np
m = causal_mask(3)
assert m.tolist() == [[1, 0, 0], [1, 1, 0], [1, 1, 1]], f"got {m.tolist()}"`,
      },
      {
        name: "diagonal is allowed and strict upper triangle is blocked",
        code: String.raw`import numpy as np
m = causal_mask(5)
assert np.all(np.diag(m) == 1), "every token must attend to itself"
iu = np.triu_indices(5, k=1)
assert np.all(m[iu] == 0), "strict upper triangle must be 0 (no peeking ahead)"`,
      },
      {
        name: "apply_mask sends blocked positions to -1e9",
        code: String.raw`import numpy as np
scores = np.zeros((3, 3))
out = apply_mask(scores, causal_mask(3))
assert out[0, 1] == -1e9 and out[0, 2] == -1e9 and out[1, 2] == -1e9, f"future positions must be -1e9, got {out}"
assert out[0, 0] == 0.0 and out[2, 1] == 0.0, f"allowed positions must be unchanged, got {out}"`,
      },
      {
        name: "apply_mask does not mutate its input",
        code: String.raw`import numpy as np
scores = np.ones((2, 2))
before = scores.copy()
_ = apply_mask(scores, causal_mask(2))
assert np.array_equal(scores, before), "apply_mask must not modify the original scores"`,
      },
      {
        name: "masked scores collapse to ~0 weight after softmax",
        code: String.raw`import numpy as np
scores = np.zeros((3, 3))
masked = apply_mask(scores, causal_mask(3))
e = np.exp(masked - masked.max(axis=-1, keepdims=True))
w = e / e.sum(axis=-1, keepdims=True)
assert w[0, 1] < 1e-9 and w[0, 2] < 1e-9, f"future weight must vanish, got {w[0]}"
assert np.isclose(w[0, 0], 1.0), f"token 0 attends only to itself, got {w[0,0]}"`,
      },
    ],
  };

  W.exercises["w3d4-e3"] = {
    title: "Count transformer parameters",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Estimate a model's parameter count the way interviewers ask you to on a whiteboard.",
    description: String.raw`Reproduce the back-of-envelope estimate every ML interviewer eventually asks for. Ignore biases, LayerNorm and the final head — just token embeddings plus the per-block matrices.

**~count_transformer_params(vocab, d_model, n_layers, d_ff)~** — return the integer:

~~~text
count = vocab * d_model
      + n_layers * (4 * d_model**2  +  2 * d_model * d_ff)
~~~

The ~4 * d_model**2~ is the four attention projections ~Wq, Wk, Wv, Wo~ (each ~d_model x d_model~); the ~2 * d_model * d_ff~ is the two FFN matrices (~d_model -> d_ff -> d_model~).

Worked example, BERT-base-ish (~vocab=30000, d_model=768, n_layers=12, d_ff=3072~):

~~~text
embeddings = 30000 * 768                      = 23,040,000
per block  = 4*768**2 + 2*768*3072
           = 2,359,296 + 4,718,592            = 7,077,888
total      = 23,040,000 + 12 * 7,077,888      = 107,974,656   (~108M)
~~~

Constraints: pure python, integer arithmetic, no imports.

Interview angle: this exact estimate ("how many parameters is a 12-layer, 768-dim model?") shows you know where the weights live — and that the FFN, not attention, usually dominates the per-block budget.`,
    starter: String.raw`def count_transformer_params(vocab, d_model, n_layers, d_ff):
    """Return vocab*d_model + n_layers*(4*d_model**2 + 2*d_model*d_ff)."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`The embedding term is simply vocab * d_model, computed once outside the per-layer part.`,
      String.raw`Per layer: 4 * d_model**2 for the attention projections plus 2 * d_model * d_ff for the FFN.`,
      String.raw`Multiply the per-layer cost by n_layers and add the embeddings; return an int.`,
    ],
    solution: String.raw`def count_transformer_params(vocab, d_model, n_layers, d_ff):
    embeddings = vocab * d_model
    per_layer = 4 * d_model ** 2 + 2 * d_model * d_ff
    return embeddings + n_layers * per_layer`,
    tests: [
      {
        name: "tiny hand-computable case",
        code: String.raw`got = count_transformer_params(10, 4, 1, 8)
# 10*4 + 1*(4*16 + 2*4*8) = 40 + (64 + 64) = 168
assert got == 168, f"expected 168, got {got}"`,
      },
      {
        name: "two-layer case",
        code: String.raw`got = count_transformer_params(100, 8, 2, 32)
# 800 + 2*(256 + 512) = 800 + 1536 = 2336
assert got == 2336, f"expected 2336, got {got}"`,
      },
      {
        name: "zero layers leaves only the embedding term",
        code: String.raw`assert count_transformer_params(5000, 128, 0, 512) == 5000 * 128, "n_layers=0 must give vocab*d_model"`,
      },
      {
        name: "adding a layer adds exactly one block's parameters",
        code: String.raw`base = count_transformer_params(1000, 64, 3, 256)
more = count_transformer_params(1000, 64, 4, 256)
block = 4 * 64 ** 2 + 2 * 64 * 256
assert more - base == block, f"one extra layer should add {block}, got {more - base}"`,
      },
      {
        name: "matches the BERT-base-ish worked example (~108M)",
        code: String.raw`got = count_transformer_params(30000, 768, 12, 3072)
assert got == 107974656, f"expected 107974656, got {got}"`,
      },
    ],
  };

  // ================= Day 5 =================
  W.days.push({
    id: "w3d5",
    title: "Subwords & Fine-Tuning in Practice",
    minutes: 122,
    blocks: [
      { type: "lesson",   id: "w3d5-lesson", minutes: 25 },
      { type: "quiz",     id: "w3d5-quiz",   minutes: 12 },
      { type: "exercise", id: "w3d5-e1",     minutes: 30 },
      { type: "exercise", id: "w3d5-e2",     minutes: 20 },
      { type: "exercise", id: "w3d5-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "nlp", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w3d5-lesson"] = {
    title: "Subwords & Fine-Tuning in Practice",
    md: String.raw`Two topics separate people who have *read* about transformers from people who have *shipped* them: how the tokenizer actually carves text into pieces, and how you adapt a pretrained model without a GPU farm. Both come up in every applied-NLP interview, and both have exact recipes worth memorizing.

### Why subwords at all

Day 1 left us with a dilemma: word tokens explode the vocabulary and choke on unseen words, while character tokens make sequences painfully long. Subword tokenization is the resolution that every modern model uses. A fixed vocabulary of ~30k-50k~ pieces keeps frequent words whole (~the~, ~playing~) and shatters rare ones into known fragments (~tokenization~ becomes ~token~ + ~##ization~). Three wins at once: bounded vocabulary, **zero out-of-vocabulary** (worst case falls back to single characters), and free morphology — ~playing~, ~played~, ~player~ all share the ~play~ piece.

### BPE, step by step

Byte-Pair Encoding starts from characters and greedily merges the most frequent adjacent pair, over and over. Take a toy corpus with word counts:

~~~text
low (x5)   lower (x2)   newest (x6)   widest (x3)

start (characters):
  l o w        l o w e r      n e w e s t      w i d e s t

count adjacent pairs (weighted by word frequency):
  (e, s): 6+3 = 9      (s, t): 6+3 = 9      (l, o): 5+2 = 7   ...

merge the winner (e, s) -> "es":
  n e w es t      w i d es t

repeat: now (es, t) = 9 wins -> "est", then (l, o) = 7 -> "lo", ...
~~~

You stop when the vocabulary hits the target size. The learned **merge list** is the tokenizer: to encode new text you re-apply those merges in order. Today's first exercise implements exactly one BPE step — find the top pair, merge it.

### WordPiece vs BPE vs SentencePiece

- **BPE** (GPT-2, RoBERTa): merge the *most frequent* pair. Simple frequency counting.
- **WordPiece** (BERT): merge the pair that most increases the training-corpus likelihood — roughly ~score(a,b) = count(a,b) / (count(a) * count(b))~ — so it favors pairs that occur together *more than chance*, not just often. Continuation pieces are marked with ~##~ (as in ~##ing~).
- **SentencePiece** (T5, LLaMA, ALBERT): treats the raw string — spaces included, encoded as ~_~ — as the unit, with no language-specific pre-tokenization. That is what lets it handle Chinese or Japanese, which have no spaces to split on.

### Special tokens and the attention mask

Tokenizers wrap your text in bookkeeping tokens. BERT adds ~[CLS]~ at the front (its pooled output classifies the sentence) and ~[SEP]~ between segments; ~[PAD]~ fills short sequences in a batch; ~[MASK]~ is the hidden token during pretraining; ~[UNK]~ is the last resort.

Padding creates a problem: those ~[PAD]~ positions are meaningless, and attention must ignore them. That is the job of the **attention mask** — a 1/0 vector, 1 for real tokens and 0 for padding, that blocks pad positions inside the softmax (exactly the masking trick from day 3):

~~~text
tokens:          [CLS]  i   loved  it  [SEP] [PAD] [PAD]
input_ids:        101  1045 3866  2009  102    0     0
attention_mask:    1    1    1     1     1     0     0
~~~

Forget to pass the attention mask and the model happily attends to padding — a silent accuracy leak that is a favorite interview "spot the bug".

### The fine-tuning recipe

Pretraining learned general language; fine-tuning nudges those weights toward your task. The knobs are surprisingly standard:

~~~text
optimizer:      AdamW
learning rate:  2e-5 to 5e-5   (10-100x smaller than pretraining!)
schedule:       linear warmup then decay
epochs:         2 to 4          (more overfits fast)
batch size:     16 or 32
~~~

The tiny learning rate is the crucial detail: the model already knows language, so large steps would cause **catastrophic forgetting** — wrecking the pretrained knowledge. On small datasets, freeze the lower layers (or all of them) and train only the top.

### Feature extraction vs full fine-tuning

- **Feature extraction**: freeze the whole backbone, run it once to get embeddings, train only a small head on top. Fast, cheap, resistant to overfitting on tiny data — but a lower quality ceiling.
- **Full fine-tuning**: update every weight. Best accuracy, needs more data and compute, and risks catastrophic forgetting if the learning rate is careless.

Rule of thumb: a few hundred labeled examples? Feature-extract or freeze most layers. Tens of thousands? Full fine-tune. The Hugging Face stack (~AutoTokenizer~, ~AutoModel~, ~Trainer~, the ~datasets~ library, the Hub) makes either path a dozen lines — but the interview tests whether you know *which* to reach for.

### ⚠️ Common pitfalls

- Passing padded ~input_ids~ without the matching ~attention_mask~, letting the model attend to ~[PAD]~.
- Fine-tuning at the pretraining learning rate (~1e-4~+) and destroying the pretrained weights.
- Training for 20 epochs on 500 examples — transformers overfit tiny datasets in 2-3 passes.
- Assuming BPE and WordPiece are identical; the merge criterion (frequency vs likelihood) differs.
- Splitting on spaces before feeding a SentencePiece model, which expects the raw string.

### 🎤 In interviews, they ask

- Walk through one BPE merge. How does BPE differ from WordPiece?
- What is the attention mask for, and what breaks if you omit it?
- Give me a fine-tuning recipe: optimizer, learning rate, epochs. Why is the LR so small?
- Feature extraction vs full fine-tuning — when do you pick each?
- Why do subwords solve the out-of-vocabulary problem that word tokenizers have?

### TL;DR

- Subwords (BPE/WordPiece/SentencePiece) give a bounded vocab, zero OOV, and shared morphology.
- BPE merges the most frequent adjacent pair repeatedly; the merge list *is* the tokenizer.
- WordPiece merges by likelihood gain and marks continuations with ~##~; SentencePiece tokenizes raw text, spaces included.
- Special tokens ([CLS], [SEP], [PAD], [MASK]) plus a 1/0 attention mask that hides padding.
- Fine-tune with AdamW, LR ~2e-5~, 2-4 epochs; too-large LR causes catastrophic forgetting.
- Freeze/feature-extract on small data; full fine-tune when you have enough labels.

### Go deeper

- [Hugging Face NLP course — tokenizers and fine-tuning](https://huggingface.co/learn/nlp-course)
- [The Illustrated Transformer — Jay Alammar](https://jalammar.github.io/illustrated-transformer/)
- [Fine-tuning and transfer learning notes — Sebastian Raschka](https://sebastianraschka.com/blog/)
`,
  };

  W.quizzes["w3d5-quiz"] = [
    {
      q: String.raw`What is the core advantage of subword tokenization over pure word-level tokenization?`,
      options: [
        "It makes every sequence shorter than character tokenization",
        "It keeps the vocabulary bounded and eliminates out-of-vocabulary tokens by falling back to known pieces",
        "It removes the need for an embedding matrix",
        "It guarantees each token is a valid dictionary word",
      ],
      answer: 1,
      explain: String.raw`Subwords cap the vocabulary at ~30k-50k pieces and can always represent an unseen word by splitting it into smaller known fragments (worst case, single characters), so there is no true OOV. Sequences are typically longer than word-level, not shorter, and the pieces are deliberately not always real words (##ization).`,
    },
    {
      q: String.raw`What does this print?

~~~python
from collections import Counter
corpus = [["l","o","w"], ["l","o","w"], ["l","o","w","e","r"]]
pairs = Counter()
for word in corpus:
    for a, b in zip(word, word[1:]):
        pairs[(a, b)] += 1
print(pairs[("l","o")], pairs[("o","w")], pairs[("w","e")])
~~~`,
      options: [
        "2 2 1",
        "3 3 2",
        "3 3 1",
        "3 2 1",
      ],
      answer: 2,
      explain: String.raw`(l,o) and (o,w) each appear once per word across all three words = 3 each; (w,e) appears only in the single "lower" = 1. This adjacent-pair count is the first step of a BPE merge, where the top pair (here a tie at 3) gets merged into one symbol.`,
    },
    {
      q: String.raw`How does WordPiece's merge criterion differ from BPE's?`,
      options: [
        "WordPiece merges the pair that maximizes likelihood gain (count(a,b)/(count(a)*count(b))), while BPE merges the most frequent pair",
        "WordPiece merges the least frequent pair to preserve rare words",
        "BPE uses likelihood; WordPiece uses raw frequency",
        "They are the same algorithm with a different name",
      ],
      answer: 0,
      explain: String.raw`BPE is pure frequency: merge whatever adjacent pair occurs most. WordPiece instead picks the merge that most increases the corpus likelihood, which normalizes by the individual token frequencies, favoring pairs that co-occur more than chance. WordPiece also marks continuation pieces with ##.`,
    },
    {
      q: String.raw`What is the purpose of the attention_mask that accompanies input_ids?`,
      options: [
        "It marks which tokens are subwords versus whole words",
        "It stores the position index of each token",
        "It selects which layers to fine-tune",
        "It is 1 for real tokens and 0 for padding, so attention ignores [PAD] positions",
      ],
      answer: 3,
      explain: String.raw`Batching forces short sequences to be padded to a common length, and those [PAD] tokens carry no meaning. The attention mask (1 = real, 0 = pad) is applied inside the softmax to zero out padding positions. Omit it and the model attends to padding, silently degrading accuracy.`,
    },
    {
      q: String.raw`Why is the fine-tuning learning rate (about 2e-5) so much smaller than the pretraining learning rate?`,
      options: [
        "Smaller learning rates make training faster",
        "The model already encodes general language; large steps would cause catastrophic forgetting of the pretrained weights",
        "It is required by the AdamW optimizer specifically",
        "Larger learning rates only work on GPUs",
      ],
      answer: 1,
      explain: String.raw`Fine-tuning starts from weights that already know language, so you want to nudge them, not overwrite them. A large learning rate takes big steps that erase pretrained knowledge — catastrophic forgetting. A small LR (plus few epochs) preserves the backbone while adapting to the task.`,
    },
    {
      q: String.raw`When should you prefer feature extraction (frozen backbone, train only a head) over full fine-tuning?`,
      options: [
        "When you have millions of labeled examples and want peak accuracy",
        "When you need the model to forget its pretraining",
        "When labeled data is scarce and you want speed and resistance to overfitting, accepting a lower quality ceiling",
        "Feature extraction always beats full fine-tuning",
      ],
      answer: 2,
      explain: String.raw`Freezing the backbone and training a small head is cheap, fast, and hard to overfit — ideal for a few hundred examples. The tradeoff is a lower ceiling than updating all weights. With tens of thousands of labels, full fine-tuning usually wins, so neither is universally better.`,
    },
    {
      q: String.raw`What does this print?

~~~python
seqs = [[1, 2, 3], [4, 5]]
maxlen = max(len(s) for s in seqs)
padded = [s + [0] * (maxlen - len(s)) for s in seqs]
mask = [[1] * len(s) + [0] * (maxlen - len(s)) for s in seqs]
print(padded[1], mask[1])
~~~`,
      options: [
        "[4, 5, 0] [1, 1, 0]",
        "[4, 5] [1, 1]",
        "[4, 5, 0] [1, 1, 1]",
        "[0, 4, 5] [0, 1, 1]",
      ],
      answer: 0,
      explain: String.raw`maxlen is 3, so the second sequence [4,5] is right-padded with one 0 to [4,5,0], and its mask is [1,1,0] — two real tokens then one pad. This is exactly pad_batch, the routine you implement today; right-padding with a 0 mask on the pads is the standard convention.`,
    },
    {
      q: String.raw`What makes SentencePiece able to tokenize languages like Chinese that have no spaces?`,
      options: [
        "It ships with a dictionary for every language",
        "It requires the text to be pre-split into words first",
        "It only works on English and transliterates other languages",
        "It treats the raw string (spaces included, encoded specially) as the unit, with no language-specific pre-tokenization",
      ],
      answer: 3,
      explain: String.raw`SentencePiece operates directly on the raw character stream, encoding spaces as a normal symbol, so it never assumes whitespace-delimited words. That language-agnostic design is why T5 and LLaMA use it and why it handles scripts without spaces. Requiring pre-split words would defeat the entire purpose.`,
    },
  ];

  W.exercises["w3d5-e1"] = {
    title: "One BPE merge step",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: [],
    brief: "Find the most frequent adjacent pair and merge it — the atom of every BPE tokenizer.",
    description: String.raw`BPE learns a tokenizer by repeating one operation: find the most frequent adjacent symbol pair, merge it everywhere, repeat. You will implement that single step.

The corpus is a list of words, each a list of current symbols, e.g. ~[["l","o","w"], ["l","o","w","e","r"]]~.

**1. ~most_frequent_pair(tokens_list)~** — count every adjacent pair across all words and return the most frequent one as a tuple ~(a, b)~. Break ties by returning the lexicographically **smallest** pair (so the result is deterministic). Return ~None~ if there are no pairs at all.

**2. ~merge_pair(tokens_list, pair)~** — return a new corpus where every adjacent occurrence of ~pair = (a, b)~ is replaced by the single symbol ~a + b~, scanning left to right without overlapping. Do not mutate the input.

~~~python
corpus = [["l","o","w"], ["l","o","w"], ["l","o","w","e","r"]]
most_frequent_pair(corpus)          # ('l', 'o')   -- ties (l,o) and (o,w) at 3 -> smallest
merge_pair(corpus, ("l","o"))
# [['lo','w'], ['lo','w'], ['lo','w','e','r']]
~~~

Constraints: pure python + ~collections~. Overlapping matches like ~["a","a","a"]~ merging ~("a","a")~ must give ~["aa","a"]~ (greedy left-to-right).

Interview angle: tokenizer internals show up constantly, and the two things they check are your tie-break determinism and correct non-overlapping replacement — the exact spots naive implementations get wrong.`,
    starter: String.raw`from collections import Counter

def most_frequent_pair(tokens_list):
    """Most frequent adjacent pair across all words as (a, b).
    Ties -> lexicographically smallest pair. None if no pairs exist."""
    # your code here
    raise NotImplementedError

def merge_pair(tokens_list, pair):
    """Return a new corpus with every adjacent (a, b) merged into a+b,
    left-to-right without overlap. Do not mutate the input."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Count pairs with a Counter over zip(word, word[1:]) for every word in the corpus.`,
      String.raw`For a deterministic winner use min(counts, key=lambda p: (-counts[p], p)): highest count first, smallest pair on ties.`,
      String.raw`To merge, walk each word with an index i; when word[i], word[i+1] match the pair, append a+b and jump i by 2, else append word[i] and step by 1.`,
    ],
    solution: String.raw`from collections import Counter

def most_frequent_pair(tokens_list):
    counts = Counter()
    for word in tokens_list:
        for a, b in zip(word, word[1:]):
            counts[(a, b)] += 1
    if not counts:
        return None
    return min(counts, key=lambda p: (-counts[p], p))

def merge_pair(tokens_list, pair):
    a, b = pair
    merged = a + b
    out = []
    for word in tokens_list:
        new_word = []
        i = 0
        while i < len(word):
            if i < len(word) - 1 and word[i] == a and word[i + 1] == b:
                new_word.append(merged)
                i += 2
            else:
                new_word.append(word[i])
                i += 1
        out.append(new_word)
    return out`,
    tests: [
      {
        name: "picks the top pair with lexicographic tie-break",
        code: String.raw`corpus = [["l","o","w"], ["l","o","w"], ["l","o","w","e","r"]]
got = most_frequent_pair(corpus)
assert got == ("l", "o"), f"expected ('l','o') by tie-break, got {got}"`,
      },
      {
        name: "picks a clear winner when there is no tie",
        code: String.raw`corpus = [["a","b","c"], ["a","b","d"], ["x","a","b"]]
got = most_frequent_pair(corpus)
assert got == ("a", "b"), f"(a,b) occurs 3x, others once; got {got}"`,
      },
      {
        name: "merge replaces every occurrence and returns a new corpus",
        code: String.raw`corpus = [["l","o","w"], ["l","o","w","e","r"]]
out = merge_pair(corpus, ("l","o"))
assert out == [["lo","w"], ["lo","w","e","r"]], f"got {out}"
assert corpus == [["l","o","w"], ["l","o","w","e","r"]], "input must not be mutated"`,
      },
      {
        name: "overlapping run merges greedily left to right",
        code: String.raw`assert merge_pair([["a","a","a"]], ("a","a")) == [["aa","a"]], "3 a's -> aa then leftover a"
assert merge_pair([["a","a","a","a"]], ("a","a")) == [["aa","aa"]], "4 a's -> aa aa"`,
      },
      {
        name: "empty or single-symbol words yield no pair",
        code: String.raw`assert most_frequent_pair([]) is None, "no words -> None"
assert most_frequent_pair([["a"], ["b"], ["c"]]) is None, "single-symbol words -> no pairs -> None"`,
      },
      {
        name: "a full merge step then recount finds the next pair",
        code: String.raw`corpus = [["n","e","w","e","s","t"], ["w","i","d","e","s","t"]]
p1 = most_frequent_pair(corpus)
assert p1 == ("e", "s"), f"(e,s) and (s,t) tie at 2 -> smallest (e,s), got {p1}"
step = merge_pair(corpus, p1)
assert step[0] == ["n","e","w","es","t"], f"got {step[0]}"
p2 = most_frequent_pair(step)
assert p2 == ("es", "t"), f"after merging es, next is (es,t), got {p2}"`,
      },
    ],
  };

  W.exercises["w3d5-e2"] = {
    title: "Pad a batch and build the attention mask",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Turn ragged sequences into a rectangular batch with the mask that hides the padding.",
    description: String.raw`Models consume rectangular batches, but tokenized sentences have different lengths. You right-pad them to a common length and emit the attention mask that tells the model which positions are real.

**~pad_batch(seqs, pad_id=0)~** — ~seqs~ is a list of integer-id lists. Pad each (on the right) with ~pad_id~ up to the longest length, and return a tuple ~(padded, attention_mask)~ where:

- ~padded~ is the list of equal-length id lists,
- ~attention_mask~ is a parallel list with ~1~ for real tokens and ~0~ for padding.

~~~python
pad_batch([[1, 2, 3], [4, 5]])
# ([[1, 2, 3], [4, 5, 0]],
#  [[1, 1, 1], [1, 1, 0]])

pad_batch([])          # ([], [])
~~~

Constraints: pure python, no imports. Handle the empty batch. Use ~pad_id~ (not a hardcoded 0) for the padding value.

Interview angle: this is the unglamorous glue every training loop needs, and forgetting the mask (or hardcoding pad_id) is a real bug interviewers plant in "review this data-loader" questions.`,
    starter: String.raw`def pad_batch(seqs, pad_id=0):
    """Right-pad seqs to equal length with pad_id.
    Return (padded, attention_mask) where mask is 1 for real tokens, 0 for pad."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Guard the empty case first: if not seqs, return ([], []).`,
      String.raw`maxlen = max(len(s) for s in seqs); each row needs maxlen - len(s) padding slots.`,
      String.raw`Build padded as list(s) + [pad_id]*pad and mask as [1]*len(s) + [0]*pad.`,
    ],
    solution: String.raw`def pad_batch(seqs, pad_id=0):
    if not seqs:
        return [], []
    maxlen = max(len(s) for s in seqs)
    padded = []
    attention_mask = []
    for s in seqs:
        pad = maxlen - len(s)
        padded.append(list(s) + [pad_id] * pad)
        attention_mask.append([1] * len(s) + [0] * pad)
    return padded, attention_mask`,
    tests: [
      {
        name: "ragged batch is right-padded with a matching mask",
        code: String.raw`padded, mask = pad_batch([[1, 2, 3], [4, 5]])
assert padded == [[1, 2, 3], [4, 5, 0]], f"got {padded}"
assert mask == [[1, 1, 1], [1, 1, 0]], f"got {mask}"`,
      },
      {
        name: "already-equal lengths need no padding",
        code: String.raw`padded, mask = pad_batch([[7, 8], [9, 10]])
assert padded == [[7, 8], [9, 10]], f"got {padded}"
assert mask == [[1, 1], [1, 1]], f"got {mask}"`,
      },
      {
        name: "custom pad_id is respected",
        code: String.raw`padded, mask = pad_batch([[1], [2, 3, 4]], pad_id=99)
assert padded == [[1, 99, 99], [2, 3, 4]], f"got {padded}"
assert mask == [[1, 0, 0], [1, 1, 1]], f"got {mask}"`,
      },
      {
        name: "empty batch returns two empty lists",
        code: String.raw`assert pad_batch([]) == ([], []), f"got {pad_batch([])}"`,
      },
      {
        name: "all rows share the max length and mask sums equal real lengths",
        code: String.raw`seqs = [[1, 2, 3, 4], [5], [6, 7]]
padded, mask = pad_batch(seqs)
assert all(len(row) == 4 for row in padded), f"every row must be length 4, got {padded}"
assert [sum(m) for m in mask] == [4, 1, 2], f"mask sums must equal original lengths, got {[sum(m) for m in mask]}"`,
      },
    ],
  };

  W.exercises["w3d5-e3"] = {
    title: "Greedy WordPiece tokenizer",
    difficulty: 3,
    xp: 40,
    minutes: 25,
    packages: [],
    brief: "Implement BERT's greedy longest-match subword algorithm, ## markers and all.",
    description: String.raw`WordPiece encodes a word by greedily matching the **longest** vocabulary piece from the current position; every piece after the first is prefixed with ~##~ to mark it as a continuation. If the word cannot be fully covered, the whole word becomes ~[UNK]~.

**~wordpiece_tokenize(word, vocab)~** — ~vocab~ is a set of known pieces (some with a ~##~ prefix). Starting at position 0, find the longest ~word[start:end]~ that is in ~vocab~ (prefixed with ~##~ when ~start > 0~). Append it, move ~start~ to ~end~, and repeat. If at any position no piece matches, return ~["[UNK]"]~ for the entire word.

The starter ships a ~VOCAB~ you can use, but your function must work for any vocab passed in.

~~~python
wordpiece_tokenize("playing", VOCAB)     # ['play', '##ing']
wordpiece_tokenize("fastest", VOCAB)     # ['fast', '##est']  (greedy: 'fast', not 'f')
wordpiece_tokenize("countdown", VOCAB)   # ['count', '##down']
wordpiece_tokenize("zzz", VOCAB)         # ['[UNK]']
wordpiece_tokenize("playzz", VOCAB)      # ['[UNK]']  (partial cover -> whole word UNK)
~~~

Constraints: pure python, no imports. Greedy means longest first: shrink ~end~ from the word's end down to ~start+1~.

Interview angle: tokenizer questions probe the greedy longest-match loop and the "partial match still yields [UNK] for the whole word" rule — the two details people miss when asked to reimplement WordPiece.`,
    starter: String.raw`VOCAB = {
    "play", "##ing", "##ed", "##er", "##ful", "##s",
    "un", "##do", "count", "##down", "fast", "##est",
}

def wordpiece_tokenize(word, vocab):
    """Greedy longest-match subword tokenization.
    Continuation pieces get a '##' prefix; a word that cannot be fully
    covered returns ['[UNK]']."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Track a start index; while start < len(word), try end = len(word) and shrink it until word[start:end] (with '##' when start>0) is in vocab.`,
      String.raw`If the inner shrink finds nothing, immediately return ['[UNK]'] for the whole word.`,
      String.raw`On a match, append the piece, set start = end, and continue from there.`,
    ],
    solution: String.raw`VOCAB = {
    "play", "##ing", "##ed", "##er", "##ful", "##s",
    "un", "##do", "count", "##down", "fast", "##est",
}

def wordpiece_tokenize(word, vocab):
    tokens = []
    start = 0
    n = len(word)
    while start < n:
        end = n
        piece = None
        while start < end:
            sub = word[start:end]
            if start > 0:
                sub = "##" + sub
            if sub in vocab:
                piece = sub
                break
            end -= 1
        if piece is None:
            return ["[UNK]"]
        tokens.append(piece)
        start = end
    return tokens`,
    tests: [
      {
        name: "splits a word into a stem plus ## continuation",
        code: String.raw`assert wordpiece_tokenize("playing", VOCAB) == ["play", "##ing"], f"got {wordpiece_tokenize('playing', VOCAB)}"
assert wordpiece_tokenize("countdown", VOCAB) == ["count", "##down"], f"got {wordpiece_tokenize('countdown', VOCAB)}"
assert wordpiece_tokenize("undo", VOCAB) == ["un", "##do"], f"got {wordpiece_tokenize('undo', VOCAB)}"`,
      },
      {
        name: "matching is greedy longest-first",
        code: String.raw`# 'fast' must win over stopping early; 'f' is not in vocab anyway
assert wordpiece_tokenize("fastest", VOCAB) == ["fast", "##est"], f"got {wordpiece_tokenize('fastest', VOCAB)}"
assert wordpiece_tokenize("player", VOCAB) == ["play", "##er"], f"got {wordpiece_tokenize('player', VOCAB)}"`,
      },
      {
        name: "an unknown word maps to [UNK]",
        code: String.raw`assert wordpiece_tokenize("zzz", VOCAB) == ["[UNK]"], f"got {wordpiece_tokenize('zzz', VOCAB)}"`,
      },
      {
        name: "a partially coverable word is [UNK] as a whole",
        code: String.raw`# 'play' matches but '##zz' does not, so the entire word is UNK
assert wordpiece_tokenize("playzz", VOCAB) == ["[UNK]"], f"got {wordpiece_tokenize('playzz', VOCAB)}"`,
      },
      {
        name: "works with a custom vocab, not just VOCAB",
        code: String.raw`v = {"to", "##ken", "##izer"}
assert wordpiece_tokenize("tokenizer", v) == ["to", "##ken", "##izer"], f"got {wordpiece_tokenize('tokenizer', v)}"
assert wordpiece_tokenize("token", v) == ["to", "##ken"], f"got {wordpiece_tokenize('token', v)}"`,
      },
    ],
  };

  // ================= Day 6 (homework + boss) =================
  W.days.push({
    id: "w3d6",
    title: "Serving a Model: FastAPI Crash Landing",
    minutes: 130,
    blocks: [
      { type: "lesson",   id: "w3d6-lesson", minutes: 15 },
      { type: "quiz",     id: "w3d6-quiz",   minutes: 10 },
      { type: "homework", id: "w3-hw",       minutes: 70 },
      { type: "boss",     id: "w3-boss",     minutes: 35 },
    ],
  });

  W.lessons["w3d6-lesson"] = {
    title: "Serving a Model: FastAPI Crash Landing",
    md: String.raw`A model that only runs in your notebook is a science project. The last mile of every ML role is putting that model behind an HTTP endpoint someone else can call, and the default answer in Python interviews is FastAPI. You do not need to be a backend engineer — you need to explain the anatomy of a prediction service and the two or three things that make it fast and correct.

### Why FastAPI for ML

FastAPI won the ML-serving niche for three concrete reasons:

- **Pydantic validation for free**: you declare the request shape as a typed class and FastAPI rejects malformed input with a clean ~422~ before your model ever sees it.
- **Async and fast**: it runs on ASGI (uvicorn), so slow I/O (loading, logging, calling a database) does not block other requests.
- **Auto docs**: it generates an interactive OpenAPI/Swagger page at ~/docs~ from your type hints — no extra work, and reviewers love it.

### The anatomy of a classify endpoint

Almost every ML service has the same skeleton: a request schema, a model loaded once at startup, and a POST endpoint that runs inference.

~~~python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
model = None                         # filled at startup, lives for the whole process

class Review(BaseModel):             # the request schema -> validation for free
    text: str

@app.on_event("startup")
def load():
    global model
    model = load_sentiment_model("model.pkl")   # load ONCE, never per request

@app.post("/predict")
def predict(review: Review):
    label, score = model.classify(review.text)
    return {"label": label, "score": score}      # dict -> JSON automatically
~~~

Three details interviewers listen for:

1. **Load the model once.** Loading weights inside the handler would re-read the file on every request — the single most common serving bug. Use a startup hook (or module-level load) so the model is warm and shared.
2. **POST with a body, not GET with query params.** Predictions take structured input; ~Review~ is parsed and validated from the JSON body.
3. **Return a plain dict.** FastAPI serializes it to JSON and sets the content type for you.

### Batching, briefly

One request at a time wastes a GPU. High-throughput services accept a *list* of texts (or collect concurrent requests into micro-batches) and run one padded forward pass — exactly the ~pad_batch~ plus ~attention_mask~ machinery from day 5. The tradeoff is latency: bigger batches mean higher throughput but each caller waits a little longer. Interviewers like the phrase "throughput vs latency" here.

### IDE track (optional homework)

These steps run on YOUR machine, outside ML Quest — the in-app homework below is pure python and needs no server:

1. ~pip install fastapi uvicorn~
2. Save the code above as ~main.py~ (swap the loader for any classifier — even a dict lookup works to start).
3. Run ~uvicorn main:app --reload~ in that folder.
4. Open ~http://127.0.0.1:8000/docs~ and POST a review through the auto-generated Swagger UI.

Do it once and serving stops being mysterious: it is a function call wrapped in HTTP.

### ⚠️ Common pitfalls

- Loading the model inside the request handler, so every call pays the full load cost.
- Using GET with query strings for predictions instead of a POST body — awkward and size-limited.
- Skipping the pydantic schema and hand-parsing JSON, throwing away free validation and docs.
- Returning numpy types (~np.float32~) that are not JSON-serializable; cast to python ~float~ first.
- Blocking the event loop with heavy synchronous work and wondering why throughput collapses.

### 🎤 In interviews, they ask

- Sketch a FastAPI endpoint that serves a classifier. Where do you load the model and why?
- What does pydantic's BaseModel give you for free?
- POST vs GET for a prediction endpoint — which and why?
- How would you raise throughput on a GPU-backed service? (batching, throughput vs latency)
- What breaks if you return a numpy float from the handler?

### TL;DR

- FastAPI serves ML because of pydantic validation, async speed, and auto ~/docs~.
- Standard shape: request BaseModel, model loaded once at startup, ~POST /predict~ returning a dict.
- Load the model ONCE — loading per request is the classic serving bug.
- Use POST with a JSON body; FastAPI validates it and serializes your dict response.
- Batch requests for GPU throughput, trading a little latency.
- Cast numpy scalars to python floats before returning them as JSON.

### Go deeper

- [FastAPI official docs](https://fastapi.tiangolo.com/)
- [Chip Huyen — designing ML systems and deployment](https://huyenchip.com/)
- [Hugging Face NLP course — using a model in production](https://huggingface.co/learn/nlp-course)
`,
  };

  W.quizzes["w3d6-quiz"] = [
    {
      q: String.raw`Why is FastAPI a common default for serving ML models in Python?`,
      options: [
        "It trains models faster than PyTorch",
        "It is the only framework that can load a pickle file",
        "It gives pydantic request validation, async speed, and auto-generated OpenAPI docs out of the box",
        "It automatically converts models to ONNX",
      ],
      answer: 2,
      explain: String.raw`FastAPI's appeal for serving is typed request validation via pydantic, non-blocking async handling on ASGI, and an interactive /docs page generated from your type hints. It does not train models, convert formats, or do anything special with pickle — those distractors confuse serving with modeling.`,
    },
    {
      q: String.raw`What does this pydantic snippet do when the field is missing?

~~~python
from pydantic import BaseModel
class Review(BaseModel):
    text: str
Review(**{})     # no 'text' provided
~~~`,
      options: [
        "Returns Review(text=None) silently",
        "Raises a ValidationError because required field 'text' is missing",
        "Returns Review(text='') with an empty string",
        "Prints a warning but constructs the object",
      ],
      answer: 1,
      explain: String.raw`A field typed without a default is required, so constructing Review with no text raises a pydantic ValidationError. In a FastAPI endpoint this becomes an automatic 422 response. That strict, declarative validation — no silent None or empty default — is exactly why pydantic is used at the API boundary.`,
    },
    {
      q: String.raw`Where should a served model be loaded, and why?`,
      options: [
        "Once at application startup, so it is warm and shared across all requests",
        "Inside every request handler, to always get the freshest weights",
        "In the pydantic BaseModel definition",
        "In the client, which sends the weights with each request",
      ],
      answer: 0,
      explain: String.raw`Model weights should load a single time at startup (a startup hook or module-level load) and be reused by every request. Loading inside the handler re-reads the file on each call — the most common and most expensive serving bug. The client and the request schema have no business holding model weights.`,
    },
    {
      q: String.raw`What does this endpoint return to the client?

~~~python
@app.post("/predict")
def predict(review: Review):
    return {"label": "pos", "score": 0.9}
~~~`,
      options: [
        "A Python dict object the client must unpickle",
        "Nothing; you must call json.dumps yourself",
        "An HTML page",
        "The JSON body {\"label\": \"pos\", \"score\": 0.9} with an application/json content type",
      ],
      answer: 3,
      explain: String.raw`FastAPI serializes a returned dict to JSON and sets the application/json content type automatically, so the client receives {"label":"pos","score":0.9}. You do not call json.dumps, and nothing is pickled or rendered as HTML. This automatic serialization is part of why the handler code stays so short.`,
    },
    {
      q: String.raw`What is the main job of a pydantic BaseModel in a FastAPI service?`,
      options: [
        "To store the trained model weights",
        "To define the database schema",
        "To declare and validate the shape of the request (and response) data",
        "To manage GPU memory during inference",
      ],
      answer: 2,
      explain: String.raw`A BaseModel declares the expected fields and types of incoming (and outgoing) data, and pydantic enforces them, rejecting malformed payloads before your logic runs. It has nothing to do with weights, databases, or GPU memory — it is the typed contract at the API boundary.`,
    },
    {
      q: String.raw`To increase throughput on a GPU-backed prediction service, the standard technique is to:`,
      options: [
        "Batch multiple inputs into one padded forward pass, accepting slightly higher per-request latency",
        "Load the model separately for each request",
        "Switch from POST to GET requests",
        "Remove the attention mask to save memory",
      ],
      answer: 0,
      explain: String.raw`GPUs are underused on single inputs, so services group concurrent requests into a micro-batch and run one padded forward pass (using the attention mask to ignore padding). This trades a little latency for much higher throughput. Per-request loading, the HTTP verb, and dropping the mask do not help — the last one is outright a bug.`,
    },
    {
      q: String.raw`Why does FastAPI expose an interactive /docs page automatically?`,
      options: [
        "Because it scans your repository for markdown files",
        "It derives an OpenAPI schema from your type hints and pydantic models and renders a Swagger UI",
        "It requires you to hand-write the OpenAPI JSON first",
        "The docs only appear if you install a separate documentation package",
      ],
      answer: 1,
      explain: String.raw`FastAPI reads your route signatures and pydantic models to build an OpenAPI schema, then serves a Swagger UI at /docs with no extra code. It does not parse markdown, need a hand-written spec, or require an add-on. This is a direct payoff of declaring types instead of parsing raw requests.`,
    },
    {
      q: String.raw`A prediction endpoint takes a structured text payload. Which HTTP design is appropriate?`,
      options: [
        "GET with the text in a query string, because GET is faster",
        "GET with the model weights in the URL",
        "PUT, because you are updating the model",
        "POST with the text in a validated JSON body",
      ],
      answer: 3,
      explain: String.raw`Predictions send structured input and do not modify server state, so the idiomatic choice is POST with a JSON body validated by a pydantic model. GET query strings are size-limited and awkward for structured data, and PUT implies updating a resource, which inference does not do.`,
    },
  ];

  W.exercises["w3-hw"] = {
    title: "Sentiment Classifier From Scratch",
    kind: "homework",
    difficulty: 3,
    xp: 100,
    minutes: 70,
    packages: [],
    brief: "Build a working Naive Bayes sentiment model end to end — tokenizer, vocab, training, prediction — in pure python.",
    description: String.raw`Time to assemble the whole week-1-to-now pipeline into a model that actually classifies text. The starter ships ~REVIEWS~ (40 short labeled reviews, 20 ~"pos"~ / 20 ~"neg"~) and ~LABELS~. You will implement a **multinomial Naive Bayes** classifier with binary bag-of-words features and Laplace smoothing, entirely from scratch.

Implement these six functions:

**1. ~tokenize(text)~** — lowercase, return all ~[a-z0-9]+~ runs as a list (same as day 1).

**2. ~build_vocab(docs)~** — return the sorted list of unique tokens across all ~docs~.

**3. ~vectorize(text, vocab)~** — return a **binary** bag-of-words dict: ~{token: 1}~ for each *distinct* token of ~text~ that is in ~vocab~ (ignore tokens not in the vocabulary; repeats still map to 1).

**4. ~train_nb(docs, labels)~** — return a model dict with keys:
- ~"vocab"~: the vocabulary list,
- ~"classes"~: sorted list of the distinct labels,
- ~"log_prior"~: ~{class: ln(N_c / N)}~,
- ~"log_like"~: ~{class: {token: ln((df_c(token) + 1) / (total_c + V))}}~ for every token in the vocab.

Here ~N~ = number of docs, ~N_c~ = docs in class ~c~, ~df_c(token)~ = how many class-~c~ docs contain the token (binary), ~total_c = sum of df_c over the vocab~, and ~V = len(vocab)~. The ~+1~ / ~+V~ is Laplace smoothing so an unseen (class, token) pair never gives ~ln(0)~.

~~~text
P(c)      = N_c / N
P(t | c)  = (df_c(t) + 1) / (total_c + V)          # Laplace-smoothed
score(c)  = ln P(c) + sum over tokens t present in the doc of ln P(t | c)
predict   = argmax_c score(c)
~~~

**5. ~predict(model, text)~** — return the class with the highest score. Sum ~log_like~ only over the doc's present tokens (those in the vocab).

**6. ~accuracy(model, docs, labels)~** — fraction of ~docs~ predicted correctly.

Target: ~accuracy(model, REVIEWS, LABELS) >= 0.9~ on the training corpus (a correct implementation reaches ~1.0~).

Constraints: pure python + ~re~, ~math~, ~collections~. No numpy, no sklearn.

Interview angle: Naive Bayes is the classic "implement a classifier without a library" take-home. It proves you understand priors, likelihoods, log-space to avoid underflow, and why smoothing is non-negotiable.`,
    starter: String.raw`import re
import math
from collections import Counter

REVIEWS = [
    "I absolutely loved this movie it was fantastic",
    "A brilliant and wonderful experience from start to finish",
    "The food was delicious and the service was excellent",
    "Great product it works perfectly and I am very happy",
    "This is the best purchase I have ever made",
    "Amazing quality and superb value for the money",
    "The staff were friendly and incredibly helpful",
    "I highly recommend this it exceeded my expectations",
    "Beautiful design and it feels premium and solid",
    "Fast delivery and the item arrived in perfect condition",
    "An outstanding performance truly inspiring and moving",
    "The hotel room was clean cozy and comfortable",
    "Fantastic customer support they solved my problem quickly",
    "This app is intuitive fast and genuinely useful",
    "A delightful read charming and beautifully written",
    "The battery life is excellent and charging is quick",
    "Superb flavor and generous portions we loved it",
    "Very reliable and easy to set up it works great",
    "The concert was incredible the band sounded amazing",
    "Comfortable stylish and worth every penny",
    "I hated this movie it was boring and terrible",
    "A dreadful experience where everything went wrong",
    "The food was cold bland and disgusting",
    "Awful product it broke after only one day",
    "This is the worst purchase I have ever made",
    "Poor quality and a complete waste of money",
    "The staff were rude and unhelpful",
    "I do not recommend this it was a huge disappointment",
    "Cheap design and it feels flimsy and fragile",
    "Slow delivery and the item arrived damaged",
    "A terrible performance dull and forgettable",
    "The hotel room was dirty cramped and uncomfortable",
    "Horrible customer support they ignored my problem",
    "This app is clunky slow and frustrating to use",
    "A tedious read confusing and poorly written",
    "The battery life is awful and it dies quickly",
    "Bland flavor and tiny portions we were unhappy",
    "Very unreliable and hard to set up a real nightmare",
    "The concert was disappointing the sound was awful",
    "Uncomfortable ugly and not worth the price",
]
LABELS = ["pos"] * 20 + ["neg"] * 20


def tokenize(text):
    """Lowercase; return all [a-z0-9]+ runs as a list."""
    # your code here
    raise NotImplementedError


def build_vocab(docs):
    """Sorted list of unique tokens across all docs."""
    # your code here
    raise NotImplementedError


def vectorize(text, vocab):
    """Binary bag-of-words dict {token: 1} for distinct tokens of text that are in vocab."""
    # your code here
    raise NotImplementedError


def train_nb(docs, labels):
    """Return {'vocab', 'classes', 'log_prior', 'log_like'} for multinomial NB
    with binary features and Laplace (+1) smoothing. See the description."""
    # your code here
    raise NotImplementedError


def predict(model, text):
    """Return the class with the highest log_prior + sum of log_like over present tokens."""
    # your code here
    raise NotImplementedError


def accuracy(model, docs, labels):
    """Fraction of docs predicted correctly."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`tokenize is re.findall(r"[a-z0-9]+", text.lower()); build_vocab is sorted(set) over every doc's tokens; vectorize is {t: 1 for t in set(tokenize(text)) if t in vocab}.`,
      String.raw`In train_nb, loop docs once: bump the class count and, for each token in vectorize(doc, vocab), bump df[class][token]. Then total_c = sum(df[c].values()) and log_like[c][t] = math.log((df[c][t] + 1) / (total_c + V)) for every t in vocab.`,
      String.raw`predict: for each class start at log_prior[c], add log_like[c][t] for every present token, keep the argmax. Work in log space so you add instead of multiplying tiny probabilities.`,
    ],
    solution: String.raw`import re
import math
from collections import Counter

REVIEWS = [
    "I absolutely loved this movie it was fantastic",
    "A brilliant and wonderful experience from start to finish",
    "The food was delicious and the service was excellent",
    "Great product it works perfectly and I am very happy",
    "This is the best purchase I have ever made",
    "Amazing quality and superb value for the money",
    "The staff were friendly and incredibly helpful",
    "I highly recommend this it exceeded my expectations",
    "Beautiful design and it feels premium and solid",
    "Fast delivery and the item arrived in perfect condition",
    "An outstanding performance truly inspiring and moving",
    "The hotel room was clean cozy and comfortable",
    "Fantastic customer support they solved my problem quickly",
    "This app is intuitive fast and genuinely useful",
    "A delightful read charming and beautifully written",
    "The battery life is excellent and charging is quick",
    "Superb flavor and generous portions we loved it",
    "Very reliable and easy to set up it works great",
    "The concert was incredible the band sounded amazing",
    "Comfortable stylish and worth every penny",
    "I hated this movie it was boring and terrible",
    "A dreadful experience where everything went wrong",
    "The food was cold bland and disgusting",
    "Awful product it broke after only one day",
    "This is the worst purchase I have ever made",
    "Poor quality and a complete waste of money",
    "The staff were rude and unhelpful",
    "I do not recommend this it was a huge disappointment",
    "Cheap design and it feels flimsy and fragile",
    "Slow delivery and the item arrived damaged",
    "A terrible performance dull and forgettable",
    "The hotel room was dirty cramped and uncomfortable",
    "Horrible customer support they ignored my problem",
    "This app is clunky slow and frustrating to use",
    "A tedious read confusing and poorly written",
    "The battery life is awful and it dies quickly",
    "Bland flavor and tiny portions we were unhappy",
    "Very unreliable and hard to set up a real nightmare",
    "The concert was disappointing the sound was awful",
    "Uncomfortable ugly and not worth the price",
]
LABELS = ["pos"] * 20 + ["neg"] * 20


def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())


def build_vocab(docs):
    vocab = set()
    for doc in docs:
        vocab.update(tokenize(doc))
    return sorted(vocab)


def vectorize(text, vocab):
    vset = set(vocab)
    return {tok: 1 for tok in set(tokenize(text)) if tok in vset}


def train_nb(docs, labels):
    vocab = build_vocab(docs)
    V = len(vocab)
    classes = sorted(set(labels))
    class_count = {c: 0 for c in classes}
    df = {c: Counter() for c in classes}
    for doc, label in zip(docs, labels):
        class_count[label] += 1
        for tok in vectorize(doc, vocab):
            df[label][tok] += 1
    N = len(docs)
    log_prior = {c: math.log(class_count[c] / N) for c in classes}
    log_like = {}
    for c in classes:
        total_c = sum(df[c].values())
        denom = total_c + V
        log_like[c] = {tok: math.log((df[c][tok] + 1) / denom) for tok in vocab}
    return {"vocab": vocab, "classes": classes, "log_prior": log_prior, "log_like": log_like}


def predict(model, text):
    feats = vectorize(text, model["vocab"])
    best_c, best_score = None, None
    for c in model["classes"]:
        score = model["log_prior"][c]
        ll = model["log_like"][c]
        for tok in feats:
            score += ll[tok]
        if best_score is None or score > best_score:
            best_score, best_c = score, c
    return best_c


def accuracy(model, docs, labels):
    correct = sum(1 for d, y in zip(docs, labels) if predict(model, d) == y)
    return correct / len(docs)`,
    tests: [
      {
        name: "tokenize lowercases and splits into word/number runs",
        code: String.raw`assert tokenize("Great, GREAT product2!") == ["great", "great", "product2"], f"got {tokenize('Great, GREAT product2!')}"`,
      },
      {
        name: "build_vocab is sorted and deduplicated",
        code: String.raw`v = build_vocab(["good bad good", "bad ugly"])
assert v == ["bad", "good", "ugly"], f"expected sorted unique, got {v}"`,
      },
      {
        name: "vectorize is binary and dedupes repeats",
        code: String.raw`vocab = build_vocab(["good good great"])
vec = vectorize("good good good great", vocab)
assert vec == {"good": 1, "great": 1}, f"binary BoW expected, got {vec}"`,
      },
      {
        name: "vectorize ignores out-of-vocabulary tokens",
        code: String.raw`vocab = ["good", "bad"]
vec = vectorize("good unknownword bad zzz", vocab)
assert vec == {"good": 1, "bad": 1}, f"OOV tokens must be dropped, got {vec}"`,
      },
      {
        name: "train_nb returns the documented model shape",
        code: String.raw`m = train_nb(REVIEWS, LABELS)
assert set(m.keys()) >= {"vocab", "classes", "log_prior", "log_like"}, f"missing keys: {set(m.keys())}"
assert m["classes"] == ["neg", "pos"], f"classes must be sorted, got {m['classes']}"
assert "loved" in m["vocab"], "corpus vocabulary should contain 'loved'"`,
      },
      {
        name: "priors are a valid distribution and balanced 50/50",
        code: String.raw`import math
m = train_nb(REVIEWS, LABELS)
probs = [math.exp(v) for v in m["log_prior"].values()]
assert math.isclose(sum(probs), 1.0, abs_tol=1e-9), f"priors must sum to 1, got {sum(probs)}"
assert math.isclose(math.exp(m["log_prior"]["pos"]), 0.5, abs_tol=1e-9), "20/20 split -> prior 0.5"`,
      },
      {
        name: "clearly positive and negative sentences classify correctly",
        code: String.raw`m = train_nb(REVIEWS, LABELS)
assert predict(m, "an absolutely fantastic and wonderful experience") == "pos", "should be positive"
assert predict(m, "a terrible awful and disgusting disappointment") == "neg", "should be negative"`,
      },
      {
        name: "a token unique to one class drives the prediction",
        code: String.raw`m = train_nb(REVIEWS, LABELS)
assert predict(m, "loved") == "pos", "'loved' appears only in positive reviews"
assert predict(m, "terrible") == "neg", "'terrible' appears only in negative reviews"`,
      },
      {
        name: "Laplace smoothing keeps unseen words from crashing predict",
        code: String.raw`m = train_nb(REVIEWS, LABELS)
out = predict(m, "zzzz qqqq neverseen")
assert out in ("neg", "pos"), f"OOV-only input must still return a class, got {out}"
out2 = predict(m, "wonderful zzzz")
assert out2 == "pos", f"a known positive word should still win, got {out2}"`,
      },
      {
        name: "training accuracy reaches at least 0.9",
        code: String.raw`m = train_nb(REVIEWS, LABELS)
acc = accuracy(m, REVIEWS, LABELS)
assert acc >= 0.9, f"training accuracy must be >= 0.9, got {acc}"`,
      },
      {
        name: "accuracy is a fraction between 0 and 1 and perfect on a trivial fit",
        code: String.raw`tiny_docs = ["good great", "bad awful"]
tiny_labels = ["pos", "neg"]
mt = train_nb(tiny_docs, tiny_labels)
acc = accuracy(mt, tiny_docs, tiny_labels)
assert 0.0 <= acc <= 1.0, f"accuracy out of range: {acc}"
assert acc == 1.0, f"a separable 2-doc corpus should fit perfectly, got {acc}"`,
      },
    ],
  };

  W.exercises["w3-boss-t1"] = {
    title: "Single-query attention (pure python)",
    kind: "boss",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: [],
    brief: "One query, a set of keys and values, no numpy — prove you own the attention math.",
    description: String.raw`The boss task strips attention down to one query and asks for it in pure python — no numpy to hide behind.

**~single_query_attention(q, K, V)~** — ~q~ is a vector (list of floats). ~K~ is a list of key vectors (same length as ~q~), ~V~ is a list of value vectors (all the same length). Return the attention output as a list of floats:

1. **Scores**: dot product of ~q~ with each key.
2. **Stable softmax**: subtract the max score before exponentiating, then normalize so the weights sum to 1.
3. **Weighted sum**: combine the value vectors using those weights.

~~~python
q = [0.0, 0.0]
K = [[1.0, 2.0], [3.0, 4.0]]
V = [[1.0, 2.0], [3.0, 4.0]]
single_query_attention(q, K, V)   # scores [0,0] -> weights [0.5,0.5] -> [2.0, 3.0]
~~~

Constraints: pure python + ~math~. The softmax must be numerically stable — a score of ~1000~ must not overflow. Return a plain list.

Interview angle: this is the from-scratch attention whiteboard task. The graders check the max-subtraction (stability), that weights sum to 1, and that the weighted sum has the value dimension, not the key dimension.`,
    starter: String.raw`import math

def single_query_attention(q, K, V):
    """One-query scaled-free dot-product attention, pure python.
    scores = q . each key; stable softmax; return the weighted sum of V."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`scores = [sum(qi * ki for qi, ki in zip(q, k)) for k in K].`,
      String.raw`Stable softmax: m = max(scores); exps = [math.exp(s - m) for s in scores]; divide each by sum(exps).`,
      String.raw`Weighted sum: for each value dimension j, out[j] = sum(weight_i * V[i][j]); the output length is len(V[0]).`,
    ],
    solution: String.raw`import math

def single_query_attention(q, K, V):
    scores = [sum(qi * ki for qi, ki in zip(q, k)) for k in K]
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    z = sum(exps)
    weights = [e / z for e in exps]
    dim = len(V[0])
    out = [0.0] * dim
    for w, v in zip(weights, V):
        for j in range(dim):
            out[j] += w * v[j]
    return out`,
    tests: [
      {
        name: "equal scores give a uniform average of the values",
        code: String.raw`import math
q = [0.0, 0.0]
K = [[1.0, 2.0], [3.0, 4.0]]
V = [[1.0, 2.0], [3.0, 4.0]]
out = single_query_attention(q, K, V)
assert all(math.isclose(a, b, abs_tol=1e-9) for a, b in zip(out, [2.0, 3.0])), f"expected [2.0, 3.0], got {out}"`,
      },
      {
        name: "a single key yields the value unchanged",
        code: String.raw`out = single_query_attention([1.0, 2.0], [[3.0, 4.0]], [[9.0, 8.0]])
assert out == [9.0, 8.0], f"one key -> weight 1 -> that value, got {out}"`,
      },
      {
        name: "large scores do not overflow (stable softmax)",
        code: String.raw`import math
q = [1000.0, 0.0]
K = [[1.0, 0.0], [0.0, 1.0]]
V = [[5.0, 5.0], [9.0, 9.0]]
out = single_query_attention(q, K, V)
assert not any(math.isnan(x) or math.isinf(x) for x in out), f"overflow -> nan/inf: {out}"
assert all(math.isclose(a, b, abs_tol=1e-3) for a, b in zip(out, [5.0, 5.0])), f"should lock onto key 0, got {out}"`,
      },
      {
        name: "identical values make the output that value regardless of q",
        code: String.raw`import math
out = single_query_attention([0.5, -0.5], [[1.0, 1.0], [2.0, 2.0], [3.0, 3.0]], [[7.0, 7.0], [7.0, 7.0], [7.0, 7.0]])
assert all(math.isclose(x, 7.0, abs_tol=1e-9) for x in out), f"weights sum to 1 -> [7,7], got {out}"`,
      },
      {
        name: "matches the hand-computed two-key softmax",
        code: String.raw`import math
q = [1.0, 0.0]
K = [[1.0, 0.0], [0.0, 0.0]]
V = [[1.0, 0.0], [0.0, 1.0]]
out = single_query_attention(q, K, V)
w0 = math.exp(1.0) / (math.exp(1.0) + 1.0)
assert math.isclose(out[0], w0, abs_tol=1e-9), f"expected {w0}, got {out[0]}"
assert math.isclose(out[1], 1.0 - w0, abs_tol=1e-9), f"expected {1.0 - w0}, got {out[1]}"`,
      },
      {
        name: "a dominant query locks onto the matching key",
        code: String.raw`q = [10.0, 0.0]
K = [[10.0, 0.0], [0.0, 10.0]]
V = [[1.0, 0.0], [0.0, 1.0]]
out = single_query_attention(q, K, V)
assert len(out) == 2, f"output must have the value dimension, got {out}"
assert out[0] > 0.99 and out[1] < 0.01, f"should attend to key 0, got {out}"`,
      },
    ],
  };

  W.boss = {
    id: "w3-boss",
    title: "T3 — Core NLP & Transformers",
    timeLimitMin: 30,
    passPct: 70,
    intro: String.raw`The transformer boss fight. Thirteen questions from raw text all the way to attention, then one from-scratch attention implementation. Clear 70% and Week 3 is yours.`,
    quiz: [
      {
        q: String.raw`In TF-IDF, what is the role of the idf factor idf(t) = ln((1+N)/(1+df(t))) + 1?`,
        options: [
          "It boosts terms that appear in many documents",
          "It down-weights terms that appear in many documents, so corpus-wide words stop dominating",
          "It normalizes each document to unit length",
          "It counts how often a term appears in one document",
        ],
        answer: 1,
        explain: String.raw`idf shrinks as df grows, so a word appearing in every document is pushed toward the floor weight while rare, discriminative words are amplified. Term frequency (count in one document) is the separate tf factor, and length normalization is a distinct step. idf is what makes TF-IDF a soft, automatic stopword filter.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import re
print(re.findall(r"[a-z0-9]+", "Model-2.0: fast, AWESOME!"))
~~~`,
        options: [
          "['model', '2', '0', 'fast', 'awesome']",
          "['Model', '2.0', 'fast', 'AWESOME']",
          "['odel', '2', '0', 'fast']",
          "['model-2.0', 'fast', 'awesome']",
        ],
        answer: 2,
        explain: String.raw`There is no .lower() call, so [a-z0-9]+ matches only lowercase-letter and digit runs. 'Model' loses its capital M, leaving 'odel'; '2.0' splits on the dot into '2' and '0'; 'AWESOME' is all uppercase and matches nothing. Forgetting to lowercase before a lowercase-only pattern is a classic tokenizer bug.`,
      },
      {
        q: String.raw`Why is cosine similarity preferred over euclidean distance for comparing embeddings?`,
        options: [
          "Cosine is always faster to compute",
          "Euclidean distance does not work above three dimensions",
          "Embedding norms absorb frequency effects, so comparing direction (cosine) isolates the semantic signal",
          "Cosine similarity is always non-negative, which simplifies ranking",
        ],
        answer: 2,
        explain: String.raw`Vector magnitude correlates with word frequency and training artifacts, while meaning lives in direction. Cosine divides out both norms, so a frequent word and its rare synonym can still score near 1. Cosine can be negative, euclidean works in any dimension, and speed is not the reason — those are distractors.`,
      },
      {
        q: String.raw`What can static embeddings like word2vec fundamentally NOT represent?`,
        options: [
          "Words that are very frequent",
          "Polysemy — one word form with several senses collapses to a single averaged vector",
          "Words with many synonyms",
          "Languages with large vocabularies",
        ],
        answer: 1,
        explain: String.raw`A static embedding assigns exactly one vector per word type, so 'bank' (river) and 'bank' (money) merge into a frequency-weighted average of both senses. Only context-dependent models like BERT can split them apart. This limitation is the standard motivation for attention-based contextual representations.`,
      },
      {
        q: String.raw`Scaled dot-product attention divides scores by sqrt(d_k) because:`,
        options: [
          "It makes the weights sum to 1",
          "The dot product of two d_k-dim unit-variance vectors has variance d_k, so unscaled scores saturate softmax and kill gradients",
          "It speeds up the matrix multiplication",
          "It converts logits into probabilities directly",
        ],
        answer: 1,
        explain: String.raw`Variance adds over the d_k independent product terms, giving std sqrt(d_k); large d_k means large-magnitude scores that push softmax into a near one-hot regime where gradients vanish. Dividing by sqrt(d_k) rescales variance back to 1. Softmax, not the divisor, is what makes weights sum to 1.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import numpy as np
x = np.array([1000.0, 1000.0])
naive = np.exp(x) / np.exp(x).sum()
print(bool(np.isnan(naive).any()))
~~~`,
        options: [
          "True, because exp(1000) overflows to inf and inf/inf is nan",
          "False, it prints [0.5 0.5]",
          "True, but only because the array is 1-D",
          "It raises OverflowError",
        ],
        answer: 0,
        explain: String.raw`exp(1000) exceeds float64 range and becomes inf, so inf/inf evaluates to nan and isnan().any() is True. numpy warns rather than raising, so there is no OverflowError. Subtracting the row max before exponentiating (the stable softmax) is exactly what prevents this.`,
      },
      {
        q: String.raw`In self-attention, where do Q, K and V come from?`,
        options: [
          "Three different input sentences",
          "Q from an encoder and K, V from a decoder",
          "Q and K are learned but V is the raw token ids",
          "Three learned linear projections of the same input sequence",
        ],
        answer: 3,
        explain: String.raw`Self-attention projects one input X through separate learned matrices — X@Wq, X@Wk, X@Wv — producing Q, K and V as three views of the same tokens. That is what lets a token query information about its own neighbors. When K and V come from a different sequence, it is cross-attention, not self-attention.`,
      },
      {
        q: String.raw`Which statement about BERT and GPT is correct?`,
        options: [
          "BERT is a bidirectional encoder trained with masked language modeling; GPT is a causal decoder trained to predict the next token",
          "BERT is a decoder and GPT is an encoder",
          "Both are encoder-decoder models",
          "GPT is bidirectional while BERT uses causal masking",
        ],
        answer: 0,
        explain: String.raw`BERT stacks encoder blocks with full bidirectional attention and learns by filling masked tokens; GPT stacks decoder blocks with a causal mask and learns next-token prediction. Swapping those roles is the most common wrong answer. Encoder-decoder describes T5-style models, not these two.`,
      },
      {
        q: String.raw`If d_model = 512 and there are h = 8 attention heads, what is head_dim?`,
        options: [
          "512, each head sees the full dimension",
          "8, one per head",
          "64, because head_dim = d_model / h",
          "4096, because head_dim = d_model * h",
        ],
        answer: 2,
        explain: String.raw`Multi-head attention splits the model dimension across heads, so head_dim = d_model / h = 512 / 8 = 64. This is why adding heads does not increase compute — the same budget is sliced thinner. Multiplying (4096) or leaving it full (512) misunderstands the split.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import numpy as np
X = np.zeros((3, 8))       # (seq_len, d_model)
h = 2
hd = X.shape[1] // h
out = X.reshape(3, h, hd).transpose(1, 0, 2)
print(out.shape)
~~~`,
        options: [
          "(3, 2, 4)",
          "(2, 4, 3)",
          "(3, 8, 2)",
          "(2, 3, 4)",
        ],
        answer: 3,
        explain: String.raw`d_model=8 splits into h=2 heads of head_dim=4, so reshape gives (3, 2, 4) = (seq_len, heads, head_dim), and transpose(1,0,2) swaps the first two axes to (2, 3, 4) = (heads, seq_len, head_dim). Putting heads first is the standard layout so each head can be attended independently.`,
      },
      {
        q: String.raw`One step of Byte-Pair Encoding does what?`,
        options: [
          "Merges the most frequent adjacent symbol pair into a single new symbol",
          "Removes the least frequent character from the vocabulary",
          "Splits every word into individual characters permanently",
          "Replaces rare words with the [UNK] token",
        ],
        answer: 0,
        explain: String.raw`BPE starts from characters and repeatedly finds the most frequent adjacent pair, merging it everywhere into one symbol; the ordered list of merges is the tokenizer. It never deletes symbols or hard-fails to [UNK] — subwords exist precisely to avoid the out-of-vocabulary problem.`,
      },
      {
        q: String.raw`What is the attention_mask that accompanies input_ids used for?`,
        options: [
          "Marking which tokens are subword continuations",
          "Storing each token's position index",
          "Choosing which layers to fine-tune",
          "Being 1 for real tokens and 0 for padding, so attention ignores [PAD] positions",
        ],
        answer: 3,
        explain: String.raw`Batching pads short sequences to a common length, and those [PAD] tokens are meaningless. The attention mask (1 real, 0 pad) is applied inside the softmax to zero out padding. Omit it and the model attends to padding, silently hurting accuracy — a favorite spot-the-bug question.`,
      },
      {
        q: String.raw`In a FastAPI model-serving app, where should the model be loaded?`,
        options: [
          "Inside every request handler for the freshest weights",
          "Once at startup, so it is warm and shared across all requests",
          "In the pydantic BaseModel",
          "On the client side, sent with each request",
        ],
        answer: 1,
        explain: String.raw`Load the weights a single time at startup (a startup hook or module-level load) and reuse them for every request. Loading inside the handler re-reads the model file on each call — the most common and most expensive serving mistake. The request schema and the client have no role in holding weights.`,
      },
    ],
    tasks: ["w3-boss-t1"],
  };
})();
