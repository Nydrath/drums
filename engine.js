import { RHYTHMS, DEFAULTS } from "./rhythms.js";
export function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const PLAYERS = { DB: { kit: "DB", type: "dunun", pan: -0.1, gain: 2.24, room: 0.14, role: "dun" }, DBB: { kit: "DBB", type: "bell", pan: -0.25, gain: 2.13, room: 0.08, role: "dun" }, SB: { kit: "SB", type: "dunun", pan: 0.35, gain: 1.03, room: 0.14, role: "dun" }, SBB: { kit: "SBB", type: "bell", pan: 0.45, gain: 1.33, room: 0.08, role: "dun" }, KK: { kit: "KK", type: "dunun", pan: -0.4, gain: 0.77, room: 0.14, role: "dun" }, KKB: { kit: "KKB", type: "bell", pan: -0.5, gain: 1.53, room: 0.08, role: "dun" }, DJ1: { kit: "DJ1", type: "djembe", pan: -0.45, gain: 0.95, room: 0.2, role: "acc" }, DJ2: { kit: "DJ2", type: "djembe", pan: 0.5, gain: 0.8, room: 0.2, role: "acc" }, DJ3: { kit: "DJ3", type: "djembe", pan: -0.7, gain: 0.7, room: 0.22, role: "acc" }, LEAD: { kit: "LEAD", type: "djembe", pan: 0.08, gain: 1.05, room: 0.2, role: "lead" }, SUB: { kit: "SUB", type: "sub", pan: 0, gain: 1.2, room: 0, role: "dun" }, SH: { kit: "SH", type: "shaker", pan: 0.25, gain: 3.04, room: 0.1, role: "acc" } };
const ROLE = { dun: { bias: [3, 8], sd: 0.014 }, acc: { bias: [-2, 2], sd: 9e-3 }, lead: { bias: [-10, -5], sd: 0.019 } };
export const ORDER = ["DB", "DBB", "SB", "SBB", "KK", "KKB", "DJ1", "DJ2", "DJ3", "SH"];
const GROUPS = [["DB", "DBB"], ["SB", "SBB"], ["KK", "KKB"], ["DJ1"], ["DJ2"], ["DJ3"], ["SH"]];
export const TEMPO = { min: 90, max: 200, start: 120 };
const WARM = 45, WARM_DROP = 0.12;
const SOFT = 0.5;
const LIMIT = { 4: 60 / (4 * 0.085), 3: 60 / (3 * 0.085) };
const BASE_TH = { DB: 0, DBB: 0, DJ1: 0.04, SB: 0.09, SBB: 0.12, DJ2: 0.16, KK: 0.21, KKB: 0.24, SH: 0.32, DJ3: 0.38 };
const VEL = { djembe: { B: 0.92, T: 0.78, S: 0.86, g: 0.3, s: 0.34, f: 0.95 }, dunun: { X: 1, O: 0.82, o: 0.5, c: 0.72, p: 0.55 }, bell: { X: 1, x: 0.8, o: 0.5 }, shaker: { X: 1, x: 0.8, o: 0.6 } };
export const FEELS = { SML: [0, 0.25, 0.58], SOLI: [0, 0.22, 0.56], SLL: [0, 0.28, 0.64], LFF: [0, 0.4, 0.7], T3: [0, 1 / 3, 2 / 3], SFLF: [0, 0.18, 0.44, 0.76], T4: [0, 0.25, 0.5, 0.75] };
function onsets(feel, ppb, bpm) {
  if (ppb === 3) {
    let f = FEELS[feel] || FEELS.SML;
    if (feel === "SML" || feel === "SOLI") {
      const k = clamp((bpm - 185) / 20, 0, 1);
      f = f.map((x, i) => x + k * (FEELS.SLL[i] - x));
    }
    return f;
  }
  if (feel === "SFLF" || feel === "T4") return FEELS[feel];
  const r = 0.6 - 0.05 * clamp((bpm - 100) / 70, 0, 1);
  return [0, r / 2, 0.5, 0.5 + r / 2];
}
const SUBFEEL = { 3: [0, 0.28, 0.6], 2: [0, 0.58], 4: [0, 0.285, 0.5, 0.785] };
const clean = (p) => (p || "").replace(/[|\s]/g, "");
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
function fit(p, n) {
  p = clean(p);
  if (!p.length) return ".".repeat(n);
  while (p.length % n) p += ".";
  return p;
}
function barOf(p, n, i) {
  const f = fit(p, n), nb = f.length / n;
  const k = (i % nb + nb) % nb;
  return f.slice(k * n, (k + 1) * n);
}
const CELLS = { 4: ["S.SS", "SS.S", "SSTT", "TTSS", "B.SS", "f.SS", "S..S..S.", "SS.SS.S.", "STTS", "fSSS", "S.S.SSS.", "TTS.TTS.", "B.TT", "S.TS", "SST", "S.S", "SSS", "f.S.S.SS", "SS.TT.SS", "S..SS.S."], 3: ["S.S", "SSS", "SST", "TTS", "B.S", "f.S", "S.SS.S", "SSS.SS", "TTSTTS", "fSS", "S..SSS", "B.SS.S", "SS", "S.SS", "f.SS.S", "TTS.TSB.SB.S"], 2: ["SS", "S.", "fS", "TS", "SSSS", "S.SS", "SSTT", "f.S."] };
const ALT = { 4: [3], 3: [2, 4] };
const GROUPINGS = { 4: [[3, 3, 2], [3, 3, 3, 3, 4], [4], [2], [3, 3, 3, 3, 2, 2], [5, 3]], 3: [[3], [2], [4], [2, 2, 2, 3, 3], [3, 3, 2, 2, 2]] };
const OFFBEAT = { 4: ["...S", "..S.", ".S.S", "..SS", ".SS."], 3: ["..S", ".SS", ".S.", "..T"] };
function develop(m, k, rng) {
  const swap = m.replace(/[ST]/g, (c) => c === "S" ? "T" : "S");
  const forms = [swap, m.replace(".", "S"), "." + m.slice(0, -1), [...m].reverse().join(""), m.slice(1) + m[0], m + m.replace(/T/g, "S")].filter((f) => f !== m && /[STBf]/.test(f));
  return forms.length ? forms[(k + Math.floor(rng() * 2)) % forms.length] : m;
}
function tile(cell, sub, start, gap, count, from = 0, to = 4 * sub) {
  const out = [];
  let n = 0;
  for (let p = start; p < to && n < count; p += cell.length + gap, n++) for (let i = 0; i < cell.length && p + i < to; i++) if (cell[i] !== "." && p + i >= from) out.push({ b: (p + i) / sub, c: cell[i], a: i === 0 ? 1 : 0.78, sub });
  return out;
}
const line = (s, ppb, a = 0.85) => [...s].flatMap((c, i) => c === "." ? [] : [{ b: i / ppb, c, a: i % ppb === 0 || c === "f" ? 1 : a, sub: ppb }]);
class Lead {
  constructor(eng) {
    this.e = eng;
    this.reset();
  }
  reset() {
    this.phrase = null;
    this.pass = 0;
    this.passes = 0;
    this.i = 0;
    this.focus = [];
    this.rest = 0;
    this.sinceFocus = 0;
    this.jit = 1;
    this.mode = "quiet";
    this.k = 0;
  }
  reps(E) {
    const r = this.e.rng();
    if (E < 0.45) return 2 + Math.floor(this.e.rng() * 3);
    return r < 0.4 ? 4 : r < 0.85 ? this.e.pick([6, 8, 10]) : 12;
  }
  genCell(sub, d) {
    const r = this.e.rng;
    const L = this.e.pick([sub, 2 * sub, sub + 1, 3, 5, 2 * sub, sub * 2 - 1]);
    let c = r() < 0.25 ? "f" : r() < 0.15 ? "B" : "S";
    for (let i = 1; i < L; i++) {
      if (r() > 0.4 + 0.45 * d) {
        c += ".";
        continue;
      }
      const x = r();
      c += x < 0.62 ? "S" : x < 0.88 || i % sub ? "T" : "B";
    }
    return c;
  }
  stream(ppb) {
    const r = this.e.rng, sub = ppb, n = 4 * sub, g = this.e.pick(GROUPINGS[ppb]);
    const out = [];
    let gi = 0, left = g[0];
    for (let p = 0; p < n; p++) {
      const acc = left === g[gi % g.length];
      if (acc || r() > 0.08) out.push({ b: p / sub, c: acc ? r() < 0.15 ? "f" : "S" : r() < 0.5 ? "T" : "S", a: acc ? 1 : 0.45, sub });
      if (--left === 0) {
        gi++;
        left = g[gi % g.length];
      }
    }
    return out;
  }
  newPhrase(ppb, E) {
    const e = this.e, r = e.rng, R = e.R, none = [];
    const cyc = R.cycle || 1, d = clamp((E - 0.45) / 0.45, 0, 1);
    this.k++;
    if (E < 0.2) {
      this.mode = "quiet";
      const m = e.pick(CELLS[ppb].filter((c) => c.length <= ppb));
      return { bars: r() < 0.5 ? [none] : [tile(m, ppb, 3 * ppb, 0, 1)], vary: [none] };
    }
    if (E < 0.45) {
      this.mode = "answer";
      const m = e.pick(CELLS[ppb]);
      const fig = r() < 0.7 ? tile(m, ppb, 0, 0, 99, 3 * ppb) : [{ b: e.pick([1, 2, 3]) + 2 / ppb, c: "f", a: 1, sub: ppb }];
      const bars = cyc === 2 ? [none, fig] : [fig];
      return { bars, vary: bars.map((b, i) => i === bars.length - 1 ? tile(develop(m, this.k, r), ppb, 0, 0, 99, 2 * ppb) : b) };
    }
    this.mode = E < 0.85 ? "solo" : "frenzy";
    const kind = r();
    const hot = E >= 0.85;
    if (R.solo && R.solo.length && kind < (hot ? 0.1 : 0.35)) {
      const s = clean(e.pick(R.solo)), n = 4 * ppb, nb = Math.ceil(s.length / n);
      const bars = Array.from({ length: nb }, (_, i) => line(barOf(s, n, i), ppb));
      return { bars, vary: bars.map((b, i) => i === nb - 1 ? [...b.filter((x) => x.b < 2), ...this.stream(ppb).filter((x) => x.b >= 2)] : b) };
    }
    if (hot && kind < 0.45) {
      const a = this.stream(ppb), b = this.stream(ppb);
      return { bars: cyc === 2 ? [a, b] : [a], vary: cyc === 2 ? [a, this.stream(ppb)] : [b] };
    }
    if (kind < (hot ? 0.55 : 0.5)) {
      const m = e.pick(OFFBEAT[ppb]);
      const a = tile(m, ppb, 0, 0, 99);
      const end = [...a.filter((x) => x.b < 3), ...tile(e.pick(CELLS[ppb]), ppb, 0, 0, 99, 3 * ppb)];
      return { bars: Array(cyc).fill(a), vary: [...Array(cyc - 1).fill(a), end] };
    }
    const fast = ALT[ppb].filter((k) => 60 / e.bpm / k >= 0.085);
    const sub = fast.length && r() < 0.25 + 0.2 * d ? e.pick(fast) : ppb;
    const cell = r() < 0.5 ? e.pick(CELLS[sub]) : this.genCell(sub, d);
    const gap = d > 0.75 ? 0 : d > 0.4 ? e.pick([0, 1, sub]) : e.pick([1, sub, Math.max(1, 2 * sub - cell.length)]);
    const count = d > 0.7 ? 99 : 1 + Math.floor(d * 4 + r() * 2);
    const start = e.pick([0, 0, 1, sub - 1]);
    const A = tile(cell, sub, start, gap, count);
    const dev = develop(cell, this.k, r);
    const B = tile(dev, sub, start, gap, count);
    return { bars: cyc === 2 ? [A, r() < 0.5 ? A : B] : [A], vary: cyc === 2 ? [A, tile(dev, sub, start, 0, 99)] : [B] };
  }
  buildFocus(ppb, E) {
    const e = this.e, r = e.rng, R = e.R, G = DEFAULTS.ech[ppb];
    const ech = R.ech || {};
    const runs = ech.runs && ech.runs.length ? ech.runs : G.runs;
    const end = ech.end && ech.end.length ? ech.end : G.end;
    const cut = ech.cut || e.pick(G.cut);
    const n = 4 * ppb, seq = [];
    const push = (s, dense, cutBar = false) => seq.push({ strokes: line(barOf(s, n, 0), ppb), dense, cut: cutBar, mode: cutBar ? "cut" : "focus" });
    const announce = ech.announce || e.pick(G.announce);
    for (let i = 0; i < 1 + (r() < 0.5); i++) push(announce, false);
    const k = 3 + Math.floor(r() * 3) + (E > 0.85 ? 2 : 0);
    let ri = 0;
    for (let i = 0; i < k; i++) {
      push(runs[Math.min(runs.length - 1, ri)], i > 0);
      if (r() < 0.45) ri++;
    }
    push(e.pick(end), true);
    push(cut, true, true);
    return seq;
  }
  bar(E, cbar, barSec) {
    const e = this.e, ppb = e.R.ppb, r = e.rng;
    this.sinceFocus += barSec;
    if (this.focus.length) {
      const f = this.focus.shift();
      this.mode = f.mode;
      if (!this.focus.length) this.rest = 2 + Math.floor(r() * 3);
      return f;
    }
    if (this.rest > 0) {
      this.rest--;
      this.mode = "rest";
      const R = e.R;
      if (R.rest && R.rest.length && r() < 0.6) return { strokes: line(barOf(e.pick(R.rest), 4 * ppb, 0), ppb, 0.6), dense: false };
      return { strokes: E > 0.7 && r() < 0.5 ? tile(e.pick(OFFBEAT[ppb]), ppb, 0, 0, 99).map((x) => ({ ...x, a: 0.6 })) : [], dense: false };
    }
    const every = lerp(90, 35, clamp((E - 0.6) / 0.4, 0, 1)) * this.jit;
    if (E >= 0.6 && cbar === 0 && this.sinceFocus > every) {
      this.focus = this.buildFocus(ppb, E);
      this.sinceFocus = 0;
      this.jit = 0.75 + 0.5 * r();
      this.phrase = null;
      return this.bar(E, cbar, 0);
    }
    if (!this.phrase || cbar === 0 && this.i === 0 && this.pass >= this.passes) {
      this.phrase = this.newPhrase(ppb, E);
      this.passes = this.reps(E);
      this.pass = 0;
      this.i = 0;
    }
    const P = this.phrase;
    const src = this.pass % 4 === 3 ? P.vary : P.bars;
    const s = src[this.i % src.length] || [];
    this.i++;
    if (this.i >= P.bars.length) {
      this.i = 0;
      this.pass++;
    }
    if (E < 0.2 && (this.mode === "solo" || this.mode === "frenzy")) return { strokes: [], dense: false };
    return { strokes: s, dense: false };
  }
}
export class Engine {
  constructor({ sr = 48e3, seed = 1, rhythms = RHYTHMS, energy = 0.12, target = 0.6, tempo = TEMPO.start } = {}) {
    this.sr = sr;
    this.rng = rng32(seed);
    this.rhythms = rhythms;
    this.t = 0;
    this.bar = 0;
    this.E = energy;
    this.target = target;
    this.auto = false;
    this.autoPhase = [0, 1, 2].map(() => this.rng() * 2 * Math.PI);
    this.recent = [];
    this.queue = [];
    this.after = null;
    this.morph = null;
    this.bump = 0;
    this.tempo = tempo;
    this.tempoT = tempo;
    this.warm = WARM;
    this.brisk = false;
    this.arc = 0;
    this.misfit = 0;
    this.hand = null;
    this.muted = new Set();
    this.center = target;
    this.j = null;
    this.crash = false;
    this.pulse = 0;
    this.sub = 1;
    this.soft0 = SOFT;
    this.stopping = false;
    this.ending = false;
    this.done = false;
    this.lead = new Lead(this);
    this.on = {};
    this.startRhythm(this.pickRhythm());
    this.base = clamp(tempo * (1 - WARM_DROP), TEMPO.min, LIMIT[this.R.ppb]);
    this.bpm = this.base;
    for (const n of ORDER) this.on[n] = this.th[n] <= this.E;
  }
  gauss() {
    const u = 1 - this.rng(), v = this.rng();
    return clamp(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v), -2.5, 2.5);
  }
  pick(a) {
    return a[Math.floor(this.rng() * a.length)];
  }
  pickRhythm(ppb = null) {
    let pool = this.rhythms.filter((R2) => !this.recent.includes(R2.name) && R2 !== this.R && (ppb === null || R2.ppb === ppb));
    if (!pool.length) pool = this.rhythms.filter((R2) => R2 !== this.R && (ppb === null || R2.ppb === ppb));
    if (!pool.length) pool = this.rhythms.filter((R2) => R2 !== this.R);
    if (!pool.length) pool = this.rhythms;
    const E = Math.max(this.E, this.target);
    const w = pool.map((R2) => (Math.exp(-(((R2.heat ?? 0.6) - E) ** 2) / (2 * 0.25 ** 2)) + 0.05) * (this.fit(R2) + 0.01) * this.lean(R2));
    let x = this.rng() * w.reduce((a, b) => a + b, 0), i = 0;
    while (x > w[i] && i < w.length - 1) x -= w[i++];
    const R = pool[i];
    this.recent.push(R.name);
    if (this.recent.length > Math.min(8, this.rhythms.length - 2)) this.recent.shift();
    return R;
  }
  lean(R) {
    const c = R.clarity ? clamp((R.clarity - 2) / 4, 0, 1) : 0.5;
    return 0.55 + 0.9 * c;
  }
  fit(R, T = this.tempo) {
    if (T > LIMIT[R.ppb] + 2) return 0.05;
    const lo = R.bpm[0] * 0.9, hi = Math.min((R.hot || R.bpm)[1] * 1.1, LIMIT[R.ppb]);
    const d = T < lo ? lo - T : T > hi ? T - hi : 0;
    return Math.exp(-((d / 12) ** 2));
  }
  startRhythm(R) {
    this.R = R;
    this.rbar = 0;
    this.elapsed = 0;
    this.rhythmLen = 90 + Math.floor(this.rng() * 110);
    this.misfit = 0;
    this.src = {};
    this.ver = {};
    this.varIdx = {};
    this.varUntil = {};
    this.prio = {};
    for (const n of ORDER) this.useRhythm(n, R);
    this.th = {};
    for (const [n, b] of Object.entries(BASE_TH)) this.th[n] = b === 0 ? 0 : Math.max(0.02, b + (this.rng() - 0.5) * 0.08);
    this.bias = {};
    for (const n of [...ORDER, "LEAD"]) {
      const [a, b] = ROLE[PLAYERS[n].role].bias;
      this.bias[n] = (a + (b - a) * this.rng()) / 1e3;
    }
    this.lead.reset();
    this.lead.sinceFocus = 20 + 30 * this.rng();
  }
  useRhythm(n, R) {
    this.src[n] = R;
    const vs = (R.versions || {})[n] || [];
    this.ver[n] = vs.length && this.rng() < 0.3 ? 1 + Math.floor(this.rng() * vs.length) : 0;
    this.varUntil[n] = -1;
    this.prio[n] = Array.from({ length: 8 * R.ppb }, () => this.rng());
  }
  updateTarget() {
    if (!this.auto) {
      this.j = null;
      return;
    }
    const s = this.t / this.sr, r = this.rng;
    const lo = clamp(this.center - 0.22, 0.12, 0.75), hi = clamp(this.center + 0.25, lo + 0.2, 1);
    if (!this.j || s >= this.j.t0 + this.j.dur) {
      const next = { build: "peak", peak: "release", release: "rest", rest: "build" }[this.j ? this.j.phase : "rest"];
      const dur = { build: 150 + 150 * r(), peak: 40 + 50 * r(), release: 20 + 20 * r(), rest: 40 + 60 * r() }[next];
      const from = this.j ? this.j.to : this.E;
      const to = next === "build" || next === "peak" ? hi - 0.06 * r() : lo + 0.06 * r();
      this.j = { phase: next, t0: s, dur, from, to };
    }
    const k = clamp((s - this.j.t0) / this.j.dur, 0, 1);
    const ease = this.j.phase === "build" ? k * k * (3 - 2 * k) : this.j.phase === "release" ? 1 - (1 - k) * (1 - k) : k;
    this.target = clamp(this.j.from + (this.j.to - this.j.from) * ease, 0.05, 1);
  }
  setAuto(on, center = this.target) {
    this.auto = on;
    this.center = center;
    this.j = null;
  }
  updateEnergy(barSec) {
    this.E += clamp(this.target - this.E, -0.025 * barSec, 0.032 * barSec);
  }
  updateTempo(barSec = 4 * 60 / this.bpm) {
    const R = this.morph ? this.morph.to : this.R;
    const lim = Math.min(LIMIT[this.R.ppb], LIMIT[R.ppb]);
    const drift = this.auto ? clamp(0.24 * (this.target - this.center), -0.05, 0.06) : 0;
    const warm = this.warm > 0 ? 1 - WARM_DROP * this.warm / WARM : 1;
    this.warm = Math.max(0, this.warm - barSec);
    const want = clamp(this.tempo * (1 + drift) * warm, TEMPO.min, lim);
    const step = this.brisk ? 2 : 0.6;
    this.base += clamp(want - this.base, -step, step);
    if (Math.abs(want - this.base) < 0.5) this.brisk = false;
    this.tempoT = want;
    this.arc = 0;
    this.bump = 0;
    this.bpm = this.base;
    this.misfit = this.fit(this.R) < 0.3 ? this.misfit + barSec : 0;
  }
  setTempo(bpm) {
    this.tempo = bpm;
    this.brisk = true;
  }
  decide(bip) {
    const r = this.rng, E = this.E;
    if (this.stopping) {
      if (this.ending) return;
      this.ending = true;
      this.queue = this.queue.includes("break") ? this.queue.filter((q) => q !== "call") : ["fin", "fin", "break"];
      this.after = "end";
      return;
    }
    if (this.breakReq && !this.queue.length) {
      this.breakReq = false;
      this.lead.focus = [];
      this.lead.rest = 0;
      const target = this.hand && !this.hand.back ? this.hand.to : this.morph ? this.morph.to : null;
      this.hand = null;
      this.morph = null;
      this.muted.clear();
      this.queue = ["signal", "break"];
      this.after = target && target !== this.R ? target : this.pickRhythm();
      return;
    }
    if (this.morph || this.hand || this.queue.length || this.lead.focus.length) return;
    if (bip !== 0) return;
    const valley = this.auto && this.j && (this.j.phase === "release" || this.j.phase === "rest");
    const due = this.auto ? valley && this.elapsed >= 60 || this.elapsed >= this.rhythmLen * 1.5 : this.elapsed >= this.rhythmLen;
    if (due || this.misfit > 20) {
      const next = this.pickRhythm();
      if (next.ppb === this.R.ppb && this.fit(next) > 0.5 && r() < 0.3) this.beginMorph(next);
      else this.beginHandover(next);
    }
  }
  beginMorph(to) {
    const order = GROUPS.slice().sort(() => this.rng() - 0.5);
    this.morph = { to, order };
  }
  stepMorph() {
    const M = this.morph;
    for (const n of M.order.shift()) this.useRhythm(n, M.to);
    if (!M.order.length) {
      const keep = { base: this.base, bpm: this.bpm, arc: this.arc, rbar: this.rbar % 4, src: this.src, ver: this.ver, prio: this.prio, on: this.on };
      this.morph = null;
      this.startRhythm(M.to);
      Object.assign(this, keep);
    }
  }
  beginHandover(to) {
    const out = ["LEAD", "SH", "DJ3", "KKB", "DJ2", "KK", "SBB", "DJ1", "SB"];
    this.hand = { to, out, back: null };
    this.lead.focus = [];
    this.lead.rest = 99;
  }
  stepHandover() {
    const H = this.hand;
    if (H.out.length) {
      for (const n2 of H.out.splice(0, 2)) this.muted.add(n2);
      return;
    }
    if (!H.back) {
      const keepOn = { ...this.on }, base = this.base, bpm = this.bpm, arc = this.arc;
      this.startRhythm(H.to);
      Object.assign(this, { on: keepOn, base, bpm, arc });
      this.lead.rest = 99;
      H.back = ["SB", "SBB", "DJ1", "KK", "KKB", "DJ2", "SH", "DJ3", "LEAD"];
      return;
    }
    const n = H.back.shift();
    this.muted.delete(n);
    if (n === "LEAD") {
      this.lead.rest = 0;
      this.lead.sinceFocus = 0;
    }
    if (!H.back.length) {
      this.hand = null;
      this.muted.clear();
    }
  }
  presence() {
    const budget = Math.abs(this.target - this.E) > 0.3 ? 2 : 1;
    const enter = ORDER.filter((n) => !this.on[n] && this.E > this.th[n] + 0.02).sort((a, b) => this.th[a] - this.th[b]);
    const leave = ORDER.filter((n) => this.on[n] && this.E < this.th[n] - 0.02).sort((a, b) => this.th[b] - this.th[a]);
    for (const n of enter.slice(0, budget)) this.on[n] = true;
    for (const n of leave.slice(0, budget)) this.on[n] = false;
  }
  vary() {
    const r = this.rng, E = this.E;
    for (const [n, p] of [["SB", 0.1 + 0.25 * E], ["DB", 0.06 + 0.15 * E], ["KK", 0.04]]) {
      const vs = (this.src[n].vars || {})[n];
      if (!this.on[n] || !vs || !vs.length || this.varUntil[n] > this.rbar) continue;
      if (r() < p) {
        this.varIdx[n] = Math.floor(r() * vs.length);
        this.varUntil[n] = this.rbar + 4 * (1 + Math.floor(r() * 2));
      }
    }
  }
  part(n, ppb) {
    const R = this.src[n], steps = 4 * ppb;
    if (R.ppb !== ppb) return null;
    let p;
    if (this.varUntil[n] > this.rbar) p = R.vars[n][this.varIdx[n]];
    else if (this.ver[n] > 0) p = R.versions[n][this.ver[n] - 1];
    else p = (R.parts || {})[n];
    if (!p && n === "SH") p = DEFAULTS.parts[ppb].SH[this.E > 0.65 && this.bpm < 140 ? 1 : 0];
    if (!p) p = (DEFAULTS.parts[ppb][n] || [])[0];
    if (!p) return null;
    return barOf(p, steps, this.rbar);
  }
  shape(n, pat, ppb) {
    if (!/[^.]/.test(pat)) return pat;
    const E = this.E, type = PLAYERS[n].type, pr = this.prio[n], steps = pat.length;
    const pd = clamp((0.2 - E) * 2, 0, 0.4);
    const pg = type === "djembe" ? clamp((E - 0.3) * 0.5, 0, 0.28) * clamp((150 - this.bpm) / 35, 0.25, 1) : 0;
    const pp = n === "DB" ? clamp((E - 0.65) * 0.9, 0, 0.3) : 0;
    const off = this.rbar % 2 * steps;
    let out = "";
    for (let s = 0; s < steps; s++) {
      const c = pat[s], q = pr[(off + s) % pr.length];
      if (c !== ".") out += s % ppb !== 0 && q < pd && (type === "djembe" || type === "dunun") ? "." : c;
      else if (q < pg) out += "g";
      else if (pp && pat[(s + 1) % steps] !== "." && q > 1 - pp) out += "O";
      else out += ".";
    }
    return out;
  }
  pulsed(n, pat, ppb) {
    const row = [...pat], steps = row.length;
    for (let s = 0; s < steps; s += ppb) if (row[s] === ".") row[s] = n === "DB" ? "p" : "x";
    return row.join("");
  }
  hit(out, n, ch, off, vel, onBeat, opts = {}) {
    const P = PLAYERS[n], type = P.type, role = ROLE[P.role];
    const fast = clamp((this.bpm - 120) / 40, 0, 1);
    const offAcc = n === "LEAD" ? 0.92 : 0.92 - (type === "dunun" ? 0.22 : 0.14) * fast;
    const soft = this.soft0 + (1 - this.soft0) * Math.pow(this.E, 0.6);
    let v = (VEL[type][ch] ?? 0.8) * vel * soft * (onBeat ? opts.step === 0 ? 1.08 : 1 : offAcc) * (1 + 0.07 * this.gauss());
    const beatSec = 60 / this.bpm, pulse = beatSec / (opts.sub || this.R.ppb);
    const jit = clamp(role.sd * beatSec * (onBeat ? 0.8 : 1) * this.gauss(), -0.2 * pulse, 0.2 * pulse);
    const dt = this.bias[n] + jit + (opts.dt || 0);
    const t = this.t + off + dt * this.sr;
    const pan = P.pan + 0.04 * (this.rng() - 0.5);
    let key, rate = 1, L10 = 10;
    if (type === "djembe") {
      if (ch === "f") {
        this.hit(out, n, "S", off, vel * 0.5, onBeat, { dt: (opts.dt || 0) - 0.03 - 0.015 * this.rng(), grace: true, step: opts.step });
        ch = "S";
      }
      key = `${P.kit}:${ch}`;
      rate = 1 + 6e-3 * this.gauss();
    } else if (type === "dunun") {
      if (ch === "c") key = `${P.kit}:c`;
      else if (n === "DB") {
        L10 = v < 0.6 ? 5 : v < 0.85 ? 7 : 10;
        key = `DB:O:${L10}`;
        v /= L10 / 10;
      } else key = `${P.kit}:O`;
      if (ch === "X") v *= 1.15;
      rate = 1 + 4e-3 * this.gauss();
    } else if (type === "bell") {
      key = ch === "o" ? `${P.kit}:m` : P.kit;
      rate = 1 + 2e-3 * this.gauss();
    } else {
      key = `SH:${"oxX".includes(ch) ? ch : "x"}`;
    }
    const room = P.room * clamp(1 - (this.bpm - 120) / 80, 0.5, 1);
    if (n === "DB" && type === "dunun" && ch !== "c" && this.sub > 0 && !opts.grace) out.push({ t, key: "SUB", gain: PLAYERS.SUB.gain * this.sub * Math.min(1.2, v * (L10 / 10)), pan: 0, rate: 1, room: 0, n: "SUB", ch: "O", step: opts.step ?? -1, grace: false });
    out.push({ t, key, gain: P.gain * Math.max(0, v), pan, rate, room, n, ch, step: opts.step ?? -1, grace: !!opts.grace, sub: opts.sub, b: opts.b });
  }
  dyn(type) {
    const E = this.E;
    return type === "bell" ? 0.75 + 0.25 * E : type === "shaker" ? 0.45 + 0.45 * E : 0.6 + 0.4 * E;
  }
  nextBar() {
    if (this.done) return null;
    const barSec = 4 * 60 / this.bpm;
    this.updateTarget();
    this.updateEnergy(barSec);
    if (this.rbar > 0 || this.stopping) this.decide(this.rbar % 4);
    const special = this.queue.length ? this.queue.shift() : null;
    if (this.hand && !special) this.stepHandover();
    const R = this.R, ppb = R.ppb, steps = 4 * ppb, bip = this.rbar % 4;
    if (!special && this.rbar % 2 === 0 && this.rbar > 0) {
      if (this.morph) this.stepMorph();
      this.presence();
    }
    if (!special && bip === 0) this.vary();
    const cbar = this.rbar % (R.cycle || 1);
    const L = special ? null : this.lead.bar(this.E, cbar, barSec);
    this.updateTempo(barSec);
    const beat = 60 / this.bpm * this.sr;
    const on = onsets(R.feel, ppb, this.bpm);
    const grid = Array.from({ length: steps }, (_, s) => (Math.floor(s / ppb) + on[s % ppb]) * beat);
    const out = [];
    const crash = this.crash;
    this.crash = false;
    if (special === "break" || special === "final") this.breakBar(out, special, grid, ppb);
    else if (special === "call") this.callBar(out, grid, ppb);
    else {
      const kase = special === "kase", fin = special === "fin";
      const dense = fin || L && L.dense, cut = L && L.cut;
      const ech = R.ech && R.ech.dun ? R.ech.dun : {};
      const cutDun = null;
      void cut;
      for (const n of ORDER) {
        if (this.muted.has(n)) continue;
        if (!this.on[n] && !(fin && (n === "DB" || n === "SB"))) continue;
        if (kase && (n === "DB" || n === "SB")) continue;
        const type = PLAYERS[n].type;
        let pat = this.part(n, ppb);
        if (!pat) continue;
        if (dense && ech[n]) pat = barOf(ech[n], steps, Math.max(0, this.elapsed));
        else if (dense && n === "DB") pat = [...pat].map((c, s) => s % ppb === 0 && c === "." ? "O" : c).join("");
        else pat = this.shape(n, pat, ppb);
        if (cutDun && type === "dunun") pat = cutDun;
        if (this.pulse && !kase && (n === "DB" || n === "DBB")) pat = this.pulsed(n, pat, ppb);
        if (crash && pat[0] === "." && /[^.]/.test(pat)) pat = (type === "dunun" ? "X" : type === "djembe" ? "S" : "X") + pat.slice(1);
        const vel2 = this.dyn(type) * (dense ? 1.06 : 1);
        for (let s = 0; s < steps; s++) {
          const c = pat[s];
          if (c === ".") continue;
          this.hit(out, n, c, grid[s], vel2 * (crash && s === 0 ? 1.2 : 1), s % ppb === 0, { step: s });
        }
      }
      let strokes = L && !this.muted.has("LEAD") ? L.strokes : [];
      if (fin) strokes = this.finLine(ppb);
      if (special === "signal") strokes = line(barOf((R.call || DEFAULTS.call[ppb]).LEAD, steps, 0), ppb);
      if (kase) strokes = this.kaseLine(ppb);
      const vel = fin || kase || special === "signal" || L && (L.dense || L.cut) ? 1 : 0.8 + 0.2 * this.E;
      if (!special && !this.hand && this.target - this.E > 0.25 && bip !== 3 && !this.acked && !this.lead.focus.length) {
        strokes = [...strokes.filter((x) => x.b < 3), ...this.lead.stream(ppb).filter((x) => x.b >= 3)];
        this.acked = true;
      }
      if (this.target - this.E < 0.1) this.acked = false;
      this.leadStrokes(out, strokes, grid, ppb, beat, vel);
    }
    const bar = { t0: this.t, len: Math.round(4 * beat), events: out, info: { bar: this.bar, rhythm: this.R.name, ppb, bpm: this.bpm, tempo: this.tempo, tempoT: this.tempoT, E: this.E, target: this.target, special, morph: this.morph ? this.morph.to.name : this.hand ? this.hand.to.name : null, lead: special || (this.hand ? "handover" : this.lead.mode), center: this.center, auto: this.auto, players: ORDER.filter((n) => this.on[n]), done: false } };
    this.t += bar.len;
    this.bar++;
    this.rbar++;
    this.elapsed++;
    if (special === "kase" && this.queue[0] !== "kase") this.crash = true;
    if (special === "break") this.endBreak();
    if (special === "call") this.crash = true;
    if (special === "final") {
      this.done = true;
      bar.info.done = true;
    }
    return bar;
  }
  leadStrokes(out, strokes, grid, ppb, beat, vel) {
    const steps = 4 * ppb;
    for (const x of strokes) {
      const onGrid = x.sub === ppb;
      const p = Math.round(x.b * ppb);
      let off;
      if (onGrid && p < steps) off = grid[p];
      else {
        const bi = Math.floor(x.b + 1e-9), q = Math.round((x.b - bi) * x.sub), f = SUBFEEL[x.sub];
        off = (bi + (f ? f[q] : q / x.sub)) * beat;
      }
      this.hit(out, "LEAD", x.c, off, vel * x.a, Math.abs(x.b - Math.round(x.b)) < 1e-6, { step: onGrid ? p : -1, sub: x.sub, b: x.b });
    }
  }
  finLine(ppb) {
    const G = DEFAULTS.ech[ppb], ech = this.R.ech || {};
    const runs = ech.runs && ech.runs.length ? ech.runs : G.runs;
    const left = this.queue.filter((q) => q === "fin").length;
    const s = left === 0 ? this.pick(ech.end && ech.end.length ? ech.end : G.end) : this.pick(runs);
    return line(barOf(s, 4 * ppb, 0), ppb);
  }
  cutLine(strokes, ppb) {
    const steps = 4 * ppb, row = Array(steps).fill(".");
    const ps = strokes.map((x) => Math.round(x.b * ppb)).filter((p) => p < steps);
    const last = Math.max(...ps);
    for (const p of ps) if (p % ppb === 0 || p === last) row[p] = "O";
    return row.join("");
  }
  kaseLine(ppb) {
    const first = this.queue[0] === "kase", g = ppb === 4 ? 3 : this.kaseG || (this.kaseG = this.pick([2, 4]));
    const p0 = first ? 0 : (g - 4 * ppb % g) % g;
    if (!first) this.kaseG = 0;
    return tile("f" + ".".repeat(g - 1), ppb, p0, 0, 99);
  }
  breakBar(out, special, grid, ppb) {
    const steps = 4 * ppb;
    const brk = this.R.break || DEFAULTS.break[ppb];
    const dj = special === "final" ? "f" + ".".repeat(steps - 1) : barOf(brk.LEAD, steps, 0);
    let dun;
    if (special === "final") dun = "X" + ".".repeat(steps - 1);
    else if (brk.DUN) dun = barOf(brk.DUN, steps, 0);
    else dun = this.cutLine(line(dj, ppb), ppb);
    for (let s = 0; s < steps; s++) {
      if (dj[s] !== ".") {
        for (const n of ["DJ1", "DJ2", "DJ3", "LEAD"]) if (n === "LEAD" || this.on[n]) this.hit(out, n, dj[s], grid[s], 1, s % ppb === 0, { step: s });
      }
      if (dun[s] !== ".") {
        for (const n of ["DB", "SB", "KK"]) if (this.on[n] || n === "DB") this.hit(out, n, dun[s], grid[s], 1, true, { step: s });
        for (const n of ["DBB", "SBB", "KKB"]) if (this.on[n] && /[^.]/.test(this.part(n, ppb) || ".")) this.hit(out, n, "X", grid[s], 0.9, true, { step: s });
      }
    }
  }
  callBar(out, grid, ppb) {
    const steps = 4 * ppb, R = this.R;
    const call = R.call || DEFAULTS.call[ppb];
    const lead = barOf(call.LEAD, steps, 0);
    for (let s = 0; s < steps; s++) if (lead[s] !== ".") this.hit(out, "LEAD", lead[s], grid[s], 1, s % ppb === 0, { step: s });
    for (const n of ["DB", "SB", "KK"]) {
      if (!call[n]) continue;
      const p = barOf(call[n], steps, 0);
      for (let s = 0; s < steps; s++) if (p[s] !== ".") this.hit(out, n, p[s], grid[s], 1, s % ppb === 0, { step: s });
    }
  }
  endBreak() {
    const a = this.after;
    this.after = null;
    if (a === "end") {
      this.queue = ["final"];
      return;
    }
    if (a === "same") {
      this.crash = true;
      this.arc *= 0.5;
      return;
    }
    const keepOn = { ...this.on };
    const base = this.base, arc = this.arc;
    this.startRhythm(a);
    this.on = keepOn;
    this.base = Math.min(base, LIMIT[this.R.ppb]);
    this.arc = arc;
    this.bpm = this.base * (1 + arc);
    this.bump = 0;
    const viaCall = this.queue[0] === "call";
    this.rbar = viaCall ? -1 : 0;
    this.elapsed = viaCall ? -1 : 0;
    if (!viaCall) this.crash = true;
  }
  stop() {
    this.stopping = true;
  }
  requestBreak() {
    this.breakReq = true;
  }
}
