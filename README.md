# Manajemen Keuangan

Aplikasi manajemen keuangan sederhana menggunakan Next.js, Material UI, dan Iconify.

## Tech Stack

- **Next.js 15** - React framework dengan App Router
- **TypeScript** - Type-safe development
- **Material UI (MUI)** - Komponen UI
- **Iconify** - Icon library
- **Recharts** - Library chart untuk grafik
- **Firebase** - Authentication & Realtime Database
- **Gemini AI** - Google's generative AI untuk parsing transaksi

## Fitur

### 🔐 Autentikasi
- Login dengan Email/Password
- Login dengan Google
- PIN Security (opsional)

### 💰 Manajemen Keuangan
- **Manajemen Transaksi** - Pemasukan, pengeluaran, dan transfer
- **Multi Akun** - Kas, Bank, E-Wallet, Tabungan, Investasi, Hutang
- **Kategori** - Pengelolaan kategori dengan budget bulanan

### 📊 Beranda dengan 3 Tab
1. **Budgeting**
   - Pie chart pengeluaran per kategori
   - Ringkasan budget (total, terpakai, sisa)
   - Proyeksi pengeluaran bulanan
   - Progress bar budget per kategori
   - Persentase pengeluaran dari pemasukan

2. **Statistik**
   - Total pemasukan, pengeluaran, dan selisih
   - Chart carousel (grafik pengeluaran, pemasukan, selisih)
   - Filter periode (7 hari, 1 bulan, 6 bulan)
   - Pengeluaran per kategori

3. **Tabungan**
   - Total saldo tabungan
   - Target tabungan dengan progress
   - Grafik perkembangan tabungan 6 bulan terakhir
   - Pengaturan target dan nama kustom per akun

### 🤖 AI Integration
- Input transaksi dengan teks natural language
- Parsing gambar struk/nota
- Multi-transaksi dari satu input

### 📱 PWA Ready
- Installable sebagai aplikasi
- Offline support

## Struktur Database (Firebase Realtime Database)

```
users/
  └── {userId}/
      ├── profile/
      │   ├── name: string          # Nama lengkap user
      │   ├── email: string         # Email user
      │   ├── phone: string         # No telepon
      │   ├── pin: string           # PIN 6 digit (optional)
      │   ├── usePIN: boolean       # Apakah menggunakan PIN
      │   └── createdAt: string     # ISO date string
      │
      ├── categories/
      │   └── {categoryId}/
      │       ├── name: string           # Nama kategori
      │       └── monthlyBudget: number  # Budget bulanan (0 = tanpa batas)
      │
      ├── accounts/
      │   └── {accountId}/
      │       ├── name: string      # Nama akun (BCA, Kas, GoPay, dll)
      │       ├── type: string      # "cash" | "bank" | "ewallet" | "savings" | "investment" | "debt" | "other"
      │       ├── balance: number   # Saldo akun
      │       ├── icon: string      # Icon identifier
      │       └── color: string     # Warna hex
      │
      ├── transactions/
      │   └── {transactionId}/
      │       ├── type: string           # "income" | "expense" | "transfer"
      │       ├── category: string       # Kategori (dari categories, "Transfer" jika transfer)
      │       ├── sourceAccountId: string | null  # ID akun sumber (expense/transfer)
      │       ├── destAccountId: string | null    # ID akun tujuan (income/transfer)
      │       ├── amount: number         # Jumlah nominal
      │       ├── description: string
      │       ├── date: string           # Format: YYYY-MM-DD
      │       └── createdAt: string      # ISO date string
      │
      └── savingsGoals/
          └── {accountId}/
              ├── accountId: string     # ID akun tabungan
              ├── customName: string    # Nama kustom tabungan
              └── targetAmount: number  # Target tabungan
```

### Tipe Akun

| Tipe | Label | Deskripsi |
|------|-------|-----------|
| `cash` | Kas/Tunai | Uang tunai |
| `bank` | Bank | Rekening bank |
| `ewallet` | E-Wallet | Dompet digital (GoPay, OVO, dll) |
| `savings` | Tabungan | Akun khusus tabungan |
| `investment` | Investasi | Akun investasi |
| `debt` | Hutang | Hutang/pinjaman |
| `other` | Lainnya | Lain-lain |

