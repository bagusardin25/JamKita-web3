# PRD — Jamkita

**Bank waktu on-chain: saling membantu, dibayar dengan jam, bukan uang.**
Versi 1.0 · 11 November 2026 · Project 4 dari 5 (BOT Chain Ecosystem Support Program)

**Status: M2 selesai — 55%.** Contract, test (44 lulus, termasuk uji invarian 2.400 aksi acak) dan UI lengkap; alur buka guyub sampai pertukaran teruji di chain lokal dengan tiga wallet dev. Ukuran contract 21.160 byte (86,1% dari batas 24.576), jadi tidak perlu contract pembaca terpisah. Belum di-deploy ke testnet maupun mainnet. Detail: [PROGRESS.md](PROGRESS.md).

---

## 1. Ringkasan

Jamkita adalah bank waktu. Sekelompok orang yang saling kenal — satu RT, satu komunitas, satu angkatan — membentuk sebuah **guyub** dan saling bertukar bantuan. Satuan tukarnya adalah jam: mengajar Excel selama satu jam bernilai sama dengan membetulkan sepeda selama satu jam. Setelah dibantu, penerima membayar penolongnya dengan jam.

Jam di Jamkita bukan token dan bukan uang. Tidak ada yang mencetaknya: setiap anggota mulai dari nol, saldo boleh minus sampai batas tertentu, dan **jumlah seluruh saldo dalam satu guyub selalu nol**. Jam yang kamu terima adalah jam yang diberikan orang lain. Smart contract menjaga aturan itu, sehingga tidak ada pengurus yang bisa menambah jam untuk dirinya sendiri.

"Jamkita" berarti *jam kita*. "Guyub" berarti rukun dan akrab.

| | |
|---|---|
| Kategori | Social |
| Jaringan | BOT Chain Mainnet (chain ID 677) |
| Bentuk | Satu smart contract + satu web app |
| Token | Tidak ada. Jam tidak bisa dibeli, dijual, atau ditukar BOT. Tidak ada biaya selain gas |
| Bahasa UI | Inggris; nama dan istilah Indonesia |
| Folder | `D:\Project Web3\jamkita` |

## 2. Latar belakang dan tujuan

### Masalah
Banyak bantuan sehari-hari tidak pernah terjadi karena canggung meminta dan canggung membayar: terlalu kecil untuk diupah, terlalu sering untuk terus-menerus gratis. Bank waktu menjawabnya dengan pembukuan sederhana, tetapi biasanya berjalan di buku tulis atau spreadsheet satu pengurus, yang berarti harus percaya pada orang itu.

Di direktori BOT Chain, semua project berbasis kelompok memakai BOT: arisan, iuran, asuransi patungan. Tidak ada satu pun yang mencatat pertukaran tanpa uang.

### Tujuan produk
1. Membuat pertukaran bantuan tercatat dalam dua ketukan: satu pihak mencatat, pihak lain menyetujui.
2. Menjaga pembukuan yang tidak bisa dimanipulasi siapa pun, termasuk pengurus guyub.
3. Menjadikan keterbukaan sebagai fitur: saldo dan riwayat setiap anggota terlihat oleh seluruh guyub.
4. Memenuhi seluruh kriteria eligibility program lewat pemakaian wajar.

### Bukan tujuan (v1)
- Tidak ada token ERC-20, harga, atau konversi ke BOT maupun rupiah.
- Tidak ada transfer jam antar-guyub.
- Tidak ada arbitrase sengketa.
- Tidak ada chat, penjadwalan, atau notifikasi.
- Tidak ada penilaian bintang.
- Tidak ada backend, database, atau indexer.

## 3. Pengguna sasaran

| Persona | Kebutuhan | Yang didapat |
|---|---|---|
| **Pengurus** | Ingin memulai bank waktu untuk komunitasnya | Membuka guyub, menentukan batas minus, menyetujui anggota |
| **Anggota yang menolong** | Ingin bantuannya tercatat | Mengajukan jam; tercatat begitu penerima menyetujui |
| **Anggota yang dibantu** | Ingin membalas tanpa uang | Memberi jam langsung, atau menyetujui pengajuan |
| **Calon anggota** | Ingin tahu apakah guyub ini hidup | Papan tawaran, saldo, dan buku besar bisa dibaca tanpa wallet |

