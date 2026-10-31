export type WindowType = 'rectangular' | 'hanning' | 'hamming' | 'blackman';

export type ChannelMode = 'mono' | 'left' | 'right';

export type FrequencyScale = 'linear' | 'log';

export type MagnitudeScale = 'linear' | 'db';

export type AppTab = 'analysis' | 'vco' | 'phase' | 'resynth';

export interface LoopRegion {
  start: number;
  end: number;
}

export interface AnalysisSettings {
  fftSize: number;
  windowType: WindowType;
  channel: ChannelMode;
  frequencyScale: FrequencyScale;
  magnitudeScale: MagnitudeScale;
  dbMin: number;
  dbMax: number;
  showGrid: boolean;
  showPeaks: boolean;
  showHarmonics: boolean;
  harmonicCount: number;
  smoothing: number;
  playbackFps: number;
  loopEnabled: boolean;
  resynthFrameCount: number;
  resynthHopRatio: number;
}

export interface SpectrumResult {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  phases: Float32Array;
  peakFrequency: number;
  peakMagnitude: number;
  sampleRate: number;
  time: number;
}

export interface HarmonicInfo {
  index: number;
  frequency: number;
  magnitude: number;
  relativeDb: number;
  normalizedLevel: number;
}

export interface VcoPartialRow {
  index: number;
  label: string;
  frequency: number;
  midiNote: number;
  noteName: string;
  vOct: number;
  relativeDb: number;
  normalizedLevel: number;
  vcvHint: string;
}

export interface VcoModelResult {
  fundamentalHz: number;
  fundamentalVOct: number;
  fundamentalNote: string;
  partials: VcoPartialRow[];
  rackNotes: string[];
}

export interface LoadedAudio {
  buffer: AudioBuffer;
  fileName: string;
  duration: number;
  sampleRate: number;
}

export interface RecentFileEntry {
  id: string;
  name: string;
  type: string;
  size: number;
  openedAt: number;
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
  fftSize: 2048,
  windowType: 'hanning',
  channel: 'mono',
  frequencyScale: 'log',
  magnitudeScale: 'db',
  dbMin: -80,
  dbMax: 0,
  showGrid: true,
  showPeaks: true,
  showHarmonics: false,
  harmonicCount: 8,
  smoothing: 0,
  playbackFps: 30,
  loopEnabled: false,
  resynthFrameCount: 1,
  resynthHopRatio: 0.5,
};

export const PLAYBACK_FPS_OPTIONS = [10, 15, 24, 30, 45, 60] as const;
export const HARMONIC_COUNT_OPTIONS = [4, 6, 8, 12, 16] as const;
export const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192] as const;

export const RESYNTH_FRAME_COUNT_OPTIONS = [1, 2, 4, 8, 16, 32] as const;
export const RESYNTH_HOP_RATIO_OPTIONS = [0.25, 0.5, 1] as const;

export const AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.flac,.ogg,.oga,.opus,.m4a,.aac';
