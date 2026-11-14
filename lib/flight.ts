// Flight physics shared by every screen: score ↔ altitude (log scale), landmarks, points.

export const ROUNDS = 7;
export const SECS = 25;
export const MAX_SCORE = ROUNDS * 1000;
export const MOON_KM = 384_400;
const L = Math.log10(MOON_KM + 1);

/** Altitude in km reached with a given cumulative score. 0 → pad, MAX_SCORE → the Moon. */
export const altitudeKm = (score: number) => Math.pow(10, (score / MAX_SCORE) * L) - 1;
/** Inverse of altitudeKm; also the plot's linear Y coordinate (0..MAX_SCORE). */
export const scoreAt = (km: number) => (MAX_SCORE * Math.log10(km + 1)) / L;
/** Points for an accepted answer; frac is rarity 0 (everyone says it) … 1 (nobody does). */
export const pointsFor = (frac: number) => Math.round(150 + 850 * Math.pow(Math.max(0, Math.min(1, frac)), 1.15));

export type Landmark = { km: number; label: string; zone?: boolean };
export const LANDMARKS: Landmark[] = [
  { km: 0.828, label: "Tallest building on Earth" },
  { km: 8.849, label: "Everest summit" },
  { km: 11, label: "Airliner cruise" },
  { km: 12, label: "Stratosphere", zone: true },
  { km: 41.4, label: "Highest skydive" },
  { km: 50, label: "Mesosphere", zone: true },
  { km: 85, label: "Thermosphere", zone: true },
  { km: 100, label: "Kármán line · space begins" },
  { km: 408, label: "International Space Station" },
  { km: 547, label: "Hubble" },
  { km: 600, label: "Exosphere", zone: true },
  { km: 2000, label: "Edge of low Earth orbit" },
  { km: 20_200, label: "GPS constellation" },
  { km: 35_786, label: "Geostationary orbit" },
  { km: 150_000, label: "Earth fits behind your thumb" },
  { km: MOON_KM, label: "The Moon · perfect flight" },
];

const ZONES: [number, string][] = [[0, "Troposphere"], [12, "Stratosphere"], [50, "Mesosphere"], [85, "Thermosphere"], [600, "Exosphere"], [10_000, "Deep space"], [300_000, "Lunar approach"]];
export const zoneAt = (km: number) => (km < 0.005 ? "On the pad" : ZONES.filter(([a]) => km >= a).pop()![1]);
/** Highest landmark at or below km, if any. */
export const lastLandmark = (km: number) => LANDMARKS.filter((l) => !l.zone && l.km <= km).pop() ?? null;

export const fmtAlt = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : km < 100 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("en-US")} km`;