## 4. Pemetaan ke kriteria program

| Kriteria | Cara dipenuhi |
|---|---|
| Akun X aktif, 5 post | Akun X khusus Jamkita. Draft post disiapkan di tahap akhir. **Dikerjakan olehmu.** |
| Pengumuman mainnet | Post dengan kalimat wajib "Officially launched on BOT Chain Mainnet." |
| BOT Chain di website | Footer menampilkan nama BOT Chain dengan tautan ke `https://botchain.ai` dan `https://scan.botchain.ai` |
| Produk usable | Frontend lengkap, connect wallet, membuat guyub sampai mencatat pertukaran berjalan |
| Independen dan orisinal | Tidak ada bank waktu atau pembukuan kredit bersama di direktori; mekanik jumlah-nol ditulis dari nol; tampilan berbeda dari tiga project sebelumnya |
| 3 wallet, 5 transaksi | Satu guyub kecil: buka guyub, dua orang bergabung, satu tawaran, satu pertukaran — sudah 3 wallet dan 5 transaksi |
| Deployment + verification | Contract di-deploy ke mainnet dan source-nya diverifikasi di scan.botchain.ai |

## 5. Aturan bank waktu

Aturan ini ditampilkan di halaman About dan ditegakkan oleh contract.

### 5.1 Satuan
- Jam dicatat dalam **kelipatan seperempat jam** (15 menit).
- Satu pertukaran minimal 15 menit dan maksimal 8 jam, untuk mencegah salah ketik yang mahal.
- **Satu jam adalah satu jam**, apa pun jenis bantuannya.

### 5.2 Jumlah-nol
- Setiap anggota mulai dengan saldo 0.
- Saat A membayar B dua jam, saldo A turun 2 dan saldo B naik 2. Tidak ada jam yang tercipta atau hilang.
- Dalam satu guyub, **jumlah semua saldo anggota ditambah kas bersama selalu tepat nol**.

### 5.3 Batas minus
- Saldo boleh minus sampai **batas minus** guyub, yang dipilih pengurus saat membuka guyub (2 sampai 20 jam, bawaan 5 jam).
- Batas ini yang memungkinkan guyub mulai berputar: harus ada yang menerima dulu sebelum ada yang punya jam.
- Pembayaran yang membuat saldo pembayar melewati batas minus ditolak.

### 5.4 Kas bersama
Setiap guyub memiliki **kas bersama**, akun milik guyub itu sendiri.
- Anggota boleh **menyumbang** jam ke kas.
- Pengurus boleh **menghibahkan** jam dari kas kepada anggota, misalnya warga lanjut usia yang lebih banyak menerima daripada memberi. Hibah tidak boleh melebihi isi kas.
- Kas juga menampung saldo anggota yang keluar (5.6), sehingga hitungan jumlah-nol tetap utuh.

### 5.5 Dua cara mencatat pertukaran

| Cara | Siapa memulai | Langkah |
|---|---|---|
| **Give hours** | Yang dibantu | Satu transaksi: jam langsung pindah |
| **Request hours** | Yang menolong | Dua transaksi: penolong mengajukan, yang dibantu menyetujui |

Pengajuan bisa ditolak oleh yang dituju atau dibatalkan oleh pengaju. Setiap pertukaran membawa catatan singkat (maksimal 140 byte) dan bisa ditautkan ke sebuah tawaran.

### 5.6 Masuk dan keluar
- Guyub bisa **terbuka** (siapa pun langsung bergabung) atau **dengan persetujuan** (pengurus menyetujui tiap permintaan).
- Anggota boleh keluar bila saldonya nol atau positif; sisa saldo positif masuk kas bersama.
- Anggota bersaldo minus tidak bisa keluar sendiri. Pengurus bisa mengeluarkannya; saldo minusnya ditanggung kas bersama, dan itu tercatat terbuka di buku besar.

### 5.7 Yang tidak bisa dilakukan pengurus
Pengurus **tidak bisa** mengubah saldo siapa pun, mencetak jam, membatalkan pertukaran, atau mengambil jam dari anggota. Wewenangnya hanya: menyetujui anggota, mengeluarkan anggota, menghibahkan dari kas, dan menyerahkan kepengurusan.

