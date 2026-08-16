#!/usr/bin/env python3
"""Run every exercise's solution against its tests; syntax-check starters.

Usage:  node tools/extract.js data/week2.js /tmp/w2.json
        python3 tools/check_solutions.py /tmp/w2.json [-v]

Mirrors the in-app Pyodide harness: solution exec'd into a namespace, then each
test runs in a shallow copy of that namespace. asyncMode uses top-level-await
compilation. Exit code 1 if anything fails.
"""
import ast
import asyncio
import contextlib
import io
import json
import signal
import sys
import traceback

TLA = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
TIMEOUT_SEC = 15


class Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise Timeout(f"exceeded {TIMEOUT_SEC}s (infinite loop?)")


def run_src(src, name, ns, async_mode):
    code = compile(src, name, "exec", flags=TLA if async_mode else 0, dont_inherit=True)
    result = eval(code, ns)
    if asyncio.iscoroutine(result):
        asyncio.run(result)


def check_exercise(ex_id, ex, available):
    pkgs = ex.get("packages") or []
    missing = [p for p in pkgs if p not in available]
    if missing:
        return ("SKIP", f"needs {','.join(missing)} (not installed locally)")
    async_mode = bool(ex.get("asyncMode"))
    # starter must at least compile
    try:
        compile(ex["starter"], f"{ex_id}/starter.py", "exec", flags=TLA if async_mode else 0)
    except SyntaxError as e:
        return ("FAIL", f"starter has a syntax error: {e}")
    ns = {"__name__": "__main__"}
    sink = io.StringIO()
    signal.signal(signal.SIGALRM, _alarm)
    signal.setitimer(signal.ITIMER_REAL, TIMEOUT_SEC)
    try:
        with contextlib.redirect_stdout(sink):
            try:
                run_src(ex["solution"], f"{ex_id}/solution.py", ns, async_mode)
            except Exception:
                return ("FAIL", "solution crashed:\n" + traceback.format_exc(limit=3))
            failures = []
            for t in ex["tests"]:
                tns = dict(ns)
                try:
                    run_src(t["code"], f"{ex_id}/test.py", tns, async_mode)
                except AssertionError as e:
                    failures.append(f'test "{t["name"]}": AssertionError: {e}')
                except Exception as e:
                    failures.append(f'test "{t["name"]}": {type(e).__name__}: {e}')
            if failures:
                return ("FAIL", "\n    ".join(failures))
    except Timeout as e:
        return ("FAIL", str(e))
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
    return ("PASS", f"{len(ex['tests'])} tests")


def main():
    verbose = "-v" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if not args:
        print(__doc__)
        sys.exit(2)
    data = json.load(open(args[0]))
    available = set()
    for pkg in ("numpy", "pandas"):
        try:
            __import__(pkg)
            available.add(pkg)
        except ImportError:
            pass
    if available != {"numpy", "pandas"}:
        print(f"note: locally available packages: {sorted(available) or 'none'}")

    npass = nfail = nskip = 0
    for week in data.get("weeks", []):
        for ex_id, ex in sorted((week.get("exercises") or {}).items()):
            status, detail = check_exercise(ex_id, ex, available)
            if status == "PASS":
                npass += 1
                if verbose:
                    print(f"  PASS {ex_id} ({detail})")
            elif status == "SKIP":
                nskip += 1
                print(f"  SKIP {ex_id}: {detail}")
            else:
                nfail += 1
                print(f"  FAIL {ex_id}:\n    {detail}")
    print(f"\n{npass} pass, {nfail} fail, {nskip} skip")
    sys.exit(1 if nfail else 0)


if __name__ == "__main__":
    main()
