"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LANDMARKS, MAX_SCORE, MOON_KM, ROUNDS, SECS, fmtAlt, lastLandmark, scoreAt, type Landmark } from "@/lib/flight";
import type { Burn } from "@/lib/types";
import s from "./TrajectoryPlot.module.css";

const DRAW_MS = 1400; // hit: burn segment draw
const MISS_MS = 800; // miss: dashed coast wipe
const ALWAYS = new Set([100, 35_786, MOON_KM]); // Kármán line, GEO, Moon: never thinned out
const TICKS: [number, string][] = [[0, "0"], [1, "1"], [10, "10"], [100, "100"], [1e3, "1K"], [1e4, "10K"], [1e5, "100K"]];
// Label priority: the three anchors, then point landmarks, then zone boundaries (stable sort keeps array order within a rank).
const BY_PRIORITY = [...LANDMARKS].sort((a, b) => rank(a) - rank(b));
const ANCHORS = BY_PRIORITY.filter((l) => rank(l) === 0);
const REST = BY_PRIORITY.filter((l) => rank(l) > 0);
const ZONES = LANDMARKS.filter((l) => l.zone);

function rank(l: Landmark) {
  return ALWAYS.has(l.km) ? 0 : l.zone ? 2 : 1;
}

/** Greedy thinning: walk items in priority order, keep one only if it clears every kept label by `gap` px. */
function thin<T>(items: T[], y: (t: T) => number, gap: number): Set<T> {
  const kept: T[] = [];
  for (const it of items) if (kept.every((k) => Math.abs(y(k) - y(it)) >= gap)) kept.push(it);
  return new Set(kept);
}

/**
 * Time fraction at which the draw reaches path fraction f, under --ease-out = cubic-bezier(0.16, 1, 0.3, 1).
 * That bezier's progress curve is 1-(1-u)^3, so its parameter u inverts in closed form. Keep in sync with globals.css.
 */
const timeAt = (f: number) => {
  const u = 1 - Math.cbrt(1 - f);
  return 3 * (1 - u) ** 2 * u * 0.16 + 3 * (1 - u) * u * u * 0.3 + u ** 3;
};

type Pt = { x: number; y: number };
const bez = (p: Pt[], u: number): Pt => {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
};

/** ms into the draw at which the climb curve (then flat coast) crosses each landmark pixel row, keyed by km. */
function crossings(curve: Pt[], coastLen: number, rows: { km: number; y: number }[]) {
  const pts = Array.from({ length: 65 }, (_, k) => bez(curve, k / 64));
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  const total = cum[64] + coastLen;
  const out = new Map<number, number>();
  for (const { km, y } of rows) {
    if (!(y < curve[0].y && y >= curve[3].y)) continue; // not crossed by this climb
    const k = Math.max(1, pts.findIndex((p) => p.y <= y));
    const a = pts[k - 1], b = pts[k];
    const at = cum[k - 1] + (cum[k] - cum[k - 1]) * ((a.y - y) / (a.y - b.y || 1));
    out.set(km, DRAW_MS * timeAt(Math.min(1, at / total)));
  }
  return out;
}

