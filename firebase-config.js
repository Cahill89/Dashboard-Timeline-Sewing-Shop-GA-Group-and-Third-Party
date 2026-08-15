// ======================================================================
// KONFIGURASI FIREBASE — WAJIB DIISI SEBELUM DASHBOARD BISA SINKRON KE CLOUD
// ======================================================================
// Cara mendapatkan config ini (gratis, ±5 menit):
// 1. Buka https://console.firebase.google.com -> "Add project" -> beri nama
//    (mis. "gmf-seat-cover-dashboard") -> ikuti wizard sampai selesai.
// 2. Di dashboard project: klik ikon "</>" (Web app) -> daftarkan app
//    (nickname bebas, TIDAK perlu centang Firebase Hosting) -> Register app.
// 3. Firebase akan menampilkan blok `firebaseConfig = {...}` — copy semua
//    isinya dan tempel menggantikan objek di bawah ini.
// 4. Di menu kiri Firebase Console: buka "Build" -> "Firestore Database"
//    -> "Create database" -> pilih lokasi server (mis. asia-southeast) ->
//    mode "Start in test mode" dulu (bisa diperketat nanti, lihat catatan
//    keamanan di bawah).
// 5. Simpan file ini, lalu upload ulang (commit & push) ke GitHub Pages.
//
// CATATAN: config di bawah ini AMAN untuk ditaruh di kode publik (bukan
// rahasia seperti password) — akses sebenarnya diatur lewat "Firestore
// Rules" di langkah keamanan di bawah, bukan lewat config ini.
// ======================================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCS6fpimwviT0TL2opDhHDskGurl-jvP_Q",
  authDomain: "dashboard-sewing-shop-gmf.firebaseapp.com",
  projectId: "dashboard-sewing-shop-gmf",
  storageBucket: "dashboard-sewing-shop-gmf.firebasestorage.app",
  messagingSenderId: "511250398251",
  appId: "1:511250398251:web:2058849b467e1a2b58fe6e"
};

// ======================================================================
// KEAMANAN (PENTING) — lakukan setelah dashboard terbukti bisa nyimpan/baca:
// Di Firebase Console -> Firestore Database -> tab "Rules", ganti jadi:
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /dashboards/{docId} {
//         allow read: if true;   // semua orang boleh LIHAT dashboard
//         allow write: if true;  // sementara: semua orang boleh EDIT juga
//         // Catatan: login admin/supervisor di dashboard ini HANYA mengunci
//         // tombol di sisi tampilan (UI), BUKAN mengunci Firestore itu
//         // sendiri. Kalau butuh proteksi tulis yang sungguhan (misalnya
//         // hanya staf tertentu yang boleh menyimpan), perlu ditambah
//         // Firebase Authentication + rule berbasis akun login — kabari
//         // saya kalau butuh ini, akan saya bantu set up.
//       }
//     }
//   }
//
// Klik "Publish" setelah mengubah rules.
// ======================================================================
