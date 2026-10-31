import { interpolate, STRINGS, type Lang } from '../i18n/strings';
import { computeHarmonics } from './harmonics';
import type { SpectrumResult, VcoModelResult, VcoPartialRow } from '../types';

const VCV_C0_HZ = 16.351598831287414;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  const cents = Math.round((midi - rounded) * 100);
  const centSuffix = cents === 0 ? '' : ` ${cents > 0 ? '+' : ''}${cents}ct`;
  return `${note}${octave}${centSuffix}`;
}

function frequencyToVOctFundamental(frequency: number): number {
  return Math.log2(frequency / VCV_C0_HZ);
}

function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  return interpolate(STRINGS[lang][key] ?? STRINGS.en[key] ?? key, vars);
}

function vcvHintForPartial(lang: Lang, index: number, relativeDb: number): string {
  if (index === 1) {
    return t(lang, 'vcoHintFund');
  }

  if (relativeDb < -36) {
    return t(lang, 'vcoHintQuiet');
  }

  if (index === 2) {
    return t(lang, 'vcoHintH2');
  }

  if (index === 3) {
    return t(lang, 'vcoHintH3');
  }

  return t(lang, 'vcoHintVca', { value: relativeDb.toFixed(0) });
}

export function buildVcoModel(spectrum: SpectrumResult, harmonicCount = 8, lang: Lang = 'en'): VcoModelResult {
  const harmonics = computeHarmonics(spectrum, harmonicCount);
  const fundamental = harmonics[0];

  if (!fundamental) {
    return {
      fundamentalHz: 0,
      fundamentalVOct: 0,
      fundamentalNote: '—',
      partials: [],
      rackNotes: [t(lang, 'vcoNoteNone')],
    };
  }

  const fundamentalMidi = frequencyToMidi(fundamental.frequency);
  const fundamentalVOct = frequencyToVOctFundamental(fundamental.frequency);

  const partials: VcoPartialRow[] = harmonics.map((harmonic) => {
    const midi = frequencyToMidi(harmonic.frequency);
    const label = harmonic.index === 1 ? 'Fund.' : `H${harmonic.index}`;

    return {
      index: harmonic.index,
      label,
      frequency: harmonic.frequency,
      midiNote: midi,
      noteName: midiToNoteName(midi),
      vOct: frequencyToVOctFundamental(harmonic.frequency),
      relativeDb: harmonic.relativeDb,
      normalizedLevel: harmonic.normalizedLevel,
      vcvHint: vcvHintForPartial(lang, harmonic.index, harmonic.relativeDb),
    };
  });

  const strongPartials = partials.filter((p) => p.relativeDb > -24);

  const rackNotes = [
    t(lang, 'vcoNoteFund', {
      hz: fundamental.frequency.toFixed(1),
      v: fundamentalVOct.toFixed(3),
    }),
    t(lang, 'vcoNoteNote', { note: midiToNoteName(fundamentalMidi) }),
    t(lang, 'vcoNoteApprox'),
    t(lang, 'vcoNotePartials', {
      count: strongPartials.length,
      list: strongPartials.map((p) => p.label).join(', ') || '—',
    }),
    t(lang, 'vcoNoteDetune'),
  ];

  return {
    fundamentalHz: fundamental.frequency,
    fundamentalVOct,
    fundamentalNote: midiToNoteName(fundamentalMidi),
    partials,
    rackNotes,
  };
}

export function exportVcoModelCsv(model: VcoModelResult): string {
  const header = 'Partial,Frequency_Hz,MIDI,Note,V_Oct,Relative_dB,Level_0_1,VCV_hint';
  const rows = model.partials.map((row) => [
    row.label,
    row.frequency.toFixed(2),
    row.midiNote.toFixed(2),
    `"${row.noteName}"`,
    row.vOct.toFixed(4),
    row.relativeDb.toFixed(2),
    row.normalizedLevel.toFixed(4),
    `"${row.vcvHint}"`,
  ].join(','));

  return [header, ...rows].join('\n');
}
