"""Quick dependency-free smoke test for prompt-relative rarity (run from repo root)."""

import json
from pathlib import Path

words = {entry["word"]: entry for entry in json.loads(Path("data/english-words.json").read_text())}
prompts = json.loads(Path("data/word-prompt-pool-v1.json").read_text())
bounds = json.loads(Path("data/word-rarity-bounds-v1.json").read_text())["distributions"]


def key(rule):
    return "|".join(str(rule.get(field, "")) for field in ("startsWith", "endsWith", "contains", "length"))


def matches(entry, rule):
    word = entry["word"]
    return (
        (not rule.get("startsWith") or word.startswith(rule["startsWith"]))
        and (not rule.get("endsWith") or word.endswith(rule["endsWith"]))
        and (not rule.get("contains") or rule["contains"] in word)
        and ("length" not in rule or len(word) == rule["length"])
    )


def score(word, rule):
    entry = words[word]
    assert matches(entry, rule), f"{word} does not match {rule}"
    known = bounds.get(key(rule))
    if known is None:
        positive = sorted(e["frequency"] for e in words.values() if matches(e, rule) and e["frequency"] > 0)
        assert len(positive) >= 2

        def percentile(portion):
            ix = (len(positive)-1)*portion
            first = int(ix)
            weight = ix-first
            return positive[first]*(1-weight)+positive[min(first+1,len(positive)-1)]*weight

        known = {"lower": percentile(0.05), "upper": percentile(0.95)}

    if entry["frequency"] <= 0:
        return entry["obscurity"]
    return round(max(1, min(100, 1+99*(known["upper"]-entry["frequency"])/(known["upper"]-known["lower"]))))


# Every existing live prompt has a precomputed distribution.
assert all(key(p) in bounds for p in prompts)
assert all(0 < v["lower"] < v["upper"] and v["knownCount"] <= v["eligibleCount"] for v in bounds.values())

start_end = {"startsWith": "a", "endsWith": "y"}
assert score("anarchy", start_end) == 23
assert score("abbacy", start_end) == 93

start_contains = {"startsWith": "a", "contains": "y"}
assert score("anarchy", start_contains) == 21
assert score("abbacy", start_contains) == 93

five_a = {"startsWith": "a", "length": 5}
assert score("apple", five_a) == 2
assert score("abide", five_a) == 34
assert score("aalii", five_a) == 85  # Missing frequency stays provisional, never 100

print(f"PASS: {len(prompts)} prompts covered; relative score examples and zero-frequency rule verified.")
