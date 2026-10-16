import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award, Lightbulb, ArrowRight, ArrowLeft, FileText, Check } from 'lucide-react';
import { ParsedQuestion, AssessmentParams } from '../types';

interface TestSimulationProps {
  questions: ParsedQuestion[];
  params: AssessmentParams;
  pembahasan: string;
}

export const TestSimulation: React.FC<TestSimulationProps> = ({ questions, params, pembahasan }) => {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const isArabic = params.bahasa === 'arab';
  const bentukSoal = params.bentukSoal || 'pilihan_ganda';

  const handleSelectOption = (qNum: number, optKey: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [qNum]: optKey,
    }));
  };

  const handleTextAnswerChange = (qNum: number, text: string) => {
    if (isSubmitted) return;
    setTextAnswers((prev) => ({
      ...prev,
      [qNum]: text,
    }));
  };

  const handleReset = () => {
    setUserAnswers({});
    setTextAnswers({});
    setIsSubmitted(false);
    setActiveQuestionIndex(0);
  };

  const currentQ = questions[activeQuestionIndex];

  // Calculate score for objective questions
  const isObjective = bentukSoal === 'pilihan_ganda' || bentukSoal === 'benar_salah';
  const correctCount = questions.reduce((acc, q) => {
    if (isObjective) {
      return acc + (userAnswers[q.number] === q.correctKey ? 1 : 0);
    }
    // For text answers, count as attempted if filled
    return acc + (textAnswers[q.number]?.trim() ? 1 : 0);
  }, 0);

  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Belum ada butir soal yang dimuat untuk simulasi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Status & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {isArabic ? 'محاكاة اختبار الطالب (Simulasi Kuis)' : `Simulasi Ujian Siswa (${params.bentukSoal.replace('_', ' ').toUpperCase()})`}
          </span>
          <h3 className="text-base font-bold text-slate-800 mt-1">
            {params.mataPelajaran} - {params.topikMateri}
          </h3>
          <p className="text-xs text-slate-500">
            {isSubmitted
              ? isObjective
                ? `Ujian selesai! Skor: ${score}/100 (${correctCount} dari ${questions.length} benar)`
                : `Simulasi selesai! ${correctCount} dari ${questions.length} soal telah dijawab. Periksa rubrik di bawah.`
              : `Jawab butir soal untuk menguji validitas instrumen.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSubmitted ? (
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Ulangi Simulasi
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSubmitted(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" /> Selesai & Periksa Jawaban
            </button>
          )}
        </div>
      </div>

      {/* Question Stepper / Navigator */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {questions.map((q, idx) => {
          const hasAnswer = isObjective ? !!userAnswers[q.number] : !!textAnswers[q.number]?.trim();
          const isCorrect = isSubmitted && isObjective && userAnswers[q.number] === q.correctKey;
          const isWrong = isSubmitted && isObjective && hasAnswer && !isCorrect;
          const isActive = idx === activeQuestionIndex;

          let badgeClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
          if (isActive) badgeClass = 'ring-2 ring-emerald-600 ring-offset-2';
          if (isSubmitted && isObjective) {
            if (isCorrect) badgeClass += ' bg-emerald-600 text-white';
            else if (isWrong) badgeClass += ' bg-red-600 text-white';
            else badgeClass += ' bg-amber-500 text-white';
          } else if (hasAnswer) {
            badgeClass += ' bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold';
          }

          return (
            <button
              key={q.number}
              type="button"
              onClick={() => setActiveQuestionIndex(idx)}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-all cursor-pointer ${badgeClass}`}
            >
              {q.number}
            </button>
          );
        })}
      </div>

      {/* Active Question Display Card */}
      {currentQ && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isArabic ? `السؤال رقم ${currentQ.number}` : `Soal Nomor ${currentQ.number} dari ${questions.length}`}
            </span>
            {isSubmitted && isObjective && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  userAnswers[currentQ.number] === currentQ.correctKey
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {userAnswers[currentQ.number] === currentQ.correctKey ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Jawaban Tepat
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-600" /> Kunci: {currentQ.correctKey}
                  </>
                )}
              </span>
            )}
          </div>

          {/* Stimulus */}
          {currentQ.stimulus && (
            <div
              className={`p-4 rounded-xl bg-slate-50 border-l-4 border-emerald-500 text-slate-700 text-sm leading-relaxed ${
                isArabic ? 'font-arabic text-right border-l-0 border-r-4' : ''
              }`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                {isArabic ? 'السند / النص المثير (Stimulus PBL):' : 'Stimulus Soal (Konteks Masalah):'}
              </span>
              <div className="whitespace-pre-line">{currentQ.stimulus}</div>
            </div>
          )}

          {/* Stem */}
          <div className={`text-slate-900 font-semibold text-base leading-relaxed ${isArabic ? 'font-arabic text-right' : ''}`}>
            {currentQ.stem}
          </div>

          {/* Options for Pilihan Ganda / Benar-Salah */}
          {currentQ.options.length > 0 ? (
            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((opt) => {
                const isUserChoice = userAnswers[currentQ.number] === opt.key;
                const isTheKey = currentQ.correctKey === opt.key;

                let optCardStyle = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50';
                let badgeColor = 'bg-slate-100 text-slate-700';

                if (isUserChoice) {
                  optCardStyle = 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600';
                  badgeColor = 'bg-emerald-600 text-white';
                }

                if (isSubmitted) {
                  if (isTheKey) {
                    optCardStyle = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500';
                    badgeColor = 'bg-emerald-600 text-white';
                  } else if (isUserChoice && !isTheKey) {
                    optCardStyle = 'border-red-400 bg-red-50 ring-1 ring-red-400';
                    badgeColor = 'bg-red-600 text-white';
                  }
                }

                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleSelectOption(currentQ.number, opt.key)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${optCardStyle} ${
                      isArabic ? 'flex-row-reverse text-right' : ''
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-all ${badgeColor}`}
                    >
                      {opt.key}
                    </span>
                    <div
                      className={`flex-1 text-sm text-slate-800 font-normal leading-relaxed pt-0.5 ${
                        isArabic ? 'font-arabic' : ''
                      }`}
                    >
                      {opt.text}
                    </div>
                    {isSubmitted && isTheKey && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                        Kunci
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Input for Uraian or Isian Singkat */
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {bentukSoal === 'uraian' ? 'Jawaban Uraian Anda:' : 'Jawaban Isian Singkat Anda:'}
              </label>
              {bentukSoal === 'uraian' ? (
                <textarea
                  rows={4}
                  disabled={isSubmitted}
                  value={textAnswers[currentQ.number] || ''}
                  onChange={(e) => handleTextAnswerChange(currentQ.number, e.target.value)}
                  placeholder="Tuliskan analisis atau jawaban uraian Anda di sini..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                />
              ) : (
                <input
                  type="text"
                  disabled={isSubmitted}
                  value={textAnswers[currentQ.number] || ''}
                  onChange={(e) => handleTextAnswerChange(currentQ.number, e.target.value)}
                  placeholder="Ketikkan jawaban singkat di sini..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                />
              )}
            </div>
          )}

          {/* Detailed explanation & Rubrik penskoran if submitted */}
          {isSubmitted && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>Kunci Jawaban & Panduan Penskoran:</span>
              </div>
              {currentQ.correctKey && (
                <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                  Kunci: <span className="text-emerald-700 font-bold">{currentQ.correctKey}</span>
                </p>
              )}
              {currentQ.rubrikSkor && (
                <div className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                  <span className="font-bold block text-slate-900 mb-1">Rubrik Penskoran:</span>
                  <div className="whitespace-pre-line">{currentQ.rubrikSkor}</div>
                </div>
              )}
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <span className="text-xs text-slate-400">
              {activeQuestionIndex + 1} dari {questions.length}
            </span>
            <button
              type="button"
              disabled={activeQuestionIndex === questions.length - 1}
              onClick={() => setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              Selanjutnya <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
