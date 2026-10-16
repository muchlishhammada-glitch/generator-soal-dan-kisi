import React from 'react';
import { BookOpen, Sparkles, Award } from 'lucide-react';
import { PRESETS, PresetItem } from '../utils/presets';
import { AssessmentParams, BahasaType } from '../types';

interface HeaderProps {
  onSelectPreset: (preset: PresetItem) => void;
  activeLanguage: BahasaType;
  onLanguageChange: (lang: BahasaType) => void;
  currentParams: AssessmentParams;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectPreset,
  activeLanguage,
  onLanguageChange,
}) => {
  const isArabic = activeLanguage === 'arab';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top micro bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
            <Award className="w-3.5 h-3.5" /> Standar Evaluasi Pembelajaran
          </span>
          <span className="text-slate-600">|</span>
          <span className="hidden sm:inline">Taksonomi Bloom Revisi (Anderson & Krathwohl)</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden md:inline">Stimulus Problem Based Learning (PBL)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs hidden sm:inline">Output Bahasa:</span>
          <div className="inline-flex rounded-md p-0.5 bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={() => onLanguageChange('indonesia')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                activeLanguage === 'indonesia'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇮🇩 Indonesia
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('arab')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                activeLanguage === 'arab'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇸🇦 العربية
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('keduanya')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                activeLanguage === 'keduanya'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Dwibahasa
            </button>
          </div>
        </div>
      </div>

      {/* Main header banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {isArabic ? 'مولد شبكة الاختبار والأسئلة عالية التفكير (HOTS)' : 'Generator Kisi-kisi & Butir Soal HOTS'}
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  C4 - C6 HOTS
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  PG • Uraian • B-S • Isian
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                {isArabic
                  ? 'أداة احترافية لبناء شبكة مواصفات الاختبار (Kisi-kisi) والأسئلة الموضوعية والمقالية مع سند واقعي وشرح تحليلي.'
                  : 'Platform perancang instrumen penilaian berstandar nasional: Matriks Kisi-kisi Markdown, Naskah Soal berstimulus PBL (Pilihan Ganda, Uraian, Benar-Salah, Isian Singkat), dan Rubrik Miskonsepsi.'}
              </p>
            </div>
          </div>

          {/* Quick presets trigger dropdown/chips */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Contoh Preset Cepat:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESETS.slice(0, 3).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 font-medium text-slate-700 transition-all shadow-2xs"
                >
                  {preset.badge}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
