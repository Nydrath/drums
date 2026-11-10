const ROOM_DELAYS = [0.0297, 0.0371, 0.0411, 0.0437, 0.0533, 0.0617];
export class Mixer {
  constructor(sr, kit, { master = 0.38, roomTime = 0.8, wet = 1, levelThr = 0.12 } = {}) {
    this.sr = sr;
    this.pcm = kit.pcm;
    this.keys = kit.keys;
    this.kitGain = kit.gain || 1;
    this.master = master;
    this.pending = [];
    this.voices = [];
    this.last = {};
    this.seed = 12345;
    this.lines = ROOM_DELAYS.map((d) => new Float32Array(Math.round(d * sr)));
    this.lineIdx = this.lines.map(() => 0);
    this.lp = this.lines.map(() => 0);
    this.fb = this.lines.map((b) => Math.pow(10, -3 * b.length / sr / roomTime));
    this.damp = 1 - Math.exp(-2 * Math.PI * 5e3 / sr);
    this.wet = wet;
    this.tap = new Float32Array(ROOM_DELAYS.length);
    this.pre = new Float32Array(Math.round(8e-3 * sr));
    this.preIdx = 0;
    this.la = Math.round(2e-3 * sr);
    this.dl = [new Float32Array(this.la), new Float32Array(this.la)];
    this.dlIdx = 0;
    this.dq = { v: new Float32Array(this.la + 2), i: new Float64Array(this.la + 2), head: 0, tail: 0 };
    this.n = 0;
    this.g = 1;
    this.att = 1 - Math.exp(-1 / (this.la / 3));
    this.rel = 1 - Math.exp(-1 / (0.12 * sr));
    this.thr = 0.95;
    this.trim = 0.926;
    this.knee = 0.7;
    this.clipped = 0;
    this.ls = [0, 0];
    this.lsA = 1 - Math.exp(-2 * Math.PI * 100 / sr);
    this.lsG = Math.pow(10, 3 / 20) - 1;
    this.ms = 0;
    this.hpLv = 0;
    this.hpA = 1 - Math.exp(-2 * Math.PI * 150 / sr);
    this.lvA = 1 / (1.2 * sr);
    this.lvThr = levelThr;
    this.lvRatio = 2.5;
    this.lvGain = 1;
    this.reduction = 0;
    this.chokeStep = 1 / (0.03 * sr);
    this.scratch = { L: new Float32Array(128), R: new Float32Array(128), S: new Float32Array(128) };
  }
  clip(x) {
    const k = this.knee, a = Math.abs(x);
    if (a <= k) return x;
    this.clipped++;
    const y = k + (1 - k) * Math.tanh((a - k) / (1 - k));
    return x < 0 ? -y : y;
  }
  rand() {
    this.seed = this.seed * 1664525 + 1013904223 >>> 0;
    return this.seed / 4294967296;
  }
  schedule(events) {
    for (const e of events) this.pending.push(e);
    this.pending.sort((a, b) => a.t - b.t);
  }
  start(e, offset) {
    const vs = this.keys[e.key] || this.keys[e.key.replace(/:g$/, ":T").replace(/:s$/, ":S").replace(/:m$/, "")];
    if (!vs) return;
    let i = Math.floor(this.rand() * vs.length);
    if (vs.length > 1 && i === this.last[e.key]) i = (i + 1) % vs.length;
    this.last[e.key] = i;
    const [start, len] = vs[i];
    const a = (e.pan + 1) * Math.PI / 4;
    const g = e.gain * this.kitGain;
    if (e.n) {
      for (const o of this.voices) if (o.group === e.n && !o.fade) o.fade = { at: offset, k: 1 };
    }
    this.voices.push({ start, len, pos: 0, rate: e.rate || 1, gl: g * Math.cos(a), gr: g * Math.sin(a), send: g * (e.room || 0), at: offset, group: e.n });
  }
  render(outL, outR, frames, now) {
    if (this.scratch.L.length < frames) this.scratch = { L: new Float32Array(frames), R: new Float32Array(frames), S: new Float32Array(frames) };
    const L = this.scratch.L, R = this.scratch.R, S = this.scratch.S;
    L.fill(0, 0, frames);
    R.fill(0, 0, frames);
    S.fill(0, 0, frames);
    const end = now + frames;
    while (this.pending.length && this.pending[0].t < end) {
      const e = this.pending.shift();
      this.start(e, Math.max(0, e.t - now));
    }
    const pcm = this.pcm;
    for (let v = this.voices.length - 1; v >= 0; v--) {
      const o = this.voices[v];
      let i, pos;
      if (o.at !== null) {
        i = Math.ceil(o.at);
        if (i >= frames) {
          o.at -= frames;
          continue;
        }
        pos = (i - o.at) * o.rate;
        o.at = null;
      } else {
        i = 0;
        pos = o.pos;
      }
      const { start, len, rate, gl, gr, send } = o;
      const F = o.fade, fadeFrom = F ? Math.max(0, Math.ceil(F.at)) : frames, step = this.chokeStep;
      let k = F ? F.k : 1;
      for (; i < frames; i++) {
        const p = Math.floor(pos);
        if (p >= len - 1) break;
        const f = pos - p;
        let x = pcm[start + p] * (1 - f) + pcm[start + p + 1] * f;
        if (i >= fadeFrom) {
          k -= step;
          if (k <= 0) {
            k = 0;
            break;
          }
          x *= k;
        }
        L[i] += x * gl;
        R[i] += x * gr;
        S[i] += x * send;
        pos += rate;
      }
      if (F) {
        F.k = k;
        F.at = 0;
      }
      if (Math.floor(pos) >= len - 1 || F && k <= 0) this.voices.splice(v, 1);
      else o.pos = pos;
    }
    const lines = this.lines, n = lines.length, out = this.tap;
    for (let i = 0; i < frames; i++) {
      const x = this.pre[this.preIdx];
      this.pre[this.preIdx] = S[i];
      this.preIdx = (this.preIdx + 1) % this.pre.length;
      let sum = 0;
      for (let k = 0; k < n; k++) {
        out[k] = lines[k][this.lineIdx[k]];
        sum += out[k];
      }
      const h = 2 * sum / n;
      for (let k = 0; k < n; k++) {
        const y = (out[k] - h) * this.fb[k];
        this.lp[k] += this.damp * (y - this.lp[k]);
        lines[k][this.lineIdx[k]] = x + this.lp[k];
        this.lineIdx[k] = (this.lineIdx[k] + 1) % lines[k].length;
      }
      L[i] += this.wet * (out[0] + out[2] + out[4]) * 0.5;
      R[i] += this.wet * (out[1] + out[3] + out[5]) * 0.5;
    }
    const la = this.la, thr = this.thr;
    let red = 0;
    for (let i = 0; i < frames; i++) {
      this.ls[0] += this.lsA * (L[i] - this.ls[0]);
      this.ls[1] += this.lsA * (R[i] - this.ls[1]);
      L[i] += this.lsG * this.ls[0];
      R[i] += this.lsG * this.ls[1];
      const m0 = 0.5 * (L[i] + R[i]) * this.master;
      this.hpLv += this.hpA * (m0 - this.hpLv);
      const m = m0 - this.hpLv;
      this.ms += this.lvA * (m * m - this.ms);
      const lev = Math.sqrt(this.ms);
      const lg = lev > this.lvThr ? Math.pow(this.lvThr / lev, 1 - 1 / this.lvRatio) : 1;
      const l = this.clip(L[i] * this.master * lg), r = this.clip(R[i] * this.master * lg);
      this.lvGain = lg;
      const a = Math.max(Math.abs(l), Math.abs(r)), q = this.dq, M = q.v.length;
      while (q.tail > q.head && q.v[(q.tail - 1) % M] <= a) q.tail--;
      q.v[q.tail % M] = a;
      q.i[q.tail % M] = this.n;
      q.tail++;
      while (q.i[q.head % M] <= this.n - la) q.head++;
      const pk = q.v[q.head % M];
      this.n++;
      const want = pk > thr ? thr / pk : 1;
      this.g += (want < this.g ? this.att : this.rel) * (want - this.g);
      const dl = this.dl[0][this.dlIdx], dr = this.dl[1][this.dlIdx];
      this.dl[0][this.dlIdx] = l;
      this.dl[1][this.dlIdx] = r;
      this.dlIdx = (this.dlIdx + 1) % la;
      const g = this.g;
      let yl = dl * g, yr = dr * g;
      yl = yl > 0.98 ? 0.98 + 0.02 * Math.tanh((yl - 0.98) / 0.02) : yl < -0.98 ? -0.98 + 0.02 * Math.tanh((yl + 0.98) / 0.02) : yl;
      yr = yr > 0.98 ? 0.98 + 0.02 * Math.tanh((yr - 0.98) / 0.02) : yr < -0.98 ? -0.98 + 0.02 * Math.tanh((yr + 0.98) / 0.02) : yr;
      outL[i] = yl * this.trim;
      outR[i] = yr * this.trim;
      if (1 - g > red) red = 1 - g;
    }
    this.reduction = red;
  }
  clear() {
    this.pending = [];
    this.voices = [];
  }
}
