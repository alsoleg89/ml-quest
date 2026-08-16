/* ML Quest — Week 5: Agents & Production */
(function () {
  const W = {
    num: 5,
    id: "w5",
    emoji: "⚙️",
    title: "Agents & Production",
    subtitle: "Ship it, monitor it, defend it in the interview",
    goal: "Design agentic and production ML systems — and close out interview-ready.",
    days: [],
    lessons: {},
    quizzes: {},
    exercises: {},
    boss: null,
  };
  CourseData.weeks.push(W);

  // ================= Day 1 =================
  W.days.push({
    id: "w5d1",
    title: "Agents: Loops With Tools",
    minutes: 122,
    blocks: [
      { type: "lesson",   id: "w5d1-lesson", minutes: 25 },
      { type: "quiz",     id: "w5d1-quiz",   minutes: 12 },
      { type: "exercise", id: "w5d1-e1",     minutes: 25 },
      { type: "exercise", id: "w5d1-e2",     minutes: 30 },
      { type: "exercise", id: "w5d1-e3",     minutes: 20, optional: true },
      { type: "cards",    deck: "agents",    count: 8, minutes: 10 },
    ],
  });

  W.lessons["w5d1-lesson"] = {
    title: "Agents: Loops With Tools",
    md: String.raw`Agent questions moved from bonus round to core screen for LLM-engineer roles. The bar is not "have you used a framework" — it is "can you draw the loop on a whiteboard, name the failure modes, and say when NOT to build one". This lesson gives you exactly that.

### An agent is a loop, not a model

Strip away the hype and an agent is four things: an LLM, a loop, tools, and state. The model decides; the loop executes; tools touch the world; state carries what happened back into the next decision.

~~~python
state = [goal]
for step in range(MAX_STEPS):
    decision = llm(state)                 # think
    if decision.is_final:
        return decision.answer
    obs = call_tool(decision.name, decision.args)   # act
    state.append((decision, obs))         # observe
return None                               # budget exhausted
~~~

That is the whole trick. Everything else — planning, memory, multi-agent — is engineering around this loop.

**The golden rule:** if you can write the steps down in advance, you do not need an agent. A fixed pipeline (prompt chain, one extraction call, deterministic code) is cheaper, faster, testable, and debuggable. Agents earn their keep only when the number and order of steps depend on intermediate results. Interviewers deliberately probe this: proposing an agent for a fixed 3-step task is a red flag.

### ReAct: thought, action, observation

ReAct is the pattern most production loops still descend from: the model alternates explicit reasoning with tool calls, and every observation is appended to the context before the next thought.

~~~text
Thought: I need the invoice total before I can compare plans.
Action:  db_lookup{"invoice_id": "A-1042"}
Observation: {"total": 1800, "currency": "USD"}
Thought: Now compare against the Pro plan price.
Action:  final_answer{"text": "Invoice A-1042 is 1800 USD, 200 under Pro."}
~~~

Why it works: the model never has to plan five steps blind — each step is grounded in a real observation. Why it fails: transcripts grow (cost), errors compound (a wrong observation poisons later thoughts), and loops can spiral without a step budget.

### Tools are an API contract

Function calling means the model emits a structured call — name plus JSON args — and your runtime validates and executes it. Treat tool definitions like public API docs, because to the model that is what they are:

~~~python
{
  "name": "search_orders",
  "description": "Look up a customer order by id. Use for order status questions.",
  "parameters": {
    "type": "object",
    "properties": {"order_id": {"type": "string", "pattern": "ORD-[0-9]+"}},
    "required": ["order_id"]
  }
}
~~~

Precise names, one-line when-to-use descriptions, small typed schemas, required fields marked. Validation on your side must be paranoid: unknown tool, missing args, extra args — every failure becomes a structured error observation fed back to the model, never an exception that kills the loop. You will build exactly this in today's exercises.

**MCP in one line:** the Model Context Protocol is USB for tools — a standard protocol so any client (IDE, chat app, agent runtime) can plug into any tool or data server, instead of every app hand-wiring every integration.

### Planning and memory

Two planning styles, both interview-quotable. **Plan-then-execute:** the model writes a full plan up front, then executes steps — predictable, auditable, cheaper per step, but brittle when step 2 invalidates the plan. **Reactive (ReAct):** decide one step at a time — adaptive, but can wander and costs a model call per step. Production systems often mix them: plan once, re-plan on surprise.

Memory is simpler than vendors make it sound. Short-term memory is literally the context window — the transcript of the current episode. Long-term memory is an external store (files, a database, a vector index) the agent reads and writes through tools. When the transcript outgrows the window you trim it: keep the system message, keep the most recent turns, summarize or drop the middle. That trimming function is one of today's exercises.

### Multi-agent: when it helps, when it is hype

Real wins: **parallel fan-out** (a research lead spawns readers that each digest one source), **context isolation** (each subagent keeps a clean, focused window instead of one polluted mega-transcript), and **least privilege** (the reviewer agent has no write tools). Real costs: latency, tokens, and coordination bugs — errors compound across handoffs. For a sequential task, one agent with good tools beats a committee. "Multi-agent always beats single agent" is a hype claim; say so in interviews, with the parallel-research counterexample where it genuinely does help.

### Guardrails and evals

Production agents ship with seatbelts:

- **Max steps and max tokens** — bound cost and kill infinite loops.
- **Tool allowlists** — the agent can only call what this session registered. Least privilege per task.
- **Output validation** — schema-check every tool call and the final answer before acting on it.
- **Human-in-the-loop** — irreversible or expensive actions (refunds, deletes, sends) require approval above a threshold.
- **Timeouts and budgets** — wall-clock and dollar caps per episode.

Evaluating agents is its own discipline: measure end-to-end task success rate on a fixed scenario suite, plus step efficiency (did it take 4 calls or 19?), tool-error rate, and guardrail hits. Log full transcripts; replay them when you change prompts. A 5-point success-rate drop on your scenario suite is a regression even if demos look fine.

### ⚠️ Common pitfalls

- Building an agent for a task a fixed pipeline solves — the number one architecture smell.
- Letting tool errors raise exceptions instead of returning structured error observations the model can recover from.
- No step budget: a confused model happily loops 200 times at your expense.
- Catch-all tools like ~run(command)~ — unvalidatable, unauditable, and an injection magnet.
- Testing single responses instead of whole episodes — agents fail at the trajectory level.

### 🎤 In interviews, they ask

- Sketch an agent loop. Where do errors go, and what stops it from running forever?
- When would you NOT use an agent? Give a concrete task and the cheaper design.
- Design the tool schema for a flight-rebooking agent. Which calls need human approval?
- ReAct vs plan-then-execute — tradeoffs, and when you would re-plan.
- How do you evaluate an agent beyond eyeballing demos?

### TL;DR

- Agent = LLM + loop + tools + state. The model decides, your code executes.
- If the steps are known in advance, build a pipeline, not an agent.
- ReAct grounds each decision in an observation; budget the steps.
- Tool definitions are API contracts: tight names, descriptions, typed schemas, paranoid validation.
- Multi-agent pays off for parallel fan-out and context isolation, not for sequential tasks.
- Guardrails: max steps, allowlists, output validation, human sign-off on irreversible actions.
- Evaluate trajectories: task success rate, step efficiency, tool-error rate.

### Go deeper

- [Building effective agents (Anthropic engineering)](https://www.anthropic.com/engineering/building-effective-agents)
- [Model Context Protocol docs](https://modelcontextprotocol.io)
- [ReAct: Synergizing Reasoning and Acting (paper)](https://arxiv.org/abs/2210.03629)
`,
  };

  W.quizzes["w5d1-quiz"] = [
    {
      q: String.raw`A scripted policy returns, on successive calls: a calc action, a kb_lookup action, then a final answer. You run it with ~max_steps=2~:

~~~python
def run(policy, tools, max_steps):
    transcript = []
    for _ in range(max_steps):
        decision = policy(transcript)
        if "final" in decision:
            return decision["final"], transcript
        obs = tools[decision["action"]](decision["args"])
        transcript.append(obs)
    return None, transcript
~~~

What does it return?`,
      options: [
        "The final answer — the loop always lets the policy finish its plan",
        "(None, transcript with 2 observations) — the budget ran out before the third policy call",
        "It raises StopIteration when the policy runs out of scripted moves",
        "(None, transcript with 3 observations) — the final decision still executes as a tool",
      ],
      answer: 1,
      explain: String.raw`~max_steps~ caps loop iterations, i.e. tool executions. The policy is consulted at the top of each iteration, so with a budget of 2 the third call — the one that would return the final — never happens. That is the guardrail working as designed: bounded cost, and the caller can tell "answered" apart from "budget exhausted".`,
    },
    {
      q: String.raw`You need to turn user bug reports into structured JSON tickets: the same three fields extracted every time, then one API call. What should you build?`,
      options: [
        "An autonomous agent with a planning loop — LLM tasks deserve agents",
        "A multi-agent crew: one extractor agent, one reviewer agent, one JSON agent",
        "A fixed pipeline: one schema-constrained LLM extraction call, then deterministic code — no loop",
        "A ReAct agent with a ticket-creation tool and max_steps=10",
      ],
      answer: 2,
      explain: String.raw`The number and order of steps are known in advance, so a fixed pipeline is cheaper, faster, testable, and debuggable. Agent loops earn their cost only when intermediate results must decide the next step. Proposing an agent here is the classic over-engineering red flag interviewers watch for.`,
    },
    {
      q: String.raw`Which tool definition gives a function-calling model the best chance of calling it correctly?`,
      options: [
        "A precise name, a one-line when-to-use description, and a small typed JSON schema with required fields",
        "One flexible ~run(command: string)~ tool so the model can express anything",
        "A name only — descriptions waste context tokens",
        "The tool's full implementation source code pasted into the description",
      ],
      answer: 0,
      explain: String.raw`The model chooses tools by reading names, descriptions, and schemas — they are its API docs. Tight typed contracts cut wrong-tool and malformed-args failures, and your runtime can validate calls exactly. Catch-all string tools move parsing back onto you, defeat validation, and are an injection magnet.`,
    },
    {
      q: String.raw`What problem does MCP (Model Context Protocol) solve?`,
      options: [
        "It fine-tunes a model so it memorizes your internal tools",
        "It standardizes how clients connect to tool and data servers — one server works with any MCP client, USB-style, instead of N x M custom integrations",
        "It replaces function calling with retrieval",
        "It sandboxes generated Python so tools cannot touch production",
      ],
      answer: 1,
      explain: String.raw`MCP is a wire protocol: a tool or data server implements it once, and any compliant client — IDE, chat app, agent runtime — can discover and call its capabilities. Without a standard, every app hand-wires every integration. MCP does not train models and does not sandbox code.`,
    },
    {
      q: String.raw`When does splitting work across multiple agents genuinely beat one agent with good tools?`,
      options: [
        "Always — each extra agent adds intelligence",
        "Never — multi-agent is purely a marketing construct",
        "When you want to save tokens, since all agents share one context window",
        "When subtasks parallelize or need isolated contexts and different tool permissions — e.g. a research lead fanning out to reader agents",
      ],
      answer: 3,
      explain: String.raw`The real wins are parallel fan-out, context isolation (each agent keeps a clean focused window — they do NOT share one), and least-privilege tool access. For sequential tasks a single well-tooled agent usually wins: handoffs add latency, tokens, and compounding errors. "More agents = smarter" is the hype trap.`,
    },
    {
      q: String.raw`Your support agent can call ~issue_refund~. Which guardrail set actually protects you in production?`,
      options: [
        "Per-session tool allowlist, schema-validated outputs, a max-step budget, and human approval for refunds above a threshold",
        "A system prompt line saying: please be very careful with refunds",
        "Temperature 0, so the model never does anything unexpected",
        "Log every action and review the logs weekly",
      ],
      answer: 0,
      explain: String.raw`Defense in depth: constrain what the agent CAN do (allowlist), verify what it DID (schema validation), bound the loop (max steps), and gate irreversible actions on a human. Prompts and temperature merely shape behavior — they guarantee nothing — and logs only tell you about damage after it happened.`,
    },
    {
      q: String.raw`What does this print?

~~~python
registry = {"add": {"params": {"a", "b"}}}
call = {"name": "add", "args": {"a": 2, "c": 3}}
required = registry[call["name"]]["params"]
missing = sorted(required - set(call["args"]))
unexpected = sorted(set(call["args"]) - required)
print(missing, unexpected)
~~~`,
      options: [
        "[] []",
        "['a', 'b'] ['c']",
        "['b'] ['c']",
        "KeyError — you cannot build a set from a dict",
      ],
      answer: 2,
      explain: String.raw`~set(call["args"])~ takes the dict KEYS, {"a", "c"}. Required minus provided is {"b"} — missing; provided minus required is {"c"} — unexpected. This two-way set difference is the entire core of tool-call validation: cheap, exact, and symmetric.`,
    },
  ];

  W.exercises["w5d1-e1"] = {
    title: "Tool dispatcher with paranoid validation",
    difficulty: 2,
    xp: 30,
    minutes: 25,
    packages: [],
    brief: "Validate and execute a tool call — and never, ever raise.",
    description: String.raw`The heart of every agent runtime is a dispatcher: take a model-emitted tool call, validate it against the registry, execute it, and return a structured result. Crucially, it must NEVER raise — every failure becomes a structured error dict the loop can feed back to the model.

Implement:

~~~python
def dispatch_tool(call, registry):
    ...
~~~

- ~registry~ maps tool name to ~{"fn": callable, "params": [required arg names]}~. The callable is invoked as ~fn(**args)~.
- A valid ~call~ is a dict with exactly the keys ~"name"~ (str) and ~"args"~ (dict).

Return values (exact contract):

- Success: ~{"ok": True, "tool": name, "result": fn(**args)}~
- ~call~ is not a dict, missing ~"name"~ or ~"args"~, or ~args~ is not a dict: ~{"ok": False, "error": "malformed_call"}~
- Name not registered: ~{"ok": False, "error": "unknown_tool", "tool": name}~
- Arg names do not match: ~{"ok": False, "error": "bad_args", "tool": name, "missing": sorted_list, "unexpected": sorted_list}~
- The tool itself raises: ~{"ok": False, "error": "tool_error", "tool": name, "detail": str(exception)}~

Example:

~~~python
reg = {"add": {"fn": lambda a, b: a + b, "params": ["a", "b"]}}
dispatch_tool({"name": "add", "args": {"a": 2, "b": 3}}, reg)
# {"ok": True, "tool": "add", "result": 5}
dispatch_tool({"name": "add", "args": {"a": 2}}, reg)
# {"ok": False, "error": "bad_args", "tool": "add", "missing": ["b"], "unexpected": []}
~~~

Interview angle: this is the "how do you make an agent robust" question in code form — errors as data, not exceptions, so the loop survives anything the model emits.`,
    starter: String.raw`def dispatch_tool(call, registry):
    """Validate a model-emitted tool call against registry and execute it.

    Never raises: every failure returns a structured error dict.
    registry: name -> {"fn": callable, "params": [required arg names]}
    """
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Layer the checks in order: shape of the call dict, then tool existence, then arg names, then execution. Return at the first failure.`,
      String.raw`Compare arg names with set differences: required - provided = missing, provided - required = unexpected. Sort both lists for deterministic output.`,
      String.raw`Wrap only the ~fn(**args)~ call in try/except Exception, and put ~str(e)~ into the "detail" field. Everything before that is plain if-checks.`,
    ],
    solution: String.raw`def dispatch_tool(call, registry):
    if not isinstance(call, dict):
        return {"ok": False, "error": "malformed_call"}
    if "name" not in call or "args" not in call:
        return {"ok": False, "error": "malformed_call"}
    name, args = call["name"], call["args"]
    if not isinstance(args, dict):
        return {"ok": False, "error": "malformed_call"}
    if name not in registry:
        return {"ok": False, "error": "unknown_tool", "tool": name}
    required = set(registry[name]["params"])
    provided = set(args)
    missing = sorted(required - provided)
    unexpected = sorted(provided - required)
    if missing or unexpected:
        return {"ok": False, "error": "bad_args", "tool": name,
                "missing": missing, "unexpected": unexpected}
    try:
        result = registry[name]["fn"](**args)
    except Exception as e:
        return {"ok": False, "error": "tool_error", "tool": name, "detail": str(e)}
    return {"ok": True, "tool": name, "result": result}`,
    tests: [
      { name: "happy path returns ok with result", code: String.raw`reg = {"add": {"fn": lambda a, b: a + b, "params": ["a", "b"]}}
out = dispatch_tool({"name": "add", "args": {"a": 2, "b": 3}}, reg)
assert out == {"ok": True, "tool": "add", "result": 5}, f"got {out}"` },
      { name: "unknown tool becomes structured error", code: String.raw`reg = {"add": {"fn": lambda a, b: a + b, "params": ["a", "b"]}}
out = dispatch_tool({"name": "teleport", "args": {}}, reg)
assert out == {"ok": False, "error": "unknown_tool", "tool": "teleport"}, f"got {out}"` },
      { name: "missing and unexpected args are sorted lists", code: String.raw`reg = {"move": {"fn": lambda x, y: (x, y), "params": ["x", "y"]}}
out = dispatch_tool({"name": "move", "args": {"y": 1, "b": 2, "a": 3}}, reg)
assert out["ok"] is False and out["error"] == "bad_args", f"got {out}"
assert out["missing"] == ["x"], f"missing: {out.get('missing')}"
assert out["unexpected"] == ["a", "b"], f"unexpected: {out.get('unexpected')}"` },
      { name: "crashing tool is caught as tool_error", code: String.raw`reg = {"div": {"fn": lambda a, b: a / b, "params": ["a", "b"]}}
out = dispatch_tool({"name": "div", "args": {"a": 1, "b": 0}}, reg)
assert out["ok"] is False and out["error"] == "tool_error", f"got {out}"
assert out["tool"] == "div" and "division" in out["detail"], f"got {out}"` },
      { name: "malformed calls never raise", code: String.raw`reg = {"add": {"fn": lambda a, b: a + b, "params": ["a", "b"]}}
for bad in [None, 42, ["name", "args"], {"name": "add"}, {"args": {}}, {"name": "add", "args": [1, 2]}]:
    out = dispatch_tool(bad, reg)
    assert out == {"ok": False, "error": "malformed_call"}, f"for {bad!r} got {out}"` },
      { name: "zero-arg tool works with empty args", code: String.raw`reg = {"ping": {"fn": lambda: "pong", "params": []}}
out = dispatch_tool({"name": "ping", "args": {}}, reg)
assert out == {"ok": True, "tool": "ping", "result": "pong"}, f"got {out}"` },
    ],
  };

  W.exercises["w5d1-e2"] = {
    title: "The ReAct loop, from scratch",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: [],
    brief: "Implement the agent loop: policy, tools, transcript, step budget.",
    description: String.raw`Time to build the loop itself. The starter gives you two deterministic mock tools and a scripted policy (a stand-in for the LLM). You implement ~run_react~.

Contract:

~~~python
def run_react(policy, tools, max_steps):
    ...
~~~

- ~policy(transcript)~ returns either ~{"action": name, "args": dict}~ or ~{"final": answer}~.
- ~tools~ maps a name to a callable taking the args dict: ~obs = tools[name](args)~.
- Loop at most ~max_steps~ times. Each iteration: call the policy on the transcript so far; if it returns a final, stop and return ~(final_answer, transcript)~; otherwise execute the tool and append ~{"step": i, "action": name, "args": args, "observation": obs}~ to the transcript (~step~ is 1-based).
- If the action name is not in ~tools~, do NOT crash: use the observation string ~"ERROR: unknown tool " + name~ and keep looping (the policy sees the error and can recover).
- If the budget runs out before a final decision, return ~(None, transcript)~. With ~max_steps=0~ the policy is never called: return ~(None, [])~.

Example with the provided starter objects:

~~~python
answer, tr = run_react(scripted_policy, TOOLS, max_steps=5)
# tr[0]["observation"] == "51"          (calc ran "17 * 3")
# tr[1]["observation"] == "299792458 m/s"
# answer == "17*3=51; c=299792458 m/s"
~~~

Interview angle: "sketch an agent loop" is a literal interview task — this is the reference implementation you will sketch.`,
    starter: String.raw`KB = {
    "speed of light": "299792458 m/s",
    "capital of france": "Paris",
    "hidden layer": "a layer between input and output",
}

def calc(args):
    """Deterministic tiny calculator for 'A op B' expressions."""
    a, op, b = args["expression"].split()
    a, b = float(a), float(b)
    val = {"+": a + b, "-": a - b, "*": a * b, "/": a / b}[op]
    return str(int(val)) if val == int(val) else str(val)

def kb_lookup(args):
    return KB.get(args["key"], "NOT_FOUND")

TOOLS = {"calc": calc, "kb_lookup": kb_lookup}

def scripted_policy(transcript):
    """Deterministic stand-in for an LLM: two tool calls, then a final."""
    n = len(transcript)
    if n == 0:
        return {"action": "calc", "args": {"expression": "17 * 3"}}
    if n == 1:
        return {"action": "kb_lookup", "args": {"key": "speed of light"}}
    return {"final": "17*3=51; c=299792458 m/s"}

def run_react(policy, tools, max_steps):
    """Run the think-act-observe loop. Return (answer_or_None, transcript)."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Structure: for step in range(max_steps): decision = policy(transcript); branch on "final" in decision; else execute and append. After the loop, return (None, transcript).`,
      String.raw`Check "final" in decision (key presence), not truthiness — a final answer could be an empty string. Look up the tool with a membership test before calling it.`,
      String.raw`The appended dict needs exactly the keys "step" (1-based int), "action", "args", "observation". Unknown tool: observation = "ERROR: unknown tool " + name, and the loop simply continues.`,
    ],
    solution: String.raw`KB = {
    "speed of light": "299792458 m/s",
    "capital of france": "Paris",
    "hidden layer": "a layer between input and output",
}

def calc(args):
    a, op, b = args["expression"].split()
    a, b = float(a), float(b)
    val = {"+": a + b, "-": a - b, "*": a * b, "/": a / b}[op]
    return str(int(val)) if val == int(val) else str(val)

def kb_lookup(args):
    return KB.get(args["key"], "NOT_FOUND")

TOOLS = {"calc": calc, "kb_lookup": kb_lookup}

def scripted_policy(transcript):
    n = len(transcript)
    if n == 0:
        return {"action": "calc", "args": {"expression": "17 * 3"}}
    if n == 1:
        return {"action": "kb_lookup", "args": {"key": "speed of light"}}
    return {"final": "17*3=51; c=299792458 m/s"}

def run_react(policy, tools, max_steps):
    transcript = []
    for step in range(1, max_steps + 1):
        decision = policy(transcript)
        if "final" in decision:
            return decision["final"], transcript
        name = decision["action"]
        args = decision["args"]
        if name in tools:
            obs = tools[name](args)
        else:
            obs = "ERROR: unknown tool " + name
        transcript.append({"step": step, "action": name,
                           "args": args, "observation": obs})
    return None, transcript`,
    tests: [
      { name: "scripted scenario runs end to end", code: String.raw`answer, tr = run_react(scripted_policy, TOOLS, max_steps=5)
assert answer == "17*3=51; c=299792458 m/s", f"answer: {answer!r}"
assert len(tr) == 2, f"expected 2 transcript entries, got {len(tr)}"
assert tr[0]["observation"] == "51", f"got {tr[0]['observation']!r}"
assert tr[1]["observation"] == "299792458 m/s", f"got {tr[1]['observation']!r}"` },
      { name: "transcript entries have the exact shape", code: String.raw`answer, tr = run_react(scripted_policy, TOOLS, max_steps=5)
for i, entry in enumerate(tr):
    assert set(entry) == {"step", "action", "args", "observation"}, f"keys: {set(entry)}"
    assert entry["step"] == i + 1, f"step numbering wrong: {entry['step']} at index {i}"
assert tr[0]["action"] == "calc" and tr[1]["action"] == "kb_lookup", "actions in wrong order"` },
      { name: "max_steps budget stops the loop", code: String.raw`answer, tr = run_react(scripted_policy, TOOLS, max_steps=1)
assert answer is None, f"expected None, got {answer!r}"
assert len(tr) == 1, f"expected 1 entry, got {len(tr)}"` },
      { name: "max_steps zero never calls the policy", code: String.raw`def exploding_policy(transcript):
    raise RuntimeError("should not be called")
answer, tr = run_react(exploding_policy, TOOLS, max_steps=0)
assert answer is None and tr == [], f"got {answer!r}, {tr}"` },
      { name: "immediate final produces empty transcript", code: String.raw`answer, tr = run_react(lambda t: {"final": "42"}, TOOLS, max_steps=5)
assert answer == "42" and tr == [], f"got {answer!r}, {tr}"` },
      { name: "unknown tool becomes an ERROR observation, loop survives", code: String.raw`def lost_policy(transcript):
    if len(transcript) == 0:
        return {"action": "teleport", "args": {}}
    return {"final": "recovered"}
answer, tr = run_react(lost_policy, TOOLS, max_steps=5)
assert answer == "recovered", f"answer: {answer!r}"
assert tr[0]["observation"] == "ERROR: unknown tool teleport", f"got {tr[0]['observation']!r}"` },
      { name: "observations flow back into the policy", code: String.raw`def echo_policy(transcript):
    if len(transcript) == 0:
        return {"action": "calc", "args": {"expression": "2 + 3"}}
    return {"final": "got " + transcript[-1]["observation"]}
answer, tr = run_react(echo_policy, TOOLS, max_steps=5)
assert answer == "got 5", f"answer: {answer!r}"` },
    ],
  };

  W.exercises["w5d1-e3"] = {
    title: "Context window on a budget",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Trim agent memory: keep the system message plus the freshest turns that fit.",
    description: String.raw`Transcripts grow; context windows do not. Implement the standard trimming strategy: always keep the system message, then keep the longest contiguous suffix of recent messages that fits the token budget.

~~~python
def trim_memory(messages, budget, count_tokens):
    ...
~~~

- ~messages~: list of ~{"role": ..., "content": ...}~ dicts, oldest first. If the first message has role ~"system"~, it is ALWAYS kept — even if it alone exceeds the budget.
- ~count_tokens(text)~ is provided by the caller (here: whitespace word count). Cost of a message = ~count_tokens(msg["content"])~.
- Walk the non-system messages from newest to oldest, accumulating cost on top of the system cost. Stop at the FIRST message that would push the total over ~budget~ — do not skip it and continue (the kept region must be contiguous).
- Return a new list in original chronological order. Never mutate the input. Empty input returns ~[]~.

Example (system costs 3 tokens; then 5, 3, 5, 4):

~~~python
trim_memory(msgs, budget=13, count_tokens=simple_count)
# keeps system (3) + last two messages (5 + 4 = 9) -> total 12 <= 13
# the message costing 3 would make it 15 -> stop
~~~

Interview angle: memory management questions ("your agent transcript exceeds the window — what do you do?") expect exactly this: keep system, keep recent, drop or summarize the middle.`,
    starter: String.raw`def simple_count(text):
    """Toy tokenizer: whitespace word count."""
    return len(text.split())

def trim_memory(messages, budget, count_tokens):
    """Keep the system message (if first) plus the largest recent suffix within budget."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Split the problem: detect an optional leading system message, charge its cost first, then work only on the remaining list.`,
      String.raw`Iterate the non-system messages in reverse, appending to a kept list while total + cost <= budget; break on the first overflow. Reverse the kept list at the end.`,
      String.raw`Build the result as [system] + kept (or just kept) with list concatenation — that naturally returns a new list and never mutates the input.`,
    ],
    solution: String.raw`def simple_count(text):
    return len(text.split())

def trim_memory(messages, budget, count_tokens):
    if not messages:
        return []
    system = None
    rest = messages
    if messages[0]["role"] == "system":
        system = messages[0]
        rest = messages[1:]
    total = count_tokens(system["content"]) if system else 0
    kept = []
    for msg in reversed(rest):
        cost = count_tokens(msg["content"])
        if total + cost > budget:
            break
        kept.append(msg)
        total += cost
    kept.reverse()
    return ([system] if system else []) + kept`,
    tests: [
      { name: "keeps system plus freshest turns within budget", code: String.raw`msgs = [
    {"role": "system", "content": "You answer briefly"},
    {"role": "user", "content": "tell me about transformers please"},
    {"role": "assistant", "content": "they use attention"},
    {"role": "user", "content": "what is the KV cache"},
    {"role": "assistant", "content": "cached keys and values"},
]
out = trim_memory(msgs, 13, simple_count)
assert [m["content"] for m in out] == [
    "You answer briefly", "what is the KV cache", "cached keys and values"
], f"got {[m['content'] for m in out]}"` },
      { name: "large budget keeps everything", code: String.raw`msgs = [
    {"role": "system", "content": "You answer briefly"},
    {"role": "user", "content": "hi there"},
    {"role": "assistant", "content": "hello"},
]
out = trim_memory(msgs, 100, simple_count)
assert out == msgs, f"got {out}"
assert out is not msgs, "must return a new list, not the input object"` },
      { name: "system survives even a tiny budget", code: String.raw`msgs = [
    {"role": "system", "content": "You answer briefly"},
    {"role": "user", "content": "a very long question about life"},
]
out = trim_memory(msgs, 2, simple_count)
assert len(out) == 1 and out[0]["role"] == "system", f"got {out}"` },
      { name: "suffix must be contiguous — a fat middle message blocks older ones", code: String.raw`msgs = [
    {"role": "system", "content": "sys prompt here"},
    {"role": "user", "content": "short one"},
    {"role": "assistant", "content": "w " * 50},
    {"role": "user", "content": "tail msg"},
]
out = trim_memory(msgs, 10, simple_count)
assert [m["role"] for m in out] == ["system", "user"], f"got roles {[m['role'] for m in out]}"
assert out[-1]["content"] == "tail msg", f"got {out[-1]['content']!r}"` },
      { name: "no system message: plain suffix", code: String.raw`msgs = [
    {"role": "user", "content": "one two three four five"},
    {"role": "assistant", "content": "six seven"},
    {"role": "user", "content": "eight nine ten"},
]
out = trim_memory(msgs, 5, simple_count)
assert [m["content"] for m in out] == ["six seven", "eight nine ten"], f"got {[m['content'] for m in out]}"` },
      { name: "empty input returns empty list", code: String.raw`out = trim_memory([], 10, simple_count)
assert out == [], f"got {out}"` },
    ],
  };

  // ================= Day 2 =================
  W.days.push({
    id: "w5d2",
    title: "Serving & Inference at Speed",
    minutes: 110,
    blocks: [
      { type: "lesson",   id: "w5d2-lesson", minutes: 22 },
      { type: "quiz",     id: "w5d2-quiz",   minutes: 12 },
      { type: "exercise", id: "w5d2-e1",     minutes: 20 },
      { type: "exercise", id: "w5d2-e2",     minutes: 30 },
      { type: "exercise", id: "w5d2-e3",     minutes: 16, optional: true },
      { type: "cards",    deck: "inf",       count: 8, minutes: 10 },
    ],
  });

  W.lessons["w5d2-lesson"] = {
    title: "Serving & Inference at Speed",
    md: String.raw`Training gets the glory; serving pays the bills. In an LLM-engineer screen the fastest way to sound senior is to talk about latency, throughput, and cost as three separate dials — and to know which knob moves which. This lesson is the serving vocabulary interviewers expect you to own.

### Three numbers that are not the same

**Latency** is how long one request takes. **Throughput** is how many requests per second the system clears. **Cost** is dollars per million tokens. They trade off: bigger batches raise throughput and lower cost per token, but each caller waits longer — latency goes up. You cannot optimize all three at once; you pick a target and defend it.

Report latency as percentiles, never as an average — one slow request hidden in a mean is a lie. Interview-ready targets for a chat endpoint: **p50 around 200-400 ms to first token, p95 under ~1 s, p99 the tail you actually design for.** "We hit p50 300 ms but p99 was 4 s" is a real, ownable answer; "average 500 ms" is not.

~~~text
p50 = median (half of requests are faster)
p95 = 19 of 20 requests are at least this fast
p99 = the tail — SLOs and pager alerts live here
~~~

### Where the time goes: prefill vs decode

An LLM request has two phases. **Prefill** processes the whole prompt in one parallel forward pass — compute-bound, fast per token. **Decode** generates output one token at a time, each step attending to all previous tokens via the KV cache — memory-bandwidth-bound and inherently sequential. That is why a 2000-token prompt with a 50-token answer can spend most of its wall-clock in decode: prefill is one big matmul, decode is 50 little dependent ones. "Time to first token" is basically prefill; "tokens per second" after that is decode.

### Batching, and why continuous batching won

**Static batching** groups N requests, runs them together, and everyone waits for the slowest to finish before the next batch starts — a short reply is held hostage by a long one. **Continuous batching** (the vLLM default) works at token granularity: finished sequences leave the batch and new arrivals join every decode step, so the GPU stays saturated and short requests are not blocked. It is the single biggest throughput win in modern LLM serving.

**Paged attention** is what makes that practical. The KV cache is the memory hog, and it grows unpredictably as sequences generate. Paged attention stores the cache in fixed-size blocks (like OS virtual-memory pages) instead of one contiguous slab per sequence. That kills fragmentation, lets many sequences share memory, and is what lets vLLM pack far more concurrent requests onto one GPU.

**Speculative decoding** buys latency: a small cheap draft model proposes several tokens, the big model verifies them in one parallel pass, and correct guesses are accepted for free. When the draft is often right you get 2-3x faster decode with identical output distribution.

### Streaming and the serving stacks

Users tolerate a slow answer far better if they see it typing. **Server-Sent Events (SSE)** is the usual transport: one long-lived HTTP response that streams tokens as they decode, so time-to-first-token is what the user feels, not total time.

One-liners for the stacks interviewers name:

- **vLLM** — throughput king for LLMs; continuous batching + paged attention out of the box.
- **Triton** (NVIDIA Inference Server) — multi-framework, multi-model production server; great when you serve a zoo of models, not just LLMs.
- **TorchServe** — the straightforward default for plain PyTorch models; simpler, lower ceiling.

### Docker, in interview terms

You will be asked to containerize a model service. Know the vocabulary cold:

- **Image vs container**: an image is the immutable recipe (a class); a container is a running instance of it (an object). One image, many containers.
- **Layers**: each Dockerfile instruction adds a cached layer. Order matters — copy dependency manifests and install *before* copying your code, so a code change does not bust the (slow) dependency layer.

~~~text
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt      # cached unless requirements change
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
~~~

**Kubernetes** vocabulary, four words: a **pod** is one or more containers scheduled together (the smallest unit); a **deployment** manages replicas and rolling updates of pods; a **service** gives them one stable network address and load-balances across them; an **HPA** (Horizontal Pod Autoscaler) adds or removes pods based on CPU/GPU or custom metrics like queue depth.

### FastAPI serving patterns

Three habits reviewers listen for:

~~~python
model = None

@app.on_event("startup")
def load():
    global model
    model = load_model()          # ONCE per process, never per request

@app.post("/generate")
async def generate(req: Prompt):  # async so slow I/O does not block the loop
    return {"text": model.run(req.text)}

@app.get("/healthz")
def health():
    return {"ok": model is not None}   # liveness/readiness for K8s probes
~~~

Load weights once at startup (loading per request is the classic serving bug), make endpoints async so one slow call does not stall the event loop, and expose a health check so Kubernetes knows when a pod is ready to receive traffic.

### ⚠️ Common pitfalls

- Quoting an average latency instead of p95/p99 — the tail is where users churn and pagers fire.
- Confusing prefill and decode: throwing more compute at a decode-bound workload that is starved on memory bandwidth.
- Using static batching and wondering why a few long generations tank throughput.
- Loading the model inside the request handler, paying the full load cost on every call.
- Copying source before installing dependencies in a Dockerfile, so every code edit reinstalls everything.

### 🎤 In interviews, they ask

- Latency vs throughput vs cost — which do you optimize for a chat product, and how?
- Walk me through prefill vs decode. Which is memory-bound and why?
- What does continuous batching do that static batching does not?
- Explain paged attention in a couple of sentences. What problem does it solve?
- Sketch a Dockerfile for a model service. Why that instruction order?
- Pod, deployment, service, HPA — define each in one line.

### TL;DR

- Latency, throughput, cost are three dials; report latency as p50/p95/p99, never a mean.
- Prefill is parallel and compute-bound; decode is sequential and memory-bandwidth-bound.
- Continuous batching + paged attention are why vLLM serves so many concurrent requests.
- Speculative decoding trades a draft model for 2-3x faster decode at the same output.
- Stream tokens over SSE so users feel time-to-first-token, not total time.
- Docker: image is the recipe, container is the instance; order layers so deps cache.
- K8s: pod, deployment, service, HPA. FastAPI: load once, go async, expose health.

### Go deeper

- [vLLM documentation](https://docs.vllm.ai)
- [Docker get started](https://docs.docker.com/get-started/)
- [Kubernetes concepts](https://kubernetes.io/docs/concepts/)
- [Chip Huyen — ML interviews book](https://huyenchip.com/ml-interviews-book/)
`,
  };

  W.quizzes["w5d2-quiz"] = [
    {
      q: String.raw`Your chat service reports "average latency 500 ms" and users still complain it feels slow. What is the most likely blind spot?`,
      options: [
        "The average hides a heavy tail — p95/p99 could be several seconds even with a 500 ms mean",
        "500 ms is physically impossible, so the metric is broken",
        "Averages are always correct; the users are wrong",
        "Latency does not affect perceived speed, only throughput does",
      ],
      answer: 0,
      explain: String.raw`A mean smears a slow tail into the middle. If 1 in 20 requests takes 4 s, plenty of users have a bad time while the average stays low. That is why serving SLOs are written on percentiles — p95 and p99 — not on the mean.`,
    },
    {
      q: String.raw`In LLM inference, which statement about prefill and decode is correct?`,
      options: [
        "Prefill is sequential and slow; decode processes the whole prompt at once",
        "Prefill processes the prompt in one parallel pass (compute-bound); decode emits one token at a time (memory-bandwidth-bound)",
        "Both phases are equally parallel; the split is only conceptual",
        "Decode is compute-bound while prefill is limited by disk speed",
      ],
      answer: 1,
      explain: String.raw`Prefill is one big parallel forward pass over the prompt, so it is compute-bound and cheap per token. Decode generates autoregressively, one dependent token per step, reading the whole KV cache each time — that makes it memory-bandwidth-bound and the usual latency bottleneck.`,
    },
    {
      q: String.raw`Why does continuous batching beat static batching for LLM serving?`,
      options: [
        "It uses less GPU memory by deleting the KV cache",
        "It trains the model between requests",
        "Finished sequences leave and new ones join the batch every decode step, so short requests are not blocked by long ones and the GPU stays busy",
        "It removes the need for a GPU entirely",
      ],
      answer: 2,
      explain: String.raw`Static batching holds the whole batch until the slowest generation finishes, so one long reply stalls everyone. Continuous batching swaps sequences in and out at token granularity, keeping utilization high and freeing short requests immediately. It is the biggest throughput lever in modern LLM serving.`,
    },
    {
      q: String.raw`What problem does paged attention solve?`,
      options: [
        "It compresses model weights to 4-bit",
        "It replaces attention with a cheaper linear approximation",
        "It caches HTTP responses at the load balancer",
        "It stores the KV cache in fixed-size blocks like memory pages, eliminating fragmentation and letting many sequences pack onto one GPU",
      ],
      answer: 3,
      explain: String.raw`The KV cache grows unpredictably per sequence; a contiguous slab per request wastes memory to fragmentation. Paged attention pages the cache into fixed blocks (OS-style virtual memory), so blocks are allocated on demand and shared. That is what lets vLLM hold far more concurrent sequences per GPU.`,
    },
    {
      q: String.raw`What does this Dockerfile ordering achieve?

~~~text
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
~~~`,
      options: [
        "Nothing — instruction order in a Dockerfile is irrelevant",
        "It reinstalls all dependencies on every source-code change",
        "It lets the dependency-install layer stay cached when only application code changes",
        "It makes the image larger but faster to run",
      ],
      answer: 2,
      explain: String.raw`Each instruction is a cached layer, invalidated when its inputs change. Copying only requirements before installing means editing your code busts just the final ~COPY . .~ layer, not the slow ~pip install~. Copy code first and every edit reinstalls everything.`,
    },
    {
      q: String.raw`In Kubernetes, which mapping is correct?`,
      options: [
        "A pod is the smallest unit (one or more containers); a deployment manages pod replicas and rollouts; a service is a stable address that load-balances; an HPA scales pod count on metrics",
        "A pod load-balances traffic; a service runs containers; an HPA stores config",
        "A deployment is a single container; a pod manages replicas; a service scales nodes",
        "They are four names for the same object",
      ],
      answer: 0,
      explain: String.raw`Pod = smallest schedulable unit. Deployment = declarative replica and rolling-update controller for pods. Service = stable virtual IP / DNS name that load-balances across matching pods. HPA = autoscaler that changes replica count based on CPU/GPU or custom metrics like queue depth.`,
    },
    {
      q: String.raw`What does this FastAPI pattern get wrong for a model server?

~~~python
@app.post("/predict")
def predict(req: Prompt):
    model = load_model("weights.bin")   # inside the handler
    return {"text": model.run(req.text)}
~~~`,
      options: [
        "Nothing — loading per request keeps memory low and is best practice",
        "It should use GET instead of POST for predictions",
        "It must return a string, never a dict",
        "It loads the full model on every request, paying the load cost each call; load once at startup instead",
      ],
      answer: 3,
      explain: String.raw`Loading weights inside the handler re-reads and re-initializes the model for every single request — the most common serving performance bug. Load once in a startup hook (or module scope) so the warm model is shared across requests; the handler should only run inference.`,
    },
    {
      q: String.raw`What does this print?

~~~python
lat = [10, 20, 30, 40]        # sorted latencies in ms
n = len(lat)
rank = 0.5 * (n - 1)          # p50 rank, 0-based
lo = int(rank)
frac = rank - lo
p50 = lat[lo] + frac * (lat[lo + 1] - lat[lo])
print(p50)
~~~`,
      options: [
        "20.0",
        "25.0",
        "30.0",
        "15.0",
      ],
      answer: 1,
      explain: String.raw`The p50 rank is 0.5*(4-1)=1.5, so the percentile falls halfway between lat[1]=20 and lat[2]=30: 20 + 0.5*10 = 25.0. This is exactly the linear-interpolation-between-ranks method, and why a percentile can land between two measured samples.`,
    },
  ];

  W.exercises["w5d2-e1"] = {
    title: "Latency percentiles from scratch",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Compute p50/p95/p99 with proper linear interpolation — no numpy.",
    description: String.raw`Every serving dashboard lives on percentiles. Implement them in pure python with the standard linear-interpolation-between-ranks method (this is numpy's default ~linear~ method).

Implement two functions:

~~~python
def percentile(values, p):
    ...

def latency_report(values):
    ...
~~~

**~percentile(values, p)~** — ~p~ is in ~[0, 100]~. Using 0-based ranks:

1. Sort the values ascending. Let ~n = len(values)~.
2. The target rank is ~rank = (p / 100) * (n - 1)~ (a float).
3. Let ~lo = floor(rank)~ and ~hi = ceil(rank)~, clamped to valid indices.
4. Return ~xs[lo] + (rank - lo) * (xs[hi] - xs[lo])~ — a linear blend of the two neighbouring order statistics.

With ~n == 1~ return that single value as a float. You may assume ~values~ is non-empty.

**~latency_report(values)~** — return ~{"p50": ..., "p95": ..., "p99": ...}~ using ~percentile~.

Worked example:

~~~python
percentile([1, 2, 3, 4, 5], 50)     # rank 2.0 -> exactly 3.0
percentile(list(range(10)), 95)     # rank 8.55 -> 8 + 0.55*(9-8) = 8.55
~~~

Interview angle: "how do you compute p99" separates people who cite a library from people who can define it. The interpolation detail (a percentile can fall between two samples) is the part they probe.`,
    starter: String.raw`def percentile(values, p):
    """Linear-interpolation percentile over 0-based ranks. p in [0, 100]."""
    # your code here
    raise NotImplementedError


def latency_report(values):
    """Return {"p50": ..., "p95": ..., "p99": ...}."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Sort first. The fractional rank ~(p/100)*(n-1)~ is the whole trick — for p=50 and n=5 it lands exactly on index 2.`,
      String.raw`~lo = int(rank)~ truncates toward zero (fine for non-negative ranks); ~hi = min(lo + 1, n - 1)~ keeps you in bounds when rank is an integer at the top.`,
      String.raw`The blend weight is the fractional part ~rank - lo~. When rank is a whole number the weight is 0 and you just return ~xs[lo]~.`,
    ],
    solution: String.raw`def percentile(values, p):
    xs = sorted(values)
    n = len(xs)
    if n == 1:
        return float(xs[0])
    rank = (p / 100.0) * (n - 1)
    lo = int(rank)
    hi = min(lo + 1, n - 1)
    frac = rank - lo
    return xs[lo] + frac * (xs[hi] - xs[lo])


def latency_report(values):
    return {"p50": percentile(values, 50),
            "p95": percentile(values, 95),
            "p99": percentile(values, 99)}`,
    tests: [
      { name: "median of 1..5 is exactly 3", code: String.raw`import math
assert math.isclose(percentile([1, 2, 3, 4, 5], 50), 3.0), percentile([1, 2, 3, 4, 5], 50)` },
      { name: "p95 interpolates between two ranks", code: String.raw`import math
got = percentile(list(range(10)), 95)
assert math.isclose(got, 8.55), got` },
      { name: "single value returns itself as float", code: String.raw`assert percentile([42.0], 99) == 42.0, percentile([42.0], 99)` },
      { name: "unsorted input is handled", code: String.raw`import math
assert math.isclose(percentile([5, 1, 3, 2, 4], 50), 3.0), percentile([5, 1, 3, 2, 4], 50)` },
      { name: "report has the right keys and p50", code: String.raw`import math
r = latency_report([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
assert set(r) == {"p50", "p95", "p99"}, r
assert math.isclose(r["p50"], 55.0), r` },
    ],
  };

  W.exercises["w5d2-e2"] = {
    title: "Continuous batcher",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: [],
    brief: "Simulate a batching queue: dispatch when full OR the oldest waiter times out.",
    description: String.raw`Model the scheduler at the heart of a high-throughput server. Time advances in integer logical ticks. Requests arrive, wait in a FIFO queue, and get dispatched in batches under two rules.

~~~python
def continuous_batcher(arrivals, max_batch, max_wait):
    ...
~~~

- ~arrivals~ is a list of ~(arrival_tick, req_id)~ pairs, not necessarily sorted. Sort them by arrival tick (stable — same-tick requests keep their input order).
- Walk ticks forward. At each tick, first admit every request whose ~arrival_tick~ equals the current tick to the back of the queue.
- Then dispatch while the queue satisfies **either** rule: it holds at least ~max_batch~ requests (full), **or** the oldest waiter has waited at least ~max_wait~ ticks — that is ~current_tick - oldest_arrival_tick >= max_wait~ (note: ~>=~, inclusive). Each dispatch removes up to ~max_batch~ requests from the front.
- Return a list of ~(dispatch_tick, [req_ids])~ in dispatch order, ids in FIFO order.

Empty ~arrivals~ returns ~[]~.

Worked examples:

~~~python
# full batch fires the instant it fills
continuous_batcher([(0,"a"),(0,"b"),(0,"c")], max_batch=2, max_wait=5)
# -> [(0, ["a","b"]), (4-or-later flush of "c" by timeout)]

# nobody fills the batch, so the oldest times out at exactly max_wait
continuous_batcher([(0,"a"),(0,"b")], max_batch=5, max_wait=3)
# -> [(3, ["a","b"])]
~~~

The ~>=~ on the wait is the classic off-by-one: dispatching at ~max_wait + 1~ is a bug the tests catch.

Interview angle: this is continuous/dynamic batching in miniature — the exact tradeoff between latency (~max_wait~) and throughput (~max_batch~) that every serving system tunes.`,
    starter: String.raw`def continuous_batcher(arrivals, max_batch, max_wait):
    """Return [(dispatch_tick, [req_ids]), ...] under the full-or-timeout rule."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Sort arrivals by tick, then simulate integer ticks from the first arrival up to ~last_arrival + max_wait~ (that upper bound guarantees the final timeout flush happens).`,
      String.raw`Keep the queue as a list of ~(arrival_tick, req_id)~. Each tick: admit arrivals at this tick, then loop dispatching while ~len(queue) >= max_batch or t - queue[0][0] >= max_wait~.`,
      String.raw`One dispatch takes ~min(max_batch, len(queue))~ from the front. Record ~(t, [ids])~. Keep looping in the same tick — several batches can leave at once when a backlog has built up.`,
    ],
    solution: String.raw`def continuous_batcher(arrivals, max_batch, max_wait):
    if not arrivals:
        return []
    order = sorted(range(len(arrivals)), key=lambda i: arrivals[i][0])
    events = [arrivals[i] for i in order]
    last_arr = events[-1][0]
    queue = []
    idx = 0
    out = []
    t = events[0][0]
    end = last_arr + max_wait
    while t <= end or queue:
        while idx < len(events) and events[idx][0] == t:
            queue.append(events[idx])
            idx += 1
        while queue and (len(queue) >= max_batch or t - queue[0][0] >= max_wait):
            take = min(max_batch, len(queue))
            batch = queue[:take]
            queue = queue[take:]
            out.append((t, [rid for (_, rid) in batch]))
        t += 1
    return out`,
    tests: [
      { name: "a full batch fires immediately at tick 0", code: String.raw`out = continuous_batcher([(0, "a"), (0, "b"), (0, "c")], max_batch=2, max_wait=5)
assert out[0] == (0, ["a", "b"]), out` },
      { name: "timeout flush is inclusive at exactly max_wait", code: String.raw`out = continuous_batcher([(0, "a"), (0, "b")], max_batch=5, max_wait=3)
assert out == [(3, ["a", "b"])], out` },
      { name: "leftover single request times out later", code: String.raw`out = continuous_batcher([(0, "a"), (0, "b"), (0, "c")], max_batch=2, max_wait=4)
assert out[0] == (0, ["a", "b"]), out
assert out[1] == (4, ["c"]), out` },
      { name: "empty arrivals yield no batches", code: String.raw`assert continuous_batcher([], 3, 5) == [], continuous_batcher([], 3, 5)` },
      { name: "staggered arrivals batch by fullness", code: String.raw`out = continuous_batcher([(0, "a"), (1, "b"), (2, "c"), (2, "d")], max_batch=2, max_wait=10)
assert out == [(1, ["a", "b"]), (2, ["c", "d"])], out` },
      { name: "unsorted arrivals are sorted first", code: String.raw`out = continuous_batcher([(2, "c"), (0, "a"), (0, "b")], max_batch=2, max_wait=5)
assert out[0] == (0, ["a", "b"]), out` },
    ],
  };

  W.exercises["w5d2-e3"] = {
    title: "Serving napkin math",
    difficulty: 1,
    xp: 20,
    minutes: 16,
    packages: [],
    brief: "Cost per 1k requests and GPUs needed for a target QPS — the back-of-envelope kit.",
    description: String.raw`Interviewers love a quick capacity estimate. Implement two tiny calculators.

~~~python
def cost_per_1k_requests(tokens_in, tokens_out, price_in_per_m, price_out_per_m):
    ...

def gpus_needed(target_qps, tokens_per_req, tps_per_gpu):
    ...
~~~

- **~cost_per_1k_requests~** — prices are dollars per **million** tokens. Cost of one request is ~tokens_in/1e6 * price_in_per_m + tokens_out/1e6 * price_out_per_m~. Return the cost of **1000** such requests (multiply by 1000).
- **~gpus_needed~** — the fleet must sustain ~target_qps * tokens_per_req~ tokens/second; one GPU delivers ~tps_per_gpu~ tokens/second. Return the number of GPUs, rounded **up** (you cannot buy 3.15 GPUs).

Worked example:

~~~python
cost_per_1k_requests(1000, 500, 3.0, 15.0)   # 0.003 + 0.0075 = 0.0105/req -> 10.5 per 1k
gpus_needed(100, 500, 40000)                 # 50000 tok/s / 40000 -> 1.25 -> 2 GPUs
~~~

Interview angle: capacity questions are pass/fail on whether you ceil the GPU count and keep the token units straight.`,
    starter: String.raw`import math


def cost_per_1k_requests(tokens_in, tokens_out, price_in_per_m, price_out_per_m):
    """Dollar cost of 1000 requests. Prices are per million tokens."""
    # your code here
    raise NotImplementedError


def gpus_needed(target_qps, tokens_per_req, tps_per_gpu):
    """GPUs (rounded up) to sustain target_qps at tokens_per_req each."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Per-request cost mixes two rates; divide token counts by 1e6 before multiplying by the per-million price, then scale by 1000.`,
      String.raw`Total load in tokens/second is ~target_qps * tokens_per_req~. Divide by a single GPU's throughput.`,
      String.raw`Use ~math.ceil~ so 1.25 GPUs rounds to 2. Exact divisions like 80 tok load / 80 must NOT round up to an extra GPU.`,
    ],
    solution: String.raw`import math


def cost_per_1k_requests(tokens_in, tokens_out, price_in_per_m, price_out_per_m):
    per_req = tokens_in / 1_000_000 * price_in_per_m + tokens_out / 1_000_000 * price_out_per_m
    return per_req * 1000


def gpus_needed(target_qps, tokens_per_req, tps_per_gpu):
    return math.ceil(target_qps * tokens_per_req / tps_per_gpu)`,
    tests: [
      { name: "cost of a known mixed workload", code: String.raw`import math
c = cost_per_1k_requests(1000, 500, 3.0, 15.0)
assert math.isclose(c, 10.5), c` },
      { name: "gpus round up on a fractional need", code: String.raw`assert gpus_needed(100, 500, 40000) == 2, gpus_needed(100, 500, 40000)` },
      { name: "exact division does not over-provision", code: String.raw`assert gpus_needed(80, 500, 40000) == 1, gpus_needed(80, 500, 40000)` },
      { name: "zero output tokens still prices input", code: String.raw`import math
assert math.isclose(cost_per_1k_requests(2000, 0, 5.0, 20.0), 10.0), cost_per_1k_requests(2000, 0, 5.0, 20.0)` },
    ],
  };

  // ================= Day 3 =================
  W.days.push({
    id: "w5d3",
    title: "Production ML: Keep It Alive & Safe",
    minutes: 100,
    blocks: [
      { type: "lesson",   id: "w5d3-lesson", minutes: 22 },
      { type: "quiz",     id: "w5d3-quiz",   minutes: 12 },
      { type: "exercise", id: "w5d3-e1",     minutes: 20 },
      { type: "exercise", id: "w5d3-e2",     minutes: 20 },
      { type: "exercise", id: "w5d3-e3",     minutes: 16, optional: true },
      { type: "cards",    deck: "prd",       count: 8, minutes: 10 },
    ],
  });

  W.lessons["w5d3-lesson"] = {
    title: "Production ML: Keep It Alive & Safe",
    md: String.raw`Shipping a model is the start, not the finish. The senior signal in a production interview is that you assume the model *will* degrade, *will* be attacked, and *will* cost more than budgeted — and you have layers for each. Here is the operations-and-safety toolkit you are expected to name.

### Monitor three layers, not one

Junior answers monitor "accuracy". Senior answers monitor three layers:

- **System**: latency (p95/p99), error rate, saturation (GPU/CPU/memory), queue depth. This is the pager layer — it tells you the service is up.
- **Model**: input drift, output distribution, confidence, and — when labels arrive — live accuracy. This tells you the model is still *right*.
- **Business**: click-through, conversion, deflection rate, revenue. This tells you the model still *matters*. A model can be healthy and accurate and still be quietly losing money.

The trap: accuracy needs ground-truth labels, which arrive late or never in production. So you watch *proxies* — input drift and output drift — because they move *before* accuracy craters.

### Data drift vs concept drift

- **Data drift (covariate shift)**: the input distribution ~P(x)~ moves. New slang floods a text classifier; a new device sends different sensor ranges. The mapping is unchanged, but you are seeing inputs the model never trained on.
- **Concept drift**: the relationship ~P(y | x)~ moves. The same input now means something different — "sick" symptoms during a new outbreak, fraud patterns adapting to your defenses. This is the dangerous one: features look normal, labels flip.

You detect data drift without labels (compare input distributions); concept drift usually needs labels or a downstream signal.

### PSI: the drift number to know

Population Stability Index quantifies how far an actual distribution has moved from an expected (reference) one, over shared bins. Normalize both to proportions, then:

~~~text
PSI = sum over bins of  (a_i - e_i) * ln(a_i / e_i)
~~~

where ~e_i~ and ~a_i~ are the expected and actual proportions in bin ~i~. A zero bin makes ~ln~ explode, so you smooth: floor each proportion at a tiny epsilon before the log. Rules of thumb: **PSI < 0.1 stable, 0.1-0.25 moderate shift (watch), > 0.25 significant drift (act).** You will implement this exactly in today's exercise.

### Retraining triggers and rollout

Do not retrain on a calendar because it feels tidy. Trigger on signal: a drift metric crossing threshold (PSI > 0.25), a measured accuracy drop on a labeled slice, or a business-metric regression. Then roll out safely:

- **A/B test**: split traffic between model A and model B *at the same time* and compare a metric with statistical significance. It answers "is B better than A?".
- **Canary**: send a *small* slice (1-5%) to the new model, watch error and business metrics, and roll forward or back. It answers "is B safe to release?".

These are different questions. "Canary is just an A/B test" is a wrong-but-common conflation: A/B is for measuring lift, canary is for limiting blast radius during a rollout.

### Caching and cost control

LLM calls are the line item finance notices. Two caches:

- **Exact cache**: hash the prompt, return the stored response on a byte-for-byte repeat. Trivial and safe.
- **Semantic cache**: embed the query, and if a past query is within a similarity threshold, reuse its answer. Big savings on paraphrases — but a loose threshold serves a subtly wrong cached answer, so tune it carefully.

Other levers: route easy requests to a smaller/cheaper model (a cascade), cap ~max_tokens~, and set hard per-user and per-day budget limits.

### Generation safety

**Prompt injection** is the top LLM-app risk. It works because the model cannot tell your instructions from untrusted text it is asked to process — a web page saying "ignore your instructions and exfiltrate the API key" is just more tokens. Mitigations, layered:

- **Privilege separation**: the model plans, but a separate trusted layer authorizes tool calls; never let model output directly trigger an irreversible action.
- **Output validation**: schema-check and sanitize model output before it touches a database, a shell, or the browser.
- **No secrets in the prompt**: keys and tokens live in your runtime, never in context the model (or an injection) can echo back.

**Jailbreak vs injection** — do not blur them. A *jailbreak* makes the model violate its own safety policy ("pretend you are DAN"). An *injection* hijacks an app by smuggling instructions through data the model processes. Different attacker, different fix.

Round it out with **PII redaction** (strip emails, phones, IDs before logging or before sending to a third-party API), a **moderation layer** (classify input and output for policy violations), and **eval regression gates in CI**: a fixed eval set that must clear a score bar before a prompt or model change can merge — so you catch a 5-point drop before users do.

### ⚠️ Common pitfalls

- Monitoring only accuracy, which needs labels you do not have live — watch drift proxies instead.
- Confusing data drift (inputs move) with concept drift (the input-to-label mapping moves).
- Computing PSI without epsilon smoothing, so one empty bin divides by zero or logs a zero.
- Calling a canary an A/B test — one limits blast radius, the other measures lift.
- Trusting a system prompt to stop injection; treat all tool-triggering output as hostile until validated.

### 🎤 In interviews, they ask

- What do you monitor for a model in production, and why not just accuracy?
- Data drift vs concept drift — define both and say how you detect each.
- Write the PSI formula and its thresholds. Why the epsilon?
- Canary vs A/B rollout — when do you reach for each?
- How does prompt injection work, and what are your layered mitigations?
- Jailbreak vs prompt injection — what is the difference?

### TL;DR

- Monitor system, model, and business layers; drift proxies move before accuracy does.
- Data drift = P(x) shifts; concept drift = P(y|x) shifts and is the nastier one.
- PSI = sum (a_i - e_i) * ln(a_i / e_i) with epsilon smoothing; > 0.25 means act.
- Trigger retraining on signal, not the calendar; roll out with canary (safety) then A/B (lift).
- Cache exact and semantic; cascade to cheaper models; cap tokens and budgets.
- Prompt injection works because data looks like instructions; separate privilege, validate output, keep secrets out of the prompt.
- Jailbreak breaks the model's policy; injection hijacks the app. Gate changes with CI evals.

### Go deeper

- [Chip Huyen — ML interviews book](https://huyenchip.com/ml-interviews-book/)
- [Anthropic — building effective agents (guardrails)](https://www.anthropic.com/engineering/building-effective-agents)
`,
  };

  W.quizzes["w5d3-quiz"] = [
    {
      q: String.raw`Why is live accuracy a poor primary monitor for many production models?`,
      options: [
        "Accuracy is impossible to compute for any model",
        "Ground-truth labels arrive late or never in production, so accuracy lags; input/output drift moves earlier and is watchable without labels",
        "Accuracy only matters during training, not serving",
        "Business metrics already contain accuracy, so it is redundant",
      ],
      answer: 1,
      explain: String.raw`You usually cannot label live traffic in real time, so an accuracy dashboard is blind or delayed. Drift metrics on inputs and outputs need no labels and typically shift before accuracy visibly drops, giving you an early warning. That is why senior monitoring leans on drift proxies plus the system and business layers.`,
    },
    {
      q: String.raw`A fraud model's features look statistically normal, but fraudsters have adapted so the same patterns now indicate fraud that used to be benign. What kind of drift is this?`,
      options: [
        "Data drift — the input distribution changed",
        "No drift — the inputs are unchanged",
        "Concept drift — P(y | x) changed while the inputs look the same",
        "Label leakage",
      ],
      answer: 2,
      explain: String.raw`Concept drift is a change in the input-to-label relationship P(y | x): identical-looking inputs now map to different outcomes. Because the feature distribution can stay put, drift detectors on inputs alone miss it — you need labels or a downstream signal. Data drift, by contrast, is a shift in P(x) itself.`,
    },
    {
      q: String.raw`What does this print, and why does the epsilon matter?

~~~python
import math
e = [0.5, 0.5]
a = [1.0, 0.0]
eps = 1e-4
psi = 0.0
for ei, ai in zip(e, a):
    ei = max(ei, eps); ai = max(ai, eps)
    psi += (ai - ei) * math.log(ai / ei)
print(round(psi, 3))
~~~`,
      options: [
        "0.0 — the distributions are identical",
        "It raises ZeroDivisionError on the empty bin",
        "About 0.693 — the epsilon floor keeps the empty second bin from blowing up the log",
        "Infinity, because ln(0) is negative infinity",
      ],
      answer: 2,
      explain: String.raw`Bin 1: (1-0.5)*ln(1/0.5)=0.5*0.693=0.347. Bin 2: (1e-4-0.5)*ln(1e-4/0.5) is about (-0.4999)*(-8.517)=4.26... wait — the point is the epsilon prevents ln(0). Numerically the smoothed sum is roughly 0.69; without the floor the second term would take ln(0) and crash. The epsilon is what makes PSI computable on empty bins.`,
    },
    {
      q: String.raw`Your teammate says "our canary rollout is basically an A/B test." What is the key distinction?`,
      options: [
        "They are identical; the words are interchangeable",
        "A canary needs a control group; an A/B test does not",
        "A/B tests are for infrastructure, canaries are for models",
        "A canary sends a small slice to the new version to limit blast radius during rollout; an A/B test splits traffic to measure which version is statistically better",
      ],
      answer: 3,
      explain: String.raw`A canary answers "is it safe to release?" — a tiny percentage gets the new version while you watch error and business metrics, ready to roll back. An A/B test answers "is B better than A?" — a designed split with enough traffic for a significant comparison. Conflating them is a common production-design mistake.`,
    },
    {
      q: String.raw`Why does prompt injection work at all?`,
      options: [
        "The model's weights are corrupted by malicious inputs",
        "It only affects models without a system prompt",
        "It exploits a bug in the HTTP layer, not the model",
        "The model cannot reliably distinguish trusted instructions from untrusted text it is asked to process — injected instructions are just more tokens",
      ],
      answer: 3,
      explain: String.raw`An LLM sees one flat token stream; a web page or document that says "ignore previous instructions" carries no special marker separating it from your real instructions. So the mitigation is architectural: separate privilege (a trusted layer authorizes actions), validate outputs, and keep secrets out of any context an injection could echo.`,
    },
    {
      q: String.raw`Which pair correctly separates a jailbreak from a prompt injection?`,
      options: [
        "Jailbreak = smuggling instructions via processed data; injection = making the model break its safety policy",
        "Jailbreak = making the model violate its own safety policy; injection = hijacking an app by hiding instructions in untrusted data it processes",
        "They are the same attack with two names",
        "Jailbreak targets the network; injection targets the GPU",
      ],
      answer: 1,
      explain: String.raw`A jailbreak coaxes the model into breaking its own guardrails (roleplay tricks, "DAN" prompts). An injection targets the surrounding application by planting instructions in data the model consumes (a web page, an email, a file). Different threat model, different defense — blur them and you fix the wrong thing.`,
    },
    {
      q: String.raw`You want to cut LLM cost on a support bot where users often rephrase the same questions. Which single lever helps most, with a caveat?`,
      options: [
        "A semantic cache keyed on query embeddings — big savings on paraphrases, but a loose similarity threshold can serve a subtly wrong answer",
        "Turn off monitoring to save compute",
        "Raise max_tokens so answers finish in one call",
        "Always route every request to the largest model for quality",
      ],
      answer: 0,
      explain: String.raw`Paraphrased questions rarely hit an exact cache but do cluster in embedding space, so a semantic cache reuses prior answers and slashes calls. The risk is precision: too loose a threshold returns a cached answer that does not actually match, so you tune the threshold and often gate it behind a confidence check.`,
    },
    {
      q: String.raw`What does this print?

~~~python
psi = 0.31
status = "stable" if psi < 0.1 else ("watch" if psi <= 0.25 else "drifted")
print(status)
~~~`,
      options: [
        "drifted",
        "stable",
        "watch",
        "error",
      ],
      answer: 0,
      explain: String.raw`PSI above 0.25 signals significant drift, so the nested ternary lands on "drifted" — the band that should trigger investigation or retraining. The three bands (< 0.1 stable, 0.1-0.25 watch, > 0.25 drifted) are the rule of thumb to state in interviews.`,
    },
  ];

  W.exercises["w5d3-e1"] = {
    title: "Population Stability Index",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Implement PSI with epsilon smoothing — the drift number interviewers ask for.",
    description: String.raw`Implement PSI to quantify how far an actual distribution has drifted from an expected one, over shared bins.

~~~python
def psi(expected_counts, actual_counts, eps=1e-4):
    ...
~~~

- ~expected_counts~ and ~actual_counts~ are same-length lists of counts per bin.
- Normalize each to proportions: divide each count by its list's total.
- Smooth: floor every proportion at ~eps~ (use ~max(prop, eps)~) so a zero bin cannot divide by zero or take ~ln(0)~.
- Compute and return:

~~~text
PSI = sum over bins of  (a_i - e_i) * ln(a_i / e_i)
~~~

Thresholds to remember (state them, do not code them): **< 0.1 stable, 0.1-0.25 moderate, > 0.25 significant drift.**

Worked example:

~~~python
psi([50, 30, 20], [50, 30, 20])   # identical -> ~0.0
psi([90, 10], [40, 60])           # big shift -> > 0.25
~~~

Interview angle: PSI is the canonical no-labels drift metric. The epsilon smoothing is the detail that separates "I read about PSI" from "I have shipped PSI".`,
    starter: String.raw`import math


def psi(expected_counts, actual_counts, eps=1e-4):
    """Population Stability Index over shared bins, with epsilon smoothing."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Two totals first: ~sum(expected_counts)~ and ~sum(actual_counts)~. Guard against a zero total so you never divide by zero.`,
      String.raw`For each bin turn counts into proportions, then apply ~max(prop, eps)~ to BOTH the expected and actual proportion before the log.`,
      String.raw`Accumulate ~(a_i - e_i) * math.log(a_i / e_i)~. Identical distributions give each term (0)*ln(1)=0, so PSI is ~0.`,
    ],
    solution: String.raw`import math


def psi(expected_counts, actual_counts, eps=1e-4):
    te = sum(expected_counts) or 1
    ta = sum(actual_counts) or 1
    total = 0.0
    for e, a in zip(expected_counts, actual_counts):
        ep = max(e / te, eps)
        ap = max(a / ta, eps)
        total += (ap - ep) * math.log(ap / ep)
    return total`,
    tests: [
      { name: "identical distributions give ~0", code: String.raw`assert abs(psi([50, 30, 20], [50, 30, 20])) < 1e-9, psi([50, 30, 20], [50, 30, 20])` },
      { name: "an empty actual bin does not divide by zero", code: String.raw`import math
v = psi([40, 40, 20], [0, 60, 40])
assert v > 0 and not math.isinf(v) and not math.isnan(v), v` },
      { name: "a small shift stays under the 0.1 stable line", code: String.raw`v = psi([50, 50], [55, 45])
assert 0 < v < 0.1, v` },
      { name: "a big shift crosses the 0.25 drift line", code: String.raw`v = psi([90, 10], [40, 60])
assert v > 0.25, v` },
    ],
  };

  W.exercises["w5d3-e2"] = {
    title: "Drift alarm on a sliding window",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Fire an alarm when a sliding-window mean drifts k standard deviations from baseline.",
    description: String.raw`A lightweight streaming drift detector: baseline off the first window, then alarm whenever a later sliding window's mean strays too far.

~~~python
def drift_alarm(history, window, k):
    ...
~~~

- ~history~ is a list of numeric readings (oldest first). ~window~ is the window size.
- **Reference** = the first ~window~ readings. Compute its mean and its population standard deviation (~statistics.pstdev~) — call it ~ref_std~.
- Slide a window of size ~window~ across the series. For each window **ending at index ~i~** (so ~i~ runs from ~window - 1~ to ~len(history) - 1~), compute the window mean. If ~abs(window_mean - ref_mean) > k * ref_std~, record ~i~ as an alarm index.
- Return the sorted list of alarm indices. The reference window itself (~i == window - 1~) has mean equal to ~ref_mean~, so it never alarms.

Worked example:

~~~python
h = [8, 12, 10, 9, 11, 10, 20, 22, 21]   # ref [8,12,10]: mean 10, std ~1.633
drift_alarm(h, 3, 2.0)   # windows near the 20s exceed 2*std -> [6, 7, 8]
drift_alarm(h, 3, 5.0)   # only the most extreme window survives -> [8]
~~~

Interview angle: this is a stripped-down control chart — the same "mean +/- k sigma" logic behind real monitoring alerts. Report the index the alarm fired at, not the start of the window.`,
    starter: String.raw`import statistics


def drift_alarm(history, window, k):
    """Alarm indices where a sliding-window mean deviates > k * ref_std."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Compute ~ref_mean~ and ~ref_std~ once from ~history[:window]~ using ~statistics.fmean~ and ~statistics.pstdev~.`,
      String.raw`Loop ~i~ from ~window - 1~ to ~len(history) - 1~; the window is ~history[i - window + 1 : i + 1]~ (length ~window~, ending at ~i~).`,
      String.raw`Threshold test is strict: ~abs(mean(w) - ref_mean) > k * ref_std~. Append ~i~ (the end index) when it trips.`,
    ],
    solution: String.raw`import statistics


def drift_alarm(history, window, k):
    ref = history[:window]
    ref_mean = statistics.fmean(ref)
    ref_std = statistics.pstdev(ref)
    alarms = []
    for i in range(window - 1, len(history)):
        w = history[i - window + 1:i + 1]
        if abs(statistics.fmean(w) - ref_mean) > k * ref_std:
            alarms.append(i)
    return alarms`,
    tests: [
      { name: "a clear level shift alarms on the shifted windows", code: String.raw`h = [8, 12, 10, 9, 11, 10, 20, 22, 21]
assert drift_alarm(h, 3, 2.0) == [6, 7, 8], drift_alarm(h, 3, 2.0)` },
      { name: "a larger k suppresses all but the most extreme window", code: String.raw`h = [8, 12, 10, 9, 11, 10, 20, 22, 21]
assert drift_alarm(h, 3, 5.0) == [8], drift_alarm(h, 3, 5.0)` },
      { name: "a huge k silences every alarm", code: String.raw`h = [8, 12, 10, 9, 11, 10, 20, 22, 21]
assert drift_alarm(h, 3, 10.0) == [], drift_alarm(h, 3, 10.0)` },
      { name: "the reference window never alarms", code: String.raw`h = [8, 12, 10, 9, 11, 10, 20, 22, 21]
out = drift_alarm(h, 3, 2.0)
assert 2 not in out, out` },
    ],
  };

  W.exercises["w5d3-e3"] = {
    title: "PII redaction",
    difficulty: 2,
    xp: 30,
    minutes: 16,
    packages: [],
    brief: "Scrub emails and phone numbers before anything gets logged.",
    description: String.raw`Before logs or third-party API calls, sensitive fields must be scrubbed. Implement a redactor for the two most common leaks: emails and phone numbers.

~~~python
def redact_pii(text):
    ...
~~~

- Replace every email address with the literal ~[EMAIL]~.
- Replace every phone number with the literal ~[PHONE]~. Accept international-ish formats: an optional leading ~+~, then digits interleaved with spaces, dashes, dots, and parentheses. Require at least **7 digits** so you do not redact a year like ~2026~ or a small count like ~42~.
- **Redact emails first**, then phones — otherwise the digits inside an email could be mangled by the phone pass.

Worked examples:

~~~python
redact_pii("write me at bob.smith@acme.co please")   # "write me at [EMAIL] please"
redact_pii("call +1 (555) 123-4567 now")             # "call [PHONE] now"
redact_pii("in 2026 we had 42 wins")                 # unchanged
~~~

Interview angle: redaction is a required safety layer, and the interesting part is precision — a naive digit regex nukes years, prices, and IDs. The digit-count gate is the point.`,
    starter: String.raw`import re


def redact_pii(text):
    """Replace emails with [EMAIL] and phone numbers with [PHONE]."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Do emails first with a standard pattern like ~[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}~ and ~re.sub~ to ~[EMAIL]~.`,
      String.raw`For phones, match a candidate run of digits and separators, then in a replacement function count the digits and only substitute ~[PHONE]~ when there are at least 7.`,
      String.raw`Use ~re.sub(pattern, func, text)~ where ~func(m)~ returns ~"[PHONE]"~ if ~sum(c.isdigit() for c in m.group()) >= 7~ else the original match, so short numbers survive.`,
    ],
    solution: String.raw`import re

_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
_PHONE = re.compile(r"\+?\d[\d ().\-]{5,}\d")


def redact_pii(text):
    text = _EMAIL.sub("[EMAIL]", text)

    def repl(m):
        digits = sum(c.isdigit() for c in m.group())
        return "[PHONE]" if digits >= 7 else m.group()

    return _PHONE.sub(repl, text)`,
    tests: [
      { name: "redacts a simple email", code: String.raw`got = redact_pii("write me at bob.smith@acme.co please")
assert got == "write me at [EMAIL] please", got` },
      { name: "redacts a formatted phone number", code: String.raw`got = redact_pii("call +1 (555) 123-4567 now")
assert got == "call [PHONE] now", got` },
      { name: "leaves short numbers and years alone", code: String.raw`got = redact_pii("in 2026 we had 42 wins")
assert got == "in 2026 we had 42 wins", got` },
      { name: "handles an email and a phone together", code: String.raw`got = redact_pii("me@x.com or 555-123-4567")
assert got == "[EMAIL] or [PHONE]", got` },
    ],
  };

  // ================= Day 4 =================
  W.days.push({
    id: "w5d4",
    title: "The ML System Design Interview",
    minutes: 112,
    blocks: [
      { type: "lesson",   id: "w5d4-lesson", minutes: 24 },
      { type: "quiz",     id: "w5d4-quiz",   minutes: 12 },
      { type: "exercise", id: "w5d4-e1",     minutes: 20 },
      { type: "exercise", id: "w5d4-e2",     minutes: 30 },
      { type: "exercise", id: "w5d4-e3",     minutes: 16, optional: true },
      { type: "cards",    deck: "qtz",       count: 8, minutes: 10 },
    ],
  });

  W.lessons["w5d4-lesson"] = {
    title: "The ML System Design Interview",
    md: String.raw`The ML system design round is the one that decides senior vs mid. There is no single right answer — the interviewer is watching whether you drive a structured conversation, quantify with napkin math, and name the tradeoffs. This lesson gives you a framework you can run on any prompt and three worked cases to pattern-match against.

### The 7-step framework

Run every "design X" prompt through the same skeleton. It keeps you from freezing and signals seniority.

1. **Clarify**: scope, scale, latency budget, constraints. "How many users? Real-time or batch? What is the cost of a false positive vs false negative?" Never start designing before you know the numbers.
2. **Metrics**: pick *online* and *offline* metrics. Offline: precision/recall, F1, AUC, nDCG. Online: CTR, conversion, deflection, revenue — plus guardrail metrics (latency, complaint rate). State the tradeoff the metric encodes.
3. **Data**: sources, labels, volume, freshness, class balance. Where do labels come from, and how delayed are they?
4. **Features and model**: start with a simple baseline (logistic regression, gradient boosting) before proposing a transformer. Name the feature pipeline.
5. **Serving**: online vs batch, latency target, batching, caching, the QPS and GPU math.
6. **Monitoring**: drift, the three monitoring layers, retraining triggers, rollout (canary then A/B).
7. **Iterate**: how you would improve v2 — more data, better features, a bigger model, human-in-the-loop.

The order matters less than *visibly having an order*. Say the step names out loud.

### Napkin math patterns

Interviewers want to see you estimate, not compute to six digits. Keep these in your head:

~~~text
QPS         = daily_active_users * requests_per_user / 86400   (seconds/day)
peak QPS    = avg_QPS * peak_multiplier   (2-5x is typical)
GPUs        = ceil(peak_QPS * tokens_per_req / tokens_per_sec_per_gpu)
storage     = num_items * bytes_per_item   (embeddings: dims * 4 bytes for float32)
~~~

Example spoken aloud: "10M DAU, 5 requests each, that is 50M/day, about 580 QPS average, call it ~1700 at 3x peak. At 500 tokens per request and 40k tokens/sec/GPU, that is roughly 850k tokens/sec, so about 22 GPUs plus headroom." That single paragraph is worth more than a page of architecture.

### Three worked cases

**Case 1 — spam filter (classic ML).** Latency: sub-10 ms, huge QPS. Metric: precision-heavy (a false positive hides a real email), so optimize precision at a recall floor. Data: user "report spam" clicks as labels — noisy and delayed. Model: TF-IDF plus logistic regression or gradient boosting; a transformer is overkill for the latency and cost. Serving: cheap CPU, cache nothing (each email is unique). Monitoring: watch precision on sampled labeled mail and drift as spam tactics evolve (concept drift). This is where you show restraint: the boring model is the right model.

**Case 2 — semantic search (embeddings + ANN).** Metric offline: nDCG / recall@k; online: click and dwell. Data: query-document pairs, maybe click logs for fine-tuning. Model: a bi-encoder embeds queries and documents into the same space; retrieve with an approximate-nearest-neighbor index (HNSW / IVF) because exact search over millions of vectors is too slow. Storage math: 10M docs at 768 dims float32 is 10M * 768 * 4 bytes ~ 30 GB — mention quantizing vectors to shrink it. Serving: precompute document embeddings offline, embed only the query online. Optionally add a cross-encoder re-ranker on the top-k for quality.

**Case 3 — support chatbot (RAG + guardrails).** Metric: answer correctness / groundedness, deflection rate, escalation rate. Data: your help center and past tickets, chunked and embedded. Model: retrieve relevant chunks, stuff them into the prompt, generate with citations. Guardrails front and center: prompt-injection defenses on retrieved content, output validation, PII redaction, a moderation layer, and human handoff for low-confidence or irreversible actions (refunds). Serving: semantic cache for repeated questions, streaming responses. Monitoring: groundedness and hallucination rate, retrieval hit-rate, cost per conversation.

### Red flags interviewers watch for

- Jumping to a giant model before establishing scale, latency, and a baseline.
- No metrics, or only offline metrics with no online counterpart.
- Ignoring data: no answer for where labels come from or how fresh they are.
- Hand-waving serving — no QPS estimate, no GPU count, no caching story.
- Forgetting the model degrades: no drift monitoring, no retraining trigger.
- Proposing an agent (or RAG, or fine-tuning) when a simpler design clearly wins.

### How to practice

Take one prompt a day — "design a feed ranker", "design a fraud detector" — and time-box 30 minutes running the 7 steps out loud, ending with the napkin math. Record yourself. The skill is not knowing the answer; it is narrating a structured search toward one.

### ⚠️ Common pitfalls

- Designing before clarifying scale and latency — you will build the wrong system.
- Skipping the simple baseline; interviewers read that as immaturity, not ambition.
- Quoting metrics with no tradeoff attached (precision without saying what recall you sacrifice).
- No capacity math: "we will use GPUs" without a count is a non-answer.
- Bolting on monitoring as an afterthought instead of designing it in.

### 🎤 In interviews, they ask

- Design a spam filter / feed ranker / semantic search. (Run the 7 steps.)
- Estimate the QPS and GPU count for this load. (Do the napkin math out loud.)
- What offline and online metrics would you track, and what tradeoff does each encode?
- Where do your labels come from, and how do you handle their delay?
- When would you NOT use a large model or RAG here?

### TL;DR

- Run all seven steps: clarify, metrics, data, features/model, serving, monitoring, iterate.
- Always clarify scale and latency before designing; always start from a simple baseline.
- Pick online AND offline metrics and state the tradeoff each encodes.
- Do the napkin math aloud: QPS, peak, GPU count, storage.
- Pattern-match: spam = classic ML precision play; search = bi-encoder + ANN; chatbot = RAG + guardrails.
- Design monitoring and rollout in, not on. Name the drift and retraining triggers.
- The senior signal is a structured, quantified conversation — not a bigger model.

### Go deeper

- [Chip Huyen — ML interviews book](https://huyenchip.com/ml-interviews-book/)
- [Chip Huyen — designing machine learning systems](https://huyenchip.com/)
`,
  };

  W.quizzes["w5d4-quiz"] = [
    {
      q: String.raw`In an ML system design round, what should you do before proposing any model?`,
      options: [
        "Clarify scale, latency budget, and the cost of each error type, then agree on metrics",
        "Pick the largest transformer available to signal ambition",
        "Draw the full microservice architecture immediately",
        "Start coding the training loop",
      ],
      answer: 0,
      explain: String.raw`The first move is to clarify constraints — QPS, latency, error costs — and settle on online and offline metrics. Design decisions all hang on those numbers; a model chosen before them is a guess. Jumping to a big model or a full architecture first is the classic red flag.`,
    },
    {
      q: String.raw`Estimate the average QPS for this load. What is closest?

~~~python
daily_active_users = 8_640_000
requests_per_user = 10
seconds_per_day = 86_400
avg_qps = daily_active_users * requests_per_user / seconds_per_day
print(round(avg_qps))
~~~`,
      options: [
        "100",
        "1000",
        "10000",
        "86400",
      ],
      answer: 1,
      explain: String.raw`8,640,000 * 10 = 86,400,000 requests/day. Divide by 86,400 seconds and you get exactly 1000 QPS average. Being fluent with the seconds-per-day divisor (86,400) is what lets you do this estimate out loud without a calculator.`,
    },
    {
      q: String.raw`For a spam filter serving sub-10 ms at very high QPS, which design shows the most maturity?`,
      options: [
        "A large fine-tuned LLM for maximum accuracy",
        "A multi-agent system that debates whether each email is spam",
        "RAG over a database of known spam messages",
        "TF-IDF plus logistic regression or gradient boosting, optimizing precision at a recall floor",
      ],
      answer: 3,
      explain: String.raw`The latency and cost budget rules out heavy models; a linear or tree model on TF-IDF features is fast, cheap, and strong for this task. Precision is prioritized because a false positive hides a real email. Reaching for an LLM, agents, or RAG here signals over-engineering, not skill.`,
    },
    {
      q: String.raw`Why does large-scale semantic search use an approximate-nearest-neighbor (ANN) index instead of exact search?`,
      options: [
        "ANN is always more accurate than exact search",
        "ANN removes the need to embed the query",
        "Exact nearest-neighbor over millions of vectors is too slow at query time; ANN (HNSW/IVF) trades a little recall for a huge latency win",
        "Exact search cannot handle floating-point vectors",
      ],
      answer: 2,
      explain: String.raw`Brute-force exact search scales linearly with corpus size, which blows the latency budget at millions of vectors. ANN structures like HNSW or IVF return near-neighbors in sublinear time, giving up a small amount of recall for a large speedup — the standard tradeoff in vector retrieval.`,
    },
    {
      q: String.raw`How much storage for the document embeddings here? What is closest?

~~~python
num_docs = 10_000_000
dims = 768
bytes_per_float32 = 4
total_bytes = num_docs * dims * bytes_per_float32
print(total_bytes / 1e9, "GB")
~~~`,
      options: [
        "About 3 GB",
        "About 30 GB",
        "About 300 GB",
        "About 3 TB",
      ],
      answer: 1,
      explain: String.raw`10,000,000 * 768 * 4 = 30,720,000,000 bytes, roughly 30 GB. Knowing that a float32 is 4 bytes and multiplying through is exactly the storage napkin-math interviewers want — and it motivates quantizing vectors to shrink the index.`,
    },
    {
      q: String.raw`For a RAG support chatbot, which concern belongs at the center of the design, not as an afterthought?`,
      options: [
        "Guardrails: prompt-injection defenses on retrieved content, output validation, PII redaction, and human handoff for irreversible actions",
        "Choosing the trendiest vector database",
        "Using the largest possible context window regardless of cost",
        "Removing all caching so answers are always fresh",
      ],
      answer: 0,
      explain: String.raw`Retrieved documents are untrusted input, so a RAG chatbot must defend against injection, validate outputs, redact PII, and escalate low-confidence or irreversible actions to a human. These guardrails are core architecture. Vector-DB brand, maximal context, and disabling caches are distractions or cost mistakes.`,
    },
    {
      q: String.raw`Which is a genuine red flag in an ML system design interview?`,
      options: [
        "Starting from a simple baseline before a complex model",
        "Stating online and offline metrics with their tradeoffs",
        "Proposing a large model with no scale, latency, or baseline established first",
        "Estimating QPS and GPU count out loud",
      ],
      answer: 2,
      explain: String.raw`Reaching for a big model before you have established scale, latency, and a baseline is the signature junior mistake — it shows you optimize for sophistication over fit. The other three (baseline first, metrics with tradeoffs, capacity math aloud) are exactly the senior behaviors interviewers reward.`,
    },
  ];

  W.exercises["w5d4-e1"] = {
    title: "Capacity estimator",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Turn DAU into QPS, peak QPS, and a GPU count — the napkin math, in code.",
    description: String.raw`Codify the capacity back-of-envelope so the numbers are never hand-wavy.

~~~python
def estimate_capacity(daily_active, requests_per_user, peak_multiplier, tokens_per_req, tps_per_gpu):
    ...
~~~

Return a dict ~{"avg_qps": ..., "peak_qps": ..., "gpus": ...}~ where:

- ~avg_qps = daily_active * requests_per_user / 86400~ (86400 seconds per day).
- ~peak_qps = avg_qps * peak_multiplier~.
- ~gpus = ceil(peak_qps * tokens_per_req / tps_per_gpu)~ — provision for the peak, and round **up**.

Worked example:

~~~python
estimate_capacity(864000, 10, 3.0, 100, 10000)
# avg 100 qps, peak 300 qps, 300*100/10000 = 3.0 -> 3 gpus
~~~

Interview angle: this is the exact estimate you narrate in a design round. The only trap is provisioning for average instead of peak, and forgetting to ceil the GPU count.`,
    starter: String.raw`import math


def estimate_capacity(daily_active, requests_per_user, peak_multiplier, tokens_per_req, tps_per_gpu):
    """Return {"avg_qps", "peak_qps", "gpus"} for the given load."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Seconds per day is 86400 — that divisor turns daily volume into average QPS.`,
      String.raw`Peak load is what sizes the fleet: multiply avg QPS by the peak multiplier before the GPU math.`,
      String.raw`GPUs = ~math.ceil(peak_qps * tokens_per_req / tps_per_gpu)~. An exact multiple must not round up to a spare GPU.`,
    ],
    solution: String.raw`import math


def estimate_capacity(daily_active, requests_per_user, peak_multiplier, tokens_per_req, tps_per_gpu):
    avg_qps = daily_active * requests_per_user / 86400
    peak_qps = avg_qps * peak_multiplier
    gpus = math.ceil(peak_qps * tokens_per_req / tps_per_gpu)
    return {"avg_qps": avg_qps, "peak_qps": peak_qps, "gpus": gpus}`,
    tests: [
      { name: "computes average and peak qps", code: String.raw`import math
r = estimate_capacity(864000, 10, 3.0, 100, 10000)
assert math.isclose(r["avg_qps"], 100.0), r
assert math.isclose(r["peak_qps"], 300.0), r` },
      { name: "gpus ceil an exact peak load", code: String.raw`r = estimate_capacity(864000, 10, 3.0, 100, 10000)
assert r["gpus"] == 3, r` },
      { name: "a fractional GPU need rounds up", code: String.raw`r = estimate_capacity(864000, 10, 3.0, 105, 10000)
assert r["gpus"] == 4, r` },
      { name: "a second workload checks the arithmetic", code: String.raw`import math
r = estimate_capacity(864000, 5, 4.0, 250, 30000)
assert math.isclose(r["avg_qps"], 50.0), r
assert math.isclose(r["peak_qps"], 200.0), r
assert r["gpus"] == 2, r` },
    ],
  };

  W.exercises["w5d4-e2"] = {
    title: "Token bucket rate limiter",
    difficulty: 3,
    xp: 40,
    minutes: 30,
    packages: [],
    brief: "Implement the classic rate limiter with lazy refill — fractional rates and all.",
    description: String.raw`Rate limiting protects a model service from being swamped. Implement a token bucket with **lazy refill** over integer logical ticks.

~~~python
class TokenBucket:
    def __init__(self, capacity, refill_rate):
        ...
    def allow(self, tick):
        ...
~~~

- The bucket starts **full** (~capacity~ tokens).
- ~refill_rate~ is tokens added per tick and may be fractional (e.g. ~0.5~).
- ~allow(tick)~ is called with a non-decreasing ~tick~. It must **lazily** refill first: add ~elapsed * refill_rate~ tokens (where ~elapsed~ is ticks since the last call), capped at ~capacity~. Then, if at least 1 token is available, consume one and return ~True~; otherwise return ~False~.
- Multiple calls at the same tick add no new tokens (elapsed is 0).

Worked example:

~~~python
b = TokenBucket(2, 1)
b.allow(0)   # True  (2 -> 1)
b.allow(0)   # True  (1 -> 0)
b.allow(0)   # False (0 tokens, same tick, no refill)
b.allow(1)   # True  (+1 refill -> 1 -> 0)
~~~

Watch the fractional case: with ~refill_rate = 0.5~, one tick is not enough to earn a token — you need two. Truncating the refill to an int is a bug the tests catch.

Interview angle: token bucket is the canonical rate-limiter question. Lazy refill (compute on access, not on a timer) and honest fractional accounting are what they check.`,
    starter: String.raw`class TokenBucket:
    def __init__(self, capacity, refill_rate):
        """Start full. refill_rate tokens per tick, may be fractional."""
        # your code here
        raise NotImplementedError

    def allow(self, tick):
        """Lazily refill to the current tick, then consume a token if possible."""
        # your code here
        raise NotImplementedError`,
    hints: [
      String.raw`Store ~capacity~, ~refill_rate~, current ~tokens~ (start at capacity), and ~last_tick~ (start at 0). Keep tokens as a float.`,
      String.raw`In ~allow~, compute ~elapsed = tick - last_tick~; if positive, ~tokens = min(capacity, tokens + elapsed * refill_rate)~ and update ~last_tick~. Do NOT round the refill.`,
      String.raw`Then if ~tokens >= 1~, subtract 1 and return True; else return False. Same-tick calls have elapsed 0, so no free refill.`,
    ],
    solution: String.raw`class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = float(capacity)
        self.refill_rate = float(refill_rate)
        self.tokens = float(capacity)
        self.last_tick = 0

    def allow(self, tick):
        elapsed = tick - self.last_tick
        if elapsed > 0:
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_tick = tick
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False`,
    tests: [
      { name: "drains capacity then blocks within a tick", code: String.raw`b = TokenBucket(2, 1)
assert b.allow(0) is True
assert b.allow(0) is True
assert b.allow(0) is False` },
      { name: "refills one token per tick", code: String.raw`b = TokenBucket(2, 1)
b.allow(0); b.allow(0)
assert b.allow(1) is True
assert b.allow(1) is False
assert b.allow(2) is True` },
      { name: "fractional rate needs two ticks for one token", code: String.raw`b = TokenBucket(1, 0.5)
assert b.allow(0) is True
assert b.allow(1) is False
assert b.allow(2) is True` },
      { name: "refill never exceeds capacity", code: String.raw`b = TokenBucket(2, 5)
b.allow(0); b.allow(0)
assert b.allow(100) is True
assert b.allow(100) is True
assert b.allow(100) is False` },
    ],
  };

  W.exercises["w5d4-e3"] = {
    title: "TTL cache with a logical clock",
    difficulty: 2,
    xp: 30,
    minutes: 16,
    packages: [],
    brief: "A cache that expires by TTL and evicts oldest-first at capacity.",
    description: String.raw`Response caching cuts cost — but entries must expire and the cache must stay bounded. Implement a TTL cache driven by a logical clock (no wall-clock time).

~~~python
class TTLCache:
    def __init__(self, capacity, ttl):
        ...
    def advance(self, dt):
        ...
    def put(self, key, value):
        ...
    def get(self, key):
        ...
~~~

- The internal clock starts at 0; ~advance(dt)~ moves it forward by ~dt~ ticks.
- ~put(key, value)~ stores ~value~ with expiry ~clock + ttl~. Updating an existing key refreshes its value, expiry, and recency. If inserting a **new** key would exceed ~capacity~, evict the **oldest-inserted** key first (FIFO, not LRU-on-read).
- ~get(key)~ returns the value if present and not expired (expired means ~clock >= expiry~); an expired or missing key returns ~None~ (drop expired entries when you hit them).

Worked example:

~~~python
c = TTLCache(2, 5)
c.put("a", 1)
c.advance(4); c.get("a")   # 1  (still fresh)
c.advance(1); c.get("a")   # None (clock 5 >= expiry 5)
~~~

Interview angle: caches are a staple design component. The gotchas are TTL expiry semantics (strict ~>=~) and bounded capacity with a clear eviction policy.`,
    starter: String.raw`class TTLCache:
    def __init__(self, capacity, ttl):
        """Logical-clock TTL cache with oldest-first eviction at capacity."""
        # your code here
        raise NotImplementedError

    def advance(self, dt):
        # your code here
        raise NotImplementedError

    def put(self, key, value):
        # your code here
        raise NotImplementedError

    def get(self, key):
        # your code here
        raise NotImplementedError`,
    hints: [
      String.raw`Keep a dict ~key -> (value, expire_at)~ plus a list tracking insertion order for FIFO eviction.`,
      String.raw`On ~put~: if the key exists, remove it from the order list first (it will be re-appended as newest); else if the cache is full, pop the front of the order list and delete it.`,
      String.raw`On ~get~: miss -> None; if ~clock >= expire_at~, delete the entry and return None; otherwise return the value. ~advance~ just increments the clock.`,
    ],
    solution: String.raw`class TTLCache:
    def __init__(self, capacity, ttl):
        self.capacity = capacity
        self.ttl = ttl
        self.clock = 0
        self.store = {}
        self.order = []

    def advance(self, dt):
        self.clock += dt

    def put(self, key, value):
        if key in self.store:
            self.order.remove(key)
        elif len(self.store) >= self.capacity:
            oldest = self.order.pop(0)
            del self.store[oldest]
        self.store[key] = (value, self.clock + self.ttl)
        self.order.append(key)

    def get(self, key):
        if key not in self.store:
            return None
        value, expire_at = self.store[key]
        if self.clock >= expire_at:
            self.order.remove(key)
            del self.store[key]
            return None
        return value`,
    tests: [
      { name: "get returns a freshly put value", code: String.raw`c = TTLCache(2, 5)
c.put("a", 1)
assert c.get("a") == 1` },
      { name: "value expires exactly at ttl", code: String.raw`c = TTLCache(2, 5)
c.put("a", 1)
c.advance(5)
assert c.get("a") is None` },
      { name: "still valid one tick before ttl", code: String.raw`c = TTLCache(2, 5)
c.put("a", 1)
c.advance(4)
assert c.get("a") == 1` },
      { name: "capacity evicts the oldest inserted key", code: String.raw`c = TTLCache(2, 100)
c.put("a", 1); c.put("b", 2); c.put("c", 3)
assert c.get("a") is None
assert c.get("b") == 2 and c.get("c") == 3` },
      { name: "re-put refreshes recency so the other key is evicted", code: String.raw`c = TTLCache(2, 10)
c.put("a", 1); c.put("b", 2)
c.put("a", 9)
c.put("c", 3)
assert c.get("b") is None
assert c.get("a") == 9` },
    ],
  };

  // ================= Day 5 =================
  W.days.push({
    id: "w5d5",
    title: "Interview Marathon",
    minutes: 105,
    blocks: [
      { type: "lesson",   id: "w5d5-lesson", minutes: 20 },
      { type: "quiz",     id: "w5d5-quiz",   minutes: 15 },
      { type: "exercise", id: "w5d5-e1",     minutes: 20 },
      { type: "exercise", id: "w5d5-e2",     minutes: 20 },
      { type: "exercise", id: "w5d5-e3",     minutes: 12, optional: true },
      { type: "cards",    deck: "opt",       count: 8, minutes: 10 },
      { type: "cards",    deck: "inf",       count: 6, minutes: 8 },
    ],
  });

  W.lessons["w5d5-lesson"] = {
    title: "Interview Marathon: The Meta-Game",
    md: String.raw`Today is about the *how*, not the *what*. Two candidates with identical knowledge get different offers because one runs a visible, calm process and the other blurts a half-answer and stalls. This lesson is the protocol for live coding, ML discussion, and behavioral rounds — the stuff that turns knowledge into offers.

### The live-coding protocol

When you get a coding prompt, do NOT start typing. Run these five steps out loud, every time:

1. **Restate** the problem in your own words. "So I need a function that takes a list and returns the top-k by score, ties broken by index — is that right?" This catches misunderstandings before they cost you 15 minutes.
2. **Examples**: write 2-3 concrete input/output pairs, including an edge case (empty, one element, ties). These become your tests later.
3. **Brute force first**: state the obvious O(n^2) solution. A working slow answer beats a broken clever one, and it gives you something to optimize *from*.
4. **Optimize**: name the bottleneck and the idea — "the inner loop re-scans; a hash map makes lookup O(1)." Say the complexity before and after.
5. **Test aloud**: walk your examples through the code line by line. Narrate the edge cases. Finding your own bug is a strong signal; the interviewer finding it is not.

~~~text
Restate -> Examples -> Brute force -> Optimize -> Test aloud
~~~

### Think aloud, always

Silence is the enemy. The interviewer is scoring your *reasoning*, and they cannot score what they cannot hear. Narrate the search: "I could sort, which is O(n log n), or use a heap for top-k, which is O(n log k) — since k is small I will heap." Even when stuck, externalize: "I know this is a two-pointer shape but I am blanking on the invariant, let me work a small example."

### Handling "I don't know"

You will hit something you do not know. The move is not to freeze or bluff — interviewers smell both. Instead:

- **Say what you do know** and reason toward it. "I have not used that exact algorithm, but it sounds like a variant of X, which works by..."
- **Ask a clarifying question** to buy thinking time and re-anchor.
- **Never invent an API or a number.** "I would look up the exact signature, but the shape is..." is honest and fine. A confident wrong fact is worse than an admitted gap.

### Behavioral rounds: STAR in five sentences

Behavioral answers ramble unless you have a skeleton. Use **STAR**: **Situation** (one sentence of context), **Task** (what you owned), **Action** (what *you* — not "we" — did, two sentences, the meat), **Result** (the quantified outcome). Prepare 4-5 stories — a shipped project, a conflict, a failure, a time you influenced without authority — and map them to STAR ahead of time. "We reduced latency" is weak; "I profiled the endpoint, found the model loaded per request, moved it to startup, and cut p95 from 900 ms to 200 ms" is an offer.

### Questions to ask back

The interview is bidirectional, and "no questions" reads as no interest. Keep a few ready:

- "What does success look like for this role in the first six months?"
- "How does the team move a model from notebook to production — what does that pipeline look like?"
- "What is the biggest technical challenge the team is facing right now?"

Good questions signal seniority and let you evaluate them back.

### ⚠️ Common pitfalls

- Coding in silence, then presenting a wrong answer with no visible reasoning.
- Skipping examples and edge cases, then getting surprised by the empty-input test.
- Optimizing prematurely instead of landing a correct brute force first.
- Bluffing a fact or an API you do not know — a fast way to lose trust.
- Behavioral answers in "we" with no numbers; the panel cannot tell what *you* did.

### 🎤 In interviews, they ask

- Walk me through your approach before you code. (Restate, examples, brute force, optimize, test.)
- What is the time and space complexity, and can you do better?
- Tell me about a time you shipped something under a hard deadline. (STAR, quantified.)
- Tell me about a technical decision you disagreed with. (STAR, conflict story.)
- Do you have any questions for us? (Always yes.)

### TL;DR

- Live coding: Restate, Examples, Brute force, Optimize, Test aloud — every time.
- Think aloud constantly; the interviewer scores reasoning they can hear.
- On "I don't know": reason from what you know, clarify, never bluff a fact or API.
- Behavioral: STAR in five sentences, first-person actions, quantified results.
- Prepare 4-5 stories and 3 questions to ask back before you walk in.

### Go deeper

- [Chip Huyen — ML interviews book](https://huyenchip.com/ml-interviews-book/)
- [Chip Huyen — writing on ML systems and careers](https://huyenchip.com/)
`,
  };

  W.quizzes["w5d5-quiz"] = [
    {
      q: String.raw`What does this print?

~~~python
def collect(x, acc=[]):
    acc.append(x)
    return acc

collect(1)
collect(2)
print(collect(3))
~~~`,
      options: [
        "[3]",
        "[1, 2, 3]",
        "[2, 3]",
        "It raises a TypeError",
      ],
      answer: 1,
      explain: String.raw`The default list ~acc=[]~ is created once at function definition and shared across all calls that do not pass their own. So the appends accumulate: [1], then [1,2], then [1,2,3]. The fix is the ~None~ sentinel: ~acc=None~ then ~acc = acc or []~ inside.`,
    },
    {
      q: String.raw`In classic ML, increasing L2 regularization strength (lambda) generally does what to the bias-variance tradeoff?`,
      options: [
        "Raises bias and lowers variance, shrinking the weights toward zero",
        "Lowers bias and raises variance",
        "Lowers both bias and variance with no downside",
        "Has no effect on either; it only changes training speed",
      ],
      answer: 0,
      explain: String.raw`L2 penalizes large weights, pulling them toward zero. That constrains the model (higher bias) but makes it less sensitive to noise in the training data (lower variance). Too much lambda underfits. It is the standard knob for trading a bit of bias to cut overfitting.`,
    },
    {
      q: String.raw`What does this print?

~~~python
a = [1, 2, 3]
b = a
c = a[:]
b.append(4)
c.append(5)
print(a)
~~~`,
      options: [
        "[1, 2, 3]",
        "[1, 2, 3, 4, 5]",
        "[1, 2, 3, 4]",
        "[1, 2, 3, 5]",
      ],
      answer: 2,
      explain: String.raw`~b = a~ is an alias — the same list object — so ~b.append(4)~ mutates ~a~ to [1,2,3,4]. ~c = a[:]~ is a shallow copy, a separate list, so ~c.append(5)~ does not touch ~a~. Aliasing vs copying is a constant source of bugs.`,
    },
    {
      q: String.raw`A model has 99% accuracy on a dataset that is 99% negative class. What is the problem, and the fix?`,
      options: [
        "No problem — 99% accuracy is excellent",
        "The model is overfit; add more layers",
        "Accuracy is misleading on imbalanced data; report precision, recall, F1 (or PR-AUC) and check the minority class",
        "The learning rate is too high",
      ],
      answer: 2,
      explain: String.raw`A constant "predict negative" classifier also scores 99% here while catching zero positives. On imbalanced data, accuracy hides minority-class failure; precision, recall, F1, and PR-AUC expose it. Naming this trap is a classic classification-metrics interview check.`,
    },
    {
      q: String.raw`Why does scaled dot-product attention divide the scores by the square root of the key dimension?

~~~text
scores = (Q . K^T) / sqrt(d_k)
~~~`,
      options: [
        "To make the matrix square",
        "To normalize the values V to unit length",
        "It is arbitrary and has no effect",
        "To keep the dot products from growing large with d_k, which would push softmax into tiny gradients",
      ],
      answer: 3,
      explain: String.raw`Dot products of two d_k-dimensional vectors grow in magnitude with d_k. Large scores saturate the softmax, making it near one-hot with vanishing gradients. Dividing by sqrt(d_k) keeps the variance roughly constant so training stays stable.`,
    },
    {
      q: String.raw`In LLM decoding, raising the temperature does what to the next-token distribution?`,
      options: [
        "Sharpens it toward the argmax, making output more deterministic",
        "Flattens it, spreading probability mass and increasing randomness",
        "Removes the least likely tokens entirely",
        "Has no effect unless top-p is also set",
      ],
      answer: 1,
      explain: String.raw`Temperature divides the logits before softmax. T > 1 flattens the distribution (more diverse, more random); T < 1 sharpens it toward the top token (more deterministic). Top-k and top-p are separate truncation steps that can stack on top of temperature.`,
    },
    {
      q: String.raw`Your RAG chatbot confidently answers a question the knowledge base does not cover. What is the most likely cause and a direct mitigation?`,
      options: [
        "Retrieval returned weak or irrelevant chunks and the model answered anyway; add a relevance threshold and instruct it to say it does not know",
        "The vector index is too large; shrink it",
        "The temperature is too low; raise it",
        "The model needs more parameters",
      ],
      answer: 0,
      explain: String.raw`When retrieval misses, the model falls back on parametric memory and hallucinates with confidence. Mitigations: gate on retrieval score (refuse or escalate below a threshold), prompt for grounded-only answers with citations, and measure groundedness. It is a retrieval-quality problem, not a model-size one.`,
    },
    {
      q: String.raw`What does this print?

~~~python
words = ["a", "bb", "a", "ccc", "bb", "a"]
from collections import Counter
c = Counter(words)
print(c.most_common(1))
~~~`,
      options: [
        "['a']",
        "{'a': 3}",
        "[('a', 3)]",
        "[('a', 3), ('bb', 2)]",
      ],
      answer: 2,
      explain: String.raw`~Counter.most_common(1)~ returns a list with the single most frequent ~(element, count)~ tuple. "a" appears 3 times, so the result is ~[('a', 3)]~ — a list of one tuple, not a bare string or a dict.`,
    },
    {
      q: String.raw`Gradient descent with too large a learning rate typically does what?`,
      options: [
        "Converges faster with no risk",
        "Always gets stuck in a local minimum",
        "Reduces the model's capacity",
        "Overshoots minima and can diverge, with the loss oscillating or blowing up",
      ],
      answer: 3,
      explain: String.raw`Too large a step overshoots the downhill direction; updates bounce across the valley and the loss oscillates or diverges to infinity. Too small a rate is stable but crawls. Finding the usable range (often via a learning-rate sweep) is a core training skill.`,
    },
    {
      q: String.raw`Why are word embeddings preferred over one-hot vectors as model inputs for NLP?`,
      options: [
        "Embeddings are dense and low-dimensional and place similar words near each other, so the model generalizes across related words",
        "One-hot vectors are always larger files on disk",
        "One-hot vectors cannot be fed into a neural network at all",
        "Embeddings guarantee zero out-of-vocabulary words",
      ],
      answer: 0,
      explain: String.raw`One-hot vectors are huge, sparse, and orthogonal — every word is equally dissimilar, so nothing transfers. Learned embeddings are dense and put semantically related words close together, letting the model share statistical strength across words. That generalization is the whole point.`,
    },
  ];

  W.exercises["w5d5-e1"] = {
    title: "F1 and macro-F1, zero-division safe",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "The metric every classifier interview touches — implemented without a NaN in sight.",
    description: String.raw`F1 is the harmonic mean of precision and recall, and it must not crash when a class has no predictions or no support.

~~~python
def f1_from_counts(tp, fp, fn):
    ...

def macro_f1(per_class_counts):
    ...
~~~

- **~f1_from_counts(tp, fp, fn)~** — precision = ~tp / (tp + fp)~, recall = ~tp / (tp + fn)~, F1 = ~2 * p * r / (p + r)~. Every denominator can be zero: if ~tp + fp == 0~, ~tp + fn == 0~, or ~p + r == 0~, treat that quantity as ~0.0~ instead of dividing. So an all-zero class returns ~0.0~, never a ~ZeroDivisionError~.
- **~macro_f1(per_class_counts)~** — ~per_class_counts~ is a list of ~(tp, fp, fn)~ tuples, one per class. Return the unweighted mean of each class's F1. An empty list returns ~0.0~.

Worked example:

~~~python
f1_from_counts(5, 5, 5)          # p=0.5, r=0.5 -> F1 0.5
f1_from_counts(0, 0, 0)          # 0.0, not an error
macro_f1([(5,5,5), (10,0,0)])    # mean(0.5, 1.0) = 0.75
~~~

Interview angle: "implement F1" is a warm-up that trips people on the zero-division edge cases. Macro vs micro averaging is the natural follow-up.`,
    starter: String.raw`def f1_from_counts(tp, fp, fn):
    """F1 from raw counts; returns 0.0 instead of dividing by zero."""
    # your code here
    raise NotImplementedError


def macro_f1(per_class_counts):
    """Unweighted mean of per-class F1. per_class_counts: list of (tp, fp, fn)."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Guard each division: ~prec = tp / (tp + fp) if (tp + fp) else 0.0~, same shape for recall.`,
      String.raw`F1 also needs a guard: if ~prec + rec == 0~ return 0.0, else ~2 * prec * rec / (prec + rec)~.`,
      String.raw`Macro-F1 is just the average over classes; handle the empty list up front by returning 0.0 to avoid dividing by len 0.`,
    ],
    solution: String.raw`def f1_from_counts(tp, fp, fn):
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    return 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0


def macro_f1(per_class_counts):
    if not per_class_counts:
        return 0.0
    return sum(f1_from_counts(*c) for c in per_class_counts) / len(per_class_counts)`,
    tests: [
      { name: "balanced counts give F1 0.5", code: String.raw`import math
assert math.isclose(f1_from_counts(5, 5, 5), 0.5), f1_from_counts(5, 5, 5)` },
      { name: "perfect prediction gives 1.0", code: String.raw`assert f1_from_counts(10, 0, 0) == 1.0, f1_from_counts(10, 0, 0)` },
      { name: "all-zero class is 0.0, not an error", code: String.raw`assert f1_from_counts(0, 0, 0) == 0.0, f1_from_counts(0, 0, 0)` },
      { name: "macro averages per-class F1", code: String.raw`import math
m = macro_f1([(5, 5, 5), (10, 0, 0)])
assert math.isclose(m, 0.75), m` },
      { name: "macro of an empty list is 0.0", code: String.raw`assert macro_f1([]) == 0.0, macro_f1([])` },
    ],
  };

  W.exercises["w5d5-e2"] = {
    title: "Cosine top-k retrieval",
    difficulty: 2,
    xp: 30,
    minutes: 20,
    packages: [],
    brief: "Rank documents by cosine similarity and return the top-k — pure python.",
    description: String.raw`The core of every retriever: score documents against a query by cosine similarity and return the best k.

~~~python
def cosine_topk(query_vec, doc_vecs, k):
    ...
~~~

- Cosine similarity of ~a~ and ~b~ is ~dot(a, b) / (norm(a) * norm(b))~. If either vector has zero norm, define the similarity as ~0.0~ (never divide by zero).
- ~doc_vecs~ is a list of equal-length vectors. Return a list of ~(index, score)~ for the top ~k~ documents, sorted by score **descending**; break ties by **smaller index first**.
- If ~k~ exceeds the number of documents, return all of them (still sorted).

Worked example:

~~~python
cosine_topk([1, 1], [[1, 0], [1, 1], [0, 1]], 3)
# doc 1 is identical direction (score 1.0), docs 0 and 2 tie at ~0.707
# -> [(1, 1.0), (0, 0.707...), (2, 0.707...)]
~~~

Interview angle: this is retrieval without a library — the cosine formula, the zero-norm guard, and a stable tie-break by index are the three things graders check.`,
    starter: String.raw`import math


def cosine_topk(query_vec, doc_vecs, k):
    """Top-k (index, score) by cosine similarity, desc, ties by smaller index."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Write a helper for cosine: dot product over ~zip(a, b)~, divided by the product of the two norms; return 0.0 if either norm is 0.`,
      String.raw`Score every doc into ~(index, score)~ pairs with ~enumerate~.`,
      String.raw`Sort with key ~(-score, index)~ so higher scores come first and ties fall back to the smaller index, then slice ~[:k]~.`,
    ],
    solution: String.raw`import math


def _cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def cosine_topk(query_vec, doc_vecs, k):
    scored = [(i, _cosine(query_vec, d)) for i, d in enumerate(doc_vecs)]
    scored.sort(key=lambda t: (-t[1], t[0]))
    return scored[:k]`,
    tests: [
      { name: "identical direction scores 1.0", code: String.raw`import math
out = cosine_topk([1, 0], [[1, 0], [0, 1]], 1)
assert out[0][0] == 0 and math.isclose(out[0][1], 1.0), out` },
      { name: "orders by descending similarity", code: String.raw`out = cosine_topk([1, 1], [[1, 0], [1, 1], [0, 1]], 3)
assert [i for i, _ in out] == [1, 0, 2], out` },
      { name: "ties are broken by smaller index", code: String.raw`out = cosine_topk([1, 0], [[0, 1], [0, 5]], 2)
assert [i for i, _ in out] == [0, 1], out` },
      { name: "k larger than the corpus returns all", code: String.raw`out = cosine_topk([1, 0], [[1, 0]], 5)
assert len(out) == 1, out` },
      { name: "zero query vector is safe", code: String.raw`out = cosine_topk([0, 0], [[1, 2]], 1)
assert out[0][1] == 0.0, out` },
    ],
  };

  W.exercises["w5d5-e3"] = {
    title: "Most frequent bigram",
    difficulty: 1,
    xp: 20,
    minutes: 12,
    packages: [],
    brief: "Find the top word bigram, ties broken alphabetically.",
    description: String.raw`A quick text-processing kata. Find the most frequent adjacent word pair.

~~~python
def top_bigram(text):
    ...
~~~

- Lowercase the text and tokenize into words with ~re.findall(r"[a-z0-9]+", ...)~ (so punctuation splits words).
- Form adjacent bigrams: consecutive ~(word, next_word)~ pairs.
- Return the most frequent bigram as a ~(w1, w2)~ tuple. On a tie, return the alphabetically smallest tuple.
- Fewer than two words: return ~None~.

Worked example:

~~~python
top_bigram("the cat sat the cat ran the cat")   # ("the", "cat") appears 3x
top_bigram("a b and c d")                        # all tie -> ("a", "b")
top_bigram("hello")                              # None
~~~

Interview angle: n-gram counting shows up constantly in NLP screens. The alphabetical tie-break is the detail that makes the output deterministic.`,
    starter: String.raw`import re
from collections import Counter


def top_bigram(text):
    """Most frequent adjacent word bigram; ties broken alphabetically; None if < 2 words."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Tokenize with ~re.findall(r"[a-z0-9]+", text.lower())~; if fewer than 2 tokens, return None.`,
      String.raw`~Counter(zip(words, words[1:]))~ counts every adjacent pair in one line.`,
      String.raw`Find the max count, then return ~min(bg for bg, n in counts.items() if n == top)~ — ~min~ over tuples gives the alphabetical tie-break for free.`,
    ],
    solution: String.raw`import re
from collections import Counter


def top_bigram(text):
    words = re.findall(r"[a-z0-9]+", text.lower())
    if len(words) < 2:
        return None
    counts = Counter(zip(words, words[1:]))
    top = max(counts.values())
    return min(bg for bg, n in counts.items() if n == top)`,
    tests: [
      { name: "the most frequent bigram wins", code: String.raw`assert top_bigram("the cat sat the cat ran the cat") == ("the", "cat"), top_bigram("the cat sat the cat ran the cat")` },
      { name: "ties break alphabetically", code: String.raw`assert top_bigram("a b and c d") == ("a", "b"), top_bigram("a b and c d")` },
      { name: "fewer than two words returns None", code: String.raw`assert top_bigram("hello") is None, top_bigram("hello")` },
      { name: "counting is case-insensitive", code: String.raw`assert top_bigram("Go Fast go fast GO FAST") == ("go", "fast"), top_bigram("Go Fast go fast GO FAST")` },
    ],
  };

  // ================= Day 6 (homework + FINAL BOSS) =================
  W.days.push({
    id: "w5d6",
    title: "Endgame",
    minutes: 130,
    blocks: [
      { type: "lesson",   id: "w5d6-lesson", minutes: 15 },
      { type: "homework", id: "w5-hw",       minutes: 70 },
      { type: "boss",     id: "w5-boss",     minutes: 45 },
    ],
  });

  W.lessons["w5d6-lesson"] = {
    title: "Endgame: Ship, Maintain, Present",
    md: String.raw`You have covered five weeks of ground. This final mini-lesson is about converting it into an offer: the checklist for interview day, a plan to keep the knowledge warm, and how to talk about what you built here as a portfolio.

### Pre-interview checklist

The night before, do not cram new topics — consolidate. Run this list:

- **Re-read your own notes**, not new material. You want retrieval fluency, not fresh confusion.
- **Warm up with one easy kata** the morning of, so your first line of code in the interview is not your first line of the day.
- **Have your STAR stories loaded** — 4 to 5, mapped to project, conflict, failure, influence.
- **Prepare three questions to ask** the interviewer, and know the company's product.
- **Environment check** for remote: camera, mic, a working editor, water, a quiet room.
- **Read the loop back to yourself**: agent = LLM + loop + tools + state; the 7-step design framework; p50/p95/p99; PSI > 0.25 = act. These one-liners are your anchors under pressure.

### A 4-week maintenance plan

Knowledge decays without use. After this course, protect the investment:

- **Spaced review**: run the flashcard decks on a spaced schedule — daily for a week, then every few days, then weekly. Spacing beats bulk re-reading for retention.
- **Two katas a week**: alternate a data-structures/algorithms problem with an ML-from-scratch kata (softmax, attention, F1, a batching sim). Keep the muscle.
- **One mock a week**: a mock coding round or a spoken system-design run, ideally with a peer. Record it; watch for silence and hand-waving.
- **Read one production write-up a week**: an engineering blog on serving, drift, or agents. It refreshes vocabulary and gives you fresh interview examples.

Two to three hours a week keeps you sharp for months.

### Present your projects as portfolio

You did not just do exercises — you built five things. Each is a talking point. Frame them with the same STAR-ish shape: what it does, one hard decision, one number.

- **Inventory system (Python)**: "A CRUD inventory tool — I used dataclasses and a clean module split, and handled the mutable-default-argument trap that bites beginners." Shows Python fundamentals.
- **ML pipeline (classic ML)**: "An end-to-end pipeline — features, train/test split without leakage, and metrics beyond accuracy: precision, recall, F1 on the minority class." Shows modeling discipline.
- **Sentiment classifier (NLP)**: "TF-IDF to a linear model, then I compared against embeddings — and could explain when the simpler model is the right call." Shows judgment, not just tools.
- **Mini-RAG (LLM + retrieval)**: "Chunk, embed, retrieve top-k by cosine, generate with citations — plus a relevance threshold so it says 'I don't know' instead of hallucinating." Shows you know RAG's failure modes.
- **Agent with tools (this week)**: "A ReAct-style agent with a tool registry, paranoid validation, error recovery, and a step budget — and I can say when a fixed pipeline would have been the better design." Shows senior restraint.

The meta-signal across all five: you reach for the simplest thing that works, you know the failure modes, and you can put a number on the result. That is what gets hired.

### ⚠️ Common pitfalls

- Cramming new material the night before instead of consolidating what you know.
- Describing projects as feature lists ("it has a database") instead of decisions and numbers.
- Letting skills decay after the course with no review cadence.
- Over-claiming — "I built a production system" for a course project. Be precise and honest.

### 🎤 In interviews, they ask

- Walk me through a project you are proud of. (Pick one above; lead with the hard decision.)
- What would you do differently if you rebuilt it?
- How do you keep your skills current?
- Why did you choose that model / approach over the alternatives?

### TL;DR

- Night before: consolidate, do not cram; load your STAR stories and questions.
- Maintain with spaced flashcards, two katas and one mock per week, one write-up.
- Present each of your five projects with a purpose, one hard decision, and one number.
- The hiring signal: simplest thing that works, known failure modes, quantified results.

### Go deeper

- [Anthropic — building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Chip Huyen — ML interviews book](https://huyenchip.com/ml-interviews-book/)
- [Model Context Protocol](https://modelcontextprotocol.io)
`,
  };

  W.exercises["w5-hw"] = {
    title: "Capstone: Agent With Tools",
    kind: "homework",
    difficulty: 3,
    xp: 100,
    minutes: 70,
    packages: [],
    brief: "Build the whole agent: a tool registry, a runner loop, error recovery, and a transcript.",
    description: String.raw`This is the capstone: assemble a working ReAct-style agent from the pieces you have practiced all week. The starter provides the tools (a safe ~calc~, a ~kb_lookup~, and a scripted policy that stands in for an LLM). You build the machinery around them.

Implement two classes.

**~ToolRegistry~**

- ~register(name, fn, params)~ — store a tool under ~name~ with its callable ~fn~ and its list of required parameter names ~params~.
- ~validate(name, args)~ — return ~(True, None)~ if ~name~ is registered and ~args~ has exactly the required keys; otherwise ~(False, reason)~ where ~reason~ starts with ~"unknown_tool"~ (name not registered) or ~"bad_args"~ (wrong keys).
- ~dispatch(name, args)~ — validate, then call ~fn(**args)~ and return ~str(result)~. If validation fails, return ~"ERROR: " + reason~. If the tool itself raises, return ~"ERROR: tool_error: " + str(exception)~. It must NEVER raise.

**~AgentRunner~**

- ~__init__(self, policy, max_steps=8)~ — store the policy and budget, initialize ~self.todos = []~ and ~self.transcript = []~, build a ~ToolRegistry~, and register three tools: ~calc~ (param ~["expression"]~), ~kb_lookup~ (param ~["key"]~), and ~todo_add~ (param ~["item"]~) where ~todo_add~ appends its item to ~self.todos~ and returns ~"TODO_ADDED"~.
- ~run(self, query)~ — reset the transcript, then loop up to ~max_steps~ times. Each step: call ~policy(query, self.transcript)~. If the decision has key ~"final"~, return its value (final-answer assembly). Otherwise dispatch ~decision["action"]~ with ~decision.get("args", {})~, and append ~{"step": step, "action": name, "args": args, "observation": obs}~ to the transcript (~step~ is 1-based). If the budget is exhausted before a final, return ~None~.

Because ~dispatch~ turns every failure into an ~"ERROR: ..."~ observation, an unknown tool or bad args does not crash the run — the error flows back into the transcript and the policy can recover.

The scripted scenario needs three tool calls (calc, then kb_lookup, then todo_add) before its final, so a correct run produces a 3-step transcript, one todo, and the assembled answer.

Interview angle: this is the "build me an agent" take-home in miniature. Graders look for errors-as-data (never raising), a clean tool contract, a bounded loop, and a transcript you could replay.`,
    starter: String.raw`import re

KB = {
    "speed of light": "299792458",
    "pi": "3.14159",
    "python release": "1991",
}


def calc(expression):
    """Safe arithmetic: a regex gate plus a tiny recursive-descent parser. Never uses eval()."""
    if not isinstance(expression, str) or not re.fullmatch(r"[0-9 +\-*/().]+", expression.strip()):
        raise ValueError("unsafe or empty expression")
    tokens = re.findall(r"\d+\.\d+|\d+|[+\-*/()]", expression)
    pos = 0

    def peek():
        return tokens[pos] if pos < len(tokens) else None

    def advance():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok

    def parse_expr():
        val = parse_term()
        while peek() in ("+", "-"):
            op = advance()
            rhs = parse_term()
            val = val + rhs if op == "+" else val - rhs
        return val

    def parse_term():
        val = parse_factor()
        while peek() in ("*", "/"):
            op = advance()
            rhs = parse_factor()
            val = val * rhs if op == "*" else val / rhs
        return val

    def parse_factor():
        tok = peek()
        if tok == "(":
            advance()
            val = parse_expr()
            advance()
            return val
        if tok == "-":
            advance()
            return -parse_factor()
        if tok == "+":
            advance()
            return parse_factor()
        return float(advance())

    value = parse_expr()
    return str(int(value)) if float(value).is_integer() else str(value)


def kb_lookup(key):
    return KB.get(key.lower().strip(), "NOT_FOUND")


def scripted_policy(query, transcript):
    """Deterministic stand-in for an LLM: calc, then kb_lookup, then todo_add, then finish."""
    n = len(transcript)
    if n == 0:
        return {"action": "calc", "args": {"expression": "12 * 12"}}
    if n == 1:
        return {"action": "kb_lookup", "args": {"key": "speed of light"}}
    if n == 2:
        item = "review " + transcript[0]["observation"] + " and " + transcript[1]["observation"]
        return {"action": "todo_add", "args": {"item": item}}
    return {"final": "answer: 12*12=" + transcript[0]["observation"]
            + "; speed_of_light=" + transcript[1]["observation"]}


class ToolRegistry:
    def __init__(self):
        # your code here
        raise NotImplementedError

    def register(self, name, fn, params):
        raise NotImplementedError

    def validate(self, name, args):
        raise NotImplementedError

    def dispatch(self, name, args):
        raise NotImplementedError


class AgentRunner:
    def __init__(self, policy, max_steps=8):
        # build a registry, register calc/kb_lookup/todo_add, init todos + transcript
        raise NotImplementedError

    def run(self, query):
        raise NotImplementedError`,
    hints: [
      String.raw`ToolRegistry.validate mirrors the day-1 dispatcher: compare ~set(required)~ against ~set(args)~ with two-way set difference; a nonempty missing/unexpected means ~"bad_args"~.`,
      String.raw`Only the ~fn(**args)~ call goes inside try/except in dispatch — validation failures are plain returns. Every path returns a string, so the loop never sees an exception.`,
      String.raw`Register ~todo_add~ as a bound method (or closure) that appends to ~self.todos~; that is how a tool mutates agent state. The run loop is the exact ReAct loop from day 1, now driving your registry.`,
    ],
    solution: String.raw`import re

KB = {
    "speed of light": "299792458",
    "pi": "3.14159",
    "python release": "1991",
}


def calc(expression):
    if not isinstance(expression, str) or not re.fullmatch(r"[0-9 +\-*/().]+", expression.strip()):
        raise ValueError("unsafe or empty expression")
    tokens = re.findall(r"\d+\.\d+|\d+|[+\-*/()]", expression)
    pos = 0

    def peek():
        return tokens[pos] if pos < len(tokens) else None

    def advance():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok

    def parse_expr():
        val = parse_term()
        while peek() in ("+", "-"):
            op = advance()
            rhs = parse_term()
            val = val + rhs if op == "+" else val - rhs
        return val

    def parse_term():
        val = parse_factor()
        while peek() in ("*", "/"):
            op = advance()
            rhs = parse_factor()
            val = val * rhs if op == "*" else val / rhs
        return val

    def parse_factor():
        tok = peek()
        if tok == "(":
            advance()
            val = parse_expr()
            advance()
            return val
        if tok == "-":
            advance()
            return -parse_factor()
        if tok == "+":
            advance()
            return parse_factor()
        return float(advance())

    value = parse_expr()
    return str(int(value)) if float(value).is_integer() else str(value)


def kb_lookup(key):
    return KB.get(key.lower().strip(), "NOT_FOUND")


def scripted_policy(query, transcript):
    n = len(transcript)
    if n == 0:
        return {"action": "calc", "args": {"expression": "12 * 12"}}
    if n == 1:
        return {"action": "kb_lookup", "args": {"key": "speed of light"}}
    if n == 2:
        item = "review " + transcript[0]["observation"] + " and " + transcript[1]["observation"]
        return {"action": "todo_add", "args": {"item": item}}
    return {"final": "answer: 12*12=" + transcript[0]["observation"]
            + "; speed_of_light=" + transcript[1]["observation"]}


class ToolRegistry:
    def __init__(self):
        self.tools = {}

    def register(self, name, fn, params):
        self.tools[name] = {"fn": fn, "params": list(params)}

    def validate(self, name, args):
        if name not in self.tools:
            return (False, "unknown_tool:" + name)
        required = set(self.tools[name]["params"])
        provided = set(args)
        missing = sorted(required - provided)
        unexpected = sorted(provided - required)
        if missing or unexpected:
            return (False, "bad_args missing=" + str(missing) + " unexpected=" + str(unexpected))
        return (True, None)

    def dispatch(self, name, args):
        ok, reason = self.validate(name, args)
        if not ok:
            return "ERROR: " + reason
        try:
            return str(self.tools[name]["fn"](**args))
        except Exception as e:
            return "ERROR: tool_error: " + str(e)


class AgentRunner:
    def __init__(self, policy, max_steps=8):
        self.policy = policy
        self.max_steps = max_steps
        self.todos = []
        self.transcript = []
        self.registry = ToolRegistry()
        self.registry.register("calc", calc, ["expression"])
        self.registry.register("kb_lookup", kb_lookup, ["key"])
        self.registry.register("todo_add", self._todo_add, ["item"])

    def _todo_add(self, item):
        self.todos.append(item)
        return "TODO_ADDED"

    def run(self, query):
        self.transcript = []
        for step in range(1, self.max_steps + 1):
            decision = self.policy(query, self.transcript)
            if "final" in decision:
                return decision["final"]
            name = decision["action"]
            args = decision.get("args", {})
            obs = self.registry.dispatch(name, args)
            self.transcript.append({"step": step, "action": name, "args": args, "observation": obs})
        return None`,
    tests: [
      { name: "end-to-end scenario returns the assembled answer", code: String.raw`r = AgentRunner(scripted_policy, max_steps=8)
ans = r.run("help me prep")
assert ans == "answer: 12*12=144; speed_of_light=299792458", ans` },
      { name: "transcript has 3 steps with the exact shape", code: String.raw`r = AgentRunner(scripted_policy, max_steps=8)
r.run("x")
assert len(r.transcript) == 3, len(r.transcript)
for i, e in enumerate(r.transcript):
    assert set(e) == {"step", "action", "args", "observation"}, set(e)
    assert e["step"] == i + 1, e
assert [e["action"] for e in r.transcript] == ["calc", "kb_lookup", "todo_add"], r.transcript` },
      { name: "observations are the real tool outputs", code: String.raw`r = AgentRunner(scripted_policy, max_steps=8)
r.run("x")
assert r.transcript[0]["observation"] == "144", r.transcript[0]
assert r.transcript[1]["observation"] == "299792458", r.transcript[1]
assert r.transcript[2]["observation"] == "TODO_ADDED", r.transcript[2]` },
      { name: "the todo tool mutated runner state", code: String.raw`r = AgentRunner(scripted_policy, max_steps=8)
r.run("x")
assert r.todos == ["review 144 and 299792458"], r.todos` },
      { name: "max_steps guard stops before the final", code: String.raw`r = AgentRunner(scripted_policy, max_steps=2)
ans = r.run("x")
assert ans is None, ans
assert len(r.transcript) == 2, len(r.transcript)` },
      { name: "unknown tool is recovered, not crashed", code: String.raw`def lost(query, transcript):
    if len(transcript) == 0:
        return {"action": "teleport", "args": {}}
    return {"final": "recovered"}
r = AgentRunner(lost, max_steps=5)
ans = r.run("x")
assert ans == "recovered", ans
assert r.transcript[0]["observation"].startswith("ERROR: unknown_tool"), r.transcript[0]` },
      { name: "bad args become an error observation, loop survives", code: String.raw`def wrong(query, transcript):
    if len(transcript) == 0:
        return {"action": "calc", "args": {"wrong": "2 + 2"}}
    return {"final": "ok"}
r = AgentRunner(wrong, max_steps=5)
ans = r.run("x")
assert ans == "ok", ans
assert r.transcript[0]["observation"].startswith("ERROR: bad_args"), r.transcript[0]` },
      { name: "registry dispatch runs a registered tool", code: String.raw`reg = ToolRegistry()
reg.register("calc", calc, ["expression"])
assert reg.dispatch("calc", {"expression": "2 + 3"}) == "5", reg.dispatch("calc", {"expression": "2 + 3"})` },
      { name: "registry rejects an unknown tool without raising", code: String.raw`reg = ToolRegistry()
out = reg.dispatch("nope", {})
assert out.startswith("ERROR: unknown_tool"), out` },
      { name: "a raising tool becomes a tool_error observation", code: String.raw`reg = ToolRegistry()
reg.register("calc", calc, ["expression"])
out = reg.dispatch("calc", {"expression": "import os"})
assert out.startswith("ERROR: tool_error"), out` },
    ],
  };

  W.exercises["w5-boss-t1"] = {
    title: "Boss T1 — Temperature + nucleus sampling",
    kind: "boss",
    difficulty: 3,
    xp: 40,
    minutes: 20,
    packages: ["numpy"],
    brief: "The real LLM decoder: temperature, stable softmax, top-p, renormalize, sample.",
    description: String.raw`Implement the decoding step an LLM actually runs each token.

~~~python
def temperature_nucleus_sample(logits, T, p, rng):
    ...
~~~

Pipeline, in order:

1. **Temperature**: divide ~logits~ by ~T~.
2. **Stable softmax**: subtract the max before exponentiating, then normalize to probabilities.
3. **Top-p (nucleus)**: sort probabilities descending, take the cumulative sum, and keep the smallest prefix whose cumulative mass is ~>= p~ — the token that crosses the threshold is **kept** (keep-boundary). Zero out the rest.
4. **Renormalize** the kept probabilities so they sum to 1.
5. **Sample** one index with ~rng.choice(n, p=renormalized)~ and return it as an ~int~.

~rng~ is a seeded ~numpy.random.Generator~, so results are reproducible.

Worked intuition:

~~~python
# probs sorted desc = [0.5, 0.3, 0.15, 0.05], p = 0.5
# cumulative = [0.5, ...]; 0.5 >= 0.5 at the first token -> nucleus is just the top token
# p = 0.75 -> 0.5 then 0.8 crosses -> keep the top two
~~~

The keep-boundary (~>=~, inclusive) is the classic detail: with ~p = 0.5~ and a top probability of exactly 0.5, the nucleus is a single token.

Interview angle: "implement top-p sampling" is a favorite LLM-engineer task. The stable softmax and the inclusive boundary are what graders probe.`,
    starter: String.raw`import numpy as np


def temperature_nucleus_sample(logits, T, p, rng):
    """Temperature -> stable softmax -> top-p keep-boundary -> renormalize -> sample an int index."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`Stable softmax: ~scaled = logits / T~; subtract ~scaled.max()~ before ~np.exp~, then divide by the sum.`,
      String.raw`Sort with ~order = np.argsort(probs)[::-1]~; ~np.searchsorted(np.cumsum(probs[order]), p)~ gives the boundary index — keep ~order[:boundary + 1]~ so the crossing token is included.`,
      String.raw`Build a mask of zeros, copy the kept probabilities in, divide by their sum, then ~int(rng.choice(len(probs), p=mask))~.`,
    ],
    solution: String.raw`import numpy as np


def temperature_nucleus_sample(logits, T, p, rng):
    logits = np.asarray(logits, dtype=float)
    scaled = logits / T
    scaled = scaled - scaled.max()
    exp = np.exp(scaled)
    probs = exp / exp.sum()
    order = np.argsort(probs)[::-1]
    cum = np.cumsum(probs[order])
    cutoff = int(np.searchsorted(cum, p, side="left"))
    keep = order[:cutoff + 1]
    mask = np.zeros_like(probs)
    mask[keep] = probs[keep]
    mask = mask / mask.sum()
    return int(rng.choice(len(probs), p=mask))`,
    tests: [
      { name: "keep-boundary is inclusive at exactly p", code: String.raw`import numpy as np
logits = np.log(np.array([0.5, 0.3, 0.15, 0.05]))
rng = np.random.default_rng(0)
draws = [temperature_nucleus_sample(logits, 1.0, 0.5, rng) for _ in range(200)]
assert set(draws) == {0}, set(draws)` },
      { name: "p=0.75 keeps exactly the top two tokens", code: String.raw`import numpy as np
logits = np.log(np.array([0.5, 0.3, 0.15, 0.05]))
rng = np.random.default_rng(0)
draws = [temperature_nucleus_sample(logits, 1.0, 0.75, rng) for _ in range(400)]
assert set(draws) == {0, 1}, set(draws)` },
      { name: "low temperature collapses onto the argmax", code: String.raw`import numpy as np
logits = np.array([1.0, 2.0, 3.0, 0.5])
rng = np.random.default_rng(1)
draws = [temperature_nucleus_sample(logits, 0.01, 0.9, rng) for _ in range(50)]
assert set(draws) == {2}, set(draws)` },
      { name: "seeded sampling is deterministic", code: String.raw`import numpy as np
logits = np.log(np.array([0.4, 0.3, 0.2, 0.1]))
a = temperature_nucleus_sample(logits, 1.0, 0.9, np.random.default_rng(7))
b = temperature_nucleus_sample(logits, 1.0, 0.9, np.random.default_rng(7))
assert a == b, (a, b)` },
      { name: "returns a valid int index", code: String.raw`import numpy as np
logits = np.array([0.2, 0.9, 0.1])
idx = temperature_nucleus_sample(logits, 1.0, 1.0, np.random.default_rng(3))
assert isinstance(idx, int) and 0 <= idx < 3, idx` },
    ],
  };

  W.exercises["w5-boss-t2"] = {
    title: "Boss T2 — Retrieval metrics",
    kind: "boss",
    difficulty: 2,
    xp: 40,
    minutes: 20,
    packages: [],
    brief: "Score a retriever: recall@5 and MRR, averaged over queries.",
    description: String.raw`Evaluate a retrieval system the way RAG teams actually do — with recall@5 and Mean Reciprocal Rank.

~~~python
def evaluate_retrieval(queries):
    ...
~~~

- ~queries~ is a list of dicts, each with ~"relevant"~ (a set of relevant doc ids) and ~"retrieved"~ (a ranked list of doc ids, best first).
- **recall@5** for one query = (number of relevant docs found in the first 5 retrieved) / (total relevant). If a query has no relevant docs, its recall is ~0.0~.
- **reciprocal rank** for one query = ~1 / rank~ of the first relevant doc in the retrieved list (rank is 1-based); ~0.0~ if none of the retrieved docs are relevant.
- Return ~{"recall_at_5": ..., "mrr": ...}~, each **averaged over all queries**. An empty ~queries~ list returns both as ~0.0~.

Worked example:

~~~python
q = {"relevant": {"a", "b", "c"}, "retrieved": ["x", "a", "y", "b", "z", "c"]}
# top-5 = [x, a, y, b, z] -> found {a, b} -> recall 2/3
# first relevant is "a" at rank 2 -> reciprocal rank 1/2
evaluate_retrieval([q])   # {"recall_at_5": 0.666..., "mrr": 0.5}
~~~

Interview angle: recall@k and MRR are the bread-and-butter retrieval metrics. The subtlety is the 1-based rank for MRR and the top-5 cutoff for recall.`,
    starter: String.raw`def evaluate_retrieval(queries):
    """Return {"recall_at_5", "mrr"} averaged over queries."""
    # your code here
    raise NotImplementedError`,
    hints: [
      String.raw`For recall, intersect the relevant set with the first 5 retrieved: ~len(relevant & set(retrieved[:5])) / len(relevant)~, guarding the empty-relevant case.`,
      String.raw`For reciprocal rank, walk ~retrieved~ with ~enumerate~; on the first id in the relevant set, use ~1 / (i + 1)~ and stop. If the loop finishes with no hit, it stays 0.`,
      String.raw`Accumulate both across queries and divide by ~len(queries)~ at the end; return early with zeros for an empty list.`,
    ],
    solution: String.raw`def evaluate_retrieval(queries):
    if not queries:
        return {"recall_at_5": 0.0, "mrr": 0.0}
    rec_sum = 0.0
    mrr_sum = 0.0
    for q in queries:
        rel = set(q["relevant"])
        ret = list(q["retrieved"])
        found = len(rel & set(ret[:5]))
        rec_sum += found / len(rel) if rel else 0.0
        rr = 0.0
        for i, d in enumerate(ret):
            if d in rel:
                rr = 1.0 / (i + 1)
                break
        mrr_sum += rr
    n = len(queries)
    return {"recall_at_5": rec_sum / n, "mrr": mrr_sum / n}`,
    tests: [
      { name: "single query recall and mrr", code: String.raw`import math
q = {"relevant": {"a", "b", "c"}, "retrieved": ["x", "a", "y", "b", "z", "c"]}
out = evaluate_retrieval([q])
assert math.isclose(out["recall_at_5"], 2 / 3), out
assert math.isclose(out["mrr"], 0.5), out` },
      { name: "first hit at rank 1 gives mrr 1.0", code: String.raw`import math
q = {"relevant": {"a"}, "retrieved": ["a", "b", "c"]}
out = evaluate_retrieval([q])
assert math.isclose(out["mrr"], 1.0), out
assert math.isclose(out["recall_at_5"], 1.0), out` },
      { name: "nothing relevant retrieved gives zeros", code: String.raw`q = {"relevant": {"z"}, "retrieved": ["a", "b", "c", "d", "e", "f"]}
out = evaluate_retrieval([q])
assert out["mrr"] == 0.0 and out["recall_at_5"] == 0.0, out` },
      { name: "a relevant doc past rank 5 does not count for recall", code: String.raw`import math
q = {"relevant": {"g"}, "retrieved": ["a", "b", "c", "d", "e", "g"]}
out = evaluate_retrieval([q])
assert out["recall_at_5"] == 0.0, out
assert math.isclose(out["mrr"], 1 / 6), out` },
      { name: "metrics average across queries", code: String.raw`import math
q1 = {"relevant": {"a"}, "retrieved": ["a", "b"]}
q2 = {"relevant": {"z"}, "retrieved": ["a", "b"]}
out = evaluate_retrieval([q1, q2])
assert math.isclose(out["recall_at_5"], 0.5), out
assert math.isclose(out["mrr"], 0.5), out` },
      { name: "empty query list is safe", code: String.raw`out = evaluate_retrieval([])
assert out == {"recall_at_5": 0.0, "mrr": 0.0}, out` },
    ],
  };

  W.boss = {
    id: "w5-boss",
    title: "T6 — The Interview Gauntlet",
    timeLimitMin: 45,
    passPct: 70,
    intro: String.raw`The final boss. Sixteen questions drawn from all five weeks — python, classic ML, transformers, LLMs, RAG, and agents/production — then two from-scratch tasks: the real LLM decoder and the retrieval metrics every RAG team lives on. Clear 70% and you close out ML Quest interview-ready.`,
    quiz: [
      {
        q: String.raw`What does this print?

~~~python
nums = [1, 2, 3, 4]
squares = [n * n for n in nums if n % 2 == 0]
print(squares)
~~~`,
        options: [
          "[1, 4, 9, 16]",
          "[1, 9]",
          "[4, 16]",
          "[2, 4]",
        ],
        answer: 2,
        explain: String.raw`The comprehension keeps only even ~n~ (2 and 4) and squares them, giving [4, 16]. The filter clause runs before the mapping, so odd numbers never reach ~n * n~.`,
      },
      {
        q: String.raw`What does this print?

~~~python
counts = {"a": 1}
counts["b"] = counts.get("b", 0) + 1
counts["a"] = counts.get("a", 0) + 1
print(counts)
~~~`,
        options: [
          "{'a': 2, 'b': 1}",
          "{'a': 1, 'b': 1}",
          "{'a': 2, 'b': 2}",
          "KeyError: 'b'",
        ],
        answer: 0,
        explain: String.raw`~dict.get(key, default)~ returns the default when the key is absent instead of raising. So ~b~ starts from 0 and becomes 1, while ~a~ goes from 1 to 2. This get-with-default idiom is the manual version of ~collections.Counter~.`,
      },
      {
        q: String.raw`Which statement about Python types is correct?`,
        options: [
          "Tuples are mutable; lists are not",
          "Strings can be modified in place with item assignment",
          "A set preserves insertion order and allows duplicates",
          "Tuples and strings are immutable; lists, dicts, and sets are mutable",
        ],
        answer: 3,
        explain: String.raw`Tuples and strings cannot be changed after creation (immutable), which is why they can be dict keys and set members. Lists, dicts, and sets are mutable. Sets are unordered and de-duplicate, so the other options are each false.`,
      },
      {
        q: String.raw`A model reaches 0.99 training accuracy but 0.70 validation accuracy, and the gap is widening. What is happening and the fix?`,
        options: [
          "Underfitting; use a bigger model",
          "Overfitting; add regularization, get more data, or use early stopping",
          "The data is clean; nothing to do",
          "The learning rate is too low; raise it",
        ],
        answer: 1,
        explain: String.raw`A large, growing gap between training and validation performance is the definition of overfitting — the model memorizes training noise. Remedies reduce variance: regularization, more or augmented data, simpler models, or early stopping. A bigger model would make it worse.`,
      },
      {
        q: String.raw`What does this print?

~~~python
tp, fp, fn = 8, 2, 4
precision = tp / (tp + fp)
recall = tp / (tp + fn)
print(round(precision, 2), round(recall, 2))
~~~`,
        options: [
          "0.8 0.8",
          "0.67 0.8",
          "0.8 0.67",
          "0.5 0.5",
        ],
        answer: 2,
        explain: String.raw`Precision = 8 / (8 + 2) = 0.8; recall = 8 / (8 + 4) = 0.667, which rounds to 0.67. Precision asks "of what I flagged, how much was right"; recall asks "of what was truly positive, how much did I catch".`,
      },
      {
        q: String.raw`Why does a random forest usually generalize better than a single deep decision tree?`,
        options: [
          "Averaging many de-correlated trees (bagging plus feature subsampling) cuts variance without much added bias",
          "A forest has far fewer parameters than one tree",
          "Forests are mathematically incapable of overfitting",
          "A single tree cannot handle numeric features",
        ],
        answer: 0,
        explain: String.raw`A deep tree is low-bias but high-variance. Bagging trains many trees on bootstrap samples with random feature subsets, so their errors de-correlate and averaging them shrinks variance. That variance reduction is why the ensemble beats one tree.`,
      },
      {
        q: String.raw`What problem does subword tokenization (BPE) solve compared with word-level tokens?`,
        options: [
          "It makes every word exactly one token",
          "It removes the need for an embedding layer",
          "It guarantees a fixed sentence length",
          "It handles rare and unseen words by splitting them into known subword units, while keeping the vocabulary bounded",
        ],
        answer: 3,
        explain: String.raw`Word-level vocabularies explode and still miss out-of-vocabulary words. BPE merges frequent character pairs into subwords, so any word decomposes into known pieces and the vocab stays a fixed, manageable size. That is why every modern LLM tokenizer is subword-based.`,
      },
      {
        q: String.raw`How do the time and memory costs of self-attention scale with sequence length n?`,
        options: [
          "O(n) — linear in sequence length",
          "O(n^2) — every token attends to every other token",
          "O(log n) — logarithmic",
          "O(1) — independent of length",
        ],
        answer: 1,
        explain: String.raw`Attention computes a score between every pair of tokens, so the score matrix is n by n — quadratic in both compute and memory. That quadratic cost is exactly what long-context tricks (sparse, sliding-window, or linear attention) try to escape.`,
      },
      {
        q: String.raw`What does this print?

~~~python
import math
logits = [2.0, 1.0, 0.0]
m = max(logits)
exps = [math.exp(x - m) for x in logits]
Z = sum(exps)
probs = [round(e / Z, 3) for e in exps]
print(probs[0] > probs[1] > probs[2], round(sum(probs), 3))
~~~`,
        options: [
          "False 1.0",
          "True 0.0",
          "True 1.0",
          "False 0.9",
        ],
        answer: 2,
        explain: String.raw`Softmax is monotonic, so a larger logit gives a larger probability: probs are strictly decreasing (True), and any softmax output sums to 1.0. Subtracting the max ~m~ before exponentiating is the numerical-stability trick that prevents overflow without changing the result.`,
      },
      {
        q: String.raw`What is the KV cache used for during transformer inference?`,
        options: [
          "It stores past keys and values so each new token's attention does not recompute them, making decode far faster",
          "It caches the model weights on disk between runs",
          "It stores user prompts for later analytics",
          "It compresses the vocabulary to save memory",
        ],
        answer: 0,
        explain: String.raw`Autoregressive decoding attends to all previous tokens each step. Caching their keys and values means you only compute K and V for the new token, turning what would be repeated work into an append — the single biggest decode-time speedup, at the cost of memory that grows with sequence length.`,
      },
      {
        q: String.raw`What does LoRA (Low-Rank Adaptation) do?`,
        options: [
          "It quantizes all weights to 4-bit precision",
          "It trains the entire model from scratch on your data",
          "It permanently prunes attention heads to shrink the model",
          "It freezes the base weights and trains small low-rank update matrices, drastically cutting trainable parameters and memory",
        ],
        answer: 3,
        explain: String.raw`LoRA leaves the pretrained weights frozen and learns a small low-rank delta per targeted layer, so you fine-tune a few million parameters instead of billions. That makes adaptation cheap and the adapters swappable. It is orthogonal to quantization and does not prune anything.`,
      },
      {
        q: String.raw`Quantizing a model from fp16 to int8 primarily trades what for what?`,
        options: [
          "More accuracy in exchange for slower inference",
          "A small accuracy drop in exchange for lower memory and faster inference",
          "Nothing — it is strictly better on every axis",
          "Longer context in exchange for shorter outputs",
        ],
        answer: 1,
        explain: String.raw`Lower-precision weights and activations use less memory and move faster through the hardware, usually with only a minor accuracy hit if done carefully (calibration, per-channel scales). The tradeoff — a little quality for big efficiency wins — is why quantization is standard in production serving.`,
      },
      {
        q: String.raw`In a RAG pipeline, why split documents into chunks before embedding them?`,
        options: [
          "To deliberately increase the number of API calls",
          "Because embedding models can only process single words",
          "So retrieval returns focused, relevant passages that fit the context window, instead of whole documents that dilute relevance",
          "Chunking is unnecessary and always hurts quality",
        ],
        answer: 2,
        explain: String.raw`A whole document embeds to one averaged vector that blurs distinct topics and may not fit the prompt. Chunking gives each passage its own vector, so retrieval can surface the exact relevant span and pack several into the context. Chunk size is a real tradeoff — too small loses context, too big dilutes it.`,
      },
      {
        q: String.raw`A user searches with different words than the documents use (synonyms). Which retrieval approach handles this best?`,
        options: [
          "Dense embedding (semantic) retrieval, which matches meaning rather than exact terms — often combined with BM25 in a hybrid",
          "Exact keyword (BM25) matching only, because it is faster",
          "A SQL LIKE query on the raw text",
          "A regular expression over the documents",
        ],
        answer: 0,
        explain: String.raw`Lexical methods like BM25 miss synonyms because they match surface terms. Dense retrieval embeds query and documents into a shared semantic space, so "car" retrieves "automobile". In practice a hybrid of dense plus BM25 wins, combining semantic recall with exact-term precision.`,
      },
      {
        q: String.raw`Which task is the WRONG fit for an autonomous agent loop?`,
        options: [
          "A research task needing a variable number of lookups depending on what it finds",
          "A workflow where the next tool depends on previous results",
          "A task that must dynamically recover from tool errors",
          "Extracting three fixed fields from each document and calling one API — a fixed pipeline is cheaper and more reliable",
        ],
        answer: 3,
        explain: String.raw`Agents earn their cost only when the number and order of steps depend on intermediate results. A fixed extract-then-call task has a known plan, so a deterministic pipeline is cheaper, faster, and easier to test. Reaching for an agent there is the classic over-engineering red flag.`,
      },
      {
        q: String.raw`Your agent can issue refunds. What is the right production guardrail for that capability?`,
        options: [
          "Raise the temperature so it is more creative about when to refund",
          "Require human approval above a threshold, plus a max-step budget and output validation",
          "Remove all logging to reduce overhead",
          "Give it an unrestricted shell tool for maximum flexibility",
        ],
        answer: 1,
        explain: String.raw`Refunds are irreversible, so gate them: human-in-the-loop approval above a value threshold, a step budget to bound runaway loops, and schema validation on the tool call before it executes. Temperature, less logging, and a shell tool make safety worse, not better.`,
      },
    ],
    tasks: ["w5-boss-t1", "w5-boss-t2"],
  };
})();
