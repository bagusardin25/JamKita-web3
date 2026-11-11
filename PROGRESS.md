# Progres — Jamkita

Catatan status project agar bisa dilanjutkan kapan saja tanpa membaca ulang percakapan.
Terakhir diperbarui: **11 November 2026**.

## Status sekarang

**Milestone M2 selesai — 55%.** Contract dan UI lengkap, alur buka guyub sampai pertukaran teruji di chain lokal dengan tiga wallet dev. Belum ada yang di-deploy ke jaringan publik.

Pekerjaan dijeda di sini karena langkah berikutnya menunggu repo dan wallet deployer dari pemilik project.

| Tahap | Isi | Progres | Status |
|---|---|---|---|
| M0 | PRD | 5% | Selesai |
| M1 | Smart contract + test dan uji invarian | 30% | Selesai |
| M2 | UI/UX lengkap, alur penuh di chain lokal | 55% | Selesai |
| M3 | Deploy testnet (968) + uji tiga wallet sungguhan | 70% | **Berikutnya** |
| M4 | Deploy mainnet (677) + verifikasi source | 85% | Belum |
| M5 | Vercel produksi, pengumuman X, aktivitas on-chain, audit checklist | 100% | Belum |

## Yang sudah jadi

### Dokumen
- [PRD.md](PRD.md) — status, biaya gas terukur (10.6) dan keputusan implementasi (10.7) sudah diperbarui.
- [README.md](README.md) — cara menjalankan, deploy, dan setting Vercel.

### Smart contract (`contracts/`)
- `contracts/Jamkita.sol` — Solidity 0.8.24, target EVM `paris`, optimizer 200 runs, tanpa dependensi, tanpa fungsi payable, tanpa pemilik.
- Saldo bertanda dalam satuan seperempat jam. **Semua perpindahan jam lewat satu fungsi internal `_move`**, termasuk sumbangan, hibah, keluar, dan pengeluaran anggota. Kas bersama tercatat sebagai alamat nol di buku besar.
- Riwayat (buku besar, tawaran, pengajuan, antrean bergabung) disimpan di contract dan dibaca lewat fungsi view, karena RPC mainnet mematikan `eth_getLogs`.
- **Ukuran: 21.160 byte runtime (86,1% dari 24.576).** Tidak perlu contract pembaca terpisah.
- `test/Jamkita.test.js` — 43 test: setiap aturan dan penolakan di PRD 10.2 dan 17.3, test bahwa pengurus tidak bisa mengubah saldo kecuali lewat hibah dari kas, dan test bahwa ABI tidak punya fungsi payable, pemilik, atau fungsi tulis di luar daftar PRD.
- `test/Invariant.test.js` — 2.400 aksi acak (seed 677968) di empat guyub dengan batas minus dan cara bergabung berbeda. Setelah **setiap** aksi, membaca semua anggota dan kas dari contract dan memeriksa jumlahnya tepat nol; model JavaScript paralel juga memprediksi apakah tiap aksi harus berhasil atau ditolak, dan setiap saldo, status, dan isi kas harus sama persis.
- `scripts/deploy.js` — deploy ke jaringan mana pun, menulis alamat ke `deployments/<network>.json` dan `web/src/config/deployments.json`.
- `scripts/seed.js` — tiga guyub contoh; hanya mau jalan di chain lokal.
- `scripts/export-abi.js`, `scripts/size.js`, `scripts/gas.js`.
- `hardhat.config.js` — jaringan `localhost` (port 8548), `botchainTestnet` (968), `botchain` (677).

### Frontend (`web/`)
Vite + React + TypeScript + viem. Tujuh layar dan dialog:

| Rute | Halaman | File |
|---|---|---|
| `#/` | Beranda: penjelasan, "Hours are not money", statistik, direktori guyub | `src/pages/Home.tsx` |
| `#/guyub/:id[/members\|/ledger\|/commons]` | Guyub: empat tab, panel saldo saya, panel pengurus | `src/pages/guyub/*` |
| `#/new` | Buka guyub (nama, deskripsi, batas minus dengan pratinjau cincin, cara bergabung) | `src/pages/NewGuyub.tsx` |
| `#/inbox` | Kotak masuk: pengajuan untuk disetujui, permintaan bergabung, pengajuan terkirim | `src/pages/Inbox.tsx` |
| `#/me` | Jam saya: saldo per guyub, riwayat pribadi, profil | `src/pages/MyHours.tsx` |
| `#/about` | Aturan bank waktu, "Hours are not money", privasi | `src/pages/About.tsx` |
| — | Dialog: wallet, Give hours, Request hours, pasang tawaran, sumbang, hibah, konfirmasi | `src/components/` |

