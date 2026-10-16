import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileDown,
  Printer,
  Edit3,
  Eye,
  FileText,
  Table as TableIcon,
  CheckCircle2,
  Brain,
  HelpCircle,
  Sparkles,
  PlayCircle,
  ExternalLink,
  Code,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { AssessmentResult, ParsedQuestion } from '../types';
import {
  formatFullMarkdown,
  formatQuestionTemplateOnly,
  downloadAsWordDoc,
  copyToClipboardFormatted,
} from '../utils/parser';
import { QuestionEditorModal } from './QuestionEditorModal';
import { TestSimulation } from './TestSimulation';

interface AssessmentViewerProps {
  assessment: AssessmentResult;
  onUpdateQuestion: (updated: ParsedQuestion) => void;
}

export const AssessmentViewer: React.FC<AssessmentViewerProps> = ({
  assessment,
  onUpdateQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'table' | 'questions' | 'key' | 'simulation'>('all');
  const [showRawTemplate, setShowRawTemplate] = useState(false);
  const [showRawMarkdownTable, setShowRawMarkdownTable] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ParsedQuestion | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [expandedKeyNumbers, setExpandedKeyNumbers] = useState<number[]>([]);

  const isArabic = assessment.parameters.bahasa === 'arab';

  const handleCopyWord = async () => {
    const el = document.getElementById('printable-assessment-document');
    const plain = formatFullMarkdown(assessment);
    const html = el ? el.innerHTML : `<pre>${plain}</pre>`;
    const ok = await copyToClipboardFormatted(html, plain);
    if (ok) {
      setCopiedType('word');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleCopyTemplate = async () => {
    const text = formatQuestionTemplateOnly(assessment.questions);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('template');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyMarkdown = async () => {
    const text = formatFullMarkdown(assessment);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('markdown');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (activeTab === 'simulation') {
      setActiveTab('all');
    }
    const originalTitle = document.title;
    const cleanSubject = assessment.parameters.mataPelajaran.replace(/[/\\?%*:|"<>]/g, '_').trim();
    document.title = `Kisi-kisi_dan_Soal_HOTS_${cleanSubject}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 150);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Dokumen Lengkap</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'table'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Bagian 1: Kisi-kisi ({assessment.kisiKisiRows.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Bagian 2: Naskah Soal ({assessment.questions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('key')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'key'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Bagian 3: Kunci & Pembahasan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Simulasi Ujian</span>
          </button>
        </div>

        {/* Prominent Download and Copy Buttons */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* DOWNLOAD WORD */}
          <button
            type="button"
            onClick={() => downloadAsWordDoc(assessment)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
            title="Download instrumen penilaian sebagai berkas Microsoft Word (.doc)"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Word</span>
          </button>

          {/* DOWNLOAD PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
            title="Download atau Cetak dokumen sebagai file PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* SALIN WORD FORMAT */}
          <button
            type="button"
            onClick={handleCopyWord}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Salin tabel dan format soal agar langsung rapi saat di-paste di Microsoft Word"
          >
            {copiedType === 'word' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedType === 'word' ? 'Tersalin untuk Word!' : 'Salin Format Word'}</span>
          </button>

          {/* SALIN TEMPLATE */}
          <button
            type="button"
            onClick={handleCopyTemplate}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Salin teks template soal [soal no X] ... [opsi A] ... [KUNCI: A]"
          >
            {copiedType === 'template' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5" />}
            <span>{copiedType === 'template' ? 'Template Tersalin!' : 'Salin Template'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'simulation' ? (
        <TestSimulation
          questions={assessment.questions}
          params={assessment.parameters}
          pembahasan={assessment.kunciDanPembahasan}
        />
      ) : (
        <div id="printable-assessment-document" className="space-y-6">
          {/* Document Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {isArabic ? 'وثيقة تقويم التعلم الرسمية' : 'Dokumen Penilaian & Evaluasi Pembelajaran'}
                </span>
                <h2 className={`text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 ${isArabic ? 'font-arabic-title' : ''}`}>
                  {isArabic
                    ? `شبكة الاختبار والأسئلة الموضوعية: ${assessment.parameters.mataPelajaran}`
                    : `Kisi-kisi & Butir Soal HOTS: ${assessment.parameters.mataPelajaran}`}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                  <span><strong>Kelas/Fase:</strong> {assessment.parameters.kelasFase}</span>
                  <span>•</span>
                  <span><strong>Topik:</strong> {assessment.parameters.topikMateri}</span>
                  <span>•</span>
                  <span><strong>Level:</strong> {assessment.parameters.levelKognitif.toUpperCase()}</span>
                  <span>•</span>
                  <span><strong>Model:</strong> {assessment.parameters.konteksPembelajaran}</span>
                  {assessment.parameters.materiFile && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Rujukan: {assessment.parameters.materiFile.name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  {assessment.questions.length} Butir Soal
                </span>
                <span className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                  {assessment.parameters.opsiJumlah} Opsi (A - {assessment.parameters.opsiJumlah === 4 ? 'D' : 'E'})
                </span>
              </div>
            </div>

            {/* Quick Download Strip */}
            <div className="pt-3.5 mt-1 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100 no-print">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Format instrumen telah berstandar & siap diunduh:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadAsWordDoc(assessment)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh dokumen kisi-kisi dan naskah soal dalam format Microsoft Word"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh dokumen kisi-kisi dan naskah soal dalam format PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-600" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 1: KISI-KISI TABLE */}
          {(activeTab === 'all' || activeTab === 'table') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isArabic ? 'القسم الأول: جدول مواصفات الاختبار (Matriks Kisi-kisi)' : 'Bagian 1: Matriks Kisi-kisi Soal'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Disusun dengan format Markdown tabel untuk kemudahan salin ke Microsoft Word.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRawMarkdownTable(!showRawMarkdownTable)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showRawMarkdownTable ? 'Tampilkan Tabel Rapi' : 'Lihat Raw Markdown'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium transition-colors"
                    title="Salin Markdown tabel"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Markdown</span>
                  </button>
                </div>
              </div>

              {showRawMarkdownTable ? (
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre">
                  {assessment.kisiKisiMarkdown || 'Tabel Markdown tidak tersedia.'}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-800 font-bold border-b border-slate-200">
                        <th className="py-3 px-3 text-center w-12 border-r border-slate-200">No</th>
                        <th className="py-3 px-3.5 min-w-[160px] border-r border-slate-200">
                          {isArabic ? 'نواتج التعلم (Tujuan Pembelajaran)' : 'Tujuan Pembelajaran (TP)'}
                        </th>
                        <th className="py-3 px-3.5 min-w-[140px] border-r border-slate-200">
                          {isArabic ? 'المادة الدراسية' : 'Materi'}
                        </th>
                        <th className="py-3 px-3.5 min-w-[200px] border-r border-slate-200">
                          {isArabic ? 'مؤشر السؤال (KKO)' : 'Indikator Soal (KKO Spesifik)'}
                        </th>
                        <th className="py-3 px-3 text-center w-24 border-r border-slate-200">
                          {isArabic ? 'المستوى' : 'Level Kognitif'}
                        </th>
                        <th className="py-3 px-3 text-center w-24 border-r border-slate-200">
                          {isArabic ? 'الصعوبة' : 'Tingkat Kesulitan'}
                        </th>
                        <th className="py-3 px-3 text-center w-16">
                          {isArabic ? 'رقم السؤال' : 'No Soal'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {assessment.kisiKisiRows.length > 0 ? (
                        assessment.kisiKisiRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-600 border-r border-slate-200">
                              {row.no || idx + 1}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-800 leading-relaxed border-r border-slate-200">
                              {row.tp}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-700 leading-relaxed border-r border-slate-200">
                              {row.materi}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-800 leading-relaxed border-r border-slate-200">
                              <span className="font-medium text-emerald-900 bg-emerald-50/60 px-1 py-0.5 rounded">
                                {row.indikator}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                {row.levelKognitif}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  row.tingkatKesulitan.toLowerCase().includes('sulit')
                                    ? 'bg-amber-100 text-amber-800'
                                    : row.tingkatKesulitan.toLowerCase().includes('mudah')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {row.tingkatKesulitan}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {row.nomorSoal}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500">
                            Format Markdown tabel:
                            <pre className="text-left font-mono text-xs mt-2 p-3 bg-slate-50 rounded-lg">
                              {assessment.kisiKisiMarkdown}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: NASKAH SOAL */}
          {(activeTab === 'all' || activeTab === 'questions') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isArabic ? 'القسم الثاني: نصوص الأسئلة (Naskah Soal)' : 'Bagian 2: Naskah Butir Soal HOTS'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Format standar <code className="text-emerald-700 font-mono">[soal no X] ... [opsi A] ... [KUNCI: A]</code> dengan stimulus dunia nyata (PBL).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRawTemplate(!showRawTemplate)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showRawTemplate ? 'Lihat Kartu Soal' : 'Lihat Teks Template Murni'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="text-xs px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-bold transition-all shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Naskah Template</span>
                  </button>
                </div>
              </div>

              {/* View toggle: Raw text vs interactive cards */}
              {showRawTemplate ? (
                <div className="relative">
                  <pre
                    className={`p-5 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap ${
                      isArabic ? 'font-arabic text-right' : ''
                    }`}
                  >
                    {formatQuestionTemplateOnly(assessment.questions) || assessment.naskahSoalRaw}
                  </pre>
                </div>
              ) : (
                <div className="space-y-6">
                  {assessment.questions.map((q) => (
                    <div
                      key={q.number}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 transition-all space-y-4 group"
                    >
                      {/* Question Item Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-800 text-white px-2.5 py-0.5 rounded-md">
                            [soal no {q.number}]
                          </span>
                          {assessment.parameters.bentukSoal === 'pilihan_ganda' || assessment.parameters.bentukSoal === 'benar_salah' ? (
                            q.correctKey ? (
                              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                KUNCI: {q.correctKey}
                              </span>
                            ) : null
                          ) : assessment.parameters.bentukSoal === 'isian_singkat' ? (
                            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              Isian Singkat
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                              Uraian / Esai HOTS
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingQuestion(q)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 font-medium transition-colors shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Edit / Perbaiki</span>
                        </button>
                      </div>

                      {/* Stimulus */}
                      {q.stimulus && (
                        <div
                          className={`p-3.5 rounded-xl bg-slate-50 border-l-4 border-emerald-500 shadow-2xs text-xs sm:text-sm leading-relaxed text-slate-700 ${
                            isArabic ? 'font-arabic text-right border-l-0 border-r-4' : ''
                          }`}
                        >
                          <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                            {isArabic ? 'السند / النص المثير (Stimulus PBL):' : 'Stimulus (Skenario / Fenomena Masalah):'}
                          </span>
                          <div className="whitespace-pre-line font-normal text-slate-700">{q.stimulus}</div>
                        </div>
                      )}

                      {/* Stem */}
                      <div
                        className={`text-slate-800 text-sm sm:text-base leading-relaxed ${
                          isArabic ? 'font-arabic text-right' : ''
                        }`}
                      >
                        {q.stimulus ? (
                          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {isArabic ? 'السؤال / المطلوب:' : 'Rumusan Pertanyaan:'}
                          </span>
                        ) : null}
                        <div className="whitespace-pre-line font-normal text-slate-800">{q.stem}</div>
                      </div>

                      {/* Options for Multiple Choice or True/False */}
                      {(assessment.parameters.bentukSoal === 'pilihan_ganda' || assessment.parameters.bentukSoal === 'benar_salah') && q.options.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {q.options.map((opt) => {
                            const isCorrect = opt.key === q.correctKey;
                            return (
                              <div
                                key={opt.key}
                                className={`p-2.5 sm:p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                                  isCorrect
                                    ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950 font-medium'
                                    : 'border-slate-200 bg-white text-slate-800'
                                } ${isArabic ? 'flex-row-reverse text-right' : ''}`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <div className={`flex-1 text-xs sm:text-sm pt-0.5 leading-relaxed ${isArabic ? 'font-arabic' : ''}`}>
                                  <span className="font-mono text-slate-400 mr-1.5">[opsi {opt.key}]</span>
                                  {opt.text}
                                </div>
                                {isCorrect && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-200/70 px-1.5 py-0.5 rounded shrink-0">
                                    Kunci
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Uniform Collapsible Key & Rubric Preview for Uraian / Isian */}
                      {(assessment.parameters.bentukSoal === 'uraian' || assessment.parameters.bentukSoal === 'isian_singkat') && (q.correctKey || q.rubrikSkor) && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedKeyNumbers((prev) =>
                                prev.includes(q.number) ? prev.filter((n) => n !== q.number) : [...prev, q.number]
                              );
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                expandedKeyNumbers.includes(q.number) ? 'rotate-180' : ''
                              }`}
                            />
                            <span>
                              {expandedKeyNumbers.includes(q.number)
                                ? 'Sembunyikan Rambu Jawaban & Rubrik'
                                : 'Lihat Rambu Jawaban & Rubrik Penilaian'}
                            </span>
                          </button>
                          {expandedKeyNumbers.includes(q.number) && (
                            <div className="mt-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-3">
                              {q.correctKey && (
                                <div>
                                  <span className="font-bold text-emerald-800 block mb-1">
                                    {assessment.parameters.bentukSoal === 'isian_singkat'
                                      ? '[Kunci Jawaban Singkat]:'
                                      : '[Kunci Jawaban / Rambu Jawaban Ideal]:'}
                                  </span>
                                  <div className="text-slate-800 leading-relaxed whitespace-pre-line pl-3 border-l-2 border-emerald-500 bg-emerald-50/50 p-2.5 rounded-r-lg font-normal">
                                    {q.correctKey}
                                  </div>
                                </div>
                              )}
                              {q.rubrikSkor && (
                                <div>
                                  <span className="font-bold text-slate-700 block mb-1">
                                    [Pedoman Rubrik Penskoran (Skor 0 - 4)]:
                                  </span>
                                  <div className="text-slate-700 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-slate-400 bg-white p-2.5 rounded-r-lg font-normal">
                                    {q.rubrikSkor}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: KUNCI JAWABAN & PEMBAHASAN */}
          {(activeTab === 'all' || activeTab === 'key') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isArabic ? 'القسم الثالث: مفتاح الإجابة والشرح التحليلي' : 'Bagian 3: Kunci Jawaban & Pembahasan Rubrik'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Penjelasan mendalam mengapa kunci jawaban tepat dan analisis miskonsepsi mengapa pengecoh kurang tepat.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(assessment.kunciDanPembahasan);
                    setCopiedType('pembahasan');
                    setTimeout(() => setCopiedType(null), 2000);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 font-medium transition-colors"
                >
                  {copiedType === 'pembahasan' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'pembahasan' ? 'Tersalin' : 'Salin Pembahasan'}</span>
                </button>
              </div>

              <div
                className={`p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap ${
                  isArabic ? 'font-arabic text-right' : ''
                }`}
              >
                {assessment.kunciDanPembahasan || 'Pembahasan rubrik penilaian belum tersedia.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Editor Modal */}
      {editingQuestion && (
        <QuestionEditorModal
          question={editingQuestion}
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={(updated) => {
            onUpdateQuestion(updated);
            setEditingQuestion(null);
          }}
          bahasa={assessment.parameters.bahasa}
        />
      )}
    </div>
  );
};
