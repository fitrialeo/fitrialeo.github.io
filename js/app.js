/* ==========================================================================
   Undangan pernikahan — logika halaman
   Seluruh konten berasal dari js/wedding-data.js. Teks tamu dan data dari
   server selalu dirender dengan textContent (tidak pernah innerHTML).
   ========================================================================== */
(() => {
  "use strict";

  const D = window.WEDDING_DATA;
  if (!D) {
    console.error("[undangan] js/wedding-data.js tidak termuat.");
    return;
  }

  /* ---------- Utilitas ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const mq = (q) => (window.matchMedia ? window.matchMedia(q).matches : false);
  const reduceMotion = mq("(prefers-reduced-motion: reduce)");
  const text = (v) => (v == null ? "" : String(v)).trim();
  const toNum = (v) => (v === null || v === undefined || v === "" || typeof v === "boolean" ? NaN : Number(v));
  const missing = [];
  const field = (path, value, fallback) => {
    const s = text(value);
    if (!s) { missing.push(path); return fallback; }
    return s;
  };

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      n.append(kid);
    }
    return n;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  function sprigIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 220");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#sprig");
    svg.append(use);
    return svg;
  }

  /* Kunci scroll: beberapa lapisan (halaman pembuka, foto layar penuh) */
  const locks = new Set();
  function setLock(name, on) {
    on ? locks.add(name) : locks.delete(name);
    document.documentElement.classList.toggle("is-locked", locks.size > 0);
  }

  /* Dialog dengan fallback bila showModal tidak tersedia */
  const openDialog = (d) => (typeof d.showModal === "function" ? d.showModal() : d.setAttribute("open", ""));
  const closeDialog = (d) => (typeof d.close === "function" ? d.close() : d.removeAttribute("open"));

  /* ---------- Tanggal & waktu ---------- */
  const TZ = text(D.locale && D.locale.timeZone) || "Asia/Jakarta";
  const TZL = text(D.locale && D.locale.timeZoneLabel) || "WIB";
  const parseISO = (s) => {
    const t = text(s);
    if (!t) return null;
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? null : new Date(ms);
  };
  const fmt = (d, o) => new Intl.DateTimeFormat("id-ID", { timeZone: TZ, ...o }).format(d);
  const fmtDate = (d) => fmt(d, { day: "numeric", month: "long", year: "numeric" });
  const fmtWeekday = (d) => fmt(d, { weekday: "long" });
  const fmtTime = (d) => fmt(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  /* ---------- Data turunan ---------- */
  const couple = D.couple || {};
  const brideFirst = couple.order === "bride-first";
  const firstWord = (s) => text(s).split(/\s+/)[0] || "";

  function person(raw, key, fbNick, fbFull) {
    const p = raw || {};
    return {
      key,
      nick: field(`couple.${key}.nickname`, p.nickname || firstWord(p.fullName), fbNick),
      full: field(`couple.${key}.fullName`, p.fullName, fbFull),
      parents: text(p.parents),
      instagram: text(p.instagram).replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, ""),
      photo: p.photo || {},
    };
  }
  const G = person(couple.groom, "groom", "Nama Pria", "Nama Lengkap Mempelai Pria");
  const B = person(couple.bride, "bride", "Nama Wanita", "Nama Lengkap Mempelai Wanita");
  const A1 = brideFirst ? B : G;
  const A2 = brideFirst ? G : B;
  const names = `${A1.nick} & ${A2.nick}`;

  const events = Array.isArray(D.events) ? D.events : [];
  const eventStarts = events.map((e) => parseISO(e.startISO)).filter(Boolean);
  const mainDate = parseISO(D.date && D.date.iso) || eventStarts[0] || null;
  const mainDateText = text(D.date && D.date.text) || (mainDate ? fmtDate(mainDate) : (missing.push("date.iso"), "00 Bulan 20XX"));

  /* ---------- Media (foto atau placeholder) ---------- */
  function media(photo, opts = {}) {
    const p = photo || {};
    const src = text(p.src);
    if (!src) {
      const ph = el("div", { class: "ph", "aria-hidden": "true" }, sprigIcon(), el("span", { text: "Foto" }));
      if (opts.ratio) ph.style.aspectRatio = opts.ratio;
      return ph;
    }
    const img = el("img", {
      src,
      alt: text(p.alt) || opts.alt || "",
      decoding: "async",
      loading: opts.eager ? "eager" : "lazy",
    });
    if (opts.eager) img.setAttribute("fetchpriority", "high");
    if (p.width && p.height) { img.setAttribute("width", p.width); img.setAttribute("height", p.height); }
    if (p.focus) img.style.objectPosition = p.focus;
    // Berkas belum diunggah / salah nama → tampilkan kotak foto kosong, bukan ikon gambar rusak.
    img.addEventListener("error", () => {
      const ph = media({}, { ratio: opts.ratio });
      if (img.parentNode) img.replaceWith(ph);
    }, { once: true });
    return img;
  }

  /* ---------- Peta & tautan ---------- */
  function mapLinks(loc) {
    const lat = toNum(loc.lat);
    const lng = toNum(loc.lng);
    const hasCoord = Number.isFinite(lat) && Number.isFinite(lng);
    const q = hasCoord ? `${lat},${lng}` : [text(loc.name), text(loc.address)].filter(Boolean).join(", ");
    const enc = encodeURIComponent(q);
    const custom = text(loc.mapsUrl);
    const safeCustom = /^https:\/\//i.test(custom) ? custom : "";
    return {
      hasQuery: Boolean(q),
      view: safeCustom || (q ? `https://www.google.com/maps/search/?api=1&query=${enc}` : ""),
      nav: q ? `https://www.google.com/maps/dir/?api=1&destination=${enc}` : safeCustom,
      embed: q ? `https://www.google.com/maps?q=${enc}&output=embed&hl=id` : "",
    };
  }

  /* ---------- Tamu dari URL ---------- */
  const cleanName = (s) =>
    String(s || "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  function guestFromURL() {
    const params = new URLSearchParams(location.search);
    for (const k of ["to", "tamu", "guest", "kepada"]) {
      const v = cleanName(params.get(k));
      if (v) return v;
    }
    return "";
  }
  const GUEST = guestFromURL();

  /* ==========================================================================
     Render
     ========================================================================== */
  function renderCover() {
    $("#coverNameA").textContent = A1.nick;
    $("#coverNameB").textContent = A2.nick;
    $("#coverDate").textContent = mainDateText;
    $("#coverPhoto").append(media(D.cover && D.cover.photo, { eager: true, alt: `Foto ${names}` }));
    if (GUEST) {
      const g = $("#guestName");
      g.textContent = GUEST;
      g.hidden = false;
    }
    document.title = text(D.meta && D.meta.title) || `The Wedding of ${names}`;
  }

  function renderGreeting() {
    const g = D.greeting || {};
    $("#greetSalutation").textContent = field("greeting.salutation", g.salutation, "Salam hangat,");
    $("#greetText").textContent = field("greeting.text", g.text, "Dengan penuh rasa syukur, kami mengundang Anda untuk hadir dan memberikan doa restu.");
    const q = g.quote || {};
    if (q.show === false) { $("#quote").hidden = true; return; }
    $("#quoteText").textContent = field("greeting.quote.text", q.text, "Tuliskan kutipan atau ayat pilihan Anda di sini.");
    $("#quoteSource").textContent = field("greeting.quote.source", q.source, "Sumber kutipan");
  }

  function renderCouple() {
    const mk = (p, cls) =>
      el("article", { class: `person ${cls}${text(p.photo.src) ? "" : " person--nophoto"}` },
        // Potret hanya ditampilkan bila fotonya diisi; tanpa foto tidak ada kotak kosong.
        text(p.photo.src) ? el("div", { class: "portrait" }, media(p.photo, { ratio: "4/5", alt: `Foto ${p.full}` })) : null,
        el("h3", { class: "person__name", text: p.full }),
        el("p", { class: "person__nick", text: p.nick }),
        el("p", { class: "person__parents", text: p.parents || (missing.push(`couple.${p.key}.parents`), `${p.key === "bride" ? "Putri" : "Putra"} dari Bapak Nama Ayah dan Ibu Nama Ibu`) }),
        p.instagram
          ? el("a", { class: "link person__ig", href: `https://www.instagram.com/${p.instagram}/`, target: "_blank", rel: "noopener noreferrer", text: `@${p.instagram}` })
          : null
      );
    $("#couple").append(
      mk(A1, "person--a"),
      el("p", { class: "couple__amp", "aria-hidden": "true", text: "&" }),
      mk(A2, "person--b")
    );
  }

  /* Berkas kalender (.ics) untuk satu acara */
  function downloadICS(title, start, end, where) {
    const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Undangan Pernikahan//ID", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${start.getTime()}-${Math.random().toString(36).slice(2, 8)}@undangan`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(title)}`,
      where ? `LOCATION:${esc(where)}` : null,
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: "undangan-pernikahan.ics" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function renderEvents() {
    const root = $("#events");
    const list = events.length ? events : [{}];
    if (list.length === 1) root.classList.add("events--single");

    list.forEach((ev, i) => {
      const start = parseISO(ev.startISO);
      const end = parseISO(ev.endISO);
      const title = field(`events[${i}].title`, ev.title, i === 0 ? "Akad Nikah" : "Resepsi");
      const dateLine = text(ev.dateText) || (start ? `${fmtWeekday(start)}, ${fmtDate(start)}` : (missing.push(`events[${i}].startISO`), "Hari, 00 Bulan 20XX"));
      const timeLine = text(ev.timeText) || (start ? `${fmtTime(start)}${end ? ` – ${fmtTime(end)}` : " – selesai"} ${TZL}` : "00.00 – selesai WIB");
      const venue = field(`events[${i}].venue`, ev.venue, "Nama gedung atau tempat");
      const links = mapLinks({ ...ev, name: ev.venue, address: ev.address });
      // Alamat tertulis kosong tetapi titik peta ada → baris alamat tidak ditampilkan (tidak ada teks contoh).
      const address = text(ev.address) || (links.view ? "" : (missing.push(`events[${i}].address`), "Alamat lengkap tempat acara"));

      const actions = el("div", { class: "event__actions" });
      actions.append(
        links.view
          ? el("a", { class: "btn btn--line", href: links.view, target: "_blank", rel: "noopener noreferrer", text: "Lihat Lokasi" })
          : el("button", { class: "btn btn--line", type: "button", disabled: true, title: "Lokasi belum diisi", text: "Lihat Lokasi" })
      );
      if (start) {
        const stop = end || new Date(start.getTime() + 3 * 3600e3);
        actions.append(
          el("button", {
            class: "link link--btn event__ics", type: "button", text: "Simpan ke kalender",
            onclick: () => downloadICS(`${title} — ${names}`, start, stop, [text(ev.venue), text(ev.address)].filter(Boolean).join(", ")),
          })
        );
      }

      root.append(
        el("article", { class: "event", "data-reveal": "" },
          el("h3", { class: "event__title", text: title }),
          el("p", { class: "event__date", text: dateLine }),
          el("p", { class: "event__time", text: timeLine }),
          el("p", { class: "event__venue", text: venue }),
          address ? el("p", { class: "event__addr", text: address }) : null,
          actions
        )
      );
    });
  }

  /* ---------- Hitung mundur ---------- */
  function initCountdown() {
    const cd = D.countdown || {};
    const target = parseISO(cd.targetISO) || eventStarts[0] || parseISO(D.date && D.date.iso);
    const grid = $("#cdGrid");
    const msg = $("#cdMsg");

    if (!target) {
      grid.hidden = true;
      msg.hidden = false;
      msg.textContent = "Hitung mundur akan tampil setelah tanggal acara diisi.";
      return;
    }
    const ends = events.map((e) => parseISO(e.endISO) || (parseISO(e.startISO) ? new Date(parseISO(e.startISO).getTime() + 4 * 3600e3) : null)).filter(Boolean);
    const endTime = ends.length ? Math.max(target.getTime() + 4 * 3600e3, ...ends.map((d) => d.getTime())) : target.getTime() + 4 * 3600e3;

    const nodes = { d: $("#cdD"), h: $("#cdH"), m: $("#cdM"), s: $("#cdS") };
    const last = {};
    const set = (k, v) => {
      const s = String(v).padStart(2, "0");
      if (last[k] !== s) { last[k] = s; nodes[k].textContent = s; }
    };
    let timer = null;

    function tick() {
      const now = Date.now();
      const diff = target.getTime() - now;
      if (diff > 0) {
        grid.hidden = false;
        msg.hidden = true;
        set("d", Math.floor(diff / 864e5));
        set("h", Math.floor((diff % 864e5) / 36e5));
        set("m", Math.floor((diff % 36e5) / 6e4));
        set("s", Math.floor((diff % 6e4) / 1e3));
        return;
      }
      grid.hidden = true;
      msg.hidden = false;
      if (now < endTime) {
        msg.textContent = text(cd.liveText) || "Hari bahagia kami sedang berlangsung.";
      } else {
        msg.textContent = text(cd.endedText) || "Acara telah berlangsung. Terima kasih atas doa dan kehadiran Anda.";
        clearInterval(timer);
      }
    }
    tick();
    timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  }

  /* ---------- Galeri & lightbox ---------- */
  const galleryItems = (Array.isArray(D.gallery) ? D.gallery : []).map((g, i) => ({
    src: text(g.src),
    alt: text(g.alt) || `Foto galeri ${i + 1}`,
    ratio: text(g.ratio) || "3/4",
  }));
  const ratioNum = (r) => {
    const [a, b] = String(r).split("/").map(Number);
    return a > 0 && b > 0 ? a / b : 1;
  };

  function renderGallery() {
    const root = $("#gallery");
    if (!galleryItems.length) { $("#galeri").hidden = true; return; }
    if (galleryItems.length < 3) root.classList.add("gallery--few");
    galleryItems.forEach((g, i) => {
      const inner = g.src
        ? media({ src: g.src, alt: g.alt }, { ratio: g.ratio })
        : media({}, { ratio: g.ratio });
      root.append(
        el("button", {
          class: "shot", type: "button",
          "aria-label": `Buka foto ${i + 1} dari ${galleryItems.length}${g.src ? `: ${g.alt}` : " (contoh)"}`,
          onclick: (e) => openLightbox(i, e.currentTarget),
        }, inner)
      );
    });
  }

  let lbIndex = 0;
  function lbShow(i) {
    const n = galleryItems.length;
    lbIndex = (i + n) % n;
    const g = galleryItems[lbIndex];
    let node;
    if (g.src) {
      node = media({ src: g.src, alt: g.alt }, { eager: true });
    } else {
      node = media({}, {});
      node.style.setProperty("--r", String(ratioNum(g.ratio)));
    }
    $("#lbStage").replaceChildren(node);
    $("#lbCount").textContent = `${lbIndex + 1} / ${n}`;
  }
  function openLightbox(i) {
    lbShow(i);
    setLock("lightbox", true);
    openDialog($("#lightbox"));
  }
  function initLightbox() {
    const dlg = $("#lightbox");
    $("#lbClose").addEventListener("click", () => closeDialog(dlg));
    $("#lbPrev").addEventListener("click", () => lbShow(lbIndex - 1));
    $("#lbNext").addEventListener("click", () => lbShow(lbIndex + 1));
    dlg.addEventListener("close", () => setLock("lightbox", false));
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); lbShow(lbIndex - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); lbShow(lbIndex + 1); }
    });
    const stage = $("#lbStage");
    stage.addEventListener("click", (e) => { if (e.target === stage) closeDialog(dlg); });
    let x0 = null;
    stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    stage.addEventListener("pointerup", (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener("pointercancel", () => { x0 = null; });
  }

  /* ---------- Kisah cinta ---------- */
  function renderStory() {
    const root = $("#timeline");
    const items = Array.isArray(D.story) ? D.story : [];
    if (!items.length) { $("#kisah").hidden = true; return; }
    items.forEach((s, i) => {
      const photo = s.photo && text(s.photo.src) ? el("div", { class: "tl__photo" }, media(s.photo, { alt: text(s.title) })) : null;
      root.append(
        el("li", { class: "tl", "data-reveal": "" },
          el("p", { class: "tl__date", text: field(`story[${i}].date`, s.date, "20XX") }),
          el("h3", { class: "tl__title", text: field(`story[${i}].title`, s.title, "Judul bagian kisah") }),
          el("p", { class: "tl__text", text: field(`story[${i}].text`, s.text, "Tuliskan bagian kisah ini dengan kata-kata Anda sendiri.") }),
          photo
        )
      );
    });
  }

  /* ---------- Lokasi ---------- */
  function renderPlace() {
    const L = D.location || {};
    const first = events[0] || {};
    const src = {
      name: text(L.name) || text(first.venue),
      address: text(L.address) || text(first.address),
      lat: text(L.lat) !== "" && L.lat != null ? L.lat : first.lat,
      lng: text(L.lng) !== "" && L.lng != null ? L.lng : first.lng,
      mapsUrl: text(L.mapsUrl) || text(first.mapsUrl),
    };
    const links = mapLinks(src);
    const root = $("#place");

    const map = el("div", { class: "map" });
    if (links.embed) {
      map.append(el("iframe", {
        src: links.embed, title: `Peta lokasi ${src.name || "acara"}`, loading: "lazy",
        referrerpolicy: "no-referrer-when-downgrade", allowfullscreen: "",
      }));
    } else {
      missing.push("location (nama/alamat/koordinat)");
      map.append(el("p", { class: "map__empty", text: "Peta akan tampil di sini setelah alamat atau koordinat lokasi diisi." }));
    }

    const actions = el("div", { class: "place__actions" });
    actions.append(...[
      links.nav
        ? el("a", { class: "btn btn--solid", href: links.nav, target: "_blank", rel: "noopener noreferrer", text: "Buka Navigasi" })
        : el("button", { class: "btn btn--solid", type: "button", disabled: true, title: "Lokasi belum diisi", text: "Buka Navigasi" }),
      links.view
        ? el("a", { class: "btn btn--line", href: links.view, target: "_blank", rel: "noopener noreferrer", text: "Lihat di Google Maps" })
        : null,
    ].filter(Boolean));

    // Catatan: Node.append(null) menulis teks "null", jadi anak yang kosong disaring dulu.
    root.append(...[
      el("h3", { class: "place__name", text: src.name || "Nama gedung atau tempat" }),
      src.address
        ? el("p", { class: "place__addr", text: src.address })
        : (links.view ? null : el("p", { class: "place__addr", text: "Alamat lengkap tempat acara" })),
      map,
      actions,
      text(L.directions) ? el("p", { class: "place__howto", text: text(L.directions) }) : null,
    ].filter(Boolean));
    root.setAttribute("data-reveal", "");
  }

  /* ---------- Penutup ---------- */
  function renderClosing() {
    const c = D.closing || {};
    $("#closingText").textContent = field("closing.text", c.text, "Terima kasih atas doa dan kehadiran Anda.");
    $("#closingSignoff").textContent = text(c.signoff) || "Kami yang berbahagia,";
    $("#closingNames").textContent = names;
    $("#closingDate").textContent = mainDateText;
  }

  /* ---------- Bagikan ---------- */
  function initShare() {
    const s = D.share || {};
    const title = text(s.title) || document.title;
    const note = text(s.text) || `Kami mengundang Anda ke pernikahan ${names}.`;
    const status = $("#shareStatus");
    const say = (m) => { status.textContent = m; setTimeout(() => { status.textContent = ""; }, 4000); };

    $("#shareBtn").addEventListener("click", async () => {
      const u = new URL(location.href);
      u.search = ""; u.hash = "";           // tautan umum, tanpa nama tamu
      const url = u.toString();
      if (navigator.share) {
        try { await navigator.share({ title, text: note, url }); return; }
        catch (err) { if (err && err.name === "AbortError") return; }
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const ta = el("textarea", { readonly: "", "aria-hidden": "true", style: "position:fixed;opacity:0" });
          ta.value = url;
          document.body.append(ta);
          ta.select();
          const ok = document.execCommand("copy");
          ta.remove();
          if (!ok) throw new Error("copy failed");
        }
        say("Tautan undangan disalin.");
      } catch {
        say(`Salin tautan ini: ${url}`);
      }
    });
  }

  /* ---------- Musik ---------- */
  const audio = $("#bgm");
  const musicBtn = $("#musicBtn");
  const musicSrc = text(D.music && D.music.src);
  function setPlaying(on) {
    musicBtn.setAttribute("aria-pressed", on ? "true" : "false");
    musicBtn.setAttribute("aria-label", on ? "Jeda musik latar" : "Putar musik latar");
  }
  function initMusic() {
    if (!musicSrc) return;
    audio.src = musicSrc;
    musicBtn.hidden = false;
    musicBtn.addEventListener("click", () => {
      if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      else { audio.pause(); setPlaying(false); }
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("play", () => setPlaying(true));
  }

  /* ---------- Menu ---------- */
  function initMenu() {
    const items = [
      ["pembuka", "Salam"], ["mempelai", "Mempelai"], ["acara", "Acara"], ["hitung-mundur", "Hitung mundur"],
      ["galeri", "Galeri"], ["kisah", "Kisah kami"], ["lokasi", "Lokasi"], ["rsvp", "Konfirmasi"],
      ["ucapan", "Ucapan"], ["penutup", "Penutup"],
    ].filter(([id]) => { const s = document.getElementById(id); return s && !s.hidden; });

    const dlg = $("#menu");
    const list = $("#menuList");
    items.forEach(([id, label]) => {
      list.append(el("li", null, el("a", {
        href: `#${id}`, text: label,
        onclick: (e) => {
          e.preventDefault();
          closeDialog(dlg);
          document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        },
      })));
    });
    $("#menuBtn").addEventListener("click", () => openDialog(dlg));
    $("#menuClose").addEventListener("click", () => closeDialog(dlg));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDialog(dlg); });
  }

  /* ==========================================================================
     Formulir: validasi, pengiriman, daftar ucapan
     ========================================================================== */
  const ENDPOINT = text(D.backend && D.backend.endpoint);
  const WA = text(D.rsvp && D.rsvp.whatsapp).replace(/\D/g, "");
  const MAX_GUESTS = Math.min(Math.max(parseInt(D.rsvp && D.rsvp.maxGuests, 10) || 4, 1), 20);

  /* Teks polos: buang tag HTML & karakter kontrol, rapikan spasi */
  const plain = (s, max, keepNewlines) => {
    let t = String(s == null ? "" : s).replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    t = keepNewlines ? t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : t.replace(/\s+/g, " ");
    return t.trim().slice(0, max);
  };

  function setError(input, errEl, msg) {
    if (msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
      if (input) input.setAttribute("aria-invalid", "true");
    } else {
      errEl.textContent = "";
      errEl.hidden = true;
      if (input) input.removeAttribute("aria-invalid");
    }
    return Boolean(msg);
  }
  function setStatus(node, kind, msg) {
    node.className = `form__status${kind ? ` is-${kind}` : ""}`;
    node.textContent = msg || "";
  }

  class ApiError extends Error {
    constructor(code) { super(code); this.code = code; }
  }
  async function api(method, payload) {
    if (!ENDPOINT) throw new ApiError("no_endpoint");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      let res;
      if (method === "POST") {
        // Tanpa header Content-Type khusus → "simple request", tidak memicu preflight CORS.
        res = await fetch(ENDPOINT, { method: "POST", body: JSON.stringify(payload), signal: ctrl.signal });
      } else {
        const sep = ENDPOINT.includes("?") ? "&" : "?";
        res = await fetch(ENDPOINT + sep + new URLSearchParams(payload), { signal: ctrl.signal });
      }
      if (!res.ok) throw new ApiError(`http_${res.status}`);
      let data;
      try { data = await res.json(); } catch { throw new ApiError("bad_response"); }
      if (!data || data.ok !== true) throw new ApiError((data && data.error) || "bad_response");
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err && err.name === "AbortError" ? "timeout" : "network");
    } finally {
      clearTimeout(timer);
    }
  }
  const errorText = (code) => {
    if (code === "no_endpoint") return "Belum terkirim: penyimpanan data belum dihubungkan.";
    if (code === "timeout") return "Pengiriman terlalu lama. Periksa koneksi internet Anda lalu coba lagi.";
    if (code === "network") return "Tidak dapat terhubung. Periksa koneksi internet Anda lalu coba lagi.";
    if (code === "invalid_input") return "Data tidak valid. Periksa kembali isian Anda.";
    return "Terjadi kendala di server. Mohon coba lagi sesaat lagi.";
  };

  /* ----- RSVP ----- */
  function initRSVP() {
    // Belum ada tujuan penyimpanan (endpoint) maupun nomor WhatsApp → bagian disembunyikan,
    // bukan menampilkan formulir yang tidak bisa mengirim apa pun.
    if (!ENDPOINT && !WA) { $("#rsvp").hidden = true; return; }
    const form = $("#rsvpForm");
    const nameI = $("#rsvpName");
    const countS = $("#rsvpCount");
    const msgI = $("#rsvpMsg");
    const submit = $("#rsvpSubmit");
    const status = $("#rsvpStatus");
    const radios = $$('input[name="status"]', form);
    const nameErr = $("#rsvpNameErr"), statusErr = $("#rsvpStatusErr"), countErr = $("#rsvpCountErr"), msgErr = $("#rsvpMsgErr");

    for (let i = 1; i <= MAX_GUESTS; i++) countS.append(el("option", { value: String(i), text: `${i} orang` }));
    if (GUEST) nameI.value = GUEST;

    const chosen = () => (radios.find((r) => r.checked) || {}).value || "";
    const syncCount = () => {
      const off = chosen() === "tidak";
      countS.disabled = off;
      if (off) setError(countS, countErr, "");
    };
    radios.forEach((r) => r.addEventListener("change", () => { setError(null, statusErr, ""); syncCount(); }));
    nameI.addEventListener("input", () => setError(nameI, nameErr, ""));
    msgI.addEventListener("input", () => setError(msgI, msgErr, ""));
    syncCount();

    // Mode pengiriman
    const viaWA = !ENDPOINT && Boolean(WA);
    if (viaWA) submit.textContent = "Konfirmasi lewat WhatsApp";

    function validate() {
      const name = plain(nameI.value, 80);
      const st = chosen();
      const count = st === "tidak" ? 0 : parseInt(countS.value, 10);
      const message = plain(msgI.value, 500, true);
      let firstBad = null;
      const bad = (input, errEl, m) => { setError(input, errEl, m); if (!firstBad) firstBad = input || radios[0]; };
      setError(nameI, nameErr, ""); setError(null, statusErr, ""); setError(countS, countErr, ""); setError(msgI, msgErr, "");

      if (name.length < 2) bad(nameI, nameErr, "Tulis nama Anda (minimal 2 huruf).");
      if (!st) bad(null, statusErr, "Pilih salah satu status kehadiran.");
      if (st && st !== "tidak" && !(count >= 1 && count <= MAX_GUESTS)) bad(countS, countErr, "Pilih jumlah orang yang hadir.");
      if (msgI.value.length > 500) bad(msgI, msgErr, "Pesan terlalu panjang (maksimal 500 karakter).");
      return { ok: !firstBad, firstBad, name, st, count, message };
    }

    const label = { hadir: "Hadir", tidak: "Tidak Hadir", ragu: "Belum Dapat Memastikan" };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = validate();
      if (!v.ok) {
        setStatus(status, "error", "Mohon lengkapi isian yang ditandai.");
        if (v.firstBad && v.firstBad.focus) v.firstBad.focus();
        return;
      }
      // Jebakan bot: kolom tersembunyi terisi → anggap berhasil tanpa mengirim apa pun.
      if ($("#rsvpHp").value) { showDone(v); return; }

      if (viaWA) {
        const body = [
          `Konfirmasi kehadiran — ${names}`,
          `Nama: ${v.name}`,
          `Status: ${label[v.st]}`,
          v.st !== "tidak" ? `Jumlah: ${v.count} orang` : null,
          v.message ? `Pesan: ${v.message}` : null,
        ].filter(Boolean).join("\n");
        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(body)}`, "_blank", "noopener");
        setStatus(status, "", "WhatsApp dibuka. Kirim pesannya agar konfirmasi Anda tercatat.");
        return;
      }

      submit.disabled = true;
      submit.textContent = "Mengirim…";
      setStatus(status, "", "");
      try {
        await api("POST", {
          type: "rsvp", name: v.name, status: v.st, count: v.count, message: v.message,
          invitedAs: GUEST, website: "",
        });
        showDone(v);
      } catch (err) {
        setStatus(status, "error", errorText(err.code));
      } finally {
        submit.disabled = false;
        submit.textContent = "Konfirmasi Kehadiran";
      }
    });

    const done = $("#rsvpDone");
    function showDone(v) {
      $("#rsvpDoneTitle").textContent = v.st === "tidak" ? "Terima kasih sudah memberi kabar" : "Konfirmasi diterima";
      $("#rsvpDoneText").textContent =
        v.st === "hadir" ? `Terima kasih, ${v.name}. Sampai jumpa di hari bahagia kami.`
        : v.st === "ragu" ? `Terima kasih, ${v.name}. Kabari kami lagi ketika Anda sudah dapat memastikan.`
        : `Terima kasih, ${v.name}. Doa Anda sangat berarti bagi kami.`;
      form.hidden = true;
      done.hidden = false;
      setStatus(status, "", "");
      done.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
    $("#rsvpAgain").addEventListener("click", () => {
      done.hidden = true;
      form.hidden = false;
      nameI.focus();
    });
  }

  /* ----- Ucapan & doa ----- */
  function initWishes() {
    // Tanpa endpoint tidak ada tempat menyimpan ucapan → bagian disembunyikan seluruhnya.
    if (!ENDPOINT) { $("#ucapan").hidden = true; return; }
    const form = $("#wishForm");
    const nameI = $("#wishName");
    const msgI = $("#wishMsg");
    const nameErr = $("#wishNameErr"), msgErr = $("#wishMsgErr");
    const submit = $("#wishSubmit");
    const status = $("#wishStatus");
    const note = $("#wishNote");
    const list = $("#wishList");
    const count = $("#wishCount");
    const retryWrap = $("#wishRetryWrap");
    if (GUEST) nameI.value = GUEST;

    msgI.addEventListener("input", () => { count.textContent = `${msgI.value.length} / 300`; setError(msgI, msgErr, ""); });
    nameI.addEventListener("input", () => setError(nameI, nameErr, ""));

    const rtf = typeof Intl.RelativeTimeFormat === "function" ? new Intl.RelativeTimeFormat("id", { numeric: "auto" }) : null;
    function when(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return { label: "", iso: "" };
      const sec = Math.round((d.getTime() - Date.now()) / 1000);
      const abs = Math.abs(sec);
      let label;
      if (!rtf || abs > 30 * 86400) label = fmtDate(d);
      else if (abs < 60) label = "baru saja";
      else if (abs < 3600) label = rtf.format(Math.round(sec / 60), "minute");
      else if (abs < 86400) label = rtf.format(Math.round(sec / 3600), "hour");
      else label = rtf.format(Math.round(sec / 86400), "day");
      return { label, iso: d.toISOString() };
    }
    function wishItem(w) {
      const t = when(w.createdAt);
      return el("li", { class: "wish" },
        el("p", { class: "wish__name", text: plain(w.name, 80) }),
        el("p", { class: "wish__msg", text: plain(w.message, 300, true) }),
        t.label ? el("time", { class: "wish__time", datetime: t.iso, text: t.label }) : null
      );
    }

    let loaded = false;
    async function load() {
      if (!ENDPOINT || loaded) return;
      loaded = true;
      retryWrap.hidden = true;
      note.textContent = "Memuat ucapan…";
      try {
        const data = await api("GET", { action: "wishes" });
        const rows = Array.isArray(data.wishes) ? data.wishes : [];
        list.replaceChildren(...rows.map(wishItem));
        note.textContent = rows.length ? "" : "Belum ada ucapan. Jadilah yang pertama menulis.";
      } catch (err) {
        loaded = false;
        note.textContent = "Ucapan belum dapat dimuat.";
        retryWrap.hidden = false;
      }
    }
    $("#wishRetry").addEventListener("click", load);

    // Muat daftar hanya saat bagian ini hampir terlihat → hemat kuota
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => {
        if (en.some((x) => x.isIntersecting)) { io.disconnect(); load(); }
      }, { rootMargin: "400px 0px" });
      io.observe($("#ucapan"));
    } else {
      load();
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = plain(nameI.value, 80);
      const message = plain(msgI.value, 300, true);
      let bad = null;
      setError(nameI, nameErr, ""); setError(msgI, msgErr, "");
      if (name.length < 2) { setError(nameI, nameErr, "Tulis nama Anda (minimal 2 huruf)."); bad = nameI; }
      if (message.length < 3) { setError(msgI, msgErr, "Tulis ucapan Anda (minimal 3 karakter)."); bad = bad || msgI; }
      if (bad) { setStatus(status, "error", "Mohon lengkapi isian yang ditandai."); bad.focus(); return; }
      if ($("#wishHp").value) { msgI.value = ""; count.textContent = "0 / 300"; return; }

      submit.disabled = true;
      submit.textContent = "Mengirim…";
      setStatus(status, "", "");
      try {
        await api("POST", { type: "wish", name, message, website: "" });
        list.prepend(wishItem({ name, message, createdAt: new Date().toISOString() }));
        note.textContent = "";
        msgI.value = "";
        count.textContent = "0 / 300";
        setStatus(status, "ok", "Terima kasih. Ucapan Anda sudah tersimpan.");
      } catch (err) {
        setStatus(status, "error", errorText(err.code));
      } finally {
        submit.disabled = false;
        submit.textContent = "Kirim Ucapan";
      }
    });
  }

  /* ==========================================================================
     Membuka undangan & animasi scroll
     ========================================================================== */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((n) => n.classList.add("is-in"));
      return;
    }
    items.forEach((n) => n.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach((n) => io.observe(n));
  }

  function initCover() {
    const cover = $("#cover");
    const main = $("#main");
    main.inert = true;
    setLock("cover", true);

    let opened = false;
    $("#openBtn").addEventListener("click", () => {
      if (opened) return;
      opened = true;
      main.inert = false;
      $("#dock").hidden = false;
      setLock("cover", false);
      window.scrollTo(0, 0);
      initReveal();

      if (musicSrc) audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        cover.hidden = true;
        main.focus({ preventScroll: true });
      };
      if (reduceMotion) { finish(); return; }
      cover.classList.add("is-opening");
      cover.addEventListener("transitionend", (e) => { if (e.target === cover && e.propertyName === "opacity") finish(); });
      setTimeout(finish, 1300);
    });
  }

  /* ---------- Mulai ---------- */
  renderCover();
  renderGreeting();
  renderCouple();
  renderEvents();
  renderGallery();
  renderStory();
  renderPlace();
  renderClosing();
  initCountdown();
  initLightbox();
  initShare();
  initMusic();
  initRSVP();
  initWishes();
  initMenu();      // setelah RSVP/ucapan, agar bagian yang disembunyikan tidak masuk menu
  initCover();

  if (missing.length) {
    console.info("[undangan] Kolom yang masih memakai teks contoh:\n- " + missing.join("\n- "));
  }
})();
