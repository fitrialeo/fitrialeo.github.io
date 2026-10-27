/* ==========================================================================
   DATA UNDANGAN  —  inilah satu-satunya file yang perlu Anda edit.

   Aturan singkat
   • Kolom yang dibiarkan kosong ("") akan menampilkan teks contoh (placeholder).
     Tidak ada data yang dikarang: nama, tanggal, lokasi, dan foto sepenuhnya
     berasal dari isian di bawah ini.
   • Tanggal memakai format ISO lengkap dengan zona waktu:
       "2027-03-14T08:00:00+07:00"   (WIB = +07:00, WITA = +08:00, WIT = +09:00)
   • Path foto relatif terhadap index.html, mis. "assets/photos/hero.webp".
   • Buka konsol browser (F12) untuk melihat daftar kolom yang masih kosong.
   ========================================================================== */

window.WEDDING_DATA = {

  /* ---------- Judul halaman & zona waktu ---------- */
  meta: {
    title: "",                 // kosong = "The Wedding of {panggilan} & {panggilan}"
  },
  locale: {
    timeZone: "Asia/Jakarta",  // WITA: "Asia/Makassar" · WIT: "Asia/Jayapura"
    timeZoneLabel: "WIB",      // "WITA" / "WIT"
  },

  /* ---------- Mempelai ---------- */
  couple: {
    order: "groom-first",      // "groom-first" atau "bride-first" (siapa yang disebut lebih dulu)
    groom: {
      fullName: "Leo Chandra",
      nickname: "Leo",
      parents: "",             // ← ISI: mis. "Putra pertama dari Bapak ... dan Ibu ..."
      instagram: "",           // tanpa @, boleh dikosongkan
      // Foto potret opsional. Selama src kosong, kotak foto tidak ditampilkan.
      photo: { src: "", alt: "", focus: "50% 30%" },
    },
    bride: {
      fullName: "Fitria",
      nickname: "Pipit",
      parents: "Putri pertama dari Bapak Lukman dan Ibu Maryana",
      instagram: "",
      photo: { src: "", alt: "", focus: "50% 30%" },
    },
  },

  /* ---------- Halaman pembuka ---------- */
  cover: {
    // Taruh berkasnya di assets/photos/foto1.jpeg (potret 4:5, sisi panjang ±1400 px).
    // Bila berkas belum ada, tampil kotak foto kosong (bukan gambar rusak).
    photo: { src: "assets/photos/foto1.jpeg", alt: "", focus: "50% 30%" },
  },

  /* ---------- Tanggal pernikahan ---------- */
  date: {
    iso: "2026-11-15T08:00:00+07:00",
    text: "",                  // opsional: timpa tampilan tanggal, mis. "15 November 2026"
  },

  /* ---------- Salam & pengantar ---------- */
  greeting: {
    salutation: "Assalamu'alaikum Warahmatullahi Wabarakatuh",
    text:
      "Dengan penuh rasa syukur, kami mengundang Bapak/Ibu/Saudara/i untuk hadir " +
      "dan memberikan doa restu pada hari pernikahan kami.",
    // Terjemahan Kemenag RI, dicocokkan dengan dua sumber (quran.kemenag.go.id
    // dan liputan6.com/quran). Setel show: false untuk menyembunyikan bagian ini.
    quote: {
      show: true,
      text:
        "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan " +
        "untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, " +
        "dan Dia menjadikan di antaramu rasa kasih dan sayang.",
      source: "QS. Ar-Rum [30]: 21",
    },
  },

  /* ---------- Acara ----------
     Akad dan resepsi sama-sama di satu tempat dan waktu, jadi cukup satu blok.
     Untuk memisahkan keduanya, salin blok ini dan ubah title, jam, dan tempat.
     lat/lng berasal dari tautan Google Maps yang Anda berikan (tautan itu
     mengarah ke titik -3.005697, 104.753520).
     address boleh diisi bila ingin menampilkan alamat tertulis; selama kosong,
     baris alamat tidak ditampilkan dan tamu memakai tombol peta.              */
  events: [
    {
      title: "Akad Nikah & Resepsi",
      startISO: "2026-11-15T08:00:00+07:00",
      endISO: "",              // opsional; kosong = "selesai"
      dateText: "",            // opsional: timpa, mis. "Minggu, 15 November 2026"
      timeText: "",            // opsional: timpa, mis. "08.00 WIB – selesai"
      venue: "Jembatan Musi 6",
      address: "",
      lat: -3.005697,
      lng: 104.753520,
      mapsUrl: "https://maps.app.goo.gl/f2ZZBJQcSie3Gj576",
    },
  ],

  /* ---------- Hitung mundur ----------
     Kosong = otomatis memakai waktu mulai acara pertama.                     */
  countdown: {
    targetISO: "",
    liveText: "Hari bahagia kami sedang berlangsung.",
    endedText: "Acara telah berlangsung. Terima kasih atas doa dan kehadiran Anda.",
  },

  /* ---------- Galeri ----------
     Taruh berkasnya di assets/photos/ dengan nama di bawah ini (atau ubah
     namanya di sini). Ukuran asli foto dipertahankan. Bila berkas belum ada,
     tampil kotak foto kosong. Tambah baris untuk menambah foto.              */
  gallery: [
    { src: "assets/photos/foto2.jpeg", alt: "", ratio: "4/5" },
    { src: "assets/photos/foto3.jpeg", alt: "", ratio: "4/5" },
  ],

  /* ---------- Kisah cinta ----------
     Dikosongkan, jadi bagian "Kisah kami" tidak tampil. Untuk mengaktifkannya,
     isi seperti contoh berikut (date: tahun atau tanggal bebas, photo opsional):
       { date: "", title: "Awal pertemuan", text: "", photo: { src: "", alt: "" } },  */
  story: [],

  /* ---------- Lokasi (bagian peta) ----------
     Kosong = otomatis memakai data acara pertama.                            */
  location: {
    name: "",
    address: "",
    lat: null,
    lng: null,
    mapsUrl: "",
    directions: "",            // petunjuk singkat, mis. "Masuk dari gerbang utama, parkir di sisi kiri."
  },

  /* ---------- RSVP & Ucapan ----------
     endpoint: URL Web App Google Apps Script (lihat README.md → langkah 3).
     Selama endpoint KOSONG, bagian "Ucapan dan doa" disembunyikan, begitu juga
     bagian RSVP bila whatsapp juga kosong. Mengisi endpoint langsung
     menampilkan keduanya. Tidak ada data yang pura-pura "tersimpan".         */
  backend: {
    endpoint: "",
  },
  rsvp: {
    maxGuests: 4,              // jumlah maksimal orang per konfirmasi
    whatsapp: "",              // cadangan, format internasional tanpa +, mis. "6281234567890"
  },

  /* ---------- Musik latar ----------
     Kosong = tombol musik tidak ditampilkan. Pakai MP3/AAC ≤ 3 MB.          */
  music: {
    src: "assets/audio/musik.mp3",
  },

  /* ---------- Penutup & berbagi ---------- */
  closing: {
    text:
      "Merupakan kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i " +
      "berkenan hadir dan memberikan doa restu. Atas kehadiran serta doa yang tulus, " +
      "kami ucapkan terima kasih.",
    signoff: "Kami yang berbahagia,",
  },
  share: {
    title: "",                 // kosong = judul halaman
    text: "",                  // kosong = "Kami mengundang Anda ke pernikahan {nama} & {nama}."
  },
};
