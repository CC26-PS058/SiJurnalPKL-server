# SiJurnalPKL Server

## Deskripsi Singkat Proyek
`SiJurnalPKL-server` adalah backend REST API untuk sistem jurnal PKL multi-role. Server ini menangani autentikasi, profil pengguna, presensi masuk/pulang, pembuatan jurnal harian, approval mentor, penilaian guru pembimbing, manajemen data admin, dan integrasi AI untuk refine unit kegiatan serta generate judul laporan PKL.

Stack utama:
- `Node.js`
- `Express`
- `Prisma`
- `PostgreSQL`
- `n8n` untuk orkestrasi AI webhook

## Petunjuk Setup Environment
### 1. Prasyarat
- Node.js 20+ atau 22+
- PostgreSQL aktif
- npm
- n8n aktif jika fitur AI ingin dijalankan

### 2. Install dependency
```bash
npm install
```

### 3. Buat file environment
Buat file `.env` di folder backend.

Contoh konfigurasi:
```env
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/SiJurnalPKL"
PORT=3001
JWT_SECRET="sijurnalpkl-secret-key-2026-production"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
N8N_REFINE_WEBHOOK_URL="http://localhost:5678/webhook/refine-journal"
N8N_TITLE_WEBHOOK_URL="http://localhost:5678/webhook/generate-title"
```

Catatan:
- `DATABASE_URL` wajib valid.
- `JWT_SECRET` wajib diisi untuk token auth.
- Dua URL `N8N_*` wajib aktif jika fitur AI ingin digunakan.

### 4. Generate Prisma client
```bash
npx prisma generate
```

### 5. Jalankan migration database
Jika database masih kosong:
```bash
npx prisma migrate deploy
```

Jika sedang development dan ingin sync schema:
```bash
npx prisma migrate dev
```

### 6. Seed data demo
```bash
npm run seed
```

Seed demo utama:
- Admin: `superadmin`
- Siswa: `102301878`
- Guru: `198501012010011002`
- Mentor: `mentor01`

## Tautan Model ML / AI
Project ini tidak memuat model ML lokal yang perlu di-download ke repository. Fitur AI berjalan lewat webhook `n8n` dan model eksternal.

Model/layanan yang dipakai:
- OpenRouter: https://openrouter.ai/
- GPT-4o Mini via OpenRouter: https://openrouter.ai/openai/gpt-4o-mini
- n8n: https://n8n.io/

Catatan:
- Tidak ada file model `.pt`, `.onnx`, atau `.h5` yang perlu di-load manual di backend ini.
- Jika ingin AI aktif, pastikan workflow `refine-journal` dan `generate-title` di n8n sudah aktif.

## Cara Menjalankan Aplikasi
### Development mode
```bash
npm run dev
```

Server akan aktif di:
```text
http://localhost:3001
```

Health check:
```text
http://localhost:3001/api/health
```

### Menjalankan seed demo
```bash
npm run seed
```

### Menjalankan tanpa watcher
```bash
npm run start
```

## Alur Integrasi dengan Frontend
Frontend default mengakses backend di:
```text
http://localhost:3001
```

Pastikan frontend `sijurnalpkl-client` berjalan di:
```text
http://localhost:3000
```

## Catatan Demo
- Presensi siswa akan membuat `attendance_logs`.
- Presensi pulang akan membuat `daily_logs`.
- Jurnal siswa akan muncul ke mentor untuk approval.
- Guru pembimbing akan membaca progres siswa dari data yang sama.
- Demo placement aktif siswa saat ini sudah disiapkan sampai `30 April 2026`.
