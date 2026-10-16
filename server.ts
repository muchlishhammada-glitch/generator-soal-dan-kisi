import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface GeminiCallParams {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}

// Resilient model fallback:
// Primary: gemini-3.8-flash
// Fallback 1: gemini-flash-latest
// Fallback 2: gemini-3.1-flash-lite (high capacity & very resilient to traffic spikes)
const MODELS_TO_TRY = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

async function callGeminiWithFallback(params: GeminiCallParams): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const model of MODELS_TO_TRY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Calling ${model} (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.7,
          },
        });
        if (response && response.text) {
          console.log(`[Gemini] Success with ${model}`);
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const rawMsg = err?.message || String(err);
        console.warn(`[Gemini] Model ${model} attempt ${attempt} error: ${rawMsg}`);

        const isTransient =
          rawMsg.includes('503') ||
          rawMsg.includes('high demand') ||
          rawMsg.includes('UNAVAILABLE') ||
          rawMsg.includes('429') ||
          rawMsg.includes('RESOURCE_EXHAUSTED') ||
          rawMsg.includes('overloaded');

        if (isTransient) {
          // Wait briefly before retry
          await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
        } else {
          // Non-transient error, break to next candidate model
          break;
        }
      }
    }
  }

  throw lastError;
}

function cleanErrorMessage(err: any): string {
  let raw = err?.message || String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      raw = parsed.error.message;
    }
  } catch {
    // not JSON
  }

  if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
    return 'Layanan Gemini AI sedang mengalami lonjakan antrean trafik yang tinggi (503). Sistem telah mencoba model alternatif secara otomatis. Silakan klik tombol "Coba Lagi Sekarang" dalam beberapa saat.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'Batas kuota permintaan sesaat tercapai. Silakan tunggu sekitar 10 detik lalu coba kembali.';
  }
  return raw;
}

