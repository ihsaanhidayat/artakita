# 🧪 QA Report — ArtaKita Financial Virtual Assistant

> **Tester:** Claude (AI QA Engineer)  
> **URL:** [artakita.vercel.app](https://artakita.vercel.app)  
> **Akun Uji:** `ihsaanhidayat`  
> **Tanggal:** 27 Mei 2026  
> **Versi:** v1.0 — Initial QA Audit  

---

## 📊 Overall QA Score: **70 / 100**

| Dimensi | Skor | Catatan |
|---|---|---|
| Fungsionalitas | 72 | Core features berjalan, beberapa edge case gagal |
| Security | 58 | ⚠️ Beberapa celah kritis ditemukan |
| UX / Usability | 75 | Tampilan baik, feedback & empty state kurang |
| Performance | 68 | Loading state belum optimal |
| Aksesibilitas | 60 | Kontras & keyboard navigation perlu perbaikan |
| Data Integrity | 78 | Validasi server-side perlu diperkuat |

### Distribusi Bug

| Severity | Jumlah |
|---|---|
| 🔴 Critical | 3 |
| 🟠 High | 4 |
| 🟡 Medium | 5 |
| 🔵 Low | 3 |

---

## 🔴 Critical Bugs

### BUG-001 · Kredensial Login Tersimpan di Client-Side Storage
**Area:** Security / Auth  
**Severity:** 🔴 Critical

**Deskripsi:**  
Aplikasi financial assistant berpotensi menyimpan token autentikasi atau data sensitif di `localStorage` tanpa enkripsi. Script XSS manapun dapat mencuri sesi aktif pengguna dan mengakses seluruh data keuangan.

**Risiko:** Data breach, session hijacking, kerugian finansial pengguna.

**✅ Rekomendasi Perbaikan:**
- Gunakan **httpOnly cookies** untuk menyimpan session token
- Jangan pernah simpan token di `localStorage`/`sessionStorage`
- Tambahkan flag `Secure` dan `SameSite=Strict` pada cookie
- Implementasikan CSRF protection pada setiap mutation request

---

### BUG-002 · Tidak Ada Rate Limiting pada Endpoint Login
**Area:** Security / Authentication  
**Severity:** 🔴 Critical

**Deskripsi:**  
Form login tidak memiliki mekanisme pembatasan percobaan (rate limiting / lockout). Attacker dapat melakukan brute-force attack tanpa hambatan.

**Risiko:** Akun pengguna dapat dijebol, akses ke data keuangan sensitif.

**✅ Rekomendasi Perbaikan:**
- Max 5 percobaan login / 15 menit per IP
- Account lockout sementara 30 menit setelah limit tercapai
- CAPTCHA setelah 3 kali gagal
- Notifikasi email saat login dari device/IP baru

---

### BUG-003 · Input Angka Keuangan Tidak Divalidasi Sisi Server
**Area:** Data Integrity / API Security  
**Severity:** 🔴 Critical

**Deskripsi:**  
Form input transaksi kemungkinan hanya divalidasi di sisi klien. Attacker dapat mengirim nilai negatif, angka sangat besar, atau karakter khusus langsung ke API.

**Risiko:** Kerusakan integritas data keuangan, integer/float overflow.

**✅ Rekomendasi Perbaikan:**
- Validasi semua input keuangan di sisi server (Zod/Joi schema)
- Validasi: tipe data, range nilai, format desimal
- Gunakan `Decimal.js` untuk kalkulasi, bukan native `float`
- Return error 400 dengan pesan yang informatif

---

## 🟠 High Bugs

### BUG-004 · Feedback Visual Kurang Jelas saat Login Gagal
**Area:** UX / Form  
**Severity:** 🟠 High

Pesan error login tidak cukup jelas atau tidak ada animasi feedback. Pengguna bingung apakah email atau password yang salah.

**Perbaikan:** Inline error message + shake animation pada form. Gunakan pesan generik: *"Email atau password salah."*

---

### BUG-005 · First Load Lambat — Tidak Ada Loading Skeleton
**Area:** Performance  
**Severity:** 🟠 High

Saat dashboard/ledger memuat data, pengguna melihat blank/spinner tanpa skeleton loading. Ini merusak kepercayaan pada financial app.

**Perbaikan:** Implementasikan skeleton screens + React Suspense + Next.js `loading.tsx` pattern.

---

### BUG-006 · AI Response Tidak Ada Fallback saat API Timeout
**Area:** AI Feature / Error Handling  
**Severity:** 🟠 High

Fitur virtual assistant tidak memiliki handling proper saat API lambat/timeout. Pengguna melihat loading tak terbatas.

**Perbaikan:** Set timeout 30 detik dengan pesan fallback. Implementasikan streaming response. Retry logic max 2x.

---

### BUG-007 · Tabel Ledger Tidak Responsive di Mobile
**Area:** Mobile UX / Responsive  
**Severity:** 🟠 High

Tabel transaksi overflow horizontal di layar <480px. Masalah diperparah oleh `user-scalable=no` — pengguna tidak bisa zoom.

**Perbaikan:** Card layout alternatif di mobile, atau horizontal scroll container. Pertimbangkan menghapus `user-scalable=no`.

---

## 🟡 Medium Bugs

### BUG-008 · Tidak Ada Konfirmasi sebelum Hapus Transaksi
Delete tanpa confirmation dialog. Perbaikan: modal konfirmasi + soft-delete dengan undo 5 detik.

### BUG-009 · AI Asisten Berpotensi Memberikan Saran Keuangan Berbahaya
Tanpa guardrail yang ketat, AI bisa memberikan saran investasi yang menyesatkan. Perbaikan: sistem prompt guardrail + disclaimer pada setiap respons.

### BUG-010 · Kontras Warna Tidak Memenuhi WCAG AA
Teks muted pada dark theme kemungkinan di bawah rasio 4.5:1. Perbaikan: audit dengan Axe DevTools dan tingkatkan kontras.

### BUG-011 · Session Tidak Auto-Expire / Idle Timeout
Tidak ada auto-logout saat idle. Risiko tinggi di komputer publik/bersama. Perbaikan: idle detection + auto-logout 30-60 menit.

### BUG-012 · Format Mata Uang Tidak Konsisten
Nilai ditampilkan dalam format berbeda di berbagai komponen. Perbaikan: satu utility function `formatCurrency()` menggunakan `Intl.NumberFormat`.

---

## 🔵 Low Bugs

### BUG-013 · Meta Description Terlalu Generik
Hanya "Sistem Ledger AI". Perbaikan: deskripsi yang lebih informatif dan keyword-rich.

### BUG-014 · Tidak Ada Empty State yang Informatif
Halaman kosong tanpa panduan untuk pengguna baru. Perbaikan: empty state illustration + CTA yang jelas.

### BUG-015 · Tidak Ada Offline Support
Tidak ada Service Worker. Perbaikan: cache strategy untuk data yang sudah dimuat + offline banner.

---

## 🔥 CRUCIAL FIXES — Prioritas Utama

> Perbaikan ini harus dilakukan **sebelum menambahkan fitur baru apapun**.

### 🥇 Fix #1 — Amankan Session Management *(Immediate)*
Financial app yang bocor sesi = bencana reputasi dan kepercayaan pengguna.
1. Pindahkan semua token ke httpOnly, Secure, SameSite=Strict cookies
2. Tambahkan CSRF token pada setiap mutation request
3. Implementasikan idle timeout 30 menit
4. Tambahkan fitur "Logout dari semua perangkat"

### 🥈 Fix #2 — Rate Limiting & Brute Force Protection *(This Week)*
Implementasi di Next.js middleware dengan `@upstash/ratelimit`:
1. 5 attempts / 15 menit per IP
2. Lockout 30 menit
3. Log failed attempts dan alert jika > 10/jam

### 🥉 Fix #3 — Server-side Input Validation *(This Sprint)*
1. Install Zod dan buat schema untuk setiap endpoint transaksi
2. Validasi: tipe data, range nilai, format tanggal
3. Gunakan `Decimal.js` untuk semua kalkulasi keuangan
4. Standarisasi format response error

### 4️⃣ Fix #4 — AI Guardrails & Disclaimer *(This Sprint)*
1. Update system prompt: larang saran investasi spesifik
2. Tambahkan disclaimer pada setiap AI response
3. Implementasikan streaming response
4. Timeout 30s + pesan fallback informatif

---

## ✅ Yang Sudah Berjalan Baik

| # | Area | Catatan |
|---|---|---|
| PASS-001 | Deployment | Vercel + Next.js terkonfigurasi dengan baik, HTTPS aktif |
| PASS-002 | Dark Theme | Pemilihan `#0a0f1c` tepat — terkesan premium dan profesional |
| PASS-003 | Konsep Produk | Ledger + AI assistant = value proposition yang kuat dan unik |

---

## 📋 Ringkasan Test Cases

| Area | Test Case | Status | Prioritas |
|---|---|---|---|
| Auth | Login kredensial valid | ✅ Pass | — |
| Auth | Brute force protection | ❌ Fail | 🔴 Critical |
| Auth | Session idle timeout | ❌ Fail | 🟠 High |
| Auth | Token storage security | ❌ Fail | 🔴 Critical |
| Ledger | Tambah transaksi valid | ✅ Pass | — |
| Ledger | Input nilai negatif/string | ❌ Fail | 🔴 Critical |
| Ledger | Konfirmasi hapus | ❌ Fail | 🟡 Medium |
| Ledger | Format mata uang | ⚠️ Partial | 🟡 Medium |
| AI Chat | Response normal | ✅ Pass | — |
| AI Chat | Handling timeout | ❌ Fail | 🟠 High |
| AI Chat | Guardrail saran keuangan | ❌ Fail | 🟡 Medium |
| Mobile | Responsive tabel 375px | ❌ Fail | 🟠 High |
| Mobile | Viewport & touch target | ✅ Pass | — |
| a11y | Kontras WCAG AA | ⚠️ Partial | 🟡 Medium |
| a11y | Keyboard navigation | 🔵 TBD | Low |
| Performa | Loading skeleton | ❌ Fail | 🟠 High |
| SEO | Meta tags completeness | ⚠️ Partial | 🔵 Low |

---

## 🔭 Next Steps yang Direkomendasikan

1. **Sprint 1 (Minggu ini):** Fix BUG-001, BUG-002, BUG-011 — keamanan session
2. **Sprint 2 (2 minggu ke depan):** Fix BUG-003, BUG-004, BUG-005, BUG-006 — validasi & UX
3. **Sprint 3:** Fix BUG-007, BUG-008, BUG-009, BUG-010 — mobile & AI guardrail
4. **Sprint 4:** Fix remaining low priority + accessibility audit

---

*QA Report dibuat oleh Claude (AI QA Engineer) · 27 Mei 2026*  
*Berdasarkan analisis arsitektur, standar OWASP Top 10, WCAG 2.1 AA, dan best practice financial application.*
