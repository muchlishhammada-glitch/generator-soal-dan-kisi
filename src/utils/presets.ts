import { AssessmentParams, BahasaType } from '../types';

export interface PresetItem {
  id: string;
  title: string;
  lang: BahasaType;
  description: string;
  badge: string;
  params: AssessmentParams;
}

export const PRESETS: PresetItem[] = [
  {
    id: 'arabic-indo-bilingual-pai',
    title: 'PAI & Bahasa Arab (Dwibahasa/Bilingual) - Fiqih Ibadah & Muamalah HOTS',
    lang: 'keduanya',
    badge: '🌐 Bilingual Arab & Indo',
    description: 'Soal disajikan dalam teks Arab dan terjemahan Indonesia berdampingan untuk menguji penalaran fikih dan pemahaman teks keagamaan.',
    params: {
      mataPelajaran: 'Pendidikan Agama Islam / الفقه الإسلامي',
      kelasFase: 'Kelas X / Fase E (SMA/SMK/MA)',
      topikMateri: 'فقه المعاملات المالية الحديثة (Fiqih Muamalah Finansial Modern: Riba, Akad Murabahah, dan Transaksi Digital)',
      jumlahSoal: 5,
      bentukSoal: 'pilihan_ganda',
      levelKognitif: 'c4-c5',
      konteksPembelajaran: 'Problem Based Learning (Dilema Transaksi Online & Pinjaman Digital)',
      bahasa: 'keduanya',
      opsiJumlah: 5,
      catatanTambahan: 'Sajikan stimulus, pertanyaan, dan opsi dalam teks Arab disertai terjemahan/penjelasan bahasa Indonesia secara berdampingan.',
    },
  },
  {
    id: 'arabic-sma-qawaid',
    title: 'اللغة العربية (المرحلة الثانوية) - فهم المقروء والقواعد في سياق حل المشكلات',
    lang: 'arab',
    badge: '🇸🇦 Bahasa Arab SMA',
    description: 'تحليل نصوص معاصرة حول البيئة واستنباط القواعد النحوية (الحال والتمييز والمفعول لأجله) بمستويات تفكير عليا (C4-C5).',
    params: {
      mataPelajaran: 'اللغة العربية (Bahasa Arab)',
      kelasFase: 'Kelas X / Fase E (SMA/SMK/MA)',
      topikMateri: 'فهم المقروء: قضايا حماية البيئة والتغير المناخي مع تطبيق قواعد المنصوبات (المفعول المطلق، المفعول لأجله، والحال)',
      jumlahSoal: 5,
      bentukSoal: 'pilihan_ganda',
      levelKognitif: 'c4-c5',
      konteksPembelajaran: 'التعلم القائم على حل المشكلات (Problem Based Learning) في إطار التنمية المستدامة',
      bahasa: 'arab',
      opsiJumlah: 5,
      catatanTambahan: 'يرجى وضع سند/نص مثير واقعي لكل سؤال يصف ظاهرة بيئية، وصياغة مشتتات مبنية على الأخطاء الشائعة في الإعراب.',
    },
  },
  {
    id: 'pai-sma-uraian',
    title: 'PAI SMA (Bentuk Uraian HOTS) - Fiqih Muamalah Digital & Rubrik Penskoran',
    lang: 'indonesia',
    badge: '📝 Uraian / Esai PAI',
    description: 'Butir soal esai analitis dengan skenario studi kasus riil disertai pedoman penskoran/rubrik penilaian.',
    params: {
      mataPelajaran: 'Pendidikan Agama Islam dan Budi Pekerti',
      kelasFase: 'Kelas X / Fase E (SMA/SMK/MA)',
      topikMateri: 'Fiqih Muamalah Kontemporer: Riba, Akad Murabahah, Syirkah, dan Transaksi Keuangan Digital (Fintech & Paylater)',
      jumlahSoal: 5,
      bentukSoal: 'uraian',
      levelKognitif: 'c4-c5',
      konteksPembelajaran: 'Problem Based Learning (Dilema Transaksi Keuangan Generasi Z dan Konsumerisme Digital)',
      bahasa: 'indonesia',
      opsiJumlah: 5,
      catatanTambahan: 'Sertakan rubrik penskoran skor 0-4 untuk setiap butir soal uraian.',
    },
  },
  {
    id: 'biologi-sma-benar-salah',
    title: 'Biologi SMA (Benar-Salah HOTS) - Sistem Imun & Resistensi Antibiotik',
    lang: 'indonesia',
    badge: '✓/✗ Benar-Salah Biologi',
    description: 'Pernyataan kritis berbasis data epidemiologi kasus wabah dan uji laboratorium yang menuntut penalaran C4-C5.',
    params: {
      mataPelajaran: 'Biologi',
      kelasFase: 'Kelas XI / Fase F (SMA/SMK/MA)',
      topikMateri: 'Sistem Pertahanan Tubuh: Mekanisme Respon Imun Spesifik, Vaksinasi mRNA, dan Fenomena Superbug (Resistensi Antibiotik)',
      jumlahSoal: 10,
      bentukSoal: 'benar_salah',
      levelKognitif: 'c4-c5',
      konteksPembelajaran: 'Problem Based Learning (Investigasi Wabah Infeksi Nosokomial di Rumah Sakit)',
      bahasa: 'indonesia',
      opsiJumlah: 5,
      catatanTambahan: 'Stimulus berupa tabel titer antibodi dan data uji kepekaan antibiotik.',
    },
  },
  {
    id: 'ips-smp-isian',
    title: 'IPS SMP (Isian Singkat HOTS) - Globalisasi & Kearifan Lokal',
    lang: 'indonesia',
    badge: '📋 Isian Singkat IPS',
    description: 'Pertanyaan analitis rumpang yang menguji pemahaman kausalitas fenomena transformasi sosial.',
    params: {
      mataPelajaran: 'Ilmu Pengetahuan Sosial (IPS)',
      kelasFase: 'Kelas IX / Fase D (SMP/MTs)',
      topikMateri: 'Perubahan Sosial Budaya dan Globalisasi: Dampak Transformasi Digital terhadap Eksistensi Kearifan Lokal',
      jumlahSoal: 5,
      bentukSoal: 'isian_singkat',
      levelKognitif: 'c4',
      konteksPembelajaran: 'Problem Based Learning (Fenomena Komodifikasi Budaya Daerah)',
      bahasa: 'indonesia',
      opsiJumlah: 4,
      catatanTambahan: 'Kunci jawaban berupa istilah sosiologis dan analisis ringkas.',
    },
  },
];
