
import json
import re
from pathlib import Path

from wordfreq import zipf_frequency

CURRENT = Path("data/english-words.json")
ESDB = Path("data/esdb-words.txt")
PREVIEW = Path("data/english-words-preview.json")

# The game's current input supports 3–24 letters.
VALID_WORD = re.compile(r"[a-z]{3,24}")

if not CURRENT.exists() or not ESDB.exists():
    raise SystemExit("Missing current dictionary or ESDB export.")

existing = {
    item["word"]: item
    for item in json.loads(CURRENT.read_text(encoding="utf-8"))
}

# Use original capitalization to filter out many proper names.
dictionary = set()

for line in ESDB.read_text(encoding="utf-8").splitlines():
    word = line.strip()

    if not VALID_WORD.fullmatch(word):
        continue

    dictionary.add(word)

print(f"Existing wordfreq entries: {len(existing):,}")
print(f"Filtered ESDB entries: {len(dictionary):,}")

merged = []

for word in sorted(dictionary):
    if word in existing:
        # Preserve existing scores during this preview.
        entry = dict(existing[word])
        entry["source"] = "wordfreq+esdb"
    else:
        frequency = zipf_frequency(word, "en")

        if frequency <= 0:
            # No reliable frequency estimate.
            # Do not automatically award 99 points.
            rarity = 90
            method = "frequency-unavailable"
        else:
            # Keep the current experimental scale for now.
            rarity = round(
                max(1, min(99, 1 + (7 - frequency) * 19.6))
            )
            method = "wordfreq-estimate"

        entry = {
            "word": word,
            "length": len(word),
            "first": word[0],
            "last": word[-1],
            "frequency": frequency,
            "obscurity": rarity,
            "tier": min(5, (rarity - 1) // 20 + 1),
            "source": "esdb",
            "scoreMethod": method,
        }

    merged.append(entry)

PREVIEW.write_text(
    json.dumps(merged, ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8",
)

index = {entry["word"]: entry for entry in merged}

print(f"\nMerged vocabulary: {len(merged):,} words")
print(f"Saved preview: {PREVIEW}")

print("\nSample words:")
for word in [
    "apple",
    "serendipity",
    "susurration",
    "sesquipedalian",
    "defenestration",
    "petrichor",
    "janice",
    "nigeria",
]:
    entry = index.get(word)

    if entry:
        print(
            f"{word:22} "
            f"rarity={entry['obscurity']:2} "
            f"frequency={entry['frequency']}"
        )
    else:
        print(f"{word:22} not included")
