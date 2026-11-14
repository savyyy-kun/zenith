import { test } from "node:test";
import assert from "node:assert/strict";
import type { FlightLog } from "./types";

// Stub browser storage before the module touches it.
const mem = new Map<string, string>();
Object.assign(globalThis, {
  window: globalThis,
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)) },
});

const { BANK, matchAnswer, dailyPrompts, flightNumber, msUntilNextFlight, dateKey, shareText, recordFlight, loadStats, practicePrompts } =
  await import("./game.ts");

const prompt = (q: string) => BANK.find((p) => p.q === q)!;

test("BANK size and shape", () => {
  assert.equal(BANK.length, 50);
  assert.equal(new Set(BANK.map((p) => p.q)).size, 50);
  for (const p of BANK) {
    assert.ok(p.answers.length >= 20, p.q);
    for (const a of p.answers) assert.ok(a.length >= 1 && a.every((s) => s.length > 0), p.q);
  }
  assert.deepEqual(prompt("Name a fruit").answers[4], ["grape", "grapes"]);
});

test("matchAnswer", () => {
  const fruit = prompt("Name a fruit"), n = fruit.answers.length;
  const apple = matchAnswer(fruit, "Apple")!;
  assert.equal(apple.name, "apple");
  assert.equal(apple.frac, 0);
  assert.equal(apple.source, "list");
  assert.ok(apple.pct! > 10);
  assert.equal(matchAnswer(fruit, "mangosteen")!.frac, 1);
  assert.equal(matchAnswer(fruit, "litchi")!.name, "lychee"); // alt spelling → canonical
  assert.equal(matchAnswer(fruit, "bananas")!.name, "banana"); // plural
  assert.equal(matchAnswer(fruit, "peaches")!.name, "peach"); // -es plural
  assert.equal(matchAnswer(fruit, "pinapple")!.name, "pineapple"); // typo, tol 1
  assert.equal(matchAnswer(fruit, "pomegrante")!.name, "pomegranate"); // typo, len ≥ 9
  assert.equal(matchAnswer(fruit, "kiw"), null); // too short for typo tolerance
  assert.equal(matchAnswer(fruit, "xineapple"), null); // first letter must match
  assert.equal(matchAnswer(fruit, "car"), null);
  assert.equal(matchAnswer(fruit, "  "), null);
  assert.equal(matchAnswer(fruit, "pomegranate")!.frac, fruit.answers.findIndex((a) => a[0] === "pomegranate") / (n - 1));
  assert.equal(matchAnswer(prompt("Name a pizza topping"), "jalapeño")!.name, "jalapeno"); // accents
  assert.equal(matchAnswer(prompt("Name a country in Africa"), "Côte d’Ivoire")!.name, "ivory coast");
  assert.equal(matchAnswer(prompt("Name a mountain"), "Mt. Everest")!.name, "everest"); // article/prefix
  assert.equal(matchAnswer(prompt("Name a sport"), "The Ping-Pong")!.name, "table tennis");
});

test("daily prompts: deterministic, 7 unique, no overlap between consecutive days", () => {
  const d = new Date("2026-11-14T03:00:00Z");
  assert.deepEqual(dailyPrompts(d), dailyPrompts(new Date("2026-11-14T23:59:59Z")));
  const start = Date.UTC(2026, 0, 1);
  let prev = new Set<string>();
  for (let i = -400; i < 400; i++) { // spans many cycle boundaries and pre-launch days
    const qs = dailyPrompts(new Date(start + i * 86_400_000)).map((p) => p.q);
    assert.equal(qs.length, 7);
    assert.equal(new Set(qs).size, 7);
    assert.ok(qs.every((q) => !prev.has(q)), `overlap on day ${i}`);
    prev = new Set(qs);
  }
});

test("flight number, date key, next flight", () => {
  assert.equal(flightNumber(new Date("2026-11-14T00:00:00Z")), 1);
  assert.equal(flightNumber(new Date("2026-11-14T23:59:59Z")), 1);
  assert.equal(flightNumber(new Date("2026-11-25T12:00:00Z")), 12);
  assert.equal(flightNumber(new Date("2026-11-13T12:00:00Z")), 0);
  assert.equal(dateKey(new Date("2026-11-14T23:59:59Z")), "2026-11-14");
  assert.equal(msUntilNextFlight(new Date("2026-11-14T23:00:00Z")), 3_600_000);
  assert.equal(msUntilNextFlight(new Date("2026-11-14T00:00:00Z")), 86_400_000);
});

const log = (over: Partial<FlightLog>, km = 35_786): FlightLog => ({
  mode: "daily", flight: 12, dateKey: "2026-11-25", done: true,
  burns: dailyPrompts().map((p, i) => ({
    q: p.q, typed: p.answers[i][0], verdict: i === 2 ? null : { name: p.answers[i][0], frac: 0.5, source: "list" },
    points: i === 2 ? 0 : 150 + i * 140, score: 0, altitudeKm: i === 6 ? km : 1, common: p.answers[0][0], rarest: p.answers.at(-1)![0],
  })),
  ...over,
});

test("shareText is spoiler-free", () => {
  const l = log({});
  const text = shareText(l);
  assert.match(text, /^Zenith · Flight 12\n/);
  assert.match(text, /35,786 km/);
  assert.match(text, /Geostationary orbit/);
  assert.ok(text.endsWith("https://savyyy-kun.github.io/zenith/"));
  for (const b of l.burns) for (const w of [b.typed, b.common, b.rarest]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(text), w);
  assert.match(shareText(log({ mode: "practice", flight: null, dateKey: null })), /^Zenith · Practice flight\n/);
});

test("recordFlight: idempotent per daily key, streaks, practice", () => {
  mem.clear();
  let s = recordFlight(log({ dateKey: "2026-11-24" }, 500));
  assert.deepEqual(s, { flown: 1, bestKm: 500, streak: 1, lastDateKey: "2026-11-24" });
  s = recordFlight(log({ dateKey: "2026-11-25" }, 300));
  assert.deepEqual(s, { flown: 2, bestKm: 500, streak: 2, lastDateKey: "2026-11-25" });
  assert.deepEqual(recordFlight(log({ dateKey: "2026-11-25" }, 9000)), s); // same day again: no change
  s = recordFlight(log({ mode: "practice", flight: null, dateKey: null }, 2000));
  assert.deepEqual(s, { flown: 3, bestKm: 2000, streak: 2, lastDateKey: "2026-11-25" });
  assert.equal(recordFlight(log({ dateKey: "2026-11-26", done: false })).flown, 3); // unfinished ignored
  s = recordFlight(log({ dateKey: "2026-11-28" }, 1));
  assert.equal(s.streak, 1); // gap resets
  assert.equal(loadStats().flown, 4);
});

test("practicePrompts avoids recently seen", () => {
  mem.clear();
  const seen = new Set<string>();
  for (let i = 0; i < 7; i++) for (const p of practicePrompts()) { assert.ok(!seen.has(p.q)); seen.add(p.q); }
  assert.equal(seen.size, 49);
  assert.equal(practicePrompts().length, 7); // pool < 7 → reset
});