app.post('/api/generate-assessment', async (req, res) => {
  try {
    const {
      mataPelajaran,
      kelasFase,
      topikMateri,
      materiFile,
      materiTeksLandasan,
      jumlahSoal = 5,
      bentukSoal = 'pilihan_ganda', // 'pilihan_ganda' | 'uraian' | 'benar_salah' | 'isian_singkat'
      levelKognitif = 'c4-c5',
      konteksPembelajaran = 'Problem Based Learning',
      bahasa = 'indonesia', // 'indonesia' | 'arab' | 'keduanya'
      opsiJumlah = 5, // 4 atau 5 (A-D atau A-E)
      catatanTambahan = '',
    } = req.body;

    if (!mataPelajaran || !topikMateri) {
      return res.status(400).json({ error: 'Mata Pelajaran dan Topik/Materi wajib diisi.' });
    }

    const bentukLabelMap: Record<string, string> = {
      pilihan_ganda: 'Pilihan Ganda (Multiple Choice)',
      uraian: 'Uraian / Esai (Essay / Extended Response)',
      benar_salah: 'Benar - Salah (True / False)',
      isian_singkat: 'Isian Singkat (Short Answer)',
    };

    const levelDescriptionMap: Record<string, string> = {
      c1: 'C1 (Mengingat / Remembering)',
      c2: 'C2 (Memahami / Understanding)',
      c3: 'C3 (Menerapkan / Applying)',
      c4: 'C4 (Menganalisis / Analyzing)',
      c5: 'C5 (Mengevaluasi / Evaluating)',
      c6: 'C6 (Mencipta / Creating)',
      'c1-c3': 'C1-C3 (LOTS ke MOTS: Mengingat, Memahami, Menerapkan)',
      'c4-c5': 'C4-C5 (HOTS Standar: Menganalisis & Mengevaluasi)',
      'c4-c6': 'C4-C6 (HOTS Lengkap: Menganalisis, Mengevaluasi, Mencipta)',
    };

    const bentukSoalText = bentukLabelMap[bentukSoal] || 'Pilihan Ganda';
    const levelKognitifText = levelDescriptionMap[levelKognitif?.toLowerCase()] || levelKognitif || 'C4-C5 (HOTS)';

    let formatSoalRule = '';
    if (bentukSoal === 'pilihan_ganda') {
      const repeatInstruction =
        jumlahSoal > 1 ? `\n(Lanjutkan berurutan [soal no 2] sampai nomor [soal no ${jumlahSoal}])` : '';
      formatSoalRule = `FORMAT BUTIR SOAL PILIHAN GANDA WAJIB PERSIS:
[soal no 1]
(Tulis stimulus di sini jika C4-C6)
(Tulis pertanyaan / stem nomor 1 di sini...)
[opsi A] Isi opsi A
[opsi B] Isi opsi B
[opsi C] Isi opsi C
[opsi D] Isi opsi D
${opsiJumlah === 5 ? '[opsi E] Isi opsi E\n' : ''}[KUNCI: A]${repeatInstruction}

STANDAR MUTU KETAT OPSI PILIHAN GANDA:
- PANJANG KALIMAT HARUS SETARA: Panjang kalimat seluruh opsi (A, B, C, D, ${opsiJumlah === 5 ? 'E' : ''}) WAJIB relatif sama panjang dan seimbang. DILARANG membuat kunci jawaban lebih panjang, lebih rinci, atau paling bertele-tele dibanding opsi pengecoh!
- HOMOGENITAS TOTAL: Semua opsi wajib memiliki struktur gramatikal yang seragam (misal: jika satu opsi diawali verba aktif, semua harus verba aktif; jika berupa frasa benda, semua harus frasa benda) dan berada dalam lingkup materi yang sama.
- PENGECOH BERFUNGSI KUAT (PLAUSIBLE DISTRACTORS): Opsi pengecoh tidak boleh konyol atau mudah dieliminasi secara instan. Pengecoh harus tampak logis dan menarik bagi siswa yang belum paham tuntas konsepnya (berbasis miskonsepsi nyata materi).
- DISTRIBUSI KUNCI BERIMBANG: Kunci jawaban harus tersebar acak secara alami di antara butir soal (jangan selalu A atau monoton).`;
    } else if (bentukSoal === 'benar_salah') {
      const repeatInstruction = jumlahSoal > 1 ? `\n(Ulangi sampai nomor ${jumlahSoal})` : '';
      formatSoalRule = `FORMAT BUTIR SOAL BENAR-SALAH WAJIB PERSIS:
[soal no 1]
(Tulis stimulus di sini jika C4-C6)
(Tulis pernyataan analisis di sini...)
[opsi A] Benar ${bahasa === 'arab' ? '(صحيح)' : bahasa === 'keduanya' ? '/ صحيح (Benar)' : ''}
[opsi B] Salah ${bahasa === 'arab' ? '(خطأ)' : bahasa === 'keduanya' ? '/ خطأ (Salah)' : ''}
[KUNCI: A] (atau B)${repeatInstruction}
- Pernyataan analisis harus tajam dan menuntut ketelitian membaca, bukan fakta sepele yang langsung terbaca.`;
    } else if (bentukSoal === 'isian_singkat') {
      const repeatInstruction = jumlahSoal > 1 ? `\n(Ulangi sampai nomor ${jumlahSoal})` : '';
      formatSoalRule = `FORMAT BUTIR SOAL ISIAN SINGKAT WAJIB PERSIS:
[soal no 1]
(Tulis stimulus di sini jika C4-C6)
(Tulis pertanyaan isian atau kalimat rumpang di sini...)
[KUNCI: Tuliskan kunci jawaban kata/istilah/angka yang tepat]${repeatInstruction}`;
    } else if (bentukSoal === 'uraian') {
      const uraianExamples: string[] = [];
      const showCount = Math.min(jumlahSoal, 2);
      for (let i = 1; i <= showCount; i++) {
        uraianExamples.push(`[soal no ${i}]
Stimulus: (Tuliskan teks stimulus/studi kasus/wacana kontekstual PBL nomor ${i} di sini)
Pertanyaan: (Tuliskan rumusan pertanyaan uraian analitis nomor ${i} di sini)`);
      }
      if (jumlahSoal > showCount) {
        uraianExamples.push(`... Lanjutkan format yang SAMA PERSIS sampai nomor [soal no ${jumlahSoal}].`);
      }

      formatSoalRule = `FORMAT BUTIR SOAL URAIAN / ESAI (SANGAT KETAT):
BAGIAN 2 (NASKAH SOAL) WAJIB MEMUAT SELURUH BUTIR SOAL 1 SAMPAI ${jumlahSoal} SECARA LENGKAP DAN BERURUTAN DENGAN FORMAT SERAGAM:
Setiap butir soal di Bagian 2 WAJIB memiliki format penulisan yang SAMA PERSIS dan KONSISTEN untuk SEMUA nomor 1 sampai ${jumlahSoal}:

${uraianExamples.join('\n\n')}

PERINGATAN KERAS FORMAT SOAL URAIAN:
1. SERAGAM DAN KONSISTEN: Seluruh soal nomor 1 sampai nomor ${jumlahSoal} WAJIB memiliki format tampilan yang sama persis (ada Stimulus dan Pertanyaan, tanpa ada yang berbeda gaya atau terpotong).
2. DI BAGIAN 2: HANYA tuliskan teks butir soal (Stimulus dan Pertanyaan). JANGAN PERNAH menyisipkan Kunci Jawaban, Rubrik Penskoran, atau menuliskan heading "Bagian 3" di sela-sela maupun di akhir Bagian 2!
3. JANGAN PERNAH MEMOTONG BAGIAN 2: Heading "### Bagian 3: Kunci Jawaban dan Pembahasan Rubrik Penilaian" HANYA BOLEH DITULIS SETELAH BUTIR SOAL NOMOR ${jumlahSoal} SELESAI DITULIS LENGKAP!
4. DI BAGIAN 3: Susun secara rapi Kunci Jawaban Ideal, Rambu Penilaian, dan Rubrik Penskoran Skor 0-4 untuk masing-masing butir soal dari Nomor 1 sampai Nomor ${jumlahSoal} secara berurutan!`;
    }

    let bahasaGuideline = '';
    if (bahasa === 'arab') {
      bahasaGuideline = `PENTING - BAHASA ARAB: Seluruh isi dokumen (kisi-kisi, stimulus, soal, opsi, kunci, dan pembahasan) disajikan dalam BAHASA ARAB (اللغة العربية الفصحى) yang baku, tepat kaidah nahwu & sharaf. Tag teknis seperti [soal no 1], [opsi A], [KUNCI: A] TETAP dipertahankan agar kompatibel dengan sistem parser.`;
    } else if (bahasa === 'keduanya') {
      bahasaGuideline = `PENTING - DWIBAHASA / BILINGUAL (BAHASA ARAB DAN BAHASA INDONESIA):
Sajikan teks secara DWIBAHASA (berdampingan). Setiap stimulus, pertanyaan (stem), dan opsi jawaban ditulis dalam teks Bahasa Arab disertai terjemahan/penjelasan Bahasa Indonesia (contoh: teks Arab kemudian garis miring atau kurung terjemahan Indonesia). Hal ini memungkinkan instrumen dipahami dalam kedua bahasa secara bersamaan.`;
    } else {
      bahasaGuideline = `BAHASA INDONESIA: Gunakan Bahasa Indonesia baku sesuai PUEBI dan standar terminologi kurikulum nasional.`;
    }

    const systemInstruction = `Anda adalah seorang Ahli Evaluasi Pendidikan, Pengembang Instrumen Tes Psikometri, dan Desain Pembelajaran (Instructional Designer) senior berstandar nasional dan internasional.
Tugas utama Anda adalah merancang matriks "Kisi-kisi Soal" yang presisi dan menyusun "Butir Soal" (${bentukSoalText}) yang memiliki daya beda tinggi, kualitas psikometrik prima, dan selaras dengan materi landasan.

STANDAR EMAS PENULISAN SOAL & PENGECОH (DISTRACTOR) BERMUTU TINGGI (SANGAT KRUSIAL):
1. KESETARAAN PANJANG DAN STRUKTUR OPSI JAWABAN (PARITAS PANJANG OPSI):
   - Seluruh opsi jawaban (A, B, C, D, ${opsiJumlah === 5 ? 'E' : ''}) WAJIB memiliki PANJANG KALIMAT DAN TINGKAT KEDALAMAN YANG RELATIF SAMA DAN SETARA.
   - DILARANG KERAS membuat opsi kunci jawaban lebih panjang, lebih lengkap, atau lebih rinci dibanding opsi pengecoh!
   - Jangan pernah memberi petunjuk visual ("visual clue") di mana siswa dapat menebak jawaban hanya karena opsi tersebut paling panjang atau paling bertele-tele.
   - Jika kunci jawaban membutuhkan penjelasan 10 kata, maka SELURUH opsi pengecoh juga harus disusun sekitar 9-11 kata dengan kompleksitas kalimat yang sama.

2. HOMOGENITAS OPSI JAWABAN (HOMOGENEITY OF OPTIONS):
   - Seluruh opsi dalam satu butir soal WAJIB homogen dari sisi:
     a) Kategori gramatikal (misal: semua opsi diawali verba berimbuhan me-, atau semua frasa nomina, atau semua klausa sebab-akibat).
     b) Rumpun konsep materi (semua opsi berasal dari domain konsep dan tingkat abstraksi yang sama dalam topik bahasan).
     c) Gaya bahasa dan kejelasan redaksional (tidak ada opsi yang terdengar asing atau janggal).

3. PENGECOH YANG EFEKTIF DAN PLAUSIBEL (FUNCTIONING & PLAUSIBLE DISTRACTORS):
   - Sekalipun butir soal berada pada level kognitif rendah (LOTS: C1-C2) atau sedang (MOTS: C3), OPSI PENGECОH TETAP HARUS BERKUALITAS TINGGI, MASUK AKAL, DAN MENANTANG PEMIKIRAN.
   - Pengecoh TIDAK BOLEH berupa pernyataan konyol, absurd, atau jelas salah seketika tanpa membaca materi.
   - Pengecoh WAJIB memanfaatkan:
     * Miskonsepsi umum (common misconceptions) nyata peserta didik.
     * Kekeliruan penafsiran data/fakta yang sering terjadi.
     * Pertukaran konsep atau istilah yang mirip namun memiliki fungsi/makna berbeda.
   - Setiap pengecoh harus memiliki daya tarik (distractor power) sehingga siswa yang hanya menebak atau belum tuntas memahami konsep akan mempertimbangkan opsi tersebut.

4. PEMANFAATAN TOTAL MATERI LANDASAN / DOKUMEN RUJUKAN:
   - Jika pengguna menyertakan materi landasan (unggah berkas atau teks):
     * Kunci jawaban DAN SELURUH PENGECОH harus digali dari konsep, fakta, istilah, dan klasifikasi yang benar-benar ada di dalam materi landasan tersebut.
     * DILARANG hanya mengambil konsep untuk kunci lalu mengarang 3-4 pengecoh generik di luar konteks!
     * Manfaatkan alternatif definisi, kategori pembanding, atau nuansa yang tertulis di dalam dokumen landasan untuk menyusun pengecoh yang berbobot.

5. DISTRIBUSI KUNCI JAWABAN ACAK BERIMBANG:
   - Kunci jawaban harus tersebar secara alami dan bervariasi di seluruh butir soal (misal: soal 1 kunci C, soal 2 kunci A, soal 3 kunci D, dst.), jangan monoton atau selalu memilih opsi A.

6. BEBAS DARI CLUES & PETUNJUK TATA BAHASA:
   - Pokok soal (stem) tidak boleh memberikan petunjuk gramatikal ke arah satu opsi tertentu.
   - Hindari kata mutlak ("selalu", "pasti", "tidak pernah", "hanya") kecuali jika memang merupakan bagian dari kaidah ilmu pasti.

TUGAS DAN ATURAN STRUKTURAL:
1. MATRIKS KISI-KISI:
   - Susun tabel kisi-kisi menggunakan format Markdown tabel standar agar rapi dan mudah disalin ke Microsoft Word.
   - Kolom WAJIB persis:
     | No | Tujuan Pembelajaran (TP) | Materi | Indikator Soal | Level Kognitif | Tingkat Kesulitan | Nomor Soal |
   - Indikator Soal WAJIB menggunakan Kata Kerja Operasional (KKO) Taksonomi Bloom revisi yang spesifik dan terukur.
   - Level Kognitif: C1 - C6 sesuai permintaan.
   - Tingkat kesulitan: Mudah, Sedang, atau Sulit.
   - Pastikan tabel mencakup seluruh ${jumlahSoal} nomor soal.

2. STIMULUS SOAL:
   - Untuk soal analisis/evaluasi/kreasi (C4-C6), WAJIB diawali dengan stimulus nyata / skenario Problem Based Learning (PBL) berupa studi kasus kontekstual, data deskriptif, atau narasi fenomena aktual.
   - Untuk level C1-C3, stimulus ringkas kontekstual tetap diberikan jika relevan.

3. ${formatSoalRule}

4. KUNCI & PEMBAHASAN:
   - Sertakan kunci jawaban tepat dan pembahasan komprehensif untuk seluruh nomor soal 1 sampai ${jumlahSoal}.
   - Analisis secara mendalam mengapa kunci jawaban tepat dan MENGAPA SETIAP PENGECОH SALAH (analisis miskonsepsi pengecoh).
   - Untuk soal uraian: sertakan rambu-rambu jawaban dan pedoman rubrik penskoran skor 0-4 secara rinci.

5. ${bahasaGuideline}

STRUKTUR OUTPUT LENGKAP HARUS TERDIRI DARI 3 BAGIAN BESAR DENGAN HEADING PERSIS (BERURUTAN DARI ATAS KE BAWAH, DILARANG MEMOTONG/MENYELIPKAN BAGIAN 3 DI TENGAH SOAL):

### Bagian 1: Tabel Matriks Kisi-kisi
(Satu tabel markdown utuh yang mencakup semua nomor 1 sampai ${jumlahSoal})

### Bagian 2: Naskah Soal
(Tuliskan SEMUA butir soal dari nomor 1 sampai nomor ${jumlahSoal} secara runtut: [soal no 1], [soal no 2], [soal no 3], dst. sampai nomor ${jumlahSoal}. DILARANG KERAS menuliskan kunci/rubrik di sela-sela Bagian 2!)

### Bagian 3: Kunci Jawaban dan Pembahasan Rubrik Penilaian
(Setelah SEMUA soal 1 sampai ${jumlahSoal} selesai di Bagian 2, barulah tuliskan Bagian 3 ini yang memuat Kunci Jawaban, Pembahasan Analisis Miskonsepsi Pengecoh, dan Rubrik Penskoran untuk butir soal nomor 1 sampai ${jumlahSoal} secara berurutan)`;

    const userPrompt = `Rancang instrumen evaluasi lengkap dengan parameter berikut:
Mata Pelajaran: ${mataPelajaran}
Kelas/Fase: ${kelasFase}
Topik/Materi: ${topikMateri}
Bentuk Soal: ${bentukSoalText}
Jumlah Soal: ${jumlahSoal} butir soal (Wajib buat lengkap dari nomor 1 sampai nomor ${jumlahSoal})
Level Kognitif Dominan: ${levelKognitifText} (Kategori: ${levelKognitif})
Konteks Pembelajaran: ${konteksPembelajaran}
Jumlah Opsi: ${bentukSoal === 'pilihan_ganda' ? `${opsiJumlah} pilihan` : bentukSoal === 'benar_salah' ? '2 pilihan (Benar/Salah)' : 'Uraian/Isian'}
Pilihan Bahasa: ${bahasa === 'arab' ? 'Bahasa Arab' : bahasa === 'keduanya' ? 'Bahasa Indonesia dan Bahasa Arab (Dwibahasa/Bilingual)' : 'Bahasa Indonesia'}
${catatanTambahan ? `Catatan Khusus Tambahan: ${catatanTambahan}` : ''}

${
  materiFile?.textContent
    ? `\n=== DOKUMEN / MATERI LANDASAN YANG DIUNGGAH: ${materiFile.name} ===\n${materiFile.textContent}\n=== AKHIR DOKUMEN MATERI LANDASAN ===\n`
    : ''
}
${
  materiTeksLandasan
    ? `\n=== TEKS / RINGKASAN MATERI LANDASAN UTAMA ===\n${materiTeksLandasan}\n=== AKHIR TEKS MATERI LANDASAN ===\n`
    : ''
}
${
  materiFile?.base64 && (materiFile.type === 'application/pdf' || materiFile.type.startsWith('image/'))
    ? `\n(Catatan: Berkas dokumen/gambar materi terlampir '${materiFile.name}'. Jadikan berkas tersebut sebagai landasan pokok isi materi soal!)\n`
    : ''
}
${
  materiFile || materiTeksLandasan
    ? `\n=== INSTRUKSI KHUSUS PEMANFAATAN SUMBER MATERI LANDASAN (SANGAT KETAT) ===
1. RUJUKAN UTAMA KONSEP: Seluruh butir soal, stimulus, kunci jawaban, dan TERUTAMA OPSI PENGECОH (distractor) WAJIB bersumber dan menggali terminologi, dalil/teori, klasifikasi, atau data yang nyata tertuang di dalam materi landasan di atas.
2. PENGECОH HARUS MENGGUNAKAN MATERI SUMBER (PLAUSIBLE GROUNDED DISTRACTORS): DILARANG KERAS membuat opsi pengecoh asal-asalan di luar materi! Buatlah opsi pengecoh dari konsep, istilah, atau klasifikasi lain yang memang ADA di dalam materi landasan tetapi keliru penempatannya untuk konteks soal tersebut. Hal ini memastikan pengecoh bekerja sangat efektif bagi siswa yang hanya membaca sekilas.
3. KESEIMBANGAN PANJANG OPSI DARI TEKS SUMBER: Jangan menyalin kutipan panjang dari teks sumber hanya untuk opsi kunci jawaban sementara opsi pengecoh ditulis pendek dan dangkal. Olah kalimat pada Kunci Jawaban dan SELURUH Pengecoh agar memiliki panjang kalimat (jumlah kata) yang relatif sama dan berbobot setara!`
    : ''
}

Silakan susun secara utuh, lengkap, dan berkualitas tinggi:
1. Bagian 1: Tabel Kisi-kisi (Markdown)
2. Bagian 2: Naskah Soal (Lengkap untuk semua ${jumlahSoal} soal dengan format template yang diminta)
3. Bagian 3: Kunci Jawaban dan Pembahasan Analisis Miskonsepsi Pengecoh`;

    // Construct contents payload supporting multimodal PDF/image if attached
    let contentsPayload: any = userPrompt;
    if (materiFile?.base64 && (materiFile.type === 'application/pdf' || materiFile.type.startsWith('image/'))) {
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: materiFile.type,
              data: materiFile.base64,
            },
          },
          {
            text: userPrompt,
          },
        ],
      };
    }

    const { text: rawText, modelUsed } = await callGeminiWithFallback({
      contents: contentsPayload,
      systemInstruction,
      temperature: 0.45,
    });

    res.json({
      success: true,
      rawOutput: rawText,
      modelUsed,
      parameters: {
        mataPelajaran,
        kelasFase,
        topikMateri,
        materiFile: materiFile ? { name: materiFile.name, size: materiFile.size, type: materiFile.type } : undefined,
        materiTeksLandasan,
        jumlahSoal,
        bentukSoal,
        levelKognitif,
        konteksPembelajaran,
        bahasa,
        opsiJumlah,
      },
    });
  } catch (error: any) {
    console.error('Error generating assessment:', error);
    res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
});

