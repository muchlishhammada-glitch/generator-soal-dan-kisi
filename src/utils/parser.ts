import { AssessmentParams, AssessmentResult, KisiKisiRow, ParsedQuestion, ParsedOption } from '../types';

export function parseAssessmentOutput(rawText: string, params: AssessmentParams): AssessmentResult {
  // 1. First, parse all questions from the entire raw output text
  let questions = parseQuestions(rawText, params.bentukSoal);

  // 2. Identify and separate the 3 major sections
  const parts = splitSections(rawText, questions);
  let kisiKisiMarkdown = parts.part1;
  let naskahSoalRaw = parts.part2;
  let kunciDanPembahasan = parts.part3;

  // 3. Fallback extraction for Kisi-kisi Table if missed in part1
  if (!kisiKisiMarkdown || !kisiKisiMarkdown.includes('|')) {
    const tableMatch = rawText.match(/\|[\s\S]*?\|[\r\n]+[-|\s:]+[\r\n]+(\|[\s\S]*?\|[\r\n]+)+/);
    if (tableMatch) {
      kisiKisiMarkdown = tableMatch[0].trim();
    }
  }

  // 4. If questions were somehow not found in rawText, try searching with fallback patterns
  if (questions.length === 0) {
    questions = parseQuestions(naskahSoalRaw, params.bentukSoal);
  }

  // 5. Clean kunciDanPembahasan: remove any leaked [soal no X] blocks that were mistakenly placed inside Bagian 3
  if (kunciDanPembahasan) {
    kunciDanPembahasan = kunciDanPembahasan
      .replace(/\[soal no\s*\d+\][\s\S]*?(?=(?:(?:\n#{1,4}\s*)|(?:\n\n(?:\*{1,2})?(?:Nomor|Butir|Soal|Kunci|Rubrik|السؤال)\s*\d+)|$))/gi, '')
      .trim();
  }

  // 6. Cross-reference: If questions don't have keys or rubrics, check if they exist in kunciDanPembahasan
  for (const q of questions) {
    if (params.bentukSoal === 'uraian' || params.bentukSoal === 'isian_singkat') {
      q.options = [];
    }

    if (!q.correctKey || !q.rubrikSkor || (params.bentukSoal === 'uraian' && q.correctKey.length < 5)) {
      const qNumPattern = new RegExp(
        `(?:^|\\n)[ \\t]*(?:#{1,4}[ \\t]*)?(?:\\*{1,2})?(?:Nomor|Butir(?: Soal)?|Soal|السؤال)?\\s*${q.number}[.:\\s-][\\s\\S]*?(?=(?:(?:^|\\n)[ \\t]*(?:#{1,4}[ \\t]*)?(?:\\*{1,2})?(?:Nomor|Butir(?: Soal)?|Soal|السؤال)?\\s*${q.number + 1}[.:\\s-])|$)`,
        'i'
      );
      const match = kunciDanPembahasan.match(qNumPattern);
      if (match) {
        const block = match[0];
        if (!q.correctKey || (params.bentukSoal === 'uraian' && q.correctKey.length < 5)) {
          const kMatch = block.match(/(?:Kunci Jawaban|Rambu-rambu Jawaban|Rambu Jawaban|Jawaban Ideal|مفتاح الإجابة)\s*:\s*([\s\S]*?)(?=(?:Rubrik|Pedoman Penskoran|معايير|$|\n\n(?:####|###)))/i);
          if (kMatch && kMatch[1].trim()) q.correctKey = kMatch[1].trim();
        }
        if (!q.rubrikSkor || q.rubrikSkor.length < 10) {
          const rMatch = block.match(/(?:Rubrik Penskoran|Pedoman Penskoran|Rubrik Penilaian|معايير التقييم|سلم التنقيط)\s*:\s*([\s\S]*?)(?=(?:$|\n\n(?:####|###)))/i);
          if (rMatch && rMatch[1].trim()) q.rubrikSkor = rMatch[1].trim();
        }
      }
    }
  }

  // 7. Check if kunciDanPembahasan is incomplete (e.g. only contains question 1, or was cut off)
  // If so, synthesize a complete, well-ordered Bagian 3 containing all questions from 1 to N
  const isArabic = params.bahasa === 'arab';
  const hasEveryQuestion = questions.length > 0 && questions.every((q) => {
    const reg = new RegExp(`(?:Nomor|Butir|Soal|السؤال)?\\s*${q.number}\\b`, 'i');
    return reg.test(kunciDanPembahasan);
  });

  if ((!hasEveryQuestion || !kunciDanPembahasan || kunciDanPembahasan.length < 50) && questions.length > 0) {
    const heading = isArabic
      ? '### القسم الثالث: مفتاح الإجابة والتحليل وسلم التنقيط (Rubrik Penilaian)'
      : '### Bagian 3: Kunci Jawaban dan Pembahasan Rubrik Penilaian';

    const items = questions.map((q) => {
      const qHeading = isArabic ? `#### السؤال رقم ${q.number}` : `#### Butir Soal Nomor ${q.number}`;
      const parts: string[] = [qHeading];

      if (q.correctKey) {
        parts.push(isArabic ? `**مفتاح الإجابة / الإجابة النموذجية:**\n${q.correctKey}` : `**Kunci Jawaban / Rambu Jawaban Ideal:**\n${q.correctKey}`);
      }
      if (q.rubrikSkor) {
        parts.push(isArabic ? `**معايير سلم التنقيط (Rubrik Penskoran 0 - 4):**\n${q.rubrikSkor}` : `**Pedoman Rubrik Penskoran (Skor 0-4):**\n${q.rubrikSkor}`);
      }

      return parts.join('\n\n');
    });

    kunciDanPembahasan = `${heading}\n\n${items.join('\n\n---\n\n')}`;
  }

  // 8. Always format naskahSoalRaw strictly and cleanly with all parsed questions
  if (questions.length > 0) {
    naskahSoalRaw = formatQuestionTemplateOnly(questions, params.bentukSoal);
  }

  const kisiKisiRows = parseMarkdownTable(kisiKisiMarkdown);

  return {
    rawOutput: rawText,
    kisiKisiMarkdown,
    kisiKisiRows,
    naskahSoalRaw,
    questions,
    kunciDanPembahasan,
    parameters: params,
  };
}

/**
 * Splits document into 3 parts:
 * Part 1: Kisi-kisi Table
 * Part 2: Naskah Soal (contains ALL questions 1 to N)
 * Part 3: Kunci Jawaban & Rubrik Penskoran
 *
 * Prevents premature Bagian 3 headings from cutting off question items.
 */
function splitSections(text: string, parsedQuestions: ParsedQuestion[]): { part1: string; part2: string; part3: string } {
  const s2HeadingRegex = /(?:^|\n)[ \t]*(?:#{1,4}[ \t]*)?(?:Bagian\s*2\b|القسم الثاني|الجزء الثاني)[^\n]*/i;
  const s2Match = s2HeadingRegex.exec(text);

  // Find where questions start
  const firstQMatch = /(?:^|\n)\[soal no\s*1\]/i.exec(text);
  const startOfBagian2 = s2Match ? s2Match.index : firstQMatch ? firstQMatch.index : -1;

  // Find all [soal no X] matches to locate the LAST question
  const allQMatches = [...text.matchAll(/\[soal no\s*(\d+)\]/gi)];
  let lastQIndex = -1;
  if (allQMatches.length > 0) {
    const lastM = allQMatches[allQMatches.length - 1];
    lastQIndex = lastM.index || -1;
  }

  // Find all Bagian 3 headings
  const allS3Matches = [...text.matchAll(/(?:^|\n)[ \t]*(?:#{1,4}[ \t]*)?(?:Bagian\s*3\b|القسم الثالث|الجزء الثالث)[^\n]*/gi)];

  // The TRUE Bagian 3 heading MUST occur AFTER the last question!
  let trueS3Match: RegExpMatchArray | null = null;
  if (allS3Matches.length > 0) {
    // Pick the heading that is AFTER the last question
    for (let i = allS3Matches.length - 1; i >= 0; i--) {
      const m = allS3Matches[i];
      if (lastQIndex === -1 || (m.index !== undefined && m.index > lastQIndex)) {
        trueS3Match = m;
        break;
      }
    }
    // If all Bagian 3 headings were placed before the last question, pick the last one
    if (!trueS3Match && allS3Matches.length > 0) {
      trueS3Match = allS3Matches[allS3Matches.length - 1];
    }
  }

  let part1 = '';
  let part2 = '';
  let part3 = '';

  if (startOfBagian2 !== -1) {
    part1 = text.substring(0, startOfBagian2).trim();

    if (trueS3Match && trueS3Match.index !== undefined && trueS3Match.index > startOfBagian2) {
      const s2HeaderLen = s2Match && s2Match.index === startOfBagian2 ? s2Match[0].length : 0;
      part2 = text.substring(startOfBagian2 + s2HeaderLen, trueS3Match.index).trim();
      part3 = text.substring(trueS3Match.index + trueS3Match[0].length).trim();
    } else {
      const s2HeaderLen = s2Match && s2Match.index === startOfBagian2 ? s2Match[0].length : 0;
      part2 = text.substring(startOfBagian2 + s2HeaderLen).trim();
    }
  } else {
    // No explicit Bagian 2 found
    if (trueS3Match && trueS3Match.index !== undefined) {
      part2 = text.substring(0, trueS3Match.index).trim();
      part3 = text.substring(trueS3Match.index + trueS3Match[0].length).trim();
    } else {
      part1 = text;
    }
  }

  return { part1, part2, part3 };
}

export function parseMarkdownTable(markdown: string): KisiKisiRow[] {
  const rows: KisiKisiRow[] = [];
  if (!markdown) return rows;

  const lines = markdown.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return rows;

  for (let i = 2; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine.startsWith('|')) continue;
    if (/^\|[-|\s:]+\|$/.test(rawLine)) continue;

    const cells = rawLine
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (cells.length >= 7) {
      rows.push({
        no: cells[0] || `${i - 1}`,
        tp: cells[1] || '',
        materi: cells[2] || '',
        indikator: cells[3] || '',
        levelKognitif: cells[4] || '',
        tingkatKesulitan: cells[5] || '',
        nomorSoal: cells[6] || `${i - 1}`,
      });
    } else if (cells.length >= 5) {
      rows.push({
        no: cells[0] || `${i - 1}`,
        tp: cells[1] || '',
        materi: cells[2] || '',
        indikator: cells[3] || '',
        levelKognitif: cells[4] || 'C4',
        tingkatKesulitan: cells[5] || 'Sedang',
        nomorSoal: cells[6] || cells[0] || `${i - 1}`,
      });
    }
  }

  return rows;
}

export function parseQuestions(text: string, bentukSoal?: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  if (!text) return questions;

  // Find all start indices of [soal no X]
  const qMarkerRegex = /\[soal no\s*(\d+)\]/gi;
  const markers: { number: number; index: number; length: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = qMarkerRegex.exec(text)) !== null) {
    markers.push({
      number: parseInt(m[1], 10),
      index: m.index,
      length: m[0].length,
    });
  }

  if (markers.length === 0) {
    return questions;
  }

  for (let i = 0; i < markers.length; i++) {
    const current = markers[i];
    let nextIndex = text.length;

    if (i + 1 < markers.length) {
      nextIndex = markers[i + 1].index;
    } else {
      // For the LAST question (e.g. Nomor 5), its chunk MUST terminate strictly where Bagian 3, Kunci Jawaban, or Rubrik Penskoran begins!
      const afterMarker = text.substring(current.index + current.length);
      const b3Match = afterMarker.match(
        /(?:^|\n)[ \t]*(?:#{1,4}[ \t]*)?(?:Bagian\s*3\b|القسم الثالث|الجزء الثالث|Kunci Jawaban dan Pembahasan|Kunci & Pembahasan|KUNCI JAWABAN|Pedoman Penskoran|Rubrik Penskoran|Rubrik Penilaian|معايير التقييم|سلم التنقيط|#### Butir Soal Nomor 1|#### Nomor 1)/i
      );
      if (b3Match && b3Match.index !== undefined) {
        nextIndex = current.index + current.length + b3Match.index;
      }
    }

    // Body is text between this marker and next marker
    let rawChunk = text.substring(current.index, nextIndex).trim();
    let body = text.substring(current.index + current.length, nextIndex).trim();

    // Cut off ANY accidental Bagian 3 heading, rubrik, or kunci in question body for all questions
    const b3CutIdx = body.search(
      /(?:^|\n)[ \t]*(?:#{1,4}[ \t]*)?(?:Bagian\s*3\b|القسم الثالث|الجزء الثالث|Kunci Jawaban dan Pembahasan|KUNCI JAWABAN|Pedoman Penskoran|Rubrik Penskoran|Rubrik Penilaian|معايير التقييم|سلم التنقيط|#### Butir Soal)/i
    );
    if (b3CutIdx !== -1) {
      body = body.substring(0, b3CutIdx).trim();
      rawChunk = rawChunk.substring(0, current.length + b3CutIdx).trim();
    }

    // 1. Extract Options [opsi A]
    const optionMatches = [...body.matchAll(/\[opsi\s*([A-Ea-e])\]([\s\S]*?)(?=(?:\[opsi\s*[A-Ea-e]\])|(?:\[KUNCI:?)|(?:\[RUBRIK)|(?:Kunci Jawaban:)|(?:Rubrik:)|$)/gi)];
    const options: ParsedOption[] = optionMatches.map((opt) => ({
      key: opt[1].toUpperCase(),
      text: opt[2].trim(),
    }));

    // 2. Extract Key [KUNCI: ...] or unbracketed "Kunci Jawaban:"
    let correctKey = '';
    const bracketedKeyMatch = body.match(/\[KUNCI:?\s*([\s\S]*?)\](?=(?:\[RUBRIK|\[PEDOMAN|$|\n\n))/i);
    if (bracketedKeyMatch) {
      correctKey = bracketedKeyMatch[1].trim();
    } else {
      const textKeyMatch = body.match(/(?:(?:^|\n)[ \t]*(?:Kunci Jawaban|Rambu-rambu Jawaban|Rambu Jawaban|Jawaban Ideal|مفتاح الإجابة)\s*:\s*)([\s\S]*?)(?=(?:\[RUBRIK|Rubrik|Pedoman Penskoran|معايير|$|\n\n(?:[1-9]\.|####|###)))/i);
      if (textKeyMatch) {
        correctKey = textKeyMatch[1].trim();
      }
    }

    // 3. Extract Rubrik Penskoran [RUBRIK PENSKORAN: ...] or unbracketed "Rubrik Penskoran:"
    let rubrikSkor = '';
    const bracketedRubrikMatch = body.match(/\[(?:RUBRIK|PEDOMAN PENSKORAN|RUBRIK PENILAIAN):?\s*([\s\S]*?)\]/i);
    if (bracketedRubrikMatch) {
      rubrikSkor = bracketedRubrikMatch[1].trim();
    } else {
      const textRubrikMatch = body.match(/(?:(?:^|\n)[ \t]*(?:Rubrik Penskoran|Pedoman Penskoran|Rubrik Penilaian|معايير التقييم|سلم التنقيط)\s*:\s*)([\s\S]*?)(?=(?:$|\n\n(?:[1-9]\.|####|###)))/i);
      if (textRubrikMatch) {
        rubrikSkor = textRubrikMatch[1].trim();
      }
    }

    // 4. Extract Stimulus & Stem (Question Prompt)
    let promptPart = body;

    // Strip out option tags from the question prompt
    const firstOptionIdx = promptPart.search(/\[opsi\s*[A-Ea-e]\]/i);
    if (firstOptionIdx !== -1) {
      promptPart = promptPart.substring(0, firstOptionIdx).trim();
    }

    // Strip out [KUNCI: ...] and [RUBRIK: ...] tags from prompt
    const tagIdx = promptPart.search(/\[(?:KUNCI:|RUBRIK:|PEDOMAN)/i);
    if (tagIdx !== -1) {
      promptPart = promptPart.substring(0, tagIdx).trim();
    }

    // Strip out unbracketed "Kunci Jawaban:" or "Rubrik Penskoran:" from prompt
    const unbracketedTagIdx = promptPart.search(/(?:^|\n)[ \t]*(?:Kunci Jawaban|Rambu-rambu Jawaban|Rambu Jawaban|Jawaban Ideal|Rubrik Penskoran|Pedoman Penskoran|Rubrik Penilaian)\s*:/i);
    if (unbracketedTagIdx !== -1) {
      promptPart = promptPart.substring(0, unbracketedTagIdx).trim();
    }

    // Strip out any trailing markdown headings (####, ###) from promptPart
    promptPart = promptPart.replace(/(?:^|\n)[ \t]*#{1,4}[^\n]*/gi, '').trim();

    // Normalize markdown bold wrappers on Stimulus / Pertanyaan headings
    promptPart = promptPart
      .replace(/\*\*(?:Stimulus|Wacana|Kasus|Skenario|Deskripsi|Teks|Bacaan|السند|النص المثير)\s*:\*\*/gi, 'Stimulus:')
      .replace(/\*\*(?:Pertanyaan|Pokok Soal|Soal|Rumusan|Instruksi|Tugas|السؤال)\s*:\*\*/gi, 'Pertanyaan:');

    let stimulus = '';
    let stem = promptPart;

    // Check for explicit stimulus markers (Stimulus:, Wacana:, Kasus:, etc.)
    const stimulusMarker = promptPart.match(/(?:Stimulus|Wacana|Kasus|Skenario|Deskripsi|Teks|Bacaan|السند|النص المثير)\s*:\s*([\s\S]*?)(?=(?:Pertanyaan|Pokok Soal|Soal|Rumusan|Instruksi|Tugas|السؤال)\s*:|$)/i);
    const questionMarker = promptPart.match(/(?:Pertanyaan|Pokok Soal|Soal|Rumusan|Instruksi|Tugas|السؤال)\s*:\s*([\s\S]*)$/i);

    if (stimulusMarker) {
      stimulus = stimulusMarker[1].trim();
      if (questionMarker) {
        stem = questionMarker[1].trim();
      } else {
        stem = promptPart.replace(stimulusMarker[0], '').trim();
      }
    } else if (questionMarker) {
      stimulus = promptPart.substring(0, questionMarker.index).trim();
      stem = questionMarker[1].trim();
    } else {
      // If no explicit markers, split by paragraphs
      const paragraphs = promptPart.split(/\n\s*\n/).filter((p) => p.trim());
      if (paragraphs.length >= 2) {
        stimulus = paragraphs.slice(0, -1).join('\n\n').trim();
        stem = paragraphs[paragraphs.length - 1].trim();
      } else {
        // Check if there are lines where the last line(s) begin with a directive verb or question word
        const lines = promptPart.split('\n').filter((l) => l.trim());
        if (lines.length >= 2) {
          const lastLine = lines[lines.length - 1].trim();
          const isDirective = /^(?:Jelaskan|Bagaimana|Analisis|Evaluasi|Rancanglah|Tentukan|Berdasarkan|Apakah|Mengapa|Uraikan|Sebutkan|Bandingkan|اشرح|كيف|حلل|قيم|ماذا)\b/i.test(lastLine);
          if (isDirective) {
            stimulus = lines.slice(0, -1).join('\n').trim();
            stem = lastLine;
          }
        }
      }
    }

    // Clean any heading artifacts and strip markdown bold wrapping around the entire text
    stem = stem.replace(/(?:^|\n)[ \t]*#{1,4}[^\n]*/gi, '').trim();
    stimulus = stimulus.replace(/(?:^|\n)[ \t]*#{1,4}[^\n]*/gi, '').trim();

    // Unwrap accidental full markdown bolding: **Teks Soal** -> Teks Soal
    if (stem.startsWith('**') && stem.endsWith('**') && stem.length > 4) {
      stem = stem.slice(2, -2).trim();
    }
    if (stimulus.startsWith('**') && stimulus.endsWith('**') && stimulus.length > 4) {
      stimulus = stimulus.slice(2, -2).trim();
    }

    // If shape is uraian or isian, ensure options are strictly empty
    const isUraianOrIsian = bentukSoal === 'uraian' || bentukSoal === 'isian_singkat';

    questions.push({
      number: current.number || questions.length + 1,
      bentukSoal: (bentukSoal as any) || (options.length > 0 ? 'pilihan_ganda' : 'uraian'),
      stimulus,
      stem,
      options: isUraianOrIsian ? [] : options,
      correctKey,
      rubrikSkor,
      rawBlock: rawChunk,
    });
  }

  // Sort and deduplicate by question number
  questions.sort((a, b) => a.number - b.number);
  const uniqueQuestions: ParsedQuestion[] = [];
  const seenNumbers = new Set<number>();
  for (const q of questions) {
    if (!seenNumbers.has(q.number)) {
      seenNumbers.add(q.number);
      uniqueQuestions.push(q);
    }
  }

  return uniqueQuestions;
}

export function formatFullMarkdown(assessment: AssessmentResult): string {
  const isArabic = assessment.parameters.bahasa === 'arab';
  const isBilingual = assessment.parameters.bahasa === 'keduanya';

  const bentukLabel = {
    pilihan_ganda: 'Pilihan Ganda',
    uraian: 'Uraian / Esai',
    benar_salah: 'Benar - Salah',
    isian_singkat: 'Isian Singkat',
  }[assessment.parameters.bentukSoal] || 'Pilihan Ganda';

  const title = isArabic
    ? `# خطة الاختبار والأسئلة عالية التفكير (HOTS)\n**المادة الدراسية:** ${assessment.parameters.mataPelajaran} | **المرحلة/الصف:** ${assessment.parameters.kelasFase} | **الموضوع:** ${assessment.parameters.topikMateri} | **نوع الأسئلة:** ${bentukLabel}`
    : isBilingual
    ? `# INSTRUMEN EVALUASI PEMBELAJARAN (KISI-KISI & SOAL HOTS BILINGUAL)\n**Mata Pelajaran / المادة:** ${assessment.parameters.mataPelajaran} | **Kelas / الصف:** ${assessment.parameters.kelasFase} | **Materi / الموضوع:** ${assessment.parameters.topikMateri} | **Bentuk / النوع:** ${bentukLabel}`
    : `# INSTRUMEN EVALUASI PEMBELAJARAN (KISI-KISI & SOAL HOTS)\n**Mata Pelajaran:** ${assessment.parameters.mataPelajaran} | **Kelas/Fase:** ${assessment.parameters.kelasFase} | **Materi:** ${assessment.parameters.topikMateri} | **Bentuk Soal:** ${bentukLabel}`;

  const sec1Title = isArabic ? `## القسم الأول: شبكة مواصفات الاختبار (Kisi-kisi Soal)` : `## Bagian 1: Tabel Matriks Kisi-kisi Soal`;
  const sec2Title = isArabic ? `## القسم الثاني: نصوص الأسئلة (Naskah Soal)` : `## Bagian 2: Naskah Soal (${bentukLabel})`;
  const sec3Title = isArabic ? `## القسم الثالث: مفتاح الإجابة والشرح التحليلي (Kunci & Pembahasan)` : `## Bagian 3: Kunci Jawaban dan Pembahasan Rubrik Penilaian`;

  let naskah = assessment.naskahSoalRaw;
  if (!naskah && assessment.questions.length > 0) {
    naskah = formatQuestionTemplateOnly(assessment.questions, assessment.parameters.bentukSoal);
  }

  return `${title}\n\n${sec1Title}\n\n${assessment.kisiKisiMarkdown}\n\n${sec2Title}\n\n${naskah}\n\n${sec3Title}\n\n${assessment.kunciDanPembahasan}`;
}

export function formatQuestionTemplateOnly(questions: ParsedQuestion[], bentukSoal?: string): string {
  return questions
    .map((q) => {
      const parts = [`[soal no ${q.number}]`];
      if (q.stimulus) {
        parts.push(q.stimulus);
      }
      parts.push(q.stem);
      for (const opt of q.options) {
        parts.push(`[opsi ${opt.key}] ${opt.text}`);
      }
      // Only append [KUNCI: ...] in question template if it's multiple choice or true/false
      if (q.options.length > 0 && q.correctKey) {
        parts.push(`[KUNCI: ${q.correctKey}]`);
      }
      return parts.join('\n');
    })
    .join('\n\n');
}

export function downloadAsWordDoc(assessment: AssessmentResult): void {
  const isArabic = assessment.parameters.bahasa === 'arab';
  const dir = isArabic ? 'rtl' : 'ltr';
  const font = isArabic ? 'Amiri, Arial, sans-serif' : 'Calibri, Arial, sans-serif';

  let tableHtml = '';
  if (assessment.kisiKisiRows.length > 0) {
    tableHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; font-family: ${font}; font-size: 11pt; margin-bottom: 24px; text-align: ${isArabic ? 'right' : 'left'};">
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">No</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1;">${isArabic ? 'نواتج التعلم (TP)' : 'Tujuan Pembelajaran (TP)'}</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1;">${isArabic ? 'المادة الدراسية' : 'Materi'}</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1;">${isArabic ? 'مؤشر السؤال' : 'Indikator Soal'}</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${isArabic ? 'المستوى' : 'Level'}</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${isArabic ? 'الصعوبة' : 'Kesulitan'}</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${isArabic ? 'رقم السؤال' : 'No Soal'}</th>
        </tr>
        ${assessment.kisiKisiRows
          .map(
            (r) => `
          <tr>
            <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${r.no}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.tp}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.materi}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.indikator}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${r.levelKognitif}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${r.tingkatKesulitan}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${r.nomorSoal}</td>
          </tr>`
          )
          .join('')}
      </table>
    `;
  }

  let questionsHtml = '';
  if (assessment.questions.length > 0) {
    questionsHtml = assessment.questions
      .map(
        (q) => `
      <div style="margin-bottom: 20px; font-family: ${font}; font-size: 11pt; text-align: ${isArabic ? 'right' : 'left'};">
        <p style="font-weight: bold; margin-bottom: 4px; color: #1e293b;">[soal no ${q.number}]</p>
        ${
          q.stimulus
            ? `<div style="background-color: #f8fafc; padding: 10px; border-left: 4px solid #0284c7; margin-bottom: 8px; font-style: italic;">${q.stimulus.replace(/\n/g, '<br/>')}</div>`
            : ''
        }
        <p style="margin-bottom: 8px;">${q.stem.replace(/\n/g, '<br/>')}</p>
        ${
          q.options.length > 0
            ? `<div style="padding-left: ${isArabic ? '0' : '16px'}; padding-right: ${isArabic ? '16px' : '0'};">
                ${q.options.map((opt) => `<p style="margin: 3px 0;"><b>[opsi ${opt.key}]</b> ${opt.text}</p>`).join('')}
              </div>`
            : ''
        }
        ${q.options.length > 0 && q.correctKey ? `<p style="font-weight: bold; color: #166534; margin-top: 6px;">[KUNCI: ${q.correctKey}]</p>` : ''}
      </div>
    `
      )
      .join('<hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 16px 0;" />');
  } else {
    questionsHtml = `<pre style="font-family: ${font}; font-size: 11pt; white-space: pre-wrap;">${assessment.naskahSoalRaw}</pre>`;
  }

  const pembahasanHtml = `
    <div style="font-family: ${font}; font-size: 11pt; white-space: pre-wrap; line-height: 1.6; text-align: ${isArabic ? 'right' : 'left'};">
      ${assessment.kunciDanPembahasan.replace(/\n/g, '<br/>')}
    </div>
  `;

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${assessment.parameters.mataPelajaran} - Kisi-kisi & Soal HOTS</title>
      <style>
        body { font-family: ${font}; margin: 2cm; direction: ${dir}; }
        h1 { color: #0f172a; font-size: 16pt; text-align: center; margin-bottom: 4px; }
        h2 { color: #1e3a8a; font-size: 13pt; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; margin-top: 24px; }
        .meta { text-align: center; color: #475569; font-size: 10pt; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>${isArabic ? 'خطة الاختبار وبنك الأسئلة عالية التفكير (HOTS)' : 'INSTRUMEN PENILAIAN & KISI-KISI SOAL HOTS'}</h1>
      <div class="meta">
        <b>${isArabic ? 'المادة:' : 'Mata Pelajaran:'}</b> ${assessment.parameters.mataPelajaran} &nbsp;|&nbsp;
        <b>${isArabic ? 'الصف/المرحلة:' : 'Kelas/Fase:'}</b> ${assessment.parameters.kelasFase} &nbsp;|&nbsp;
        <b>${isArabic ? 'الموضوع:' : 'Topik/Materi:'}</b> ${assessment.parameters.topikMateri} &nbsp;|&nbsp;
        <b>${isArabic ? 'السياق:' : 'Konteks:'}</b> ${assessment.parameters.konteksPembelajaran}
      </div>

      <h2>${isArabic ? 'القسم الأول: شبكة مواصفات الاختبار (Kisi-kisi)' : 'Bagian 1: Tabel Matriks Kisi-kisi Soal'}</h2>
      ${tableHtml}

      <h2>${isArabic ? 'القسم الثاني: نصوص الأسئلة (Naskah Soal)' : 'Bagian 2: Naskah Soal'}</h2>
      ${questionsHtml}

      <h2>${isArabic ? 'القسم الثالث: مفتاح الإجابة والشرح التحليلي (Kunci & Pembahasan)' : 'Bagian 3: Kunci Jawaban dan Pembahasan Rubrik Penilaian'}</h2>
      ${pembahasanHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kisi-kisi_dan_Soal_HOTS_${assessment.parameters.mataPelajaran.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboardFormatted(htmlContent: string, plainText: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]);
      return true;
    } else {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (e) {
    console.error('Clipboard copy failed, fallback to writeText', e);
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}
