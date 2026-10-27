# Undangan Pernikahan Digital

Website undangan statis (HTML + CSS + JavaScript murni, tanpa proses build). Cukup unggah foldernya ke hosting statis seperti GitHub Pages, Netlify, atau Cloudflare Pages.

```
index.html                    kerangka halaman + metadata pratinjau tautan
css/style.css                 seluruh gaya visual
js/wedding-data.js            ← SATU-SATUNYA berkas yang perlu Anda isi
js/app.js                     logika (countdown, galeri, formulir, dll.)
backend/google-apps-script.gs backend RSVP & ucapan (Google Sheets)
assets/photos/  assets/audio/ tempat foto & musik Anda
favicon.svg
```

Semua kolom yang belum diisi menampilkan **teks contoh**. Tidak ada nama, tanggal, lokasi, foto, atau kisah yang dikarang. Buka konsol browser (F12) untuk melihat daftar kolom yang masih kosong.

---

## Langkah 1 — Isi data (`js/wedding-data.js`)

| Bagian | Yang perlu diisi |
|---|---|
| `couple` | nama lengkap, nama panggilan, orang tua, Instagram (opsional), foto |
| `date.iso` dan `events[]` | tanggal & jam dalam format `"2027-03-14T08:00:00+07:00"` (WIB `+07:00`, WITA `+08:00`, WIT `+09:00`) |
| `events[].venue/address` | nama tempat dan alamat lengkap; `lat`/`lng` atau `mapsUrl` untuk peta |
| `greeting` | salam, pengantar, kutipan/ayat pilihan Anda (`quote.show: false` untuk menyembunyikan) |
| `gallery`, `story` | foto galeri dan kisah cinta |
| `music.src` | berkas musik; kosong = tombol musik tidak muncul |

Hitung mundur otomatis memakai waktu mulai acara pertama. Setelah acara dimulai tampil pesan "sedang berlangsung", dan setelah selesai tampil pesan terima kasih (tidak pernah angka negatif).

**Peta** memakai koordinat/alamat yang Anda isi. Jika keduanya kosong, tombol navigasi dinonaktifkan dan peta menampilkan keterangan, bukan menebak lokasi. Tombol memakai tautan universal Google Maps sehingga berfungsi di Android, iPhone, dan desktop.

## Langkah 2 — Foto, musik, dan pratinjau tautan

**Foto.** Berkas yang dirujuk saat ini: `assets/photos/foto1.jpeg` (halaman pembuka/cover), serta `assets/photos/foto2.jpeg` dan `assets/photos/foto3.jpeg` (galeri di dalam undangan). Bila berkasnya belum ada, tampil kotak foto kosong. Nama dan format bisa diubah di `js/wedding-data.js`. Kecilkan dulu sebelum diunggah; WebP atau JPG sama-sama bisa.

Panduan ukuran: ubah ke WebP (atau JPG kualitas ±80) dan kecilkan sebelum diunggah. Ukuran yang disarankan:

- foto cover dan potret mempelai: sisi panjang 1400 px
- galeri: sisi panjang 1200 px (target 100–200 KB per foto)

