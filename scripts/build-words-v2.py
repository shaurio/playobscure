
import json
import re
from collections import Counter
from pathlib import Path

from wordfreq import zipf_frequency

ESDB = Path("data/esdb-words.txt")
OLD = Path("data/english-words.json")
OUTPUT = Path("data/english-words-v2.json")

VALID = re.compile(r"[a-z]{3,24}")

# Individually reviewed words absent from ESDB.
# We can expand this list cautiously over time.
SUPPLEMENTAL = {
    "petrichor",
}

if not ESDB.exists():
    raise SystemExit("Missing data/esdb-words.txt")

old_words = json.loads(OLD.read_text(encoding="utf-8"))
old_index = {item["word"]: item for item in old_words}

# The ESDB export preserves case. Lowercase entries
# help us exclude many proper names and abbreviations.
vocabulary = set()

for line in ESDB.read_text(encoding="utf-8").splitlines():
    word = line.strip()

    if VALID.fullmatch(word):
        vocabulary.add(word)

vocabulary.update(SUPPLEMENTAL)

def estimate_obscurity(frequency):
    if frequency <= 0:
        # The dictionary recognizes the word, but
        # wordfreq cannot measure its frequency.
        # Award a provisional value, not an automatic 99.
        return 85, "frequency-unavailable"

    # Experimental scale:
    # Zipf 5.5 or higher -> very common
    # Zipf 1.5 or lower  -> exceptionally uncommon
    raw = 5 + (5.5 - frequency) * 23

    rarity = round(max(5, min(98, raw)))
    return rarity, "wordfreq-v2"

entries = []
methods = Counter()

for word in sorted(vocabulary):
    # Reuse existing frequency measurements where possible.
    old = old_index.get(word)

    if old is not None:
        frequency = float(old["frequency"])
    else:
        frequency = zipf_frequency(word, "en")

    rarity, method = estimate_obscurity(frequency)

    entry = {
        "word": word,
        "length": len(word),
        "first": word[0],
        "last": word[-1],
        "frequency": frequency,
        "obscurity": rarity,
        "tier": min(5, (rarity - 1) // 20 + 1),
        "source": (
            "supplemental"
            if word in SUPPLEMENTAL
            else "esdb"
        ),
        "scoreMethod": method,
    }

    entries.append(entry)
    methods[method] += 1

OUTPUT.write_text(
    json.dumps(
        entries,
        ensure_ascii=False,
        separators=(",", ":"),
    ),
    encoding="utf-8",
)

index = {entry["word"]: entry for entry in entries}

print(f"Original words: {len(old_words):,}")
print(f"New vocabulary: {len(entries):,}")
print(f"Saved: {OUTPUT}")
print(f"File size: {OUTPUT.stat().st_size / 1024 / 1024:.2f} MB")

print("\nScoring methods:")
for method, count in methods.items():
    print(f"  {method}: {count:,}")

print("\nExample words:")
for word in [
    "apple",
    "octopus",
    "serendipity",
    "susurration",
    "sesquipedalian",
    "defenestration",
    "petrichor",
    "janice",
    "nigeria",
]:
    result = index.get(word)

    if result:
        print(
            f"  {word:25} "
            f"rarity={result['obscurity']:3} "
            f"zipf={result['frequency']:4.2f} "
            f"method={result['scoreMethod']}"
        )
    else:
        print(f"  {word:25} excluded")
