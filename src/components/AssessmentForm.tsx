import React, { useState, useRef } from 'react';
import {
  Wand2,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Info,
  CheckCircle2,
  ListOrdered,
  FileEdit,
  CheckSquare,
  AlignLeft,
  UploadCloud,
  FileText,
  X,
  Paperclip,
} from 'lucide-react';
import {
  AssessmentParams,
  BentukSoalType,
  BahasaType,
  JumlahSoalType,
  LevelKognitifType,
  KELAS_FASE_OPTIONS,
  normalizeKelasFase,
} from '../types';

interface AssessmentFormProps {
  params: AssessmentParams;
  onChange: (params: AssessmentParams) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  params,
  onChange,
  onSubmit,
  isLoading,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isArabic = params.bahasa === 'arab';

  const updateField = <K extends keyof AssessmentParams>(key: K, value: AssessmentParams[K]) => {
    onChange({
      ...params,
      [key]: value,
    });
  };

  const updateFields = (partial: Partial<AssessmentParams>) => {
    onChange({
      ...params,
      ...partial,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (isText) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        updateFields({
          materiFile: {
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            textContent: text,
          },
          ...(params.materiTeksLandasan ? {} : { materiTeksLandasan: text.slice(0, 3000) }),
        });
      };
      reader.readAsText(file);
    } else if (isPdf || isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = (event.target?.result as string) || '';
        const base64 = dataUrl.split(',')[1] || '';
        updateField('materiFile', {
          name: file.name,
          type: isPdf ? 'application/pdf' : file.type,
          size: file.size,
          base64,
        });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        updateField('materiFile', {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          textContent: text,
        });
      };
      reader.readAsText(file);
    }
  };

  const removeUploadedFile = () => {
    updateField('materiFile', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const subjectSuggestionsIndo = [
    'Pendidikan Agama Islam (PAI)',
    'Bahasa Arab',
    'Biologi',
    'Fisika',
    'Kimia',
    'Matematika',
    'Ekonomi',
    'Sosiologi',
    'Bahasa Indonesia',
    'Pendidikan Pancasila',
  ];

  const subjectSuggestionsArab = [
    'اللغة العربية (Bahasa Arab)',
    'التربية الإسلامية والفقه (PAI)',
    'البلاغة والأدب العربي',
    'العلوم الطبيعية (IPA)',
    'الرياضيات (Matematika)',
  ];

  const levelOptions: { value: LevelKognitifType; code: string; label: string; tag: string }[] = [
    { value: 'c1', code: 'c1', label: 'C1 - Mengingat (Remembering)', tag: 'LOTS' },
    { value: 'c2', code: 'c2', label: 'C2 - Memahami (Understanding)', tag: 'LOTS' },
    { value: 'c3', code: 'c3', label: 'C3 - Menerapkan (Applying)', tag: 'MOTS' },
    { value: 'c4', code: 'c4', label: 'C4 - Menganalisis (Analyzing)', tag: 'HOTS' },
    { value: 'c5', code: 'c5', label: 'C5 - Mengevaluasi (Evaluating)', tag: 'HOTS' },
    { value: 'c6', code: 'c6', label: 'C6 - Mencipta (Creating)', tag: 'HOTS' },
    { value: 'c1-c3', code: 'c1-c3', label: 'C1 - C3 (Dasar ke Menengah / LOTS-MOTS)', tag: 'LOTS-MOTS' },
    { value: 'c4-c5', code: 'c4-c5', label: 'C4 - C5 (Dominan HOTS: Analisis & Evaluasi)', tag: 'HOTS' },
    { value: 'c4-c6', code: 'c4-c6', label: 'C4 - C6 (HOTS Lengkap: Analisis, Evaluasi & Solusi)', tag: 'HOTS' },
  ];

  const contextOptions = [
    'Problem Based Learning (PBL) - Skenario Masalah Nyata',
    'Studi Kasus Kontekstual & Fenomena Kontemporer',
    'Analisis Data Riil (Tabel, Infografis & Tren)',
    'Dilema Etika, Keputusan Kebijakan & Solusi Masalah',
  ];

  const jumlahSoalOptions: JumlahSoalType[] = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 50];

  const bentukSoalList: { id: BentukSoalType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'pilihan_ganda',
      label: 'Pilihan Ganda',
      icon: <CheckSquare className="w-4 h-4 text-emerald-600" />,
      desc: 'Format [soal no X], [opsi A-E], [KUNCI]',
    },
    {
      id: 'uraian',
      label: 'Uraian / Esai',
      icon: <AlignLeft className="w-4 h-4 text-blue-600" />,
      desc: 'Analisis mendalam & Rubrik penskoran',
    },
    {
      id: 'benar_salah',
      label: 'Benar - Salah',
      icon: <CheckCircle2 className="w-4 h-4 text-purple-600" />,
      desc: 'Pernyataan analisis [Benar / Salah]',
    },
    {
      id: 'isian_singkat',
      label: 'Isian Singkat',
      icon: <FileEdit className="w-4 h-4 text-amber-600" />,
      desc: 'Kalimat rumpang / jawaban spesifik',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 transition-all space-y-5">
      {/* Header Form */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isArabic ? 'معايير إعداد الاختبار (Parameter Instrumen)' : 'Parameter Instrumen Penilaian'}
            </h2>
            <p className="text-xs text-slate-500">
              Sesuaikan bentuk soal, bahasa output, jumlah soal, dan level kognitif
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {/* PILIHAN BAHASA OUTPUT (3 Pilihan: Bahasa Indonesia, Bahasa Arab, atau Dwibahasa/Keduanya) */}
        <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Pilihan Output Bahasa Soal:</span>
            <span className="text-[11px] font-normal text-emerald-700 font-semibold">Tersedia 3 Mode</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateField('bahasa', 'indonesia')}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                params.bahasa === 'indonesia'
                  ? 'border-emerald-600 bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
              }`}
            >
              <span>🇮🇩 Bahasa Indonesia</span>
            </button>

            <button
              type="button"
              onClick={() => updateField('bahasa', 'arab')}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                params.bahasa === 'arab'
                  ? 'border-emerald-600 bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
              }`}
            >
              <span>🇸🇦 اللغة العربية (Arab)</span>
            </button>

            <button
              type="button"
              onClick={() => updateField('bahasa', 'keduanya')}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                params.bahasa === 'keduanya'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
              }`}
              title="Output disajikan dalam Bahasa Arab dan Bahasa Indonesia sekaligus berdampingan"
            >
              <span>🌐 Indonesia & Arab (Dwibahasa)</span>
            </button>
          </div>
        </div>

        {/* BENTUK SOAL (Pilihan Ganda / Uraian / Benar-Salah / Isian Singkat) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Bentuk Soal *</span>
            <span className="text-[11px] text-slate-400">Pilihan: PG, Uraian, B-S, Isian</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {bentukSoalList.map((b) => {
              const isSelected = params.bentukSoal === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateField('bentukSoal', b.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-1 ring-emerald-500 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {b.icon}
                    <span className="text-xs">{b.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal block leading-tight line-clamp-1">
                    {b.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* JUMLAH SOAL (PILIHAN: 1 / 2 / 3 / 4 / 5 / 10 / 15 / 20 / 25 / 30 / 35 / 40 / 50) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Jumlah Soal * [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 50]</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              {params.jumlahSoal} Butir Soal
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {jumlahSoalOptions.map((qty) => {
              const isSelected = params.jumlahSoal === qty;
              return (
                <button
                  key={qty}
                  type="button"
                  onClick={() => updateField('jumlahSoal', qty)}
                  className={`flex-1 min-w-[38px] sm:min-w-[42px] py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-500'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {qty}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mata Pelajaran & Kelas/Fase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{isArabic ? 'المادة الدراسية (Mata Pelajaran) *' : 'Mata Pelajaran *'}</span>
            </label>
            <input
              type="text"
              required
              value={params.mataPelajaran}
              onChange={(e) => updateField('mataPelajaran', e.target.value)}
              placeholder="Contoh: Pendidikan Agama Islam, Bahasa Arab, Biologi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-slate-50/50 hover:bg-white transition-all"
            />
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-slate-400 shrink-0">Pilihan:</span>
              {(isArabic ? subjectSuggestionsArab : subjectSuggestionsIndo).slice(0, 4).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => updateField('mataPelajaran', s)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] whitespace-nowrap transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kelas / Fase *
              </label>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                {KELAS_FASE_OPTIONS.find((o) => o.value === normalizeKelasFase(params.kelasFase))?.fase || 'Fase E'}
              </span>
            </div>
            <select
              value={normalizeKelasFase(params.kelasFase)}
              onChange={(e) => {
                const val = e.target.value;
                const selectedOpt = KELAS_FASE_OPTIONS.find((o) => o.value === val);
                const isJuniorOrPrimary =
                  val.includes('SD') ||
                  val.includes('SMP') ||
                  val.includes('Fase A') ||
                  val.includes('Fase B') ||
                  val.includes('Fase C') ||
                  val.includes('Fase D');

                updateFields({
                  kelasFase: val,
                  opsiJumlah: selectedOpt ? selectedOpt.defaultOpsi : isJuniorOrPrimary ? 4 : 5,
                });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-slate-50/50 hover:bg-white transition-all cursor-pointer font-medium"
            >
              <optgroup label="SMA / SMK / MA (Fase E & F - 5 Opsi)">
                {KELAS_FASE_OPTIONS.filter((o) => o.tingkat === 'SMA').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="SMP / MTs (Fase D - 4 Opsi)">
                {KELAS_FASE_OPTIONS.filter((o) => o.tingkat === 'SMP').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="SD / MI (Fase A, B, C - 4 Opsi)">
                {KELAS_FASE_OPTIONS.filter((o) => o.tingkat === 'SD').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Pendidikan Tinggi (5 Opsi)">
                {KELAS_FASE_OPTIONS.filter((o) => o.tingkat === 'PT').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              {!KELAS_FASE_OPTIONS.some((o) => o.value === normalizeKelasFase(params.kelasFase)) && (
                <option value={params.kelasFase}>{params.kelasFase}</option>
              )}
            </select>

            {/* Quick chips for rapid Fase selection */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-slate-400 shrink-0">Pilih Fase:</span>
              {[
                { label: 'Fase E (SMA 10)', val: 'Kelas X / Fase E (SMA/SMK/MA)', opsi: 5 },
                { label: 'Fase F (SMA 11)', val: 'Kelas XI / Fase F (SMA/SMK/MA)', opsi: 5 },
                { label: 'Fase F (SMA 12)', val: 'Kelas XII / Fase F (SMA/SMK/MA)', opsi: 5 },
                { label: 'Fase D (SMP 9)', val: 'Kelas IX / Fase D (SMP/MTs)', opsi: 4 },
                { label: 'Fase D (SMP 7)', val: 'Kelas VII / Fase D (SMP/MTs)', opsi: 4 },
                { label: 'Fase C (SD 5-6)', val: 'Kelas V-VI / Fase C (SD/MI)', opsi: 4 },
              ].map((chip) => {
                const isActive = normalizeKelasFase(params.kelasFase) === chip.val;
                return (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() =>
                      updateFields({
                        kelasFase: chip.val,
                        opsiJumlah: chip.opsi as 4 | 5,
                      })
                    }
                    className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-all cursor-pointer font-medium ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Topik / Materi */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Topik / Materi Pembelajaran *</span>
            <span className="text-[11px] font-normal text-slate-400">Ruang lingkup materi</span>
          </label>
          <textarea
            required
            rows={2}
            value={params.topikMateri}
            onChange={(e) => updateField('topikMateri', e.target.value)}
            placeholder="Contoh: Fiqih Muamalah: Riba, Akad Murabahah, dan Transaksi Keuangan Digital (Paylater & Fintech)"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-slate-50/50 hover:bg-white transition-all resize-y"
          />
        </div>

        {/* KOLOM UPLOAD MATERI LANDASAN PENYUSUNAN SOAL */}
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>Upload Materi Landasan Penyusunan Soal</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              PDF, TXT, DOC, Gambar
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Unggah naskah modul, bab buku ajar, artikel studi kasus, atau data rujukan utama. AI akan secara ketat mengekstrak konsep materi, merancang opsi jawaban yang <strong>homogen & sama panjang</strong>, serta menyusun pengecoh (distractor) berbasis isi materi agar tidak mudah ditebak.
          </p>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
            id="materi-upload-input"
          />

          {params.materiFile ? (
            <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {params.materiFile.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(params.materiFile.size / 1024).toFixed(1)} KB • Berkas landasan siap digunakan
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={removeUploadedFile}
                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Hapus berkas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-3.5 text-center cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 group-hover:text-emerald-700 font-semibold">
                <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                <span>Pilih berkas dari perangkat (Klik untuk unggah)</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Mendukung dokumen PDF, teks modul (.txt/.md), Word, atau foto halaman buku
              </span>
            </div>
          )}

          {/* Optional text area to write or paste excerpt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span>Atau Tempel Teks Ringkasan Materi Landasan:</span>
              </span>
              {params.materiTeksLandasan && (
                <span className="text-[10px] text-slate-400">
                  {params.materiTeksLandasan.length} karakter
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={params.materiTeksLandasan || ''}
              onChange={(e) => updateField('materiTeksLandasan', e.target.value)}
              placeholder="Salin atau ketikkan ringkasan materi landasan di sini (misal: kutipan teks ajar, dalil/teori, narasi fakta kasus)..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs bg-white resize-y"
            />
          </div>
        </div>

        {/* Format Opsi (jika Pilihan Ganda) & Level Kognitif */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {params.bentukSoal === 'pilihan_ganda' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jumlah Opsi Pilihan Ganda
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('opsiJumlah', 4)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    params.opsiJumlah === 4
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  4 Opsi (A - D) <span className="text-[10px] text-slate-400 block">SD / SMP</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('opsiJumlah', 5)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    params.opsiJumlah === 5
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  5 Opsi (A - E) <span className="text-[10px] text-slate-400 block">SMA / MA</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Karakteristik Butir Soal
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                {params.bentukSoal === 'uraian' && 'Soal Uraian dilengkapi Kunci Jawaban & Rubrik Penskoran.'}
                {params.bentukSoal === 'benar_salah' && 'Pernyataan stimulus dengan opsi Benar / Salah.'}
                {params.bentukSoal === 'isian_singkat' && 'Pertanyaan rumpang dengan kata kunci jawaban singkat.'}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Level Kognitif *</span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                {params.levelKognitif}
              </span>
            </label>

            <select
              value={params.levelKognitif}
              onChange={(e) => updateField('levelKognitif', e.target.value as LevelKognitifType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs sm:text-sm bg-slate-50/50 hover:bg-white transition-all cursor-pointer font-medium"
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  [{opt.code}] {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Konteks Pembelajaran */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Konteks Pembelajaran (Stimulus HOTS)</span>
            <span className="text-[11px] text-emerald-700 font-semibold">Berakar Dunia Nyata</span>
          </label>
          <input
            type="text"
            value={params.konteksPembelajaran}
            onChange={(e) => updateField('konteksPembelajaran', e.target.value)}
            placeholder="Contoh: Problem Based Learning (PBL) berbasis fenomena kehidupan nyata"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-slate-50/50 hover:bg-white transition-all"
          />
        </div>

        {/* Collapsible Catatan Tambahan */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            {showAdvanced ? 'Sembunyikan Catatan Khusus' : '+ Tambah Catatan / Instruksi Khusus (Opsional)'}
          </button>

          {showAdvanced && (
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-slate-700">
                Catatan Khusus untuk Ahli Evaluasi:
              </label>
              <textarea
                rows={2}
                value={params.catatanTambahan || ''}
                onChange={(e) => updateField('catatanTambahan', e.target.value)}
                placeholder="Contoh: Tekankan pada miskonsepsi umum peserta didik..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs bg-white"
              />
            </div>
          )}
        </div>

        {/* Submit Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !params.mataPelajaran || !params.topikMateri}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base ${
              isLoading || !params.mataPelajaran || !params.topikMateri
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Menyusun {params.jumlahSoal} Butir Soal HOTS & Matriks Kisi-kisi...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>
                  Susun {params.jumlahSoal} Soal {bentukSoalList.find((b) => b.id === params.bentukSoal)?.label} Sekarang
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
