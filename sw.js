const VERSION = "td-23";
const FILES = ["./", "index.html", "style.css", "app.js", "worklet.js", "engine.js", "mixer.js", "rhythms.js", "library.js", "credits.html", "kit/kit.ogg", "kit/kit.json", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const cached = () => caches.match(e.request, { ignoreSearch: true });
  const net = fetch(e.request, { cache: "no-cache" }).then((r) => {
    if (r.ok && new URL(e.request.url).origin === location.origin) {
      const copy = r.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
    }
    return r;
  });
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const finish = (r) => {
      if (!done && r) {
        done = true;
        resolve(r);
      }
    };
    net.then(finish).catch(() => cached().then((c) => {
      if (c) finish(c);
      else if (!done) {
        done = true;
        resolve(Response.error());
      }
    }));
    setTimeout(() => cached().then(finish), 4e3);
  }));
});
