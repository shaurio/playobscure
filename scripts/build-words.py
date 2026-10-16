
import json
from pathlib import Path
from wordfreq import top_n_list, zipf_frequency

OUTPUT = Path("data/english-words.json")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

# Retrieve the 100,000 highest-frequency candidates.
# We retain the first 100,000 alphabetic words.
candidates = top_n_list("en", 250000)

words = []
seen = set()

for word in candidates:
    word = word.lower().strip()

    if not word.isascii() or not word.isalpha():
        continue

    if len(word) < 3 or len(word) > 24:
        continue

    if word in seen:
        continue

    seen.add(word)

    zipf = zipf_frequency(word, "en")

    # Preliminary score: 7.0 Zipf = familiar,
    # 2.0 Zipf = highly unusual.
    obscurity = round(
        max(1, min(99, 1 + (7.0 - zipf) * 19.6))
    )

    words.append({
        "word": word,
        "length": len(word),
        "first": word[0],
        "last": word[-1],
        "frequency": zipf,
        "obscurity": obscurity,
        "tier": min(5, (obscurity - 1) // 20 + 1),
    })

    if len(words) >= 100000:
        break

OUTPUT.write_text(
    json.dumps(words, ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8",
)

print(f"Generated {len(words):,} candidate words")
print(f"Saved to {OUTPUT}")

for word in ["apple", "octopus", "serendipity", "susurration"]:
    match = next(
        (item for item in words if item["word"] == word),
        None
    )
    print(f"{word}: {match or 'not in selected dataset'}")
