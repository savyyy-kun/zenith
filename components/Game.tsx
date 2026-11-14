"use client";
// The whole game surface: home → countdown → burn i → readout i → … → log, for the daily flight and practice.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import TrajectoryPlot from "@/components/TrajectoryPlot";
import { ROUNDS, SECS, MAX_SCORE, altitudeKm, pointsFor, fmtAlt, zoneAt, lastLandmark } from "@/lib/flight";
import {
  matchAnswer, judgeAnswer, dateKey, flightNumber, dailyPrompts, practicePrompts,
  msUntilNextFlight, loadDaily, saveDaily, loadStats, recordFlight, shareText,
} from "@/lib/game";
import type { Burn, FlightLog, Prompt, Stats, Verdict } from "@/lib/types";
import s from "./Game.module.css";

type Mode = "daily" | "practice";
type Phase =
  | { k: "boot" } // server + first client render: neutral home, nothing read from storage yet
  | { k: "home" }
  | { k: "countdown"; n: number }
  | { k: "burn"; i: number }
  | { k: "readout"; i: number }
  | { k: "log" };

const HINT = { text: "Common answers barely clear the pad. Go rarer.", bad: false };
const pad = (n: number) => String(n).padStart(2, "0");
const n0 = (n: number) => n.toLocaleString("en-US");
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function makeBurn(p: Prompt, typed: string, verdict: Verdict | null, prev: Burn[]): Burn {
  const points = verdict ? pointsFor(verdict.frac) : 0;
  const score = (prev.at(-1)?.score ?? 0) + points;
  return {
    q: p.q, typed, verdict, points, score, altitudeKm: altitudeKm(score),
    common: p.answers[0]?.[0] ?? "", rarest: p.answers.at(-1)?.[0] ?? "",
  };
}

