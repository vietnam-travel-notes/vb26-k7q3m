/* Vietnam & Bangkok 2026 — family travel guide */
(function () {
  "use strict";
  const T = self.TRIP;
  const CFG = window.TRIP_CONFIG || {};
  const SCRIPT = (CFG.photoScriptUrl || "").trim();
  const app = document.getElementById("app");
  const DAYS = T.days;

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const wimg = (name, w = 1280) => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(name.replace(/ /g, "_")) + "?width=" + w;
  const pad = (n) => String(n).padStart(2, "0");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  function toast(msg, ms = 2600) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  const mapsLink = (q) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

  /* Time in Vietnam/Thailand (both UTC+7). ?sim=2026-12-20T10:30 lets you preview a moment. */
  (function () {
    const m = location.search.match(/sim=([0-9T:\-]+)/);
    if (m) sessionStorage.setItem("vb_sim", m[1]);
  })();
  function nowICT() {
    const sim = sessionStorage.getItem("vb_sim");
    let d = new Date();
    if (sim) { const s = new Date(sim + ":00+07:00"); if (!isNaN(s)) d = s; }
    const p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: T.tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d).forEach((x) => (p[x.type] = x.value));
    const hh = p.hour === "24" ? 0 : +p.hour;
    return { real: d, date: `${p.year}-${p.month}-${p.day}`, min: hh * 60 + +p.minute };
  }
  const dayByDate = (date) => DAYS.find((d) => d.date === date);
  function itemMin(it) {
    const [h, m] = it.t.split(":").map(Number);
    let v = h * 60 + m;
    if (it.tz === "IST") v += 90;
    if (it.nextDay) v += 1440;
    return v;
  }
  function nowIndex(day) {
    const n = nowICT();
    if (n.date !== day.date) return n.date > day.date ? day.schedule.length : -1;
    let idx = -1;
    day.schedule.forEach((it, i) => { if (itemMin(it) <= n.min) idx = i; });
    return idx;
  }
  function phase() {
    const n = nowICT();
    if (n.date < DAYS[0].date) return "before";
    if (n.date > DAYS[DAYS.length - 1].date) return "after";
    return "during";
  }

  /* ---------------- shared bits ---------------- */
  const hotelById = (id) => T.hotels.find((h) => h.id === id);

  function heroHTML({ img, by, eyebrow, title, lede, short, back, extra = "" }) {
    return `<section class="hero ${short ? "short" : ""}">
      <div class="bg" style="background-image:url('${wimg(img, 1280)}')"></div>
      <div class="top">${back ? `<a class="backbtn" href="${back}" aria-label="Back">←</a>` : `<div class="brand">V<b>·</b>B <b>MMXXVI</b></div>`}<span></span></div>
      <div class="inner">
        ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}
        <h1>${title}</h1>
        ${lede ? `<p class="lede">${lede}</p>` : ""}
        ${extra}
      </div>
      <div class="credit">Photo: ${esc(by)} · Wikimedia Commons</div>
    </section>`;
  }

  function timelineHTML(day) {
    const ni = nowIndex(day);
    const isToday = nowICT().date === day.date;
    return `<div class="legend"><span class="p">From your plan</span><span>Suggested</span></div>
    <ul class="tl">${day.schedule.map((it, i) => {
      const cls = [it.plan ? "plan" : "", isToday && i < ni ? "past" : "", isToday && i === ni ? "now" : ""].join(" ");
      const sub = it.tz === "IST" ? "India time" : it.nextDay ? "+1 day" : "";
      return `<li class="${cls}"><div class="time">${esc(it.t)}${sub ? `<small>${sub}</small>` : ""}</div>
        <div><div class="txt">${esc(it.txt)}</div>${isToday && i === ni ? `<span class="chip plan">Now</span>` : ""}</div></li>`;
    }).join("")}</ul>`;
  }

  function checklistHTML(limitKey) {
    const st = store.get("vb_check", {});
    const items = T.checklist;
    const done = items.filter((c) => st[c.id]).length;
    return `<div class="progress"><i style="width:${Math.round((done / items.length) * 100)}%"></i></div>
      <div class="muted" style="font-size:12px;margin-bottom:6px">${done} of ${items.length} done · ticks are saved on this phone</div>
      ${items.map((c) => `<label class="check ${st[c.id] ? "done" : ""}">
        <input type="checkbox" data-check="${c.id}" ${st[c.id] ? "checked" : ""}>
        <div><div class="h">${esc(c.item)}${c.key && !st[c.id] ? `<span class="key">Important</span>` : ""}</div>${c.detail ? `<div class="d muted" style="font-size:13.5px">${esc(c.detail)}</div>` : ""}</div>
      </label>`).join("")}`;
  }
  function bindChecklist(root) {
    root.querySelectorAll("[data-check]").forEach((el) =>
      el.addEventListener("change", () => {
        const st = store.get("vb_check", {});
        st[el.dataset.check] = el.checked; store.set("vb_check", st);
        render(true);
      })
    );
  }

  function showDriver(id) {
    const h = hotelById(id); if (!h || !h.local) return;
    const o = document.createElement("div");
    o.className = "overlay";
    o.innerHTML = `<button class="close" aria-label="Close">×</button>
      <div class="driver"><div class="eyebrow" style="margin-bottom:18px">Please take us here</div>
      <div class="local">${esc(h.local)}</div><div class="en">${esc(h.name)}<br>${esc(h.address)}</div>
      <div class="btnrow" style="justify-content:center;margin-top:26px"><a class="btn sm" href="${mapsLink(h.map)}" target="_blank" rel="noopener">Open in Maps</a>${h.phone ? `<a class="btn sm" href="tel:${h.phone.replace(/\s/g, "")}">Call hotel</a>` : ""}</div></div>`;
    o.querySelector(".close").onclick = () => o.remove();
    document.body.appendChild(o);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-driver]");
    if (b) { e.preventDefault(); showDriver(b.dataset.driver); }
  });

  /* ---------------- TODAY ---------------- */
  function viewToday() {
    const ph = phase();
    if (ph === "before") return viewBefore();
    if (ph === "after") return viewAfter();
    const n = nowICT();
    const day = dayByDate(n.date);
    const ni = nowIndex(day);
    const cur = day.schedule[ni], next = day.schedule[ni + 1];
    const tomorrow = DAYS[day.n];
    const h = hotelById(day.hotel);
    const st = store.get("vb_check", {});
    const tdacDue = day.n >= 6 && day.n <= 9 && !st.tdac;
    let nowBlock;
    if (!cur) nowBlock = `<div class="k"><span class="pulse"></span>First up today</div><div class="t">${esc(next.t)}</div><div class="x">${esc(next.txt)}</div>`;
    else nowBlock = `<div class="k"><span class="pulse"></span>Right now</div><div class="t">${esc(cur.t)}</div><div class="x">${esc(cur.txt)}</div>` +
      (next ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)"><div class="k">Next · ${esc(next.t)}${next.tz === "IST" ? " India time" : ""}</div><div class="x" style="margin-top:4px">${esc(next.txt)}</div></div>`
        : tomorrow ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)"><div class="k">Tomorrow · Day ${tomorrow.n}</div><div class="x" style="margin-top:4px">${esc(tomorrow.title)} — first up at ${esc(tomorrow.schedule[0].t)}</div></div>` : "");
    return heroHTML({ img: day.img, by: day.imgBy, short: true, eyebrow: `Day ${pad(day.n)} of 11 · ${esc(day.label)} · ${esc(day.city)}`, title: esc(day.title), lede: esc(day.tagline) }) +
      `<div class="sec" style="padding-top:8px">
        <div class="card nowcard">${nowBlock}</div>
        ${tdacDue ? `<div class="flag"><div class="h">Thailand arrival card (TDAC)</div><div class="d">Fill it in for all three before Thu 24 Dec at <a href="https://tdac.immigration.go.th/" target="_blank" rel="noopener">tdac.immigration.go.th</a>. Tick it off in Essentials when done.</div></div>` : ""}
        <div class="btnrow">
          ${h && h.local ? `<button class="btn sm" data-driver="${h.id}">Tonight: ${esc(h.city)} hotel</button>` : ""}
          <a class="btn sm" href="#photos">Add today's photos</a>
          <a class="btn sm" href="#day/${day.n}">Full day details</a>
        </div>
      </div>
      <div class="sec"><div class="eyebrow">Today's rhythm</div><h2>The day, hour by hour</h2>${timelineHTML(day)}</div>
      <div class="sec"><div class="eyebrow">Where we sleep tonight</div><div class="card"><div class="h" style="font-family:var(--serif);font-size:22px">${esc(day.sleep)}</div></div></div>`;
  }

  function countdownParts() {
    const ms = new Date(T.departUTC) - nowICT().real;
    const s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) };
  }
  function viewBefore() {
    const c = countdownParts();
    return heroHTML({
      img: T.hero, by: T.heroBy,
      eyebrow: "16 – 26 December 2026",
      title: `Vietnam <em>&amp;</em><br>Bangkok`,
      lede: "Eleven days, five cities, three of us.",
      extra: `<div class="count" id="count"><div><div class="num">${c.d}</div><div class="lab">days</div></div><div><div class="num">${pad(c.h)}</div><div class="lab">hours</div></div><div><div class="num">${pad(c.m)}</div><div class="lab">minutes</div></div></div>
      <div class="muted" style="font-size:12px;margin-top:8px">until the 04:10 flight to Hanoi</div>`,
    }) +
      `<div class="sec"><div class="eyebrow">Before we fly</div><h2>Things to sort out</h2><div class="card">${checklistHTML()}</div></div>
      <div class="sec"><div class="eyebrow">At a glance</div><h2>The route</h2>
        <div class="card"><ul class="rows">${DAYS.map((d) => `<li><a href="#day/${d.n}" style="text-decoration:none;color:inherit;display:flex;gap:14px;align-items:baseline">
          <span class="serif" style="font-size:22px;color:var(--gold2);min-width:28px">${pad(d.n)}</span>
          <span><span class="h">${esc(d.title)}</span><span class="d" style="display:block">${esc(d.label)} · ${esc(d.city)}</span></span></a></li>`).join("")}</ul></div>
        <div class="btnrow"><a class="btn solid block" href="#journey">Explore the journey</a></div>
      </div>`;
  }
  function viewAfter() {
    const n = store.get("vb_photos", []).length;
    return heroHTML({ img: T.extraImg, by: T.extraBy, eyebrow: "Vietnam & Bangkok · December 2026", title: "Welcome <em>home</em>", lede: "Eleven days we'll talk about for years." }) +
      `<div class="sec"><div class="card" style="text-align:center"><div class="big">${n}</div><div class="muted">memories in our album</div>
      <div class="btnrow" style="justify-content:center"><a class="btn solid" href="#photos">Open our album</a><a class="btn" href="#journey">Relive each day</a></div></div></div>`;
  }

  /* ---------------- JOURNEY ---------------- */
  function viewJourney() {
    const today = nowICT().date;
    return `<div class="sec" style="padding-top:calc(var(--safe-t) + 34px)"><div class="eyebrow">Eleven days · Five cities</div><h2 style="font-size:44px;margin-bottom:22px">The <em class="serif" style="color:var(--gold2)">Journey</em></h2></div>
    <div class="journey">${DAYS.map((d) => `<a class="dcard ${d.date === today ? "today" : ""}" href="#day/${d.n}">
      <div class="bg" style="background-image:url('${wimg(d.img, 960)}')"></div>
      ${d.date === today ? `<span class="badge">Today</span>` : ""}
      <div class="n">${pad(d.n)}</div>
      <div class="in"><div class="eyebrow">${esc(d.label)} · ${esc(d.city)}</div><h3>${esc(d.title)}</h3><div class="tg">${esc(d.tagline)}</div></div>
    </a>`).join("")}</div>`;
  }

  /* ---------------- DAY ---------------- */
  function viewDay(n) {
    const d = DAYS[n - 1]; if (!d) return viewJourney();
    const prev = DAYS[n - 2], next = DAYS[n];
    const h = hotelById(d.hotel);
    const flags = d.bookings.filter((b) => b.flag), books = d.bookings.filter((b) => !b.flag);
    const photos = store.get("vb_photos", []).filter((p) => +p.day === d.n);
    return heroHTML({ img: d.img, by: d.imgBy, short: true, back: "#journey", eyebrow: `Day ${pad(d.n)} · ${esc(d.label)} · ${esc(d.city)}`, title: esc(d.title), lede: esc(d.tagline) }) +
      `${flags.map((f) => `<div style="padding:0 22px"><div class="flag"><div class="h">${esc(f.type.replace(/^Flag:\s*/i, ""))}</div><div class="d">${esc(f.detail)}</div></div></div>`).join("")}
      <div class="sec"><div class="eyebrow">Tonight</div><div class="card"><div style="font-family:var(--serif);font-size:23px">${esc(d.sleep)}</div>
        ${h ? `<div class="muted" style="font-size:13.5px;margin-top:4px">${esc(h.address)}</div><div class="btnrow">${h.local ? `<button class="btn sm" data-driver="${h.id}">Show the driver</button>` : ""}<a class="btn sm" href="${mapsLink(h.map)}" target="_blank" rel="noopener">Map</a></div>` : ""}
      </div></div>
      <div class="sec"><div class="eyebrow">Hour by hour</div><h2>The day</h2>${timelineHTML(d)}</div>
      <div class="rule"></div>
      <div class="sec"><div class="eyebrow">Getting around</div><h2>How to get there</h2><div class="card"><ul class="rows">${d.travel.map((t) => `<li><div class="h">${esc(t.place)}</div><div class="d">${esc(t.how)}</div><a href="${mapsLink(t.place.replace(/\(transfer\)/i, "") + ", " + d.city)}" target="_blank" rel="noopener" style="font-size:12px">Map →</a></li>`).join("")}</ul></div></div>
      <div class="sec"><div class="eyebrow">Where to eat</div><h2>Lunch &amp; dinner</h2><div class="food">
        ${["Lunch", "Dinner"].map((m) => d.food[m].length ? `<div class="card"><div class="meal">${m}</div><ul>${d.food[m].map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>` : "").join("")}
      </div><div class="note">Restaurant names are suggestions — check opening hours on the day. See the Dish decoder in Essentials for what's in each dish.</div></div>
      <div class="sec"><div class="eyebrow">Bookings</div><h2>What's booked</h2><div class="card"><ul class="rows">${books.map((b) => `<li><div class="d" style="color:#e5ddcf">${esc(b.detail)}</div></li>`).join("")}</ul></div></div>
      ${photos.length ? `<div class="sec"><div class="eyebrow">Our photos from this day</div><div class="masonry" style="margin-top:12px">${photos.slice(0, 6).map((p) => `<button data-open="${esc(p.id)}"><img loading="lazy" src="${thumb(p.id, 600)}" onerror="this.onerror=null;this.src='${thumbAlt(p.id, 600)}'" alt=""></button>`).join("")}</div><a class="btn sm" href="#photos" style="margin-top:6px">See all ${photos.length}</a></div>` : ""}
      <div class="daynav">${prev ? `<a href="#day/${prev.n}">← Day ${prev.n}<b>${esc(prev.title)}</b></a>` : "<span></span>"}${next ? `<a class="r" href="#day/${next.n}">Day ${next.n} →<b>${esc(next.title)}</b></a>` : "<span></span>"}</div>`;
  }

  /* ---------------- STAYS & FLIGHTS ---------------- */
  function viewStays() {
    return `<div class="sec" style="padding-top:calc(var(--safe-t) + 34px)"><div class="eyebrow">Getting there</div><h2 style="font-size:40px">Flights</h2>
      ${T.flights.map((f) => `<div class="card flight">
        <div class="eyebrow">Day ${f.day} · ${esc(f.date)}${f.airline ? " · " + esc(f.airline) : ""}</div>
        <div class="route"><div class="code">${esc(f.fromCode)}</div><div class="line"></div><div class="code">${esc(f.toCode)}</div></div>
        <div class="tm"><div><b>${esc(f.dep)}</b>${esc(f.from)}${f.depTz ? `<br><small>${esc(f.depTz)}</small>` : ""}</div><div style="text-align:right"><b>${esc(f.arr)}</b>${esc(f.to)}${f.arrTz ? `<br><small>${esc(f.arrTz)}</small>` : ""}</div></div>
        ${f.via ? `<div class="muted" style="font-size:12.5px;margin-top:10px">Booked on ${esc(f.via)}</div>` : ""}
        ${f.flag ? `<div class="flag" style="margin-bottom:0"><div class="d">${esc(f.flag)}</div></div>` : ""}
      </div>`).join("")}
      <div class="note">Times are local unless marked. Vietnam and Thailand are both 1 hr 30 min ahead of India.</div>
    </div>
    <div class="rule"></div>
    <div class="sec"><div class="eyebrow">Where we sleep</div><h2 style="font-size:40px">Stays</h2>
      ${T.hotels.map((h) => `<div class="card hotel">
        <div class="eyebrow">${esc(h.city)} · ${esc(h.dates)}</div>
        <h3>${esc(h.name)}</h3>
        <div class="muted" style="font-size:14px">${esc(h.address)}</div>
        <div style="font-size:14px;margin-top:10px;color:#e1d8ca">${esc(h.note)}</div>
        ${h.via ? `<div class="muted" style="font-size:12.5px;margin-top:8px">Booked on ${esc(h.via)}</div>` : ""}
        <div class="btnrow">${h.local ? `<button class="btn sm solid" data-driver="${h.id}">Show the driver</button>` : ""}<a class="btn sm" href="${mapsLink(h.map)}" target="_blank" rel="noopener">Map</a>${h.phone ? `<a class="btn sm" href="tel:${h.phone.replace(/\s/g, "")}">Call</a>` : ""}</div>
      </div>`).join("")}
    </div>`;
  }

  /* ---------------- PHOTOS ---------------- */
  const thumb = (id, w) => `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${w}`;
  const thumbAlt = (id, w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
  let photoFilter = "All";
  let loadingList = false;

  async function refreshPhotos(silent) {
    if (!SCRIPT || loadingList) return;
    loadingList = true;
    try {
      const r = await fetch(SCRIPT + "?action=list&t=" + Date.now(), { redirect: "follow" });
      const j = await r.json();
      if (j.ok) { store.set("vb_photos", j.photos || []); if (location.hash.startsWith("#photos") || location.hash.startsWith("#day")) render(true); }
      else if (!silent) toast("Couldn't load photos: " + (j.error || "unknown"));
    } catch (e) { if (!silent) toast("Offline — showing saved photos"); }
    loadingList = false;
  }

  function currentTripDay() {
    const d = dayByDate(nowICT().date);
    return d ? d.n : 1;
  }

  function viewPhotos() {
    const photos = store.get("vb_photos", []);
    const who = store.get("vb_who", "");
    const head = `<div class="sec" style="padding-top:calc(var(--safe-t) + 34px)"><div class="eyebrow">Our memories</div><h2 style="font-size:44px;margin-bottom:6px">The <em class="serif" style="color:var(--gold2)">Album</em></h2>
      <div class="muted">${photos.length} photo${photos.length === 1 ? "" : "s"} from the three of us</div></div>`;
    if (!SCRIPT) {
      return head + `<div class="sec"><div class="card empty"><div class="serif">The album isn't connected yet</div><p>Paste the Google script link into <b>config.js</b> (Step 3 of the setup guide) and this page will come alive.</p></div></div>`;
    }
    const filters = ["All", ...T.family];
    const shown = photos.filter((p) => photoFilter === "All" || p.by === photoFilter);
    const byDay = {};
    shown.forEach((p) => (byDay[p.day] = byDay[p.day] || []).push(p));
    return head + `<div class="sec" style="padding-top:14px"><div class="card uploader">
        <div class="eyebrow">Add photos</div>
        <div class="who">${T.family.map((f) => `<button data-who="${f}" class="${who === f ? "on" : ""}">${f}</button>`).join("")}</div>
        <select class="field" id="upDay">${DAYS.map((d) => `<option value="${d.n}" ${d.n === currentTripDay() ? "selected" : ""}>Day ${d.n} · ${esc(d.label)} · ${esc(d.city)}</option>`).join("")}</select>
        <input class="field" id="upCap" placeholder="Caption (optional)" maxlength="140">
        <label class="filelab"><input type="file" id="upFiles" accept="image/*" multiple>＋ Choose photos</label>
        <div class="qlist" id="qlist"></div>
      </div>
      <div class="btnrow" style="justify-content:space-between"><div class="filters">${filters.map((f) => `<button data-filter="${f}" class="${photoFilter === f ? "on" : ""}">${f}</button>`).join("")}</div>
      <button class="btn sm" id="refresh">↻</button></div>
      ${shown.length ? "" : `<div class="card empty" style="margin-top:16px"><div class="serif">No photos yet</div><p>Choose your name, pick the day and add your first memory.</p></div>`}
      ${Object.keys(byDay).sort((a, b) => a - b).map((k) => { const d = DAYS[k - 1]; const ps = byDay[k].sort((a, b) => a.ts - b.ts); return `<div class="gallery-day"><h3>Day ${k} · ${esc(d ? d.city : "")}<small>${ps.length}</small></h3>
        <div class="masonry">${ps.map((p) => `<button data-open="${esc(p.id)}"><img loading="lazy" src="${thumb(p.id, 600)}" onerror="this.onerror=null;this.src='${thumbAlt(p.id, 600)}'" alt="${esc(p.caption || "")}"><span class="by">${esc(p.by || "")}</span></button>`).join("")}</div></div>`; }).join("")}
    </div>`;
  }

  function bindPhotos() {
    app.querySelectorAll("[data-who]").forEach((b) => (b.onclick = () => { store.set("vb_who", b.dataset.who); render(true); }));
    app.querySelectorAll("[data-filter]").forEach((b) => (b.onclick = () => { photoFilter = b.dataset.filter; render(true); }));
    const rf = app.querySelector("#refresh"); if (rf) rf.onclick = () => { toast("Refreshing…", 1200); refreshPhotos(); };
    const inp = app.querySelector("#upFiles"); if (inp) inp.onchange = () => uploadFiles([...inp.files]);
  }

  function askCode() {
    let code = store.get("vb_code", "");
    if (!code) {
      code = (prompt("Family code (only needed the first time on this phone):") || "").trim();
      if (code) store.set("vb_code", code);
    }
    return code;
  }

  function resizeImage(file, max = 2048, q = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        let w = im.naturalWidth, h = im.naturalHeight;
        const s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", q).split(",")[1]);
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This photo format couldn't be read")); };
      im.src = url;
    });
  }

  let uploading = false;
  async function uploadFiles(files) {
    if (!files.length || uploading) return;
    const who = store.get("vb_who", "");
    if (!who) { toast("First tap your name"); return; }
    const code = askCode(); if (!code) return;
    const day = +app.querySelector("#upDay").value;
    const caption = app.querySelector("#upCap").value.trim();
    const q = app.querySelector("#qlist");
    uploading = true;
    q.innerHTML = files.map((f, i) => `<div id="q${i}"><span>${esc(f.name.slice(0, 28))}</span><span>waiting</span></div>`).join("");
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const row = q.querySelector("#q" + i + " span:last-child");
      try {
        row.textContent = "preparing…";
        const data = await resizeImage(files[i]);
        row.textContent = "uploading…";
        const r = await fetch(SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "upload", code, day, by: who, caption, name: files[i].name, data, taken: files[i].lastModified || Date.now() }) });
        const j = await r.json();
        if (!j.ok) { if (j.error === "bad code") { store.set("vb_code", ""); throw new Error("wrong family code"); } throw new Error(j.error || "failed"); }
        row.textContent = "✓ saved"; ok++;
      } catch (e) { row.textContent = "✗ " + e.message; if (/family code/.test(e.message)) break; }
    }
    uploading = false;
    toast(ok ? `${ok} photo${ok > 1 ? "s" : ""} added to the album` : "Nothing uploaded — check the list");
    if (ok) refreshPhotos(true);
  }

  /* Lightbox */
  function openLightbox(id) {
    const all = store.get("vb_photos", []).slice().sort((a, b) => a.day - b.day || a.ts - b.ts);
    let i = Math.max(0, all.findIndex((p) => p.id === id));
    let timer = null;
    const o = document.createElement("div");
    o.className = "lb";
    o.innerHTML = `<div class="bar"><button class="ib" data-x>×</button><div style="display:flex;gap:8px"><button class="ib" data-play title="Slideshow">▶</button><a class="ib" data-dl target="_blank" rel="noopener" title="Download">↓</a><button class="ib" data-del title="Delete">🗑</button></div></div>
      <div class="stage"><img alt=""></div><div class="cap"></div>`;
    const img = o.querySelector("img"), cap = o.querySelector(".cap");
    function show() {
      const p = all[i]; if (!p) return;
      img.style.opacity = 0;
      img.onload = () => (img.style.opacity = 1);
      img.onerror = () => { img.onerror = null; img.src = thumbAlt(p.id, 2000); };
      img.src = thumb(p.id, 2000);
      const d = DAYS[p.day - 1];
      cap.innerHTML = `<b>${esc(p.caption || (d ? d.title : ""))}</b><br>Day ${p.day}${d ? " · " + esc(d.city) : ""} · by ${esc(p.by || "")} · ${i + 1} of ${all.length}`;
      o.querySelector("[data-dl]").href = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(p.id)}`;
    }
    const go = (k) => { i = (i + k + all.length) % all.length; show(); };
    o.querySelector("[data-x]").onclick = () => { clearInterval(timer); o.remove(); };
    o.querySelector("[data-play]").onclick = (e) => {
      if (timer) { clearInterval(timer); timer = null; e.target.textContent = "▶"; }
      else { timer = setInterval(() => go(1), 4000); e.target.textContent = "❚❚"; }
    };
    o.querySelector("[data-del]").onclick = async () => {
      const p = all[i];
      if (!confirm("Remove this photo from the album?")) return;
      const code = askCode(); if (!code) return;
      try {
        const r = await fetch(SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "delete", code, id: p.id }) });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error);
        store.set("vb_photos", store.get("vb_photos", []).filter((x) => x.id !== p.id));
        all.splice(i, 1); toast("Removed");
        if (!all.length) { o.remove(); render(true); return; }
        i = i % all.length; show(); render(true);
      } catch (e) { toast("Couldn't remove: " + e.message); }
    };
    let sx = 0;
    o.querySelector(".stage").addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
    o.querySelector(".stage").addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
    o.querySelector(".stage").addEventListener("click", (e) => { const x = e.clientX / window.innerWidth; if (x < 0.3) go(-1); else if (x > 0.7) go(1); });
    document.body.appendChild(o);
    show();
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openLightbox(b.dataset.open); });

  /* ---------------- ESSENTIALS ---------------- */
  const E = {
    visa: `<table class="t">
      <tr><td>Vietnam</td><td>Indian passports need a visa. Apply for the <b>e-visa</b> only on the official site <a href="https://evisa.gov.vn" target="_blank" rel="noopener">evisa.gov.vn</a> — USD 25 single entry (you enter Vietnam once). Allow about a week. Print or save the PDF approval for each of you.</td></tr>
      <tr><td>Thailand</td><td>From 15 Sep 2026 Indian passport holders can visit visa-free for up to 30 days. Passport must be valid at least 6 months from arrival. Carry your return ticket and hotel booking.</td></tr>
      <tr><td>Thai arrival card</td><td>The <b>TDAC</b> is free and must be filled in within 72 hours before arrival — so from the afternoon of Mon 21 Dec. <a href="https://tdac.immigration.go.th/" target="_blank" rel="noopener">tdac.immigration.go.th</a>. Avoid look-alike sites that charge a fee.</td></tr>
      <tr><td>Rules change</td><td>Re-check both countries' rules about a week before you fly.</td></tr></table>`,
    weather: `<table class="t">
      <tr><td>Hanoi &amp; Ha Long<br><small class="muted">16–19 Dec</small></td><td>Coolest stop. Typically about 15–21°C, grey and sometimes drizzly; colder on the water at night. Light jacket or sweater, closed shoes.</td></tr>
      <tr><td>Da Nang &amp; Hoi An<br><small class="muted">19–22 Dec</small></td><td>Mild, about 19–25°C. End of the rainy season, so showers are likely. Ba Na Hills is several degrees cooler and can be misty — carry a layer and an umbrella.</td></tr>
      <tr><td>Ho Chi Minh City<br><small class="muted">22–24 Dec</small></td><td>Warm and dry, about 23–32°C. Summer clothes, sunscreen, water.</td></tr>
      <tr><td>Bangkok<br><small class="muted">24–26 Dec</small></td><td>Best season — about 22–32°C, dry. Temple-friendly clothes for the Grand Palace.</td></tr></table>
      <div class="muted" style="font-size:12px;margin-top:8px">Typical December ranges, not a forecast. Check the weather app a day ahead.</div>`,
    dishes: `<p class="muted" style="margin-top:0">What's usually in the dishes on our food list — handy for ordering.</p>
      <table class="t">
      <tr><td>Bún chả</td><td>Grilled <b>pork</b> patties and noodles in broth</td></tr>
      <tr><td>Phở</td><td>Rice noodle soup. Usually <b>beef</b> (phở bò). Ask for <b>phở gà</b> — chicken</td></tr>
      <tr><td>Chả cá Thăng Long</td><td>Turmeric <b>fish</b> with dill, fried at the table</td></tr>
      <tr><td>Bánh mì</td><td>Baguette, usually <b>pork</b>/pâté. Ask for <b>bánh mì gà</b> (chicken) or <b>trứng</b> (egg)</td></tr>
      <tr><td>Bánh xèo</td><td>Crispy pancake, usually <b>pork + shrimp</b>. Say <b>chỉ tôm</b> — shrimp only</td></tr>
      <tr><td>Mì Quảng</td><td>Turmeric noodles, often shrimp + pork. Chicken version: <b>mì Quảng gà</b></td></tr>
      <tr><td>Cao lầu (Hoi An)</td><td>Thick noodles with <b>pork</b> slices</td></tr>
      <tr><td>White rose dumplings</td><td>Shrimp in rice paper — Hoi An speciality</td></tr>
      <tr><td>Cơm gà Hội An</td><td>Hoi An chicken rice — a safe, tasty choice</td></tr>
      <tr><td>Ninh Binh goat (dê)</td><td>Goat meat — red meat. Crispy rice (cơm cháy) on its own is fine</td></tr>
      <tr><td>Bún bò Nam Bộ</td><td><b>Beef</b> noodle salad</td></tr>
      <tr><td>Pad thai</td><td>Usually shrimp or chicken — ask: <b>goong</b> (prawn) or <b>gai</b> (chicken)</td></tr>
      <tr><td>Thai words</td><td>moo = pork · neua = beef · gai = chicken · goong = prawn · pla muek = squid</td></tr>
      <tr><td>Vietnamese words</td><td>heo / lợn = pork · bò = beef · gà = chicken · tôm = shrimp · cá = fish · mực = squid</td></tr>
      </table>`,
    phrases: `<h3 style="margin-top:4px">Vietnamese</h3><table class="t phr">
      <tr><td>Hello</td><td>Xin chào<small>sin chow</small></td></tr>
      <tr><td>Thank you</td><td>Cảm ơn<small>gahm un</small></td></tr>
      <tr><td>How much?</td><td>Bao nhiêu tiền?<small>bow nyew tee-en</small></td></tr>
      <tr><td>Not spicy</td><td>Không cay<small>khom kai</small></td></tr>
      <tr><td>No pork, please</td><td>Không thịt heo<small>khom tit heh-oh (say "thịt lợn" in Hanoi)</small></td></tr>
      <tr><td>No beef</td><td>Không thịt bò<small>khom tit baw</small></td></tr>
      <tr><td>Bill, please</td><td>Tính tiền<small>ting tee-en</small></td></tr>
      <tr><td>Delicious!</td><td>Ngon quá!<small>ngon kwa</small></td></tr>
      <tr><td>Excuse me / sorry</td><td>Xin lỗi<small>sin loy</small></td></tr></table>
      <h3>Thai <span class="muted" style="font-size:14px;font-family:var(--sans)">(men end with "krab", women with "ka")</span></h3><table class="t phr">
      <tr><td>Hello</td><td>Sawasdee krab / ka</td></tr>
      <tr><td>Thank you</td><td>Khob khun krab / ka</td></tr>
      <tr><td>How much?</td><td>Tao rai?</td></tr>
      <tr><td>Not spicy</td><td>Mai phet</td></tr>
      <tr><td>No pork</td><td>Mai sai moo</td></tr>
      <tr><td>No beef</td><td>Mai sai neua</td></tr>
      <tr><td>Bill, please</td><td>Check bin</td></tr>
      <tr><td>Delicious!</td><td>Aroi mak</td></tr>
      <tr><td>No problem</td><td>Mai pen rai</td></tr></table>`,
    around: `<table class="t">
      <tr><td>Grab</td><td>The easiest way to move around in both countries — fixed price shown before you book, pay by card. Install and add a card before the trip.</td></tr>
      <tr><td>Crossing streets</td><td>In Vietnam, walk slowly and steadily — motorbikes flow around you. Don't run or stop suddenly.</td></tr>
      <tr><td>Bangkok</td><td>Our hotel is near BTS Asok and MRT Sukhumvit. MRT goes direct to Sanam Chai (Grand Palace, Wat Pho) and Wat Mangkon (Chinatown). Use river boats on the Chao Phraya.</td></tr>
      <tr><td>Hotel cards</td><td>Use "Show the driver" in Stays — it shows the address in Vietnamese or Thai.</td></tr></table>`,
    phone: `<table class="t">
      <tr><td>Data</td><td>Buy a Vietnam + Thailand (or Southeast Asia) eSIM before flying, or a local SIM at the airport. An Indian roaming pack also works.</td></tr>
      <tr><td>Offline</td><td>Open this website once on Wi-Fi — the itinerary then works without signal. Download offline Google Maps for each city.</td></tr>
      <tr><td>Power</td><td>Both countries use 220V. Indian two-pin round chargers usually fit; carry one universal adapter for three-pin plugs.</td></tr>
      <tr><td>Time</td><td>Vietnam and Thailand are both 1 hr 30 min ahead of India.</td></tr></table>`,
    etiquette: `<table class="t">
      <tr><td>Temples</td><td>Cover shoulders and knees — no shorts, sleeveless tops or ripped jeans. Grand Palace is strict; carry a scarf or light trousers. Remove shoes where asked.</td></tr>
      <tr><td>Christmas Day</td><td>Grand Palace and Wat Pho will be busy on Fri 25 Dec — go early.</td></tr>
      <tr><td>Money tips</td><td>Vietnamese notes have many zeros. The 20,000 and 500,000 notes are both blue — check before paying.</td></tr>
      <tr><td>Water</td><td>Drink bottled water. Ice in restaurants and cafés is generally factory-made.</td></tr>
      <tr><td>Tipping</td><td>Not expected but appreciated — round up, or 20,000–50,000 VND / 20–50 THB for good service.</td></tr></table>`,
    emergency: `<table class="t">
      <tr><td>Vietnam</td><td>Police <a href="tel:113">113</a> · Fire <a href="tel:114">114</a> · Ambulance <a href="tel:115">115</a></td></tr>
      <tr><td>Thailand</td><td>Tourist Police <a href="tel:1155">1155</a> · Ambulance <a href="tel:1669">1669</a> · Police <a href="tel:191">191</a></td></tr>
      <tr><td>Embassy of India, Hanoi</td><td>Emergency <a href="tel:+84913089165">+84 913 089 165</a> (also WhatsApp)<br>58-60 Tran Hung Dao Street, Hanoi</td></tr>
      <tr><td>Consulate General of India, Ho Chi Minh City</td><td>Emergency <a href="tel:+84917180776">+84 917 180 776</a><br>Office <a href="tel:+842837442400">+84 28 3744 2400</a></td></tr>
      <tr><td>Embassy of India, Bangkok</td><td>24/7 helpline <a href="tel:+66618819218">+66 61 881 9218</a><br>46 Prasarnmitr, Sukhumvit Soi 23 — close to our hotel</td></tr>
      <tr><td>Lost passport</td><td>Report at the local police station first, then go to the Embassy for an Emergency Certificate. Keep photos of passports in your phone.</td></tr></table>`,
    packing: [
      "Passports + e-visa PDFs + printed hotel and flight bookings", "Forex card, a little USD cash, one credit card", "Light jacket / sweater for Hanoi and the cruise",
      "Compact umbrella or rain jacket (Da Nang, Hoi An)", "Comfortable walking shoes + sandals", "Temple clothes: covers shoulders and knees",
      "Swimwear (cruise, hotel pools)", "Universal adapter + power bank", "Sunscreen, sunglasses, cap", "Basic medicines you normally carry + motion-sickness tablets for the boat",
      "Small day bag + overnight bag for the cruise", "Insect repellent",
    ],
  };
  const CREDITS = [[T.hero, T.heroBy], ...DAYS.map((d) => [d.img, d.imgBy]), [T.extraImg, T.extraBy]];

  function viewEssentials() {
    const rates = store.get("vb_rates", { VND: 275, THB: 0.36 });
    const pk = store.get("vb_pack", {});
    return `<div class="sec" style="padding-top:calc(var(--safe-t) + 34px)"><div class="eyebrow">Everything else</div><h2 style="font-size:44px">Essentials</h2></div>
    <div class="sec" style="padding-top:0">
      <details class="acc" ${phase() === "before" ? "open" : ""}><summary>Before we fly</summary><div class="body">${checklistHTML()}</div></details>
      <details class="acc"><summary>Visas &amp; entry</summary><div class="body">${E.visa}</div></details>
      <details class="acc"><summary>Money converter</summary><div class="body conv">
        <label>Amount</label><input class="field" id="cvAmt" inputmode="decimal" value="100000">
        <select class="field" id="cvCur"><option value="VND">Vietnamese dong (VND)</option><option value="THB">Thai baht (THB)</option></select>
        <div><span class="big" id="cvOut">—</span></div>
        <div class="btnrow" id="cvQuick" style="margin-top:0"></div>
        <div class="muted" style="font-size:12px">Rates used: ₹1 = <input id="rV" class="field" style="width:80px;padding:4px 8px;font-size:13px;display:inline-block" value="${rates.VND}"> VND · ₹1 = <input id="rT" class="field" style="width:70px;padding:4px 8px;font-size:13px;display:inline-block" value="${rates.THB}"> THB. Approximate (Nov 2026) — edit to today's rate.</div>
      </div></details>
      <details class="acc"><summary>Weather &amp; what to wear</summary><div class="body">${E.weather}</div></details>
      <details class="acc"><summary>Dish decoder</summary><div class="body">${E.dishes}</div></details>
      <details class="acc"><summary>Useful phrases</summary><div class="body">${E.phrases}</div></details>
      <details class="acc"><summary>Getting around</summary><div class="body">${E.around}</div></details>
      <details class="acc"><summary>Phone, power &amp; time</summary><div class="body">${E.phone}</div></details>
      <details class="acc"><summary>Temples &amp; local tips</summary><div class="body">${E.etiquette}</div></details>
      <details class="acc"><summary>Emergency contacts</summary><div class="body">${E.emergency}</div></details>
      <details class="acc"><summary>Packing list</summary><div class="body">${E.packing.map((p, i) => `<label class="check ${pk[i] ? "done" : ""}"><input type="checkbox" data-pack="${i}" ${pk[i] ? "checked" : ""}><div class="h">${esc(p)}</div></label>`).join("")}</div></details>
      <details class="acc"><summary>Photo credits</summary><div class="body muted" style="font-size:12.5px">Destination photos from Wikimedia Commons under Creative Commons licences:<br>${CREDITS.map(([f, a]) => `<a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(f)}</a> — ${esc(a)}`).join("<br>")}</div></details>
    </div>
    <div class="foot"><div class="serif">Have a beautiful trip</div>Built from our itinerary sheet · last updated 24 Nov 2026</div>`;
  }
  function bindEssentials() {
    bindChecklist(app);
    app.querySelectorAll("[data-pack]").forEach((el) => el.addEventListener("change", () => { const p = store.get("vb_pack", {}); p[el.dataset.pack] = el.checked; store.set("vb_pack", p); el.closest(".check").classList.toggle("done", el.checked); }));
    const amt = app.querySelector("#cvAmt"), cur = app.querySelector("#cvCur"), out = app.querySelector("#cvOut"), rv = app.querySelector("#rV"), rt = app.querySelector("#rT"), qk = app.querySelector("#cvQuick");
    const QUICK = { VND: [50000, 100000, 200000, 500000, 1000000], THB: [100, 500, 1000, 2000] };
    function calc() {
      const rates = { VND: parseFloat(rv.value) || 275, THB: parseFloat(rt.value) || 0.36 };
      store.set("vb_rates", rates);
      const a = parseFloat(String(amt.value).replace(/,/g, "")) || 0;
      out.textContent = "≈ ₹" + Math.round(a / rates[cur.value]).toLocaleString("en-IN");
      qk.innerHTML = QUICK[cur.value].map((v) => `<button class="btn sm" data-q="${v}">${v.toLocaleString("en-IN")}</button>`).join("");
      qk.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { amt.value = b.dataset.q; calc(); }));
    }
    [amt, cur, rv, rt].forEach((el) => el && el.addEventListener("input", calc));
    if (amt) { cur.addEventListener("change", () => { amt.value = cur.value === "VND" ? 100000 : 500; calc(); }); calc(); }
  }

  /* ---------------- router ---------------- */
  let countTimer = null;
  function render(keepScroll) {
    const h = location.hash.replace(/^#/, "") || "today";
    const [tab, arg] = h.split("/");
    const y = window.scrollY;
    let html;
    if (tab === "journey") html = viewJourney();
    else if (tab === "day") html = viewDay(+arg);
    else if (tab === "stays") html = viewStays();
    else if (tab === "photos") html = viewPhotos();
    else if (tab === "essentials") html = viewEssentials();
    else html = viewToday();
    app.innerHTML = `<div class="view">${html}</div>`;
    const active = tab === "day" ? "journey" : ["journey", "stays", "photos", "essentials"].includes(tab) ? tab : "today";
    document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === active));
    if (tab === "photos") bindPhotos();
    if (tab === "essentials") bindEssentials();
    if (active === "today") bindChecklist(app);
    clearInterval(countTimer);
    if (active === "today") countTimer = setInterval(() => {
      const el = document.getElementById("count");
      if (el) { const c = countdownParts(); el.querySelectorAll(".num").forEach((n, i) => (n.textContent = i === 0 ? c.d : pad(i === 1 ? c.h : c.m))); }
      else if (phase() === "during") render(true);
    }, 30000);
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", () => { render(); if (location.hash.startsWith("#photos")) refreshPhotos(true); });

  /* offline indicator */
  function net() {
    let el = document.querySelector(".offline");
    if (!navigator.onLine) { if (!el) { el = document.createElement("div"); el.className = "offline"; el.textContent = "Offline · saved copy"; document.body.appendChild(el); } }
    else if (el) el.remove();
  }
  window.addEventListener("online", net); window.addEventListener("offline", net);

  render(); net();
  refreshPhotos(true);
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();
