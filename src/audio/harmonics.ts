import type { HarmonicInfo, SpectrumResult } from '../types';

function findNearestBin(spectrum: SpectrumResult, frequency: number): number {
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

export function computeHarmonics(
  spectrum: SpectrumResult,
  count: number,
): HarmonicInfo[] {
  const fundamental = spectrum.peakFrequency;
  if (fundamental <= 0) {
    return [];
  }

  const fundamentalBin = findNearestBin(spectrum, fundamental);
  const fundamentalMag = Math.max(spectrum.magnitudes[fundamentalBin], 1e-10);
  const nyquist = spectrum.sampleRate / 2;
  const harmonics: HarmonicInfo[] = [];

  for (let n = 1; n <= count; n += 1) {
    const frequency = fundamental * n;
    if (frequency > nyquist) {
      break;
    }

    const bin = findNearestBin(spectrum, frequency);
    const magnitude = spectrum.magnitudes[bin];
    const relativeDb = 20 * Math.log10(Math.max(magnitude, 1e-10) / fundamentalMag);

    harmonics.push({
      index: n,
      frequency,
      magnitude,
      relativeDb,
      normalizedLevel: Math.min(1, Math.max(0, magnitude / fundamentalMag)),
    });
  }

  return harmonics;
}
