"""Precompute frequency boundaries for the frozen word-prompt pool.

Run from the project root:
    python3 scripts/build-relative-rarity.py

Words with frequency=0 have *unavailable* wordfreq data; they are deliberately
excluded from percentile boundaries and retain their existing provisional score.
"""

import json
from collections import defaultdict
from pathlib import Path

WORDS = Path("data/english-words.json")
PROMPTS = Path("data/word-prompt-pool-v1.json")
OUTPUT = Path("data/word-rarity-bounds-v1.json")

LOW_PERCENTILE = 0.05
HIGH_PERCENTILE = 0.95


def key(constraints):
    return "|".join(str(constraints.get(field, "")) for field in (
        "startsWith", "endsWith", "contains", "length"
    ))


def quantile(sorted_values, portion):
    """Linear interpolation, matching the runtime calculation."""
    offset = (len(sorted_values) - 1) * portion
    before = int(offset)
    after = min(before + 1, len(sorted_values) - 1)
    fraction = offset - before
    return sorted_values[before] * (1 - fraction) + sorted_values[after] * fraction


def matches(entry, constraints):
    return (
        (not constraints.get("startsWith") or entry["first"] == constraints["startsWith"])
        and (not constraints.get("endsWith") or entry["last"] == constraints["endsWith"])
        and (not constraints.get("contains") or constraints["contains"] in entry["word"])
        and ("length" not in constraints or entry["length"] == constraints["length"])
    )


def main():
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    prompts = json.loads(PROMPTS.read_text(encoding="utf-8"))

    # These are the starter prompts shown if the prompt service is unavailable.
    # They currently overlap the frozen pool, but are included explicitly.
    fallback = [
        {"startsWith": "a", "length": 5},
        {"contains": "x"},
        {"length": 7},
        {"startsWith": "q"},
        {"contains": "z", "length": 6},
    ]

    constraints_by_key = {}
    for prompt in [*prompts, *fallback]:
        constraints = {field: prompt[field] for field in (
            "startsWith", "endsWith", "contains", "length"
        ) if field in prompt}
        constraints_by_key[key(constraints)] = constraints

    # The smallest applicable index reduces work for combined constraints.
    first_index = defaultdict(list)
    last_index = defaultdict(list)
    length_index = defaultdict(list)
    contains_index = defaultdict(list)

    for entry in words:
        first_index[entry["first"]].append(entry)
        last_index[entry["last"]].append(entry)
        length_index[entry["length"]].append(entry)
        for letter in set(entry["word"]):
            contains_index[letter].append(entry)

    distributions = {}
    for item_key, constraints in sorted(constraints_by_key.items()):
        pools = []
        if "startsWith" in constraints:
            pools.append(first_index[constraints["startsWith"]])
        if "endsWith" in constraints:
            pools.append(last_index[constraints["endsWith"]])
        if "length" in constraints:
            pools.append(length_index[constraints["length"]])
        if "contains" in constraints:
            pools.append(contains_index[constraints["contains"]])

        candidates = min(pools, key=len) if pools else words
        eligible = [entry for entry in candidates if matches(entry, constraints)]
        frequencies = sorted(float(entry["frequency"]) for entry in eligible if entry["frequency"] > 0)

        # If there is no measurable range, the server falls back to the old score.
        if len(frequencies) < 2:
            continue

        lower = quantile(frequencies, LOW_PERCENTILE)
        upper = quantile(frequencies, HIGH_PERCENTILE)
        if upper <= lower:
            continue

        distributions[item_key] = {
            "lower": round(lower, 6),
            "upper": round(upper, 6),
            "knownCount": len(frequencies),
            "eligibleCount": len(eligible),
        }

    output = {
        "version": 1,
        "lowPercentile": LOW_PERCENTILE,
        "highPercentile": HIGH_PERCENTILE,
        "distributions": distributions,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Generated {len(distributions)} rarity distributions for {len(constraints_by_key)} prompt sets")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")

    for word, criteria in (
        ("anarchy", {"startsWith": "a", "contains": "y"}),
        ("abbacy", {"startsWith": "a", "contains": "y"}),
        ("apple", {"startsWith": "a", "length": 5}),
    ):
        entry = next((item for item in words if item["word"] == word), None)
        bounds = distributions.get(key(criteria))
        if entry and bounds and entry["frequency"] > 0:
            score = round(max(1, min(100, 1 + 99 * (bounds["upper"] - entry["frequency"]) / (bounds["upper"] - bounds["lower"]))))
            print(f"  {word}: old={entry['obscurity']}, new={score} (Zipf {entry['frequency']})")


if __name__ == "__main__":
    main()