Alat gratis: [squoosh.app](https://squoosh.app). Foto dimuat bertahap (lazy-load) dan galeri mempertahankan rasio asli foto. Isi `photo.width` dan `photo.height` bila ingin menghindari lompatan tata letak.

**Musik.** Berkas yang dirujuk saat ini: `assets/audio/musik.mp3`. Gunakan MP3/AAC ≤ 3 MB dengan hak pakai yang jelas. Musik tidak diputar otomatis saat halaman dimuat. Musik baru mulai ketika tamu menekan "Buka Undangan", dan tamu bisa menjeda lewat tombol di pojok kanan bawah.

**Pratinjau tautan WhatsApp.** Crawler WhatsApp tidak menjalankan JavaScript, jadi edit langsung bagian `<head>` di `index.html`:

- `<title>`, `description`, `og:title`, `og:description`
- `canonical` dan `og:url` → alamat website Anda
- `og:image` → URL lengkap gambar 1200×630 px (< 300 KB)

Bagian ini sudah terisi nama dan tanggal. Alamat website dan gambar pratinjau sengaja belum dipasang: di `<head>` ada blok komentar "AKTIFKAN SETELAH WEBSITE ONLINE". Hapus tanda komentarnya, ganti `ALAMAT-WEBSITE`, ubah `twitter:card` menjadi `summary_large_image`, dan unggah `assets/photos/og-image.jpg`.

Setelah mengubahnya, WhatsApp kadang menyimpan pratinjau lama; tambahkan `?v=2` pada tautan yang dibagikan untuk memaksa muat ulang.

Secara bawaan halaman diberi `noindex` agar undangan tidak muncul di Google. Hapus baris `<meta name="robots">` bila Anda ingin sebaliknya.

## Langkah 3 — Aktifkan RSVP dan Ucapan (Google Sheets)

Selama langkah ini belum dilakukan, bagian **Ucapan dan doa disembunyikan**, dan bagian **Konfirmasi kehadiran juga disembunyikan** kecuali `rsvp.whatsapp` diisi (RSVP lalu dikirim lewat WhatsApp). Keduanya muncul otomatis begitu `endpoint` diisi. Website tidak pernah menampilkan "tersimpan" bila data sebenarnya tidak tersimpan.

1. Buat Google Sheet baru (nama bebas).
2. Menu **Extensions → Apps Script**. Hapus isi bawaan, tempel seluruh isi `backend/google-apps-script.gs`, lalu **Save**.
3. Pilih fungsi `setup` di bilah atas, klik **Run**, dan setujui izin. Dua sheet akan dibuat: `RSVP` dan `Ucapan`.
4. **Deploy → New deployment → ikon roda gigi → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
5. Klik **Deploy**, lalu salin **Web app URL** (berakhiran `/exec`).
6. Tempel ke `js/wedding-data.js`:
   ```js
   backend: { endpoint: "https://script.google.com/macros/s/XXXX/exec" },
   ```
7. Uji: kirim satu RSVP dan satu ucapan dari website, lalu periksa sheet-nya.

Catatan:

- Setelah mengubah kode Apps Script, buat versi baru: **Deploy → Manage deployments → Edit → Version: New version → Deploy**.
- **Moderasi ucapan:** ubah `autoApproveWishes` menjadi `false`. Ucapan masuk dengan kolom *Tampil* = `tidak`; ubah selnya menjadi `ya` untuk menampilkannya. Menghapus baris juga menghapus ucapan dari website.
- **Keamanan input:** HTML dibuang di browser dan di server, isi ditampilkan hanya sebagai teks polos, sel ditulis sebagai teks (rumus seperti `=1+1` tidak dieksekusi), ada kolom jebakan bot, batas panjang, dan pencegah kiriman ganda.
- Kuota Apps Script cukup untuk undangan pribadi, tetapi bukan untuk ribuan kiriman per menit.
- Pilihan lain: layanan seperti Supabase juga bisa dipakai. Ganti fungsi `api()` di `js/app.js` dan pertahankan bentuk payload `{type, name, ...}`.

## Langkah 4 — Publikasi

- **GitHub Pages:** unggah semua berkas ke repositori, lalu *Settings → Pages → Deploy from branch → main / root*.
- **Netlify / Cloudflare Pages:** seret-lepas foldernya. Tidak perlu perintah build.

## Tautan khusus per tamu

Tambahkan `?to=Nama+Tamu` di akhir alamat:

```
https://domain-anda.com/?to=Bapak+Budi+Santoso
```

Nama tampil di halaman pembuka dan mengisi otomatis kolom nama RSVP/ucapan. Nama dirender sebagai teks polos, maksimal 60 karakter. Tanpa parameter, baris nama disembunyikan. Tombol *Bagikan Undangan* selalu membagikan tautan umum tanpa nama tamu.

Membuat banyak tautan sekaligus di Google Sheets (nama tamu di kolom B, alamat dasar di A1):

```
=$A$1&"?to="&ENCODEURL(B2)
```

## Daftar periksa sebelum disebarkan

- [ ] Semua teks contoh sudah diganti (cek konsol browser)
- [ ] Tanggal berformat ISO dengan zona waktu yang benar; hitung mundur menunjukkan angka masuk akal
- [ ] "Lihat Lokasi" dan "Buka Navigasi" membuka lokasi yang benar di Android, iPhone, dan desktop
- [ ] Kirim satu RSVP dan satu ucapan percobaan, lalu pastikan masuk ke Sheet (lalu hapus barisnya)
- [ ] `og:image`, `og:url`, dan `canonical` sudah memakai alamat sebenarnya; tes dengan menempel tautan di WhatsApp
- [ ] Buka dari ponsel dengan koneksi lambat (mode 3G di DevTools) dan periksa ukuran foto
- [ ] Musik: tombol memutar dan menjeda; tidak berbunyi sebelum "Buka Undangan"

## Aksesibilitas dan performa

Fokus keyboard terlihat, formulir memiliki label dan pesan galat yang dibacakan pembaca layar, galeri dan menu memakai `<dialog>` bawaan (fokus terkunci, Esc untuk menutup), dan animasi dimatikan bila perangkat meminta "kurangi gerakan". Tanpa framework dan tanpa dependensi selain dua font Google (Cormorant Garamond dan Inter, hanya bobot yang dipakai).