// Endpoint to quickly refine or suggest revisions for a question
app.post('/api/refine-question', async (req, res) => {
  try {
    const { questionText, instruction, bahasa = 'indonesia', bentukSoal = 'pilihan_ganda' } = req.body;
    if (!questionText || !instruction) {
      return res.status(400).json({ error: 'Teks soal dan instruksi revisi wajib diisi.' });
    }

    const prompt = `Anda adalah Ahli Evaluasi Pembelajaran dan Ahli Psikometri Instrumen Tes. Revisi butir soal berikut berdasarkan permintaan:
Instruksi revisi: "${instruction}"
Bentuk Soal: ${bentukSoal}
Bahasa: ${bahasa === 'arab' ? 'Bahasa Arab' : bahasa === 'keduanya' ? 'Bahasa Indonesia dan Bahasa Arab' : 'Bahasa Indonesia'}

STANDAR MUTU KETAT:
1. Kesetaraan Panjang Opsi: Panjang kalimat antara kunci jawaban dan seluruh opsi pengecoh WAJIB relatif sama panjang dan setara tingkat kerinciannya (tidak boleh ada opsi yang jauh lebih panjang atau lebih pendek).
2. Homogenitas: Semua opsi wajib memiliki struktur gramatikal yang seragam dan masuk dalam rumpun konsep yang sama.
3. Pengecoh Plausibel: Pengecoh harus tampak logis dan menarik bagi siswa yang belum memahami konsep secara utuh.

Soal Asli:
${questionText}

Format output harus tetap mempertahankan tag seperti:
[soal no X]
Stimulus: (jika ada)
Pertanyaan: (rumusan pokok soal)
[opsi A] ... (jika pilihan ganda)
[opsi B] ...
[opsi C] ...
[opsi D] ...
[KUNCI: ...]

Berikan juga penjelasan singkat perubahannya.`;

    const { text: revisedText } = await callGeminiWithFallback({
      contents: prompt,
      temperature: 0.45,
    });

    res.json({
      success: true,
      revisedText,
    });
  } catch (error: any) {
    console.error('Error refining question:', error);
    res.status(500).json({ error: cleanErrorMessage(error) });
  }
});

// Serve frontend
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite middleware could not be loaded, fallback to static if dist exists:', err);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      }
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Assessment Builder Server running on port ${PORT}`);
  });
}

startServer();