## 6. Lingkup fitur

### 6.1 Masuk v1

**F1 — Membuka guyub.**
Nama (3–48 byte), deskripsi (maksimal 200 byte), batas minus, dan cara bergabung.

**F2 — Bergabung.**
Langsung untuk guyub terbuka; lewat permintaan untuk guyub dengan persetujuan. Pengurus melihat antrean permintaan.

**F3 — Papan tawaran dan permintaan.**
Anggota memasang **Offer** ("saya bisa…") atau **Request** ("saya butuh…") dengan judul (maksimal 64 byte), rincian (maksimal 200 byte), dan kategori. Pemasang bisa menutupnya.

Kategori: Teaching · Repairs · Errands · Care · Tech · Creative · Food · Transport · Other.

**F4 — Give hours.**
Pilih anggota, jumlah jam, dan catatan. Form menampilkan saldo sesudahnya dan menolak sebelum transaksi bila melewati batas minus.

**F5 — Request hours.**
Penolong mengajukan jam ke anggota yang dibantunya. Yang dituju melihatnya di kotak masuk dan memilih **Approve** atau **Decline**.

**F6 — Kotak masuk.**
Satu tempat untuk semua yang menunggu tindakanmu di semua guyub: pengajuan jam yang perlu disetujui, dan permintaan bergabung bila kamu pengurus. Ini layar pertama setelah wallet terhubung.

**F7 — Anggota dan saldo.**
Daftar anggota dengan saldo, total jam diberikan, total jam diterima, dan jumlah pertukaran. Terlihat oleh siapa pun.

**F8 — Buku besar.**
Riwayat seluruh pertukaran, hibah, sumbangan, dan anggota yang keluar, terbaru di atas. Selalu menampilkan pemeriksaan **"saldo anggota + kas = 0"**.

**F9 — Kas bersama.**
Isi kas, tombol sumbang untuk anggota, tombol hibah untuk pengurus.

**F10 — Profil.**
Nama (maksimal 32 byte), tentang saya (maksimal 140 byte), dan kontak (maksimal 48 byte, misalnya akun Telegram) agar anggota bisa saling menghubungi di luar aplikasi. Berlaku di semua guyub.

**F11 — Direktori guyub dan statistik.**
Daftar guyub dengan jumlah anggota dan total jam yang sudah bertukar.

### 6.2 Tidak masuk v1 (kandidat v2)
- Batas minus yang tumbuh seiring riwayat anggota.
- Penjamin: anggota lama menjamin anggota baru.
- Batas saldo positif untuk mendorong jam terus berputar.
- Transfer jam antar-guyub.
- Toggle bahasa Indonesia/Inggris.

## 7. Alur pengguna

### 7.1 Memulai guyub
1. **Start a guyub** → hubungkan wallet bila perlu.
2. Isi nama, deskripsi, batas minus, cara bergabung → konfirmasi.
3. Masuk ke halaman guyub; salin tautan undangan.

### 7.2 Bergabung dan memasang tawaran
1. Buka tautan guyub → **Join** atau **Ask to join**.
2. Lengkapi profil bila belum (nama dan kontak).
3. **Post an offer** → judul, kategori, rincian → konfirmasi.

### 7.3 Mencatat bantuan
*Dimulai penolong:*
1. Di halaman guyub, **Request hours** → pilih anggota, jam, catatan → konfirmasi.
2. Yang dibantu melihatnya di kotak masuk → **Approve** → konfirmasi.
3. Kedua saldo berubah; pertukaran muncul di buku besar.

*Dimulai yang dibantu:*
1. **Give hours** → pilih anggota, jam, catatan → konfirmasi. Selesai dalam satu transaksi.

### 7.4 Keadaan yang ditangani
Tanpa wallet · jaringan salah · bukan anggota · permintaan bergabung masih menunggu · melewati batas minus (dengan angka sisa yang boleh dipakai) · memberi jam ke diri sendiri · pengajuan sudah disetujui, ditolak, atau dibatalkan orang lain · mencoba keluar dengan saldo minus · hibah melebihi isi kas · guyub tidak ditemukan · transaksi ditolak atau gagal · RPC gagal · saldo BOT tidak cukup.

## 8. Halaman dan layar

