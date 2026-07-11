Ringkasan implementasinya:
1. Multi-upload + thumbnail

#svgFile sekarang multiple. Tiap file jadi entri di state.sources (id, nama, teks SVG, gambar, aspect ratio, checked).
Muncul strip horizontal di atas kanvas preview, tiap thumbnail punya checkbox (aktif/nonaktif dipakai saat generate) dan tombol × untuk hapus.

2. Background

Radio Transparan/Warna. Kalau "Warna", ctx.fillRect dipanggil sebelum objek digambar (canvas & PNG), dan <rect fill="..."> disesuaikan di SVG export.

3. Pewarnaan objek

Mode: Warna asli / Satu warna / Warna-warni.
Untuk canvas/PNG: pakai trik globalCompositeOperation = "source-atop" supaya siluet SVG di-recolor solid.
Untuk SVG export: pakai <filter> dengan feFlood + feComposite operator="in" per warna, jadi tetap vector, bukan raster.
Input hex dipisah koma + tombol 🎲 Random yang generate N warna acak sesuai jumlah objek.

4. Batch download (zip streaming)

Pilih jumlah gambar & format (PNG/SVG/keduanya).
Alur: generate 1 gambar → acak seed → generate lagi → ... (persis seperti diminta).
Pakai library client-zip (CDN, dynamic import()) yang bikin ZIP sebagai ReadableStream — file di-pull satu-satu via async generator, jadi tidak semua gambar ditahan di memori sekaligus.
Kalau browser dukung showSaveFilePicker (Chrome/Edge): stream langsung ke disk. Kalau tidak (Firefox/Safari): fallback ke unduh blob biasa.
