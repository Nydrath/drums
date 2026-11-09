const APP_VERSION = "td-24";
const $ = (id) => document.getElementById(id);
const store = { get: (k, d) => {
  try {
    const v = localStorage.getItem("td." + k);
    return v === null ? d : JSON.parse(v);
  } catch {
    return d;
  }
}, set: (k, v) => {
  try {
    localStorage.setItem("td." + k, JSON.stringify(v));
  } catch {
  }
} };
const S = { ctx: null, node: null, ready: false, playing: false, stopping: false, target: 0, auto: store.get("auto", false), tempo: 120 };
const NAMES = { signal: "the call", ech: "echauffement", kase: "kase", call: "the call", break: "break", final: "the last stroke", solo: "solo", frenzy: "frenzy", handover: "handing over", answer: "", quiet: "" };
function slider(el, knob, onValue) {
  const at = (e) => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
  };
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    onValue(at(e));
  });
  el.addEventListener("pointermove", (e) => {
    if (el.hasPointerCapture(e.pointerId)) onValue(at(e));
  });
  el.addEventListener("keydown", (e) => {
    const d = { ArrowUp: 0.03, ArrowRight: 0.03, ArrowDown: -0.03, ArrowLeft: -0.03 }[e.key];
    if (d) {
      onValue(Math.min(1, Math.max(0, (el._v ?? 0.5) + d)));
      e.preventDefault();
    }
  });
  return (v) => {
    el._v = v;
    knob.style.bottom = `${(v * 100).toFixed(1)}%`;
  };
}
const showTarget = slider($("slider"), $("target"), (v) => setTarget(v));
function setTarget(v, fromUser = true) {
  S.target = Math.min(1, Math.max(0, v));
  showTarget(S.target);
  $("slider").setAttribute("aria-valuenow", Math.round(S.target * 100));
  if (fromUser) {
    if (S.auto) $("center").style.bottom = `${(S.target * 100).toFixed(1)}%`;
    S.node?.port.postMessage(S.auto ? { type: "auto", value: true, center: S.target } : { type: "target", value: S.target });
  }
}
showTarget(S.target);
const TMIN = 90, TMAX = 200;
const showTempo = slider($("tempo"), $("tempoKnob"), (v) => setTempo(TMIN + v * (TMAX - TMIN)));
const tempoPos = (bpm) => (bpm - TMIN) / (TMAX - TMIN);
function setTempo(bpm) {
  S.tempo = Math.round(Math.min(TMAX, Math.max(TMIN, bpm)));
  showTempo(tempoPos(S.tempo));
  $("tempoCenter").style.bottom = `${(100 * tempoPos(S.tempo)).toFixed(1)}%`;
  $("tempoCap").textContent = `tempo ${S.tempo}`;
  $("tempo").setAttribute("aria-valuenow", S.tempo);
  S.node?.port.postMessage({ type: "tempo", value: S.tempo });
}
setTempo(S.tempo);
document.querySelectorAll(".slider").forEach((el) => el.classList.add("idle"));
function setAuto(on) {
  S.auto = on;
  store.set("auto", on);
  $("auto").setAttribute("aria-pressed", on);
  $("slider").classList.toggle("drifting", on);
  $("tempo").classList.toggle("drifting", on);
  $("center").style.bottom = `${(S.target * 100).toFixed(1)}%`;
  $("tempoCenter").style.bottom = `${(100 * tempoPos(S.tempo)).toFixed(1)}%`;
  if (!on) {
    showTarget(S.target);
    showTempo(tempoPos(S.tempo));
  }
  S.node?.port.postMessage({ type: "auto", value: on, center: S.target });
  if (!on) S.node?.port.postMessage({ type: "target", value: S.target });
}
$("auto").onclick = () => setAuto(!S.auto);
setAuto(S.auto);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") resumeOutput("return");
});
async function resumeOutput(why) {
  if (!S.playing || !S.ctx) return;
  const el = $("out"), wasPaused = S.route === "media" && el.paused, wasSuspended = S.ctx.state !== "running";
  if (!wasPaused && !wasSuspended) return;
  try {
    await S.ctx.resume();
    if (S.route === "media") await el.play();
  } catch {
  }
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
}
async function setup() {
  S.started = true;
  status("preparing the drums…");
  const ctx = new AudioContext({ latencyHint: "balanced" });
  await ctx.audioWorklet.addModule("worklet.js");
  const [buf, idx] = await Promise.all([fetch("kit/kit.ogg", { cache: "no-cache" }).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)), fetch("kit/kit.json", { cache: "no-cache" }).then((r) => r.json())]);
  const k = ctx.sampleRate / idx.sr;
  const keys = Object.fromEntries(Object.entries(idx.keys).map(([key, vs]) => [key, vs.map(([s, l]) => [Math.round(s * k), Math.floor(l * k)])]));
  const pcm = new Float32Array(buf.getChannelData(0));
  const node = new AudioWorkletNode(ctx, "drums", { numberOfInputs: 0, outputChannelCount: [2] });
  node.port.postMessage({ type: "kit", kit: { pcm, keys, gain: idx.gain } }, [pcm.buffer]);
  node.port.onmessage = (e) => onMessage(e.data);
  const el = $("out");
  S.route = "direct";
  if (new URLSearchParams(location.search).get("route") !== "direct") {
    const dest = ctx.createMediaStreamDestination();
    node.connect(dest);
    el.srcObject = dest.stream;
    S.route = "media";
    try {
      await el.play();
    } catch {
      node.disconnect();
      S.route = "direct";
    }
  }
  if (S.route === "direct") node.connect(ctx.destination);
  S.ctx = ctx;
  S.node = node;
  S.ready = true;
  status("");
}
function onMessage(d) {
  if (d.type === "bar") {
    const delay = Math.max(0, (d.at - d.now) * 1e3);
    setTimeout(() => showBar(d.info), delay);
  } else if (d.type === "ended") {
    S.playing = false;
    S.stopping = false;
    playButton();
    document.querySelectorAll(".slider").forEach((el) => el.classList.add("idle"));
    $("meta").textContent = " ";
    document.querySelectorAll("#players span").forEach((s) => s.classList.remove("on"));
    $("out").pause();
    S.ctx.suspend();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  }
}
function showBar(i) {
  if (!S.playing) return;
  if (S.breakArmed && i.special === "break") {
    S.breakArmed = false;
    $("break").classList.remove("armed");
  }
  $("rhythm").textContent = i.morph ? `${i.rhythm} → ${i.morph}` : i.rhythm;
  const what = NAMES[i.special || i.lead] ?? "";
  $("meta").textContent = `${Math.round(i.bpm)} bpm${what ? " · " + what : ""}`;
  $("energy").style.height = `${(i.E * 100).toFixed(1)}%`;
  if (S.auto) {
    showTarget(i.target);
    showTempo(tempoPos(i.tempoT ?? i.tempo));
  }
  $("tempoNow").style.height = `${(100 * (i.bpm - TMIN) / (TMAX - TMIN)).toFixed(1)}%`;
  for (const s of document.querySelectorAll("#players span")) s.classList.toggle("on", i.players.includes(s.dataset.p) || s.dataset.p === "LEAD" && i.lead !== "quiet");
  if ("mediaSession" in navigator && navigator.mediaSession.metadata?.artist !== i.rhythm) navigator.mediaSession.metadata = new MediaMetadata({ title: "Drums", artist: i.rhythm, artwork: [{ src: "icon-512.png", sizes: "512x512", type: "image/png" }] });
}
async function play() {
  if (!S.ready) await setup();
  await S.ctx.resume();
  if (S.route === "media") await $("out").play().catch(() => {
  });
  S.node.port.postMessage({ type: "start", seed: Math.floor(Math.random() * 2 ** 31), target: S.target, auto: S.auto, tempo: S.tempo });
  S.playing = true;
  S.stopping = false;
  document.querySelectorAll(".slider").forEach((el) => el.classList.remove("idle"));
  playButton();
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
}
function stop() {
  if (!S.playing) return;
  if (S.stopping) {
    S.node.port.postMessage({ type: "halt" });
    return;
  }
  S.stopping = true;
  S.node.port.postMessage({ type: "stop" });
  playButton();
}
$("break").onclick = () => {
  if (!S.playing || S.stopping || S.breakArmed) return;
  S.breakArmed = true;
  $("break").classList.add("armed");
  S.node.port.postMessage({ type: "break" });
};
function playButton() {
  $("break").disabled = !S.playing || S.stopping;
  const b = $("play");
  b.textContent = !S.playing ? "Play" : S.stopping ? "Stop now" : "Stop";
  b.classList.toggle("stop", S.playing);
}
$("play").onclick = () => S.playing ? stop() : play().catch((e) => status(window.isSecureContext ? "could not start: " + e.message : "the audio needs HTTPS: open it via https, or allow this address in chrome://flags (insecure origins treated as secure)"));
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => {
    if (!S.playing) play();
    else resumeOutput("media-play");
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    if (!S.playing) return;
    if (S.route === "media") $("out").pause();
    else S.ctx.suspend();
    navigator.mediaSession.playbackState = "paused";
  });
  navigator.mediaSession.setActionHandler("stop", () => {
    if (S.playing) {
      S.stopping = true;
      stop();
    }
  });
}
function status(t) {
  $("status").textContent = t;
}
fetch("kit/kit.json", { cache: "no-cache" }).then((r) => r.json()).then((k) => {
  const el = $("credits");
  el.append(`${APP_VERSION} · `);
  for (const [i, c] of (k.credits || []).entries()) {
    if (i) el.append(" · ");
    const a = document.createElement("a");
    a.href = c.url;
    a.textContent = `${c.what}: ${c.author.replace(/ \(.*\)$/, "")}`;
    el.append(a, ` (${c.license})`);
  }
  const all = document.createElement("a");
  all.href = "credits.html";
  all.textContent = "all credits";
  el.append(" · ", all);
  navigator.serviceWorker?.ready.then(() => el.append(" · works offline"));
}).catch(() => {
});
if ("serviceWorker" in navigator) {
  const sw = navigator.serviceWorker;
  let replacing = !!sw.controller;
  sw.addEventListener("controllerchange", () => {
    if (replacing && !S.started) location.reload();
    replacing = true;
  });
  sw.register("sw.js").catch(() => {
  });
  navigator.storage?.persist?.().catch(() => {
  });
}
