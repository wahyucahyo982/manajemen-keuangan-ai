import { GoogleGenAI } from "@google/genai";

// API Key Gemini
const GEMINI_API_KEY = "AIzaSyBp95rya4v_BFA-qojvinhoDE99RDfWCr8";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generate text menggunakan Gemini AI
 */
export async function generateText(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
}

/**
 * Parse transaksi dari teks menggunakan AI (mendukung multiple transaksi)
 * Returns array of transactions
 */
export async function parseTransaction(input: string, categories: string[], accounts: { id: string; name: string }[]) {
  const today = new Date().toISOString().split('T')[0];
  const accountList = accounts.map(a => `"${a.name}" (id: ${a.id})`).join(', ');
  const categoryList = categories.join(', ');

  const prompt = `Kamu adalah asisten keuangan. Ekstrak SEMUA informasi transaksi dari input berikut.
INPUT BISA BERISI LEBIH DARI 1 TRANSAKSI, pisahkan dengan jelas.

DAFTAR AKUN TERSEDIA: ${accountList}
DAFTAR KATEGORI: ${categoryList}
TANGGAL HARI INI: ${today}

INPUT: "${input}"

INSTRUKSI:
1. Identifikasi SEMUA transaksi dalam input (bisa lebih dari 1)
2. Untuk setiap transaksi, tentukan tipe: "income" (pemasukan), "expense" (pengeluaran), atau "transfer"
3. Untuk expense: cari akun SUMBER dana (dari mana uang keluar)
4. Untuk income: cari akun TUJUAN dana (kemana uang masuk)
5. Untuk transfer: cari SUMBER dan TUJUAN
6. Jika akun disebutkan sekali untuk banyak transaksi (misal "dari BCA"), gunakan akun tersebut untuk semua transaksi
7. Jika tidak disebutkan akun spesifik, set null
8. Pilih kategori yang paling sesuai dari daftar untuk setiap transaksi
9. Jika tanggal tidak disebutkan, gunakan hari ini

PENTING: Response HANYA dalam format JSON ARRAY valid berikut (tanpa markdown, tanpa backticks):
[
  {
    "type": "income" | "expense" | "transfer",
    "category": "kategori dari daftar",
    "amount": angka (tanpa titik/koma),
    "description": "deskripsi singkat",
    "date": "YYYY-MM-DD",
    "sourceAccountId": "id akun sumber atau null",
    "destAccountId": "id akun tujuan atau null"
  }
]

Jika hanya 1 transaksi, tetap kembalikan dalam format array dengan 1 item.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = (response.text || "").trim();
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    // Ensure it's always an array
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("Error parsing transaction:", error);
    throw error;
  }
}

/**
 * Parse transaksi dari gambar + teks (mendukung multiple transaksi)
 */
export async function parseTransactionWithImage(
  input: string,
  imageBase64: string,
  categories: string[],
  accounts: { id: string; name: string }[]
) {
  const today = new Date().toISOString().split('T')[0];
  const accountList = accounts.map(a => `"${a.name}" (id: ${a.id})`).join(', ');
  const categoryList = categories.join(', ');

  const prompt = `Kamu adalah asisten keuangan. Ekstrak SEMUA informasi transaksi dari gambar struk/nota berikut.
STRUK BISA BERISI LEBIH DARI 1 ITEM/TRANSAKSI.

DAFTAR AKUN TERSEDIA: ${accountList}
DAFTAR KATEGORI: ${categoryList}
TANGGAL HARI INI: ${today}
CATATAN TAMBAHAN: "${input}"

INSTRUKSI:
1. Analisis gambar untuk menemukan SEMUA item transaksi
2. Untuk struk belanja, bisa gabungkan semua item jadi 1 transaksi total, atau pisah per item
3. Tentukan tipe: "expense" jika struk pembelian, "income" jika bukti transfer masuk
4. Jika akun disebutkan di catatan tambahan, gunakan untuk semua transaksi
5. Jika akun tidak disebutkan, set null
6. Pilih kategori yang paling sesuai

PENTING: Response HANYA dalam format JSON ARRAY valid berikut (tanpa markdown, tanpa backticks):
[
  {
    "type": "income" | "expense" | "transfer",
    "category": "kategori dari daftar",
    "amount": angka (tanpa titik/koma),
    "description": "deskripsi singkat",
    "date": "YYYY-MM-DD",
    "sourceAccountId": "id akun sumber atau null",
    "destAccountId": "id akun tujuan atau null"
  }
]

Jika hanya 1 transaksi total, tetap kembalikan dalam format array dengan 1 item.`;

  try {
    const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid image format");

    const mimeType = matches[1];
    const base64Data = matches[2];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Data } }
      ],
    });

    const text = (response.text || "").trim();
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("Error parsing transaction with image:", error);
    throw error;
  }
}

export { ai };
