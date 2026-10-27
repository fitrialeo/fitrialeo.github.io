/**
 * Backend undangan pernikahan — Google Apps Script + Google Sheets
 * ------------------------------------------------------------------
 * Menyimpan konfirmasi kehadiran (RSVP) dan ucapan/doa ke dua sheet:
 *   • "RSVP"   : Waktu, Nama, Status, Jumlah, Pesan, Diundang sebagai
 *   • "Ucapan" : Waktu, Nama, Ucapan, Tampil
 *
 * Cara pasang: lihat README.md → "Langkah 3".
 * Setelah mengubah kode ini, pilih Deploy → Manage deployments → Edit →
 * Version: New version → Deploy, agar perubahan berlaku.
 */

var SHEETS = {
  rsvp:   { name: "RSVP",   headers: ["Waktu", "Nama", "Status", "Jumlah", "Pesan", "Diundang sebagai"] },
  wishes: { name: "Ucapan", headers: ["Waktu", "Nama", "Ucapan", "Tampil"] }
};

var OPTIONS = {
  // true  = ucapan langsung tampil di undangan
  // false = ucapan tersimpan dengan Tampil="tidak"; ubah sel menjadi "ya" untuk menampilkan (moderasi)
  autoApproveWishes: true,
  maxWishesReturned: 100,
  maxGuests: 20
};

/** Jalankan sekali dari editor untuk memberi izin dan membuat sheet. */
function setup() {
  getSheet_(SHEETS.rsvp);
  getSheet_(SHEETS.wishes);
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === "wishes") {
    try {
      return json_({ ok: true, wishes: listWishes_() });
    } catch (err) {
      return json_({ ok: false, error: "server_error" });
    }
  }
  return json_({ ok: true, service: "undangan-pernikahan" });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: "invalid_input" });
    var body = JSON.parse(e.postData.contents);

    // Jebakan bot: kolom tersembunyi terisi → pura-pura sukses, tidak disimpan.
    if (body.website) return json_({ ok: true });

    lock.waitLock(10000);
    locked = true;

    if (body.type === "rsvp") return json_(saveRsvp_(body));
    if (body.type === "wish") return json_(saveWish_(body));
    return json_({ ok: false, error: "invalid_input" });
  } catch (err) {
    return json_({ ok: false, error: "server_error" });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ---------- RSVP ---------- */
function saveRsvp_(b) {
  var name = clean_(b.name, 80, false);
  var status = String(b.status || "");
  var message = clean_(b.message, 500, true);
  var count = parseInt(b.count, 10);

  if (name.length < 2) return { ok: false, error: "invalid_input" };
  if (["hadir", "tidak", "ragu"].indexOf(status) === -1) return { ok: false, error: "invalid_input" };
  if (status === "tidak") count = 0;
  else if (!(count >= 1 && count <= OPTIONS.maxGuests)) return { ok: false, error: "invalid_input" };

  var labels = { hadir: "Hadir", tidak: "Tidak Hadir", ragu: "Belum Dapat Memastikan" };
  appendText_(getSheet_(SHEETS.rsvp), [
    new Date().toISOString(), name, labels[status], String(count), message, clean_(b.invitedAs, 60, false)
  ]);
  return { ok: true };
}

/* ---------- Ucapan ---------- */
function saveWish_(b) {
  var name = clean_(b.name, 80, false);
  var message = clean_(b.message, 300, true);
  if (name.length < 2 || message.length < 3) return { ok: false, error: "invalid_input" };

  var sheet = getSheet_(SHEETS.wishes);
  var last = sheet.getLastRow();
  if (last >= 2) {
    var prev = sheet.getRange(last, 2, 1, 2).getValues()[0];
    if (String(prev[0]) === name && String(prev[1]) === message) return { ok: true }; // cegah kiriman ganda
  }
  appendText_(sheet, [new Date().toISOString(), name, message, OPTIONS.autoApproveWishes ? "ya" : "tidak"]);
  return { ok: true };
}

function listWishes_() {
  var sheet = getSheet_(SHEETS.wishes);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var rows = sheet.getRange(2, 1, last - 1, 4).getValues();
  var out = [];
  for (var i = rows.length - 1; i >= 0 && out.length < OPTIONS.maxWishesReturned; i--) {
    if (String(rows[i][3]).toLowerCase() !== "ya") continue;
    out.push({ createdAt: String(rows[i][0]), name: String(rows[i][1]), message: String(rows[i][2]) });
  }
  return out; // terbaru lebih dulu
}

/* ---------- Pembantu ---------- */
function getSheet_(def) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(def.name);
  if (!sh) {
    sh = ss.insertSheet(def.name);
    sh.appendRow(def.headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Menulis sebagai teks biasa agar isi seperti "=1+1" tidak pernah dieksekusi sebagai rumus. */
function appendText_(sheet, values) {
  var row = sheet.getLastRow() + 1;
  var range = sheet.getRange(row, 1, 1, values.length);
  range.setNumberFormat("@");
  range.setValues([values]);
}

/** Buang tag HTML & karakter kontrol, rapikan spasi, batasi panjang. */
function clean_(v, max, keepNewlines) {
  var s = String(v === null || v === undefined ? "" : v)
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = keepNewlines ? s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.replace(/^\s+|\s+$/g, "").substring(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
