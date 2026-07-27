// ============================================================
// help-texts.js – Keterangan tooltip untuk setiap pengaturan
// ============================================================

const HELP_TEXTS = {
  // === CANVAS ===
  tileWidth: 'Lebar canvas dalam pixel. Akan mempengaruhi tinggi secara otomatis berdasarkan rasio aspek.',
  tileHeight: 'Tinggi canvas dalam pixel. Akan menyesuaikan dengan lebar berdasarkan rasio aspek yang dipilih.',
  aspectRatio: 'Pilih rasio aspek canvas. 16:9 (layar lebar) atau 1:1 (persegi). Perubahan akan otomatis menyesuaikan tinggi canvas.',

  // === JUMLAH & SEED ===
  count: 'Jumlah objek yang akan ditempatkan di dalam tile. Semakin banyak, semakin padat pattern.',
  seed: 'Nilai awal untuk generator acak. Seed yang sama akan menghasilkan pattern yang sama persis.',

  // === SLIDER ===
  baseScale: 'Ukuran dasar objek relatif terhadap sisi terpendek canvas. Nilai lebih besar = objek lebih besar.',
  scaleVariance: 'Seberapa besar variasi ukuran antar objek. 0% = semua sama besar, 100% = variasi maksimal.',
  rotation: 'Rentang rotasi acak dalam derajat. 0° = semua tegak, 180° = rotasi penuh acak.',
  spacing: 'Jarak minimum antar objek dalam pixel. Nilai lebih besar = objek lebih renggang.',
  jitter: 'Seberapa besar deviasi posisi dari grid sempurna. 0% = grid rapi, 100% = acak total.',
  repeatCount: 'Jumlah pengulangan tile yang ditampilkan di preview. 1× = satu tile, 5× = 5x5 tile.',

  // === LAYOUT ===
  layout: 'Gaya penempatan visual: Neat Grid (grid rapi), Diagonal Flow (menyebar diagonal), Radial Center (melingkar dari pusat), Tossed (acak penuh), Scattered (Poisson disk - jarak merata), Stripe (pola garis), All-Over (menyebar merata).',

  // === IZIN ===
  allowEdgeCuts: 'Izinkan objek dipotong di tepi tile. Diaktifkan = objek bisa menempel tepi, dimatikan = objek dijaga di dalam tile.',
  showTile: 'Tampilkan border (garis tepi) tile untuk memudahkan melihat batas pattern.',

  // === BACKGROUND ===
  bgMode: 'Pilih latar belakang: Transparan (tanpa warna) atau Warna (isi dengan warna solid).',
  bgColorPicker: 'Pilih warna latar belakang. Aktif hanya jika mode Background = Warna.',

  // === PEWARNAAN ===
  colorMode: 'Mode pewarnaan objek: Asli (warna dari SVG), Satu Warna (seragam), Warna-warni (beragam dari palet).',
  singleColorPicker: 'Pilih warna solid untuk semua objek. Aktif hanya jika mode Pewarnaan = Satu Warna.',
  multiColorHex: 'Daftar kode hex warna (dipisah koma). Objek akan diberi warna acak dari palet ini. Aktif hanya jika mode Pewarnaan = Warna-warni.',
  randomColorBtn: 'Hasilkan palet warna acak secara otomatis dan isi ke kolom multiColorHex.',

  // === TOMBOL ===
  generateBtn: 'Generate ulang pattern dengan pengaturan saat ini (sama seperti mengubah slider).',
  autoLayoutBtn: 'Hitung otomatis jumlah, skala, jarak, dan variasi optimal berdasarkan ukuran canvas dan aspek rasio objek.',
  sampleBtn: 'Muat contoh SVG bawaan (bentuk geometris) untuk mencoba aplikasi.',
  shuffleBtn: 'Acak nilai seed untuk mendapatkan variasi pattern baru.',

  // === DOWNLOAD ===
  downloadPngBtn: 'Download pattern saat ini sebagai file PNG (ukuran canvas penuh).',
  downloadSvgBtn: 'Download pattern saat ini sebagai file SVG (vektor, scalable).',

  // === BATCH ===
  batchCount: 'Jumlah gambar yang akan dibuat dalam batch. Maksimal 500.',
  batchFormat: 'Format output batch: PNG saja, SVG saja, atau keduanya.',
  batchMode: 'Mode batch berbasis JSON: Checked (hanya SVG yang dicentang), All files (semua SVG), Original (gabungan semua SVG dengan warna asli masing-masing).',
  batchOutputMode: 'Zip archive = semua file dalam satu ZIP. Individual = download satu per satu ke folder pilihan.',
  batchDownloadCountBtn: 'Buat batch berdasarkan jumlah gambar yang ditentukan di atas.',
  batchDownloadJsonBtn: 'Buat batch berdasarkan pengaturan yang dimuat dari file JSON.',
  exportJsonBtn: 'Download semua pengaturan saat ini sebagai file JSON (termasuk seed, layout, warna, aspect ratio, dll).',
  importJsonInput: 'Load pengaturan dari file JSON. Support single settings atau batch array.',

  // === STATISTIK ===
  coverageLabel: 'Persentase area canvas yang tertutup objek. <20% = terlalu renggang, 20-40% = ideal, 40-60% = padat, >60% = terlalu penuh.',
};

window.HELP_TEXTS = HELP_TEXTS;