- **Arah desain:** dasbor koperasi warga yang terang. Nunito (sans humanis membulat, angkanya sudah berlebar sama), hijau daun dan jingga kunyit, **cincin jam 12 ruas** untuk saldo (plus searah jarum jam, minus berlawanan, lap kedua untuk jam 13–24, takik untuk batas minus).
- **Plus dan minus tidak hanya lewat warna:** selalu dengan tanda + dan − (U+2212), arah isian cincin, dan kata ("gave more than received").
- **Format jam di satu modul:** `src/lib/hours.ts`.
- **Setiap form jam menampilkan saldo sebelum dan sesudah** untuk kedua pihak, dan menolak sebelum transaksi bila melewati batas minus, dengan angka sisa yang masih boleh dipakai.
- **Buku besar selalu menampilkan "member balances + commons = 0"**, dijumlahkan di browser dari saldo yang dibaca dari contract.
- Tabel memakai markup tabel sungguhan dan berubah menjadi kartu di ≤ 900 px (dua kolom di lebar tablet).
- Setiap transaksi disimulasikan dulu; penolakan contract diterjemahkan ke kalimat yang bisa ditindaklanjuti (`src/lib/errors.ts`).
- Footer memuat "Built on BOT Chain" dengan tautan `https://botchain.ai` dan `https://scan.botchain.ai`, plus alamat contract.
- Wallet: EIP-6963 dengan cadangan `window.ethereum` (pola dari Sambung, tampilan baru). Wallet dev hanya di mode development pada chain lokal.

## Yang sudah diverifikasi

Semua dijalankan pada 11 November 2026.

| Pemeriksaan | Hasil |
|---|---|
| `npm test` di `contracts/` | 44 lulus (43 aturan + 1 uji invarian) |
| Uji invarian | 2.400 aksi, 924 perpindahan jam, 547 ditolak di batas minus; jumlah nol setelah setiap aksi |
| `npm run size` | 21.160 byte, 86,1% dari batas |
| `npm run gas` | Lihat tabel di bawah |
| `npm run typecheck` di `web/` | Lulus |
| `npm run build` di `web/` | Lulus |
| Kode wallet dev di bundle produksi | Tidak ada (`Dev wallet`, `loadDevWallets` tidak ditemukan di `dist/`) |
| Buka guyub "Jalan Kenanga 12" (batas minus 2 jam) dengan wallet dev Ani | Berhasil, diarahkan ke halaman guyub |
| Bayu dan Cahya bergabung | Berhasil, anggota 3 |
| Bayu memasang tawaran (Repairs) | Berhasil, tampil di Board |
| Ani → Give hours 1 jam ke Bayu, ditautkan ke tawaran | Berhasil, satu transaksi |
| Cahya → Request hours 1 jam ke Ani; Ani → Approve di Inbox | Berhasil, badge Inbox muncul lalu kosong |
| Ani di −2 jam mencoba Give hours | Ditolak sebelum transaksi: pratinjau "Past the credit limit", pesan sisa, tombol nonaktif |
| Tab Ledger | "Balanced: member balances + commons = 0" (+2 h − 2 h + 0 h commons = 0 h) |
| Simpan profil | Berhasil, nama langsung tampil di header |
| Viewport 375 px, 768 px, 1440 px | Tanpa scroll horizontal di 13 rute (375 px), tabel menjadi kartu |
| Halaman guyub tidak ada (`#/guyub/99`) dan rute salah | Pesan yang tepat |
| Keyboard: Tab, fokus terlihat, Escape menutup dialog | Berfungsi |
| Kontras warna | 23 pasangan palet final lulus WCAG AA (teks 4,5:1; isian cincin terhadap jalurnya dan batas kontrol 3:1) |
| Konsol browser | Tanpa error |

### Biaya gas terukur (20 gwei)

| Aksi | Gas | BOT |
|---|---|---|
| Deploy | 4.624.780 | 0,0925 |
| Buka guyub | 320.728 | 0,0064 |
| Bergabung | 132.148 | 0,0026 |
| Pasang tawaran | 254.995 | 0,0051 |
| Give hours | 175.912 | 0,0035 |
| Request + approve | 449.954 | 0,0090 |

## Yang belum dikerjakan

### M3 — Testnet
- [ ] **Kamu:** setup repo git dari folder `jamkita/` dan hubungkan ke Vercel (Root Directory `web`).
- [ ] **Kamu:** siapkan wallet deployer, ambil BOT testnet di `https://faucet.botchain.ai/basic`.
- [ ] **Kamu:** salin `contracts/.env.example` menjadi `.env`, isi `PRIVATE_KEY`.
- [ ] **Kamu:** jalankan `npm run deploy:testnet` di `contracts/`.
- [ ] **Saya:** uji dengan MetaMask atau BO Wallet sungguhan di testnet (`VITE_CHAIN=testnet`), tiga wallet.
- [ ] **Saya:** siapkan verifikasi source di explorer BOT Chain.

