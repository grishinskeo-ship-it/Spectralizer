export interface SampleZoom {
  min: number;
  max: number;
}

export function getSampleBounds(totalSamples: number, zoom: SampleZoom | null): SampleZoom {
  if (!zoom || totalSamples <= 0) {
    return { min: 0, max: totalSamples };
  }

  return {
    min: Math.max(0, Math.min(zoom.min, totalSamples)),
    max: Math.min(totalSamples, Math.max(zoom.max, zoom.min + 1)),
  };
}

export function sampleToX(sample: number, bounds: SampleZoom, width: number): number {
  const span = bounds.max - bounds.min;
  if (span <= 0) {
    return 0;
  }
  return ((sample - bounds.min) / span) * width;
}

export function xToSample(x: number, bounds: SampleZoom, width: number): number {
  const ratio = Math.min(1, Math.max(0, x / width));
  const span = bounds.max - bounds.min;
  return bounds.min + ratio * span;
}

export function adjustSampleZoom(
  zoom: SampleZoom | null,
  totalSamples: number,
  factor: number,
): SampleZoom {
  if (totalSamples <= 1) {
    return { min: 0, max: totalSamples };
  }

  if (!zoom) {
    const span = Math.max(totalSamples * 0.4, 8);
    const center = totalSamples * 0.35;
    return {
      min: Math.max(0, center - span / 2),
      max: Math.min(totalSamples, center + span / 2),
    };
  }

  const center = (zoom.min + zoom.max) / 2;
  const halfWidth = Math.max(((zoom.max - zoom.min) / 2) * factor, totalSamples * 0.005);

  return {
    min: Math.max(0, center - halfWidth),
    max: Math.min(totalSamples, center + halfWidth),
  };
}

export function zoomSampleAtCursor(
  zoom: SampleZoom | null,
  totalSamples: number,
  cursorSample: number,
  factor: number,
): SampleZoom {
  const next = adjustSampleZoom(zoom, totalSamples, factor);
  const clampedCursor = Math.min(totalSamples, Math.max(0, cursorSample));
  const offset = clampedCursor - (next.min + next.max) / 2;

  return {
    min: Math.max(0, next.min + offset),
    max: Math.min(totalSamples, next.max + offset),
  };
}

export function formatSampleRange(min: number, max: number, sampleRate: number): string {
  const startMs = (min / sampleRate) * 1000;
  const endMs = (max / sampleRate) * 1000;
  return `${startMs.toFixed(1)}–${endMs.toFixed(1)} ms`;
}

export function getSampleTicks(bounds: SampleZoom, count = 5): number[] {
  const span = bounds.max - bounds.min;
  if (span <= 0) {
    return [bounds.min];
  }

  const step = span / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(bounds.min + step * index));
}