| Rute | Isi |
|---|---|
| `#/` Beranda | Penjelasan singkat bank waktu, direktori guyub, statistik, tombol mulai guyub |
| `#/guyub/:id` Guyub | Empat tab: **Board** (tawaran dan permintaan), **Members** (saldo), **Ledger** (buku besar), **Commons** (kas bersama); aksi beri jam, ajukan jam, pasang tawaran; panel pengurus |
| `#/new` Guyub baru | Form pembukaan guyub |
| `#/inbox` Kotak masuk | Semua yang menunggu tindakanmu |
| `#/me` Jam saya | Saldo di tiap guyub, riwayat pribadi, profil |
| `#/about` Tentang | Aturan bank waktu, penegasan bahwa jam bukan uang, catatan privasi |
| Footer (semua halaman) | "Built on BOT Chain" dengan tautan wajib, alamat contract, akun X |

## 9. Arah desain

Empat project, empat pusat layar yang berbeda.

| | Sambung | Dakon | Colok | Jamkita |
|---|---|---|---|---|
| Suasana | Kertas terang | Panggung gelap | Papan penunjuk arah | Koperasi warga yang ramah |
| Motif | Benang merah | Papan kayu, kawung | Stopkontak | Cincin jam 12 ruas |
| Aksen | Merah | Kuningan | Kuning rambu | Hijau daun dan jingga kunyit |
| Tipografi | Serif buku | Grotesk berkarakter | Sans rambu | Sans humanis membulat, angka tabular |
| Pusat layar | Kolom baca | Papan permainan | Peta | Dasbor dan tabel |

- **Tiga atribut:** ramah, jernih, adil.
- **Motif:** cincin jam. Saldo digambar sebagai cincin yang terisi searah jarum jam untuk plus dan berlawanan untuk minus; satu ruas adalah satu jam.
- **Plus dan minus tidak hanya lewat warna:** selalu dengan tanda + dan −, arah isian cincin, dan teks.
- **Angka tabular** di semua tabel, rata kanan, agar saldo mudah dibandingkan.
- **Tata letak dasbor** memang cocok di sini: ini aplikasi pembukuan. Tabel menjadi daftar kartu di layar sempit.
- **Yang dihindari:** tampilan dompet kripto atau aplikasi keuangan — grafik harga, kilau koin — apa pun yang memberi kesan jam adalah aset.

Kontras minimal WCAG AA. Semua aksi bisa dijalankan dengan keyboard; tabel memakai markup tabel yang benar.

## 10. Spesifikasi smart contract

**Contract:** `Jamkita.sol` · Solidity 0.8.24 · EVM target `paris` · tanpa dependensi eksternal · tanpa fungsi payable.

### 10.1 Pembukuan
- Saldo disimpan sebagai bilangan bulat bertanda dalam satuan seperempat jam.
- Setiap perpindahan jam melewati satu fungsi internal yang mengurangi satu akun dan menambah akun lain dengan jumlah yang sama, sehingga jumlah-nol tidak bisa dilanggar oleh jalur mana pun.
- Riwayat disimpan sebagai daftar di contract, bukan sebagai event, agar bisa dibaca tanpa `eth_getLogs`.

### 10.2 Fungsi tulis

| Fungsi | Aturan |
|---|---|
| `createGuyub(name, about, creditLimit, joinMode)` | Nama 3–48 byte; deskripsi ≤ 200 byte; batas 2–20 jam; pembuat menjadi pengurus dan anggota pertama |
| `join(guyubId)` | Guyub terbuka: langsung aktif. Dengan persetujuan: menjadi permintaan |
| `approveMember(guyubId, wallet)` / `declineMember(...)` | Hanya pengurus |
| `leave(guyubId)` | Saldo ≥ 0; sisa positif masuk kas |
| `removeMember(guyubId, wallet)` | Hanya pengurus; saldo anggota, plus atau minus, pindah ke kas |
| `postListing(guyubId, kind, category, title, detail)` | Hanya anggota aktif |
| `closeListing(listingId)` | Hanya pemasang |
| `giveHours(guyubId, to, units, memo, listingId)` | Keduanya anggota aktif; bukan diri sendiri; 1–32 unit; tidak melewati batas minus |
| `requestHours(guyubId, from, units, memo, listingId)` | Keduanya anggota aktif; membuat pengajuan |
| `approveRequest(requestId)` | Hanya yang dituju; aturan batas minus diperiksa saat ini |
| `declineRequest(requestId)` / `cancelRequest(requestId)` | Yang dituju / pengaju |
| `donate(guyubId, units)` | Anggota → kas; tidak melewati batas minus |
| `grant(guyubId, to, units, memo)` | Hanya pengurus; kas → anggota; tidak melebihi isi kas |
| `transferSteward(guyubId, newSteward)` | Hanya pengurus; penerima harus anggota aktif |
| `setProfile(name, about, contact)` | ≤ 32, ≤ 140, ≤ 48 byte |

