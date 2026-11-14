// Shared contract between lib/, components/ and app/. Change only with every consumer in view.

/** A prompt; answers ordered most common → rarest, each entry lists accepted spellings (first is canonical). */
export type Prompt = { q: string; answers: string[][] };

/** An accepted answer. frac = rarity 0 (everyone) … 1 (nobody). */
export type Verdict = {
  name: string;
  frac: number;
  source: "list" | "judge";
  /** list source: rough % of people who'd say it. */
  pct?: number;
  /** judge source: rarity 0–100 as rated. */
  rarity?: number;
};

/** One prompt's outcome. altitudeKm/score are cumulative after this burn. */
export type Burn = {
  q: string;
  typed: string;           // what the player sent ("" if the clock ran out empty)
  verdict: Verdict | null; // null = no lift (miss, invalid, or out of time)
  points: number;
  score: number;
  altitudeKm: number;
  common: string;          // most common answer for this prompt
  rarest: string;          // rarest answer we have for this prompt
};

export type FlightLog = {
  mode: "daily" | "practice";
  flight: number | null;   // daily flight number, null in practice
  dateKey: string | null;  // UTC YYYY-MM-DD for daily
  burns: Burn[];
  done: boolean;
};

export type Stats = { flown: number; bestKm: number; streak: number; lastDateKey: string | null };
