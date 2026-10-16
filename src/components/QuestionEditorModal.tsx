import React, { useState } from 'react';
import { X, Sparkles, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { ParsedQuestion, ParsedOption, BahasaType } from '../types';

interface QuestionEditorModalProps {
  question: ParsedQuestion;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuestion: ParsedQuestion) => void;
  bahasa: BahasaType;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave,
  bahasa,
}) => {
  const [stimulus, setStimulus] = useState(question.stimulus || '');
  const [stem, setStem] = useState(question.stem);
  const [options, setOptions] = useState<ParsedOption[]>([...question.options]);
  const [correctKey, setCorrectKey] = useState(question.correctKey);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isArabic = bahasa === 'arab';

  const handleOptionChange = (index: number, newText: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], text: newText };
    setOptions(updated);
  };

  const handleSave = () => {
    // Reconstruct rawBlock
    const parts = [`[soal no ${question.number}]`];
    if (stimulus.trim()) {
      parts.push(stimulus.trim());
    }
    parts.push(stem.trim());
    for (const opt of options) {
      parts.push(`[opsi ${opt.key}] ${opt.text}`);
    }
    if (correctKey) {
      parts.push(`[KUNCI: ${correctKey}]`);
    }

    onSave({
      ...question,
      stimulus: stimulus.trim(),
      stem: stem.trim(),
      options,
      correctKey,
      rawBlock: parts.join('\n'),
    });
    onClose();
  };

  const handleAiRefine = async () => {
    if (!aiInstruction.trim()) return;
    setIsRefining(true);
    setAiError(null);

    try {
      const currentBlock = [
        `[soal no ${question.number}]`,
        stimulus ? stimulus : '',
        stem,
        ...options.map((o) => `[opsi ${o.key}] ${o.text}`),
        `[KUNCI: ${correctKey}]`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await fetch('/api/refine-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: currentBlock,
          instruction: aiInstruction,
          bahasa,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses perbaikan');
      }

      // Try to parse the revised text
      const revised = data.revisedText;
      // Extract parts
      const keyMatch = revised.match(/\[KUNCI:?\s*([A-Ea-e])\]/i);
      if (keyMatch) {
        setCorrectKey(keyMatch[1].toUpperCase());
      }

      const optMatches = [...revised.matchAll(/\[opsi\s*([A-Ea-e])\]([\s\S]*?)(?=(?:\[opsi\s*[A-Ea-e]\])|(?:\[KUNCI:?\s*[A-Ea-e]\])|$)/gi)];
      if (optMatches.length > 0) {
        setOptions(
          optMatches.map((m: any) => ({
            key: m[1].toUpperCase(),
            text: m[2].trim(),
          }))
        );
      }

      const firstOpt = revised.search(/\[opsi\s*[A-Ea-e]\]/i);
      if (firstOpt !== -1) {
        const promptPart = revised.substring(0, firstOpt).replace(/\[soal no\s*\d+\]/i, '').trim();
        const paras = promptPart.split(/\n\s*\n/).filter((p: string) => p.trim());
        if (paras.length >= 2) {
          setStimulus(paras.slice(0, -1).join('\n\n').trim());
          setStem(paras[paras.length - 1].trim());
        } else {
          setStem(promptPart);
        }
      }

      setAiInstruction('');
    } catch (err: any) {
      setAiError(err.message || 'Gagal merevisi butir soal');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Edit & Perbaiki Butir Soal Nomor {question.number}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                Kunci: {correctKey}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Sesuaikan teks stimulus, pokok soal (stem), pilihan opsi, atau kunci jawaban.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* AI Quick Assistant box */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Instruksi Revisi Cepat dengan AI (Asisten Ahli Evaluasi)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                placeholder="Contoh: 'Buat stimulus lebih ringkas', 'Ubah pengecoh C agar menguji miskonsepsi rumus'..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiRefine();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAiRefine}
                disabled={isRefining || !aiInstruction.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {isRefining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Revisi
              </button>
            </div>

            {/* Quick action chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Saran Cepat:</span>
              {[
                'Samakan panjang semua opsi jawaban',
                'Perkuat daya pengecoh agar tidak mudah ditebak',
                'Buat struktur gramatikal semua opsi homogen',
                'Tingkatkan keterkaitan dengan materi sumber',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAiInstruction(chip)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {aiError && (
              <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {aiError}
              </p>
            )}
          </div>

          {/* Stimulus Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Stimulus / Narasi Kasus PBL</span>
              <span className="text-[11px] text-slate-400 font-normal">Wajib untuk C4 - C6</span>
            </label>
            <textarea
              rows={3}
              value={stimulus}
              onChange={(e) => setStimulus(e.target.value)}
              placeholder="Tuliskan stimulus fenomena/kasus di sini..."
              className={`w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                isArabic ? 'font-arabic text-right' : ''
              }`}
            />
          </div>

          {/* Stem / Pokok Soal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Stem (Pokok Soal / Pertanyaan) *
            </label>
            <textarea
              rows={2}
              required
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              placeholder="Tuliskan pokok soal di sini..."
              className={`w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium ${
                isArabic ? 'font-arabic text-right' : ''
              }`}
            />
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pilihan Jawaban (Homogen & Setara)
            </label>
            {options.map((opt, index) => {
              const isSelectedKey = correctKey === opt.key;
              return (
                <div
                  key={opt.key}
                  className={`flex items-start gap-2 p-2 rounded-xl border transition-all ${
                    isSelectedKey ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCorrectKey(opt.key)}
                    className={`mt-1 w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-all ${
                      isSelectedKey
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Klik untuk jadikan kunci jawaban"
                  >
                    {opt.key}
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Isi opsi ${opt.key}...`}
                      className={`w-full px-2.5 py-1 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isArabic ? 'font-arabic text-right' : ''
                      }`}
                    />
                  </div>
                  {isSelectedKey && (
                    <span className="text-[11px] font-semibold text-emerald-700 self-center px-1.5 py-0.5 rounded bg-emerald-100">
                      Kunci
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};
