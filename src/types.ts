export type BentukSoalType = 'pilihan_ganda' | 'uraian' | 'benar_salah' | 'isian_singkat';
export type BahasaType = 'indonesia' | 'arab' | 'keduanya';
export type JumlahSoalType = 1 | 2 | 3 | 4 | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 50;
export type LevelKognitifType = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c1-c3' | 'c4-c5' | 'c4-c6';

export interface KelasFaseOption {
  value: string;
  label: string;
  fase: string;
  tingkat: 'SMA' | 'SMP' | 'SD' | 'PT';
  defaultOpsi: 4 | 5;
}

export const KELAS_FASE_OPTIONS: KelasFaseOption[] = [
  { value: 'Kelas X / Fase E (SMA/SMK/MA)', label: 'Fase E - Kelas X (SMA/SMK/MA)', fase: 'Fase E', tingkat: 'SMA', defaultOpsi: 5 },
  { value: 'Kelas XI / Fase F (SMA/SMK/MA)', label: 'Fase F - Kelas XI (SMA/SMK/MA)', fase: 'Fase F', tingkat: 'SMA', defaultOpsi: 5 },
  { value: 'Kelas XII / Fase F (SMA/SMK/MA)', label: 'Fase F - Kelas XII (SMA/SMK/MA)', fase: 'Fase F', tingkat: 'SMA', defaultOpsi: 5 },
  { value: 'Kelas VII / Fase D (SMP/MTs)', label: 'Fase D - Kelas VII (SMP/MTs)', fase: 'Fase D', tingkat: 'SMP', defaultOpsi: 4 },
  { value: 'Kelas VIII / Fase D (SMP/MTs)', label: 'Fase D - Kelas VIII (SMP/MTs)', fase: 'Fase D', tingkat: 'SMP', defaultOpsi: 4 },
  { value: 'Kelas IX / Fase D (SMP/MTs)', label: 'Fase D - Kelas IX (SMP/MTs)', fase: 'Fase D', tingkat: 'SMP', defaultOpsi: 4 },
  { value: 'Kelas V-VI / Fase C (SD/MI)', label: 'Fase C - Kelas V-VI (SD/MI)', fase: 'Fase C', tingkat: 'SD', defaultOpsi: 4 },
  { value: 'Kelas III-IV / Fase B (SD/MI)', label: 'Fase B - Kelas III-IV (SD/MI)', fase: 'Fase B', tingkat: 'SD', defaultOpsi: 4 },
  { value: 'Kelas I-II / Fase A (SD/MI)', label: 'Fase A - Kelas I-II (SD/MI)', fase: 'Fase A', tingkat: 'SD', defaultOpsi: 4 },
  { value: 'Perguruan Tinggi / Mahasiswa', label: 'Perguruan Tinggi / Mahasiswa', fase: 'PT', tingkat: 'PT', defaultOpsi: 5 },
];

export function normalizeKelasFase(val: string): string {
  if (!val) return KELAS_FASE_OPTIONS[0].value;
  const exact = KELAS_FASE_OPTIONS.find((opt) => opt.value === val);
  if (exact) return exact.value;

  const lower = val.toLowerCase();
  if (lower.includes('fase e') || lower.includes('kelas x') || lower.includes('kelas 10') || lower.includes('العاشر')) {
    return 'Kelas X / Fase E (SMA/SMK/MA)';
  }
  if (lower.includes('fase f') && (lower.includes('xii') || lower.includes('12') || lower.includes('الثاني عشر'))) {
    return 'Kelas XII / Fase F (SMA/SMK/MA)';
  }
  if (lower.includes('fase f') || lower.includes('kelas xi') || lower.includes('kelas 11') || lower.includes('الحادي عشر')) {
    return 'Kelas XI / Fase F (SMA/SMK/MA)';
  }
  if (lower.includes('fase d') && (lower.includes('vii') || lower.includes('kelas 7') || lower.includes('السابع'))) {
    return 'Kelas VII / Fase D (SMP/MTs)';
  }
  if (lower.includes('fase d') && (lower.includes('viii') || lower.includes('kelas 8') || lower.includes('الثامن'))) {
    return 'Kelas VIII / Fase D (SMP/MTs)';
  }
  if (lower.includes('fase d') || lower.includes('kelas ix') || lower.includes('kelas 9') || lower.includes('التاسع') || lower.includes('smp')) {
    return 'Kelas IX / Fase D (SMP/MTs)';
  }
  if (lower.includes('fase c') || lower.includes('kelas v') || lower.includes('kelas 5') || lower.includes('kelas 6')) {
    return 'Kelas V-VI / Fase C (SD/MI)';
  }
  if (lower.includes('fase b') || lower.includes('kelas iii') || lower.includes('kelas 3') || lower.includes('kelas 4')) {
    return 'Kelas III-IV / Fase B (SD/MI)';
  }
  if (lower.includes('fase a') || lower.includes('kelas i') || lower.includes('kelas 1') || lower.includes('kelas 2') || lower.includes('sd')) {
    return 'Kelas I-II / Fase A (SD/MI)';
  }
  if (lower.includes('tinggi') || lower.includes('mahasiswa') || lower.includes('جامع')) {
    return 'Perguruan Tinggi / Mahasiswa';
  }
  return val;
}

export interface UploadedMateriFile {
  name: string;
  type: string;
  size: number;
  base64?: string;
  textContent?: string;
}

export interface AssessmentParams {
  mataPelajaran: string;
  kelasFase: string;
  topikMateri: string;
  materiFile?: UploadedMateriFile;
  materiTeksLandasan?: string;
  jumlahSoal: JumlahSoalType;
  bentukSoal: BentukSoalType;
  levelKognitif: LevelKognitifType;
  konteksPembelajaran: string;
  bahasa: BahasaType;
  opsiJumlah: 4 | 5;
  catatanTambahan?: string;
}

export interface ParsedOption {
  key: string; // 'A', 'B', 'C', 'D', 'E' or 'Benar'/'Salah'
  text: string;
}

export interface ParsedQuestion {
  number: number;
  bentukSoal?: BentukSoalType;
  stimulus: string;
  stem: string;
  options: ParsedOption[];
  correctKey: string;
  rubrikSkor?: string;
  rawBlock: string;
  userSelectedOption?: string; // For simulation mode
  userTextAnswer?: string; // For isian/uraian simulation
}

export interface KisiKisiRow {
  no: string;
  tp: string;
  materi: string;
  indikator: string;
  levelKognitif: string;
  tingkatKesulitan: string;
  nomorSoal: string;
}

export interface AssessmentResult {
  rawOutput: string;
  kisiKisiMarkdown: string;
  kisiKisiRows: KisiKisiRow[];
  naskahSoalRaw: string;
  questions: ParsedQuestion[];
  kunciDanPembahasan: string;
  parameters: AssessmentParams;
}