### 10.3 Fungsi baca

`guyubCount` · `getGuyub(id)` · `getGuyubs(cursor, limit)` · `guyubsOf(wallet)` · `getMembers(guyubId, cursor, limit)` · `memberOf(guyubId, wallet)` · `getPendingMembers(guyubId)` · `getListings(guyubId, cursor, limit)` · `getLedger(guyubId, cursor, limit)` · `getRequests(guyubId, cursor, limit)` · `inboxOf(wallet)` · `profileOf(wallet)` · `getProfiles(wallets[])` · `stats()`

### 10.4 Event
`GuyubCreated` · `MemberJoined` · `MemberLeft` · `ListingPosted` · `HoursMoved` · `RequestCreated` · `RequestResolved` · `ProfileSet` — untuk keterbacaan di explorer.

### 10.5 Keamanan
- Tidak ada BOT yang disimpan atau dipindahkan oleh contract.
- **Uji invarian:** test menjalankan ribuan aksi acak pada beberapa guyub dan memeriksa setelah setiap aksi bahwa jumlah saldo ditambah kas tepat nol.
- Tidak ada pemilik contract. Tidak ada fungsi yang bisa mengubah saldo di luar aturan bagian 5.
- Panjang semua teks dibatasi.

### 10.6 Biaya terukur (gas 20 gwei, BOT ≈ $12,6)

Diukur 11 November 2026 dengan `npm run gas` di `contracts/` (chain Hardhat in-process, teks realistis). Kolom "Perkiraan awal" adalah angka PRD sebelum ada kode.

| Aksi | Gas | BOT | USD | Perkiraan awal |
|---|---|---|---|---|
| Deploy contract | 4.624.780 | 0,0925 | 1,17 | 0,06–0,09 BOT |
| Membuka guyub | 320.728 | 0,0064 | 0,08 | ± 0,006 BOT |
| Bergabung (guyub terbuka) | 132.148 | 0,0026 | 0,03 | ± 0,002 BOT |
| Mengisi profil | 137.266 | 0,0027 | 0,03 | — |
| Memasang tawaran | 254.995 | 0,0051 | 0,06 | ± 0,005 BOT |
| Give hours | 175.912 | 0,0035 | 0,04 | ± 0,003 BOT |
| Request hours | 324.145 | 0,0065 | 0,08 | — |
| Approve | 125.809 | 0,0025 | 0,03 | — |
| Request + approve | 449.954 | 0,0090 | 0,11 | ± 0,005 BOT |
| Menyumbang ke kas | 73.909 | 0,0015 | 0,02 | — |
| Hibah dari kas | 114.931 | 0,0023 | 0,03 | — |

Request + approve hampir dua kali perkiraan karena pengajuan disimpan sebagai data contract (bukan event) dan masuk ke daftar terbuka kedua pihak agar kotak masuk bisa dibaca tanpa `eth_getLogs`. Catatan pengajuan tidak disalin ulang ke buku besar saat disetujui; view buku besar membacanya dari pengajuan.

**Ukuran contract (M1):** bytecode runtime 21.160 byte, 86,1% dari batas 24.576 byte (EIP-170), diukur dengan `npm run size`. Semua fungsi baca tetap di `Jamkita.sol`; contract pembaca terpisah tidak diperlukan.

### 10.7 Keputusan saat implementasi (M1)

Aturan yang tidak disebut eksplisit di atas, diputuskan saat menulis contract dan dicakup test:

