# Obscure — prompt-relative rarity patch

Apply this ZIP at the **root of your existing playobscure project**. Its paths are relative to the project root. It contains only modified/new files; it does not replace the entire project.

## Apply locally

```bash
cd ~/playobscure
unzip -o ~/Downloads/obscure-rarity-update.zip
python3 scripts/test-relative-rarity.py
npm run dev
```

Test in a browser:
- http://localhost:3000/api/word?word=anarchy&startsWith=a&endsWith=y
- http://localhost:3000/api/word?word=abbacy&startsWith=a&endsWith=y
- http://localhost:3000/api/word?word=apple&startsWith=a&length=5

Expected rarity scores: anarchy=23, abbacy=93, apple=2.

## How it works

1. Each generated Words/Daily prompt has a precomputed wordfreq (Zipf) distribution over eligible dictionary words.
2. The 5th and 95th percentile of **positive** Zipf frequency serve as robust normalization boundaries.
3. The most frequent words approach 1 point; the least frequent approach 100. The result is clipped to 1–100.
4. Frequency=0 means **unmeasured**, not the least common. It retains the current provisional rarity score (usually 85). This is a separate limitation worth revisiting.
5. If a new constraint combination is requested that was not precomputed, the API calculates and caches its distribution. `endsWith` is supported by the API, although current generated prompts do not yet use it.
6. An eligible word's returned `tier` is recalculated to match its updated rarity.

## After editing the dictionary or prompt pool

```bash
python3 scripts/build-relative-rarity.py
python3 scripts/test-relative-rarity.py
```

Commit the generated `data/word-rarity-bounds-v1.json` alongside source changes.

## Compatibility

- Existing Word-mode personal bests remain saved in the browser but are not compared to the new scoring scale. New bests use `playobscure:words:best:v3:*`.
- Daily runs use `playobscure:daily:v2:YYYY-MM-DD` so previously saved runs under the old scoring system are not mixed with new results.
- Arcade is unchanged.
- You do **not** need to install any new dependencies.

## Validation completed for this patch

- Precomputed 634 distributions (633 prompt-pool combinations and one extra fallback challenge).
- Dependency-free Python smoke tests passed.
- TypeScript syntax checks passed.
- Route logic exercised in a Node harness with mocked NextResponse; checked eligibility, scoring, unavailable frequency, and invalid parameters.
- Full `next build` could **not** be run in the review environment because Node packages were not available. Run `npm run build` locally before deploying.
