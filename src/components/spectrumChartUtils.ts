import type { AnalysisSettings, FrequencyScale, SpectrumResult } from '../types';

export const PLOT_PADDING = { top: 24, right: 16, bottom: 36, left: 52 };
export const LOG_MIN_FREQ = 20;

export interface FrequencyZoom {
  min: number;
  max: number;
}

export interface PlotHover {
  frequency: number;
  magnitude: number;
  plotX: number;
  plotY: number;
}

export function getFrequencyBounds(spectrum: SpectrumResult, zoom: FrequencyZoom | null): FrequencyZoom {
  const nyquist = spectrum.sampleRate / 2;
  if (!zoom) {
    return { min: 0, max: nyquist };
  }
  return {
    min: Math.max(0, zoom.min),
    max: Math.min(nyquist, zoom.max),
  };
}

export function frequencyToX(
  freq: number,
  bounds: FrequencyZoom,
  plotWidth: number,
  scale: FrequencyScale,
): number {
  const { min, max } = bounds;

  if (scale === 'log') {
    const logMin = Math.log10(Math.max(min, LOG_MIN_FREQ));
    const logMax = Math.log10(Math.max(max, LOG_MIN_FREQ + 1));
    const logFreq = Math.log10(Math.max(freq, LOG_MIN_FREQ));
    return ((logFreq - logMin) / (logMax - logMin)) * plotWidth;
  }

  return ((freq - min) / (max - min || 1)) * plotWidth;
}

export function xToFrequency(
  x: number,
  bounds: FrequencyZoom,
  plotWidth: number,
  scale: FrequencyScale,
): number {
  const ratio = Math.min(1, Math.max(0, x / plotWidth));
  const { min, max } = bounds;

  if (scale === 'log') {
    const logMin = Math.log10(Math.max(min, LOG_MIN_FREQ));
    const logMax = Math.log10(Math.max(max, LOG_MIN_FREQ + 1));
    const logFreq = logMin + ratio * (logMax - logMin);
    return 10 ** logFreq;
  }

  return min + ratio * (max - min);
}

export function magnitudeToDisplay(magnitude: number, settings: AnalysisSettings): number {
  if (settings.magnitudeScale === 'db') {
    const db = 20 * Math.log10(Math.max(magnitude, 1e-10));
    return (db - settings.dbMin) / (settings.dbMax - settings.dbMin);
  }

  return magnitude;
}

export function magnitudeToLabel(magnitude: number, settings: AnalysisSettings): string {
  if (settings.magnitudeScale === 'db') {
    const db = 20 * Math.log10(Math.max(magnitude, 1e-10));
    return `${db.toFixed(1)} dB`;
  }

  return `${(magnitude * 100).toFixed(2)}%`;
}

export function frequencyToLabel(freq: number): string {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(2)} kHz`;
  }

  return `${freq.toFixed(1)} Hz`;
}

export function findNearestBin(spectrum: SpectrumResult, frequency: number): number {
  const { frequencies } = spectrum;
  if (frequencies.length === 0) {
    return 0;
  }

  let low = 0;
  let high = frequencies.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (frequencies[mid] < frequency) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  if (low > 0) {
    const diffLow = Math.abs(frequencies[low - 1] - frequency);
    const diffHigh = Math.abs(frequencies[low] - frequency);
    return diffLow < diffHigh ? low - 1 : low;
  }

  return low;
}

export function getFrequencyTicks(bounds: FrequencyZoom, scale: FrequencyScale, nyquist: number): number[] {
  const { min, max } = bounds;

  if (scale === 'log') {
    const candidates = [20, 30, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    return candidates.filter((f) => f >= Math.max(min, LOG_MIN_FREQ) && f <= max && f <= nyquist);
  }

  const step = (max - min) / 4;
  return [min, min + step, min + step * 2, min + step * 3, max].map((v) => Math.round(v));
}

export function getPlotPoint(
  spectrum: SpectrumResult,
  settings: AnalysisSettings,
  bounds: FrequencyZoom,
  plotWidth: number,
  plotHeight: number,
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
): PlotHover | null {
  const plotLeft = PLOT_PADDING.left;
  const plotTop = PLOT_PADDING.top;

  const localX = clientX - canvasRect.left - plotLeft;
  const localY = clientY - canvasRect.top - plotTop;

  if (localX < 0 || localX > plotWidth || localY < 0 || localY > plotHeight) {
    return null;
  }

  const frequency = xToFrequency(localX, bounds, plotWidth, settings.frequencyScale);
  const bin = findNearestBin(spectrum, frequency);
  const binFreq = spectrum.frequencies[bin];
  const magnitude = spectrum.magnitudes[bin];

  if (settings.frequencyScale === 'log' && binFreq < LOG_MIN_FREQ) {
    return null;
  }

  const plotX = frequencyToX(binFreq, bounds, plotWidth, settings.frequencyScale);
  const normalized = Math.min(1, Math.max(0, magnitudeToDisplay(magnitude, settings)));
  const plotY = plotHeight - normalized * plotHeight;

  return { frequency: binFreq, magnitude, plotX, plotY };
}

export function adjustFrequencyZoom(
  zoom: FrequencyZoom | null,
  nyquist: number,
  factor: number,
): FrequencyZoom {
  if (!zoom) {
    const span = nyquist * 0.4;
    const center = Math.min(nyquist * 0.35, nyquist - span / 2);
    return {
      min: Math.max(0, center - span / 2),
      max: Math.min(nyquist, center + span / 2),
    };
  }

  const center = (zoom.min + zoom.max) / 2;
  const halfWidth = Math.max(((zoom.max - zoom.min) / 2) * factor, nyquist * 0.01);

  return {
    min: Math.max(0, center - halfWidth),
    max: Math.min(nyquist, center + halfWidth),
  };
}