- **Sumbangan dan hibah** memakai batas yang sama dengan pertukaran: 15 menit sampai 8 jam per transaksi.
- **Pengurus tidak bisa menghibahkan ke dirinya sendiri** (`SelfGrant`), agar kas tidak bisa dikuras pengurus.
- **Pengurus tidak bisa keluar** sebelum menyerahkan kepengurusan (`StewardCannotLeave`), dan tidak bisa mengeluarkan dirinya sendiri.
- **Anggota yang dikeluarkan harus meminta lagi** untuk bergabung, juga di guyub terbuka.
- **Keluar tetap tercatat di buku besar** walau saldonya nol (entri 0 jam), sehingga riwayat "anggota yang keluar" lengkap.
- **Pengajuan yang menyangkut anggota yang keluar atau dikeluarkan otomatis dibatalkan.**
- **Permintaan bergabung bisa ditarik** oleh peminta lewat `leave(guyubId)` selama masih menunggu.
- **ID tawaran dan pengajuan bersifat global** (bukan per guyub), sesuai tanda tangan `closeListing(listingId)` dan `approveRequest(requestId)`.
- **Judul tawaran 3–64 byte** (minimal 3 agar tidak kosong).
- **Kas bisa minus** setelah menanggung anggota yang dikeluarkan; hibah hanya mungkin bila isi kas positif.
- **Fungsi baca tambahan:** `getGuyub` dan kawan-kawan mengembalikan struct lengkap; `inboxOf` juga mengembalikan pengajuan yang dikirim wallet itu dan masih menunggu, untuk bagian "Sent by you" di kotak masuk.

## 11. Arsitektur teknis

```
jamkita/
├── PRD.md
├── README.md
├── PROGRESS.md
├── contracts/            Hardhat 2 + ethers + chai (JavaScript)
│   ├── contracts/Jamkita.sol
│   ├── test/             aturan, batas minus, kas, keanggotaan, dan uji invarian jumlah-nol
│   ├── scripts/          deploy, seed (lokal saja), export-abi
│   └── .env.example      (PRIVATE_KEY diisi olehmu, tidak pernah di-commit)
└── web/                  Vite + React + TypeScript + viem
    └── src/
        ├── config/       chain, alamat contract, ABI
        ├── lib/          wallet, client baca, format jam
        ├── components/   cincin saldo, tabel anggota, buku besar, form jam
        ├── pages/
        └── styles/
```

- **Format jam di satu tempat:** unit seperempat jam diubah menjadi tampilan ("1 h 15 min", "+2.5 h") oleh satu modul, agar tidak ada pembulatan yang berbeda antar-layar.
- **Wallet:** EIP-6963 dengan cadangan `window.ethereum`; lapisan koneksinya memakai pola yang sudah teruji di Sambung, tampilannya dibuat baru.
- **Routing:** hash router. **Hosting:** Vercel, root directory `web`.
- **Wallet dev:** hanya di mode development pada chain lokal; tidak ikut build produksi.

## 12. Privasi dan penegasan

Ditulis jelas di aplikasi, bukan hanya di PRD.

- **Jam bukan uang.** Tidak punya nilai tukar, tidak bisa dibeli, dan tidak dijanjikan bisa dicairkan. Kalimat ini ada di beranda dan di halaman About.
- **Semua terbuka.** Saldo, catatan pertukaran, tawaran, nama, dan kontak bisa dibaca siapa pun dan tersimpan permanen. Peringatan muncul di form profil dan form catatan.
- **Kontak bersifat sukarela.** Isi hanya kontak yang kamu rela dilihat publik.
- **Tanpa data sensitif** di catatan pertukaran: alamat rumah, kondisi kesehatan, dan sejenisnya.

## 13. Kebutuhan non-fungsional

| Aspek | Target |
|---|---|
| Ketepatan | Jumlah-nol terjaga di seluruh uji invarian |
| Kejelasan | Setiap form jam menampilkan saldo sebelum dan sesudah sebelum transaksi dikirim |
| Responsif | Tabel berubah menjadi kartu di 375 px tanpa scroll horizontal |
| Aksesibilitas | Tabel bermarkup benar, plus-minus tidak bergantung warna, fokus terlihat |
| Ketahanan | Kegagalan RPC menampilkan pesan dan tombol coba lagi |

## 14. Tahapan dan progres

