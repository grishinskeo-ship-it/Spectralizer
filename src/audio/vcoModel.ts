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

function vcvHintForPartial(index: number, relativeDb: number): string {
  if (index === 1) {
    return 'Fundamental → V/Oct input (Fundamental, VCO)';
  }

  if (relativeDb < -36) {
    return 'Слишком тихо — пропустить';
  }

  if (index === 2) {
    return '2-я гармоника → detune ×2 или 2-й VCO';
  }

  if (index === 3) {
    return '3-я гармоника → wavetable / FM ratio 3:1';
  }

  return `Смешать через VCA (~${relativeDb.toFixed(0)} dB)`;
}

export function buildVcoModel(spectrum: SpectrumResult, harmonicCount = 8): VcoModelResult {
  const harmonics = computeHarmonics(spectrum, harmonicCount);
  const fundamental = harmonics[0];

  if (!fundamental) {
    return {
      fundamentalHz: 0,
      fundamentalVOct: 0,
      fundamentalNote: '—',
      partials: [],
      rackNotes: ['Не удалось определить тон.'],
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
      vcvHint: vcvHintForPartial(harmonic.index, harmonic.relativeDb),
    };
  });

  const strongPartials = partials.filter((p) => p.relativeDb > -24);

  const rackNotes = [
    `Fundamental ${fundamental.frequency.toFixed(1)} Hz → ${fundamentalVOct.toFixed(3)} V (VCV Fundamental, 0 V = C0).`,
    `Нота: ${midiToNoteName(fundamentalMidi)}.`,
    'Для приближения тембра используйте несколько VCO/VCA или модули с additive/FM синтезом.',
    `Заметные partials (${strongPartials.length}): ${strongPartials.map((p) => p.label).join(', ') || '—'}.`,
    'Detune второго осциллятора: +1200 ct (октава) или +1902 ct (×3) для нечётных гармоник.',
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