### M4 — Mainnet
- [ ] **Kamu:** buat group project. **Wajib sebelum deploy mainnet.**
- [ ] **Kamu:** isi BOT mainnet (± 0,1 BOT cukup untuk deploy) lewat B DEX atau bridge.
- [ ] **Kamu:** jalankan `npm run deploy:mainnet`, lalu commit `deployments/botchain.json` dan `web/src/config/deployments.json`.
- [ ] **Saya:** verifikasi source contract di `scan.botchain.ai`.

### M5 — Peluncuran
- [ ] **Kamu:** buat akun X Jamkita; isi URL-nya di `web/src/config/site.ts` (`xUrl`).
- [ ] **Saya:** draft minimal 5 post, termasuk pengumuman dengan kalimat "Officially launched on BOT Chain Mainnet."
- [ ] **Kamu:** publikasikan post.
- [ ] **Kamu:** buka guyub pertama dengan 2–3 orang sungguhan dan catat pertukaran yang benar-benar terjadi (memenuhi 3 wallet dan 5 transaksi).
- [ ] **Saya:** gambar Open Graph, audit akhir terhadap checklist eligibility.

## Hal yang diketahui dan belum ditangani

- **Wallet sungguhan belum diuji.** Semua alur di browser diuji lewat akun node Hardhat, bukan ekstensi wallet.
- **Belum diuji di browser:** alur guyub dengan persetujuan (minta bergabung → pengurus menyetujui di Inbox), hibah dan sumbangan lewat UI, keluar dan mengeluarkan anggota lewat UI, serah terima pengurus lewat UI, tampilan ketika RPC gagal, dan build produksi tanpa alamat mainnet. Semuanya dicakup test contract; jalur UI-nya belum diklik.
- **Linter menyisakan 3 peringatan**, semuanya di kode yang dipakai ulang dari Sambung (`set-state-in-effect` dua kali, `only-export-components` sekali).
- **Bundle JS 653 kB (192 kB gzip)**, sebagian besar dari viem. Belum dipecah.
- **Riwayat pribadi di "My hours"** dibangun dengan membaca 300 entri terakhir buku besar tiap guyub lalu menyaring di browser; cukup untuk guyub kecil, perlu indeks per anggota bila guyub tumbuh besar.
- **Daftar guyub, tawaran, dan buku besar** memuat maksimal 300 item terbaru per halaman.
- **Request + approve** memakan 0,009 BOT, hampir dua kali perkiraan awal PRD (alasannya di PRD 10.6).
- **Kriteria ketujuh program** belum tercantum di materi.

## Keputusan yang sudah diambil

| Keputusan | Alasan |
|---|---|
| Satu contract, tanpa contract pembaca | Ukuran terukur 86,1% dari batas |
| Semua perpindahan jam lewat `_move` | Jumlah-nol tidak bisa dilanggar jalur mana pun |
| Pengurus tidak bisa menghibahkan ke diri sendiri dan tidak bisa keluar sebelum serah terima | Kas tidak bisa dikuras; guyub tidak pernah tanpa pengurus |
| Anggota yang dikeluarkan harus meminta lagi untuk bergabung | Mencegah orang bersaldo minus langsung masuk lagi |
| Batas minus dicek saat persetujuan, bukan saat pengajuan | Saldo bisa berubah di antara keduanya |
| Catatan pengajuan tidak disalin ke buku besar | Menghemat ± 70 ribu gas per persetujuan; view membacanya dari pengajuan |
| Project contract memakai JavaScript | Sama dengan Sambung; menghindari ts-node dengan TypeScript 7 |
| Hash routing (`#/guyub/3/ledger`) | Tidak perlu rewrite di Vercel; tab bisa dibagikan sebagai tautan |
| Font di-host sendiri (`@fontsource-variable/nunito`) | Tanpa permintaan ke pihak ketiga |
| Port lokal 8548 (node) dan 5176 (Vite) | Tidak bentrok dengan project lain |
| Deploy dijalankan pemilik project | Private key tidak pernah keluar dari mesin pemilik |

## Cara melanjutkan

Chain lokal tidak menyimpan data: setiap kali node dihentikan, deploy dan seed harus diulang.

```bash
cd contracts
npx hardhat node --port 8548
```

```bash
cd contracts
npm run deploy:local
npm run seed:local
```

```bash
cd web
npm run dev
```

Buka `http://localhost:5176`, klik **Connect wallet**, pilih salah satu "Dev wallet".

Kalau contract diubah, jalankan `npm run export-abi` di `contracts/` supaya frontend memakai ABI terbaru.

## Informasi jaringan

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 677 | 968 |
| RPC | `https://rpc.botchain.ai` | `https://rpc.bohr.life` |
| Explorer | `https://scan.botchain.ai` | `https://scan.bohr.life` |

Alamat contract: belum ada di testnet maupun mainnet.
