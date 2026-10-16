
import json
from collections import Counter
from pathlib import Path

SOURCE = Path("data/english-words.json")
OUTPUT = Path("data/word-prompt-pool-v1.json")

words = json.loads(SOURCE.read_text(encoding="utf-8"))

# Count relevant word properties in one pass.
by_length = Counter()
by_first = Counter()
by_contains = Counter()
by_length_first = Counter()
by_length_contains = Counter()
by_first_contains = Counter()

for entry in words:
    word = entry["word"]
    length = len(word)
    first = word[0]

    by_length[length] += 1
    by_first[first] += 1
    by_length_first[(length, first)] += 1

    # Each letter is counted once per word.
    for letter in set(word):
        by_contains[letter] += 1
        by_length_contains[(length, letter)] += 1
        by_first_contains[(first, letter)] += 1

prompts = []


def add(family, title, constraints, eligible_count):
    # Same IDs and template order as our original
    # TypeScript prompt generator.
    identifier = "-".join([
        family,
        str(constraints.get("startsWith", "")),
        str(constraints.get("contains", "")),
        str(constraints.get("length", "")),
    ])

    if not 40 <= eligible_count <= 12000:
        return

    prompts.append({
        "id": identifier,
        "title": title,
        "family": family,
        **constraints,
        "eligibleCount": eligible_count,
    })


alphabet = "abcdefghijklmnopqrstuvwxyz"

for length in range(4, 13):
    add(
        "length",
        f"Name a {length}-letter English word",
        {"length": length},
        by_length[length],
    )

for letter in alphabet:
    add(
        "starts",
        f"Name a word beginning with {letter.upper()}",
        {"startsWith": letter},
        by_first[letter],
    )

    add(
        "contains",
        f"Name a word containing {letter.upper()}",
        {"contains": letter},
        by_contains[letter],
    )

    for length in range(4, 11):
        add(
            "length-starts",
            f"Name a {length}-letter word beginning with {letter.upper()}",
            {"startsWith": letter, "length": length},
            by_length_first[(length, letter)],
        )

        add(
            "length-contains",
            f"Name a {length}-letter word containing {letter.upper()}",
            {"contains": letter, "length": length},
            by_length_contains[(length, letter)],
        )

for first in alphabet:
    for included in "aeiourstln":
        if first == included:
            continue

        add(
            "starts-contains",
            (
                f"Name a word beginning with {first.upper()} "
                f"that contains {included.upper()}"
            ),
            {"startsWith": first, "contains": included},
            by_first_contains[(first, included)],
        )

OUTPUT.write_text(
    json.dumps(prompts, separators=(",", ":")),
    encoding="utf-8",
)

print(f"Source vocabulary: {len(words):,} words")
print(f"Precomputed prompts: {len(prompts):,}")
print(f"Saved: {OUTPUT}")
print(f"File size: {OUTPUT.stat().st_size / 1024:.1f} KB")

for prompt in prompts[:5]:
    print(f"  {prompt['title']}: {prompt['eligibleCount']:,}")
