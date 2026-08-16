/* ML Quest — Week 2: Classic ML Arena */
(function () {
  const W = {
    num: 2,
    id: "w2",
    emoji: "📊",
    title: "Classic ML Arena",
    subtitle: "NumPy to gradient descent, from scratch",
    goal: "Explain and implement the core classic-ML toolkit without libraries.",
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
    minutes: 122,
    blocks: [
      { type: "lesson",   id: "w2d1-lesson", minutes: 25 },
      { type: "quiz",     id: "w2d1-quiz",   minutes: 12 },
      { type: "exercise", id: "w2d1-e1",     minutes: 20 },
      { type: "exercise", id: "w2d1-e2",     minutes: 30 },
      { type: "exercise", id: "w2d1-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "classic-ml", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w2d1-lesson"] = {
    title: "NumPy & Pandas Survival Kit",
    md: String.raw`In a classic-ML screen nobody watches you import a library — they watch you slice an array and reason about shapes out loud. Candidates freeze not on the algorithm but on line three, when a broadcast throws a shape error or a slice they thought they copied silently rewrites their data. Today builds the foundation the rest of the week stands on: what a numpy array really is, why vectorization is ~100x faster, and the exact rules of broadcasting, axes, and views.

### An ndarray is a typed buffer plus a shape

A Python list is an array of pointers to boxed objects scattered across the heap. A numpy array is one flat, contiguous block of raw bytes of a single ~dtype~, plus a little metadata: ~shape~, ~strides~, ~dtype~. That difference is the entire performance story.

~~~python
import numpy as np
a = np.array([1, 2, 3])   # dtype inferred as int64
a.dtype                   # int64 — each element is 8 raw bytes
a.shape                   # (3,)
a.strides                 # (8,) — step 8 bytes to reach the next element
~~~

The dtype is fixed and it bites: an int64 array cannot hold 3.9, so assigning a float floors it to an int with no warning.

~~~python
a = np.array([1, 2, 3])
a[0] = 5.9
a[0]                      # 5 — truncated toward zero, silently
~~~

### Vectorization: why the loop is 100x slower

A Python ~for~ loop over an array pays, for every single element, three taxes: a pointer chase, a type check, and box/unbox. A numpy operation hands the whole buffer to a precompiled C loop that runs tight over contiguous memory (cache-friendly, often SIMD). The Python interpreter never enters the inner loop.

~~~python
x = np.arange(1_000_000)
total = 0
for v in x:      # slow: a million interpreter round-trips
    total += v
total = x.sum()  # fast: one C loop over the buffer
~~~

The soundbite to say in the room: *"vectorization removes the Python interpreter from the inner loop."* It is not threads — numpy is mostly single-threaded here — it is C plus contiguous memory.

### Broadcasting: the actual algorithm

When you combine two arrays of different shapes, numpy aligns their shapes **from the right**, then walks each dimension:

- sizes equal → fine;
- one of them is 1 → stretch it (virtually, with stride 0) to match;
- otherwise → shape error.

No data is copied. The size-1 axis is simply reused.

~~~python
X = np.ones((3, 4))                 # (3, 4)
np.arange(3)                        # (3,) -> right-aligns as (.., 3) vs 4 -> ERROR
col = np.arange(3).reshape(3, 1)    # (3, 1) -> stretches to (3, 4) -> ok
X + col                             # adds col down every column
~~~

The canonical use: subtract a per-column mean of shape ~(4,)~ from ~X~ of shape ~(n, 4)~. Right-aligned, ~(4,)~ vs ~(n, 4)~ stretches to ~(n, 4)~. That is feature standardization in one line.

### Axis logic: the axis you name is the one that disappears

~X.sum(axis=0)~ collapses the rows and returns one value per column; ~axis=1~ collapses the columns and returns one per row. The rule that never fails: **the named axis is consumed.**

~~~python
X = np.array([[1, 2, 3],
              [4, 5, 6]])
X.sum(axis=0)   # [5, 7, 9]  — down the columns
X.sum(axis=1)   # [6, 15]    — across the rows
~~~

Add ~keepdims=True~ to keep the collapsed axis as size 1 so the result broadcasts straight back against the original.

### Masks, fancy indexing, and the view/copy trap

A boolean mask of the same shape selects or assigns in place. Integer arrays (fancy indexing) pick arbitrary elements.

~~~python
x = np.array([-2, 5, -1, 3])
x[x < 0] = 0        # clamp negatives in place -> [0, 5, 0, 3]
~~~

Now the trap that corrupts more feature pipelines than any other: a basic **slice returns a view** that shares memory, so writing through it edits the original. Fancy and boolean indexing return a **copy**.

~~~python
a = np.arange(5)
v = a[1:4]      # VIEW — shares a's buffer
v[0] = 99
a               # [0, 99, 2, 3, 4] — the original changed!
c = a[[1, 2]]   # COPY — fancy indexing
c[0] = -1
a               # unchanged
~~~

When in doubt, call ~.copy()~ before you mutate.

### Pandas in one breath

A DataFrame is a dict of Series sharing one index; each column carries its own dtype. Three moves survive a screening:

~~~python
import pandas as pd
df.groupby("city")["revenue"].sum()                      # split-apply-combine
df.groupby("city").agg(total=("revenue", "sum"),
                       n=("revenue", "size"))            # named aggregations
orders.merge(users, on="user_id", how="left")            # SQL-style join
~~~

~groupby~ splits rows into groups, applies an aggregation, and combines the results into a new frame. ~merge~ is a join; ~how~ decides which keys survive — inner, left, right, or outer.

### ⚠️ Common pitfalls

- Slices are **views**: editing a slice mutates the parent. Fancy/boolean indexing **copies**. Confusing the two silently corrupts data.
- Integer-dtype arrays truncate floats on assignment — no warning, no error.
- Broadcasting a ~(n,)~ vector against an ~(n, m)~ matrix fails; you almost always meant ~(n, 1)~. Reshape on purpose.
- ~axis=0~ means "down the columns" (a per-column result), not "keep the rows."
- Chained pandas indexing like ~df[mask]["col"] = x~ writes to a throwaway copy (SettingWithCopyWarning). Use ~df.loc[mask, "col"] = x~.

### 🎤 In interviews, they ask

- "Why is a vectorized numpy op roughly 100x faster than the equivalent Python loop?"
- "State the broadcasting rules exactly. When does ~(n,)~ + ~(n, m)~ fail?"
- "When does numpy return a view versus a copy, and why does it matter?"
- "What does ~axis=0~ mean for ~sum~, and how do you remember it under pressure?"
- "Standardize a feature matrix column-wise without a Python loop — write it."

### TL;DR

- An ndarray is one contiguous typed buffer plus shape/strides/dtype — that is the speed.
- Vectorization = a C loop over contiguous memory, no Python per element (not threads).
- Broadcasting aligns from the right; equal or size-1 dims stretch, otherwise it errors.
- The named axis is the one that collapses; ~keepdims=True~ lets it broadcast back.
- Slices are views (shared memory); fancy/boolean indexing copies. In doubt, ~.copy()~.
- pandas: ~groupby~ is split-apply-combine; ~merge~ is a SQL join controlled by ~how~.

### Go deeper

- [NumPy: the absolute basics for beginners](https://numpy.org/doc/stable/user/absolute_beginners.html)
- [NumPy broadcasting rules](https://numpy.org/doc/stable/user/basics.broadcasting.html)
- [pandas group by: split-apply-combine](https://pandas.pydata.org/docs/user_guide/groupby.html)
- [pandas merge, join, and concatenate](https://pandas.pydata.org/docs/user_guide/merging.html)
`,
  };

  W.quizzes["w2d1-quiz"] = [
    {
      q: String.raw`What does this evaluate to?

~~~python
import numpy as np
X = np.ones((3, 4))
b = np.arange(4)
(X + b).shape
~~~`,
      options: ["It raises a shape/broadcast error", "(4, 3)", "(3, 4)", "(3,)"],
      answer: 2,
      explain: String.raw`Broadcasting aligns shapes from the right: b is (4,), X is (3, 4). The trailing dims match (4 == 4) and the missing leading dim of b is treated as size 1 and stretched to 3. So b is added to every row and the result is (3, 4).`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
a = np.arange(5)
s = a[1:3]
s[0] = 100
print(a[1])
~~~`,
      options: ["1", "100", "0", "It raises an IndexError"],
      answer: 1,
      explain: String.raw`A basic slice returns a view that shares the parent's memory buffer — it does not copy. Writing s[0] = 100 therefore writes into a itself at index 1. Fancy or boolean indexing would have returned a copy and left a unchanged.`,
    },
    {
      q: String.raw`~X~ has shape ~(100, 5)~. What is the shape of ~X.mean(axis=0)~?`,
      options: ["(5,)", "(100,)", "(1, 5)", "a scalar"],
      answer: 0,
      explain: String.raw`The axis you name is the one that collapses. axis=0 reduces over the 100 rows, leaving one mean per column — shape (5,). To keep it as (1, 5) so it broadcasts back against X, you would pass keepdims=True.`,
    },
    {
      q: String.raw`Why is ~x.sum()~ dramatically faster than a Python ~for~ loop that adds each element?`,
      options: [
        "numpy automatically spreads the work across all CPU cores using threads",
        "Python's GIL is the only reason the loop is slow",
        "numpy JIT-compiles your Python loop to machine code the first time it runs",
        "numpy runs a precompiled C loop over a contiguous typed buffer, with no per-element Python overhead",
      ],
      answer: 3,
      explain: String.raw`The Python loop pays a pointer-chase, a type check, and box/unbox per element. numpy hands the whole contiguous buffer to a C loop, so the interpreter never enters the inner loop. It is not threading and there is no JIT — it is C plus cache-friendly memory.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
x = np.array([1, 2, 3, 4])
x[x % 2 == 0] = 9
print(x)
~~~`,
      options: ["[9 9 9 9]", "[1 2 3 4]", "[1 9 3 9]", "It raises an error"],
      answer: 2,
      explain: String.raw`x % 2 == 0 builds the boolean mask [False, True, False, True]. Assigning through that mask overwrites exactly the elements where the mask is True — the even values 2 and 4 — giving [1, 9, 3, 9].`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
a = np.array([1, 2, 3])
a[0] = 5.9
print(a[0])
~~~`,
      options: ["5.9", "5", "6", "It raises a TypeError"],
      answer: 1,
      explain: String.raw`The array's dtype was inferred as int64 from the integer literals. Storing a float into an integer array truncates toward zero (it does not round), so 5.9 becomes 5 — with no warning. Watch for this when writing computed values back into an int array.`,
    },
    {
      q: String.raw`~df.groupby("city")["sales"].sum()~ returns what?`,
      options: [
        "a DataFrame with one row per column",
        "a dict mapping each city to its total sales",
        "the original DataFrame with a new total column appended",
        "a Series indexed by city holding the summed sales",
      ],
      answer: 3,
      explain: String.raw`groupby splits rows by the key, applies the aggregation per group, and combines the results. Selecting a single column and calling .sum() yields a Series whose index is the group keys (city) and whose values are the per-group sums.`,
    },
  ];

  W.exercises["w2d1-e1"] = {
    title: "Column-wise standardize",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: ["numpy"],
    brief: "Zero mean, unit std per column — and survive constant columns.",
    description: String.raw`Implement ~standardize(X)~ for a 2D array ~X~ of shape ~(n, d)~. Return a new array of the same shape where **each column** has mean 0 and standard deviation 1.

Rules:

- Standardize per column (axis 0), not globally.
- A **constant column** has std 0. Dividing by it would give ~nan~/~inf~. Instead, leave such a column as all zeros (subtract the mean, then divide by 1).
- Do not mutate the input. No Python loops over rows.

~~~python
standardize(np.array([[0.0], [2.0]]))
# [[-1.], [1.]]   — mean 1, std 1

standardize(np.array([[1.0, 5.0], [1.0, 7.0], [1.0, 9.0]]))
# column 0 is constant -> all zeros; column 1 standardized
~~~

Interview angle: standardization is the first line of almost every ML pipeline, and the zero-std guard is exactly the edge case a sloppy candidate ships to production as a wall of ~nan~.`,
    starter: String.raw`import numpy as np

def standardize(X):
    """Return X standardized column-wise: mean 0, std 1. Constant columns -> 0."""
    # mean and std along axis 0, then guard the zero-std columns
    raise NotImplementedError`,
    hints: [
      String.raw`Compute the per-column mean and std with X.mean(axis=0) and X.std(axis=0). Both give a (d,) vector that broadcasts against X.`,
      String.raw`The only danger is dividing by a zero std. Build a "safe" std where every 0 is replaced by 1 before dividing.`,
      String.raw`np.where(std == 0, 1.0, std) gives the safe denominator; then return (X - mean) / safe_std.`,
    ],
    solution: String.raw`import numpy as np

def standardize(X):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    safe = np.where(std == 0, 1.0, std)
    return (X - mean) / safe`,
    tests: [
      { name: "known 2x1 case maps to -1 and 1", code: String.raw`import numpy as np
Z = standardize(np.array([[0.0], [2.0]]))
assert np.allclose(Z, [[-1.0], [1.0]]), f"got {Z.tolist()}"` },
      { name: "each column becomes mean 0 std 1", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(5, 3, size=(200, 4))
Z = standardize(X)
assert Z.shape == (200, 4), f"shape {Z.shape}"
assert np.allclose(Z.mean(axis=0), 0, atol=1e-9), "columns not centered"
assert np.allclose(Z.std(axis=0), 1, atol=1e-9), "columns not unit-variance"` },
      { name: "constant column becomes zeros, not nan", code: String.raw`import numpy as np
X = np.array([[1.0, 5.0], [1.0, 7.0], [1.0, 9.0]])
Z = standardize(X)
assert not np.any(np.isnan(Z)), "zero-std column produced nan"
assert np.allclose(Z[:, 0], 0.0), f"constant column should be zeros, got {Z[:, 0]}"` },
      { name: "does not mutate the input array", code: String.raw`import numpy as np
X = np.array([[1.0, 2.0], [3.0, 4.0]])
before = X.copy()
_ = standardize(X)
assert np.array_equal(X, before), "input was mutated"` },
      { name: "standardizes per column, independently", code: String.raw`import numpy as np
X = np.array([[0.0, 100.0], [10.0, 300.0]])
Z = standardize(X)
assert np.allclose(Z, [[-1.0, -1.0], [1.0, 1.0]]), f"got {Z.tolist()}"` },
    ],
  };

  W.exercises["w2d1-e2"] = {
    title: "Vectorized pairwise distances",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: ["numpy"],
    brief: "The (n, n) euclidean distance matrix with zero Python loops.",
    description: String.raw`Implement ~pairwise_dist(X)~ for ~X~ of shape ~(n, d)~. Return the ~(n, n)~ matrix ~D~ where ~D[i, j]~ is the euclidean distance between rows ~i~ and ~j~. **No Python loops** — this must be pure numpy.

The clean trick is the squared-norm expansion:

~~~text
||a - b||^2 = ||a||^2 + ||b||^2 - 2 a·b
~~~

so with per-row squared norms ~sq~, the whole matrix of squared distances is ~sq[:, None] + sq[None, :] - 2 X Xᵀ~. Floating-point error can push tiny diagonal values slightly negative, so clip at 0 before the square root.

~~~python
X = np.array([[0.0, 0.0], [3.0, 4.0]])
pairwise_dist(X)
# [[0., 5.],
#  [5., 0.]]
~~~

Interview angle: "compute all pairwise distances without a loop" is a rite-of-passage numpy question. It checks whether you can turn a double sum into matrix algebra and whether you remember to clip the negatives that floating point sneaks in.`,
    starter: String.raw`import numpy as np

def pairwise_dist(X):
    """Return the (n, n) matrix of euclidean distances between rows. No loops!"""
    # use the identity ||a-b||^2 = ||a||^2 + ||b||^2 - 2 a.b
    raise NotImplementedError`,
    hints: [
      String.raw`Per-row squared norms: sq = (X * X).sum(axis=1), a vector of length n.`,
      String.raw`Broadcast sq into a full matrix: sq[:, None] + sq[None, :] is the (n, n) of ||a||^2 + ||b||^2. Subtract 2 * X @ X.T.`,
      String.raw`Floating point can make the diagonal a tiny negative number; np.clip(d2, 0, None) before np.sqrt avoids nan.`,
    ],
    solution: String.raw`import numpy as np

def pairwise_dist(X):
    X = np.asarray(X, dtype=float)
    sq = (X * X).sum(axis=1)
    d2 = sq[:, None] + sq[None, :] - 2.0 * (X @ X.T)
    return np.sqrt(np.clip(d2, 0, None))`,
    tests: [
      { name: "known 2-point case gives distance 5", code: String.raw`import numpy as np
X = np.array([[0.0, 0.0], [3.0, 4.0]])
D = pairwise_dist(X)
assert D.shape == (2, 2), f"shape {D.shape}"
assert abs(D[0, 1] - 5.0) < 1e-9, f"expected 5.0, got {D[0, 1]}"
assert abs(D[1, 0] - 5.0) < 1e-9, "matrix must be symmetric"` },
      { name: "matches a brute-force reference", code: String.raw`import numpy as np
rng = np.random.default_rng(1)
X = rng.normal(size=(25, 6))
D = pairwise_dist(X)
ref = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
assert np.allclose(D, ref, atol=1e-6), "does not match reference distances"` },
      { name: "diagonal is exactly zero (no nan from float error)", code: String.raw`import numpy as np
rng = np.random.default_rng(2)
X = rng.normal(size=(40, 3))
D = pairwise_dist(X)
assert not np.any(np.isnan(D)), "produced nan — did you clip negatives?"
assert np.allclose(np.diag(D), 0.0, atol=1e-6), "diagonal must be zero"` },
      { name: "result is symmetric", code: String.raw`import numpy as np
rng = np.random.default_rng(3)
X = rng.normal(size=(15, 4))
D = pairwise_dist(X)
assert np.allclose(D, D.T, atol=1e-9), "distance matrix must equal its transpose"` },
    ],
  };

  W.exercises["w2d1-e3"] = {
    title: "Top product per city (pandas)",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy", "pandas"],
    brief: "groupby, aggregate, and pick the winner per group with a clean tie-break.",
    description: String.raw`You are handed a sales DataFrame with columns ~city~, ~product~, and ~revenue~ (one row per sale). Implement ~top_product_per_city(df)~ returning a dict ~{city: product}~ where, for each city, ~product~ is the one with the **highest total revenue** in that city.

Rules:

- Sum revenue per (city, product) first — a product can appear in several rows.
- Break ties by the **smallest product name** alphabetically.

~~~python
# NYC: A=10+3=13, B=5   -> A
# LA:  C=7+2=9          -> C
top_product_per_city(df)
# {"NYC": "A", "LA": "C"}
~~~

Interview angle: split-apply-combine is the bread and butter of data screens. The interesting part is the deterministic tie-break — real answers never depend on the arbitrary order rows happened to arrive in.`,
    starter: String.raw`import pandas as pd

def top_product_per_city(df):
    """Return {city: product} where product has the max total revenue in that city.
    Ties broken by smallest product name."""
    # 1) sum revenue per (city, product)  2) sort  3) take the top per city
    raise NotImplementedError`,
    hints: [
      String.raw`Aggregate first: df.groupby(["city", "product"])["revenue"].sum() collapses duplicate rows into one total per pair.`,
      String.raw`Turn the result into a frame with reset_index(), then sort by city, then revenue descending, then product ascending — the last key is your tie-break.`,
      String.raw`After sorting, groupby("city").first() keeps the winning row per city; zip its index with the product column into a dict.`,
    ],
    solution: String.raw`import pandas as pd

def top_product_per_city(df):
    totals = df.groupby(["city", "product"])["revenue"].sum().reset_index()
    totals = totals.sort_values(
        ["city", "revenue", "product"],
        ascending=[True, False, True],
    )
    top = totals.groupby("city", sort=True).first()
    return dict(zip(top.index, top["product"]))`,
    tests: [
      { name: "picks the highest-revenue product per city", code: String.raw`import pandas as pd
df = pd.DataFrame({
    "city": ["NYC", "NYC", "NYC", "LA", "LA"],
    "product": ["A", "B", "A", "C", "C"],
    "revenue": [10, 5, 3, 7, 2],
})
res = top_product_per_city(df)
assert res == {"NYC": "A", "LA": "C"}, f"got {res}"` },
      { name: "sums duplicate rows before comparing", code: String.raw`import pandas as pd
df = pd.DataFrame({
    "city": ["Z", "Z", "Z"],
    "product": ["big", "small", "small"],
    "revenue": [9, 6, 6],
})
# big = 9, small = 12 -> small wins only after summing its two rows
res = top_product_per_city(df)
assert res == {"Z": "small"}, f"got {res}"` },
      { name: "breaks ties by smallest product name", code: String.raw`import pandas as pd
df = pd.DataFrame({
    "city": ["X", "X"],
    "product": ["banana", "apple"],
    "revenue": [5, 5],
})
res = top_product_per_city(df)
assert res == {"X": "apple"}, f"tie should go to 'apple', got {res}"` },
      { name: "handles a single city with one product", code: String.raw`import pandas as pd
df = pd.DataFrame({"city": ["Solo"], "product": ["only"], "revenue": [42]})
res = top_product_per_city(df)
assert res == {"Solo": "only"}, f"got {res}"` },
    ],
  };

  // ================= Day 2 =================
  W.days.push({
    id: "w2d2",
    title: "The ML Frame: Generalization or Bust",
    minutes: 122,
    blocks: [
      { type: "lesson",   id: "w2d2-lesson", minutes: 25 },
      { type: "quiz",     id: "w2d2-quiz",   minutes: 12 },
      { type: "exercise", id: "w2d2-e1",     minutes: 25 },
      { type: "exercise", id: "w2d2-e2",     minutes: 25 },
      { type: "exercise", id: "w2d2-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "classic-ml", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w2d2-lesson"] = {
    title: "The ML Frame: Generalization or Bust",
    md: String.raw`The one question that quietly decides an ML interview is "how do you know your model actually works?" Every idea today — three splits, cross-validation, leakage, bias-variance — is machinery for answering that honestly. Get it wrong and you ship a model that dazzles on your own data and dies the moment real traffic hits it.

### Supervised learning, stated precisely

You have labeled examples ~(x_i, y_i)~. You assume some true relationship ~y ≈ f(x)~ plus noise, and you search a hypothesis space for an estimate ~f_hat~ that will do well on **unseen** ~x~. If ~y~ is continuous it is regression; if ~y~ is a discrete label it is classification. The entire game is generalization — performing on data you have never seen — not memorizing the data you have.

### Loss versus metric — not the same object

The **loss** is what the model optimizes: smooth, differentiable, computed per example (MSE, cross-entropy). The **metric** is what you report to humans: often non-differentiable and business-shaped (accuracy, F1, AUC, dollars). You minimize the loss as a stand-in; you are judged on the metric. They can disagree.

~~~python
def mse(y, yhat):       # loss: smooth, drives gradients
    return ((yhat - y) ** 2).mean()

def accuracy(y, yhat):  # metric: what the business reads
    return (y == yhat).mean()
~~~

### Three splits, and why two is not enough

**Train** fits the parameters. **Validation** chooses hyperparameters and compares models. **Test** estimates real-world performance exactly **once**, at the very end. Why not fold validation into test? Because the instant you tune against a set, information leaks into it and its score turns optimistic. The test set lives in a vault and is opened a single time. Tune on it and your headline number is fiction.

### k-fold cross-validation

With scarce data a single validation split is noisy. k-fold rotates: cut the data into ~k~ parts, train on ~k - 1~, validate on the held-out part, repeat ~k~ times, average the scores. Every point is validated exactly once. Five or ten folds is standard; you pay ~k~ times the compute for a lower-variance estimate.

~~~text
fold 1: [ VAL ][train][train][train][train]
fold 2: [train][ VAL ][train][train][train]
...           average the k validation scores
~~~

### Data leakage: the silent killer

Leakage is any information from outside the training fold sneaking into training. Three faces:

- **Preprocessing leakage** — fit a scaler or imputer on the full data, then split. Now training rows secretly know the test set's statistics.
- **Target leakage** — a feature that encodes the answer or is only known after the fact (a ~was_refunded~ column predicting ~is_fraud~).
- **Temporal leakage** — shuffling a time series so the model trains on the future. Split by time instead.

~~~python
# WRONG — the scaler sees the test rows
X = scaler.fit_transform(X_all)
train, test = split(X)

# RIGHT — fit on train only, then apply
train, test = split(X_all)
scaler.fit(train)
train = scaler.transform(train)
test = scaler.transform(test)
~~~

### Bias and variance, intuitively

Expected test error splits into ~bias^2 + variance + irreducible noise~. **High bias** means the model is too simple and wrong on average — it underfits, so training and validation error are both high. **High variance** means the model is too flexible and memorizes noise — it overfits, so training error is low but validation error is high. Capacity and regularization move you along that trade.

### Diagnose with learning curves and a baseline

Plot training and validation error as you add data or capacity:

- **Underfit** — both curves high and close together. Add capacity or better features.
- **Overfit** — a wide gap, train low and val high. Add data, regularize, or simplify.
- **Healthy** — both low with a small gap.

And always build the dumbest baseline first: predict the mean, or the majority class. If your clever model cannot beat "always guess the majority," something is broken — and now you have a concrete number to beat.

### ⚠️ Common pitfalls

- Fitting any transform on the full dataset before splitting — the textbook leak.
- Reusing the test set to make decisions; by definition it is single-use.
- Selecting features on the whole dataset, then cross-validating — feature-selection leakage inflates the score.
- Shuffling a time series so the model quietly trains on the future.
- Skipping the baseline, so you have no idea whether 0.82 is impressive or embarrassing.

### 🎤 In interviews, they ask

- "Why do you need three splits instead of just train and test?"
- "Give a concrete example of data leakage and how you would prevent it."
- "Explain the bias-variance tradeoff. How do learning curves tell them apart?"
- "How does k-fold cross-validation work, and when do you reach for it?"
- "You hit 99% accuracy on the first try. What is your reaction?" (Suspicion — leakage or class imbalance.)

### TL;DR

- Supervised learning fits ~f_hat~ to ~(x, y)~ pairs to generalize, not memorize.
- Loss is optimized (smooth); metric is reported (business). They can disagree.
- Train fits, validation tunes, test judges once — tuning on a set makes its score optimistic.
- k-fold averages ~k~ rotated validation scores for a lower-variance estimate.
- Leakage is outside information reaching training; fit every transform on train only.
- Bias = underfit (both errors high); variance = overfit (train low, val high). Baseline first.

### Go deeper

- [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course)
- [scikit-learn: cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [StatQuest — Bias, Variance, and more](https://www.youtube.com/@statquest)
- [Sebastian Raschka — model evaluation writing](https://sebastianraschka.com)
`,
  };

  W.quizzes["w2d2-quiz"] = [
    {
      q: String.raw`Why keep a separate test set instead of just train and validation?`,
      options: [
        "Three splits make training run faster",
        "The test set is where you pick hyperparameters",
        "Two splits are always enough; a third only wastes data",
        "Validation gets tuned so its score is optimistic; a held-out test set touched once gives an unbiased final estimate",
      ],
      answer: 3,
      explain: String.raw`Every time you use a set to make a decision, you leak information into it and its score becomes optimistic. Validation absorbs all your tuning, so you need a test set that was never used for any choice to estimate true generalization once.`,
    },
    {
      q: String.raw`What is wrong with this code?

~~~python
scaler.fit(X_all)
X_all = scaler.transform(X_all)
X_train, X_test = split(X_all)
~~~`,
      options: [
        "Nothing — this is the correct order of operations",
        "The scaler is fit on all rows including the test set, leaking its statistics into training",
        "transform must be called before fit",
        "Scaling before splitting is only a performance problem, not a correctness one",
      ],
      answer: 1,
      explain: String.raw`The scaler's mean and std are computed over every row, so the training data is transformed using knowledge of the test set — preprocessing leakage. The fix is to fit the scaler on the training split alone, then apply it to validation and test.`,
    },
    {
      q: String.raw`Training error is high and validation error is about the same and also high. This is…`,
      options: [
        "underfitting (high bias)",
        "overfitting (high variance)",
        "a data leak",
        "the ideal fit",
      ],
      answer: 0,
      explain: String.raw`Both errors being high and close together means the model is too simple to capture the signal — it is wrong even on data it trained on. That is high bias / underfitting. The fix is more capacity or better features, not more data.`,
    },
    {
      q: String.raw`Training error is near zero but validation error is large. The first fixes to try are…`,
      options: [
        "add more capacity or a bigger model",
        "train for fewer epochs on a smaller subset",
        "get more data, regularize, or simplify the model",
        "switch the loss function to accuracy",
      ],
      answer: 2,
      explain: String.raw`A big train-to-val gap is high variance — the model memorized noise. You reduce variance with more data, regularization, or a simpler model. Adding capacity would make the overfitting worse, and accuracy is a metric, not a trainable loss.`,
    },
    {
      q: String.raw`In 5-fold cross-validation, each data point is used for validation…`,
      options: [
        "exactly once",
        "five times",
        "zero times",
        "a random number of times",
      ],
      answer: 0,
      explain: String.raw`The folds partition the data, so each point sits in the validation fold exactly one time (and in the training set the other four times). Averaging those five validation scores gives a lower-variance estimate than any single split.`,
    },
    {
      q: String.raw`You are forecasting next month's sales from a table with a timestamp column, and you do this:

~~~python
X_train, X_test = random_shuffle_split(df)
~~~

What is the main risk?`,
      options: [
        "The split is reproducible, which is bad",
        "There is no risk; shuffling is always fine",
        "The test set will be too small",
        "Random shuffling lets the model train on future rows to predict the past — temporal leakage",
      ],
      answer: 3,
      explain: String.raw`For time-ordered data a random split scatters future records into the training set, so the model learns from information it would not have at prediction time. Split by time — train on the past, validate on the more recent slice.`,
    },
    {
      q: String.raw`Your model reaches 82% accuracy. Before celebrating, you should…`,
      options: [
        "ship it — 82% is objectively good",
        "compare against a trivial baseline (such as always predicting the majority class) to see whether 82% is even meaningful",
        "immediately replace it with a deep neural network",
        "delete the validation set to gain more training data",
      ],
      answer: 1,
      explain: String.raw`Accuracy has no meaning without context. If 85% of examples are the majority class, then 82% is worse than a one-line baseline. The baseline turns an abstract number into a verdict and is the first thing an interviewer expects you to mention.`,
    },
  ];

  W.exercises["w2d2-e1"] = {
    title: "Deterministic train/test split",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "Shuffle once with a seeded RNG and keep X and y perfectly aligned.",
    description: String.raw`Implement ~train_test_split(X, y, test_size=0.25, seed=0)~ returning four arrays in the order ~X_train, X_test, y_train, y_test~ (the scikit-learn convention).

Rules:

- Shuffle the row indices with ~np.random.default_rng(seed)~ so the split is fully reproducible.
- The **same permutation** must drive both ~X~ and ~y~ — a row's features and its label may never drift apart.
- The test set gets ~round(n * test_size)~ rows; the rest are training.

~~~python
X = np.arange(10).reshape(5, 2)
y = np.array([0, 1, 0, 1, 0])
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.4, seed=0)
# Xte has 2 rows, Xtr has 3; each Xtr[i] still pairs with its own ytr[i]
~~~

Interview angle: everyone "knows" train/test split, but the tell is whether you shuffle X and y with one shared index permutation. Splitting them independently silently scrambles labels — a bug that produces a model that looks trained but predicts noise.`,
    starter: String.raw`import numpy as np

def train_test_split(X, y, test_size=0.25, seed=0):
    """Return X_train, X_test, y_train, y_test using one seeded permutation."""
    # build one permutation of range(n); slice it into test / train index blocks
    raise NotImplementedError`,
    hints: [
      String.raw`Make a generator with rng = np.random.default_rng(seed), then perm = rng.permutation(n) — one shuffled index array.`,
      String.raw`n_test = int(round(n * test_size)). The first n_test entries of perm are the test indices, the rest are train.`,
      String.raw`Index BOTH arrays with the same index blocks: X[test_idx], y[test_idx], X[train_idx], y[train_idx]. That keeps rows and labels aligned.`,
    ],
    solution: String.raw`import numpy as np

def train_test_split(X, y, test_size=0.25, seed=0):
    X = np.asarray(X)
    y = np.asarray(y)
    n = X.shape[0]
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    n_test = int(round(n * test_size))
    test_idx = perm[:n_test]
    train_idx = perm[n_test:]
    return X[train_idx], X[test_idx], y[train_idx], y[test_idx]`,
    tests: [
      { name: "split sizes follow round(n * test_size)", code: String.raw`import numpy as np
X = np.arange(40).reshape(20, 2)
y = np.arange(20)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, seed=0)
assert Xte.shape[0] == 5 and Xtr.shape[0] == 15, f"got {Xtr.shape[0]}/{Xte.shape[0]}"
assert yte.shape[0] == 5 and ytr.shape[0] == 15, "y sizes must match X sizes"` },
      { name: "train and test partition all rows with no overlap", code: String.raw`import numpy as np
n = 20
X = np.arange(n).reshape(n, 1)
y = np.arange(n)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, seed=7)
tr = set(Xtr.ravel().tolist()); te = set(Xte.ravel().tolist())
assert tr & te == set(), "train and test overlap"
assert tr | te == set(range(n)), "some rows are missing or duplicated"` },
      { name: "X and y stay aligned after shuffling", code: String.raw`import numpy as np
n = 20
X = np.arange(n).reshape(n, 1)   # feature value == row id
y = np.arange(n) * 10            # label determined by row id
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.5, seed=3)
assert np.array_equal(Xtr.ravel() * 10, ytr), "train labels drifted from features"
assert np.array_equal(Xte.ravel() * 10, yte), "test labels drifted from features"` },
      { name: "same seed is fully reproducible", code: String.raw`import numpy as np
X = np.arange(30).reshape(15, 2)
y = np.arange(15)
a = train_test_split(X, y, test_size=0.2, seed=11)
b = train_test_split(X, y, test_size=0.2, seed=11)
assert all(np.array_equal(p, q) for p, q in zip(a, b)), "not deterministic for a fixed seed"` },
      { name: "different seeds produce different splits", code: String.raw`import numpy as np
X = np.arange(20).reshape(20, 1)
y = np.arange(20)
_, Xte1, _, _ = train_test_split(X, y, test_size=0.5, seed=1)
_, Xte2, _, _ = train_test_split(X, y, test_size=0.5, seed=2)
assert not np.array_equal(np.sort(Xte1.ravel()), np.sort(Xte2.ravel())), "seed had no effect"` },
    ],
  };

  W.exercises["w2d2-e2"] = {
    title: "k-fold indices",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "Rotate k validation folds that cover every sample exactly once.",
    description: String.raw`Implement ~k_fold_indices(n, k, seed=0)~ that **yields** ~k~ pairs ~(train_idx, val_idx)~ of integer numpy arrays. Across all folds, every index in ~range(n)~ must appear in a validation fold **exactly once**.

Rules:

- Shuffle ~range(n)~ once with ~np.random.default_rng(seed)~, then cut the shuffled indices into ~k~ contiguous folds.
- When ~n~ is not divisible by ~k~, fold sizes may differ by at most 1 (use ~np.array_split~).
- For each fold, ~val_idx~ is that fold and ~train_idx~ is everything else.

~~~python
for train_idx, val_idx in k_fold_indices(10, 5, seed=0):
    # val_idx has 2 entries; train_idx has 8; the 5 val folds tile 0..9 once each
    ...
~~~

Interview angle: cross-validation is where sloppy code lets a sample land in both train and validation. The "covers every sample exactly once, never in its own training set" invariant is the whole point — and exactly what a good interviewer probes.`,
    starter: String.raw`import numpy as np

def k_fold_indices(n, k, seed=0):
    """Yield k pairs (train_idx, val_idx); each sample validates exactly once."""
    # shuffle range(n), split into k folds, then for each fold: val = fold, train = rest
    raise NotImplementedError`,
    hints: [
      String.raw`Shuffle first: perm = np.random.default_rng(seed).permutation(n). Then np.array_split(perm, k) gives k folds with sizes differing by at most 1.`,
      String.raw`For fold i, the validation indices are folds[i]. The training indices are every other fold concatenated together.`,
      String.raw`np.concatenate([folds[j] for j in range(k) if j != i]) builds the training indices; yield (train_idx, val_idx) inside the loop.`,
    ],
    solution: String.raw`import numpy as np

def k_fold_indices(n, k, seed=0):
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    folds = np.array_split(perm, k)
    for i in range(k):
        val_idx = folds[i]
        others = [folds[j] for j in range(k) if j != i]
        train_idx = np.concatenate(others) if others else np.array([], dtype=int)
        yield train_idx, val_idx`,
    tests: [
      { name: "yields exactly k folds", code: String.raw`import numpy as np
folds = list(k_fold_indices(23, 5, seed=3))
assert len(folds) == 5, f"expected 5 folds, got {len(folds)}"` },
      { name: "each validation fold is disjoint from its training set", code: String.raw`import numpy as np
for train_idx, val_idx in k_fold_indices(23, 5, seed=3):
    tr = set(train_idx.tolist()); va = set(val_idx.tolist())
    assert tr & va == set(), "a sample appears in both train and val"
    assert tr | va == set(range(23)), "train + val must cover every sample"` },
      { name: "every sample validates exactly once", code: String.raw`import numpy as np
seen = []
for _, val_idx in k_fold_indices(23, 5, seed=3):
    seen.extend(val_idx.tolist())
assert sorted(seen) == list(range(23)), "validation folds must tile 0..n-1 once each"` },
      { name: "fold sizes differ by at most one", code: String.raw`import numpy as np
sizes = [len(val_idx) for _, val_idx in k_fold_indices(23, 5, seed=1)]
assert max(sizes) - min(sizes) <= 1, f"uneven folds: {sizes}"
even = [len(val_idx) for _, val_idx in k_fold_indices(10, 5, seed=1)]
assert all(s == 2 for s in even), f"10/5 should be all-2 folds, got {even}"` },
      { name: "deterministic for a fixed seed", code: String.raw`import numpy as np
a = [(t.tolist(), v.tolist()) for t, v in k_fold_indices(17, 4, seed=9)]
b = [(t.tolist(), v.tolist()) for t, v in k_fold_indices(17, 4, seed=9)]
assert a == b, "not reproducible for a fixed seed"` },
    ],
  };

  W.exercises["w2d2-e3"] = {
    title: "StandardScaler with train-only fit",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "fit / transform / fit_transform — and never let test stats leak in.",
    description: String.raw`Build a ~StandardScaler~ class with ~fit(X)~, ~transform(X)~, and ~fit_transform(X)~. ~fit~ stores the per-column mean and std of the data it sees; ~transform~ applies the **stored** statistics; ~fit_transform~ does both on the same data.

Rules:

- Store column means in ~self.mean_~ and the (zero-guarded) column stds in ~self.scale_~ during ~fit~.
- A constant column has std 0 — store 1 in its place so ~transform~ never divides by zero.
- ~transform~ must use the stored stats, so calling it on a **held-out** set standardizes with the training mean/std (the whole point — no leakage).
- ~fit~ should return ~self~ so calls can chain.

~~~python
sc = StandardScaler()
Xtr_scaled = sc.fit_transform(X_train)   # train columns -> mean 0, std 1
Xte_scaled = sc.transform(X_test)        # uses TRAIN mean/std, not test's
~~~

Interview angle: this is the fit-on-train-apply-to-test discipline from the lesson, made concrete. If ~transform~ recomputed statistics from its argument, your test scaling would leak — and that is exactly the bug interviewers hunt for.`,
    starter: String.raw`import numpy as np

class StandardScaler:
    def fit(self, X):
        """Store per-column mean_ and scale_ (std with zeros replaced by 1). Return self."""
        raise NotImplementedError

    def transform(self, X):
        """Apply the STORED mean_ and scale_."""
        raise NotImplementedError

    def fit_transform(self, X):
        raise NotImplementedError`,
    hints: [
      String.raw`In fit: self.mean_ = X.mean(axis=0); std = X.std(axis=0); self.scale_ = np.where(std == 0, 1.0, std). Return self.`,
      String.raw`transform must NOT recompute anything — it is (X - self.mean_) / self.scale_ using the values saved during fit.`,
      String.raw`fit_transform is just self.fit(X).transform(X); because fit returns self, that one-liner works.`,
    ],
    solution: String.raw`import numpy as np

class StandardScaler:
    def fit(self, X):
        X = np.asarray(X, dtype=float)
        self.mean_ = X.mean(axis=0)
        std = X.std(axis=0)
        self.scale_ = np.where(std == 0, 1.0, std)
        return self

    def transform(self, X):
        X = np.asarray(X, dtype=float)
        return (X - self.mean_) / self.scale_

    def fit_transform(self, X):
        return self.fit(X).transform(X)`,
    tests: [
      { name: "fit_transform centers and scales the fit data", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
Xtr = rng.normal(10, 2, size=(50, 3))
Z = StandardScaler().fit_transform(Xtr)
assert np.allclose(Z.mean(axis=0), 0, atol=1e-9), "columns not centered"
assert np.allclose(Z.std(axis=0), 1, atol=1e-9), "columns not unit std"` },
      { name: "transform uses stored train stats, not the test set's", code: String.raw`import numpy as np
rng = np.random.default_rng(1)
Xtr = rng.normal(10, 2, size=(50, 3))
Xte = rng.normal(10, 2, size=(20, 3))
sc = StandardScaler().fit(Xtr)
Zte = sc.transform(Xte)
manual = (Xte - Xtr.mean(axis=0)) / Xtr.std(axis=0)
assert np.allclose(Zte, manual, atol=1e-9), "transform did not use the training statistics"` },
      { name: "constant column does not produce nan", code: String.raw`import numpy as np
X = np.array([[1.0, 2.0], [1.0, 4.0], [1.0, 6.0]])
Z = StandardScaler().fit_transform(X)
assert not np.any(np.isnan(Z)), "zero-std column produced nan"
assert np.allclose(Z[:, 0], 0.0), "constant column should map to zeros"` },
      { name: "fit returns self for chaining", code: String.raw`import numpy as np
sc = StandardScaler()
assert sc.fit(np.array([[1.0], [2.0], [3.0]])) is sc, "fit must return self"` },
    ],
  };

  // ================= Day 3 =================
  W.days.push({
    id: "w2d3",
    title: "Linear Models & Gradient Descent",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w2d3-lesson", minutes: 25 },
      { type: "quiz",     id: "w2d3-quiz",   minutes: 12 },
      { type: "exercise", id: "w2d3-e1",     minutes: 25 },
      { type: "exercise", id: "w2d3-e2",     minutes: 30 },
      { type: "exercise", id: "w2d3-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "classic-ml", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w2d3-lesson"] = {
    title: "Linear Models & Gradient Descent",
    md: String.raw`If you can derive the gradient of MSE on a whiteboard and explain why we do not use MSE for classification, you have already cleared the bar that most candidates trip over. Linear models are the "hello world" of machine learning and the lens through which every later model is understood — and gradient descent is the engine humming underneath nearly all of them.

### Linear regression: the hypothesis

Predict a continuous target as a weighted sum of features: ~yhat = X w~. With ~n~ examples and ~d~ features, ~X~ is ~(n, d)~ and ~w~ is ~(d,)~. Want an intercept? Prepend a column of ones to ~X~ and let its weight be the bias.

~~~python
yhat = X @ w        # (n, d) @ (d,) -> (n,)
~~~

### MSE and its gradient — derive it once, keep it forever

The loss is mean squared error:

~~~text
L(w)  = (1/n) * sum_i (x_i . w - y_i)^2  =  (1/n) * ||X w - y||^2
~~~

Differentiate with respect to ~w~. Let the residual be ~r = X w - y~. Then:

~~~text
grad L(w) = (2/n) * X^T (X w - y)
~~~

That is the formula to have in muscle memory. Each component answers "if I nudge this weight up, how does the loss move?" To go downhill, step **against** the gradient.

### Closed form versus gradient descent

MSE has an exact minimizer, the normal equation ~w = (X^T X)^(-1) X^T y~ — no learning rate, no iterations. But inverting a ~d x d~ matrix is ~O(d^3)~ and blows up when ~X^T X~ is singular or ~d~ is huge. Gradient descent is iterative and scales to millions of rows and features; it is how everything past plain linear regression is trained. Know both, and know when each wins.

### Gradient descent and the learning rate

Repeat one update: ~w <- w - lr * grad~. The learning rate ~lr~ is the single most important knob.

- Too small — it crawls and may not converge within your budget.
- Too large — it overshoots, oscillates, and can diverge to ~inf~ / ~nan~.
- Just right — the loss drops steadily.

~~~python
for _ in range(n_iters):
    grad = (2 / n) * X.T @ (X @ w - y)
    w = w - lr * grad
~~~

### Batch, mini-batch, SGD

Batch GD uses all ~n~ rows per step: an accurate gradient, but expensive. SGD uses a single row: noisy, fast, and able to wriggle out of shallow traps. Mini-batch (32-512 rows) is the industry default — a gradient smooth enough to trust with hardware-friendly throughput.

### Feature scaling is not optional for GD

Gradient descent applies the same ~lr~ in every direction. If one feature ranges 0-1 and another ranges 0-100000, the loss surface is a long stretched valley and GD zig-zags down it forever. Standardize the features and the valley becomes round, so GD walks straight to the bottom. (The closed form does not care — but GD very much does.)

### Logistic regression: from a line to a probability

For classification, squash the linear score through the sigmoid:

~~~text
sigma(z) = 1 / (1 + exp(-z)),      z = x . w + b
~~~

The sigmoid maps any real number into ~(0, 1)~ — a probability. Predict class 1 when ~sigma(z) >= 0.5~, which is exactly when ~z >= 0~.

### Why cross-entropy, not MSE, for classification

Two reasons. First, MSE composed with a sigmoid is **non-convex** in ~w~, so GD can stall in local dips; log-loss (cross-entropy) with a sigmoid is **convex** — one global minimum. Second, MSE's gradient carries a ~sigma'(z)~ factor that vanishes precisely when the model is confidently wrong, so learning crawls when it should sprint. Cross-entropy's gradient is the clean ~(sigma(z) - y) x~ — big error, big step.

~~~text
log-loss = -(1/n) * sum [ y*log(p) + (1 - y)*log(1 - p) ],   p = sigma(z)
grad     = (1/n) * X^T (p - y)
~~~

### L1 versus L2: the geometry of sparsity

Regularization adds a penalty on weight size. **L2 (ridge)** adds ~lambda * ||w||^2~ and shrinks every weight smoothly toward zero but never exactly to zero. **L1 (lasso)** adds ~lambda * ||w||_1~; its diamond-shaped constraint has corners sitting on the axes, so the optimum often lands on a corner — zeroing weights and thereby selecting features. L2 shrinks everything a little; L1 kills some outright.

### ⚠️ Common pitfalls

- Dropping the ~2/n~ (or ~1/n~) factor in the gradient — it rescales your effective learning rate, and it bites when you paste formulas from memory.
- Running GD on unscaled features, then blaming the model when it will not converge.
- Using MSE for classification and wondering why training stalls.
- A learning rate so high the loss becomes ~nan~ — always track the loss each step.
- Mixing up L1 and L2: only L1 produces exact zeros and sparsity.

### 🎤 In interviews, they ask

- "Derive the gradient of the MSE loss for linear regression."
- "When would you use the normal equation instead of gradient descent, and vice versa?"
- "Why do we use cross-entropy rather than MSE for logistic regression?"
- "What does the learning rate control, and what happens if it is too large?"
- "What is the difference between L1 and L2 regularization, and which one yields sparsity?"

### TL;DR

- Linear regression: ~yhat = X w~; the MSE gradient is ~(2/n) X^T (X w - y)~ — memorize it.
- The normal equation is exact but ~O(d^3)~ and fragile; GD is iterative and scales.
- The learning rate rules GD: too small crawls, too large diverges.
- Batch / mini-batch / SGD trade gradient accuracy for speed; mini-batch is the default.
- Scale features before GD or the loss valley becomes a zig-zag trap.
- Logistic regression = sigmoid + cross-entropy (convex, clean ~p - y~ gradient).
- L2 shrinks smoothly; L1's corners zero weights out and select features.

### Go deeper

- [Google ML Crash Course: linear/logistic regression & gradient descent](https://developers.google.com/machine-learning/crash-course)
- [StatQuest — Gradient Descent and Logistic Regression](https://www.youtube.com/@statquest)
- [scikit-learn: generalized linear models](https://scikit-learn.org/stable/modules/linear_model.html)
- [Sebastian Raschka — machine learning notes](https://sebastianraschka.com)
`,
  };

  W.quizzes["w2d3-quiz"] = [
    {
      q: String.raw`For linear regression with loss ~L(w) = (1/n) ||X w - y||^2~, the gradient with respect to ~w~ is:`,
      options: [
        "(2/n) (X w - y)",
        "X^T X w",
        "(2/n) X^T (X w - y)",
        "(1/n) (y - X w)^2",
      ],
      answer: 2,
      explain: String.raw`Let the residual be r = X w - y. Differentiating the mean of squared residuals gives (2/n) X^T r. The X^T is what maps the per-example residuals back onto each weight's contribution; without it the shapes do not even match.`,
    },
    {
      q: String.raw`Why is cross-entropy preferred over MSE as the loss for logistic regression?`,
      options: [
        "Cross-entropy is simply faster to compute",
        "MSE cannot represent probabilities at all",
        "They are identical; the choice is only convention",
        "MSE with a sigmoid is non-convex and its gradient vanishes when confidently wrong, whereas cross-entropy is convex with a clean (p - y) gradient",
      ],
      answer: 3,
      explain: String.raw`Sigmoid + MSE has a bumpy, non-convex surface and a gradient that dies when the model is very wrong, so learning stalls. Sigmoid + cross-entropy is convex with a single minimum, and its gradient is proportional to the error (p - y) — large mistakes push hard.`,
    },
    {
      q: String.raw`What happens to ~w~?

~~~python
w = 0.0
for _ in range(5):
    grad = 2 * (w - 3)     # loss minimized at w = 3
    w = w - 10.0 * grad    # learning rate 10
~~~`,
      options: [
        "It converges smoothly to 3",
        "It diverges, swinging to ever larger magnitudes",
        "It stays at 0 forever",
        "It reaches exactly 3 in one step",
      ],
      answer: 1,
      explain: String.raw`Step one: grad = -6, so w jumps to 60. Step two: grad = 114, so w drops to -1080. The learning rate is far too large, so each correction overshoots the minimum by more than it started off — the classic divergence you see as the loss exploding to nan.`,
    },
    {
      q: String.raw`Which regularizer tends to drive some weights **exactly** to zero, effectively selecting features?`,
      options: [
        "L1 (lasso)",
        "L2 (ridge)",
        "Both zero out weights equally",
        "Neither; regularization never sets a weight to exactly zero",
      ],
      answer: 0,
      explain: String.raw`L1's constraint region is a diamond with corners on the axes, and the loss contours tend to touch it at a corner — where some coordinates are exactly zero. L2's constraint is a smooth ball, so it shrinks weights toward zero but essentially never reaches it.`,
    },
    {
      q: String.raw`Gradient descent will not converge on features with wildly different scales. The most likely fix is:`,
      options: [
        "Increase the learning rate a lot",
        "Switch the arrays from float64 to float32",
        "Standardize the features so the loss surface is well-conditioned",
        "Add more iterations; feature scale never matters",
      ],
      answer: 2,
      explain: String.raw`Different feature scales stretch the loss surface into a narrow valley, and a single learning rate cannot suit every direction, so GD zig-zags. Standardizing makes the surface round, letting one learning rate descend cleanly. The closed-form solution is scale-invariant, but GD is not.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
def sigmoid(z):
    return 1 / (1 + np.exp(-z))
print(sigmoid(0.0))
~~~`,
      options: ["0.0", "0.5", "1.0", "It is undefined at 0"],
      answer: 1,
      explain: String.raw`At z = 0, exp(-0) is 1, so sigmoid = 1 / (1 + 1) = 0.5. That is the decision boundary of logistic regression: z = 0 maps to probability 0.5, and the predicted class flips there.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
w = np.array([2.0])
grad = np.array([4.0])
lr = 0.5
w = w - lr * grad
print(w)
~~~`,
      options: ["[4.]", "[2.]", "[-2.]", "[0.]"],
      answer: 3,
      explain: String.raw`One gradient-descent step is w - lr * grad = 2.0 - 0.5 * 4.0 = 0.0. The update moves against the gradient (subtracting it) so the parameter heads downhill; here the step size lands it exactly at 0.`,
    },
  ];

  W.exercises["w2d3-e1"] = {
    title: "MSE, its gradient, and one GD step",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "The three pieces that compose into linear regression by gradient descent.",
    description: String.raw`Implement the core of linear regression from scratch. The model is ~yhat = X @ w~ (fold any intercept into a ones column yourself).

- ~mse(y, yhat)~ — mean squared error, a Python float.
- ~linreg_gradient(X, y, w)~ — the gradient of MSE with respect to ~w~, i.e. ~(2/n) X^T (X w - y)~.
- ~gd_step(w, grad, lr)~ — one descent step, ~w - lr * grad~.

~~~python
X = np.array([[1.0], [2.0], [3.0]])
y = np.array([2.0, 4.0, 6.0])        # y = 2x exactly
w = np.array([0.0])
g = linreg_gradient(X, y, w)         # negative -> pushes w up toward 2
w = gd_step(w, g, 0.1)               # one downhill step
mse(y, X @ w)                        # smaller than mse(y, 0)
~~~

Interview angle: "code linear regression with gradient descent" is a staple. Getting the ~2/n~ factor and the ~X^T~ right — and showing the three pieces compose into a converging loop — is what separates "I memorized a formula" from "I understand the math."`,
    starter: String.raw`import numpy as np

def mse(y, yhat):
    """Mean squared error as a float."""
    raise NotImplementedError

def linreg_gradient(X, y, w):
    """Gradient of MSE wrt w for the model yhat = X @ w: (2/n) X^T (X w - y)."""
    raise NotImplementedError

def gd_step(w, grad, lr):
    """One gradient-descent update: w - lr * grad."""
    raise NotImplementedError`,
    hints: [
      String.raw`mse: take the elementwise difference yhat - y, square it, call .mean(), and wrap in float().`,
      String.raw`linreg_gradient: residual = X @ w - y (shape n). Then (2 / n) * (X.T @ residual) gives the (d,) gradient.`,
      String.raw`gd_step is literally w - lr * grad; keep everything as numpy arrays so it broadcasts.`,
    ],
    solution: String.raw`import numpy as np

def mse(y, yhat):
    y = np.asarray(y, dtype=float)
    yhat = np.asarray(yhat, dtype=float)
    return float(np.mean((yhat - y) ** 2))

def linreg_gradient(X, y, w):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = X.shape[0]
    residual = X @ w - y
    return (2.0 / n) * (X.T @ residual)

def gd_step(w, grad, lr):
    return np.asarray(w, dtype=float) - lr * np.asarray(grad, dtype=float)`,
    tests: [
      { name: "mse is zero for a perfect fit and correct otherwise", code: String.raw`import numpy as np
assert abs(mse([1.0, 2.0, 3.0], [1.0, 2.0, 3.0])) < 1e-12, "perfect fit should be 0"
assert abs(mse(np.array([0.0, 0.0]), np.array([2.0, 0.0])) - 2.0) < 1e-12, "mean of [4, 0] is 2"` },
      { name: "gradient matches the hand-computed value", code: String.raw`import numpy as np
X = np.array([[1.0], [1.0]])
y = np.array([2.0, 4.0])
w = np.array([0.0])
g = linreg_gradient(X, y, w)
# residual = [-2, -4]; X^T r = -6; (2/2) * -6 = -6
assert np.allclose(g, [-6.0]), f"expected [-6.0], got {g}"` },
      { name: "gd_step moves against the gradient", code: String.raw`import numpy as np
w2 = gd_step(np.array([1.0]), np.array([2.0]), 0.1)
assert np.allclose(w2, [0.8]), f"expected [0.8], got {w2}"` },
      { name: "the three pieces compose into a converging loop", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(size=(200, 3))
w_true = np.array([2.0, -1.0, 0.5])
y = X @ w_true
w = np.zeros(3)
for _ in range(1000):
    w = gd_step(w, linreg_gradient(X, y, w), 0.1)
assert mse(y, X @ w) < 1e-6, f"did not converge, mse={mse(y, X @ w)}"
assert np.allclose(w, w_true, atol=1e-3), f"weights off: {w}"` },
      { name: "gradient is ~zero at the optimum", code: String.raw`import numpy as np
rng = np.random.default_rng(5)
X = rng.normal(size=(50, 2))
w_true = np.array([1.5, -0.5])
y = X @ w_true
g = linreg_gradient(X, y, w_true)
assert np.allclose(g, 0.0, atol=1e-9), f"gradient should vanish at optimum, got {g}"` },
    ],
  };

  W.exercises["w2d3-e2"] = {
    title: "Logistic regression by gradient descent",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: ["numpy"],
    brief: "Sigmoid, cross-entropy gradient, and a fit loop that separates two blobs.",
    description: String.raw`Implement ~LogisticRegressionGD~ with:

- ~fit(X, y)~ — learn weight vector ~w~ and bias ~b~ by gradient descent on the log-loss. The cross-entropy gradients are ~grad_w = (1/n) X^T (p - y)~ and ~grad_b = mean(p - y)~, where ~p = sigmoid(X w + b)~.
- ~predict_proba(X)~ — the probabilities ~sigmoid(X w + b)~, shape ~(n,)~.
- ~predict(X)~ — hard labels, 1 where the probability is ~>= 0.5~ else 0.

Constructor takes ~lr~ and ~n_iters~. Initialize ~w~ to zeros and ~b~ to 0.

~~~python
clf = LogisticRegressionGD(lr=0.1, n_iters=2000).fit(X, y)
clf.predict_proba(X)   # values in (0, 1)
clf.predict(X)         # 0/1 labels
~~~

Interview angle: this is the from-scratch classifier interviewers love. Watch the numerics — a naive sigmoid overflows on large negative inputs. Clip the input to ~exp~ so training never turns into ~nan~.`,
    starter: String.raw`import numpy as np

class LogisticRegressionGD:
    def __init__(self, lr=0.1, n_iters=1000):
        self.lr = lr
        self.n_iters = n_iters

    def _sigmoid(self, z):
        # clip z before exp to avoid overflow on large-magnitude inputs
        raise NotImplementedError

    def fit(self, X, y):
        """Gradient descent on log-loss. Set self.w, self.b. Return self."""
        raise NotImplementedError

    def predict_proba(self, X):
        raise NotImplementedError

    def predict(self, X):
        raise NotImplementedError`,
    hints: [
      String.raw`Stable sigmoid: z = np.clip(z, -500, 500) then 1 / (1 + np.exp(-z)). The clip keeps exp from overflowing to inf.`,
      String.raw`In fit, loop n_iters times: p = sigmoid(X @ w + b); grad_w = (X.T @ (p - y)) / n; grad_b = (p - y).mean(); then w -= lr*grad_w; b -= lr*grad_b.`,
      String.raw`predict_proba returns sigmoid(X @ w + b). predict returns (predict_proba(X) >= 0.5).astype(int).`,
    ],
    solution: String.raw`import numpy as np

class LogisticRegressionGD:
    def __init__(self, lr=0.1, n_iters=1000):
        self.lr = lr
        self.n_iters = n_iters

    def _sigmoid(self, z):
        z = np.clip(z, -500, 500)
        return 1.0 / (1.0 + np.exp(-z))

    def fit(self, X, y):
        X = np.asarray(X, dtype=float)
        y = np.asarray(y, dtype=float)
        n, d = X.shape
        self.w = np.zeros(d)
        self.b = 0.0
        for _ in range(self.n_iters):
            p = self._sigmoid(X @ self.w + self.b)
            grad_w = (X.T @ (p - y)) / n
            grad_b = float(np.mean(p - y))
            self.w -= self.lr * grad_w
            self.b -= self.lr * grad_b
        return self

    def predict_proba(self, X):
        X = np.asarray(X, dtype=float)
        return self._sigmoid(X @ self.w + self.b)

    def predict(self, X):
        return (self.predict_proba(X) >= 0.5).astype(int)`,
    tests: [
      { name: "reaches >= 0.9 accuracy on separable blobs", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
n = 100
c0 = rng.normal([-2, -2], 0.5, size=(n, 2))
c1 = rng.normal([2, 2], 0.5, size=(n, 2))
X = np.vstack([c0, c1])
y = np.concatenate([np.zeros(n), np.ones(n)])
clf = LogisticRegressionGD(lr=0.1, n_iters=2000).fit(X, y)
acc = (clf.predict(X) == y).mean()
assert acc >= 0.9, f"accuracy only {acc}"` },
      { name: "predict_proba stays in (0, 1) with the right shape", code: String.raw`import numpy as np
rng = np.random.default_rng(1)
X = rng.normal(size=(30, 4))
y = (X[:, 0] > 0).astype(int)
clf = LogisticRegressionGD(lr=0.1, n_iters=500).fit(X, y)
p = clf.predict_proba(X)
assert p.shape == (30,), f"shape {p.shape}"
assert p.min() >= 0.0 and p.max() <= 1.0, "probabilities out of range"` },
      { name: "predict returns only 0/1 labels", code: String.raw`import numpy as np
rng = np.random.default_rng(2)
X = rng.normal(size=(20, 3))
y = (X[:, 0] + X[:, 1] > 0).astype(int)
clf = LogisticRegressionGD(lr=0.1, n_iters=300).fit(X, y)
labels = set(np.unique(clf.predict(X)).tolist())
assert labels <= {0, 1}, f"unexpected labels {labels}"` },
      { name: "learns the correct direction", code: String.raw`import numpy as np
rng = np.random.default_rng(3)
n = 100
c0 = rng.normal([-2, -2], 0.5, size=(n, 2))
c1 = rng.normal([2, 2], 0.5, size=(n, 2))
X = np.vstack([c0, c1])
y = np.concatenate([np.zeros(n), np.ones(n)])
clf = LogisticRegressionGD(lr=0.1, n_iters=2000).fit(X, y)
hi = clf.predict_proba(np.array([[2.0, 2.0]]))[0]
lo = clf.predict_proba(np.array([[-2.0, -2.0]]))[0]
assert hi > 0.5 > lo, f"class-1 region prob {hi}, class-0 region prob {lo}"` },
      { name: "survives large-magnitude inputs without nan", code: String.raw`import numpy as np
clf = LogisticRegressionGD(lr=0.1, n_iters=50)
X = np.array([[1000.0], [-1000.0], [0.0]])
y = np.array([1.0, 0.0, 1.0])
clf.fit(X, y)
p = clf.predict_proba(X)
assert not np.any(np.isnan(p)), "sigmoid overflowed to nan — clip z before exp"` },
    ],
  };

  W.exercises["w2d3-e3"] = {
    title: "Ridge: add L2 and watch weights shrink",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "One extra term turns linear regression into ridge and tames the weights.",
    description: String.raw`Extend the linear-regression gradient with an L2 (ridge) penalty. The penalized loss is

~~~text
L(w) = (1/n) ||X w - y||^2  +  alpha * ||w||^2
~~~

so the gradient gains a ~2 * alpha * w~ term:

~~~text
grad = (2/n) X^T (X w - y)  +  2 * alpha * w
~~~

Implement ~ridge_gradient(X, y, w, alpha)~. With ~alpha = 0~ it must equal the plain MSE gradient; with ~alpha > 0~ the fitted weights shrink toward zero.

~~~python
# fitting with a larger alpha yields a smaller ||w||
w_plain = fit(alpha=0.0)
w_ridge = fit(alpha=1.0)     # np.linalg.norm(w_ridge) < np.linalg.norm(w_plain)
~~~

Interview angle: ridge is the "my model overfits, what do you do?" answer. Showing that the penalty is a single additive gradient term — and that it demonstrably shrinks weights — proves you understand regularization mechanically, not just as a buzzword.`,
    starter: String.raw`import numpy as np

def ridge_gradient(X, y, w, alpha):
    """Gradient of (1/n)||Xw - y||^2 + alpha||w||^2 wrt w."""
    # start from the MSE gradient, then add the L2 term 2*alpha*w
    raise NotImplementedError`,
    hints: [
      String.raw`The data term is unchanged: (2/n) * X.T @ (X @ w - y).`,
      String.raw`The L2 penalty alpha*||w||^2 differentiates to 2*alpha*w — just add it to the data-term gradient.`,
      String.raw`When alpha == 0 the extra term is zero, so the function collapses back to the plain MSE gradient. That is your sanity check.`,
    ],
    solution: String.raw`import numpy as np

def ridge_gradient(X, y, w, alpha):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    w = np.asarray(w, dtype=float)
    n = X.shape[0]
    data_term = (2.0 / n) * (X.T @ (X @ w - y))
    return data_term + 2.0 * alpha * w`,
    tests: [
      { name: "matches the hand-computed penalized gradient", code: String.raw`import numpy as np
X = np.array([[1.0]])
y = np.array([0.0])
w = np.array([1.0])
# data term = (2/1)*1*(1) = 2; L2 = 2*1*1 = 2; total = 4
g = ridge_gradient(X, y, w, 1.0)
assert np.allclose(g, [4.0]), f"expected [4.0], got {g}"` },
      { name: "alpha=0 reduces to the plain MSE gradient", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(size=(20, 4))
y = rng.normal(size=20)
w = rng.normal(size=4)
g0 = ridge_gradient(X, y, w, 0.0)
mse_grad = (2.0 / 20) * (X.T @ (X @ w - y))
assert np.allclose(g0, mse_grad), "alpha=0 must equal the MSE gradient"` },
      { name: "the L2 term is exactly 2*alpha*w", code: String.raw`import numpy as np
rng = np.random.default_rng(1)
X = rng.normal(size=(10, 3))
y = rng.normal(size=10)
w = rng.normal(size=3)
diff = ridge_gradient(X, y, w, 0.7) - ridge_gradient(X, y, w, 0.0)
assert np.allclose(diff, 2.0 * 0.7 * w), "penalty term is not 2*alpha*w"` },
      { name: "stronger penalty shrinks the fitted weights", code: String.raw`import numpy as np
rng = np.random.default_rng(2)
X = rng.normal(size=(100, 5))
w_true = np.array([3.0, -2.0, 1.0, 0.0, 0.5])
y = X @ w_true + rng.normal(0, 0.1, size=100)
def fit(alpha):
    w = np.zeros(5)
    for _ in range(3000):
        w = w - 0.05 * ridge_gradient(X, y, w, alpha)
    return w
w0 = fit(0.0)
w1 = fit(1.0)
assert np.linalg.norm(w1) < np.linalg.norm(w0), f"ridge should shrink weights: {np.linalg.norm(w1):.3f} vs {np.linalg.norm(w0):.3f}"` },
    ],
  };

  // ================= Day 4 =================
  W.days.push({
    id: "w2d4",
    title: "Metrics That Get You Hired",
    minutes: 122,
    blocks: [
      { type: "lesson",   id: "w2d4-lesson", minutes: 25 },
      { type: "quiz",     id: "w2d4-quiz",   minutes: 12 },
      { type: "exercise", id: "w2d4-e1",     minutes: 20 },
      { type: "exercise", id: "w2d4-e2",     minutes: 30 },
      { type: "exercise", id: "w2d4-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "classic-ml", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w2d4-lesson"] = {
    title: "Metrics That Get You Hired",
    md: String.raw`A model that is 99% accurate can be worthless, and the candidate who answers "great, ship it" just failed the round. Metrics are where interviewers separate people who train models from people who understand them. Today: the confusion matrix that every metric is built from, why accuracy lies, and how to talk about ROC-AUC like you have earned it.

### The confusion matrix: four numbers, everything else

For binary classification at a fixed threshold, every prediction falls into one of four buckets:

~~~text
                 predicted 1     predicted 0
actual 1            TP              FN
actual 0            FP              TN
~~~

TP = true positive, FP = false positive (false alarm), FN = false negative (a miss), TN = true negative. Every metric below is just arithmetic on these four counts.

### Why accuracy lies under imbalance

~accuracy = (TP + TN) / total~. Fair-sounding — until one class dominates. If 99% of records are legitimate, a fraud model that predicts "legitimate" for everyone scores 99% accuracy and catches exactly zero fraud. Accuracy rewards the majority class and hides total failure on the minority — usually the class you actually care about.

### Precision and recall, and their tug of war

- ~precision = TP / (TP + FP)~ — of everything you flagged, how much was right? *Don't cry wolf.*
- ~recall = TP / (TP + FN)~ — of all the real positives, how many did you catch? *Don't miss.*

They pull against each other. Lower the threshold and you catch more positives (recall up) while flagging more junk (precision down). A spam filter favors precision (never trash real mail); a cancer screen favors recall (never miss a case).

### F1: one number when you are forced to pick one

F1 is the **harmonic** mean of precision and recall:

~~~text
F1 = 2 * P * R / (P + R)
~~~

The harmonic mean punishes imbalance — you cannot game it by maxing one and tanking the other. F1 is high only when precision and recall are *both* decent.

### Micro versus macro averaging

For multi-class problems:

- **Macro** — compute the metric per class, then average. Every class counts equally, which protects rare classes.
- **Micro** — pool all TP/FP/FN across classes, then compute once. Every example counts equally, so frequent classes dominate.

Name the one you chose and why; the choice encodes what you value.

### ROC-AUC: the ranking interpretation that impresses

The ROC curve plots true-positive rate against false-positive rate as the threshold sweeps. AUC is the area under it, but the line to quote is the interpretation: **AUC is the probability that a randomly chosen positive is scored higher than a randomly chosen negative.** 0.5 is a coin flip, 1.0 is a perfect ranking. It is threshold-free — it measures whether your scores rank positives above negatives, independent of where you eventually cut.

### PR-AUC for rare positives

ROC-AUC can look rosy under heavy imbalance because the enormous true-negative count keeps the false-positive rate tiny no matter what. When positives are rare and precious (fraud, disease), the precision-recall curve and its area (PR-AUC, a.k.a. average precision) tell the honest story, because it ignores the easy true negatives entirely.

### Threshold selection and calibration, in a breath

AUC judges ranking, but a deployed system must decide, so you choose a threshold from the precision-recall tradeoff your problem demands (often the one that maximizes F1). Separately, **calibration** asks whether a predicted 0.8 really means 80% of such cases are positive. A model can rank perfectly (AUC 1.0) yet be badly calibrated; if you consume the outputs as probabilities, calibrate them (Platt scaling, isotonic regression).

### ⚠️ Common pitfalls

- Reporting accuracy on imbalanced data with nothing else — always pair it with precision/recall or AUC.
- Mishandling the empty case: no predicted positives makes precision a 0/0. Define it as 0, do not crash.
- Reading AUC as if it were accuracy — it is a ranking measure, not a hit rate.
- Trusting ROC-AUC when positives are under ~1% — reach for PR-AUC.
- Treating raw scores as calibrated probabilities without ever checking.

### 🎤 In interviews, they ask

- "Your model is 99% accurate on fraud data. Why am I not impressed?"
- "Define precision and recall, and give a case where you would optimize each."
- "What does ROC-AUC actually measure? Interpret 0.5 and 1.0."
- "When would you prefer PR-AUC over ROC-AUC?"
- "How do you choose a decision threshold, and what does calibration mean?"

### TL;DR

- Everything derives from the confusion matrix: TP, FP, FN, TN.
- Accuracy lies under imbalance — a do-nothing model can score 99%.
- Precision = don't cry wolf; recall = don't miss. The threshold trades them off.
- F1 is their harmonic mean, high only when both are.
- ROC-AUC = P(random positive ranked above random negative); it is threshold-free.
- Rare positives → prefer PR-AUC. Using probabilities as probabilities → check calibration.

### Go deeper

- [Google ML Crash Course: classification, ROC and AUC](https://developers.google.com/machine-learning/crash-course)
- [scikit-learn: metrics and scoring](https://scikit-learn.org/stable/modules/model_evaluation.html)
- [StatQuest — ROC/AUC and the Confusion Matrix](https://www.youtube.com/@statquest)
- [Sebastian Raschka — evaluation notes](https://sebastianraschka.com)
`,
  };

  W.quizzes["w2d4-quiz"] = [
    {
      q: String.raw`A fraud dataset is 99% legitimate. A model that labels every record "legitimate" has:`,
      options: [
        "1% accuracy, so it is obviously broken",
        "50% accuracy by definition of a binary task",
        "99% accuracy, and it catches zero fraud — accuracy hides total failure on the minority class",
        "99% accuracy, which makes it a strong model",
      ],
      answer: 2,
      explain: String.raw`Accuracy = (TP + TN) / total, and with 99% negatives the all-negative model gets 99% while its recall on fraud is 0. That is exactly why you never report accuracy alone on imbalanced data — pair it with precision, recall, or AUC.`,
    },
    {
      q: String.raw`With TP = 8, FP = 2, FN = 10, the precision and recall are:`,
      options: [
        "precision 0.8, recall about 0.44",
        "precision 0.44, recall 0.8",
        "precision 0.8, recall 0.8",
        "precision 0.44, recall 0.44",
      ],
      answer: 0,
      explain: String.raw`Precision = TP/(TP+FP) = 8/10 = 0.8. Recall = TP/(TP+FN) = 8/18 = 0.444. High precision with low recall means few false alarms but many misses — the classifier is cautious about flagging.`,
    },
    {
      q: String.raw`An ROC-AUC of 0.5 means:`,
      options: [
        "the model is perfect",
        "the model ranks a random positive above a random negative no better than chance",
        "the model is exactly 50% accurate",
        "half of the predicted probabilities are calibrated",
      ],
      answer: 1,
      explain: String.raw`AUC is the probability a random positive outscores a random negative. 0.5 is a coin flip — the scores carry no ranking signal. Note this is about ranking, not accuracy: a 0.5 AUC says nothing directly about the hit rate at any threshold.`,
    },
    {
      q: String.raw`What is F1 when precision = 1.0 and recall = 0.0?

~~~text
F1 = 2 * P * R / (P + R)
~~~`,
      options: [
        "0.5",
        "1.0",
        "0.0",
        "undefined — the program must crash",
      ],
      answer: 2,
      explain: String.raw`2 * 1.0 * 0.0 / (1.0 + 0.0) = 0/1 = 0.0. F1 collapses to zero the moment either component is zero — that is the point of the harmonic mean. (You still guard the P + R = 0 case separately to avoid a real division by zero.)`,
    },
    {
      q: String.raw`Among frequent classes you have one rare class you care about. To weight every class equally you use:`,
      options: [
        "micro averaging",
        "macro averaging",
        "raw accuracy",
        "nothing — micro and macro are the same",
      ],
      answer: 1,
      explain: String.raw`Macro averaging computes the metric per class and averages, so the rare class counts as much as any other. Micro pools all predictions and is dominated by the frequent classes, which would bury the rare class you actually care about.`,
    },
    {
      q: String.raw`Positives make up 0.5% of your data. Which is the more honest summary metric?`,
      options: [
        "ROC-AUC, always",
        "raw accuracy",
        "recall alone",
        "PR-AUC / average precision, because it ignores the easy true negatives",
      ],
      answer: 3,
      explain: String.raw`With 99.5% negatives, ROC-AUC stays flattering because the false-positive rate barely moves against that huge denominator. The precision-recall curve focuses on the positive class and exposes how many of your alarms are actually correct.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
y_true = np.array([1, 1, 0, 0, 1])
y_pred = np.array([1, 0, 0, 1, 1])
tp = np.sum((y_pred == 1) & (y_true == 1))
fp = np.sum((y_pred == 1) & (y_true == 0))
print(tp, fp)
~~~`,
      options: ["2 1", "3 0", "2 2", "1 1"],
      answer: 0,
      explain: String.raw`Walk the pairs (pred, true): (1,1) TP, (0,1) FN, (0,0) TN, (1,0) FP, (1,1) TP. So TP = 2 and FP = 1. Building the confusion counts by hand like this is exactly the code-reading interviewers use to check you understand the definitions.`,
    },
  ];

  W.exercises["w2d4-e1"] = {
    title: "Precision, recall, F1 (with zero-guards)",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: ["numpy"],
    brief: "The three metrics from raw labels — and no division-by-zero crashes.",
    description: String.raw`Implement ~precision_recall_f1(y_true, y_pred)~ for binary labels (0/1). Return the tuple ~(precision, recall, f1)~ as floats.

Definitions, all from the confusion matrix:

~~~text
precision = TP / (TP + FP)
recall    = TP / (TP + FN)
F1        = 2 * P * R / (P + R)
~~~

Rules:

- If a denominator is zero (no predicted positives, no actual positives, or ~P + R == 0~), return **0.0** for that quantity instead of crashing or returning ~nan~.

~~~python
precision_recall_f1([1, 1, 0, 0], [1, 0, 1, 0])
# TP=1, FP=1, FN=1 -> (0.5, 0.5, 0.5)

precision_recall_f1([1, 1, 0], [0, 0, 0])
# nothing predicted positive -> (0.0, 0.0, 0.0), not a crash
~~~

Interview angle: these three lines show up in almost every ML take-home. The signal is the zero-division discipline — sloppy code ships ~nan~ to a dashboard the first time a batch has no positives.`,
    starter: String.raw`import numpy as np

def precision_recall_f1(y_true, y_pred):
    """Return (precision, recall, f1) as floats; zero denominators -> 0.0."""
    # count TP, FP, FN with boolean masks, then guard each division
    raise NotImplementedError`,
    hints: [
      String.raw`Convert to arrays, then TP = np.sum((y_pred == 1) & (y_true == 1)); FP and FN follow the same pattern.`,
      String.raw`Guard every division with a conditional: precision = TP/(TP+FP) if (TP+FP) > 0 else 0.0.`,
      String.raw`F1 has its own guard: only divide when precision + recall > 0, otherwise return 0.0.`,
    ],
    solution: String.raw`import numpy as np

def precision_recall_f1(y_true, y_pred):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    tp = int(np.sum((y_pred == 1) & (y_true == 1)))
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return precision, recall, f1`,
    tests: [
      { name: "known mixed case", code: String.raw`p, r, f = precision_recall_f1([1, 1, 0, 0], [1, 0, 1, 0])
assert abs(p - 0.5) < 1e-9 and abs(r - 0.5) < 1e-9 and abs(f - 0.5) < 1e-9, f"got {(p, r, f)}"` },
      { name: "perfect prediction gives all ones", code: String.raw`p, r, f = precision_recall_f1([1, 0, 1, 1], [1, 0, 1, 1])
assert (p, r, f) == (1.0, 1.0, 1.0), f"got {(p, r, f)}"` },
      { name: "no predicted positives -> zeros, not nan", code: String.raw`import math
p, r, f = precision_recall_f1([1, 1, 0], [0, 0, 0])
assert (p, r, f) == (0.0, 0.0, 0.0), f"got {(p, r, f)}"
assert not any(math.isnan(v) for v in (p, r, f)), "produced nan"` },
      { name: "no actual positives -> recall and f1 are zero", code: String.raw`p, r, f = precision_recall_f1([0, 0, 0], [1, 0, 0])
assert r == 0.0 and f == 0.0, f"recall/f1 should be 0 when there are no positives, got {(p, r, f)}"` },
      { name: "high precision, low recall computes correctly", code: String.raw`# TP=8, FP=2, FN=10
y_true = [1] * 18 + [0] * 2
y_pred = [1] * 8 + [0] * 10 + [1] * 2
p, r, f = precision_recall_f1(y_true, y_pred)
assert abs(p - 0.8) < 1e-9, f"precision {p}"
assert abs(r - 8 / 18) < 1e-9, f"recall {r}"` },
    ],
  };

  W.exercises["w2d4-e2"] = {
    title: "ROC-AUC via the rank formula",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: ["numpy"],
    brief: "Mann-Whitney AUC with correct average-rank tie handling.",
    description: String.raw`Implement ~roc_auc(y_true, scores)~ using the rank (Mann-Whitney) identity rather than sweeping thresholds:

~~~text
AUC = (sum_of_ranks_of_positives - n_pos*(n_pos+1)/2) / (n_pos * n_neg)
~~~

where ranks are 1-based over all scores. **Ties must get average ranks** — every element in a group of equal scores receives the mean of the ranks that group spans. This is what makes a set of all-equal scores return exactly 0.5.

- If either class is missing (~n_pos == 0~ or ~n_neg == 0~), AUC is undefined; return ~0.5~.

~~~python
roc_auc([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9])   # 1.0  (positives rank highest)
roc_auc([1, 1, 0, 0], [0.1, 0.2, 0.8, 0.9])   # 0.0  (positives rank lowest)
roc_auc([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5])   # 0.5  (all tied)
~~~

Interview angle: computing AUC from ranks (instead of integrating the curve) is the trick that shows you know the concordance interpretation. The tie handling is the detail that trips people up — and exactly what a sharp interviewer will test.`,
    starter: String.raw`import numpy as np

def roc_auc(y_true, scores):
    """AUC via the rank/Mann-Whitney formula with average ranks for ties."""
    # 1) assign average ranks to scores  2) apply the closed-form AUC identity
    raise NotImplementedError`,
    hints: [
      String.raw`Sort scores, assign 1-based ranks, then for each group of equal scores overwrite their ranks with the group's average rank.`,
      String.raw`With positions i..j (0-based) sharing a score, the average 1-based rank is (i + j) / 2 + 1.`,
      String.raw`AUC = (sum(ranks[y == 1]) - n_pos*(n_pos+1)/2) / (n_pos * n_neg). Guard the case where one class is absent by returning 0.5.`,
    ],
    solution: String.raw`import numpy as np

def _rankdata_average(a):
    a = np.asarray(a, dtype=float)
    n = len(a)
    order = np.argsort(a, kind="mergesort")
    sorted_a = a[order]
    ranks = np.empty(n, dtype=float)
    i = 0
    while i < n:
        j = i
        while j + 1 < n and sorted_a[j + 1] == sorted_a[i]:
            j += 1
        avg_rank = (i + j) / 2.0 + 1.0   # mean of 1-based ranks i+1..j+1
        ranks[order[i:j + 1]] = avg_rank
        i = j + 1
    return ranks

def roc_auc(y_true, scores):
    y_true = np.asarray(y_true)
    scores = np.asarray(scores, dtype=float)
    n_pos = int(np.sum(y_true == 1))
    n_neg = int(np.sum(y_true == 0))
    if n_pos == 0 or n_neg == 0:
        return 0.5
    ranks = _rankdata_average(scores)
    sum_pos = float(np.sum(ranks[y_true == 1]))
    return (sum_pos - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg)`,
    tests: [
      { name: "perfect ranking gives 1.0", code: String.raw`import numpy as np
assert abs(roc_auc([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9]) - 1.0) < 1e-9` },
      { name: "reversed ranking gives 0.0", code: String.raw`import numpy as np
assert abs(roc_auc([1, 1, 0, 0], [0.1, 0.2, 0.8, 0.9]) - 0.0) < 1e-9` },
      { name: "all-tied scores give exactly 0.5", code: String.raw`import numpy as np
assert abs(roc_auc([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5]) - 0.5) < 1e-9` },
      { name: "matches brute-force concordance with ties", code: String.raw`import numpy as np
def brute(y, s):
    y = np.asarray(y); s = np.asarray(s, dtype=float)
    pos = s[y == 1]; neg = s[y == 0]
    total = 0.0
    for p in pos:
        for q in neg:
            total += 1.0 if p > q else (0.5 if p == q else 0.0)
    return total / (len(pos) * len(neg))
rng = np.random.default_rng(2)
s = rng.integers(0, 5, size=40).astype(float)   # lots of ties
y = rng.integers(0, 2, size=40)
y[0] = 0; y[1] = 1                               # guarantee both classes
assert abs(roc_auc(y, s) - brute(y, s)) < 1e-9, f"{roc_auc(y, s)} vs {brute(y, s)}"` },
      { name: "single class returns the 0.5 convention", code: String.raw`import numpy as np
assert roc_auc([1, 1, 1], [0.1, 0.2, 0.3]) == 0.5
assert roc_auc([0, 0, 0], [0.1, 0.2, 0.3]) == 0.5` },
    ],
  };

  W.exercises["w2d4-e3"] = {
    title: "Best F1 threshold",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "Sweep every candidate cutoff and return the one that maximizes F1.",
    description: String.raw`A classifier gives you continuous ~scores~; you need a cutoff. Implement ~best_threshold(y_true, scores)~ that returns ~(threshold, f1)~ — the threshold that **maximizes F1** and the F1 it achieves.

Rules:

- Predict positive when ~score >= threshold~.
- Only the **unique score values** are candidate thresholds.
- If several thresholds tie on F1, return the smallest one.

~~~python
best_threshold([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9])
# (0.8, 1.0)  — cutting at 0.8 selects exactly the positives
~~~

Interview angle: AUC picks a model; this picks the operating point. It ties the whole day together — the confusion matrix, F1, and the threshold-versus-ranking distinction — into a concrete loop you can write on demand.`,
    starter: String.raw`import numpy as np

def best_threshold(y_true, scores):
    """Return (threshold, f1) maximizing F1 over unique score cutoffs (score >= t)."""
    # for each unique score t: predict score >= t, compute F1, track the best
    raise NotImplementedError`,
    hints: [
      String.raw`Candidate thresholds are np.unique(scores) — iterate them in ascending order so the first max you keep is the smallest tie.`,
      String.raw`For each t, pred = (scores >= t); compute TP/FP/FN and then F1 with the usual zero-guards.`,
      String.raw`Track best_f1 and best_t, updating only when f1 is strictly greater (so ties keep the earlier, smaller threshold).`,
    ],
    solution: String.raw`import numpy as np

def best_threshold(y_true, scores):
    y_true = np.asarray(y_true)
    scores = np.asarray(scores, dtype=float)
    best_t = float(np.min(scores))
    best_f1 = -1.0
    for t in np.unique(scores):
        pred = (scores >= t).astype(int)
        tp = int(np.sum((pred == 1) & (y_true == 1)))
        fp = int(np.sum((pred == 1) & (y_true == 0)))
        fn = int(np.sum((pred == 0) & (y_true == 1)))
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        if f1 > best_f1:
            best_f1 = f1
            best_t = float(t)
    return best_t, best_f1`,
    tests: [
      { name: "separable scores -> threshold 0.8 with F1 = 1.0", code: String.raw`import numpy as np
t, f = best_threshold([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9])
assert abs(f - 1.0) < 1e-9, f"f1 {f}"
assert abs(t - 0.8) < 1e-9, f"threshold {t}"` },
      { name: "returned F1 recomputes consistently at the threshold", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
scores = rng.random(60)
y = (scores + rng.normal(0, 0.1, 60) > 0.5).astype(int)
t, f = best_threshold(y, scores)
pred = (scores >= t).astype(int)
tp = int(np.sum((pred == 1) & (y == 1)))
fp = int(np.sum((pred == 1) & (y == 0)))
fn = int(np.sum((pred == 0) & (y == 1)))
p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
r = tp / (tp + fn) if (tp + fn) > 0 else 0.0
f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0.0
assert abs(f - f1) < 1e-9, f"returned {f} but threshold gives {f1}"` },
      { name: "returned F1 is the maximum over all unique thresholds", code: String.raw`import numpy as np
rng = np.random.default_rng(1)
scores = rng.random(60)
y = (scores + rng.normal(0, 0.1, 60) > 0.5).astype(int)
t, f = best_threshold(y, scores)
best = 0.0
for th in np.unique(scores):
    pred = (scores >= th).astype(int)
    tp = int(np.sum((pred == 1) & (y == 1)))
    fp = int(np.sum((pred == 1) & (y == 0)))
    fn = int(np.sum((pred == 0) & (y == 1)))
    p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    r = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0.0
    best = max(best, f1)
assert abs(f - best) < 1e-9, f"returned {f}, true max {best}"` },
      { name: "ties on F1 return the smallest threshold", code: String.raw`import numpy as np
# every threshold that keeps both positives gives F1 = 1.0; smallest is 0.3
t, f = best_threshold([0, 1, 1], [0.1, 0.3, 0.9])
assert abs(f - 1.0) < 1e-9, f"f1 {f}"
assert abs(t - 0.3) < 1e-9, f"expected smallest tying threshold 0.3, got {t}"` },
    ],
  };

  // ================= Day 5 =================
  W.days.push({
    id: "w2d5",
    title: "Trees, Ensembles & Friends",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w2d5-lesson", minutes: 25 },
      { type: "quiz",     id: "w2d5-quiz",   minutes: 12 },
      { type: "exercise", id: "w2d5-e1",     minutes: 25 },
      { type: "exercise", id: "w2d5-e2",     minutes: 30 },
      { type: "exercise", id: "w2d5-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "classic-ml", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w2d5-lesson"] = {
    title: "Trees, Ensembles & Friends",
    md: String.raw`When an interviewer asks what you would actually try on tabular data, the honest answer is almost never a neural net — it is gradient-boosted trees. This day is the classic-ML zoo: how a tree splits, why one tree overfits but a forest does not, what boosting really does, and the two unsupervised staples (kNN and k-means) that round out the toolkit.

### A decision tree splits greedily on impurity

A tree asks yes/no questions to carve the feature space into pure regions. At each node it tries every feature and threshold and keeps the split that most reduces impurity. Two impurity measures dominate:

- **Gini**: ~1 - sum_k p_k^2~ — the chance two random draws from the node disagree.
- **Entropy**: ~-sum_k p_k log p_k~ — bits of surprise.

Both are 0 for a pure node and maximal for an even mix, and they usually pick nearly identical splits; Gini is a touch cheaper because it skips the logs.

~~~text
gini(node) = 1 - sum_k p_k^2       # p_k = fraction of class k in the node
~~~

The catch: grown without limits, a tree splits until every leaf holds a single sample — perfectly memorizing the training set. Deep trees are the poster child for **high variance**, which you rein in with ~max_depth~, ~min_samples_leaf~, and friends.

### Bagging and random forests kill the variance

**Bagging** (bootstrap aggregating) trains many trees on random resamples drawn with replacement and averages their votes. Averaging independent noisy models slashes variance without adding bias. A **random forest** adds one twist — at each split it considers only a random subset of features, which de-correlates the trees so the averaging helps even more. Bonus: the roughly one-third of samples a given tree never saw (out-of-bag) provide a free validation estimate.

### Boosting fits the mistakes

**Boosting** builds trees sequentially, each new one correcting the errors of the ensemble so far. In gradient boosting each tree fits the residual — the negative gradient of the loss — of what came before. This drives **bias** down and is astonishingly strong on tabular data. The names to say: XGBoost, LightGBM, CatBoost. The knobs that matter:

- ~n_estimators~ — how many trees;
- ~learning_rate~ — shrinkage per tree (smaller needs more trees);
- ~max_depth~ — tree size / interaction order;
- ~subsample~ and ~colsample~ — row/feature sampling for regularization.

"Lower the learning rate, add more trees, use early stopping" is the standard tuning story. Remember the contrast: **bagging reduces variance** (parallel, independent trees); **boosting reduces bias** (sequential, dependent trees).

### kNN: lazy and honest

k-nearest-neighbors stores the training set and, to predict, finds the ~k~ closest points and takes a majority vote (or a mean, for regression). There is no training — all the work happens at query time. It is a strong baseline, but the **curse of dimensionality** wrecks it: in high dimensions distances concentrate, so every point is roughly equidistant and "nearest" stops meaning anything. Always scale features first — distance-based methods are scale-sensitive.

### k-means: cluster by nearest centroid

k-means is unsupervised: partition points into ~k~ clusters to minimize within-cluster squared distance. Lloyd's algorithm alternates two steps — assign each point to its nearest centroid, then move each centroid to the mean of its cluster — and repeats to convergence. Two gotchas: it is sensitive to **initialization** (unlucky seeds land in a bad local optimum, which k-means++ mitigates by spreading initial centers out), and you must **choose k** (the elbow of inertia, or the silhouette score). It quietly assumes roughly spherical, similar-sized clusters.

### When linear beats trees, and importance caveats

Reach for linear or logistic regression when the relationship is roughly linear, the data is wide and sparse (text), you need calibrated probabilities or interpretable coefficients, or examples are scarce. Reach for trees and boosting when there are non-linear feature interactions and enough data to learn them. And treat tree "feature importance" with suspicion — impurity-based importance is biased toward high-cardinality features; prefer permutation importance or SHAP when the answer actually matters.

### ⚠️ Common pitfalls

- Letting a single tree grow unbounded, then acting surprised that it overfits.
- Claiming bagging and boosting both "reduce variance" — bagging cuts variance, boosting cuts bias.
- Running kNN or k-means on unscaled features, so one wide-range feature hijacks the distance.
- Trusting default impurity-based feature importances as if they were ground truth.
- Forgetting that k-means needs ~k~ up front and can settle into a bad local optimum from unlucky init.

### 🎤 In interviews, they ask

- "How does a decision tree choose a split, and what is Gini impurity?"
- "Why does a random forest generalize better than one deep tree?"
- "Bagging versus boosting — what does each reduce, and how do they differ structurally?"
- "What are the main XGBoost hyperparameters and how do they interact?"
- "Explain the curse of dimensionality for kNN. How does k-means work, and how do you pick k?"

### TL;DR

- Trees split greedily to cut impurity (Gini = ~1 - sum p_k^2~); unbounded trees overfit.
- Bagging / random forests average de-correlated trees to cut variance (OOB = free validation).
- Boosting fits residuals sequentially to cut bias; XGBoost/LightGBM rule tabular data.
- kNN is lazy and scale-sensitive; high dimensions break the meaning of "nearest."
- k-means minimizes within-cluster distance; sensitive to init (k-means++) and needs ~k~.
- Linear wins on linear/sparse/scarce/interpretable; trees win on non-linear interactions with data.

### Go deeper

- [scikit-learn: decision trees](https://scikit-learn.org/stable/modules/tree.html)
- [scikit-learn: ensembles — forests and boosting](https://scikit-learn.org/stable/modules/ensemble.html)
- [StatQuest — trees, forests, boosting, k-means](https://www.youtube.com/@statquest)
- [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course)
`,
  };

  W.quizzes["w2d5-quiz"] = [
    {
      q: String.raw`What is the Gini impurity of a node whose labels are ~[0, 0, 1, 1]~?

~~~text
gini = 1 - sum_k p_k^2
~~~`,
      options: ["0.5", "0.25", "0.0", "1.0"],
      answer: 0,
      explain: String.raw`Each class is half the node, so p_0 = p_1 = 0.5 and gini = 1 - (0.25 + 0.25) = 0.5. That is the maximum impurity for two classes — a perfectly even mix. A pure node ([0, 0, 0, 0]) would score 0.`,
    },
    {
      q: String.raw`Bagging (random forests) primarily reduces ______, while boosting primarily reduces ______.`,
      options: [
        "bias; variance",
        "variance; bias",
        "variance; variance",
        "bias; bias",
      ],
      answer: 1,
      explain: String.raw`Bagging averages many independent high-variance trees, which cancels their noise and lowers variance. Boosting adds trees sequentially that each fix the ensemble's current errors, steadily lowering bias. Confusing these two is one of the most common interview slips.`,
    },
    {
      q: String.raw`In gradient boosting, each new tree is trained to:`,
      options: [
        "predict the target from scratch, ignoring the earlier trees",
        "vote independently and then get averaged with the rest",
        "use only a random subset of the features",
        "fit the residual errors (the negative gradient) left by the ensemble so far",
      ],
      answer: 3,
      explain: String.raw`Boosting is sequential: the ensemble makes a prediction, you measure what it still gets wrong (the residual / negative gradient), and the next tree is fit to that. Summing these corrections drives the bias down — unlike bagging, where trees are independent and averaged.`,
    },
    {
      q: String.raw`Why does kNN degrade badly in very high dimensions?`,
      options: [
        "It runs out of memory storing the training set",
        "The majority vote always ends in a tie",
        "Distances concentrate, so all points look roughly equidistant and 'nearest' loses meaning",
        "It can only handle two features at a time",
      ],
      answer: 2,
      explain: String.raw`The curse of dimensionality: as dimensions grow, the gap between the nearest and farthest neighbor shrinks relative to the average distance, so every point is about equally far. The 'neighborhood' that kNN relies on stops being informative.`,
    },
    {
      q: String.raw`k-means can converge to a poor clustering because:`,
      options: [
        "it always finds the global optimum",
        "it requires labeled data to run",
        "it cannot handle more than three clusters",
        "it is sensitive to initialization and can settle in a bad local optimum; k-means++ helps",
      ],
      answer: 3,
      explain: String.raw`Lloyd's algorithm only guarantees convergence to a local optimum, and a bad random seeding can trap it there. k-means++ spreads the initial centroids apart to make a good solution far more likely, and running several inits and keeping the lowest inertia is standard practice.`,
    },
    {
      q: String.raw`Candidate split thresholds are the midpoints of sorted ~x~. For ~x = [1, 2, 3, 4]~ with ~y = [0, 0, 1, 1]~, which midpoint splits the classes perfectly?`,
      options: ["1.5", "2.5", "3.5", "No single split is perfect"],
      answer: 1,
      explain: String.raw`Cutting at 2.5 sends {1, 2} (labels [0, 0]) left and {3, 4} (labels [1, 1]) right — both children are pure, so the weighted Gini is 0. The midpoints 1.5 and 3.5 leave one child mixed and therefore score worse.`,
    },
    {
      q: String.raw`Compared with a single unpruned decision tree, a random forest of many trees usually:`,
      options: [
        "generalizes better by averaging de-correlated trees to reduce variance",
        "overfits more because it has more parameters overall",
        "is always less accurate but runs faster",
        "cannot be used for classification at all",
      ],
      answer: 0,
      explain: String.raw`A lone deep tree is low-bias but high-variance — it memorizes noise. Averaging many trees trained on bootstrap samples with random feature subsets cancels much of that variance, so the forest generalizes better despite having far more total parameters.`,
    },
  ];

  W.exercises["w2d5-e1"] = {
    title: "Gini impurity and the best 1D split",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "The greedy heart of a decision tree: score purity, scan midpoints.",
    description: String.raw`Implement the two operations a decision tree repeats millions of times.

- ~gini_impurity(labels)~ — return ~1 - sum_k p_k^2~ where ~p_k~ is the fraction of class ~k~. An empty node has impurity ~0.0~.
- ~best_split_1d(x, y)~ — over the midpoints between consecutive **sorted unique** values of ~x~, find the threshold ~t~ that minimizes the size-weighted child impurity ~(n_left * gini_left + n_right * gini_right) / n~, splitting as ~x <= t~ (left) versus ~x > t~ (right). Return ~(threshold, weighted_gini)~. If there is no valid split (fewer than two unique ~x~ values), return ~(None, float("inf"))~.

~~~python
gini_impurity([0, 0, 1, 1])                      # 0.5  (evenly mixed)
best_split_1d([1.0, 2.0, 3.0, 4.0], [0, 0, 1, 1])
# (2.5, 0.0)  — the midpoint between 2 and 3 separates the classes perfectly
~~~

Interview angle: "how does a tree decide where to split?" is answered by exactly this code. Writing the weighted-impurity scan from scratch proves you understand the greedy criterion instead of hand-waving "it picks the best feature."`,
    starter: String.raw`import numpy as np

def gini_impurity(labels):
    """1 - sum_k p_k^2; empty -> 0.0."""
    raise NotImplementedError

def best_split_1d(x, y):
    """Return (threshold, weighted_gini) minimizing weighted child impurity.
    Split is x <= t (left) vs x > t (right). No valid split -> (None, inf)."""
    raise NotImplementedError`,
    hints: [
      String.raw`gini: np.unique(labels, return_counts=True) gives the class counts; p = counts / counts.sum(); return 1 - (p**2).sum(). Handle len 0 first.`,
      String.raw`Candidate thresholds are midpoints of np.unique(x): for consecutive uniques a, b use t = (a + b) / 2.`,
      String.raw`For each t, split y with boolean masks x <= t and x > t, compute the weighted impurity, and keep the smallest — updating only on a strict improvement so ties keep the lower threshold.`,
    ],
    solution: String.raw`import numpy as np

def gini_impurity(labels):
    labels = np.asarray(labels)
    if labels.size == 0:
        return 0.0
    _, counts = np.unique(labels, return_counts=True)
    p = counts / counts.sum()
    return float(1.0 - np.sum(p ** 2))

def best_split_1d(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y)
    n = y.shape[0]
    uniq = np.unique(x)
    best_t = None
    best_score = float("inf")
    for a, b in zip(uniq[:-1], uniq[1:]):
        t = (a + b) / 2.0
        left = y[x <= t]
        right = y[x > t]
        score = (left.size * gini_impurity(left) + right.size * gini_impurity(right)) / n
        if score < best_score:
            best_score = score
            best_t = t
    return best_t, best_score`,
    tests: [
      { name: "gini: pure, even, and four-way nodes", code: String.raw`assert abs(gini_impurity([0, 0, 0, 0]) - 0.0) < 1e-12, "pure node should be 0"
assert abs(gini_impurity([0, 0, 1, 1]) - 0.5) < 1e-12, "even 2-class mix should be 0.5"
assert abs(gini_impurity([0, 1, 2, 3]) - 0.75) < 1e-12, "four equal classes -> 0.75"` },
      { name: "gini of an empty node is 0.0", code: String.raw`assert gini_impurity([]) == 0.0, "empty node must be 0.0, not nan"` },
      { name: "finds the perfect separating midpoint", code: String.raw`import numpy as np
t, score = best_split_1d([1.0, 2.0, 3.0, 4.0], [0, 0, 1, 1])
assert abs(t - 2.5) < 1e-9, f"threshold {t}"
assert abs(score - 0.0) < 1e-9, f"a perfect split has weighted gini 0, got {score}"` },
      { name: "ties on impurity keep the smaller threshold", code: String.raw`import numpy as np
# x=[1,2,3], y=[0,1,0]: t=1.5 and t=2.5 both score 1/3; keep 1.5
t, score = best_split_1d([1.0, 2.0, 3.0], [0, 1, 0])
assert abs(t - 1.5) < 1e-9, f"expected 1.5, got {t}"
assert abs(score - 1.0 / 3.0) < 1e-9, f"weighted gini {score}"` },
      { name: "no split possible when all x are equal", code: String.raw`t, score = best_split_1d([2.0, 2.0, 2.0], [0, 1, 0])
assert t is None, f"expected None threshold, got {t}"
assert score == float("inf"), f"expected inf, got {score}"` },
    ],
  };

  W.exercises["w2d5-e2"] = {
    title: "k-means from scratch",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: ["numpy"],
    brief: "Lloyd's algorithm with deterministic, seeded initialization.",
    description: String.raw`Implement ~kmeans(X, k, n_iters=100, seed=0)~ returning ~(centroids, labels)~.

- **Init deterministically**: shuffle the rows with ~np.random.default_rng(seed)~ and take the first ~k~ as the initial centroids.
- **Assign**: label each point by its nearest centroid (euclidean).
- **Update**: move each centroid to the mean of the points assigned to it; if a cluster is empty, leave its centroid where it is.
- Repeat until labels stop changing or ~n_iters~ is reached. Return ~centroids~ of shape ~(k, d)~ and integer ~labels~ of shape ~(n,)~.

~~~python
centroids, labels = kmeans(X, k=3, n_iters=100, seed=1)
# labels[i] is the cluster index (0..k-1) of row i
~~~

Interview angle: k-means is the go-to clustering question, and the details are the test — deterministic init for reproducibility, the assign/update alternation, and handling an empty cluster without dividing by zero.`,
    starter: String.raw`import numpy as np

def kmeans(X, k, n_iters=100, seed=0):
    """Return (centroids, labels). Init = first k rows after a seeded shuffle."""
    # 1) seeded init  2) loop: assign to nearest centroid, then recompute centroids
    raise NotImplementedError`,
    hints: [
      String.raw`Init: perm = np.random.default_rng(seed).permutation(n); centroids = X[perm[:k]].copy().`,
      String.raw`Assign: distances of shape (n, k) via broadcasting ((X[:, None, :] - centroids[None, :, :])**2).sum(axis=2), then np.argmin(axis=1).`,
      String.raw`Update: for each j, if any point has label j set centroid j to X[labels == j].mean(axis=0), else keep it. Break early when labels stop changing.`,
    ],
    solution: String.raw`import numpy as np

def kmeans(X, k, n_iters=100, seed=0):
    X = np.asarray(X, dtype=float)
    n = X.shape[0]
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    centroids = X[perm[:k]].copy()
    labels = np.full(n, -1)
    for _ in range(n_iters):
        dists = np.sqrt(((X[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2))
        new_labels = np.argmin(dists, axis=1)
        new_centroids = np.array([
            X[new_labels == j].mean(axis=0) if np.any(new_labels == j) else centroids[j]
            for j in range(k)
        ])
        if np.array_equal(new_labels, labels):
            centroids = new_centroids
            labels = new_labels
            break
        centroids = new_centroids
        labels = new_labels
    return centroids, labels`,
    tests: [
      { name: "recovers three well-separated blobs (high purity)", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
centers = np.array([[0.0, 0.0], [10.0, 10.0], [0.0, 10.0]])
parts, true = [], []
for i, c in enumerate(centers):
    parts.append(rng.normal(c, 0.5, size=(30, 2)))
    true.extend([i] * 30)
X = np.vstack(parts)
true = np.array(true)
centroids, labels = kmeans(X, 3, n_iters=100, seed=1)
assert centroids.shape == (3, 2), f"centroids shape {centroids.shape}"
assert labels.shape == (90,), f"labels shape {labels.shape}"
purity = sum(np.bincount(true[labels == j], minlength=3).max()
             for j in range(3) if np.any(labels == j)) / 90
assert purity >= 0.95, f"cluster purity only {purity}"` },
      { name: "every centroid lands near a true center", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
centers = np.array([[0.0, 0.0], [10.0, 10.0], [0.0, 10.0]])
X = np.vstack([rng.normal(c, 0.5, size=(30, 2)) for c in centers])
centroids, _ = kmeans(X, 3, n_iters=100, seed=1)
for c in centers:
    nearest = np.sqrt(((centroids - c) ** 2).sum(axis=1)).min()
    assert nearest < 1.0, f"no centroid near {c}, closest is {nearest}"` },
      { name: "labels are valid cluster indices", code: String.raw`import numpy as np
rng = np.random.default_rng(4)
X = rng.normal(size=(50, 3))
_, labels = kmeans(X, 4, n_iters=50, seed=2)
assert set(np.unique(labels).tolist()) <= {0, 1, 2, 3}, f"bad labels {np.unique(labels)}"` },
      { name: "deterministic for a fixed seed", code: String.raw`import numpy as np
rng = np.random.default_rng(7)
X = rng.normal(size=(60, 2))
c1, l1 = kmeans(X, 3, n_iters=50, seed=5)
c2, l2 = kmeans(X, 3, n_iters=50, seed=5)
assert np.array_equal(l1, l2) and np.allclose(c1, c2), "same seed must give the same result"` },
    ],
  };

  W.exercises["w2d5-e3"] = {
    title: "k-nearest-neighbors prediction",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: ["numpy"],
    brief: "Majority vote over the k closest points, with a deterministic tie-break.",
    description: String.raw`Implement ~knn_predict(X_train, y_train, X_query, k)~. For each row of ~X_query~, find the ~k~ nearest rows of ~X_train~ (euclidean) and return the majority label. Return a numpy array of predictions, one per query row.

Rules:

- Ties in the vote go to the **smallest label**.
- No training step — compute distances at query time.

~~~python
X_train = [[0.0], [1.0], [2.0], [10.0], [11.0], [12.0]]
y_train = [0, 0, 0, 1, 1, 1]
knn_predict(X_train, y_train, [[1.5], [10.5]], k=3)   # [0, 1]
~~~

Interview angle: kNN is the "simplest possible classifier" question, and the tie-break is the wrinkle. A deterministic rule (smallest label wins) means your predictions do not silently depend on array order.`,
    starter: String.raw`import numpy as np

def knn_predict(X_train, y_train, X_query, k):
    """Majority vote of the k nearest neighbors; ties -> smallest label."""
    # for each query point: distances to all train points, take k smallest, vote
    raise NotImplementedError`,
    hints: [
      String.raw`For a query point q, distances = np.sqrt(((X_train - q)**2).sum(axis=1)).`,
      String.raw`np.argsort(distances)[:k] gives the indices of the k nearest; y_train at those indices are the votes.`,
      String.raw`np.unique(votes, return_counts=True) returns labels already sorted ascending; np.argmax on the counts picks the most common and, on a tie, the first — i.e. the smallest label.`,
    ],
    solution: String.raw`import numpy as np

def knn_predict(X_train, y_train, X_query, k):
    X_train = np.asarray(X_train, dtype=float)
    y_train = np.asarray(y_train)
    X_query = np.asarray(X_query, dtype=float)
    preds = []
    for q in X_query:
        dist = np.sqrt(((X_train - q) ** 2).sum(axis=1))
        nn = np.argsort(dist, kind="mergesort")[:k]
        vals, counts = np.unique(y_train[nn], return_counts=True)
        preds.append(vals[np.argmax(counts)])
    return np.array(preds)`,
    tests: [
      { name: "classifies points near each cluster", code: String.raw`import numpy as np
X_train = [[0.0], [1.0], [2.0], [10.0], [11.0], [12.0]]
y_train = [0, 0, 0, 1, 1, 1]
pred = knn_predict(X_train, y_train, [[1.5], [10.5]], k=3)
assert list(pred) == [0, 1], f"got {list(pred)}"` },
      { name: "k=1 returns the single nearest label", code: String.raw`import numpy as np
X_train = [[0.0], [1.0], [2.0], [3.0]]
y_train = [0, 0, 1, 1]
pred = knn_predict(X_train, y_train, [[0.1], [2.9]], k=1)
assert list(pred) == [0, 1], f"got {list(pred)}"` },
      { name: "vote ties go to the smallest label", code: String.raw`import numpy as np
X_train = [[0.0], [1.0], [2.0], [3.0]]
y_train = [0, 0, 1, 1]
# query 1.5 with k=2: neighbors are 1.0 (label 0) and 2.0 (label 1) -> tie -> 0
pred = knn_predict(X_train, y_train, [[1.5]], k=2)
assert pred[0] == 0, f"tie should resolve to smallest label 0, got {pred[0]}"` },
      { name: "handles multiple query rows at once", code: String.raw`import numpy as np
rng = np.random.default_rng(0)
Xtr = np.vstack([rng.normal(-5, 0.5, size=(20, 2)), rng.normal(5, 0.5, size=(20, 2))])
ytr = np.array([0] * 20 + [1] * 20)
Xq = np.array([[-5.0, -5.0], [5.0, 5.0], [-4.5, -5.2]])
pred = knn_predict(Xtr, ytr, Xq, k=5)
assert list(pred) == [0, 1, 0], f"got {list(pred)}"` },
    ],
  };

  // ================= Day 6 =================
  W.days.push({
    id: "w2d6",
    title: "Own the Pipeline",
    minutes: 130,
    blocks: [
      { type: "lesson",   id: "w2d6-lesson", minutes: 15 },
      { type: "quiz",     id: "w2d6-quiz",   minutes: 10 },
      { type: "homework", id: "w2-hw",       minutes: 70 },
      { type: "boss",     id: "w2-boss",     minutes: 35 },
    ],
  });

  W.lessons["w2d6-lesson"] = {
    title: "Own the Pipeline",
    md: String.raw`Weeks of theory hand you the parts; this day is the assembly line. Interviewers rarely test whether you can call ~.fit()~ — they test whether you can run a project end to end without leaking, and then *talk* about the decisions like an engineer who owns the outcome. Those two skills close loops.

### The end-to-end checklist

A pipeline is an ordered ritual. Reorder two steps or skip one and you either leak or ship garbage:

~~~text
1. Frame it        -> what are we predicting, and what metric decides success?
2. Baseline first  -> majority class / simple mean; you must beat this
3. Split           -> train / val / test BEFORE you touch the data
4. Explore (train) -> distributions, missingness, leakage suspects
5. Preprocess      -> FIT transforms on train, APPLY to val/test
6. Model           -> simple first, then complex; CV on train
7. Tune            -> search hyperparameters against val, never test
8. Evaluate        -> open the test set ONCE, report the framed metric
9. Error-analyze   -> where does it fail, and does that failure matter?
~~~

The load-bearing rule lives in steps 3 and 5: every statistic a transform needs — a mean, a std, a vocabulary, a category list — is learned from **train only**, then applied outward. The test set is a sealed envelope you open exactly once.

### A model-selection cheat-sheet

"What would you try first?" deserves an ordered answer, not a favorite:

~~~text
Tabular, need a strong baseline   -> logistic / linear regression
Tabular, non-linear interactions  -> gradient-boosted trees (XGBoost/LightGBM)
Wide and sparse (bag-of-words)    -> linear model, it usually wins
Few features, need to explain it  -> linear w/ coefficients, or a shallow tree
Images / audio / raw text         -> deep nets (a later week)
Unlabeled, want structure         -> k-means / PCA
~~~

The meta-answer that scores points: "Start with the simplest model that could work, measure, then add complexity only when the error analysis demands it." Boosted trees are the safe default on tabular data; linear models are the safe *baseline* everywhere.

### How to talk about a project

Interviewers grade your reasoning, not your vocabulary. Structure every project story as **problem to metric to baseline to what you tried to what moved the number to what's next**. Lead with the metric and the framing, not the algorithm:

~~~text
Weak  : "I used a random forest and got 0.9 accuracy."
Strong: "Fraud is 2% of rows, so accuracy is a trap -- I optimized recall
         at a fixed 1% false-positive rate. A logistic baseline hit 0.61;
         gradient boosting with class weights took recall to 0.78. Next I'd
         calibrate the probabilities and add transaction-velocity features."
~~~

Name the trap you avoided (leakage, imbalance, the accuracy illusion), quantify the lift over a baseline, and always carry a "next step." That is what separates a junior who ran a notebook from an engineer who owns a result.

### ⚠️ Common pitfalls

- Fitting the scaler or encoder on the full dataset before splitting — silent leakage.
- Touching the test set more than once; every peek quietly tunes you to it.
- Reporting accuracy on imbalanced data instead of the metric that matches the goal.
- No baseline, so a headline "0.9" means nothing — better than *what*?
- Describing a project by its algorithm instead of its metric and decisions.

### 🎤 In interviews, they ask

- "Walk me through your ML pipeline end to end."
- "Where can leakage sneak in, and how do you prevent it?"
- "You get a fresh tabular dataset — what's your first model, and why?"
- "Tell me about a project: what was the metric, and what was your baseline?"
- "Your model hits 99% accuracy. Why am I not impressed?"

### TL;DR

- The pipeline is a ritual: frame, baseline, split, preprocess-on-train, model, tune-on-val, test-once.
- Fit every transform on train; the test set is opened a single time.
- Simplest model first; boosted trees are the tabular default, linear the universal baseline.
- Tell project stories as metric to baseline to lift to next step — never "I used algorithm X."
- Always name the baseline you beat and the trap you dodged.

### Go deeper

- [scikit-learn: pipelines and composite estimators](https://scikit-learn.org/stable/modules/compose.html)
- [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course)
- [Sebastian Raschka's blog](https://sebastianraschka.com)
- [StatQuest](https://www.youtube.com/@statquest)
`,
  };

  W.quizzes["w2d6-quiz"] = [
    {
      q: String.raw`A colleague standardizes before splitting. What is the problem?

~~~python
import numpy as np
X = load_features()                    # shape (1000, 20)
X = (X - X.mean(0)) / X.std(0)         # standardize everything
X_train, X_test = split(X)
~~~`,
      options: [
        "Nothing — standardizing first is just more efficient",
        "The test rows' mean and std leak into the transform; fit the scaler on X_train only",
        "std(0) should be std(1) to normalize each row instead",
        "It crashes because mean and std need axis=None",
      ],
      answer: 1,
      explain: String.raw`The mean and std are computed over all 1000 rows, so information from the test rows flows into the transform that every training example sees — textbook data leakage. It inflates your validation numbers and then disappoints in production. Split first, fit the scaler on train, apply those stats to test.`,
    },
    {
      q: String.raw`Why keep a separate test set instead of just train and validation?`,
      options: [
        "To have more data available for gradient descent",
        "Because k-fold cross-validation requires exactly three folds",
        "The validation set gets 'used up' by tuning; the test set gives one unbiased final estimate",
        "Test sets are only needed for deep learning models",
      ],
      answer: 2,
      explain: String.raw`Every hyperparameter you choose against the validation set fits you a little to it, so validation performance drifts optimistic. The test set — touched exactly once at the very end — restores an honest estimate of generalization. Reuse it for tuning and it silently becomes a second validation set.`,
    },
    {
      q: String.raw`Training diverges (the loss races to infinity). What is the most likely fix?

~~~python
for _ in range(1000):
    p = sigmoid(X @ w + b)
    w -= 5.0 * (X.T @ (p - y)) / n
    b -= 5.0 * (p - y).mean()
~~~`,
      options: [
        "Lower the learning rate (5.0 is too large) and standardize X",
        "Raise the learning rate so it converges faster",
        "Remove the division by n",
        "Swap sigmoid for ReLU",
      ],
      answer: 0,
      explain: String.raw`A learning rate of 5.0 overshoots the minimum and the weights explode — the classic divergence signature. Shrinking the step (say to 0.1) and standardizing features so the loss surface is well-scaled are the two standard remedies. Bigger steps make it worse, not faster.`,
    },
    {
      q: String.raw`Why train logistic regression with log-loss (cross-entropy) rather than MSE?`,
      options: [
        "MSE is mathematically undefined for probabilities",
        "Sigmoid + cross-entropy is convex with a clean (p - y) gradient; sigmoid + MSE is non-convex with vanishing gradients",
        "MSE always overfits classification data",
        "There is no real difference; log-loss is just convention",
      ],
      answer: 1,
      explain: String.raw`Pairing the sigmoid with cross-entropy yields a convex loss whose gradient is the tidy (p - y), which is easy to optimize. MSE on top of the sigmoid is non-convex, and its gradient vanishes exactly when the model is confidently wrong, so training stalls. Right loss for the right output layer.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import numpy as np
y_true = np.array([0] * 99 + [1])       # 1 positive out of 100
y_pred = np.zeros(100, dtype=int)       # predict negative for everyone
acc = (y_true == y_pred).mean()
tp = int(((y_pred == 1) & (y_true == 1)).sum())
fn = int(((y_pred == 0) & (y_true == 1)).sum())
recall = tp / (tp + fn)
print(round(acc, 2), recall)
~~~`,
      options: [
        "0.99 0.0",
        "1.0 1.0",
        "0.5 0.5",
        "0.99 1.0",
      ],
      answer: 0,
      explain: String.raw`The model is right on all 99 negatives, so accuracy is 0.99 — but it flags nobody positive, so TP = 0 and recall = 0 / 1 = 0.0. High accuracy with zero recall is the signature of the accuracy trap on imbalanced data; that 0.99 is worthless.`,
    },
    {
      q: String.raw`Random forests reduce error mainly by lowering ______; gradient boosting mainly by lowering ______.`,
      options: [
        "bias; variance",
        "variance; variance",
        "neither; both only reduce overfitting",
        "variance; bias",
      ],
      answer: 3,
      explain: String.raw`A forest averages many de-correlated high-variance trees, cancelling their noise — variance down. Boosting adds trees sequentially, each correcting the ensemble's current mistakes — bias down. Swapping these two is the most common tree-ensemble slip in interviews.`,
    },
    {
      q: String.raw`Before running k-means or kNN on features like age (0-100) and income (0-200000), you should:`,
      options: [
        "Do nothing; distance metrics are already scale-invariant",
        "Standardize the features, or income's huge range dominates every distance",
        "Convert all values to integers first",
        "Always fix the number of clusters at k = 2",
      ],
      answer: 1,
      explain: String.raw`Both methods rank points by Euclidean distance, and an unscaled feature with a giant range swamps the others — income gaps of thousands dwarf age gaps of decades. Standardizing (or min-max scaling) puts features on comparable footing so the distance reflects all of them, not just the widest one.`,
    },
  ];

  W.exercises["w2-hw"] = {
    title: "From-Scratch ML Pipeline",
    kind: "homework",
    difficulty: 3,
    xp: 100,
    minutes: 70,
    packages: ["numpy"],
    brief: "Your Week 2 capstone: split, scale-on-train, train, and score a classifier — no leakage, no sklearn.",
    description: String.raw`Assemble everything from Week 2 into one honest, leakage-free classification pipeline — from scratch, no scikit-learn.

The starter hands you ~make_blobs_2class(n, seed)~ (two Gaussian blobs, labels 0/1). You implement the rest:

**Preprocessing (fit on train, apply everywhere):**

- ~standardize_fit(X)~ -> return ~(mean, std)~ per column. Guard zero-variance columns: replace a std of 0 with 1.0 so you never divide by zero.
- ~standardize_apply(X, mean, std)~ -> ~(X - mean) / std~ using the **passed-in** stats (never recomputed on the input).

**Splitting:**

- ~train_test_split(X, y, test_size, seed)~ -> shuffle indices with ~np.random.default_rng(seed)~, take the first ~round(n * test_size)~ as test and the rest as train. Deterministic for a fixed seed; every sample lands in exactly one side. Return ~X_train, X_test, y_train, y_test~.

**Model:**

- ~LogisticRegressionGD~ with ~fit(X, y)~ (full-batch gradient descent on log-loss, zero-initialized weights, numerically stable sigmoid), ~predict_proba(X)~, and ~predict(X)~ (threshold at 0.5).

**Metrics:**

- ~accuracy(y_true, y_pred)~ and ~f1(y_true, y_pred)~ (binary, zero-division safe -> 0.0).

**Orchestration:**

- ~run_pipeline(seed)~ -> build 200 samples, split, fit the scaler on **train only**, apply those train stats to train and test, train the model on scaled train, predict on scaled test, and return ~{"accuracy": ..., "f1": ...}~ measured on the test set.

~~~python
out = run_pipeline(seed=0)
out["accuracy"]    # >= 0.85 on these well-separated blobs
~~~

Interview angle: this is the take-home in miniature. The graded signal is discipline — the scaler learns its mean and std from train and is *applied* to test, so no test information leaks into training. Get that order wrong and every number you report is a lie.`,
    starter: String.raw`import numpy as np


def make_blobs_2class(n, seed):
    """Two Gaussian blobs in 2-D. Returns (X, y) with y in {0, 1}. Provided for you."""
    rng = np.random.default_rng(seed)
    n0 = n // 2
    n1 = n - n0
    c0 = rng.normal([-2.0, -2.0], 1.0, size=(n0, 2))
    c1 = rng.normal([2.0, 2.0], 1.0, size=(n1, 2))
    X = np.vstack([c0, c1])
    y = np.concatenate([np.zeros(n0, dtype=int), np.ones(n1, dtype=int)])
    return X, y


def standardize_fit(X):
    """Return (mean, std) per column; a std of 0 becomes 1.0 to stay safe."""
    raise NotImplementedError


def standardize_apply(X, mean, std):
    """Standardize X using the given (train) stats — do not recompute them."""
    raise NotImplementedError


def train_test_split(X, y, test_size=0.25, seed=0):
    """Deterministic shuffle-split. Return X_train, X_test, y_train, y_test."""
    raise NotImplementedError


class LogisticRegressionGD:
    def __init__(self, lr=0.1, n_iters=2000):
        self.lr = lr
        self.n_iters = n_iters

    def fit(self, X, y):
        raise NotImplementedError

    def predict_proba(self, X):
        raise NotImplementedError

    def predict(self, X):
        raise NotImplementedError


def accuracy(y_true, y_pred):
    raise NotImplementedError


def f1(y_true, y_pred):
    raise NotImplementedError


def run_pipeline(seed):
    """End to end: data -> split -> scale(train) -> fit -> predict -> metrics dict."""
    raise NotImplementedError`,
    hints: [
      String.raw`standardize_fit: mean = X.mean(0), std = X.std(0), then std = np.where(std == 0, 1.0, std). standardize_apply just returns (X - mean) / std with the stats you were handed — no recomputation, that is the whole no-leakage point.`,
      String.raw`train_test_split: perm = np.random.default_rng(seed).permutation(n); n_test = int(round(n * test_size)); test indices are perm[:n_test], train indices perm[n_test:]. Index X and y with the SAME permutation so rows and labels stay aligned.`,
      String.raw`Stable sigmoid: 1 / (1 + np.exp(-np.clip(z, -500, 500))). fit loop: p = sigmoid(X @ w + b); w -= lr * (X.T @ (p - y)) / n; b -= lr * (p - y).mean().`,
      String.raw`run_pipeline order matters: split FIRST, then mean, std = standardize_fit(X_train), then apply those same stats to both X_train and X_test. Fitting the scaler before the split (or on the test set) is the leak the tests hunt for.`,
    ],
    solution: String.raw`import numpy as np


def make_blobs_2class(n, seed):
    rng = np.random.default_rng(seed)
    n0 = n // 2
    n1 = n - n0
    c0 = rng.normal([-2.0, -2.0], 1.0, size=(n0, 2))
    c1 = rng.normal([2.0, 2.0], 1.0, size=(n1, 2))
    X = np.vstack([c0, c1])
    y = np.concatenate([np.zeros(n0, dtype=int), np.ones(n1, dtype=int)])
    return X, y


def standardize_fit(X):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    std = np.where(std == 0.0, 1.0, std)
    return mean, std


def standardize_apply(X, mean, std):
    X = np.asarray(X, dtype=float)
    return (X - mean) / std


def train_test_split(X, y, test_size=0.25, seed=0):
    X = np.asarray(X)
    y = np.asarray(y)
    n = len(X)
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    n_test = int(round(n * test_size))
    test_idx = perm[:n_test]
    train_idx = perm[n_test:]
    return X[train_idx], X[test_idx], y[train_idx], y[test_idx]


class LogisticRegressionGD:
    def __init__(self, lr=0.1, n_iters=2000):
        self.lr = lr
        self.n_iters = n_iters

    def _sigmoid(self, z):
        z = np.clip(z, -500, 500)
        return 1.0 / (1.0 + np.exp(-z))

    def fit(self, X, y):
        X = np.asarray(X, dtype=float)
        y = np.asarray(y, dtype=float)
        n, d = X.shape
        self.w = np.zeros(d)
        self.b = 0.0
        for _ in range(self.n_iters):
            p = self._sigmoid(X @ self.w + self.b)
            self.w -= self.lr * (X.T @ (p - y)) / n
            self.b -= self.lr * float(np.mean(p - y))
        return self

    def predict_proba(self, X):
        X = np.asarray(X, dtype=float)
        return self._sigmoid(X @ self.w + self.b)

    def predict(self, X):
        return (self.predict_proba(X) >= 0.5).astype(int)


def accuracy(y_true, y_pred):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    return float(np.mean(y_true == y_pred))


def f1(y_true, y_pred):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    tp = int(np.sum((y_pred == 1) & (y_true == 1)))
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))
    p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    r = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    return 2 * p * r / (p + r) if (p + r) > 0 else 0.0


def run_pipeline(seed):
    X, y = make_blobs_2class(200, seed)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, seed=seed)
    mean, std = standardize_fit(X_train)
    X_train_s = standardize_apply(X_train, mean, std)
    X_test_s = standardize_apply(X_test, mean, std)
    clf = LogisticRegressionGD(lr=0.1, n_iters=2000).fit(X_train_s, y_train)
    pred = clf.predict(X_test_s)
    return {"accuracy": accuracy(y_test, pred), "f1": f1(y_test, pred)}`,
    tests: [
      { name: "standardize maps train columns to zero-mean, unit-std", code: String.raw`import numpy as np
X, y = make_blobs_2class(200, 0)
mean, std = standardize_fit(X)
Xs = standardize_apply(X, mean, std)
assert np.allclose(Xs.mean(axis=0), 0.0, atol=1e-9), f"means {Xs.mean(axis=0)}"
assert np.allclose(Xs.std(axis=0), 1.0, atol=1e-9), f"stds {Xs.std(axis=0)}"` },
      { name: "constant column does not produce nan or inf", code: String.raw`import numpy as np
X = np.array([[1.0, 5.0], [1.0, 7.0], [1.0, 9.0]])   # column 0 is constant
mean, std = standardize_fit(X)
Xs = standardize_apply(X, mean, std)
assert not np.any(np.isnan(Xs)) and not np.any(np.isinf(Xs)), "guard std == 0 before dividing"
assert np.allclose(Xs[:, 0], 0.0), "a constant column should map to 0 after centering"` },
      { name: "apply uses the passed-in train stats (no leakage)", code: String.raw`import numpy as np
X_train = np.array([[0.0], [10.0]])          # train mean=5, std=5
mean, std = standardize_fit(X_train)
out = standardize_apply(np.array([[5.0], [10.0]]), mean, std)
assert np.allclose(out, [[0.0], [1.0]]), f"must use train stats mean=5,std=5; got {out.ravel()}"` },
      { name: "split has right sizes, full coverage, aligned labels", code: String.raw`import numpy as np
X = np.arange(20).reshape(-1, 1).astype(float)
y = (np.arange(20) >= 10).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, seed=0)
assert len(X_train) == 15 and len(X_test) == 5, f"sizes {len(X_train)}/{len(X_test)}"
assert len(y_train) == 15 and len(y_test) == 5, "labels must match feature split sizes"
seen = set(np.vstack([X_train, X_test]).ravel().tolist())
assert seen == set(range(20)), "every sample must appear exactly once across train and test"
assert np.array_equal(y_train, (X_train[:, 0] >= 10).astype(int)), "labels must stay aligned with their rows"` },
      { name: "split is deterministic per seed and varies across seeds", code: String.raw`import numpy as np
X = np.arange(40).reshape(-1, 1).astype(float)
y = np.arange(40) % 2
a = train_test_split(X, y, test_size=0.3, seed=7)
b = train_test_split(X, y, test_size=0.3, seed=7)
for u, v in zip(a, b):
    assert np.array_equal(u, v), "same seed must give the same split"
c = train_test_split(X, y, test_size=0.3, seed=8)
assert not np.array_equal(a[0], c[0]), "different seeds should generally differ"` },
      { name: "LogisticRegressionGD separates the blobs", code: String.raw`import numpy as np
X, y = make_blobs_2class(200, 1)
mean, std = standardize_fit(X)
Xs = standardize_apply(X, mean, std)
clf = LogisticRegressionGD(lr=0.1, n_iters=2000).fit(Xs, y)
acc = accuracy(y, clf.predict(Xs))
assert acc >= 0.95, f"should easily separate these blobs, got {acc}"` },
      { name: "accuracy computes the fraction correct", code: String.raw`assert abs(accuracy([1, 0, 1, 1], [1, 0, 0, 1]) - 0.75) < 1e-9, "3 of 4 correct -> 0.75"
assert accuracy([0, 0], [1, 1]) == 0.0, "all wrong -> 0.0"` },
      { name: "f1 is correct and zero-division safe", code: String.raw`import math
assert abs(f1([1, 1, 0, 0], [1, 0, 1, 0]) - 0.5) < 1e-9, "TP=1,FP=1,FN=1 -> 0.5"
val = f1([0, 0, 1], [0, 0, 0])   # nothing predicted positive
assert val == 0.0 and not math.isnan(val), "zero-division must give 0.0, not nan"` },
      { name: "run_pipeline returns a metrics dict that clears 0.85", code: String.raw`out = run_pipeline(0)
assert isinstance(out, dict), "run_pipeline must return a dict"
assert "accuracy" in out and "f1" in out, f"missing keys, got {sorted(out.keys())}"
assert out["accuracy"] >= 0.85, f"end-to-end accuracy too low: {out['accuracy']}"
assert out["f1"] >= 0.85, f"end-to-end f1 too low: {out['f1']}"` },
      { name: "run_pipeline is deterministic for a fixed seed", code: String.raw`a = run_pipeline(3)
b = run_pipeline(3)
assert a == b, f"same seed must give identical results, got {a} vs {b}"
assert isinstance(a["accuracy"], float), "accuracy should be a float"` },
    ],
  };

  W.exercises["w2-boss-t1"] = {
    title: "Stable softmax and cross-entropy",
    kind: "boss",
    difficulty: 2,
    xp: 40,
    minutes: 20,
    packages: ["numpy"],
    brief: "The output layer of every classifier: an overflow-proof softmax and the mean NLL loss.",
    description: String.raw`Implement the two functions at the heart of every softmax classifier — the boss task for Week 2.

**1. ~softmax(z)~** — turn raw scores (logits) into a probability distribution.

- A 1-D input of shape ~(k,)~ returns a length-~k~ distribution that sums to 1.
- A 2-D input of shape ~(n, k)~ returns a *row-wise* softmax: each of the ~n~ rows sums to 1 (over axis 1).
- It must be **numerically stable**: subtract the max before exponentiating, so large logits never overflow to ~inf~ or ~nan~. This is legal because softmax is shift-invariant.

**2. ~cross_entropy(probs, y_true_idx)~** — the mean negative log-likelihood.

- ~probs~ is an ~(n, k)~ array of probability rows; ~y_true_idx~ is an ~(n,)~ array of true class indices.
- Return the batch mean of ~-log(probs[i, y_true_idx[i]])~.

~~~python
softmax(np.array([1.0, 2.0, 3.0]))       # ~ [0.090, 0.245, 0.665], sums to 1
softmax(np.array([[1.0, 1.0]]))           # [[0.5, 0.5]]
cross_entropy(np.array([[0.8, 0.2]]), np.array([0]))   # -log(0.8) ~ 0.223
~~~

Interview angle: softmax plus cross-entropy is the output layer of essentially every classifier, and "why subtract the max?" is the favorite numerical-stability question. Handling both 1-D and 2-D inputs with the same axis logic is the tell of someone who has actually written it, not just imported it.`,
    starter: String.raw`import numpy as np


def softmax(z):
    """Numerically stable softmax.
    A 1-D vector -> a distribution over its entries.
    A 2-D array of shape (n, k) -> softmax over each row (axis=1).
    """
    raise NotImplementedError


def cross_entropy(probs, y_true_idx):
    """Mean negative log-likelihood.
    probs: (n, k) probability rows. y_true_idx: (n,) true class indices.
    """
    raise NotImplementedError`,
    hints: [
      String.raw`Stable softmax subtracts the row max before exp: z - z.max(axis=-1, keepdims=True). That shifts the largest logit to 0 so exp cannot overflow, and the result is unchanged because softmax is shift-invariant.`,
      String.raw`Using axis=-1 with keepdims=True makes ONE code path serve both a 1-D vector and a 2-D batch: the normalizer broadcasts correctly in either case. Divide exp(shifted) by its sum along axis=-1.`,
      String.raw`For cross-entropy, pick each true class's probability with fancy indexing: probs[np.arange(n), y_true_idx]. Then return float(-np.mean(np.log(picked))); clip picked to a tiny floor like 1e-12 to avoid log(0).`,
    ],
    solution: String.raw`import numpy as np


def softmax(z):
    z = np.asarray(z, dtype=float)
    z = z - np.max(z, axis=-1, keepdims=True)
    e = np.exp(z)
    return e / np.sum(e, axis=-1, keepdims=True)


def cross_entropy(probs, y_true_idx):
    probs = np.asarray(probs, dtype=float)
    y_true_idx = np.asarray(y_true_idx)
    n = probs.shape[0]
    picked = probs[np.arange(n), y_true_idx]
    picked = np.clip(picked, 1e-12, 1.0)
    return float(-np.mean(np.log(picked)))`,
    tests: [
      { name: "1-D softmax sums to 1 with correct values", code: String.raw`import numpy as np
p = softmax(np.array([1.0, 2.0, 3.0]))
assert p.shape == (3,), f"shape {p.shape}"
assert abs(p.sum() - 1.0) < 1e-9, f"sum {p.sum()}"
assert np.argmax(p) == 2, "largest logit must get the largest probability"
assert abs(p[2] - 0.6652409557748219) < 1e-6, f"got {p[2]}"` },
      { name: "2-D softmax normalizes each row (axis=1)", code: String.raw`import numpy as np
z = np.array([[1.0, 2.0, 3.0], [1.0, 1.0, 1.0]])
p = softmax(z)
assert p.shape == (2, 3), f"shape {p.shape}"
assert np.allclose(p.sum(axis=1), 1.0), "each row must sum to 1"
assert np.allclose(p[1], [1/3, 1/3, 1/3]), "equal logits -> uniform row"` },
      { name: "huge logits do not overflow to nan", code: String.raw`import numpy as np
p = softmax(np.array([1000.0, 1000.0, 1000.0]))
assert not np.any(np.isnan(p)), "overflow -> nan; subtract the max before exp"
assert np.allclose(p, [1/3, 1/3, 1/3]), f"got {p}"` },
      { name: "softmax is shift-invariant", code: String.raw`import numpy as np
z = np.array([[0.5, -1.0, 2.0]])
assert np.allclose(softmax(z), softmax(z + 100.0)), "softmax(z) must equal softmax(z + c)"` },
      { name: "cross_entropy matches the hand computation", code: String.raw`import numpy as np
probs = np.array([[0.8, 0.2], [0.3, 0.7]])
y = np.array([0, 1])
ce = cross_entropy(probs, y)
expected = -(np.log(0.8) + np.log(0.7)) / 2
assert abs(ce - expected) < 1e-9, f"got {ce}, expected {expected}"` },
      { name: "confident-correct predictions give near-zero loss", code: String.raw`import numpy as np
logits = np.array([[10.0, 0.0, 0.0], [0.0, 0.0, 10.0]])
p = softmax(logits)
ce = cross_entropy(p, np.array([0, 2]))
assert ce >= 0.0, "cross-entropy is non-negative"
assert ce < 0.01, f"confident-correct predictions should be near 0, got {ce}"` },
    ],
  };

  W.boss = {
    id: "w2-boss",
    title: "T2 — Classic ML",
    timeLimitMin: 30,
    passPct: 70,
    intro: String.raw`Thirteen questions sweeping the whole arena — numpy, generalization, gradient descent, metrics, and the tree/cluster zoo — then one build: a stable softmax with its cross-entropy loss. Score 70% or better to claim the T2 badge.`,
    quiz: [
      {
        q: String.raw`What is the shape of ~r~?

~~~python
import numpy as np
a = np.arange(12).reshape(3, 4)
b = np.array([10, 20, 30, 40])
r = a + b
~~~`,
        options: ["(3, 4)", "(4, 3)", "(3,)", "It raises a broadcasting error"],
        answer: 0,
        explain: String.raw`b has shape (4,), which broadcasts across each of the 3 rows of the (3, 4) array — the trailing dimensions (4 and 4) match. The result keeps shape (3, 4), with b added to every row. Broadcasting aligns shapes from the right.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import numpy as np
a = np.arange(5)
b = a[1:4]
b[0] = 99
print(a)
~~~`,
        options: ["[0 1 2 3 4]", "[0 99 2 3 4]", "[99 1 2 3 4]", "[0 1 2 3 99]"],
        answer: 1,
        explain: String.raw`A basic slice returns a *view*, not a copy — b shares memory with a. Writing b[0] = 99 sets a[1] = 99, so the change surfaces in a. Reach for a[1:4].copy() when you need an independent array.`,
      },
      {
        q: String.raw`Which step order avoids data leakage?`,
        options: [
          "Scale on all the data, then split into train/test",
          "Split, fit a separate scaler on train and another on test",
          "Split, fit the scaler on train, apply it to both train and test",
          "Impute missing values with the full dataset's mean, then split",
        ],
        answer: 2,
        explain: String.raw`Transforms must learn their statistics from training data only, then apply them unchanged to test. Fitting on all data (or imputing with the global mean) leaks test information; fitting a *separate* scaler on test defeats the point, because then train and test live on different scales.`,
      },
      {
        q: String.raw`A model scores 0.99 on training but 0.70 on validation. This is a symptom of:`,
        options: [
          "high bias (underfitting)",
          "high variance (overfitting)",
          "data leakage into the test set",
          "a learning rate that is too small",
        ],
        answer: 1,
        explain: String.raw`A large train-minus-validation gap means the model memorized the training set but fails to generalize — the definition of high variance / overfitting. Fixes: more data, regularization, or a simpler model. High bias would instead show *both* scores low.`,
      },
      {
        q: String.raw`If the learning rate is far too small, gradient descent will:`,
        options: [
          "diverge to infinity",
          "oscillate around the minimum forever",
          "reach the global optimum in a single step",
          "converge, but painfully slowly",
        ],
        answer: 3,
        explain: String.raw`A tiny step barely moves the weights each iteration, so you crawl toward the minimum and may run out of iterations first. Too *large* a rate causes the overshoot, oscillation, and divergence. Standardizing features lets you safely use a larger, healthier rate.`,
      },
      {
        q: String.raw`With sigmoid outputs and cross-entropy loss, the per-example gradient of the loss w.r.t. the linear input simplifies to:`,
        options: [
          "p - y (prediction minus label)",
          "(y - p) squared",
          "the sigmoid's second derivative",
          "-log(p) on its own",
        ],
        answer: 0,
        explain: String.raw`With p = sigmoid(Xw + b) and cross-entropy, the gradient collapses to the clean (p - y). That elegant form is exactly why sigmoid and cross-entropy are paired — it makes the optimization convex and the update a one-liner.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import numpy as np
y_true = np.array([1, 1, 1, 0])
y_pred = np.array([1, 0, 0, 0])
tp = int(((y_pred == 1) & (y_true == 1)).sum())
fp = int(((y_pred == 1) & (y_true == 0)).sum())
fn = int(((y_pred == 0) & (y_true == 1)).sum())
print(tp / (tp + fp), round(tp / (tp + fn), 3))
~~~`,
        options: ["0.333 1.0", "0.5 0.5", "1.0 0.333", "1.0 1.0"],
        answer: 2,
        explain: String.raw`TP = 1 (one correct positive), FP = 0 (no false alarms), FN = 2 (two positives missed). Precision = 1 / (1 + 0) = 1.0; recall = 1 / (1 + 2) = 0.333. High precision but low recall — the model is cautious: when it says positive it is right, but it misses most positives.`,
      },
      {
        q: String.raw`An ROC-AUC of 0.80 means:`,
        options: [
          "the model is correct on 80% of examples",
          "the decision threshold should be set to 0.80",
          "precision equals 0.80 at every threshold",
          "a random positive is ranked above a random negative 80% of the time",
        ],
        answer: 3,
        explain: String.raw`AUC is a *ranking* metric: it equals the probability that the model scores a randomly chosen positive higher than a randomly chosen negative. It is threshold-independent and, unlike accuracy, is not fooled by class imbalance. 0.5 is random guessing; 1.0 is perfect ranking.`,
      },
      {
        q: String.raw`Which statement about tree ensembles is TRUE?`,
        options: [
          "Bagging trains trees sequentially; boosting trains them in parallel",
          "Boosting reduces bias by fitting each new tree to the ensemble's residuals",
          "A random forest uses the same feature at every split",
          "Boosting can never overfit",
        ],
        answer: 1,
        explain: String.raw`Boosting is sequential: each new tree fits the residual error of the ensemble so far, steadily driving bias down (and it *can* overfit if over-trained). Bagging is the parallel one; random forests deliberately randomize the feature subset per split to de-correlate the trees.`,
      },
      {
        q: String.raw`A tree node holds labels ~[1, 1, 1, 0]~. Its Gini impurity is:

~~~text
gini = 1 - sum_k p_k^2
~~~`,
        options: ["0.375", "0.5", "0.25", "0.0"],
        answer: 0,
        explain: String.raw`p(1) = 3/4 and p(0) = 1/4, so gini = 1 - (0.75^2 + 0.25^2) = 1 - (0.5625 + 0.0625) = 0.375. It is non-zero because the node is mixed, but lower than the 0.5 maximum a perfectly even two-class split would reach.`,
      },
      {
        q: String.raw`Running k-means twice on the same data yields two different clusterings. The usual cause:`,
        options: [
          "a bug — k-means is fully deterministic",
          "the data changed between the two runs",
          "random centroid initialization landing in different local optima",
          "k-means secretly peeking at the labels",
        ],
        answer: 2,
        explain: String.raw`Lloyd's algorithm converges only to a *local* optimum, and different random initial centroids fall into different basins. Standard practice: run several inits and keep the lowest inertia, or use k-means++ to spread the seeds apart. Fixing the seed makes a single run reproducible.`,
      },
      {
        q: String.raw`kNN works well in 2-D but poorly in 500-D on the same-size dataset because:`,
        options: [
          "it runs out of RAM storing the points",
          "kNN supports at most 10 features",
          "high dimensions make the majority vote always tie",
          "in high dimensions distances concentrate, so 'nearest' loses meaning",
        ],
        answer: 3,
        explain: String.raw`The curse of dimensionality: as dimensions grow, the ratio between the nearest and farthest distances approaches 1, so every point is roughly equidistant and the local neighborhood stops being informative. More data, or dimensionality reduction like PCA, is the usual remedy.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import numpy as np
X = np.array([[1.0, 10.0],
              [3.0, 30.0]])
mu = X.mean(axis=0)
sd = X.std(axis=0)
print(((X - mu) / sd)[0])
~~~`,
        options: ["[1. 1.]", "[0. 0.]", "[-1. -1.]", "[-2. -20.]"],
        answer: 2,
        explain: String.raw`Column means are [2, 20] and column stds are [1, 10]. Standardizing row 0: (1 - 2)/1 = -1 and (10 - 20)/10 = -1, giving [-1, -1]. Standardization is per column (axis=0), which is exactly why both features end up on the same scale.`,
      },
    ],
    tasks: ["w2-boss-t1"],
  };

  /* W2_END */
})();