type Box = { x0: number; x1: number; y0: number; y1: number };
type Spot = { x: number; y: number; anchor: "start" | "end" };
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
// ponytail: text widths are estimated (0.6em per char, condensed caps + tracking ≈ mono), no DOM measuring; widen the factor if fonts change.
const textW = (chars: number, size: number) => chars * size * 0.6;
const clock = (sec: number) => `T+${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

const vars = (v: Record<string, string>) => v as CSSProperties;

export default function TrajectoryPlot({
  burns,
  slots = ROUNDS,
  active = null,
  idle = false,
}: {
  burns: Burn[];
  slots?: number;
  active?: number | null;
  idle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);

  // Animate only a segment that just arrived (length grew by exactly one); mounts, resets and jumps render static.
  const [prevLen, setPrevLen] = useState(burns.length);
  const [anim, setAnim] = useState<number | null>(null);
  if (burns.length !== prevLen) {
    setPrevLen(burns.length);
    setAnim(burns.length === prevLen + 1 ? burns.length - 1 : null);
  }

  const trace = idle ? [] : burns;
  const last = trace.at(-1);
  const km = last?.altitudeKm ?? 0;
  const passed = lastLandmark(km);
  const aria = last
    ? `Trajectory: ${trace.length} burn${trace.length === 1 ? "" : "s"}, ${fmtAlt(km)}${passed ? `, past the ${passed.label.split(" · ")[0]}` : ""}`
    : `Trajectory: on the pad. ${LANDMARKS.length} altitude landmarks from the pad to the Moon at ${fmtAlt(MOON_KM)}.`;

  const ready = w > 60 && h > 60;
  // Plot text scales with the plot: 11px on phones up to 14px on large desktops.
  const fs = Math.round(2 * Math.min(14, Math.max(11, 9 + Math.min(w, h * 1.6) / 250))) / 2;
  const small = fs - 1.5;
  const padL = Math.ceil(textW(4, small)) + 12, padR = 8, padT = fs + 8, padB = 2 * fs + 13;
  const plotW = w - padL - padR, plotH = h - padT - padB, bottom = padT + plotH, right = w - padR;
  const X = (i: number) => padL + 12 + (plotW - 30) * (i / slots);
  const Y = (score: number) => padT + plotH * (1 - Math.min(Math.max(score, 0), MAX_SCORE) / MAX_SCORE);
  const yKm = (k: number) => Y(scoreAt(k));

  const pts: Pt[] = [{ x: X(0), y: Y(0) }, ...trace.map((b, i) => ({ x: X(i + 1), y: Y(b.score) }))];
  let flash = new Map<number, number>();
  const segs = trace.map((b, i) => {
    const a = pts[i], z = pts[i + 1], animating = i === anim;
    if (!b.verdict) return { i, miss: true, animating, d: `M${a.x},${a.y}H${z.x}`, from: a, to: z, curve: null };
    // Gravity turn: leaves the previous point vertically, pitches over to level flight at the new altitude, then coasts.
    const xc = a.x + (z.x - a.x) * 0.62;
    const curve = [a, { x: a.x, y: a.y + (z.y - a.y) * 0.55 }, { x: a.x + (xc - a.x) * 0.35, y: z.y }, { x: xc, y: z.y }];
    const climb = `M${a.x},${a.y}C${curve.slice(1).map((p) => `${p.x},${p.y}`).join(" ")}`;
    if (animating) flash = crossings(curve, z.x - xc, LANDMARKS.map((l) => ({ km: l.km, y: yKm(l.km) })));
    return { i, miss: false, animating, climb, coast: `M${xc},${z.y}H${z.x}`, from: curve[3], to: z, curve };
  });
  const lastSeg = segs.at(-1);
  const markerDelay = lastSeg?.animating ? (lastSeg.miss ? MISS_MS * 0.5 : DRAW_MS * 0.55) : null;
  const m = pts[pts.length - 1];
  const live = idle || active !== null;

  // ── Label placement: everything avoids the trace and the marker, recomputed from this render's geometry. ──
  const taken: Box[] = [];
  const trail = (a: Pt, b: Pt) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    for (let k = 0; k <= n; k++) {
      const x = a.x + ((b.x - a.x) * k) / n, y = a.y + ((b.y - a.y) * k) / n;
      taken.push({ x0: x - 3, x1: x + 3, y0: y - 3, y1: y + 3 });
    }
  };
  for (const g of segs) {
    if (g.curve) for (let k = 0; k < 32; k++) trail(bez(g.curve, k / 32), bez(g.curve, (k + 1) / 32));
    trail(g.from, g.to);
  }
  taken.push({ x0: m.x - 13, x1: m.x + 13, y0: m.y - 13, y1: m.y + 13 });

  // Text box: cap height plus room for accents (KÁRMÁN) above, a little for commas below.
  const capH = fs * 0.74, rise = fs * 0.92, desc = fs * 0.24;
  const rules = LANDMARKS.map((l) => yKm(l.km));
  /** First free spot; `own` = the rule a landmark label belongs to (other rules must not strike through it). */
  const place = (spots: Spot[], wid: number, own?: number): Spot | null => {
    for (const c of spots) {
      const x0 = c.anchor === "end" ? c.x - wid : c.x;
      const b = { x0: x0 - fs * 0.6, x1: x0 + wid + fs * 0.6, y0: c.y - rise - 1, y1: c.y + desc + 1 };
      if (x0 < padL + 2 || x0 + wid > right + 2 || b.y0 < 0 || b.y1 > bottom) continue;
      if (taken.some((t) => overlaps(t, b))) continue;
      if (own !== undefined && rules.some((y) => y !== own && y > b.y0 && y < b.y1)) continue;
      taken.push(b);
      return c;
    }
    return null;
  };

  // Landmark label: above its rule at the right edge by default; else the left end, else below, else slide along the rule.
  const lmSpots = (l: Landmark, wid: number): Spot[] => {
    const y = yKm(l.km), above = y - 4, below = y + 4 + capH, left = padL + 6;
    const step = Math.max(2 * fs, plotW / 12);
    const mids: number[] = [];
    for (let x = right - wid - step; x > left; x -= step) mids.push(x);
    const row = (yy: number): Spot[] => [{ x: right, y: yy, anchor: "end" }, { x: left, y: yy, anchor: "start" }];
    const slide = (yy: number) => mids.map((x): Spot => ({ x, y: yy, anchor: "start" }));
    // Zone names belong to the band above their boundary, so they never drop below it.
    return l.zone ? [...row(above), ...slide(above)] : [...row(above), ...row(below), ...slide(above), ...slide(below)];
  };
  // No room for the full name? Retry with the short name ("Kármán line · space begins" → "Kármán line").
  const placeLm = (l: Landmark) => {
    for (const text of new Set([l.label, l.label.split(" · ")[0]])) {
      const wid = textW(text.length + 0.6, fs) + textW(fmtAlt(l.km).length, small);
      const spot = place(lmSpots(l, wid), wid, yKm(l.km));
      if (spot) return { ...spot, text };
    }
    return null;
  };
  const labels = new Map<number, Spot & { text: string }>();
  // ponytail: an anchor with no free spot anywhere falls back to its default spot; only seen on plots too small to matter.
  for (const l of ANCHORS) labels.set(l.km, placeLm(l) ?? { x: right, y: yKm(l.km) - 4, anchor: "end", text: l.label.split(" · ")[0] });

  // Event labels (finished / between-burns view): answer + points at each hit's end point, best burns first.
  const events = new Map<number, { spot: Spot; name: string; score: string }>();
  if (active === null && !idle) {
    const order = trace.map((b, i) => ({ b, i })).filter(({ b }) => b.verdict).sort((p, q) => q.b.points - p.b.points);
    for (const { b, i } of order) {
      const name = b.verdict!.name.length > 18 ? `${b.verdict!.name.slice(0, 17)}…` : b.verdict!.name;
      const score = `+${b.points}`, wid = textW(name.length + 0.5, fs) + textW(score.length, small);
      const z = pts[i + 1], up = z.y - desc - 6, down = z.y + rise + 6; // clear of the coast stroke at any font size
      const spot = place(
        [up, down].flatMap((y): Spot[] => [
          { x: z.x - 4, y, anchor: "end" }, { x: z.x - 14 - fs * 0.6, y, anchor: "end" },
          { x: z.x + 6, y, anchor: "start" }, { x: z.x + 14 + fs * 0.6, y, anchor: "start" },
        ]),
        wid,
      );
      if (spot) events.set(i, { spot, name, score });
    }
  }
  for (const l of REST) {
    const spot = placeLm(l);
    if (spot) labels.set(l.km, spot);
  }

  const ticks = thin(TICKS, (t) => yKm(t[0]), fs + 2);
  const colW = (plotW - 30) / slots;
  const timeStep = Math.max(1, Math.ceil((textW(6, fs - 2) + 8) / colW)); // thin T+m:ss on narrow plots
  const fkey = (km: number) => `${km}:${anim ?? "-"}`; // remount per burn so each flash plays once

  return (
    <div ref={ref} className={s.root} style={vars({ "--draw-ms": `${DRAW_MS}ms`, "--miss-ms": `${MISS_MS}ms` })}>
      <svg className={s.svg} role="img" aria-label={aria}>
        {ready && (
          <>
            {/* atmosphere bands: alternate zone intervals tinted */}
            {ZONES.map((z, i) =>
              i % 2 ? null : (
                <rect key={z.km} className={s.band} x={padL} width={right - padL} y={ZONES[i + 1] ? yKm(ZONES[i + 1].km) : padT}
                  height={yKm(z.km) - (ZONES[i + 1] ? yKm(ZONES[i + 1].km) : padT)} />
              ),
            )}

            {/* graticule: decades and burn columns */}
            {TICKS.slice(1).map(([k]) => <line key={k} className={s.grid} x1={padL} x2={right} y1={yKm(k)} y2={yKm(k)} />)}
            {Array.from({ length: slots }, (_, i) => (
              <line key={i} className={s.grid} x1={X(i + 1)} x2={X(i + 1)} y1={padT} y2={bottom} />
            ))}
            <path className={s.axis} d={`M${padL},${padT}V${bottom}H${right}`} />

            {LANDMARKS.map((l) => (
              <line key={fkey(l.km)} x1={padL} x2={right} y1={yKm(l.km)} y2={yKm(l.km)}
                className={[s.lm, l.zone && s.zone, !labels.has(l.km) && s.quiet, flash.has(l.km) && s.flashLine].filter(Boolean).join(" ")}
                style={flash.has(l.km) ? vars({ "--d": `${flash.get(l.km)}ms` }) : undefined} />
            ))}

            {active !== null && !idle && (
              <line className={s.activeRule} x1={X(active + 1)} x2={X(active + 1)} y1={padT} y2={bottom} />
            )}

            {/* Paint order: labels, then trace, then marker. Labels are placed off the trace, and their knockout can never erase it. */}
            <g aria-hidden fontSize={fs}>
              {BY_PRIORITY.filter((l) => labels.has(l.km)).map((l) => {
                const at = labels.get(l.km)!;
                return (
                  <text key={fkey(l.km)} x={at.x} y={at.y} textAnchor={at.anchor}
                    className={[s.label, l.zone && s.zoneLabel, flash.has(l.km) && s.flashText].filter(Boolean).join(" ")}
                    style={flash.has(l.km) ? vars({ "--d": `${flash.get(l.km)}ms` }) : undefined}>
                    {at.text}
                    <tspan className={s.value} dx="0.6em" fontSize={small}>{fmtAlt(l.km)}</tspan>
                  </text>
                );
              })}
              {[...events].map(([i, e]) => (
                <text key={`e${i}`} x={e.spot.x} y={e.spot.y} textAnchor={e.spot.anchor}
                  className={`${s.event} ${i === anim ? s.appear : ""}`}
                  style={i === anim ? vars({ "--d": `${DRAW_MS * 0.55}ms` }) : undefined}>
                  {e.name}
                  <tspan className={s.eventPts} dx="0.5em" fontSize={small}>{e.score}</tspan>
                </text>
              ))}
              {TICKS.filter((t) => ticks.has(t)).map(([k, t]) => (
                <text key={k} className={s.tick} x={padL - 6} y={yKm(k)} dy="0.35em" textAnchor="end" fontSize={small}>{t}</text>
              ))}
              <text className={s.unit} x={padL - 6} y={padT - 6} textAnchor="end" fontSize={small}>km</text>
              {Array.from({ length: slots + 1 }, (_, i) => (
                <g key={i}>
                  <text x={X(i)} y={bottom + fs + 8} textAnchor="middle"
                    className={`${s.slot} ${i === 0 ? "" : !idle && i - 1 === active ? s.slotActive : !idle && i - 1 < trace.length ? s.slotDone : ""}`}>
                    {i === 0 ? "Pad" : `B${i}`}
                  </text>
                  {i % timeStep === 0 && (
                    <text className={s.time} x={X(i)} y={bottom + 2 * fs + 8} textAnchor="middle" fontSize={fs - 2}>{clock(i * SECS)}</text>
                  )}
                </g>
              ))}
            </g>

            {segs.map((g) =>
              g.miss ? (
                <path key={g.i} d={g.d} className={`${s.miss} ${g.animating ? s.wipe : ""}`} />
              ) : (
                <g key={g.i}>
                  {/* While drawing, the whole segment burns orange; the coast cools to teal once the draw lands. */}
                  <path d={g.animating ? `${g.climb}H${pts[g.i + 1].x}` : g.climb} pathLength={1}
                    className={`${s.burn} ${g.animating ? s.draw : ""}`} />
                  <path d={g.coast} className={`${s.coast} ${g.animating ? s.cool : ""}`} />
                </g>
              ),
            )}

            <g key={`m${trace.length}`} transform={`translate(${m.x} ${m.y})`}
              className={[s.marker, live && s.live, idle && s.standby, markerDelay !== null && s.appear].filter(Boolean).join(" ")}
              style={markerDelay !== null ? vars({ "--d": `${markerDelay}ms` }) : undefined}>
              <path d="M0,-4.5L4.5,0L0,4.5L-4.5,0Z" />
              <path d="M-11,0H-7M7,0H11M0,-11V-7M0,7V11" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
