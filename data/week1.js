/* ML Quest — Week 1: Python Reforged */
(function () {
  const W = {
    num: 1,
    id: "w1",
    emoji: "🐍",
    title: "Python Reforged",
    subtitle: "Rebuild Python fluency for live coding",
    goal: "Write confident, idiomatic Python under interview pressure.",
    days: [],
    lessons: {},
    quizzes: {},
    exercises: {},
    boss: null,
  };
  CourseData.weeks.push(W);

  // ================= Day 1 =================
  W.days.push({
    id: "w1d1",
    title: "The Python Mental Model",
    minutes: 122,
    blocks: [
      { type: "lesson",   id: "w1d1-lesson", minutes: 25 },
      { type: "quiz",     id: "w1d1-quiz",   minutes: 12 },
      { type: "exercise", id: "w1d1-e1",     minutes: 20 },
      { type: "exercise", id: "w1d1-e2",     minutes: 30 },
      { type: "exercise", id: "w1d1-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "python", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w1d1-lesson"] = {
    title: "The Python Mental Model",
    md: String.raw`Live-coding rounds rarely die on algorithms. They die on line three, when a candidate mutates a list they thought they had copied and spends ten minutes debugging in front of a silent interviewer. Today rebuilds the mental model that prevents those deaths: what names really are, which objects can change under your feet, and which container to grab without thinking.

### Names are labels, objects are things

A Python variable is not a box holding a value. It is a name tag tied to an object that lives somewhere on the heap. Assignment ties another tag to the *same* object — it never copies.

~~~python
a = [1, 2, 3]
b = a            # second name tag on the SAME list
b.append(4)
print(a)         # [1, 2, 3, 4] — surprising only if you think in boxes
~~~

Two operators probe this world: ~==~ asks "equal values?" by calling ~__eq__~; ~is~ asks "the very same object?" by comparing identities. Interviewers love this because CPython interns small integers and some strings, so ~is~ *appears* to work for values — until it does not:

~~~python
x = 10 ** 6
y = 10 ** 6
print(x == y)    # True — same value
print(x is y)    # implementation detail; may be False. Never rely on it.
~~~

Rule: ~is~ is only for singletons — ~is None~, ~is True~ in rare cases, or your own sentinel objects. Everything else is ~==~.

### Mutability decides who feels your edits

Immutable: ~int~, ~float~, ~str~, ~tuple~, ~bytes~, ~frozenset~. Mutable: ~list~, ~dict~, ~set~, and most user-defined classes. Mutation travels through *every* alias, which produces two of the most-asked bugs in Python history:

~~~python
row = [0] * 3
grid = [row] * 2          # BUG: two references to ONE row
grid[0][0] = 9
print(grid)               # [[9, 0, 0], [9, 0, 0]]

grid_ok = [[0] * 3 for _ in range(2)]   # fresh row per iteration
~~~

Copying has depth. A shallow copy rebuilds the outer container only; the inner objects stay shared. A deep copy rebuilds everything reachable:

~~~python
import copy
nested = [[1, 2], [3, 4]]
sh = copy.copy(nested)      # or nested[:] or list(nested)
sh[0].append(99)            # visible through nested too!
dp = copy.deepcopy(nested)  # fully independent, walks the whole graph
~~~

One more classic: ~a += b~ on a list calls ~extend~ and mutates in place, while ~a = a + b~ builds a new list and rebinds the name. Inside a function, the first one changes the caller's data; the second does not.

### Pick containers with big-O in your head

Interviewers listen for complexity talk the moment you choose a container. The numbers to say out loud:

- ~list~ — append and pop at the end amortized O(1); ~x in lst~ is O(n); ~insert(0, x)~ is O(n) (use ~collections.deque~ for queue behavior).
- ~dict~ — get, set, and membership average O(1) via hashing (worst case O(n)); insertion-ordered by language guarantee since 3.7.
- ~set~ — membership, add, discard average O(1); the tool for dedup and intersection.
- ~tuple~ — fixed shape, cheaper than a list, and hashable when all elements are hashable, so it can be a dict key.

The classic accidental O(n squared): membership testing against a list inside a loop. Hoist it into a set once, then loop:

~~~python
allowed = set(allowlist)                  # O(n) once
hits = [x for x in stream if x in allowed]  # O(1) per check
~~~

### The idiom layer: comprehensions, slicing, unpacking

Fluent Python compresses whole for-loops into single readable lines. These are the idioms interviewers expect to see flow out of you without pauses:

~~~python
squares = {n: n * n for n in range(5)}     # dict comprehension
evens = [n for n in nums if n % 2 == 0]    # filter
flat = [x for row in grid for x in row]    # nested: for-clauses read left to right

head, *middle, tail = [1, 2, 3, 4, 5]      # extended unpacking
a, b = b, a                                # swap via tuple packing

last_three = data[-3:]                     # slices clamp — never IndexError
reversed_copy = data[::-1]                 # new list, original untouched
~~~

Slicing always builds a *new* list (a shallow one — elements are shared references). And unlike indexing, slicing out of range quietly clamps: ~[1, 2, 3][10:]~ is ~[]~, not an error.

### Truthiness: "if x" is not "if x is not None"

Falsy values: ~False~, ~None~, ~0~, ~0.0~, empty string, empty ~list~ / ~dict~ / ~set~ / ~tuple~. Everything else is truthy — including the string ~"False"~ and the string ~"0"~. The bug pattern: using ~if result:~ when ~0~ or ~""~ are legitimate results.

~~~python
def find_index(items: list, target) -> int | None:
    ...

idx = find_index(items, target)
if idx is not None:     # correct: index 0 is a real answer
    print("found at", idx)
~~~

### ⚠️ Common pitfalls

- ~b = a~ copies nothing — it aliases. Mutations through ~b~ show through ~a~.
- ~[[0] * 3] * 2~ replicates the *reference* to one inner list, not the list itself.
- ~copy.copy~ on nested structures still shares every inner object — that is what "shallow" means.
- Using ~is~ to compare numbers or strings; interning makes it pass in tests and fail in production.
- ~if x:~ treats ~0~, ~""~, and ~[]~ as missing. When zero is a valid value, test ~is not None~.
- ~x in big_list~ inside a loop — the silent O(n squared) that interviewers wait for you to notice.

### 🎤 In interviews, they ask

- "What is the difference between ~is~ and ~==~, and when is ~is~ correct?"
- "Explain shallow versus deep copy. When does a shallow copy bite you?"
- "What is the complexity of membership testing in a list, a set, and a dict?"
- "Why does ~[[0] * 3] * 2~ misbehave, and how do you build the grid correctly?"
- "Are Python dicts ordered? Can you rely on it?" (Yes — insertion order is a language guarantee since 3.7.)

### TL;DR

- Variables are name tags on heap objects; assignment never copies.
- ~==~ compares values via ~__eq__~; ~is~ compares identity — reserve it for ~None~ and sentinels.
- Mutation is visible through every alias; choose shallow vs deep copy deliberately.
- ~dict~ / ~set~ membership is average O(1); ~list~ membership is O(n) — hoist lookups into a set.
- Comprehensions and slices build new lists; slices clamp instead of raising.
- Truthiness is about emptiness, not meaning: ~"False"~ is truthy, ~0~ is falsy.

### Go deeper

- [Python data model reference](https://docs.python.org/3/reference/datamodel.html)
- [copy — shallow and deep copy operations](https://docs.python.org/3/library/copy.html)
- [Built-in types, truth testing and sequence ops](https://docs.python.org/3/library/stdtypes.html)
- [Data structures tutorial](https://docs.python.org/3/tutorial/datastructures.html)
`,
  };

  W.quizzes["w1d1-quiz"] = [
    {
      q: String.raw`What does this print?

~~~python
a = [1, 2, 3]
b = a
b.append(4)
print(a)
~~~`,
      options: ["[1, 2, 3]", "[1, 2, 3, 4]", "It raises an error", "[4]"],
      answer: 1,
      explain: String.raw`Assignment never copies — a and b are two names for the same list object, so a mutation through either name is visible through both. To get an independent list you need an explicit copy: list(a), a[:], or copy.copy(a).`,
    },
    {
      q: String.raw`Which statement about ~is~ and ~==~ is correct?`,
      options: [
        "~is~ compares values; ~==~ compares memory addresses",
        "They are interchangeable for strings and small integers",
        "~==~ calls ~__eq__~ to compare values; ~is~ checks both names point to the same object",
        "~is~ is a faster spelling of ~==~ and should be preferred in hot loops",
      ],
      answer: 2,
      explain: String.raw`~==~ is value equality (dispatches to ~__eq__~), while ~is~ is object identity. Interning of small ints and some strings makes ~is~ appear to work for values, but that is an implementation detail. Reserve ~is~ for singletons like ~None~.`,
    },
    {
      q: String.raw`What does this print?

~~~python
grid = [[0] * 3] * 2
grid[0][0] = 9
print(grid)
~~~`,
      options: [
        "[[9, 0, 0], [9, 0, 0]]",
        "[[9, 0, 0], [0, 0, 0]]",
        "[[9, 9, 9], [9, 9, 9]]",
        "It raises an IndexError",
      ],
      answer: 0,
      explain: String.raw`The outer ~* 2~ duplicates the reference to one inner list, so both rows are the same object and editing one edits "both". Build independent rows with a comprehension: [[0] * 3 for _ in range(2)].`,
    },
    {
      q: String.raw`You call ~x in container~ millions of times in a hot loop. Which container choice is right, and why?`,
      options: [
        "list — membership is O(1) because lists are indexed",
        "It does not matter; Python optimizes membership automatically",
        "set — membership is O(log n) via a balanced tree",
        "set — membership is average O(1) via hashing, while a list does an O(n) scan",
      ],
      answer: 3,
      explain: String.raw`Sets and dicts are hash tables: average O(1) membership, degrading only under pathological collisions. A list has no index on values, so ~in~ scans linearly. Converting a lookup list to a set before a loop is one of the cheapest big wins you can show in an interview.`,
    },
    {
      q: String.raw`Which of these can be used as a dict key?`,
      options: [
        "[1, 2] — a list",
        "(1, 'a') — a tuple of immutables",
        "{'x': 1} — a dict",
        "({1, 2},) — a tuple containing a set",
      ],
      answer: 1,
      explain: String.raw`Dict keys must be hashable. Lists, dicts, and sets are mutable and unhashable. A tuple is hashable only if everything inside it is hashable — so a tuple of immutables works, but a tuple wrapping a set does not.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import copy
outer = [[1, 2], [3, 4]]
sh = copy.copy(outer)
sh[0].append(99)
sh.append([5, 6])
print(outer)
~~~`,
      options: [
        "[[1, 2, 99], [3, 4]]",
        "[[1, 2], [3, 4]]",
        "[[1, 2, 99], [3, 4], [5, 6]]",
        "[[1, 2, 99], [3, 4, 99]]",
      ],
      answer: 0,
      explain: String.raw`A shallow copy builds a new outer list, so appending [5, 6] to ~sh~ does not touch ~outer~. But the inner lists are shared references, so mutating ~sh[0]~ is visible through ~outer[0]~. Deep copy would isolate both levels.`,
    },
    {
      q: String.raw`What does this print?

~~~python
print(bool("False"), bool([]), bool("0"))
~~~`,
      options: [
        "False False True",
        "False False False",
        "True False True",
        "True True False",
      ],
      answer: 2,
      explain: String.raw`Truthiness of a string depends only on whether it is empty — content is irrelevant, so both "False" and "0" are truthy. An empty list is falsy. This is exactly why parsing user input with ~bool(...)~ is a bug.`,
    },
    {
      q: String.raw`Given ~data = [10, 20, 30]~, what does ~data[1:100]~ evaluate to?`,
      options: ["It raises an IndexError", "[20]", "None", "[20, 30]"],
      answer: 3,
      explain: String.raw`Slices clamp out-of-range bounds to the sequence length and never raise, returning whatever exists in the range. Only single-position indexing like ~data[100]~ raises IndexError. This asymmetry makes slicing ideal for windowed processing.`,
    },
  ];

  W.exercises["w1d1-e1"] = {
    title: "Top-K frequent words",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Count word frequencies and rank with a deliberate tie-break.",
    description: String.raw`Implement ~top_k_words(text, k)~ returning the ~k~ most frequent words as ~(word, count)~ tuples, most frequent first.

Rules:

- Lowercase the text first; a word is a maximal run of letters and digits (use ~re.findall(r"[a-z0-9]+", ...)~ after lowercasing).
- Sort by count descending; break count ties **alphabetically ascending**.
- If ~k~ exceeds the vocabulary size, return every word. ~k == 0~ returns ~[]~.

~~~python
top_k_words("the cat and the dog and the bird", 2)
# [("the", 3), ("and", 2)]

top_k_words("b b a a", 2)
# [("a", 2), ("b", 2)]   — tie broken alphabetically
~~~

Interview angle: this is the canonical warm-up screen. It checks whether you reach for ~collections.Counter~, whether you can express "count desc, word asc" as one compound sort key, and whether your ties are deliberate instead of accidental.`,
    starter: String.raw`import re
from collections import Counter

def top_k_words(text: str, k: int) -> list[tuple[str, int]]:
    """Return the k most frequent words as (word, count), ties alphabetical."""
    # 1) normalize + tokenize  2) count  3) sort by (-count, word)  4) slice
    raise NotImplementedError`,
    hints: [
      String.raw`~Counter.most_common()~ alone is not enough: it keeps ties in insertion order, but you need an explicit alphabetical tie-break.`,
      String.raw`~sorted~ accepts a key that returns a tuple — sort by count descending AND word ascending in one pass.`,
      String.raw`Negate the count inside the key: ~key=lambda kv: (-kv[1], kv[0])~, then slice the first k items.`,
    ],
    solution: String.raw`import re
from collections import Counter

def top_k_words(text: str, k: int) -> list[tuple[str, int]]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    counts = Counter(words)
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return ranked[:k]`,
    tests: [
      { name: "ranks by frequency, most frequent first", code: String.raw`res = top_k_words("the cat and the dog and the bird", 2)
assert res == [("the", 3), ("and", 2)], f"got {res}"` },
      { name: "breaks count ties alphabetically", code: String.raw`res = top_k_words("pear kiwi pear kiwi apple apple", 3)
assert res == [("apple", 2), ("kiwi", 2), ("pear", 2)], f"got {res}"` },
      { name: "k larger than vocabulary returns everything", code: String.raw`res = top_k_words("hello world hello", 10)
assert res == [("hello", 2), ("world", 1)], f"got {res}"` },
      { name: "empty text gives empty list", code: String.raw`res = top_k_words("", 3)
assert res == [], f"expected [], got {res}"` },
      { name: "case-insensitive and punctuation-proof", code: String.raw`res = top_k_words("Dog! dog? DOG, cat... Cat", 2)
assert res == [("dog", 3), ("cat", 2)], f"got {res}"` },
      { name: "k equal to zero gives empty list", code: String.raw`res = top_k_words("a b c", 0)
assert res == [], f"expected [], got {res}"` },
    ],
  };

  W.exercises["w1d1-e2"] = {
    title: "Anagram groups + order-preserving dedupe",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: [],
    brief: "Two hash-map classics: group by signature, dedupe without losing order.",
    description: String.raw`Implement two independent functions.

**1.** ~group_anagrams(words)~ — group words that are anagrams of each other.

- Return ~list[list[str]]~. Groups appear in order of the **first appearance** of each anagram signature; inside a group, words keep their input order.
- Comparison is case-sensitive: ~"Eat"~ and ~"tea"~ are NOT anagrams here.

**2.** ~dedupe_keep_order(items)~ — remove duplicates from a list of hashable items, keeping the first occurrence of each.

~~~python
group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
# [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]

dedupe_keep_order([3, 1, 3, 2, 1])
# [3, 1, 2]
~~~

Interview angle: group_anagrams is a LeetCode staple whose real question is "what do you key the hash map on?" — and dedupe-keeping-order probes whether you know Python dicts preserve insertion order and can weaponize that in one line.`,
    starter: String.raw`def group_anagrams(words: list[str]) -> list[list[str]]:
    """Group anagrams. Groups follow first appearance; words keep input order."""
    raise NotImplementedError

def dedupe_keep_order(items: list) -> list:
    """Drop duplicates, keeping the first occurrence of each item."""
    raise NotImplementedError`,
    hints: [
      String.raw`All anagrams of a word share one canonical form. Compute it per word and use it as a dict key.`,
      String.raw`~sorted(word)~ returns a list, and lists cannot be dict keys — turn it into a tuple or join it into a string.`,
      String.raw`For dedupe: dict keys are unique AND insertion-ordered, so ~list(dict.fromkeys(items))~ is the whole function.`,
    ],
    solution: String.raw`def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[tuple[str, ...], list[str]] = {}
    for word in words:
        key = tuple(sorted(word))
        groups.setdefault(key, []).append(word)
    return list(groups.values())

def dedupe_keep_order(items: list) -> list:
    return list(dict.fromkeys(items))`,
    tests: [
      { name: "groups the classic leetcode example", code: String.raw`res = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
assert res == [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]], f"got {res}"` },
      { name: "group order follows first appearance", code: String.raw`res = group_anagrams(["zzz", "ab", "ba", "zzz"])
assert res == [["zzz", "zzz"], ["ab", "ba"]], f"got {res}"` },
      { name: "empty inputs give empty outputs", code: String.raw`assert group_anagrams([]) == [], "group_anagrams([]) should be []"
res = dedupe_keep_order([])
assert res == [], f"expected [], got {res}"` },
      { name: "empty strings are anagrams of each other", code: String.raw`res = group_anagrams(["", "a", ""])
assert res == [["", ""], ["a"]], f"got {res}"` },
      { name: "dedupe keeps first-occurrence order", code: String.raw`res = dedupe_keep_order([3, 1, 3, 2, 1, 3])
assert res == [3, 1, 2], f"got {res}"` },
      { name: "dedupe does not sort", code: String.raw`res = dedupe_keep_order(["pear", "apple", "pear", "banana"])
assert res == ["pear", "apple", "banana"], f"got {res}"` },
    ],
  };

  W.exercises["w1d1-e3"] = {
    title: "Flatten arbitrarily nested lists",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Recursion warm-up: flatten any depth without exploding strings.",
    description: String.raw`Implement ~flatten(nested)~ that turns arbitrarily nested lists into one flat list, preserving left-to-right order.

Rules:

- Only ~list~ instances are containers. Strings, tuples, dicts, and everything else are **atoms** and pass through untouched.
- Any nesting depth up to a few hundred levels must work.

~~~python
flatten([1, [2, [3, [4]]], 5])
# [1, 2, 3, 4, 5]

flatten(["ab", ["cd", (1, 2)]])
# ["ab", "cd", (1, 2)]   — strings and tuples stay whole
~~~

Interview angle: the follow-up trap everyone hits is "why did my strings explode into characters?" — testing for "iterable" instead of ~isinstance(item, list)~. Interviewers use this to check base-case discipline and type-checking judgment in recursion.`,
    starter: String.raw`def flatten(nested: list) -> list:
    """Flatten arbitrarily nested lists into one flat list (strings are atoms)."""
    raise NotImplementedError`,
    hints: [
      String.raw`Loop over the elements and ask one question per element: is this itself a list?`,
      String.raw`Use ~isinstance(item, list)~ — testing for "iterable" makes strings explode into characters.`,
      String.raw`~flat.extend(flatten(item))~ for sub-lists, ~flat.append(item)~ for everything else.`,
    ],
    solution: String.raw`def flatten(nested: list) -> list:
    flat: list = []
    for item in nested:
        if isinstance(item, list):
            flat.extend(flatten(item))
        else:
            flat.append(item)
    return flat`,
    tests: [
      { name: "already flat list is unchanged", code: String.raw`res = flatten([1, 2, 3])
assert res == [1, 2, 3], f"got {res}"` },
      { name: "flattens deep nesting in order", code: String.raw`res = flatten([1, [2, [3, [4, [5]]]], 6])
assert res == [1, 2, 3, 4, 5, 6], f"got {res}"` },
      { name: "handles empty lists at any depth", code: String.raw`res = flatten([[], [1, []], [[]], 2])
assert res == [1, 2], f"got {res}"` },
      { name: "strings and tuples are atoms", code: String.raw`res = flatten(["ab", ["cd", (1, 2)]])
assert res == ["ab", "cd", (1, 2)], f"got {res}"` },
      { name: "survives 300 levels of nesting", code: String.raw`nested: list = [1]
for _ in range(300):
    nested = [nested]
res = flatten(nested)
assert res == [1], f"got {res}"` },
      { name: "empty outer list gives empty result", code: String.raw`res = flatten([])
assert res == [], f"expected [], got {res}"` },
    ],
  };

  // ================= Day 2 =================
  W.days.push({
    id: "w1d2",
    title: "Functions, Closures & Decorators",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w1d2-lesson", minutes: 25 },
      { type: "quiz",     id: "w1d2-quiz",   minutes: 12 },
      { type: "exercise", id: "w1d2-e1",     minutes: 20 },
      { type: "exercise", id: "w1d2-e2",     minutes: 30 },
      { type: "exercise", id: "w1d2-e3",     minutes: 30, optional: true },
      { type: "cards",    deck: "python", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w1d2-lesson"] = {
    title: "Functions, Closures & Decorators",
    md: String.raw`There is a moment in many Python screens where the interviewer says: "Now add caching — without touching the function body." That sentence is a decorator test, and decorators are just the visible tip of a deeper skill: treating functions as ordinary objects you can pass, store, build, and wrap. Get that model right and closures, ~*args~, and three-layer decorators stop being magic.

### Functions are objects with jobs

A ~def~ statement creates an object and binds a name to it — nothing more. You can pass functions, keep them in dicts, return them. Two idioms fall straight out of this and show up in interviews constantly:

~~~python
# 1) sort keys: a function handed to sorted
words = ["kiwi", "fig", "banana", "date"]
print(sorted(words, key=len))                 # shortest first
print(sorted(words, key=lambda w: (len(w), w)))  # tie-break alphabetically

# 2) dispatch tables instead of if/elif ladders
def start_job(): return "starting"
def stop_job(): return "stopping"

handlers = {"start": start_job, "stop": stop_job}
print(handlers["start"]())                    # starting
~~~

A ~lambda~ is nothing special — a single-expression function without a name. If the logic needs two lines, give it a ~def~ and a real name.

### Signatures that survive code review

~*args~ collects extra positional arguments into a tuple; ~**kwargs~ collects extra keyword arguments into a dict. Together they let wrappers forward *anything*. On the calling side, ~*~ and ~**~ unpack in the opposite direction:

~~~python
def show(*args, **kwargs):
    return f"args={args} kwargs={kwargs}"

print(show(1, 2, mode="fast"))   # args=(1, 2) kwargs={'mode': 'fast'}

pair = (3, 4)
print(show(*pair))               # unpacking at the call site
~~~

A bare ~*~ in the middle of a signature makes everything after it keyword-only — the fix for unreadable calls like ~resize(img, 64, 64, True, False)~:

~~~python
def resize(image, *, width: int, height: int, keep_aspect: bool = True):
    ...

resize(img, width=64, height=64)     # self-documenting
# resize(img, 64, 64)  → TypeError: takes 1 positional argument
~~~

### The mutable default trap

Default values are evaluated **once**, when ~def~ runs — not per call. A mutable default is therefore shared across every call of the function:

~~~python
def append_to(item, bucket=[]):      # ONE list, created at def time
    bucket.append(item)
    return bucket

print(append_to(1))   # [1]
print(append_to(2))   # [1, 2]  — same list as last time!
~~~

The idiomatic fix is a ~None~ sentinel:

~~~python
def append_to(item, bucket: list | None = None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
~~~

This is arguably the single most-asked Python gotcha in interviews. Know the *why*: the default lives on the function object itself.

### Closures and late binding

A closure is an inner function that keeps access to variables of its enclosing scope after the outer function has returned. Reading captured variables just works; *rebinding* them needs ~nonlocal~, otherwise Python decides the name is local to the inner function and you get ~UnboundLocalError~:

~~~python
def make_counter():
    count = 0
    def bump() -> int:
        nonlocal count       # delete this line → UnboundLocalError
        count += 1
        return count
    return bump

c = make_counter()
c(); print(c())              # 2 — state survives between calls, no class needed
~~~

The famous trap: closures capture the **variable**, not its value at capture time. All three lambdas below see the same ~i~, which finished the loop at 2:

~~~python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])          # [2, 2, 2]  — late binding

funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])          # [0, 1, 2]  — default arg freezes the value
~~~

### Decorators, layer by layer

A decorator is a function that takes a function and returns a replacement. The ~@~ syntax is pure sugar: ~@timed~ above ~def crunch~ means exactly ~crunch = timed(crunch)~.

~~~python
import functools
import time

def timed(func):
    @functools.wraps(func)               # copy __name__, __doc__ onto wrapper
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        wrapper.last_elapsed = time.perf_counter() - start
        return result
    return wrapper
~~~

Without ~functools.wraps~, every decorated function reports its name as ~wrapper~ — debuggers, tracebacks, and doc tools all suffer. It is one line; always write it.

A decorator **with parameters** is one layer deeper — a factory that returns a decorator:

~~~python
def repeat(times: int):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = None
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(times=3)
def greet(): print("hi")
~~~

Read it inside-out: ~repeat(times=3)~ runs first and returns ~decorator~, which then wraps ~greet~. Three ~def~ layers, each with a single clear job.

### ⚠️ Common pitfalls

- Mutable default arguments are shared across calls — default values are evaluated once at ~def~ time.
- Rebinding a captured variable without ~nonlocal~ raises ~UnboundLocalError~ at runtime.
- Loop-made lambdas all see the loop variable's final value (late binding) — freeze with a default argument.
- Forgetting ~functools.wraps~ silently destroys ~__name__~ and ~__doc__~ of everything you decorate.
- Writing ~@repeat~ instead of ~@repeat(3)~ for parametrized decorators — the function itself becomes the argument to the factory, and the error appears far from the cause.

### 🎤 In interviews, they ask

- "Why does a default argument of ~[]~ keep its contents between calls, and what is the fix?"
- "Write a decorator that counts calls / times execution / caches results."
- "What does ~functools.wraps~ do and what breaks without it?"
- "Why do all the lambdas created in my loop return the same value?"
- "When would you make arguments keyword-only?"

### TL;DR

- Functions are objects: store them in dicts, pass them as sort keys, return them from factories.
- ~*args~ / ~**kwargs~ collect at the def site and unpack at the call site — the plumbing of every wrapper.
- Default values evaluate once; use ~None~ as the sentinel for mutable defaults.
- Closures capture variables, not values; rebinding needs ~nonlocal~; freeze loop values with ~i=i~.
- ~@deco~ is exactly ~f = deco(f)~; parametrized decorators are factories returning decorators.
- Always ~functools.wraps~ your wrappers.

### Go deeper

- [functools — wraps, lru_cache, partial](https://docs.python.org/3/library/functools.html)
- [Primer on Python decorators — Real Python](https://realpython.com/primer-on-python-decorators/)
- [Defining functions — official tutorial](https://docs.python.org/3/tutorial/controlflow.html)
`,
  };

  W.quizzes["w1d2-quiz"] = [
    {
      q: String.raw`What does this print?

~~~python
def add(x, acc=[]):
    acc.append(x)
    return acc

print(add(1))
print(add(2))
~~~`,
      options: [
        "[1] then [1, 2]",
        "[1] then [2]",
        "[1] then [1]",
        "It raises a TypeError",
      ],
      answer: 0,
      explain: String.raw`The default list is created once, when ~def~ executes, and lives on the function object. Every call without an explicit ~acc~ mutates that same list, so state leaks across calls. The fix is a ~None~ sentinel plus a fresh list inside the body.`,
    },
    {
      q: String.raw`What does this print?

~~~python
funcs = [lambda: i for i in range(3)]
print(funcs[0](), funcs[1](), funcs[2]())
~~~`,
      options: ["0 1 2", "0 0 0", "2 2 2", "It raises a NameError"],
      answer: 2,
      explain: String.raw`Closures capture the variable ~i~ itself, not its value at creation time — this is late binding. By the time any lambda runs, the loop has finished and ~i~ is 2. Freeze the current value with a default argument: ~lambda i=i: i~.`,
    },
    {
      q: String.raw`What does ~functools.wraps~ actually do?`,
      options: [
        "Makes the wrapper faster by caching results",
        "Copies metadata like ~__name__~ and ~__doc__~ from the wrapped function onto the wrapper",
        "It is required syntax — decorators raise at definition time without it",
        "Automatically forwards ~*args~ and ~**kwargs~ to the wrapped function",
      ],
      answer: 1,
      explain: String.raw`~wraps~ is itself a decorator that copies identity metadata (name, docstring, module, qualname) onto your wrapper, so tracebacks, ~help()~, and debuggers show the real function. Decorators work without it — they just produce anonymous-looking ~wrapper~ functions everywhere. Forwarding arguments is your job, not its.`,
    },
    {
      q: String.raw`Given ~def resize(img, *, width, height): ...~ — which call succeeds?`,
      options: [
        "resize(img, 100, 200)",
        "resize(img, 100, height=200)",
        "resize(*img, 100, 200)",
        "resize(img, width=100, height=200)",
      ],
      answer: 3,
      explain: String.raw`The bare ~*~ makes every parameter after it keyword-only, so ~width~ and ~height~ must be passed by name; positional attempts raise TypeError. This pattern keeps call sites self-documenting, especially for flags and dimensions.`,
    },
    {
      q: String.raw`What happens here?

~~~python
def make():
    n = 0
    def bump():
        n += 1
        return n
    return bump

b = make()
print(b())
~~~`,
      options: [
        "It raises UnboundLocalError",
        "It prints 1",
        "It prints 0",
        "It raises NameError at definition time",
      ],
      answer: 0,
      explain: String.raw`~n += 1~ assigns to ~n~, which makes ~n~ local to ~bump~ in the compiler's eyes — so the read side of ~+=~ finds an uninitialized local and raises UnboundLocalError. Declaring ~nonlocal n~ tells Python to rebind the enclosing variable instead.`,
    },
    {
      q: String.raw`What is ~@deco~ placed above ~def f(): ...~ exactly equivalent to?`,
      options: [
        "f = deco()",
        "deco(f) is called and the result is discarded",
        "f = deco(f), executed right after the def statement",
        "f.decorator = deco",
      ],
      answer: 2,
      explain: String.raw`Decorator syntax is pure sugar: define ~f~, call ~deco(f)~, rebind the name ~f~ to whatever comes back. That is why decorators can return a wrapper, the original function, or anything else — the name simply gets reassigned.`,
    },
    {
      q: String.raw`You need words sorted shortest-first, with ties broken alphabetically. Which call is right?`,
      options: [
        "sorted(words, key=lambda w: (w, len(w)))",
        "sorted(words, key=lambda w: (len(w), w))",
        "sorted(words, cmp=lambda a, b: len(a) - len(b))",
        "words.sort(key=len, reverse=True)",
      ],
      answer: 1,
      explain: String.raw`Tuple keys compare element by element, so ~(len(w), w)~ means "by length, then alphabetically" in one pass. Putting the word first would sort alphabetically and almost ignore length. ~cmp~ died with Python 2, and ~reverse=True~ gives longest-first.`,
    },
  ];

  W.exercises["w1d2-e1"] = {
    title: "Closure factories: accumulator and counter",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Build stateful functions with closures and nonlocal — no classes allowed.",
    description: String.raw`Implement two factory functions that manufacture stateful functions using **closures** (no classes, no globals).

**1.** ~make_accumulator()~ returns a function ~add(x)~ that returns the running total of everything passed so far.

**2.** ~make_counter()~ returns a function that returns ~1~, ~2~, ~3~, ... on successive calls.

Each manufactured function carries its own independent state.

~~~python
acc = make_accumulator()
acc(10)   # 10
acc(5)    # 15

c1, c2 = make_counter(), make_counter()
c1()      # 1
c1()      # 2
c2()      # 1   — independent state
~~~

Interview angle: the fastest possible probe of whether you truly understand closures — where the state lives, why every factory call creates a fresh cell, and exactly where ~nonlocal~ is required. Bonus points for saying "this is what classes do under the hood".`,
    starter: String.raw`from typing import Callable

def make_accumulator() -> Callable[[float], float]:
    """Return a function add(x) that returns the running total so far."""
    raise NotImplementedError

def make_counter() -> Callable[[], int]:
    """Return a function that returns 1, 2, 3, ... on successive calls."""
    raise NotImplementedError`,
    hints: [
      String.raw`Define a variable in the outer function and an inner function that updates it; return the inner function.`,
      String.raw`Rebinding an outer variable inside the inner function requires ~nonlocal~, or you get UnboundLocalError.`,
      String.raw`Each call to the factory runs the outer body again, creating a brand-new cell — that is why instances are independent.`,
    ],
    solution: String.raw`from typing import Callable

def make_accumulator() -> Callable[[float], float]:
    total = 0.0
    def add(x: float) -> float:
        nonlocal total
        total += x
        return total
    return add

def make_counter() -> Callable[[], int]:
    count = 0
    def bump() -> int:
        nonlocal count
        count += 1
        return count
    return bump`,
    tests: [
      { name: "accumulator keeps a running total", code: String.raw`acc = make_accumulator()
assert acc(10) == 10, f"first call: expected 10, got {acc}"
assert acc(5) == 15, "10 + 5 should be 15"
assert acc(-3) == 12, "15 - 3 should be 12"` },
      { name: "two accumulators are independent", code: String.raw`a1 = make_accumulator()
a2 = make_accumulator()
a1(100)
res = a2(1)
assert res == 1, f"a2 should start fresh, got {res}"
assert a1(0) == 100, "a1 total should still be 100"` },
      { name: "counter counts from one", code: String.raw`c = make_counter()
assert c() == 1, "first call should return 1"
assert c() == 2, "second call should return 2"
assert c() == 3, "third call should return 3"` },
      { name: "two counters are independent", code: String.raw`c1 = make_counter()
c2 = make_counter()
c1(); c1()
res = c2()
assert res == 1, f"c2 should start fresh, got {res}"` },
      { name: "accumulator handles floats", code: String.raw`import math
acc = make_accumulator()
acc(2.5)
res = acc(0.25)
assert math.isclose(res, 2.75), f"expected 2.75, got {res}"` },
    ],
  };

  W.exercises["w1d2-e2"] = {
    title: "memoize with hit/miss counters",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: [],
    brief: "Hand-roll lru_cache and expose observability counters on the wrapper.",
    description: String.raw`Implement a decorator ~memoize(func)~ that caches results by arguments and exposes cache statistics.

Requirements:

- Cache on both positional and keyword arguments: build the key from ~args~ plus the **sorted** ~kwargs~ items.
- Expose ~wrapper.hits~ and ~wrapper.misses~ integer attributes, starting at 0.
- A cache hit returns the stored result without calling the function.
- Preserve the wrapped function's metadata with ~functools.wraps~.

~~~python
@memoize
def slow_square(x):
    return x * x

slow_square(4)    # computed  → misses == 1
slow_square(4)    # cached    → hits == 1
~~~

Interview angle: "implement lru_cache from scratch" is a top-three decorator task. The counters force you to decide where mutable state lives (attributes on the wrapper — visible from outside), and recursion (memoized fib) proves you understand that the *name* fib now points at the wrapper.`,
    starter: String.raw`import functools

def memoize(func):
    """Cache results by arguments. Expose wrapper.hits and wrapper.misses."""
    raise NotImplementedError`,
    hints: [
      String.raw`Keep a dict in the enclosing scope; the wrapper closes over it. Key = (args, tuple(sorted(kwargs.items()))).`,
      String.raw`Attach the counters to the wrapper function object itself (wrapper.hits = 0) after defining it — attributes on functions are legal and visible to callers.`,
      String.raw`Check the cache first: on hit increment hits and return; on miss increment misses, compute, store, return.`,
    ],
    solution: String.raw`import functools

def memoize(func):
    cache: dict = {}

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        key = (args, tuple(sorted(kwargs.items())))
        if key in cache:
            wrapper.hits += 1
            return cache[key]
        wrapper.misses += 1
        result = func(*args, **kwargs)
        cache[key] = result
        return result

    wrapper.hits = 0
    wrapper.misses = 0
    return wrapper`,
    tests: [
      { name: "returns correct results", code: String.raw`@memoize
def add(a, b):
    return a + b

assert add(2, 3) == 5, "first call computes"
assert add(2, 3) == 5, "second call must return the cached value"` },
      { name: "counts misses then hits", code: String.raw`@memoize
def double(x):
    return 2 * x

double(3)
double(3)
double(4)
assert double.misses == 2, f"expected 2 misses, got {double.misses}"
assert double.hits == 1, f"expected 1 hit, got {double.hits}"` },
      { name: "distinct arguments get distinct entries", code: String.raw`@memoize
def square(x):
    return x * x

assert square(2) == 4 and square(3) == 9, "different args, different results"
assert square.misses == 2, f"expected 2 misses, got {square.misses}"
assert square.hits == 0, f"expected 0 hits, got {square.hits}"` },
      { name: "recursive fibonacci computes each value once", code: String.raw`calls = []

@memoize
def fib(n):
    calls.append(n)
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

assert fib(15) == 610, "fib(15) should be 610"
assert len(calls) == 16, f"expected 16 raw computations (0..15), got {len(calls)}"` },
      { name: "keyword arguments participate in the key", code: String.raw`@memoize
def combine(a, b=0):
    return a + b

combine(1, b=2)
combine(1, b=2)
assert combine.misses == 1, f"expected 1 miss, got {combine.misses}"
assert combine.hits == 1, f"expected 1 hit, got {combine.hits}"` },
      { name: "wraps preserves function metadata", code: String.raw`@memoize
def documented(x):
    """Squares things."""
    return x * x

assert documented.__name__ == "documented", f"got {documented.__name__}"
assert "Squares" in (documented.__doc__ or ""), "docstring should survive"` },
      { name: "two decorated functions do not share state", code: String.raw`@memoize
def f(x):
    return x

@memoize
def g(x):
    return -x

f(1); f(1); g(5)
assert f.hits == 1 and f.misses == 1, f"f stats wrong: {f.hits}/{f.misses}"
assert g.hits == 0 and g.misses == 1, f"g stats wrong: {g.hits}/{g.misses}"` },
    ],
  };

  W.exercises["w1d2-e3"] = {
    title: "retry decorator with attempt tracking",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: [],
    brief: "A parametrized, exception-filtered retry decorator — pure control flow, no sleeping.",
    description: String.raw`Implement ~retry(exceptions, max_attempts=3)~ — a decorator **factory**.

Behavior of the decorated function:

- Call the wrapped function; if it raises one of ~exceptions~ (a single exception class or a tuple of them), try again — up to ~max_attempts~ **total** calls.
- If the last allowed attempt still raises, re-raise that exception.
- Exceptions NOT listed propagate immediately, with no extra calls.
- Expose ~wrapper.attempts~ — the number of calls made during the most recent invocation.
- No sleeping, no backoff — pure control flow. Use ~functools.wraps~.

~~~python
@retry(ValueError, max_attempts=3)
def flaky():
    ...

flaky()          # may call the body up to 3 times
flaky.attempts   # calls used by that last invocation
~~~

Interview angle: parametrized decorators (three nested defs) plus precise exception filtering is a realistic production task; interviewers check that you know ~except~ needs a tuple, not a list, and that you re-raise with a bare ~raise~ to preserve the traceback.`,
    starter: String.raw`import functools

def retry(exceptions, max_attempts: int = 3):
    """Retry on the given exception type(s), up to max_attempts total calls.

    The decorated function gets an .attempts attribute: number of calls
    made during the most recent invocation. No sleeping.
    """
    raise NotImplementedError`,
    hints: [
      String.raw`Three layers: retry(...) returns decorator; decorator(func) returns wrapper; wrapper does the loop.`,
      String.raw`Normalize a single exception class into a 1-tuple so ~except exceptions:~ always receives a tuple.`,
      String.raw`Loop attempt = 1..max_attempts, set wrapper.attempts = attempt first, then try/except: re-raise with bare ~raise~ when attempt == max_attempts.`,
    ],
    solution: String.raw`import functools

def retry(exceptions, max_attempts: int = 3):
    if isinstance(exceptions, type):
        exceptions = (exceptions,)

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                wrapper.attempts = attempt
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == max_attempts:
                        raise
        wrapper.attempts = 0
        return wrapper

    return decorator`,
    tests: [
      { name: "succeeds after transient failures", code: String.raw`failures = [ValueError("boom"), ValueError("boom")]

@retry(ValueError, max_attempts=5)
def flaky():
    if failures:
        raise failures.pop(0)
    return "ok"

res = flaky()
assert res == "ok", f"expected 'ok', got {res}"
assert flaky.attempts == 3, f"expected 3 attempts, got {flaky.attempts}"` },
      { name: "exhausts attempts and re-raises", code: String.raw`calls = []

@retry(KeyError, max_attempts=3)
def always_fails():
    calls.append(1)
    raise KeyError("nope")

try:
    always_fails()
    raised = False
except KeyError:
    raised = True
assert raised, "KeyError should escape after the final attempt"
assert len(calls) == 3, f"expected exactly 3 calls, got {len(calls)}"` },
      { name: "unlisted exceptions propagate immediately", code: String.raw`calls = []

@retry(ValueError, max_attempts=5)
def wrong_kind():
    calls.append(1)
    raise TypeError("different beast")

try:
    wrong_kind()
    raised = False
except TypeError:
    raised = True
assert raised, "TypeError is not retried and must propagate"
assert len(calls) == 1, f"expected exactly 1 call, got {len(calls)}"` },
      { name: "first-try success records one attempt", code: String.raw`@retry(ValueError, max_attempts=3)
def solid(x):
    return x * 2

assert solid(21) == 42, "return value must pass through"
assert solid.attempts == 1, f"expected 1 attempt, got {solid.attempts}"` },
      { name: "accepts a tuple of exception types", code: String.raw`failures = [ValueError("a"), KeyError("b")]

@retry((ValueError, KeyError), max_attempts=4)
def multi():
    if failures:
        raise failures.pop(0)
    return "done"

assert multi() == "done", "should survive both exception kinds"
assert multi.attempts == 3, f"expected 3 attempts, got {multi.attempts}"` },
      { name: "wraps preserves the function name", code: String.raw`@retry(ValueError)
def named_thing():
    return 1

assert named_thing.__name__ == "named_thing", f"got {named_thing.__name__}"` },
    ],
  };

  // ================= Day 3 =================
  W.days.push({
    id: "w1d3",
    title: "OOP I — Classes That Feel Native",
    minutes: 122,
    blocks: [
      { type: "lesson",   id: "w1d3-lesson", minutes: 25 },
      { type: "quiz",     id: "w1d3-quiz",   minutes: 12 },
      { type: "exercise", id: "w1d3-e1",     minutes: 25 },
      { type: "exercise", id: "w1d3-e2",     minutes: 30 },
      { type: "exercise", id: "w1d3-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "python", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w1d3-lesson"] = {
    title: "OOP I — Classes That Feel Native",
    md: String.raw`Interviewers rarely say the word "OOP". They hand you a tiny class — a Point, a Money, a Card — and watch whether your objects behave like Python's own: printable, comparable, hashable, sliceable. That is the real test. Python's object model is a set of protocols (dunder methods), and fluency means knowing which protocol powers which syntax.

### The identity trio: __init__, __repr__, __str__

~__repr__~ is the developer view: unambiguous, ideally "looks like the constructor call". ~__str__~ is the user view. If ~__str__~ is missing, ~print~ falls back to ~__repr__~ — and containers *always* show the repr of their elements. So the rule is: define ~__repr__~ first, add ~__str__~ only when you need a prettier public face.

~~~python
class User:
    def __init__(self, name: str, karma: int = 0):
        self.name = name
        self.karma = karma

    def __repr__(self) -> str:
        return f"User({self.name!r}, karma={self.karma})"

print([User("ada")])    # [User('ada', karma=0)] — repr, even inside print
~~~

The ~!r~ conversion calls repr on the field — strings get quotes, so the output is paste-back-into-Python valid.

### The __eq__ / __hash__ contract

By default ~==~ between instances is identity — two structurally identical objects compare unequal. Define ~__eq__~ to fix that, and follow two rules interviewers listen for:

~~~python
class Card:
    def __init__(self, rank: str, suit: str):
        self.rank, self.suit = rank, suit

    def __eq__(self, other):
        if not isinstance(other, Card):
            return NotImplemented        # let the other side try; not False
        return (self.rank, self.suit) == (other.rank, other.suit)

    def __hash__(self):
        return hash((self.rank, self.suit))
~~~

Rule one: return ~NotImplemented~ (not ~False~, and never raise) for foreign types — Python then asks the other object and finally falls back cleanly. Rule two: the contract — **if a == b then hash(a) == hash(b)**. The moment you define ~__eq__~, Python sets ~__hash__~ to ~None~: your instances become unhashable until you define a matching hash. That is deliberate protection, because a hash that disagrees with equality makes objects silently vanish in dicts and sets. Corollary: truly mutable objects should stay unhashable.

### @property — logic behind attribute syntax

Python's answer to getters and setters: start with plain attributes, and when you later need validation or computed values, upgrade to ~@property~ **without changing any caller**.

~~~python
class Temperature:
    def __init__(self, celsius: float):
        self.celsius = celsius            # routes through the setter below!

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < -273.15:
            raise ValueError(f"below absolute zero: {value}")
        self._celsius = float(value)

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9 / 5 + 32
~~~

Two details worth saying out loud in an interview: the real data lives in ~self._celsius~ (writing ~self.celsius~ inside the setter would recurse forever), and ~__init__~ assigning ~self.celsius~ deliberately reuses the validation — one code path for construction and mutation.

### Protocols: act like a container, get treated like one

Nothing in Python checks your class's ancestry before using it. Syntax dispatches to dunders: ~len(x)~ → ~__len__~, ~x[i]~ → ~__getitem__~, ~in~ → ~__contains__~, ~for~ → ~__iter__~ (or, if absent, repeated ~__getitem__~ with 0, 1, 2, ... until ~IndexError~ — the legacy protocol).

~~~python
class Playlist:
    def __init__(self, tracks: list[str]):
        self._tracks = list(tracks)

    def __len__(self):
        return len(self._tracks)

    def __getitem__(self, index):
        return self._tracks[index]   # ints AND slices, delegated to list

    def __contains__(self, track):
        return track in self._tracks
~~~

With those three methods: ~len(p)~, ~p[0]~, ~p[-1]~, ~p[2:5]~, ~"song" in p~, and even ~for t in p~ all work. This is duck typing — implement the protocol, inherit the ecosystem.

### dataclasses: the boilerplate killer

For classes that are mostly data, ~@dataclass~ generates ~__init__~, ~__repr__~, and ~__eq__~ from the annotations:

~~~python
from dataclasses import dataclass, field

@dataclass(frozen=True)
class Item:
    name: str
    power: int = 0
    tags: list[str] = field(default_factory=list)
~~~

~frozen=True~ makes instances immutable (assignment raises ~FrozenInstanceError~) and — combined with the generated ~__eq__~ — gives you a correct ~__hash__~ for free, so frozen dataclasses can live in sets and dict keys. And note ~default_factory~: writing ~tags: list = []~ raises ~ValueError~ at class-definition time, because a shared mutable default is exactly yesterday's default-argument trap at class scale.

### ⚠️ Common pitfalls

- Returning ~False~ (or raising) in ~__eq__~ for foreign types instead of ~NotImplemented~ — breaks symmetric comparisons.
- Defining ~__eq__~ and forgetting ~__hash__~: instances silently become unhashable.
- Violating the contract (equal objects, different hashes) — objects get lost in dicts and sets.
- Assigning ~self.celsius~ inside the ~celsius~ setter — infinite recursion; store in ~self._celsius~.
- ~tags: list = []~ in a dataclass — ~ValueError~; use ~field(default_factory=list)~.
- Forgetting that containers display elements via ~__repr__~, not ~__str__~.

### 🎤 In interviews, they ask

- "Implement ~__eq__~ and ~__hash__~ for a Money class. What is the contract between them?"
- "What is the difference between ~__repr__~ and ~__str__~, and which does a list display use?"
- "Why did my instances become unhashable after I added ~__eq__~?"
- "How do properties compare to Java-style getters and setters?"
- "What does ~@dataclass(frozen=True)~ generate for you, and when do you reach for it?"

### TL;DR

- ~__repr__~ is for developers and containers; make it look like the constructor call, with ~!r~ on strings.
- Default equality is identity; ~__eq__~ + matching ~__hash__~ is a contract — equal objects must hash equal.
- Return ~NotImplemented~ from comparison dunders for foreign types.
- ~@property~ upgrades attributes to validated/computed access without touching callers; keep data in ~_private~.
- ~__len__~ / ~__getitem__~ / ~__contains__~ / ~__iter__~ make your class feel native — slicing and ~in~ come almost free.
- ~@dataclass~ generates the boilerplate; ~frozen=True~ adds immutability and hashability; mutable defaults need ~default_factory~.

### Go deeper

- [Data model — special method names](https://docs.python.org/3/reference/datamodel.html#special-method-names)
- [dataclasses — official docs](https://docs.python.org/3/library/dataclasses.html)
- [Data classes guide — Real Python](https://realpython.com/python-data-classes/)
- [Built-in functions: property](https://docs.python.org/3/library/functions.html#property)
`,
  };

  W.quizzes["w1d3-quiz"] = [
    {
      q: String.raw`What does this print?

~~~python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

a = Point(1, 2)
b = Point(1, 2)
print(a == b, a is b)
~~~`,
      options: ["True True", "True False", "False False", "False True"],
      answer: 2,
      explain: String.raw`Without a custom ~__eq__~, equality falls back to identity — and these are two distinct objects, so both ~==~ and ~is~ are False. Structural equality only appears when you define ~__eq__~ (or use a dataclass, which generates it).`,
    },
    {
      q: String.raw`You print a list of your objects and see ~<__main__.User object at 0x10...>~. Which method controls what appears inside container displays?`,
      options: ["__repr__", "__str__", "__format__", "__init__"],
      answer: 0,
      explain: String.raw`Containers always render their elements with ~repr~, never ~str~. That is why the rule of thumb is to always define ~__repr__~ (developer view); ~print(obj)~ falls back to it when ~__str__~ is absent.`,
    },
    {
      q: String.raw`You add ~__eq__~ to a class and suddenly instances cannot be put into a set. Why?`,
      options: [
        "Sets require ~__lt__~ for ordering elements",
        "~__eq__~ must return NotImplemented for sets to work",
        "Sets only accept built-in immutable types",
        "Defining ~__eq__~ sets ~__hash__~ to None — instances become unhashable until you define a matching hash",
      ],
      answer: 3,
      explain: String.raw`Python enforces the eq/hash contract defensively: a class with custom equality but inherited identity-hash would break dict and set lookups, so ~__hash__~ is nulled out. Define ~__hash__~ over the same fields ~__eq__~ compares (or use a frozen dataclass) to restore hashability.`,
    },
    {
      q: String.raw`What happens on the last line?

~~~python
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    depth: int

c = Config(3)
c.depth = 5
~~~`,
      options: [
        "It succeeds silently — dataclasses are mutable",
        "It raises dataclasses.FrozenInstanceError",
        "It raises TypeError: 'Config' object is immutable",
        "It raises ValueError at class-definition time",
      ],
      answer: 1,
      explain: String.raw`~frozen=True~ generates a ~__setattr__~ that raises ~FrozenInstanceError~ (a subclass of AttributeError) on any assignment after ~__init__~. The reward for immutability: combined with the generated ~__eq__~, frozen dataclasses also get a working ~__hash__~.`,
    },
    {
      q: String.raw`What does this print?

~~~python
class Squares:
    def __init__(self, n):
        self.n = n
    def __getitem__(self, i):
        if i >= self.n:
            raise IndexError
        return i * i

print(list(Squares(3)))
~~~`,
      options: [
        "It raises TypeError: 'Squares' object is not iterable",
        "[]",
        "[0, 1, 4]",
        "[1, 4, 9]",
      ],
      answer: 2,
      explain: String.raw`When ~__iter__~ is missing, Python falls back to the legacy iteration protocol: it calls ~__getitem__~ with 0, 1, 2, ... until IndexError stops the loop. So the class is iterable "for free" and yields 0, 1, 4.`,
    },
    {
      q: String.raw`Which is the right reason to convert a plain attribute into a ~@property~?`,
      options: [
        "You need validation or a computed value while callers keep plain attribute syntax",
        "Properties make attribute access faster than plain attributes",
        "Public attributes are unsafe in Python, so everything should be a property",
        "Properties are required for dataclass fields to work",
      ],
      answer: 0,
      explain: String.raw`The Pythonic path: start with public attributes, and when logic becomes necessary, swap in a property — callers never notice. Properties add a function call (slightly slower, not faster), and wrapping everything preemptively is Java-style noise Python deliberately avoids.`,
    },
    {
      q: String.raw`Inside a ~@dataclass~, why does ~tags: list = []~ raise ValueError at class-definition time?`,
      options: [
        "Lists cannot be dataclass fields at all",
        "A single shared list would leak state between instances — you must use field(default_factory=list)",
        "The type hint needs a parameter, like list[str], before defaults are allowed",
        "Dataclasses only allow immutable field types as defaults",
      ],
      answer: 1,
      explain: String.raw`It is the mutable-default-argument trap at class scale: one list object would be shared by every instance. Dataclasses refuse to compile it and make you spell ~field(default_factory=list)~, which runs the factory per instance.`,
    },
  ];

  W.exercises["w1d3-e1"] = {
    title: "Vector2D with operator overloading",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Make a 2D vector feel like a number: +, -, scalar *, ==, abs().",
    description: String.raw`Implement a class ~Vector2D(x, y)~ supporting natural math syntax:

- ~v1 + v2~ and ~v1 - v2~ — componentwise, returning a **new** ~Vector2D~.
- ~v * 3~ and ~3 * v~ — scalar multiplication from either side (~__mul__~ + ~__rmul__~).
- ~v1 == v2~ — componentwise equality; comparison with a non-vector must be ~False~ (return ~NotImplemented~, do not raise). Multiplying two vectors must raise TypeError naturally — return ~NotImplemented~ for non-scalar operands.
- ~abs(v)~ — the euclidean length.
- ~repr(Vector2D(3, 4))~ is exactly ~"Vector2D(3, 4)"~.

~~~python
v = Vector2D(3, 4)
abs(v)                 # 5.0
2 * v                  # Vector2D(6, 8)
v + Vector2D(1, 1)     # Vector2D(4, 5)
~~~

Interview angle: operator overloading via dunders is the standard "do you know the data model" probe, and the graceful-failure detail — returning ~NotImplemented~ instead of raising — is what separates senior answers from cargo-cult ones.`,
    starter: String.raw`import math

class Vector2D:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    # __repr__, __eq__, __add__, __sub__, __mul__, __rmul__, __abs__
    # your code here
    def __repr__(self) -> str:
        raise NotImplementedError`,
    hints: [
      String.raw`Each operator dunder should build and return a new Vector2D — never mutate self.`,
      String.raw`In __eq__ and __mul__, check the operand type first; if it is foreign, return NotImplemented so Python can fall back (== becomes False, * becomes TypeError).`,
      String.raw`__rmul__ can simply reuse __mul__ (scalar * vector is commutative); abs is math.hypot(self.x, self.y).`,
    ],
    solution: String.raw`import math

class Vector2D:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def __repr__(self) -> str:
        return f"Vector2D({self.x!r}, {self.y!r})"

    def __eq__(self, other):
        if not isinstance(other, Vector2D):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __add__(self, other):
        if not isinstance(other, Vector2D):
            return NotImplemented
        return Vector2D(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        if not isinstance(other, Vector2D):
            return NotImplemented
        return Vector2D(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar):
        if not isinstance(scalar, (int, float)):
            return NotImplemented
        return Vector2D(self.x * scalar, self.y * scalar)

    __rmul__ = __mul__

    def __abs__(self) -> float:
        return math.hypot(self.x, self.y)`,
    tests: [
      { name: "adds and subtracts componentwise", code: String.raw`a = Vector2D(1, 2)
b = Vector2D(3, 4)
assert a + b == Vector2D(4, 6), f"got {a + b!r}"
assert b - a == Vector2D(2, 2), f"got {b - a!r}"` },
      { name: "addition returns a new vector, no mutation", code: String.raw`a = Vector2D(1, 2)
b = Vector2D(3, 4)
c = a + b
assert (a.x, a.y) == (1, 2), f"a was mutated: {(a.x, a.y)}"
assert c is not a and c is not b, "must return a fresh Vector2D"` },
      { name: "scalar multiplication works from both sides", code: String.raw`v = Vector2D(3, 4)
assert v * 2 == Vector2D(6, 8), f"got {v * 2!r}"
assert 2 * v == Vector2D(6, 8), f"got {2 * v!r}"
assert v * 0.5 == Vector2D(1.5, 2.0), f"got {v * 0.5!r}"` },
      { name: "equality is structural and safe with foreign types", code: String.raw`assert Vector2D(1, 2) == Vector2D(1, 2), "equal components should be =="
assert Vector2D(1, 2) != Vector2D(1, 3), "different components should be !="
assert (Vector2D(1, 2) == (1, 2)) is False, "comparing with a tuple must be False, not a crash"` },
      { name: "abs gives euclidean length", code: String.raw`import math
assert math.isclose(abs(Vector2D(3, 4)), 5.0), f"got {abs(Vector2D(3, 4))}"
assert math.isclose(abs(Vector2D(0, 0)), 0.0), "zero vector has length 0"` },
      { name: "repr looks like the constructor call", code: String.raw`r = repr(Vector2D(3, 4))
assert r == "Vector2D(3, 4)", f"got {r!r}"` },
      { name: "multiplying two vectors raises TypeError", code: String.raw`try:
    Vector2D(1, 2) * Vector2D(3, 4)
    raised = False
except TypeError:
    raised = True
assert raised, "vector * vector should raise TypeError (return NotImplemented)"` },
    ],
  };

  W.exercises["w1d3-e2"] = {
    title: "A Deck that feels like a list",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: [],
    brief: "Container protocols + a frozen dataclass Card + seeded, reproducible shuffle.",
    description: String.raw`Build a standard 52-card deck out of two pieces.

**1.** ~Card~ — a **frozen dataclass** with fields ~rank: str~ and ~suit: str~ (frozen makes it hashable, so cards can live in sets).

**2.** ~Deck~ — builds all 52 cards in a fixed order and implements the container protocols:

- Ranks: ~"2"~ ... ~"10"~, ~"J"~, ~"Q"~, ~"K"~, ~"A"~ (13). Suits: ~"clubs"~, ~"diamonds"~, ~"hearts"~, ~"spades"~ (4).
- Build order: for each suit in the order above, all 13 ranks low to high. So ~deck[0]~ is the 2 of clubs and ~deck[-1]~ the ace of spades.
- ~__len__~, ~__getitem__~ (ints, negative ints, AND slices — delegate to the inner list), ~__iter__~.
- ~shuffle(seed)~ — shuffle in place **deterministically** using ~random.Random(seed)~; the same seed must always produce the same order.

~~~python
deck = Deck()
len(deck)        # 52
deck[0]          # Card(rank='2', suit='clubs')
deck.shuffle(42) # reproducible re-order
~~~

Interview angle: this is the canonical "make your class feel native" exercise (straight out of Fluent Python's opening chapter). The seeded-shuffle detail tests a production habit: never use the global random state when reproducibility matters.`,
    starter: String.raw`import random
from dataclasses import dataclass

RANKS = ("2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A")
SUITS = ("clubs", "diamonds", "hearts", "spades")

@dataclass(frozen=True)
class Card:
    rank: str
    suit: str

class Deck:
    def __init__(self):
        # build self._cards: 13 ranks for each suit, suits in SUITS order
        raise NotImplementedError

    def shuffle(self, seed: int) -> None:
        raise NotImplementedError`,
    hints: [
      String.raw`Build the cards with one comprehension: for suit in SUITS, for rank in RANKS — suit loop on the outside.`,
      String.raw`Delegate __getitem__ straight to the inner list (return self._cards[index]) and slices work for free.`,
      String.raw`random.Random(seed) is a private generator — call .shuffle(self._cards) on it; the global random.shuffle would not be reproducible in isolation.`,
    ],
    solution: String.raw`import random
from dataclasses import dataclass
from typing import Iterator

RANKS = ("2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A")
SUITS = ("clubs", "diamonds", "hearts", "spades")

@dataclass(frozen=True)
class Card:
    rank: str
    suit: str

class Deck:
    def __init__(self):
        self._cards = [Card(rank, suit) for suit in SUITS for rank in RANKS]

    def __len__(self) -> int:
        return len(self._cards)

    def __getitem__(self, index):
        return self._cards[index]

    def __iter__(self) -> Iterator[Card]:
        return iter(self._cards)

    def shuffle(self, seed: int) -> None:
        random.Random(seed).shuffle(self._cards)`,
    tests: [
      { name: "fresh deck has 52 unique cards", code: String.raw`deck = Deck()
assert len(deck) == 52, f"expected 52 cards, got {len(deck)}"
assert len(set(deck)) == 52, "all cards must be distinct (Card must be frozen/hashable)"` },
      { name: "build order: 2 of clubs first, ace of spades last", code: String.raw`deck = Deck()
assert deck[0] == Card("2", "clubs"), f"got {deck[0]!r}"
assert deck[-1] == Card("A", "spades"), f"got {deck[-1]!r}"
assert deck[13] == Card("2", "diamonds"), f"second suit should start at index 13, got {deck[13]!r}"` },
      { name: "slicing returns a list of cards", code: String.raw`deck = Deck()
top = deck[:3]
assert isinstance(top, list), f"slice should give a list, got {type(top).__name__}"
assert top == [Card("2", "clubs"), Card("3", "clubs"), Card("4", "clubs")], f"got {top!r}"` },
      { name: "iteration visits 13 cards of each suit", code: String.raw`from collections import Counter
deck = Deck()
by_suit = Counter(card.suit for card in deck)
assert by_suit["hearts"] == 13, f"expected 13 hearts, got {by_suit['hearts']}"
assert len(by_suit) == 4, f"expected 4 suits, got {len(by_suit)}"` },
      { name: "same seed produces identical order", code: String.raw`d1 = Deck()
d2 = Deck()
d1.shuffle(123)
d2.shuffle(123)
assert list(d1) == list(d2), "same seed must give the same order"
assert list(d1) != list(Deck()), "shuffle(123) should change the fresh order"` },
      { name: "shuffling preserves the multiset of cards", code: String.raw`deck = Deck()
deck.shuffle(7)
assert len(deck) == 52, f"card count changed: {len(deck)}"
assert set(deck) == set(Deck()), "shuffle must not add, drop, or duplicate cards"` },
    ],
  };

  W.exercises["w1d3-e3"] = {
    title: "Temperature with validating properties",
    difficulty: 1,
    xp: 20,
    minutes: 20,
    packages: [],
    brief: "Two linked properties, one source of truth, physics-enforcing validation.",
    description: String.raw`Implement a ~Temperature~ class with celsius and fahrenheit views over a single stored value.

- ~Temperature(celsius)~ — construct from celsius (default ~0.0~).
- ~t.celsius~ — property; its setter rejects values below absolute zero (~-273.15~) with ~ValueError~. Exactly ~-273.15~ is allowed.
- ~t.fahrenheit~ — computed property: ~celsius * 9 / 5 + 32~; its setter converts back and stores celsius (reusing the same validation).
- Construction must route through the validating setter, so ~Temperature(-500)~ raises too.

~~~python
t = Temperature(25)
t.fahrenheit        # 77.0
t.fahrenheit = 32   # t.celsius is now 0.0
Temperature(-300)   # ValueError
~~~

Interview angle: the standard property drill — one source of truth, two views, validation in exactly one place. It probes whether you know that assigning ~self.celsius~ in ~__init__~ triggers the setter, and why the backing field must be spelled ~self._celsius~.`,
    starter: String.raw`class Temperature:
    ABSOLUTE_ZERO_C = -273.15

    def __init__(self, celsius: float = 0.0):
        self.celsius = celsius   # should route through the property setter

    # define celsius and fahrenheit properties with setters
    # your code here
    @property
    def celsius(self) -> float:
        raise NotImplementedError`,
    hints: [
      String.raw`Store the real value in self._celsius; the celsius setter validates and assigns it.`,
      String.raw`The fahrenheit getter computes from _celsius; its setter converts (value - 32) * 5 / 9 and assigns to self.celsius — reusing validation for free.`,
      String.raw`Because __init__ assigns self.celsius (no underscore), invalid constructor arguments hit the same ValueError path.`,
    ],
    solution: String.raw`class Temperature:
    ABSOLUTE_ZERO_C = -273.15

    def __init__(self, celsius: float = 0.0):
        self.celsius = celsius

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < self.ABSOLUTE_ZERO_C:
            raise ValueError(f"below absolute zero: {value}")
        self._celsius = float(value)

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value: float) -> None:
        self.celsius = (value - 32) * 5 / 9`,
    tests: [
      { name: "stores and returns celsius", code: String.raw`t = Temperature(25)
assert t.celsius == 25, f"got {t.celsius}"` },
      { name: "converts celsius to fahrenheit", code: String.raw`import math
assert math.isclose(Temperature(25).fahrenheit, 77.0), f"got {Temperature(25).fahrenheit}"
assert math.isclose(Temperature(0).fahrenheit, 32.0), f"got {Temperature(0).fahrenheit}"` },
      { name: "fahrenheit setter updates celsius", code: String.raw`import math
t = Temperature(100)
t.fahrenheit = 32
assert math.isclose(t.celsius, 0.0), f"expected 0.0 C, got {t.celsius}"` },
      { name: "constructor rejects below absolute zero", code: String.raw`try:
    Temperature(-300)
    raised = False
except ValueError:
    raised = True
assert raised, "Temperature(-300) must raise ValueError"` },
      { name: "celsius setter rejects below absolute zero", code: String.raw`t = Temperature(0)
try:
    t.celsius = -274
    raised = False
except ValueError:
    raised = True
assert raised, "t.celsius = -274 must raise ValueError"
assert t.celsius == 0, "failed assignment must not corrupt the stored value"` },
      { name: "fahrenheit setter validates through conversion", code: String.raw`t = Temperature(0)
try:
    t.fahrenheit = -1000        # about -573 C, below absolute zero
    raised = False
except ValueError:
    raised = True
assert raised, "t.fahrenheit = -1000 must raise ValueError"` },
      { name: "absolute zero itself is allowed", code: String.raw`t = Temperature(-273.15)
assert t.celsius == -273.15, f"got {t.celsius}"` },
    ],
  };

  // ================= Day 4 =================
  W.days.push({
    id: "w1d4",
    title: "OOP II — Design That Scales",
    minutes: 132,
    blocks: [
      { type: "lesson",   id: "w1d4-lesson", minutes: 25 },
      { type: "quiz",     id: "w1d4-quiz",   minutes: 12 },
      { type: "exercise", id: "w1d4-e1",     minutes: 25 },
      { type: "exercise", id: "w1d4-e2",     minutes: 30 },
      { type: "exercise", id: "w1d4-e3",     minutes: 30, optional: true },
      { type: "cards",    deck: "python", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w1d4-lesson"] = {
    title: "OOP II — Design That Scales",
    md: String.raw`Design rounds do not ask "what is inheritance?". They hand you a growing system — plugins, resources, flaky dependencies — and watch which tool you reach for. Python gives you a small kit: composition, abstract base classes, alternative constructors, exception hierarchies, context managers. Knowing *which one and why* is what gets scored.

### Composition beats inheritance (most days)

Inheritance says **is-a** and imports the entire parent API into your contract. Composition says **has-a** and exposes exactly what you designed. The classic tell:

~~~python
class Stack(list):                 # tempting: free storage!
    def push(self, x): self.append(x)

s = Stack()
s.insert(0, "oops")                # whole list API leaks; invariants gone

class Stack:                       # composition: has-a list
    def __init__(self):
        self._items: list = []
    def push(self, x): self._items.append(x)
    def pop(self): return self._items.pop()
    def __len__(self): return len(self._items)
~~~

The interview-grade answer: default to composition for code reuse; use inheritance when you genuinely need substitutability — anywhere a ~Shape~ is accepted, a ~Circle~ must work (Liskov). Then add the nuance below: inheritance is still exactly right for *interfaces*.

### ABCs: contracts the language enforces

An abstract base class pins down an interface and makes incomplete implementations fail **early and loudly** — at instantiation, not deep inside a request:

~~~python
from abc import ABC, abstractmethod

class Storage(ABC):
    @abstractmethod
    def save(self, key: str, blob: bytes) -> None: ...

    @abstractmethod
    def load(self, key: str) -> bytes: ...

Storage()          # TypeError: Can't instantiate abstract class
class HalfDone(Storage):
    def save(self, key, blob): ...
HalfDone()         # TypeError too — load is still abstract
~~~

When to reach for which: ABCs when you own a plugin surface and want enforcement plus ~isinstance~ checks; plain duck typing (or ~typing.Protocol~ for static checkers) when you just consume "anything with a ~read()~ method". Saying that trade-off out loud is worth more than either tool alone.

### classmethod as alternative constructor, staticmethod as namespacing

~~~python
import json

class Config:
    def __init__(self, depth: int, lr: float):
        self.depth, self.lr = depth, lr

    @classmethod
    def from_json(cls, blob: str) -> "Config":
        data = json.loads(blob)
        return cls(**data)           # cls, NOT Config — subclasses stay subclasses

    @staticmethod
    def valid_lr(lr: float) -> bool:
        return 0.0 < lr < 1.0
~~~

~@classmethod~ receives the class itself, so ~TunedConfig.from_json(...)~ builds a ~TunedConfig~ without any code change — that is the entire point of writing ~cls(...)~. ~@staticmethod~ receives nothing; it is a plain function stored in the class namespace because it belongs there conceptually. This mirrors real APIs: ~dict.fromkeys~, ~datetime.fromtimestamp~.

### Exception hierarchies: design for the catcher

Libraries define a base exception so callers can catch "anything from you" in one clause — and still catch precisely when needed:

~~~python
class PipelineError(Exception): ...
class ConfigError(PipelineError): ...
class DataError(PipelineError): ...

try:
    run_pipeline()
except ConfigError:
    ...                      # specific first — order matters!
except PipelineError as e:
    log(e)                   # everything else of yours
~~~

~except~ clauses are checked top-down and the first match wins, so a general clause above a specific one makes the specific clause unreachable. Wrap third-party failures with ~raise DataError("bad row") from original~ to keep the causal chain in tracebacks. Never inherit from ~BaseException~ — that level is reserved for ~KeyboardInterrupt~-class events that must outrank ~except Exception~.

### Context managers: setup/teardown as a type

~with~ guarantees cleanup on success *and* on failure. The protocol is two methods; the often-missed detail is the meaning of ~__exit__~'s return value:

~~~python
import time

class Timer:
    def __enter__(self):
        self._start = time.perf_counter()
        return self                      # bound to the as-target

    def __exit__(self, exc_type, exc, tb):
        self.elapsed = time.perf_counter() - self._start
        return False                     # False → exceptions propagate
~~~

Returning ~True~ from ~__exit__~ **suppresses** the exception — do that on purpose (like ~contextlib.suppress~) or never. The generator form reads even better for one-off managers:

~~~python
from contextlib import contextmanager

@contextmanager
def transaction(db):
    db.begin()
    try:
        yield db          # the with-body executes while we are paused HERE
        db.commit()
    except Exception:
        db.rollback()
        raise
~~~

Everything before ~yield~ is enter, everything after is exit, and exceptions from the body materialize *at the yield* — which is why the try/except wraps it.

### ⚠️ Common pitfalls

- Inheriting from ~list~ / ~dict~ for storage and leaking their whole API; compose instead.
- Expecting ABCs to fail at class-definition time — they fail at *instantiation*, and a subclass missing one method is still abstract.
- Returning ~True~ from ~__exit__~ by accident (or ending it with a truthy expression) — silently swallows every exception.
- Putting ~except Exception~ above specific clauses — the specific handlers become dead code.
- Hardcoding the class name inside a ~@classmethod~ constructor instead of using ~cls~ — breaks subclassing.
- Building exception types without a common base — forcing callers into ~except (A, B, C)~ contortions forever.

### 🎤 In interviews, they ask

- "When do you choose composition over inheritance? Show me the failure mode of inheriting."
- "How do ABCs differ from duck typing and ~typing.Protocol~ — and when is each appropriate?"
- "Write a context manager that times a block — class-based, then with ~@contextmanager~."
- "Design the exception hierarchy for a client library. What do callers catch?"
- "Explain ~classmethod~ vs ~staticmethod~ with a real use case for each."

### TL;DR

- Composition for reuse; inheritance for substitutable interfaces — say the trade-off, then pick.
- ~@abstractmethod~ + ABC = incomplete implementations blow up at instantiation, the earliest useful moment.
- Alternative constructors are ~@classmethod~s that call ~cls(...)~; ~@staticmethod~ is namespacing.
- Give your library one exception base; catch specific before general; chain with ~raise ... from~.
- ~with~ = ~__enter__~ / ~__exit__~; returning ~True~ from ~__exit__~ suppresses; ~@contextmanager~ puts the body at the ~yield~.

### Go deeper

- [abc — Abstract Base Classes](https://docs.python.org/3/library/abc.html)
- [contextlib — utilities for with-statement contexts](https://docs.python.org/3/library/contextlib.html)
- [Inheritance and composition — Real Python](https://realpython.com/inheritance-composition-python/)
- [Errors and exceptions — official tutorial](https://docs.python.org/3/tutorial/errors.html)
`,
  };

  W.quizzes["w1d4-quiz"] = [
    {
      q: String.raw`A ~Stack~ needs list-like storage internally. Why do seasoned engineers wrap a list (composition) instead of inheriting from ~list~?`,
      options: [
        "Inheriting from built-in types is impossible in Python",
        "Inheriting exposes the entire list API — insert, remove, slicing — which can break the stack's invariants; composition exposes only the interface you designed",
        "Composition is faster because attribute lookups skip the MRO",
        "Inheritance prevents adding new methods later",
      ],
      answer: 1,
      explain: String.raw`Subclassing means your public contract includes everything the parent can do, so users can legally ~insert(0, x)~ into your "stack". Wrapping a private list lets you publish push/pop and nothing else. Inheritance is for is-a substitutability, not for borrowing storage.`,
    },
    {
      q: String.raw`What happens on the last line?

~~~python
from abc import ABC, abstractmethod

class Codec(ABC):
    @abstractmethod
    def encode(self, text): ...

c = Codec()
~~~`,
      options: [
        "It works — encode is simply left as a no-op",
        "NotImplementedError is raised when encode is called",
        "SyntaxError — abstract classes need a body",
        "TypeError: Can't instantiate abstract class Codec",
      ],
      answer: 3,
      explain: String.raw`ABCs fail fast: instantiating a class with unimplemented abstract methods raises TypeError immediately, instead of exploding later when the missing method is finally called. That early, loud failure is the main selling point over informal duck typing.`,
    },
    {
      q: String.raw`An alternative constructor ~from_string~ is written as a ~@classmethod~ that ends with ~return cls(...)~. What is the payoff of ~cls~ over hardcoding the class name?`,
      options: [
        "Subclasses inherit the constructor and receive instances of the subclass, because cls is whatever class the call went through",
        "cls skips a global name lookup, making construction faster",
        "It allows calling the method without importing the class",
        "It makes the constructor private to the module",
      ],
      answer: 0,
      explain: String.raw`~cls~ is bound to the class the method was invoked on, so ~Derived.from_string(...)~ builds a ~Derived~ with zero extra code. Hardcoding the parent class name would silently return parent instances from subclass calls — a classic review catch.`,
    },
    {
      q: String.raw`What does this program output?

~~~python
class Quiet:
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        return True

with Quiet():
    raise ValueError("boom")
print("survived")
~~~`,
      options: [
        "ValueError propagates; nothing is printed",
        "It prints survived, then raises ValueError",
        "It prints survived",
        "TypeError — __exit__ must return None",
      ],
      answer: 2,
      explain: String.raw`A truthy return from ~__exit__~ tells Python the exception was handled, so it is suppressed and execution continues after the with-block. This is how ~contextlib.suppress~ works — and why an accidental truthy return silently eats every error in the block.`,
    },
    {
      q: String.raw`In a ~@contextmanager~ generator, where does the with-body execute, and where do its exceptions surface inside the generator?`,
      options: [
        "The body runs before the generator starts; exceptions appear on the first next()",
        "The body is passed in as a callback argument to the generator",
        "The body replaces the yield expression; exceptions cannot reach the generator",
        "The body runs while the generator is paused at yield; body exceptions are re-raised at that yield point",
      ],
      answer: 3,
      explain: String.raw`Code before ~yield~ is the enter phase, code after is the exit phase, and the with-body executes during the pause. Exceptions from the body are thrown into the generator at the yield — which is exactly why cleanup code wraps the yield in try/finally.`,
    },
    {
      q: String.raw`Your library raises ~ParseError~ and ~NetworkError~. What is the standard design so callers can catch "any error from this library" in one clause?`,
      options: [
        "Define a common base class (for example LibError, deriving from Exception) and have both inherit it; callers write except LibError",
        "Make both inherit from BaseException so they outrank other errors",
        "Document that callers should use except Exception",
        "Expose a tuple constant LIB_ERRORS and update it on every release",
      ],
      answer: 0,
      explain: String.raw`A single-root hierarchy is the convention across serious Python libraries: one base to catch broadly, subclasses to catch precisely. Inheriting from BaseException is reserved for interpreter-level events like KeyboardInterrupt, and except Exception drags in every unrelated failure too.`,
    },
    {
      q: String.raw`What does this print?

~~~python
class AppError(Exception): pass
class ConfigError(AppError): pass

try:
    raise ConfigError("bad yaml")
except AppError:
    print("app")
except ConfigError:
    print("config")
~~~`,
      options: [
        "config",
        "app then config",
        "app",
        "Nothing — ConfigError escapes unhandled",
      ],
      answer: 2,
      explain: String.raw`Clauses are tested top-down and the first match wins; since ConfigError is-an AppError, the first clause matches and the second is dead code. Always order except blocks from most specific to most general — linters flag the reverse for exactly this reason.`,
    },
  ];

  W.exercises["w1d4-e1"] = {
    title: "Shape ABC with polymorphic total_area",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Define an enforced interface, two implementations, and one polymorphic consumer.",
    description: String.raw`Build a tiny geometry kit around an abstract base class.

- ~Shape~ — an ABC with an abstract method ~area() -> float~. Instantiating ~Shape~ (or any subclass that has not implemented ~area~) must raise ~TypeError~.
- ~Circle(radius)~ — area is pi times radius squared (use ~math.pi~).
- ~Rectangle(width, height)~ — area is width times height.
- ~total_area(shapes)~ — sums ~area()~ over any iterable of shapes without ever checking concrete types, and returns ~0~ for an empty iterable.

~~~python
total_area([Circle(1), Rectangle(2, 3)])
# 9.141592653589793
~~~

Interview angle: the smallest complete demo of "program to an interface". Interviewers check three things: that you know ABC violations explode at *instantiation* time, that ~total_area~ stays free of isinstance-dispatch, and that you can explain when you would use this versus plain duck typing.`,
    starter: String.raw`import math
from abc import ABC, abstractmethod
from typing import Iterable

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        """Return the area of this shape."""

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius
    # implement area

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height
    # implement area

def total_area(shapes: Iterable[Shape]) -> float:
    raise NotImplementedError`,
    hints: [
      String.raw`Each concrete class just defines area with the right formula — the ABC machinery does the enforcement.`,
      String.raw`total_area is one line: sum of s.area() over the iterable — sum() already returns 0 for an empty one.`,
      String.raw`No isinstance checks anywhere in total_area — that is the whole point of the abstraction.`,
    ],
    solution: String.raw`import math
from abc import ABC, abstractmethod
from typing import Iterable

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        """Return the area of this shape."""

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        return math.pi * self.radius ** 2

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

def total_area(shapes: Iterable[Shape]) -> float:
    return sum(s.area() for s in shapes)`,
    tests: [
      { name: "circle area is pi r squared", code: String.raw`import math
res = Circle(2).area()
assert math.isclose(res, math.pi * 4), f"got {res}"` },
      { name: "rectangle area is width times height", code: String.raw`res = Rectangle(3, 4).area()
assert res == 12, f"got {res}"` },
      { name: "total_area sums mixed shapes polymorphically", code: String.raw`import math
total = total_area([Circle(1), Rectangle(2, 3)])
assert math.isclose(total, math.pi + 6), f"got {total}"
assert total_area([]) == 0, "empty iterable should total 0"` },
      { name: "Shape itself cannot be instantiated", code: String.raw`try:
    Shape()
    raised = False
except TypeError:
    raised = True
assert raised, "instantiating an ABC with abstract methods must raise TypeError"` },
      { name: "a subclass without area stays abstract", code: String.raw`class Incomplete(Shape):
    pass

try:
    Incomplete()
    raised = False
except TypeError:
    raised = True
assert raised, "a subclass that skips area() must also refuse to instantiate"` },
      { name: "concrete shapes are Shape instances", code: String.raw`assert isinstance(Circle(1), Shape), "Circle should be a Shape"
assert isinstance(Rectangle(1, 1), Shape), "Rectangle should be a Shape"` },
    ],
  };

  W.exercises["w1d4-e2"] = {
    title: "Timer and collecting_errors context managers",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: [],
    brief: "One class-based CM, one generator-based CM that suppresses and records.",
    description: String.raw`Implement both flavors of context manager.

**1.** ~Timer~ — class-based (~__enter__~ / ~__exit__~):

- ~with Timer() as t:~ binds the timer itself.
- After the block, ~t.elapsed~ holds the block duration in seconds (~time.perf_counter~).
- Exceptions must **propagate** (do not suppress) — but ~elapsed~ must still be recorded on the way out.

**2.** ~collecting_errors(*exc_types)~ — built with ~@contextlib.contextmanager~:

- Yields a list. If the with-body raises one of ~exc_types~, the exception is **suppressed** and appended to that list; execution continues after the block.
- Exceptions of other types propagate untouched. A clean block leaves the list empty.

~~~python
with collecting_errors(ValueError) as errs:
    raise ValueError("bad row 17")
print(len(errs))    # 1 — and we are still alive
~~~

Interview angle: "write a timing context manager" is a standing favorite, and the follow-up — "now one that swallows selected errors" — probes whether you know exceptions surface at the ~yield~ and that ~except~ takes a tuple of types.`,
    starter: String.raw`import time
from contextlib import contextmanager

class Timer:
    """with Timer() as t: ...  →  t.elapsed in seconds afterwards."""

    def __enter__(self):
        raise NotImplementedError

    def __exit__(self, exc_type, exc, tb):
        raise NotImplementedError

@contextmanager
def collecting_errors(*exc_types):
    """Yield a list; suppress and record exceptions of the given types."""
    raise NotImplementedError`,
    hints: [
      String.raw`Timer.__enter__ stamps time.perf_counter() into an attribute and returns self; __exit__ computes elapsed and returns False (or None) so exceptions propagate.`,
      String.raw`In collecting_errors, wrap the yield in try/except: the with-body's exception is re-raised exactly at the yield expression.`,
      String.raw`except exc_types as e: works directly because exc_types is already a tuple; append e and simply return — a @contextmanager that swallows the exception suppresses it.`,
    ],
    solution: String.raw`import time
from contextlib import contextmanager

class Timer:
    """with Timer() as t: ...  →  t.elapsed in seconds afterwards."""

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.elapsed = time.perf_counter() - self._start
        return False

@contextmanager
def collecting_errors(*exc_types):
    """Yield a list; suppress and record exceptions of the given types."""
    errors: list = []
    try:
        yield errors
    except exc_types as e:
        errors.append(e)`,
    tests: [
      { name: "timer measures a busy block", code: String.raw`with Timer() as t:
    total = sum(range(200_000))
assert hasattr(t, "elapsed"), "t.elapsed must exist after the block"
assert t.elapsed > 0, f"elapsed should be positive, got {t.elapsed}"
assert t.elapsed < 15, f"elapsed absurdly large: {t.elapsed}"` },
      { name: "with-target is the timer instance itself", code: String.raw`with Timer() as t:
    pass
assert isinstance(t, Timer), f"__enter__ must return self, got {type(t).__name__}"` },
      { name: "timer lets exceptions propagate but records elapsed", code: String.raw`t = Timer()
try:
    with t:
        raise ValueError("inside")
    raised = False
except ValueError:
    raised = True
assert raised, "Timer must NOT suppress exceptions"
assert hasattr(t, "elapsed") and t.elapsed >= 0, "elapsed must be set even on failure"` },
      { name: "collecting_errors suppresses and records a listed error", code: String.raw`reached = False
with collecting_errors(ValueError) as errs:
    raise ValueError("bad row 17")
reached = True
assert reached, "execution must continue after the with-block"
assert len(errs) == 1, f"expected 1 recorded error, got {len(errs)}"
assert isinstance(errs[0], ValueError), f"got {type(errs[0]).__name__}"
assert "bad row 17" in str(errs[0]), "the original exception object must be stored"` },
      { name: "unlisted exception types propagate", code: String.raw`try:
    with collecting_errors(ValueError) as errs:
        raise KeyError("nope")
    raised = False
except KeyError:
    raised = True
assert raised, "KeyError is not listed and must propagate"` },
      { name: "clean block leaves the list empty", code: String.raw`with collecting_errors(ValueError, KeyError) as errs:
    x = 1 + 1
assert errs == [], f"expected no recorded errors, got {errs}"` },
      { name: "accepts multiple exception types", code: String.raw`with collecting_errors(ValueError, KeyError) as errs:
    raise KeyError("k")
assert len(errs) == 1, f"expected 1 recorded error, got {len(errs)}"
assert isinstance(errs[0], KeyError), f"got {type(errs[0]).__name__}"` },
    ],
  };

  W.exercises["w1d4-e3"] = {
    title: "Serializer plugin registry",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: [],
    brief: "A decorator-driven plugin system: register formats, dispatch by name.",
    description: String.raw`Build a minimal plugin registry — the pattern behind Flask routes, pytest fixtures, and every "register a handler" API.

- ~REGISTRY~ — a module-level ~dict[str, Callable]~ mapping format names to serializer functions.
- ~register(fmt)~ — a decorator **factory**: ~@register("json")~ stores the function under ~"json"~ and returns the function **unchanged** (so it stays callable and stackable). Registering the same name again overrides.
- ~serialize(fmt, obj)~ — looks up the format and calls it; unknown formats raise ~ValueError~ with the format name in the message.
- Ship two built-in formats: ~"json"~ using ~json.dumps(obj, sort_keys=True)~, and ~"repr"~ using ~repr(obj)~.

~~~python
@register("upper")
def to_upper(obj) -> str:
    return str(obj).upper()

serialize("upper", "hi")     # "HI"
serialize("json", {"b": 1, "a": 2})   # '{"a": 2, "b": 1}'
~~~

Interview angle: registry-by-decorator is *the* pattern interviewers use to see if you understand that decorators run at import time, can have side effects, and do not have to wrap anything. Returning the function unchanged is the subtle detail most candidates miss.`,
    starter: String.raw`import json
from typing import Callable

REGISTRY: dict[str, Callable] = {}

def register(fmt: str):
    """Decorator factory: @register("name") stores the function in REGISTRY."""
    raise NotImplementedError

def serialize(fmt: str, obj) -> str:
    """Dispatch to the registered serializer; unknown fmt → ValueError."""
    raise NotImplementedError

# built-ins: register "json" (json.dumps, sort_keys=True) and "repr" (repr)`,
    hints: [
      String.raw`register(fmt) returns an inner decorator that does REGISTRY[fmt] = func and then returns func — no wrapper needed.`,
      String.raw`serialize checks membership first and raises ValueError(f"unknown format: {fmt}") before calling.`,
      String.raw`Define the two built-ins at module level with @register("json") and @register("repr") — decorators execute at import time, which is exactly how plugin autodiscovery works.`,
    ],
    solution: String.raw`import json
from typing import Callable

REGISTRY: dict[str, Callable] = {}

def register(fmt: str):
    """Decorator factory: @register("name") stores the function in REGISTRY."""
    def decorator(func: Callable) -> Callable:
        REGISTRY[fmt] = func
        return func
    return decorator

def serialize(fmt: str, obj) -> str:
    """Dispatch to the registered serializer; unknown fmt → ValueError."""
    if fmt not in REGISTRY:
        raise ValueError(f"unknown format: {fmt}")
    return REGISTRY[fmt](obj)

@register("json")
def to_json(obj) -> str:
    return json.dumps(obj, sort_keys=True)

@register("repr")
def to_repr(obj) -> str:
    return repr(obj)`,
    tests: [
      { name: "json builtin dispatches with sorted keys", code: String.raw`res = serialize("json", {"b": 1, "a": 2})
assert res == '{"a": 2, "b": 1}', f"got {res!r}"` },
      { name: "repr builtin handles simple values", code: String.raw`res = serialize("repr", [1, "x"])
assert res == "[1, 'x']", f"got {res!r}"` },
      { name: "unknown format raises ValueError naming it", code: String.raw`try:
    serialize("xml", {})
    raised = False
except ValueError as e:
    raised = True
    assert "xml" in str(e), f"error message should name the format, got {e}"
assert raised, "unknown format must raise ValueError"` },
      { name: "registering a custom format works", code: String.raw`@register("upper")
def to_upper(obj) -> str:
    return str(obj).upper()

res = serialize("upper", "hi there")
assert res == "HI THERE", f"got {res!r}"` },
      { name: "register returns the original function unchanged", code: String.raw`@register("shout")
def shout(obj) -> str:
    return str(obj) + "!"

assert shout.__name__ == "shout", f"got {shout.__name__}"
assert shout("hey") == "hey!", "the decorated function must stay directly callable"` },
      { name: "re-registering a name overrides the old handler", code: String.raw`@register("fmt-x")
def old_handler(obj) -> str:
    return "old"

@register("fmt-x")
def new_handler(obj) -> str:
    return "new"

res = serialize("fmt-x", None)
assert res == "new", f"expected the newest handler to win, got {res!r}"` },
    ],
  };

  // ================= Day 5 =================
  W.days.push({
    id: "w1d5",
    title: "Iterators, Generators & Typing",
    minutes: 127,
    blocks: [
      { type: "lesson",   id: "w1d5-lesson", minutes: 25 },
      { type: "quiz",     id: "w1d5-quiz",   minutes: 12 },
      { type: "exercise", id: "w1d5-e1",     minutes: 25 },
      { type: "exercise", id: "w1d5-e2",     minutes: 30 },
      { type: "exercise", id: "w1d5-e3",     minutes: 25, optional: true },
      { type: "cards",    deck: "python", count: 8, minutes: 10 },
    ],
  });

  W.lessons["w1d5-lesson"] = {
    title: "Iterators, Generators & Typing",
    md: String.raw`Generators separate people who have read Python from people who have shipped it, and the tell is always memory. Can you scan a 10 GB log without loading it? Can you say *why* that is free? Iterators, generators, and a few typing habits are the spine of every data pipeline an interviewer will ask you to sketch on the spot.

### The iterator protocol, demystified

Two functions run the whole show. ~iter(obj)~ asks an object for a fresh iterator; ~next(it)~ pulls the following value or raises ~StopIteration~ when drained.

~~~python
it = iter([10, 20])
next(it)     # 10
next(it)     # 20
next(it)     # raises StopIteration
~~~

An **iterable** can produce an iterator (it has ~__iter__~) and is usually reusable. An **iterator** also has ~__next__~, returns *itself* from ~__iter__~, and is **one-shot** — once exhausted it stays exhausted.

~~~python
nums = [1, 2, 3]     # iterable, reusable
it = iter(nums)      # iterator, single-use
list(it)             # [1, 2, 3]
list(it)             # [] — already drained, no rewind
~~~

A ~for x in nums~ loop is just sugar for "grab ~iter(nums)~, call ~next()~ until ~StopIteration~".

### yield turns a function into a resumable state machine

Any ~def~ containing ~yield~ is a generator function. Calling it runs **no** body code — it hands back a paused generator object. Execution advances only when you pull.

~~~python
def countdown(n):
    while n > 0:
        yield n
        n -= 1

g = countdown(3)     # nothing has run yet
next(g)              # 3 — runs up to the yield, then freezes
~~~

The locals (~n~, plus the instruction pointer) are frozen between yields. That is exactly why generators are lazy and memory-flat: at any instant only *one* item exists, never the whole sequence.

### Generators as pipelines — where the memory win lives

~~~python
def read_lines(text):
    for line in text.splitlines():
        yield line

def only_errors(lines):
    for line in lines:
        if "ERROR" in line:
            yield line

pipe = only_errors(read_lines(raw_text))
first = next(pipe)     # does just enough work to surface one ERROR
~~~

Each stage pulls one item from the stage before it, on demand. Chaining generators composes stages **without** building intermediate lists — the difference between O(n) memory and O(1). Sketching a pipeline this way is a reliable way to score points in a systems-flavored round.

### itertools: batteries you keep forgetting you have

~~~python
from itertools import islice, chain, groupby, count

list(islice(count(10), 3))     # [10, 11, 12] — take 3 from an infinite stream
list(chain([1, 2], [3, 4]))    # [1, 2, 3, 4] — concatenate lazily
[(k, len(list(g))) for k, g in groupby("aabbbc")]   # [('a',2),('b',3),('c',1)]
~~~

Two traps worth memorizing. ~groupby~ only groups **adjacent** equal keys — sort first if you want global groups. And its per-group iterator is consumed as you advance, so materialize with ~list()~ if you need it later. ~count()~ and ~chain()~ are your infinite-and-streaming friends; ~islice()~ is how you take a finite bite.

### yield from: delegate to a sub-generator

~~~python
def flatten_once(chunks):
    for chunk in chunks:
        yield from chunk       # re-yield every item of chunk

list(flatten_once([[1, 2], [3, 4]]))   # [1, 2, 3, 4]
~~~

~yield from x~ is more than a loop shortcut: it forwards values, thrown-in exceptions, and ~.send()~ to the sub-generator. For interviews, know it flattens delegation cleanly and is the machinery classic coroutines were built on.

### Typing that actually pays off

Hints never change runtime behavior; they buy readability, editor autocomplete, and mypy catches. Four earn their keep:

~~~python
from typing import Optional, Union, TypeVar

def first(xs: list[int]) -> Optional[int]:     # int OR None
    return xs[0] if xs else None

Number = Union[int, float]                     # or, on 3.10+: int | float

T = TypeVar("T")
def head(xs: list[T]) -> T:                    # output type tracks input type
    return xs[0]
~~~

~Optional[X]~ means "~X~ or ~None~" — it says nothing about whether an *argument* can be omitted (defaults do that). ~Union[A, B]~ (or ~A | B~) means either. A ~TypeVar~ links input to output, so ~head~ of a ~list[str]~ is known to return ~str~. Add hints on public signatures and library boundaries; skip them on three-line throwaway locals.

### ⚠️ Common pitfalls

- Iterating an iterator twice — the second pass is empty; it is single-use, no rewind.
- Calling ~len()~ on a generator — ~TypeError~; generators have no length.
- ~groupby~ without sorting first — non-adjacent equal keys become separate groups.
- Reusing a ~groupby~ group after advancing to the next key — it is already consumed.
- Believing a generator "runs" when called — it runs on the first ~next()~, so body exceptions surface late.
- Reading ~Optional[int]~ as "the argument is optional" — it means the value may be ~None~.

### 🎤 In interviews, they ask

- "Difference between an iterable and an iterator — which one is reusable?"
- "How does ~yield~ work? What state is frozen between two yields?"
- "Rewrite this list-building function as a generator and justify the memory win."
- "Why does ~itertools.groupby~ need sorted input to group globally?"
- "What does ~Optional[int]~ mean, and where do you actually put type hints?"

### TL;DR

- ~iter()~ makes an iterator; ~next()~ advances it until ~StopIteration~; iterators are one-shot.
- A ~def~ with ~yield~ returns a lazy generator; state freezes between yields → O(1) memory.
- Chain generators into pipelines; each stage pulls one item on demand, no intermediate lists.
- ~itertools~: ~islice~/~chain~/~count~ for streaming; ~groupby~ groups only *adjacent* keys.
- ~yield from~ delegates the full protocol (values, exceptions, ~.send()~) to a sub-generator.
- ~Optional[X]~ is ~X | None~; hint at boundaries, not on throwaway locals.

### Go deeper

- [itertools — functions creating iterators](https://docs.python.org/3/library/itertools.html)
- [Functional programming HOWTO (iterators & generators)](https://docs.python.org/3/howto/functional.html)
- [typing — support for type hints](https://docs.python.org/3/library/typing.html)
- [Introduction to Python generators — Real Python](https://realpython.com/introduction-to-python-generators/)
`,
  };

  W.quizzes["w1d5-quiz"] = [
    {
      q: String.raw`You are handed ~nums = [1, 2, 3]~ and ~it = iter(nums)~. Which statement is true?`,
      options: [
        "Both nums and it are single-use and cannot be looped twice",
        "it is reusable; nums is the one-shot iterator",
        "nums is a reusable iterable; it is a one-shot iterator that empties as you consume it",
        "They are interchangeable — iter() just returns the same list back",
      ],
      answer: 2,
      explain: String.raw`A list is an iterable: it hands out a fresh iterator every time you loop it. An iterator holds a position and is exhausted once consumed — looping it again yields nothing. ~iter()~ builds a new iterator; it is not the underlying list.`,
    },
    {
      q: String.raw`What does this print?

~~~python
it = iter([1, 2, 3])
print(sum(it), sum(it))
~~~`,
      options: [
        "6 6",
        "6 0",
        "0 6",
        "It raises StopIteration",
      ],
      answer: 1,
      explain: String.raw`The first ~sum~ drains the iterator to 6; the second sees an already-exhausted iterator and sums an empty sequence to 0. Iterators keep no memory of their contents and never rewind — this is the classic bug of feeding one iterator to two consumers.`,
    },
    {
      q: String.raw`You call a generator function: ~g = countdown(5)~. What has executed at this exact point?`,
      options: [
        "Nothing in the body yet — you get a paused generator object; code runs only on the first next()",
        "The entire function body, eagerly, before returning",
        "The body up to and including the first yield",
        "The body up to the first return statement",
      ],
      answer: 0,
      explain: String.raw`Calling a generator function never runs the body; it constructs a paused generator. The first ~next()~ (or for-loop step) runs code up to the first ~yield~. This laziness is why exceptions raised inside the body can surface later than beginners expect.`,
    },
    {
      q: String.raw`What does this print?

~~~python
from itertools import groupby
data = [1, 1, 2, 1, 1]
print([(k, len(list(g))) for k, g in groupby(data)])
~~~`,
      options: [
        "[(1, 4), (2, 1)]",
        "[(1, 2), (2, 1)]",
        "[(2, 1), (1, 4)]",
        "[(1, 2), (2, 1), (1, 2)]",
      ],
      answer: 3,
      explain: String.raw`~groupby~ collapses only *adjacent* equal keys, so the two runs of 1 separated by a 2 become two distinct groups. To group globally you must sort first. The ~(1, 4)~ answer is the classic mistake of treating ~groupby~ like a counter.`,
    },
    {
      q: String.raw`Inside a generator, what does ~yield from sub~ do that a plain ~for x in sub: yield x~ loop does not fully capture?`,
      options: [
        "Nothing — they are byte-for-byte identical in every situation",
        "It transparently forwards values, exceptions thrown in, and .send() to the sub-generator",
        "It runs the sub-generator eagerly to completion first, then yields",
        "It converts the sub-generator into a list before yielding",
      ],
      answer: 1,
      explain: String.raw`~yield from~ delegates the full two-way protocol — return value, exceptions, and ~.send()~ — to the sub-generator, not just the emitted items. For plain pass-through the loop looks equivalent, but that delegation is exactly why coroutines were built on ~yield from~.`,
    },
    {
      q: String.raw`A signature reads ~def load(path: str) -> Optional[Config]~. What does ~Optional[Config]~ promise?`,
      options: [
        "The function returns either a Config or None",
        "The path argument may be omitted when calling load",
        "Config is an optional dependency that might not be importable",
        "The return value is computed lazily",
      ],
      answer: 0,
      explain: String.raw`~Optional[X]~ is exactly ~X | None~ — it describes a value that may be ~None~, here the return type. It says nothing about whether *arguments* are optional; default values control that. Reading it as "optional parameter" is a common misfire.`,
    },
    {
      q: String.raw`What is the output order?

~~~python
def gen():
    print("body")
    yield 1

g = gen()
print("made")
next(g)
~~~`,
      options: [
        "body then made",
        "body only",
        "made then body",
        "made only",
      ],
      answer: 2,
      explain: String.raw`Building the generator prints nothing, so ~made~ prints first. The body — including ~print("body")~ — runs only when ~next(g)~ pulls the first value. This deferred execution is the heart of generator laziness.`,
    },
  ];

  W.exercises["w1d5-e1"] = {
    title: "Sliding window over any iterable",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Yield fixed-size windows lazily — works on lists, strings, and generators.",
    description: String.raw`Implement ~sliding_window(iterable, n)~ as a **generator** that yields successive windows of ~n~ consecutive items as **tuples**.

- ~sliding_window([1, 2, 3, 4], 2)~ yields ~(1, 2)~, ~(2, 3)~, ~(3, 4)~.
- If the input has fewer than ~n~ items, yield nothing.
- It must work on **any** iterable — including one-shot generators — so you cannot index or call ~len()~. Consume it through an iterator.
- If ~n < 1~, raise ~ValueError~ (it surfaces when the generator is first consumed).

~~~python
list(sliding_window("abc", 2))    # [("a", "b"), ("b", "c")]
list(sliding_window([1], 3))      # []  — shorter than the window
~~~

Interview angle: this is a favorite streaming question. It checks whether you reach for ~collections.deque(maxlen=n)~ instead of slicing, and whether your solution survives an input you can only iterate once — the exact shape of real log/stream processing.`,
    starter: String.raw`from collections import deque
from typing import Iterable, Iterator

def sliding_window(iterable: Iterable, n: int) -> Iterator[tuple]:
    """Yield each length-n window as a tuple. Works on any iterable."""
    # hint: a deque with maxlen=n keeps only the last n items automatically
    raise NotImplementedError`,
    hints: [
      String.raw`Take an iterator with ~it = iter(iterable)~ so the same code handles lists, strings, and generators.`,
      String.raw`A ~deque(maxlen=n)~ drops its oldest item automatically when it overflows — append each element, and once it reaches length n, yield ~tuple(window)~.`,
      String.raw`Validate ~n < 1~ at the top and ~raise ValueError~; because this is a generator, that check fires when the caller first pulls a value.`,
    ],
    solution: String.raw`from collections import deque
from typing import Iterable, Iterator

def sliding_window(iterable: Iterable, n: int) -> Iterator[tuple]:
    if n < 1:
        raise ValueError("n must be >= 1")
    it = iter(iterable)
    window: deque = deque(maxlen=n)
    for x in it:
        window.append(x)
        if len(window) == n:
            yield tuple(window)`,
    tests: [
      { name: "yields consecutive windows over a list", code: String.raw`res = list(sliding_window([1, 2, 3, 4], 2))
assert res == [(1, 2), (2, 3), (3, 4)], f"got {res}"` },
      { name: "window size equal to length yields exactly one", code: String.raw`res = list(sliding_window([1, 2, 3], 3))
assert res == [(1, 2, 3)], f"got {res}"` },
      { name: "iterable shorter than n yields nothing", code: String.raw`res = list(sliding_window([1, 2], 3))
assert res == [], f"expected [], got {res}"` },
      { name: "works on a one-shot generator (no indexing)", code: String.raw`gen = (x * x for x in range(4))   # 0, 1, 4, 9
res = list(sliding_window(gen, 2))
assert res == [(0, 1), (1, 4), (4, 9)], f"got {res}"` },
      { name: "windows are tuples, not lists", code: String.raw`res = list(sliding_window("abc", 2))
assert res == [("a", "b"), ("b", "c")], f"got {res}"
assert all(isinstance(w, tuple) for w in res), "each window must be a tuple"` },
      { name: "n < 1 raises ValueError when consumed", code: String.raw`raised = False
try:
    list(sliding_window([1, 2, 3], 0))
except ValueError:
    raised = True
assert raised, "n < 1 must raise ValueError"` },
    ],
  };

  W.exercises["w1d5-e2"] = {
    title: "batched + take",
    difficulty: 2,
    xp: 30,
    minutes: 30,
    packages: [],
    brief: "Chunk any iterable into batches, and grab the first n items — lazily.",
    description: String.raw`Two small streaming utilities that show up constantly (and that ~itertools.batched~ only added in 3.12).

- ~batched(iterable, n)~ — a **generator** yielding tuples of up to ~n~ items; the final batch may be shorter. Raise ~ValueError~ if ~n < 1~.
- ~take(iterable, n)~ — return a **list** of the first ~n~ items, consuming no more than that from the iterator.

~~~python
list(batched([1, 2, 3, 4, 5], 2))   # [(1, 2), (3, 4), (5,)]
take(range(1000), 3)                # [0, 1, 2]
~~~

Both must work on arbitrary iterables including generators, so reach for ~itertools.islice~ rather than slicing. ~take~ must not over-consume: calling it twice on the same iterator should continue where it left off.

Interview angle: batching is the backbone of paginated requests and mini-batch training loops, and "grab the first n lazily" separates people who slice a materialized list (O(n) memory, breaks on infinite streams) from people who use ~islice~ (O(1)).`,
    starter: String.raw`from itertools import islice
from typing import Iterable, Iterator

def batched(iterable: Iterable, n: int) -> Iterator[tuple]:
    """Yield tuples of up to n items; the last one may be short."""
    raise NotImplementedError

def take(iterable: Iterable, n: int) -> list:
    """Return the first n items as a list, without over-consuming."""
    raise NotImplementedError`,
    hints: [
      String.raw`For ~take~, ~list(islice(iter(iterable), n))~ pulls exactly n items and stops — no manual counter, no over-reading.`,
      String.raw`For ~batched~, take an iterator once, then repeatedly grab ~tuple(islice(it, n))~ until it comes back empty.`,
      String.raw`The walrus operator makes the loop tidy: ~while batch := tuple(islice(it, n)):~ yields until the slice is empty.`,
    ],
    solution: String.raw`from itertools import islice
from typing import Iterable, Iterator

def batched(iterable: Iterable, n: int) -> Iterator[tuple]:
    if n < 1:
        raise ValueError("n must be >= 1")
    it = iter(iterable)
    while batch := tuple(islice(it, n)):
        yield batch

def take(iterable: Iterable, n: int) -> list:
    return list(islice(iter(iterable), n))`,
    tests: [
      { name: "batched splits with a short final batch", code: String.raw`res = list(batched([1, 2, 3, 4, 5], 2))
assert res == [(1, 2), (3, 4), (5,)], f"got {res}"` },
      { name: "batched exact multiple has no short tail", code: String.raw`res = list(batched([1, 2, 3, 4], 2))
assert res == [(1, 2), (3, 4)], f"got {res}"` },
      { name: "batched on empty input yields nothing", code: String.raw`res = list(batched([], 3))
assert res == [], f"expected [], got {res}"` },
      { name: "batched consumes a one-shot generator", code: String.raw`gen = (c for c in "abcde")
res = list(batched(gen, 2))
assert res == [("a", "b"), ("c", "d"), ("e",)], f"got {res}"` },
      { name: "batched n < 1 raises ValueError", code: String.raw`raised = False
try:
    list(batched([1, 2, 3], 0))
except ValueError:
    raised = True
assert raised, "n < 1 must raise ValueError"` },
      { name: "take returns the first n as a list", code: String.raw`res = take(range(1000), 3)
assert res == [0, 1, 2], f"got {res}"
assert isinstance(res, list), "take must return a list"` },
      { name: "take does not over-consume the iterator", code: String.raw`it = iter(range(100))
first = take(it, 3)
second = take(it, 2)
assert first == [0, 1, 2], f"got {first}"
assert second == [3, 4], f"take over-consumed the iterator, got {second}"` },
      { name: "take with n beyond the end returns all there is", code: String.raw`res = take([1, 2], 10)
assert res == [1, 2], f"got {res}"` },
    ],
  };

  W.exercises["w1d5-e3"] = {
    title: "Run-length encode / decode (generators)",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Compress consecutive runs into (item, count) pairs and expand them back.",
    description: String.raw`Implement run-length encoding as two **generators** that round-trip.

- ~rle_encode(iterable)~ — yield ~(item, count)~ pairs for each maximal run of **consecutive** equal items.
- ~rle_decode(pairs)~ — take ~(item, count)~ pairs and yield each item repeated ~count~ times.

~~~python
list(rle_encode("aaabbc"))              # [("a", 3), ("b", 2), ("c", 1)]
list(rle_decode([("x", 2), ("y", 1)]))  # ["x", "x", "y"]
~~~

Only *adjacent* equal items merge: ~"aabaa"~ encodes to ~[("a", 2), ("b", 1), ("a", 2)]~, not a single ~a~ group. For any input, ~rle_decode(rle_encode(x))~ must reproduce ~list(x)~.

Interview angle: RLE is the "can you use ~itertools.groupby~ correctly" question in disguise. The trap is reaching for ~Counter~ (which merges non-adjacent items and loses order) instead of grouping consecutive runs.`,
    starter: String.raw`from itertools import groupby
from typing import Iterable, Iterator

def rle_encode(iterable: Iterable) -> Iterator[tuple]:
    """Yield (item, count) for each run of consecutive equal items."""
    raise NotImplementedError

def rle_decode(pairs: Iterable) -> Iterator:
    """Yield each item repeated count times, for each (item, count) pair."""
    raise NotImplementedError`,
    hints: [
      String.raw`~groupby(iterable)~ yields ~(key, group)~ for each run of adjacent equal keys — exactly the runs you want.`,
      String.raw`The group is an iterator; count it with ~sum(1 for _ in group)~ rather than ~len~ (it has no length).`,
      String.raw`For decode, ~itertools.repeat(item, count)~ paired with ~yield from~ expands a pair in one line.`,
    ],
    solution: String.raw`from itertools import groupby, repeat
from typing import Iterable, Iterator

def rle_encode(iterable: Iterable) -> Iterator[tuple]:
    for key, group in groupby(iterable):
        yield (key, sum(1 for _ in group))

def rle_decode(pairs: Iterable) -> Iterator:
    for item, count in pairs:
        yield from repeat(item, count)`,
    tests: [
      { name: "encode counts consecutive runs", code: String.raw`res = list(rle_encode("aaabbbc"))
assert res == [("a", 3), ("b", 3), ("c", 1)], f"got {res}"` },
      { name: "encode does NOT merge non-adjacent equal items", code: String.raw`res = list(rle_encode("aabaa"))
assert res == [("a", 2), ("b", 1), ("a", 2)], f"got {res}"` },
      { name: "encode on empty input yields nothing", code: String.raw`res = list(rle_encode([]))
assert res == [], f"expected [], got {res}"` },
      { name: "encode works on non-string iterables", code: String.raw`res = list(rle_encode([1, 1, 2, 2, 2, 3]))
assert res == [(1, 2), (2, 3), (3, 1)], f"got {res}"` },
      { name: "decode expands each pair by its count", code: String.raw`res = list(rle_decode([("x", 2), ("y", 1), ("z", 3)]))
assert res == ["x", "x", "y", "z", "z", "z"], f"got {res}"` },
      { name: "encode then decode round-trips the original", code: String.raw`original = list("aaabbaaac")
res = list(rle_decode(rle_encode(original)))
assert res == original, f"round-trip failed: {res}"` },
    ],
  };

  // ================= Day 6 =================
  W.days.push({
    id: "w1d6",
    title: "Concurrency Without Tears",
    minutes: 165,
    blocks: [
      { type: "lesson",   id: "w1d6-lesson", minutes: 20 },
      { type: "quiz",     id: "w1d6-quiz",   minutes: 10 },
      { type: "homework", id: "w1-hw1",      minutes: 55 },
      { type: "homework", id: "w1-hw2",      minutes: 45 },
      { type: "boss",     id: "w1-boss",     minutes: 35 },
    ],
  });

  W.lessons["w1d6-lesson"] = {
    title: "Concurrency Without Tears",
    md: String.raw`Concurrency is where confident candidates suddenly hedge. The fix is not memorizing APIs — it is one clear decision ("is this IO-bound or CPU-bound?") and an honest model of what the GIL does. Get those two right and the rest is vocabulary.

### The GIL, stated precisely

The Global Interpreter Lock lets only **one thread execute Python bytecode at a time**. It does not stop threads from existing or running — it stops them from running Python *simultaneously*. The detail that matters: the GIL is **released** during blocking IO (sockets, disk, sleep) and inside many C extensions (NumPy's heavy math). So:

~~~python
# CPU-bound pure Python: threads take turns on the GIL -> no real speedup
# IO-bound (network, disk): the GIL is released while waiting -> threads overlap
~~~

That single fact drives every decision below.

### Three tools, one question

Choose by the bottleneck, never by taste:

~~~text
IO-bound, a handful of tasks   -> threads (threading) or asyncio
IO-bound, thousands of tasks   -> asyncio (one thread, tasks are cheap)
CPU-bound                      -> processes (multiprocessing) = real parallelism
Blocking library, must overlap -> processes, or loop.run_in_executor from asyncio
~~~

In this course ~threading~ and ~multiprocessing~ are **theory** — the browser runtime cannot spawn them — but saying this table out loud is exactly what an interviewer wants. ~asyncio~, on the other hand, runs here for real, so today's homework is async.

### async / await: cooperative, single-threaded

An ~async def~ is a coroutine function; calling it returns a coroutine object that runs **nothing** until awaited. ~await~ hands control back to the event loop at a suspension point, letting other coroutines run while this one waits.

~~~python
import asyncio

async def greet(name):
    await asyncio.sleep(0.1)      # yields to the loop; NOT a blocking sleep
    return f"hi {name}"

asyncio.run(greet("Sam"))         # one entry point drives the loop
~~~

The mental model: there is **one thread**. Coroutines cooperate by awaiting. If you call a blocking function (~time.sleep~, a synchronous ~requests.get~) inside a coroutine, you freeze the entire loop — only awaiting async IO keeps concurrency alive.

### Fan out: gather, semaphores, timeouts

~~~python
async def main():
    results = await asyncio.gather(fetch(1), fetch(2), fetch(3))   # concurrent; order preserved

    sem = asyncio.Semaphore(10)          # at most 10 in flight
    async def guarded(x):
        async with sem:
            return await fetch(x)

    got = await asyncio.wait_for(fetch(9), timeout=2.0)   # raises TimeoutError if too slow
    return results, got
~~~

~gather~ launches everything at once and returns results in **call order**, not completion order. A ~Semaphore~ throttles how many coroutines run concurrently — essential against a rate-limited API. ~wait_for~ cancels a coroutine that overruns and raises ~TimeoutError~, which you catch to supply a fallback.

### The event loop in one breath

The loop keeps a queue of ready tasks. It runs one until it awaits, parks it on whatever it is waiting for, and picks the next ready task; when that IO completes the task is rescheduled. There is **no preemption** — a coroutine runs until it voluntarily awaits — which is precisely why a single blocking call stalls everything.

### ⚠️ Common pitfalls

- Calling ~time.sleep~ or a synchronous request inside a coroutine — it freezes the whole loop, not just that task.
- Expecting threads to speed up CPU-bound pure-Python loops — the GIL serializes them; reach for processes.
- Forgetting to ~await~ a coroutine — you get a coroutine object plus a "never awaited" warning and zero work done.
- ~gather~ over thousands of tasks with no ~Semaphore~ — you open thousands of connections at once and trip limits.
- Assuming ~gather~ returns in completion order — it preserves call order; use ~as_completed~ for completion order.

### 🎤 In interviews, they ask

- "What does the GIL actually prevent, and when does it stop mattering?"
- "IO-bound vs CPU-bound — threads, processes, or asyncio for each, and why?"
- "Walk me through what ~await~ does to the event loop."
- "How do you cap concurrency when hitting a rate-limited API?"
- "Your async rewrite is slower than the sync version — what did you probably do?"

### TL;DR

- GIL = one thread runs Python bytecode at a time; released during IO and in C extensions.
- IO-bound → threads or asyncio; CPU-bound → processes for real parallelism.
- asyncio is single-threaded cooperation; one blocking call freezes the whole loop.
- ~gather~ runs coroutines concurrently and preserves call order; ~Semaphore~ caps in-flight count.
- ~wait_for~ enforces a timeout and cancels the overrun; catch ~TimeoutError~ for a fallback.

### Go deeper

- [asyncio — Asynchronous I/O](https://docs.python.org/3/library/asyncio.html)
- [Developing with asyncio](https://docs.python.org/3/library/asyncio-dev.html)
- [Async IO in Python — Real Python](https://realpython.com/async-io-python/)
`,
  };

  W.quizzes["w1d6-quiz"] = [
    {
      q: String.raw`In CPython, what does the Global Interpreter Lock (GIL) actually guarantee?`,
      options: [
        "Only one process can run Python at a time across the whole machine",
        "Only one thread executes Python bytecode at a time; it is released during blocking IO and inside many C extensions",
        "Threads cannot run at all, so every program must use processes",
        "Python code becomes automatically thread-safe, so locks are never needed",
      ],
      answer: 1,
      explain: String.raw`The GIL serializes *bytecode execution* across threads in one interpreter, but it is dropped during blocking IO and inside C extensions like NumPy. That is why threads still help IO-bound work yet do nothing for CPU-bound pure-Python loops — and why shared mutable state still needs its own locks.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import asyncio

async def f():
    return 42

x = f()
print(type(x).__name__)
~~~`,
      options: [
        "int",
        "coroutine",
        "function",
        "It prints 42",
      ],
      answer: 1,
      explain: String.raw`Calling an ~async def~ does not run it — it builds a coroutine object, so ~type(x).__name__~ is ~coroutine~. The body (and the 42) materialize only when you ~await~ it or run it via ~asyncio.run~. A forgotten ~await~ is the single most common async bug.`,
    },
    {
      q: String.raw`You must download 500 URLs (network-bound) and, separately, hash 500 large files (CPU-bound). Which tools fit best?`,
      options: [
        "Threads for both — threads parallelize everything equally",
        "Processes for both — always the safest default",
        "asyncio (or threads) for the downloads; processes for the hashing",
        "asyncio for both — one loop handles CPU and IO the same way",
      ],
      answer: 2,
      explain: String.raw`Network IO releases the GIL and spends most of its time waiting, so asyncio or threads overlap that waiting cheaply. CPU-bound hashing needs genuine parallelism, which only separate processes provide under the GIL. Matching the tool to the bottleneck is the entire decision.`,
    },
    {
      q: String.raw`What does this print?

~~~python
import asyncio

async def val(x):
    await asyncio.sleep(0)
    return x

async def main():
    return await asyncio.gather(val(3), val(1), val(2))

print(asyncio.run(main()))
~~~`,
      options: [
        "[3, 1, 2]",
        "[1, 2, 3]",
        "[2, 1, 3]",
        "The order is unpredictable",
      ],
      answer: 0,
      explain: String.raw`~asyncio.gather~ runs the coroutines concurrently but returns results in the order you *passed* them, not the order they finished. That call-order guarantee is what makes gather safe for "fan out, then combine". Reach for ~as_completed~ when you actually want completion order.`,
    },
    {
      q: String.raw`Inside a coroutine scheduled with others under ~asyncio.gather~, you call ~time.sleep(2)~ (not ~asyncio.sleep~). What happens?`,
      options: [
        "Only that coroutine pauses; the others keep running normally",
        "asyncio raises an error because blocking calls are forbidden inside coroutines",
        "The 2 seconds are automatically parallelized away by the loop",
        "The entire event loop freezes for 2 seconds — every other coroutine stalls too",
      ],
      answer: 3,
      explain: String.raw`asyncio is single-threaded cooperative multitasking: a coroutine yields control only at an ~await~. A blocking ~time.sleep~ never yields, so the one thread is stuck and every other task waits. Blocking work must become an awaited async call or be pushed to an executor.`,
    },
    {
      q: String.raw`Why wrap your outbound async API calls in ~async with asyncio.Semaphore(20)~?`,
      options: [
        "To cap how many calls run concurrently — respecting rate limits and connection ceilings",
        "To force the calls to run in a guaranteed sequential order",
        "To automatically retry each failed call up to 20 times",
        "To give every call a 20-second timeout",
      ],
      answer: 0,
      explain: String.raw`A ~Semaphore(n)~ lets at most ~n~ coroutines hold it at once, bounding in-flight work. Without it, ~gather~ over thousands of tasks fires thousands of simultaneous connections and trips rate limits. It controls concurrency — not ordering, not retries, not timeouts.`,
    },
    {
      q: String.raw`Your ~asyncio~ rewrite of a CPU-bound number-crunching loop is no faster — slightly slower — than the plain synchronous version. Why?`,
      options: [
        "asyncio needs at least four CPU cores before it shows any benefit",
        "You forgot to call asyncio.run, so nothing actually ran concurrently",
        "asyncio never parallelizes CPU work — one thread, cooperative scheduling; CPU-bound work needs processes",
        "The event loop only accelerates code that performs console output",
      ],
      answer: 2,
      explain: String.raw`asyncio concurrency overlaps *waiting*, not computation — a single thread, no preemption. A CPU-bound loop never awaits, so it gains nothing and even pays the loop's bookkeeping overhead. Real CPU parallelism means ~multiprocessing~ or a process pool.`,
    },
  ];

  W.exercises["w1-hw1"] = {
    title: "Guild Inventory System",
    kind: "homework",
    difficulty: 3,
    xp: 100,
    minutes: 55,
    packages: [],
    brief: "An OOP capstone: dataclasses, containers via dunders, and a real exception hierarchy.",
    description: String.raw`Build the item system for a role-playing guild. This is your Week 1 OOP capstone — it pulls together dataclasses, container protocols, and a designed exception hierarchy.

**1. The exception hierarchy** (callers must be able to catch everything with one ~except InventoryError~):

- ~InventoryError(Exception)~ — the base.
- ~ItemNotFound(InventoryError)~ — removing / unequipping something that is not there.
- ~SlotConflict(InventoryError)~ — equipping into a slot that is already occupied.
- ~NotEquippable(InventoryError)~ — equipping an item whose ~kind~ has no slot.

**2. ~Item~** — a ~@dataclass~ with fields ~name: str~, ~kind: str~, ~power: int = 0~. Kinds include ~"weapon"~, ~"armor"~, ~"potion"~, etc.

**3. ~Inventory~** — wraps a private list (composition, not inheritance):

- ~add(item)~ — append it.
- ~remove(name)~ — remove and **return** the first item with that name; raise ~ItemNotFound(name)~ if absent.
- ~find_by_kind(kind)~ — list of matching items in insertion order.
- ~total_power()~ — sum of every item's ~power~.
- ~__len__~ — number of items; ~__contains__~ — so ~name in inventory~ tests membership by name.

**4. ~Hero~** — has a ~name~ and an ~equipped~ dict mapping slot → ~Item~:

- ~equip(item)~ — only ~"weapon"~ and ~"armor"~ are equippable (else ~NotEquippable~); one item per slot (a second raises ~SlotConflict~; the original stays equipped).
- ~unequip(slot)~ — remove and return the item in that slot; raise ~ItemNotFound~ if the slot is empty.
- ~power()~ — sum of the power of equipped items.

~~~python
inv = Inventory()
inv.add(Item("Sword", "weapon", 10))
"Sword" in inv          # True
inv.total_power()       # 10

hero = Hero("Aria")
hero.equip(Item("Sword", "weapon", 10))
hero.equip(Item("Axe", "weapon", 12))   # raises SlotConflict
~~~

Interview angle: this is the "model a small domain" round. Graders watch for composition over inheriting ~list~, container dunders that make objects feel native, and a one-root exception tree so callers can catch broadly or precisely. Enforcing invariants (one weapon, one armor) with custom errors is the whole point.`,
    starter: String.raw`from dataclasses import dataclass


class InventoryError(Exception):
    """Base class for every inventory / equipment failure."""


# TODO: ItemNotFound, SlotConflict, NotEquippable — all subclasses of InventoryError


@dataclass
class Item:
    name: str
    kind: str
    power: int = 0


class Inventory:
    def __init__(self) -> None:
        self._items: list = []

    def add(self, item: Item) -> None:
        raise NotImplementedError

    def remove(self, name: str) -> Item:
        raise NotImplementedError

    def find_by_kind(self, kind: str) -> list:
        raise NotImplementedError

    def total_power(self) -> int:
        raise NotImplementedError


class Hero:
    SLOTS = ("weapon", "armor")

    def __init__(self, name: str) -> None:
        self.name = name
        self.equipped: dict = {}

    def equip(self, item: Item) -> None:
        raise NotImplementedError`,
    hints: [
      String.raw`Define the three custom errors as one-liners inheriting ~InventoryError~ so callers can ~except InventoryError~ once and still catch each precisely.`,
      String.raw`~Inventory~ should compose a private ~self._items~ list; implement ~__len__~ as ~len(self._items)~ and ~__contains__~ as ~any(it.name == name for it in self._items)~.`,
      String.raw`In ~equip~: first reject a kind not in ~Hero.SLOTS~ with ~NotEquippable~, then reject an occupied slot with ~SlotConflict~, otherwise store ~self.equipped[item.kind] = item~.`,
    ],
    solution: String.raw`from dataclasses import dataclass


class InventoryError(Exception):
    """Base class for every inventory / equipment failure."""


class ItemNotFound(InventoryError):
    """Removing or unequipping something that is not present."""


class SlotConflict(InventoryError):
    """Equipping into a slot that is already occupied."""


class NotEquippable(InventoryError):
    """Trying to equip an item whose kind has no slot."""


@dataclass
class Item:
    name: str
    kind: str
    power: int = 0


class Inventory:
    def __init__(self) -> None:
        self._items: list[Item] = []

    def add(self, item: Item) -> None:
        self._items.append(item)

    def remove(self, name: str) -> Item:
        for i, it in enumerate(self._items):
            if it.name == name:
                return self._items.pop(i)
        raise ItemNotFound(name)

    def find_by_kind(self, kind: str) -> list[Item]:
        return [it for it in self._items if it.kind == kind]

    def total_power(self) -> int:
        return sum(it.power for it in self._items)

    def __len__(self) -> int:
        return len(self._items)

    def __contains__(self, name: object) -> bool:
        return any(it.name == name for it in self._items)


class Hero:
    SLOTS = ("weapon", "armor")

    def __init__(self, name: str) -> None:
        self.name = name
        self.equipped: dict[str, Item] = {}

    def equip(self, item: Item) -> None:
        if item.kind not in self.SLOTS:
            raise NotEquippable(f"{item.kind!r} has no equipment slot")
        if item.kind in self.equipped:
            held = self.equipped[item.kind].name
            raise SlotConflict(f"{item.kind} slot already holds {held!r}")
        self.equipped[item.kind] = item

    def unequip(self, slot: str) -> Item:
        if slot not in self.equipped:
            raise ItemNotFound(slot)
        return self.equipped.pop(slot)

    def power(self) -> int:
        return sum(it.power for it in self.equipped.values())`,
    tests: [
      { name: "add grows the inventory and membership is by name", code: String.raw`inv = Inventory()
inv.add(Item("Sword", "weapon", 10))
inv.add(Item("Shield", "armor", 5))
assert len(inv) == 2, f"expected 2 items, got {len(inv)}"
assert "Sword" in inv, "membership should find Sword by name"
assert "Bow" not in inv, "an absent name must not report present"` },
      { name: "total_power sums the power of every item", code: String.raw`inv = Inventory()
inv.add(Item("Sword", "weapon", 10))
inv.add(Item("Potion", "potion", 0))
inv.add(Item("Shield", "armor", 5))
assert inv.total_power() == 15, f"expected 15, got {inv.total_power()}"` },
      { name: "find_by_kind returns matches in insertion order", code: String.raw`inv = Inventory()
inv.add(Item("Sword", "weapon", 10))
inv.add(Item("Dagger", "weapon", 3))
inv.add(Item("Shield", "armor", 5))
names = [w.name for w in inv.find_by_kind("weapon")]
assert names == ["Sword", "Dagger"], f"got {names}"` },
      { name: "remove returns the item and shrinks the inventory", code: String.raw`inv = Inventory()
inv.add(Item("Sword", "weapon", 10))
inv.add(Item("Shield", "armor", 5))
gone = inv.remove("Sword")
assert gone.name == "Sword", f"remove should return the removed item, got {gone}"
assert "Sword" not in inv and len(inv) == 1, "the item should be gone after remove"` },
      { name: "removing an absent item raises ItemNotFound", code: String.raw`inv = Inventory()
inv.add(Item("Shield", "armor", 5))
raised = False
try:
    inv.remove("Sword")
except ItemNotFound:
    raised = True
assert raised, "removing a missing item must raise ItemNotFound"` },
      { name: "equip fills a slot and adds to hero power", code: String.raw`h = Hero("Aria")
h.equip(Item("Sword", "weapon", 10))
h.equip(Item("Shield", "armor", 5))
assert h.power() == 15, f"expected 15, got {h.power()}"
assert h.equipped["weapon"].name == "Sword", "weapon slot should hold the Sword"` },
      { name: "equipping a second weapon raises SlotConflict and keeps the first", code: String.raw`h = Hero("Aria")
h.equip(Item("Sword", "weapon", 10))
raised = False
try:
    h.equip(Item("Axe", "weapon", 12))
except SlotConflict:
    raised = True
assert raised, "the one-weapon rule must raise SlotConflict"
assert h.equipped["weapon"].name == "Sword", "the original weapon must stay equipped"` },
      { name: "equipping a non-equippable kind raises NotEquippable", code: String.raw`h = Hero("Aria")
raised = False
try:
    h.equip(Item("Potion", "potion", 0))
except NotEquippable:
    raised = True
assert raised, "a potion has no slot and must raise NotEquippable"` },
      { name: "every custom error is catchable as InventoryError", code: String.raw`h = Hero("Aria")
h.equip(Item("Sword", "weapon", 10))
caught = None
try:
    h.equip(Item("Axe", "weapon", 12))
except InventoryError as e:
    caught = type(e).__name__
assert caught == "SlotConflict", f"expected SlotConflict caught via InventoryError, got {caught}"` },
      { name: "unequip frees the slot and empty-slot unequip raises ItemNotFound", code: String.raw`h = Hero("Aria")
h.equip(Item("Sword", "weapon", 10))
removed = h.unequip("weapon")
assert removed.name == "Sword", f"unequip should return the item, got {removed}"
h.equip(Item("Axe", "weapon", 12))   # slot is free again
assert h.equipped["weapon"].name == "Axe", "the slot should accept a new weapon after unequip"
raised = False
try:
    h.unequip("armor")   # nothing equipped there
except ItemNotFound:
    raised = True
assert raised, "unequipping an empty slot must raise ItemNotFound"` },
    ],
  };

  W.exercises["w1-hw2"] = {
    title: "Async Task Fleet",
    kind: "homework",
    difficulty: 3,
    xp: 100,
    minutes: 45,
    packages: [],
    asyncMode: true,
    brief: "Real asyncio: gather in order, throttle with a semaphore, and time out with a fallback.",
    description: String.raw`Time to run ~asyncio~ for real. You will coordinate a fleet of simulated fetches. A "task" is a ~(task_id, delay)~ pair; ~fetch~ waits, then returns the ~task_id~.

Implement four coroutines:

- ~async def fetch(task_id, delay)~ — ~await asyncio.sleep(min(delay, 0.05))~, then ~return task_id~. (The cap keeps tests fast.)
- ~async def gather_all(tasks)~ — run every ~(task_id, delay)~ **concurrently** and return the results as a list in **input order** (not completion order).
- ~async def run_limited(tasks, max_concurrent)~ — same, but never let more than ~max_concurrent~ fetches run at once, using an ~asyncio.Semaphore~. Order is still preserved.
- ~async def fetch_with_timeout(task_id, delay, timeout, fallback)~ — return ~fetch~'s result, or ~fallback~ if it takes longer than ~timeout~, using ~asyncio.wait_for~.

~~~python
await gather_all([(3, 0.05), (1, 0.01), (2, 0.03)])   # [3, 1, 2] — input order
await run_limited([(1, 0.02), (2, 0.02), (3, 0.02)], 2)   # [1, 2, 3], max 2 at a time
await fetch_with_timeout(1, 10.0, 0.01, -1)           # -1 — timed out, fell back
~~~

Interview angle: this is the canonical "you understand asyncio" screen. It checks three reflexes: ~gather~ preserves call order, a ~Semaphore~ bounds concurrency against rate limits, and ~wait_for~ plus catching ~asyncio.TimeoutError~ is how you keep one slow dependency from hanging the whole request.`,
    starter: String.raw`import asyncio


async def fetch(task_id: int, delay: float) -> int:
    """Await asyncio.sleep(min(delay, 0.05)), then return task_id."""
    raise NotImplementedError


async def gather_all(tasks: list[tuple[int, float]]) -> list[int]:
    """Run all (task_id, delay) pairs concurrently; results in INPUT order."""
    raise NotImplementedError


async def run_limited(tasks: list[tuple[int, float]], max_concurrent: int) -> list[int]:
    """Like gather_all, but cap in-flight fetches with an asyncio.Semaphore."""
    raise NotImplementedError


async def fetch_with_timeout(task_id: int, delay: float, timeout: float, fallback: int) -> int:
    """Return fetch's result, or fallback if it exceeds timeout (asyncio.wait_for)."""
    raise NotImplementedError`,
    hints: [
      String.raw`~gather_all~: ~asyncio.gather(*(fetch(tid, d) for tid, d in tasks))~ runs them concurrently and already returns results in the order you passed the coroutines.`,
      String.raw`~run_limited~: make one ~sem = asyncio.Semaphore(max_concurrent)~, wrap each fetch in ~async with sem:~, then gather the wrapped coroutines — the semaphore, not gather, is what throttles.`,
      String.raw`~fetch_with_timeout~: ~try: return await asyncio.wait_for(fetch(...), timeout)~ and ~except asyncio.TimeoutError: return fallback~.`,
    ],
    solution: String.raw`import asyncio


async def fetch(task_id: int, delay: float) -> int:
    await asyncio.sleep(min(delay, 0.05))
    return task_id


async def gather_all(tasks: list[tuple[int, float]]) -> list[int]:
    return list(await asyncio.gather(*(fetch(tid, d) for tid, d in tasks)))


async def run_limited(tasks: list[tuple[int, float]], max_concurrent: int) -> list[int]:
    sem = asyncio.Semaphore(max_concurrent)

    async def guarded(tid: int, d: float) -> int:
        async with sem:
            return await fetch(tid, d)

    return list(await asyncio.gather(*(guarded(tid, d) for tid, d in tasks)))


async def fetch_with_timeout(task_id: int, delay: float, timeout: float, fallback: int) -> int:
    try:
        return await asyncio.wait_for(fetch(task_id, delay), timeout)
    except asyncio.TimeoutError:
        return fallback`,
    tests: [
      { name: "gather_all returns results in INPUT order, not completion order", code: String.raw`res = await gather_all([(3, 0.05), (1, 0.01), (2, 0.03)])
assert res == [3, 1, 2], f"gather_all must preserve input order, got {res}"` },
      { name: "gather_all on an empty list returns []", code: String.raw`res = await gather_all([])
assert res == [], f"expected [], got {res}"` },
      { name: "gather_all handles many tasks, still in order", code: String.raw`tasks = [(i, 0.01) for i in range(10)]
res = await gather_all(tasks)
assert res == list(range(10)), f"got {res}"` },
      { name: "run_limited preserves order and results", code: String.raw`res = await run_limited([(3, 0.02), (1, 0.01), (2, 0.03), (4, 0.01)], 2)
assert res == [3, 1, 2, 4], f"run_limited must preserve input order, got {res}"` },
      { name: "run_limited actually caps concurrency (6 tasks, 2 at a time -> waves)", code: String.raw`import time
tasks = [(i, 0.05) for i in range(6)]
t0 = time.perf_counter()
res = await run_limited(tasks, 2)
elapsed = time.perf_counter() - t0
assert res == list(range(6)), f"results wrong: {res}"
assert elapsed >= 0.12, f"Semaphore(2) must serialize 6 tasks into 3 waves (about 0.15s); got {elapsed:.3f}s, so concurrency was not limited"` },
      { name: "run_limited with a high limit behaves like full concurrency", code: String.raw`res = await run_limited([(5, 0.02), (6, 0.02), (7, 0.02)], 10)
assert res == [5, 6, 7], f"got {res}"` },
      { name: "fetch_with_timeout returns the fallback when fetch is too slow", code: String.raw`res = await fetch_with_timeout(1, 10.0, 0.01, -1)
assert res == -1, f"a fetch slower than the timeout must return the fallback, got {res}"` },
      { name: "fetch_with_timeout returns the real result within the timeout", code: String.raw`res = await fetch_with_timeout(7, 0.01, 0.05, -1)
assert res == 7, f"a fetch within the timeout must return its result, got {res}"` },
    ],
  };

  W.exercises["w1-boss-t1"] = {
    title: "LRUCache",
    kind: "boss",
    difficulty: 2,
    xp: 40,
    minutes: 25,
    packages: [],
    brief: "The classic: a fixed-capacity cache that evicts the least-recently-used key.",
    description: String.raw`Implement ~LRUCache(capacity)~ — the interview evergreen (LeetCode 146). It holds at most ~capacity~ key/value pairs and, when full, evicts the **least recently used** entry to make room.

- ~LRUCache(capacity)~ — ~capacity~ must be at least 1, else raise ~ValueError~.
- ~get(key)~ — return the value and mark the key most-recently-used; return ~-1~ if the key is absent.
- ~put(key, value)~ — insert or update; mark it most-recently-used; if that pushes the size past ~capacity~, evict the least-recently-used key.

Both operations should be O(1) — reach for ~collections.OrderedDict~ (or Python 3.7+ dict ordering) and its ~move_to_end~ / ~popitem(last=False)~.

~~~python
c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
c.get(1)          # 1  (key 1 is now most-recently-used)
c.put(3, 3)       # capacity exceeded -> evicts key 2 (the LRU)
c.get(2)          # -1 (evicted)
~~~

Interview angle: LRU is the single most-asked design-a-data-structure question. Graders want O(1) get/put and, above all, correct *recency* bookkeeping — that reading a key protects it from the next eviction.`,
    starter: String.raw`from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int) -> None:
        # capacity < 1 is invalid
        raise NotImplementedError

    def get(self, key) -> int:
        raise NotImplementedError

    def put(self, key, value) -> None:
        raise NotImplementedError`,
    hints: [
      String.raw`Store entries in an ~OrderedDict~ where the *front* is the least-recently-used and the *back* is the most-recently-used.`,
      String.raw`On ~get~ (and on updating an existing key in ~put~), call ~self._data.move_to_end(key)~ to refresh recency; return ~-1~ when the key is missing.`,
      String.raw`After inserting in ~put~, if ~len(self._data) > self.capacity~, drop the oldest with ~self._data.popitem(last=False)~.`,
    ],
    solution: String.raw`from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int) -> None:
        if capacity < 1:
            raise ValueError("capacity must be >= 1")
        self.capacity = capacity
        self._data: OrderedDict = OrderedDict()

    def get(self, key) -> int:
        if key not in self._data:
            return -1
        self._data.move_to_end(key)
        return self._data[key]

    def put(self, key, value) -> None:
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = value
        if len(self._data) > self.capacity:
            self._data.popitem(last=False)`,
    tests: [
      { name: "get on a missing key returns -1", code: String.raw`c = LRUCache(2)
assert c.get(99) == -1, "a missing key must return -1"` },
      { name: "put then get returns the stored value", code: String.raw`c = LRUCache(2)
c.put("a", 1)
assert c.get("a") == 1, f"expected 1, got {c.get('a')}"` },
      { name: "canonical LeetCode 146 eviction sequence", code: String.raw`c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
assert c.get(1) == 1
c.put(3, 3)                 # evicts key 2 (least recently used)
assert c.get(2) == -1, "key 2 should have been evicted"
c.put(4, 4)                 # evicts key 1
assert c.get(1) == -1, "key 1 should have been evicted"
assert c.get(3) == 3 and c.get(4) == 4` },
      { name: "reading a key protects it from the next eviction", code: String.raw`c = LRUCache(2)
c.put(1, 10); c.put(2, 20)
assert c.get(1) == 10        # 1 becomes MRU, so 2 is now the LRU
c.put(3, 30)                 # evicts 2, not the recently-read 1
assert c.get(2) == -1, "the recently-read key 1 must survive; 2 is evicted"
assert c.get(1) == 10` },
      { name: "updating an existing key overwrites value and refreshes recency", code: String.raw`c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
c.put(1, 100)                # update value AND make key 1 most-recently-used
assert c.get(1) == 100, f"expected updated value 100, got {c.get(1)}"
c.put(3, 3)                  # evicts 2 (the LRU), not 1
assert c.get(2) == -1 and c.get(1) == 100` },
      { name: "capacity below 1 raises ValueError", code: String.raw`raised = False
try:
    LRUCache(0)
except ValueError:
    raised = True
assert raised, "capacity < 1 must raise ValueError"` },
    ],
  };

  W.boss = {
    id: "w1-boss",
    title: "T1 — Python Base",
    timeLimitMin: 30,
    passPct: 70,
    intro: String.raw`Twelve questions sampling the whole week, then one classic build: an LRU cache. Score 70% or better to claim the T1 badge and prove your Python base is interview-solid.`,
    quiz: [
      {
        q: String.raw`When is ~a is b~ the right comparison rather than ~a == b~?`,
        options: [
          "Whenever you compare integers, since small ints are cached",
          "Only when checking against a singleton like None (identity), never for value equality",
          "Always — is is just a faster ==",
          "When comparing strings, because CPython interns them",
        ],
        answer: 1,
        explain: String.raw`~is~ tests object identity (same object in memory); ~==~ tests value via ~__eq__~. Reserve ~is~ for singletons such as ~None~. Integer caching and string interning make ~is~ *appear* to work for values, but that is an implementation detail you must never depend on.`,
      },
      {
        q: String.raw`What does this print?

~~~python
a = [[0, 0], [0, 0]]
b = a[:]
b[0][0] = 9
print(a[0][0])
~~~`,
        options: [
          "0",
          "None",
          "It raises an IndexError",
          "9",
        ],
        answer: 3,
        explain: String.raw`A slice copy is *shallow*: ~b~ is a new outer list, but its elements are the same inner lists as ~a~. Mutating ~b[0][0]~ mutates the shared inner list, so ~a[0][0]~ becomes 9. True independence needs ~copy.deepcopy~.`,
      },
      {
        q: String.raw`What does this print?

~~~python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])
~~~`,
        options: [
          "[0, 1, 2]",
          "[2, 2, 2]",
          "[0, 0, 0]",
          "[3, 3, 3]",
        ],
        answer: 1,
        explain: String.raw`Closures capture the *variable* ~i~, not its value at creation time. All three lambdas share one ~i~, which is 2 after the loop ends, so every call returns 2. Bind per iteration with a default arg — ~lambda i=i: i~ — to get [0, 1, 2].`,
      },
      {
        q: String.raw`Why decorate your wrapper with ~@functools.wraps(func)~ inside a decorator?`,
        options: [
          "It makes the decorated function run measurably faster",
          "It is mandatory or the decorator raises at import time",
          "It copies __name__, __doc__ and other metadata from the original onto the wrapper",
          "It automatically caches the function's return values",
        ],
        answer: 2,
        explain: String.raw`Without ~functools.wraps~ the wrapper overwrites the original's identity — ~__name__~ becomes "wrapper", the docstring disappears, and debuggers get confused. ~wraps~ copies that metadata across. It has nothing to do with speed, caching, or import correctness.`,
      },
      {
        q: String.raw`You add ~__eq__~ so instances with equal fields compare equal. What else is needed to keep them usable as dict keys or set members?`,
        options: [
          "Nothing — defining __eq__ is enough on its own",
          "Define __lt__ so the instances can be ordered",
          "Mark the class with @final",
          "Define __hash__ consistently with __eq__ (equal objects must hash equally), or the class becomes unhashable",
        ],
        answer: 3,
        explain: String.raw`Defining ~__eq__~ sets ~__hash__~ to None, making instances unhashable. Provide a ~__hash__~ built from the same fields as ~__eq__~ so equal objects hash equally — the contract hash tables depend on. A ~frozen=True~ dataclass does this automatically.`,
      },
      {
        q: String.raw`What does this print?

~~~python
from dataclasses import dataclass

@dataclass
class P:
    x: int
    y: int

print(P(1, 2) == P(1, 2))
~~~`,
        options: [
          "True",
          "False",
          "It raises TypeError",
          "It prints the object's id",
        ],
        answer: 0,
        explain: String.raw`~@dataclass~ generates an ~__eq__~ that compares instances field by field (as a tuple), so two ~P~ with the same ~x~ and ~y~ are equal. Without the decorator the default ~__eq__~ is identity-based and this would print False.`,
      },
      {
        q: String.raw`An ABC has one ~@abstractmethod~; a subclass forgets to implement it. When does the failure surface?`,
        options: [
          "At class-definition time of the subclass",
          "Never — Python fills in a no-op automatically",
          "When you try to instantiate the subclass — TypeError: Can't instantiate abstract class",
          "Only when the missing method is eventually called",
        ],
        answer: 2,
        explain: String.raw`ABCs fail fast at *instantiation*: constructing an instance whose class still has unimplemented abstract methods raises ~TypeError~. Defining the subclass is fine; enforcement fires the moment you call the constructor — the early, loud failure that duck typing lacks.`,
      },
      {
        q: String.raw`What does this print?

~~~python
class Guard:
    def __enter__(self): return self
    def __exit__(self, *a): return True

with Guard():
    raise ValueError("x")
print("after")
~~~`,
        options: [
          "It prints after",
          "ValueError propagates and nothing is printed",
          "It prints after, then raises ValueError",
          "TypeError — the __exit__ signature is wrong",
        ],
        answer: 0,
        explain: String.raw`A truthy return from ~__exit__~ tells Python the exception was handled, so the ~ValueError~ is suppressed and execution continues past the block, printing "after". This is exactly how ~contextlib.suppress~ works — and why an accidental truthy ~__exit__~ silently eats every error.`,
      },
      {
        q: String.raw`What does this print?

~~~python
g = (n for n in range(3))
print(list(g), list(g))
~~~`,
        options: [
          "[0, 1, 2] [0, 1, 2]",
          "[0, 1, 2] []",
          "[] [0, 1, 2]",
          "[0, 1, 2] [3, 4, 5]",
        ],
        answer: 1,
        explain: String.raw`A generator is a one-shot iterator. The first ~list(g)~ drains it to [0, 1, 2]; the second sees it already exhausted and yields []. Generators never rewind — materialize a list first if you must iterate more than once.`,
      },
      {
        q: String.raw`~itertools.groupby~ returned fragmented groups for your data. What actually fixes it?`,
        options: [
          "Pass sort=True to groupby",
          "Wrap the input in list() before calling groupby",
          "Sort the input by the same key first — groupby only groups adjacent equal keys",
          "Call groupby twice in a row",
        ],
        answer: 2,
        explain: String.raw`~groupby~ starts a new group whenever the key changes between *adjacent* items, so non-contiguous equal keys split into separate groups. Sorting by the grouping key first makes equal keys adjacent. There is no ~sort~ parameter — ordering is your job.`,
      },
      {
        q: String.raw`A pure-Python CPU-bound function is slow. Does splitting it across several ~threading.Thread~ workers speed it up?`,
        options: [
          "Yes — threads always run in parallel across multiple cores",
          "Yes, but only if you add locks around the computation",
          "No — threads cannot execute functions, only IO",
          "No — the GIL lets only one thread run Python bytecode at a time; use processes for CPU-bound work",
        ],
        answer: 3,
        explain: String.raw`The GIL serializes Python bytecode across threads, so CPU-bound pure-Python code sees essentially no speedup from threading. Real parallelism for CPU work means separate processes (~multiprocessing~). Threads still help IO-bound work, where the GIL is released during waits.`,
      },
      {
        q: String.raw`Under ~asyncio.gather(a(), b(), c())~, in what order do the results come back?`,
        options: [
          "In the order the coroutines were passed — a, b, c — regardless of who finished first",
          "In the order the coroutines actually finished",
          "Sorted by the returned value",
          "A different, random order each run",
        ],
        answer: 0,
        explain: String.raw`~gather~ runs the coroutines concurrently but returns a list in *call* order, no matter who finished first. That determinism is what makes it safe for fan-out-then-combine. Reach for ~asyncio.as_completed~ when you want results in completion order instead.`,
      },
    ],
    tasks: ["w1-boss-t1"],
  };

  // __APPEND_BEFORE_THIS_LINE__
})();