### Logika Transaksi

| Tipe | Akun Sumber | Akun Tujuan | Efek Saldo |
|------|-------------|-------------|------------|
| `expense` | ✓ Required | ✗ null | Sumber: -amount |
| `income` | ✗ null | ✓ Required | Tujuan: +amount |
| `transfer` | ✓ Required | ✓ Required | Sumber: -amount, Tujuan: +amount |

### Contoh Path Database

| Data | Path |
|------|------|
| Profile user | `users/{uid}/profile` |
| Kategori user | `users/{uid}/categories` |
| Semua akun | `users/{uid}/accounts` |
| Satu akun | `users/{uid}/accounts/{accountId}` |
| Semua transaksi | `users/{uid}/transactions` |
| Satu transaksi | `users/{uid}/transactions/{transactionId}` |
| Target tabungan | `users/{uid}/savingsGoals/{accountId}` |

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### Build Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Struktur Folder

```
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout dengan MUI provider
│   │   ├── page.tsx         # Homepage dengan routing
│   │   ├── theme.ts         # MUI theme configuration
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx      # Halaman beranda dengan 3 tab
│   │   │   ├── HistoryPage.tsx   # Halaman riwayat transaksi
│   │   │   ├── AIInputPage.tsx   # Input transaksi dengan AI
│   │   │   ├── ManualInputPage.tsx # Input transaksi manual
│   │   │   ├── AccountPage.tsx   # Manajemen akun
│   │   │   ├── CategoryPage.tsx  # Manajemen kategori
│   │   │   └── tabs/
│   │   │       ├── StatistikTab.tsx  # Tab statistik
│   │   │       ├── BudgetingTab.tsx  # Tab budgeting
│   │   │       └── TabunganTab.tsx   # Tab tabungan
│   │   ├── BottomNav.tsx     # Bottom navigation
│   │   ├── PinEntry.tsx      # Komponen entry PIN
│   │   ├── InstallPrompt.tsx # PWA install prompt
│   │   ├── ImageUpload.tsx   # Komponen upload gambar
│   │   └── AuthForm.tsx      # Komponen login/register
│   └── lib/
│       ├── firebase.ts       # Firebase configuration
│       ├── auth.ts           # Firebase Auth utilities
│       ├── AuthProvider.tsx  # Auth context provider
│       ├── database.ts       # Realtime Database utilities
│       └── gemini.ts         # Gemini AI utilities
├── public/                   # Static files & PWA assets
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Konfigurasi

### Firebase

Firebase sudah dikonfigurasi di `src/lib/firebase.ts` dengan credential statis.

**Authentication Utilities** (`src/lib/auth.ts`):
```typescript
import { loginWithEmail, registerWithEmail, loginWithGoogle, logout } from '@/lib/auth';

await loginWithEmail('email@example.com', 'password');
await registerWithEmail('email@example.com', 'password');
await loginWithGoogle();
await logout();
```

**Database Utilities** (`src/lib/database.ts`):
```typescript
import { writeData, readData, listenToData } from '@/lib/database';

await writeData('users/123', { name: 'John', age: 30 });
const data = await readData('users/123');
const unsubscribe = listenToData('users/123', (snapshot) => {
  console.log(snapshot.val());
});
```

### Gemini AI

⚠️ **PENTING:** Ganti API key Gemini di `src/lib/gemini.ts`:

```typescript
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
```

Dapatkan API key gratis di: https://aistudio.google.com/app/apikey

**Cara pakai:**
```typescript
import { parseTransaction, parseTransactionWithImage } from '@/lib/gemini';

// Parse teks transaksi
const result = await parseTransaction('beli makan 50rb');

// Parse gambar struk
const result = await parseTransactionWithImage(base64Image);
```

### Theme

Customize theme di `src/app/theme.ts` untuk mengubah warna, typography, dll.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Material UI Documentation](https://mui.com/)
- [Iconify Documentation](https://iconify.design/)
- [Recharts Documentation](https://recharts.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