export default function Game({ mode }: { mode: Mode }) {
  const [phase, setPhase] = useState<Phase>({ k: "boot" });
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [burns, setBurns] = useState<Burn[]>([]);
  const [flight, setFlight] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [say, setSay] = useState(""); // live region
  const day = useRef<string | null>(null);
  const shell = useRef<HTMLDivElement>(null);

  // burn-phase state
  const [secs, setSecs] = useState(SECS);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(HINT);
  const left = useRef(0);
  const busyRef = useRef(false);
  const resolved = useRef(true);
  const fuse = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const logOf = (b: Burn[], done: boolean): FlightLog => ({
    mode, flight: mode === "daily" ? flight : null, dateKey: mode === "daily" ? day.current : null, burns: b, done,
  });

  // Load after mount only (static export: no storage or clock reads during render).
  useEffect(() => {
    setStats(loadStats());
    if (mode === "practice") return setPhase({ k: "home" });
    const now = new Date(), key = dateKey(now); // held for the whole session, so a flight that crosses midnight stays one flight
    day.current = key;
    setFlight(flightNumber(now));
    setPrompts(dailyPrompts(now));
    const saved = loadDaily(key);
    if (saved) {
      setBurns(saved.burns);
      if (!saved.done && saved.burns.length >= ROUNDS) {
        // reloaded between the last burn and the log: close the flight out
        const log = { ...saved, done: true };
        saveDaily(log);
        setStats(recordFlight(log));
        return setPhase({ k: "log" });
      }
      if (saved.done) return setPhase({ k: "log" });
    }
    setPhase({ k: "home" });
  }, [mode]);

  // Keep the console above the on-screen keyboard (iOS overlays it instead of resizing the layout viewport).
  useEffect(() => {
    const vv = window.visualViewport, el = shell.current;
    if (!vv || !el) return;
    const fit = () => {
      el.style.height = vv.scale > 1.01 ? "" : `${vv.height}px`;
      window.scrollTo(0, 0);
    };
    vv.addEventListener("resize", fit);
    return () => vv.removeEventListener("resize", fit);
  }, []);

  function begin() {
    if (mode === "practice") {
      setPrompts(practicePrompts());
      setBurns([]);
    }
    setSay(`Countdown. Burn ${mode === "practice" ? 1 : burns.length + 1} of ${ROUNDS}.`);
    setPhase({ k: "countdown", n: 3 });
  }

  function startBurn(i: number) {
    left.current = SECS * 1000;
    busyRef.current = false;
    resolved.current = false;
    setSecs(SECS);
    setBusy(false);
    setHint(HINT);
    // One attempt per day: the burn is logged as no lift before the prompt is shown, then overwritten by its result.
    if (mode === "daily") saveDaily(logOf([...burns, makeBurn(prompts[i], "", null, burns)], false));
    setPhase({ k: "burn", i });
  }

  function resolve(i: number, typed: string, verdict: Verdict | null) {
    if (resolved.current) return;
    resolved.current = true;
    const b = makeBurn(prompts[i], typed, verdict, burns);
    const next = [...burns, b];
    const done = next.length === ROUNDS;
    const log = logOf(next, done);
    if (mode === "daily") saveDaily(log);
    if (done) setStats(recordFlight(log));
    setBurns(next);
    setPhase({ k: "readout", i });
    setSay(
      verdict
        ? `Burn ${i + 1}: ${verdict.name}, plus ${b.points} points. Altitude ${fmtAlt(b.altitudeKm)}.`
        : `Burn ${i + 1}: no lift. Altitude ${fmtAlt(b.altitudeKm)}.`,
    );
  }

  function next() {
    if (burns.length >= ROUNDS) setPhase({ k: "log" });
    else startBurn(burns.length);
  }

  // Countdown: T−3 … T−1, then ignition.
  useEffect(() => {
    if (phase.k !== "countdown") return;
    if (phase.n === 0) return startBurn(burns.length);
    const t = setTimeout(() => setPhase({ k: "countdown", n: phase.n - 1 }), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The burn clock. Holds while the judge is deciding.
  useEffect(() => {
    if (phase.k !== "burn") return;
    const i = phase.i;
    let last = performance.now(), raf = 0, shown = SECS;
    const loop = (now: number) => {
      if (!busyRef.current) left.current = Math.max(0, left.current - (now - last));
      last = now;
      fuse.current?.style.setProperty("--left", String(left.current / (SECS * 1000)));
      const sec = Math.ceil(left.current / 1000);
      if (sec !== shown) {
        shown = sec;
        setSecs(sec);
        if (sec === 5) setSay("5 seconds.");
      }
      if (left.current <= 0 && !busyRef.current) {
        // Out of time: a typed answer still counts if it's on the list; the judge is not consulted.
        const raw = input.current?.value.trim() ?? "";
        return resolve(i, raw, raw ? matchAnswer(prompts[i], raw) : null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Back from the judge with a rejection: hand the command line back.
  useEffect(() => {
    if (!busy && phase.k === "burn") {
      input.current?.focus();
      input.current?.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase.k !== "burn" || busyRef.current || resolved.current) return;
    const i = phase.i, p = prompts[i], raw = input.current?.value.trim() ?? "";
    if (!raw) return;
    const hit = matchAnswer(p, raw);
    if (hit) return resolve(i, raw, hit);

    busyRef.current = true;
    setBusy(true);
    setHint({ text: `Flight director reviewing “${raw}”. Clock on hold.`, bad: false });
    setSay("Off the list. Reviewing, clock on hold.");
    const j = await judgeAnswer(p, raw).catch(() => null);
    if (resolved.current) return;
    busyRef.current = false;
    if (j?.valid && j.verdict) return resolve(i, raw, j.verdict);
    setBusy(false);
    const text = j ? `Judge says “${raw}” doesn't fit. Try another.` : `“${raw}” isn't on the list. Try another.`;
    setHint({ text, bad: true });
    setSay(text);
    const el = form.current;
    if (el) {
      el.classList.remove(s.shake);
      void el.offsetWidth;
      el.classList.add(s.shake);
    }
  }

  const cur = burns.at(-1);
  const km = cur?.altitudeKm ?? 0;
  const score = cur?.score ?? 0;
  const idx = phase.k === "burn" || phase.k === "readout" ? phase.i : burns.length;
  const flying = phase.k === "burn" || phase.k === "readout" || phase.k === "countdown";
  const low = phase.k === "burn" && secs <= 5;

  let clock = `T−${SECS}`;
  if (phase.k === "burn") clock = `T−${pad(secs)}`;
  if (phase.k === "countdown") clock = `T−${pad(phase.n)}`;
  if (phase.k === "readout") clock = "COAST";
  if (phase.k === "log") clock = "DONE";

  return (
    <div ref={shell} className={`${s.shell} ${phase.k === "log" ? s.logShell : ""}`}>
      <header className={s.bar}>
        <div className={s.barStart}>
          <span className={s.label}>
            <span className={s.brand}>Zenith</span> · {mode === "practice" ? "Practice" : `Flight №${flight ?? ""}`}
          </span>
          <span className={s.sub}>
            {phase.k === "log" ? "Flight complete" : flying ? `Burn ${Math.min(idx + 1, ROUNDS)}/${ROUNDS}` : `${ROUNDS} burns`}
          </span>
        </div>
        <div
          className={`${s.clock} ${low ? s.low : ""} ${busy && phase.k === "burn" ? s.held : ""} ${flying ? "" : s.idleClock}`}
          aria-label={phase.k === "burn" ? `${secs} seconds left${busy ? ", clock on hold" : ""}` : undefined}
        >
          {/* mono for numerals only; word states (COAST, DONE) set in the display face */}
          <span className={clock.startsWith("T−") ? s.mono : s.clockWord}>{clock}</span>
          {busy && phase.k === "burn" && <span className={s.holdTag}>Hold</span>}
        </div>
        <div className={s.barEnd}>
          <span className={`${s.mono} ${s.altVal}`}>{fmtAlt(km)}</span>
          <span className={s.sub}>
            {zoneAt(km)} · <span className={s.mono}>{n0(score)}</span> pts
          </span>
        </div>
        {phase.k === "burn" && <div ref={fuse} className={`${s.fuse} ${busy ? s.fuseHeld : ""}`} aria-hidden />}
      </header>

      <div className={s.plot}>
        <TrajectoryPlot
          burns={burns}
          slots={ROUNDS}
          active={phase.k === "burn" ? phase.i : null}
          idle={burns.length === 0 && (phase.k === "boot" || phase.k === "home" || phase.k === "countdown")}
        />
      </div>

      <section className={s.console} aria-label="Console">
        {(phase.k === "boot" || phase.k === "home") && (
          <Home mode={mode} flight={flight} resumeAt={burns.length} ready={phase.k === "home"} onBegin={begin} />
        )}

        {phase.k === "countdown" && (
          <div className={s.deck}>
            <div className={s.lead}>
              <h1 className={s.prompt}>
                Ignition in <span className={s.mono}>{phase.n}</span>
              </h1>
            </div>
            <div className={s.side}>
              <p className={s.note}>Stand by for burn {burns.length + 1} of {ROUNDS}. You get {SECS} seconds.</p>
              <div className={s.keys}>
                <button className={`${s.key} ${s.primary}`} onClick={() => startBurn(burns.length)} autoFocus>
                  Ignite now <kbd className={s.kbd}>Enter</kbd>
                </button>
              </div>
            </div>
          </div>
        )}

        {phase.k === "burn" && (
          <div className={s.deck}>
            <div className={s.lead}>
              <h1 className={s.prompt} id="prompt">{prompts[phase.i]?.q}</h1>
            </div>
            <div className={`${s.side} ${s.sideEnd}`}>
              <form ref={form} className={s.cmd} onSubmit={submit} autoComplete="off">
                <label htmlFor="answer" className={s.sr}>Your answer</label>
                <span className={s.glyph} aria-hidden />
                <input
                  ref={input}
                  id="answer"
                  className={s.input}
                  aria-describedby="prompt hint"
                  placeholder="Type an answer"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  disabled={busy}
                  autoFocus
                />
                <button className={s.burnKey} disabled={busy}>Burn</button>
              </form>
              <p id="hint" className={`${s.hint} ${hint.bad ? s.bad : ""} ${busy ? s.reviewing : ""}`}>{hint.text}</p>
            </div>
          </div>
        )}

        {phase.k === "readout" && burns[phase.i] && (
          <Readout key={phase.i} b={burns[phase.i]} n={prompts[phase.i]?.answers.length ?? 0} last={burns.length >= ROUNDS} onNext={next} />
        )}

        {phase.k === "log" && (
          <LogView mode={mode} burns={burns} stats={stats} log={() => logOf(burns, true)} onAgain={begin} onSay={setSay} />
        )}
      </section>

      <p className={s.sr} role="status" aria-live="polite">{say}</p>
    </div>
  );
}

function Home({ mode, flight, resumeAt, ready, onBegin }: {
  mode: Mode; flight: number | null; resumeAt: number; ready: boolean; onBegin: () => void;
}) {
  const resume = mode === "daily" && resumeAt > 0;
  const rules = resume
    ? [`Flight resumes at burn ${resumeAt + 1} of ${ROUNDS}.`, "An interrupted burn is logged as no lift.", "The Moon is a perfect flight."]
    : mode === "daily"
      ? [`${ROUNDS} prompts · ${SECS} seconds each · rarer answers fly higher.`, "One flight a day, the same prompts for everyone.", "The Moon is a perfect flight."]
      : [`${ROUNDS} random prompts · ${SECS} seconds each · rarer answers fly higher.`, "Unlimited flights. None count toward the daily.", "The Moon is a perfect flight."];
  return (
    <div className={s.deck}>
      <div className={s.lead}>
        <h1 className={s.prompt}>{mode === "daily" ? `Flight №${flight ?? ""}` : "Practice flight"}</h1>
        <ul className={s.rules}>{rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
      <div className={`${s.side} ${s.sideEnd}`}>
        <div className={s.keys}>
          <BeginKey ready={ready} onBegin={onBegin} label={resume ? "Resume countdown" : "Begin countdown"} />
          {mode === "daily"
            ? <Link className={s.key} href="/practice">Practice</Link>
            : <Link className={s.key} href="/">Today&apos;s flight</Link>}
        </div>
      </div>
    </div>
  );
}

function BeginKey({ ready, onBegin, label }: { ready: boolean; onBegin: () => void; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (ready) ref.current?.focus(); }, [ready]);
  return (
    <button ref={ref} className={`${s.key} ${s.primary}`} disabled={!ready} onClick={onBegin}>
      {label} <kbd className={s.kbd}>Enter</kbd>
    </button>
  );
}

const tier = (f: number) =>
  f < 0.1 ? "Crowd favourite." : f < 0.35 ? "Safe pick." : f < 0.7 ? "Off the beaten path." : "Almost nobody goes there.";

/** n = answers on file for the prompt. */
function Readout({ b, n, last, onNext }: { b: Burn; n: number; last: boolean; onNext: () => void }) {
  const [ready, setReady] = useState(false);
  const [at, setAt] = useState(0);
  const key = useRef<HTMLButtonElement>(null);
  const v = b.verdict;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 700);
    const r = requestAnimationFrame(() => setAt(v ? Math.max(0, Math.min(1, v.frac)) : 0));
    return () => { clearTimeout(t); cancelAnimationFrame(r); };
  }, [v]);
  useEffect(() => { if (ready) key.current?.focus(); }, [ready]);

  let why = "";
  if (v) {
    why = tier(v.frac) + " ";
    if (v.source === "judge") why += `The judge rated rarity ${v.rarity ?? Math.round(v.frac * 100)}/100.`;
    else {
      // State the answer's true rank on the list, never a modelled "% of people" figure.
      const rank = n > 1 ? Math.round(Math.max(0, Math.min(1, v.frac)) * (n - 1)) + 1 : 1;
      why += rank === 1 ? "Top answer on file." : `No. ${rank} of ${n} on file.`;
    }
  } else why = b.typed ? "Not accepted before the clock ran out. No lift." : "Out of time. No lift.";

  return (
    <div className={s.deck}>
      <div className={s.lead}>
        <div className={s.said}>
          <h1 className={s.name}>
            {v ? v.name : b.typed ? <>“{b.typed}” <span className={s.didnt}>didn&apos;t count</span></> : "No answer"}
          </h1>
          <span className={`${s.pts} ${s.mono} ${v ? "" : s.zero}`}>{v ? <CountUp to={b.points} /> : "+0"}</span>
        </div>
        <p className={s.facts}>{why}</p>
      </div>
      <div className={s.side}>
        <div className={s.scaleWrap}>
          <div className={`${s.scale} ${v ? "" : s.scaleOff}`} style={{ "--at": at } as React.CSSProperties}>
            <span className={s.fill} />
            {v && <span className={s.run}><span className={s.marker} /></span>}
          </div>
          <div className={s.ends}><span>Everyone says it</span><span>Nobody says it</span></div>
        </div>
        <p className={s.facts}>
          Most common: <b>{b.common}</b>. Rarest on file: <b>{b.rarest}</b>.
        </p>
        <div className={s.keys}>
          <button ref={key} className={`${s.key} ${s.primary}`} disabled={!ready} onClick={onNext}>
            {last ? "Flight log" : "Next burn"} <kbd className={s.kbd}>Enter</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced()) return setN(to);
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 1100);
      setN(t < 1 ? Math.round(to * (1 - Math.pow(2, -10 * t))) : to);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>+{n}</>;
}

function LogView({ mode, burns, stats, log, onAgain, onSay }: {
  mode: Mode; burns: Burn[]; stats: Stats | null; log: () => FlightLog; onAgain: () => void; onSay: (t: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const last = burns.at(-1);
  const km = last?.altitudeKm ?? 0;
  const score = last?.score ?? 0;
  const mark = lastLandmark(km);

  async function share() {
    const text = shareText(log());
    try {
      if (navigator.share) return void (await navigator.share({ text }));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onSay("Flight log copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onSay("Couldn't copy. Your browser blocked the clipboard.");
    }
  }

  const shareKey = (primary: boolean) => (
    <button className={`${s.key} ${primary ? s.primary : ""}`} onClick={share} autoFocus={primary}>
      {copied ? "Copied" : "Share flight log"}
    </button>
  );

  return (
    <div className={s.deck}>
      <div className={s.lead}>
        <h1 className={`${s.alt} ${s.mono}`}>{fmtAlt(km)}</h1>
        <p className={s.summary}>
          {mark ? `Cleared ${mark.label}` : "No landmark cleared"} · {zoneAt(km)}
          <br />
          <span className={s.mono}>{n0(score)}</span> of <span className={s.mono}>{n0(MAX_SCORE)}</span> points
        </p>
        {stats && (
          <p className={s.stats}>
            Best <span className={s.mono}>{fmtAlt(stats.bestKm)}</span> · Streak <span className={s.mono}>{stats.streak}</span> · Flights <span className={s.mono}>{stats.flown}</span>
          </p>
        )}
        <div className={s.keys}>
          {mode === "practice" ? (
            <>
              <button className={`${s.key} ${s.primary}`} onClick={onAgain} autoFocus>
                Fly again <kbd className={s.kbd}>Enter</kbd>
              </button>
              {shareKey(false)}
              <Link className={s.key} href="/">Today&apos;s flight</Link>
            </>
          ) : (
            <>
              {shareKey(true)}
              <Link className={s.key} href="/practice">Practice</Link>
            </>
          )}
        </div>
        {mode === "daily" && <NextFlight />}
      </div>
      <div className={s.side}>
        <h2 className={s.sr}>Flight log</h2>
        <ol className={s.rows}>
          {burns.map((b, i) => (
            <li key={i} className={`${s.row} ${b.verdict ? "" : s.nil}`}>
              <span className={s.rowQ}>{b.q}</span>
              <span className={s.rowA}>
                {b.verdict ? b.verdict.name : b.typed ? <>No lift <span className={s.rowTyped}>“{b.typed}”</span></> : "No lift"}
              </span>
              <span className={`${s.rowP} ${s.mono}`}>{b.points ? `+${b.points}` : "0"}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function NextFlight() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const t = () => setMs(msUntilNextFlight());
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  if (ms === null) return null;
  if (ms <= 0) {
    return (
      <p className={s.next}>
        The next flight is on the pad.{" "}
        <button className={s.textKey} onClick={() => location.reload()}>Load it</button>
      </p>
    );
  }
  const t = Math.floor(ms / 1000);
  return (
    <p className={s.next}>
      Next flight in <span className={s.mono}>{pad(Math.floor(t / 3600))}:{pad(Math.floor(t / 60) % 60)}:{pad(t % 60)}</span>
    </p>
  );
}
