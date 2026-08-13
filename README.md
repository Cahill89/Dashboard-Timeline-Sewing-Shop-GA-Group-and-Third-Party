# Dashboard Timeline — Seat Cover GA/QG & Third Party

Dashboard interaktif berbasis HTML/CSS/JS murni untuk memantau timeline pekerjaan
Seat Cover, Curtain, Fly Kit, dan pekerjaan third party lainnya. Dibangun dengan
[Chart.js](https://www.chartjs.org/) dan [SheetJS/xlsx](https://sheetjs.com/) via CDN,
tanpa build step — tinggal buka atau deploy sebagai situs statis.

## Struktur file

```
.
├── index.html   # markup halaman + data dashboard (JSON) + pemuatan CSS/JS
├── style.css    # seluruh styling dashboard
├── script.js    # seluruh logika dashboard (render kalender, chart, filter, export, dll.)
└── README.md
```

Data sumber dashboard tertanam langsung di `index.html` di dalam
`<script id="dashboard-data" type="application/json">…</script>`, sehingga dashboard
tetap berfungsi penuh meski dibuka langsung dari file lokal (tanpa web server) maupun
saat di-hosting di GitHub Pages.

## Menjalankan secara lokal

Cukup buka `index.html` di browser modern (Chrome/Edge/Firefox terbaru). Tidak
diperlukan proses build, install dependency, atau server khusus.

Jika ingin menjalankan lewat server lokal (opsional, disarankan agar perilaku sama
persis dengan hosting):

```bash
# Python 3
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub, lalu push ketiga file (`index.html`, `style.css`,
   `script.js`) ke branch `main` (root repo, bukan di dalam folder).
2. Di repo tersebut buka **Settings → Pages**.
3. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
4. Pilih branch `main` dan folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit, GitHub akan memberi URL publik seperti
   `https://<username>.github.io/<nama-repo>/`.

Karena semua aset CSS/JS eksternal (Chart.js, SheetJS, Google Fonts) dimuat lewat CDN
dengan URL absolut, dashboard akan langsung berfungsi di GitHub Pages tanpa perlu
konfigurasi tambahan.

## Memperbarui data

Untuk mengganti data dashboard, edit isi JSON di dalam tag
`<script id="dashboard-data" type="application/json">` pada `index.html`. Struktur
utamanya mencakup: `daily_totals`, `monthly_totals`, `top_products`, `all_products`,
`calendar_products`, `cat_daily_series`, dan `cat_daily_dates`.

## Fitur utama

- Ringkasan statistik & grafik tren (Actual vs Plan)
- Kalender timeline per produk dengan sel yang bisa diedit
- Filter rentang tanggal
- Ekspor data ke Excel (menggunakan SheetJS)
- **Lembur per-hari**: setiap sel kalender punya kotak centang "Ada lembur hari ini" —
  saat dicentang bisa diatur jam lembur khusus hari itu (bisa 0 jika ternyata tidak
  lembur). Tidak lagi terikat ke jam lembur global saja.
- **Filter job order & layar penuh** pada Timeline Produksi: pilih job order yang mau
  ditampilkan, urutkan prioritas dengan tombol ▲▼, dan buka mode layar penuh supaya
  mudah dipresentasikan.
- **Simpan ke browser**: tombol "💾 Simpan perubahan" tersedia di tiga tempat (tab
  Distribusi Pengerjaan, Timeline Produksi, dan Rekap Harian) — ketiganya menyimpan
  seluruh perubahan (kalender, lembur, job order, urutan, pengaturan jam kerja) ke
  `localStorage` browser, sehingga tidak hilang saat halaman dimuat ulang di
  perangkat/browser yang sama. Ada juga tombol untuk menghapus data tersimpan dan
  kembali ke data bawaan.
- **Login untuk mode edit**: tanpa login, dashboard tetap bisa dilihat penuh, tapi
  semua kontrol edit (klik sel kalender, ubah jam kerja, tambah/ubah/hapus job order,
  simpan rekap) terkunci sampai user login lewat tombol di header. Akun bawaan bisa
  diganti langsung di `script.js` (cari komentar yang menandai bagian akun).

> Catatan: karena data disimpan di `localStorage`, data yang tersimpan hanya berlaku
> di browser & perangkat tempat "Simpan perubahan" ditekan — tidak otomatis
> tersinkron ke perangkat lain maupun ke repo GitHub itu sendiri.

