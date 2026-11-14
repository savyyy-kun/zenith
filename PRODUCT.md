# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) with static export (`output: "export"`), deployed to GitHub Pages at savyyy-kun.github.io. No app server. The AI judge stays a separate Cloudflare Worker in `judge/` calling NVIDIA NIM; its CORS allowlist is savyyy-kun.github.io plus localhost.

## Users

Casual players who do a short daily word puzzle as a habit (Wordle-style): one ~3-minute session a day, compare the result with friends, come back tomorrow.

## Product Purpose

Zenith is a rarity word game. Each prompt asks for one thing in a category; true answers score more the less obvious they are. Score converts to altitude: rarer answers fly you higher, from the launch pad through the atmosphere to the Moon (a perfect flight).

Success: players finish the daily flight, understand why each answer scored what it did, share the result, and return the next day.

## Positioning

Rewards uncommon-but-correct thinking instead of speed or vocabulary. The altitude metaphor is Zenith's own: real reference points (Everest, the Kármán line, the ISS, geostationary orbit, the Moon) make the score tangible.

## Operating Context

- Mostly played on phones, often in a spare moment; must be fully playable one-handed with the on-screen keyboard open.
- One sitting, no account, no login. Progress and history live in the browser (localStorage).

## Capabilities and Constraints

- **Daily flight:** 7 prompts, 25 seconds each, same prompts for everyone that day (seeded by date), one attempt per day, numbered rounds (flight #N).
- **Unlimited mode:** endless practice flights with random prompts, not counted toward the daily.
- **Scoring:** built-in prompt bank with answers ordered common → rare (`/` separates accepted spellings), fuzzy matching for typos, and the NIM judge for off-list answers (returns valid, rarity 0–100, canonical name). The clock pauses while the judge decides. Judge unavailable → off-list answers don't count.
- **Not doing (yet):** live crowd-sourced rarity stats, accounts, leaderboards, archive.
- Must not imitate krillion.io's look or copy (ocean/depth theme, pixel font, depth markers, mascot). Shared genre mechanics are fine.

## Brand Commitments

- Name: Zenith. Tagline in use: "fly higher with rarer answers".
- Altitude/ascent metaphor, rocket, real-world altitude reference points, Moon as the perfect-flight finish.

## Evidence on Hand

- Prompt bank of ~50 prompts in the original `index.html` (to be moved into the app).
- No testimonials, player counts, or stats exist; never fabricate them.

## Product Principles

1. Every score is explainable: show where the answer sat between "everyone says it" and "nobody says it".
2. One daily ritual, finishable in minutes, with a result worth sharing.
3. The metaphor carries meaning: altitude markers are real facts, not decoration.
4. Fair for everyone: same prompts, same clock, judge time never costs the player.

## Accessibility & Inclusion

Keyboard-only playable (Enter to submit and advance), respects reduced motion, readable contrast over the changing sky.
