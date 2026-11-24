/* Offline support — keeps the guide working with no signal */
const VERSION = "vb26-v3";
const SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./data.js", "./config.js", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
importScripts("./data.js");
const wimg = (n, w) => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(n.replace(/ /g, "_")) + "?width=" + w;
const PICS = [];
[self.TRIP.hero, self.TRIP.extraImg].forEach((n) => PICS.push(wimg(n, 1280)));
self.TRIP.days.forEach((d) => { PICS.push(wimg(d.img, 1280)); PICS.push(wimg(d.img, 960)); });

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== "vb26-media").map((k) => caches.delete(k)));
    await self.clients.claim();
    const m = await caches.open("vb26-media");
    for (const u of PICS) { try { if (!(await m.match(u))) { const r = await fetch(u, { mode: "no-cors" }); await m.put(u, r); } } catch (err) {} }
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.includes("script.google") || url.hostname.includes("script.googleusercontent")) return; // photo album API: always live
  if (url.origin === location.origin) {
    // network first (so updates show at once), fall back to the saved copy when offline or slow
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const cached = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; });
      if (!cached) return net.catch(() => Response.error());
      const timeout = new Promise((res) => setTimeout(() => res(cached), 3500));
      return Promise.race([net.catch(() => cached), timeout]);
    }));
    return;
  }
  // photos & fonts from other sites: cache first
  e.respondWith(caches.open("vb26-media").then(async (c) => {
    const cached = await c.match(req);
    if (cached) return cached;
    try { const r = await fetch(req); if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }
    catch (err) { return cached || Response.error(); }
  }));
});
