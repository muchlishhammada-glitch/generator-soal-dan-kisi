import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AssessmentForm } from './components/AssessmentForm';
import { AssessmentViewer } from './components/AssessmentViewer';
import { AssessmentParams, AssessmentResult, ParsedQuestion, BahasaType } from './types';
import { parseAssessmentOutput } from './utils/parser';
import { PRESETS, PresetItem } from './utils/presets';
import {
  Sparkles,
  History,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function App() {
  const [params, setParams] = useState<AssessmentParams>({
    mataPelajaran: 'Pendidikan Agama Islam dan Budi Pekerti',
    kelasFase: 'Kelas X / Fase E (SMA/SMK/MA)',
    topikMateri: 'Fiqih Muamalah Kontemporer: Riba, Akad Murabahah, dan Transaksi Keuangan Digital (Paylater)',
    jumlahSoal: 5,
    bentukSoal: 'pilihan_ganda',
    levelKognitif: 'c4-c5',
    konteksPembelajaran: 'Problem Based Learning (PBL) - Dilema Kasus Transaksi Keuangan Digital',
    bahasa: 'indonesia',
    opsiJumlah: 5,
    catatanTambahan: 'Sertakan stimulus kasus riil belanja online dengan tawaran cicilan dan denda keterlambatan.',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [savedHistory, setSavedHistory] = useState<AssessmentResult[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('hots_assessment_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedHistory(parsed);
          setAssessment(parsed[0]);
          setParams(parsed[0].parameters);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (newAssessment: AssessmentResult) => {
    try {
      const updated = [newAssessment, ...savedHistory.filter((item) => item.rawOutput !== newAssessment.rawOutput)].slice(0, 8);
      setSavedHistory(updated);
      localStorage.setItem('hots_assessment_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = () => {
    setSavedHistory([]);
    localStorage.removeItem('hots_assessment_history');
  };

  // Rotating loading steps
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    'Menganalisis Capaian Pembelajaran & Merumuskan Indikator KKO Taksonomi Bloom...',
    'Menyusun Skenario Stimulus Masalah Autentik Dunia Nyata (Problem Based Learning)...',
    'Mengonstruksi Pokok Soal & Format Evaluasi Sesuai Bentuk Soal Terpilih...',
    'Menghasilkan Matriks Kisi-kisi Markdown, Format Naskah Soal, dan Rubrik Pembahasan...',
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        let errorMsg = data.error || 'Terjadi kesalahan saat menyusun instrumen penilaian.';
        try {
          const parsed = JSON.parse(errorMsg);
          if (parsed?.error?.message) {
            errorMsg = parsed.error.message;
          }
        } catch {
          // not JSON
        }
        if (errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE')) {
          errorMsg = 'Layanan AI Google sedang mengalami lonjakan antrean trafik yang tinggi (503). Sistem telah mencoba model alternatif. Silakan tekan tombol "Coba Lagi Sekarang" di bawah ini.';
        }
        throw new Error(errorMsg);
      }

      const parsed = parseAssessmentOutput(data.rawOutput, params);
      setAssessment(parsed);
      saveToHistory(parsed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyusun instrumen penilaian. Pastikan koneksi server aktif.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetItem) => {
    setParams(preset.params);
  };

  const handleLanguageChange = (lang: BahasaType) => {
    setParams((prev) => ({
      ...prev,
      bahasa: lang,
      mataPelajaran:
        lang === 'arab'
          ? 'اللغة العربية (Bahasa Arab)'
          : lang === 'keduanya'
          ? 'Pendidikan Agama Islam / الفقه الإسلامي'
          : prev.mataPelajaran.includes('العربية')
          ? 'Pendidikan Agama Islam dan Budi Pekerti'
          : prev.mataPelajaran,
      topikMateri:
        lang === 'arab'
          ? 'فهم المقروء: قضايا حماية البيئة والتغير المناخي مع تطبيق قواعد المنصوبات'
          : lang === 'keduanya'
          ? 'فقه المعاملات المالية الحديثة (Fiqih Muamalah: Riba, Murabahah & Transaksi Digital)'
          : prev.topikMateri,
    }));
  };

  const handleUpdateQuestion = (updated: ParsedQuestion) => {
    if (!assessment) return;
    const updatedList = assessment.questions.map((q) => (q.number === updated.number ? updated : q));
    const newAssessment: AssessmentResult = {
      ...assessment,
      questions: updatedList,
    };
    setAssessment(newAssessment);
    saveToHistory(newAssessment);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        onSelectPreset={handleSelectPreset}
        activeLanguage={params.bahasa}
        onLanguageChange={handleLanguageChange}
        currentParams={params}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-amber-900 mb-0.5">Kendala Respons AI / Lonjakan Antrean:</strong>
                <span className="text-slate-700 leading-relaxed">{error}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Coba Lagi Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Main Grid: Form on the Left/Top, Output on the Right/Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input Form (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-4">
            <AssessmentForm
              params={params}
              onChange={setParams}
              onSubmit={handleGenerate}
              isLoading={isLoading}
            />

            {/* Presets Cards Showcase */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets Studi Kasus HOTS
                </span>
                <span className="text-[11px] text-slate-400">Klik untuk memuat</span>
              </div>
              <div className="space-y-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                        {p.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0 ml-1">
                        {p.params.bentukSoal.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* History drawer if any */}
            {savedHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" /> Riwayat Instrumen Tersimpan ({savedHistory.length})
                  </span>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Bersihkan
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {savedHistory.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAssessment(h);
                        setParams(h.parameters);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        assessment?.rawOutput === h.rawOutput
                          ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate flex-1 mr-2">
                        {h.parameters.mataPelajaran} - {h.parameters.topikMateri.substring(0, 30)}...
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {h.questions.length || h.parameters.jumlahSoal} soal
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Output Viewer (7 cols on desktop) */}
          <div className="lg:col-span-7 space-y-4">
            {isLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm text-center space-y-6">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-ping opacity-50" />
                  <div className="relative w-16 h-16 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    Menyusun {params.jumlahSoal} Butir Soal {params.bentukSoal.replace('_', ' ').toUpperCase()} HOTS
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-700 font-medium min-h-[40px] transition-all">
                    {loadingMessages[loadingStep]}
                  </p>
                </div>

                <div className="w-full max-w-xs mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500"
                    style={{ width: `${((loadingStep + 1) / 4) * 100}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  Model bertindak sebagai Ahli Evaluasi Pendidikan & Desain Pembelajaran Senior
                </p>
              </div>
            ) : assessment ? (
              <AssessmentViewer
                assessment={assessment}
                onUpdateQuestion={handleUpdateQuestion}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-bold text-slate-800">
                    Instrumen Evaluasi Belum Disusun
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pilih bentuk soal, bahasa output (Indonesia, Arab, atau Dwibahasa), dan jumlah butir soal [5 / 10 / 15 / 20 / 25 / 30 / 35 / 40 / 50], lalu klik{' '}
                    <strong>"Susun Soal Sekarang"</strong>.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Susun Contoh Pertama Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Instrumen Evaluasi Pendidikan HOTS (Higher Order Thinking Skills) & Desain Pembelajaran
          </span>
          <span className="text-slate-400">
            Pilihan Bentuk: Pilihan Ganda • Uraian • Benar-Salah • Isian Singkat | Bahasa: Indonesia & Arab
          </span>
        </div>
      </footer>
    </div>
  );
}
