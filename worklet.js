import { Engine } from "./engine.js";
import { Mixer } from "./mixer.js";
class Drums extends AudioWorkletProcessor {
  constructor() {
    super();
    this.now = 0;
    this.genT = 0;
    this.engine = null;
    this.mixer = null;
    this.running = false;
    this.fade = 1;
    this.fading = false;
    this.port.onmessage = (e) => this.msg(e.data);
  }
  msg(d) {
    if (d.type === "kit") this.mixer = new Mixer(sampleRate, d.kit);
    else if (d.type === "start") {
      this.engine = new Engine({ sr: sampleRate, seed: d.seed, target: d.target, energy: Math.min(d.target, 0.12), tempo: d.tempo });
      this.engine.setAuto(d.auto, d.target);
      this.now = 0;
      this.genT = 0;
      this.mixer.clear();
      this.fade = 1;
      this.fading = false;
      this.running = true;
    } else if (!this.engine) return;
    else if (d.type === "target") this.engine.target = d.value;
    else if (d.type === "auto") this.engine.setAuto(d.value, d.center);
    else if (d.type === "tempo") this.engine.setTempo(d.value);
    else if (d.type === "stop") this.engine.stop();
    else if (d.type === "break") this.engine.requestBreak();
    else if (d.type === "halt") this.fading = true;
  }
  process(_, outputs) {
    const L = outputs[0][0], R = outputs[0][1] || outputs[0][0], n = L.length;
    if (!this.mixer || !this.running) return true;
    const eng = this.engine;
    while (!eng.done && this.genT < this.now + n + sampleRate * 0.3) {
      const b = eng.nextBar();
      if (!b) break;
      this.mixer.schedule(b.events);
      this.genT = b.t0 + b.len;
      this.port.postMessage({ type: "bar", info: b.info, at: b.t0 / sampleRate, now: this.now / sampleRate });
    }
    this.mixer.render(L, R, n, this.now);
    if (this.fading) {
      for (let i = 0; i < n; i++) {
        this.fade *= 0.9995;
        L[i] *= this.fade;
        R[i] *= this.fade;
      }
      if (this.fade < 1e-3) {
        this.running = false;
        this.mixer.clear();
        this.port.postMessage({ type: "ended" });
      }
    }
    this.now += n;
    if (eng.done && this.running && this.now > this.genT + sampleRate * 1.5) {
      this.running = false;
      this.port.postMessage({ type: "ended" });
    }
    return true;
  }
}
registerProcessor("drums", Drums);