| Tahap | Isi | Progres |
|---|---|---|
| M0 | PRD | 5% |
| M1 | Smart contract + test dan uji invarian lulus | 30% |
| M2 | **UI/UX lengkap: beranda, guyub empat tab, kotak masuk, jam saya; alur buka guyub sampai pertukaran berjalan di chain lokal** | **55%** |
| M3 | Deploy testnet (968) + uji dengan tiga wallet sungguhan | 70% |
| M4 | Deploy mainnet (677) + verifikasi source | 85% |
| M5 | Vercel produksi, pengumuman X, aktivitas on-chain, audit checklist | 100% |

**Titik lapor:** di akhir M2 saya berhenti dan memberi tahu kamu, supaya kamu bisa menyiapkan repo dan menghubungkannya.

## 15. Pembagian kerja

| Saya | Kamu |
|---|---|
| PRD, contract, test, frontend, script deploy | Membuat group project **sebelum** deploy mainnet |
| Uji lokal dan panduan uji testnet | Setup repo dan menghubungkan ke Vercel |
| Draft post X dan teks pengumuman | Membuat akun X dan mempublikasikan post |
| Panduan verifikasi contract | Menjalankan deploy dengan private key-mu sendiri |
| Audit checklist eligibility | Membuka guyub pertama dengan 2–3 orang sungguhan dan mencatat pertukaran yang benar-benar terjadi |

## 16. Risiko

| Risiko | Mitigasi |
|---|---|
| Anggota menerima bantuan sampai batas minus lalu menghilang | Jam hanya berlaku di dalam guyub; guyub bisa memakai persetujuan anggota; batas minus kecil; kerugian ditanggung kas secara terbuka |
| Dianggap token atau produk keuangan | Tidak ada ERC-20, harga, atau konversi; contract tanpa fungsi payable; penegasan di aplikasi; desain menghindari estetika keuangan |
| Contract melewati batas ukuran 24 KB | Terukur di M1: 21.160 byte (86,1%). Tidak perlu contract pembaca terpisah; bila fitur v2 menambah ukuran, fungsi baca yang dipindah lebih dulu |
| Sengketa: bantuan diklaim tetapi tidak diakui | Pengajuan butuh persetujuan pihak yang dibantu; tidak ada jam berpindah tanpa tindakan pembayar |
| Banyak layar membuat aplikasi terasa berat | Kotak masuk sebagai titik masuk tunggal; halaman guyub dengan empat tab yang konsisten |
| Guyub sepi | Direktori menampilkan aktivitas; tautan undangan; papan tawaran terbaca tanpa wallet |
| Dinilai mirip arisan atau iuran yang sudah ada | Tanpa BOT sama sekali; mekanik jumlah-nol dan batas minus tidak ada di direktori |

## 17. Kriteria terima

1. Tiga wallet membentuk satu guyub dan menyelesaikan satu pertukaran lewat Give hours dan satu lewat Request–Approve.
2. Setelah setiap aksi, buku besar menampilkan "saldo anggota + kas = 0".
3. Contract menolak: pembayaran yang melewati batas minus, memberi jam ke diri sendiri, aksi oleh bukan anggota, persetujuan pengajuan oleh pihak yang salah, hibah melebihi isi kas, keluar dengan saldo minus.
4. Pengurus tidak bisa mengubah saldo di luar hibah dari kas, dibuktikan dengan test.
5. Uji invarian lulus untuk minimal 2.000 aksi acak.
6. Kotak masuk menampilkan semua pengajuan yang menunggu di semua guyub.
7. Tabel anggota dan buku besar terbaca di 375 px.
8. Footer memuat nama BOT Chain dan kedua tautan wajib.
9. Contract terverifikasi di scan.botchain.ai dan alamatnya tampil di situs.

## 18. Hal yang masih terbuka

- Istilah **guyub** untuk kelompok: dipertahankan, atau diganti kata yang lebih umum.
- Angka bawaan: batas minus 5 jam, maksimal 8 jam per pertukaran, satuan 15 menit.
- Apakah saldo anggota memang sebaiknya terbuka untuk siapa pun (rancangan saat ini: ya).
- Nama akun X dan domain.
- Kriteria ketujuh program, yang belum tercantum di materi.
