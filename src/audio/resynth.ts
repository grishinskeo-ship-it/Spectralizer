import FFT from 'fft.js';

export interface ResynthPlan {
  frameTimes: number[];
  hopSamples: number;
  outputSamples: number;
  outputDurationSec: number;
}

export interface ResynthFramePreview {
  index: number;
  centerTime: number;
  offsetSamples: number;
  samples: Float32Array;
}

export interface ResynthPreview {
  plan: ResynthPlan;
  frames: ResynthFramePreview[];
  combined: Float32Array;
}

export function computeResynthPlan(
  startTime: number,
  frameCount: number,
  hopRatio: number,
  fftSize: number,
  sampleRate: number,
  audioDuration: number,
): ResynthPlan {
  const hopSamples = Math.max(1, Math.round(fftSize * hopRatio));
  const frameTimes: number[] = [];

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = startTime + (frame * hopSamples) / sampleRate;
    if (time > audioDuration) {
      break;
    }
    frameTimes.push(time);
  }

  const outputSamples = frameTimes.length > 0
    ? fftSize + (frameTimes.length - 1) * hopSamples
    : 0;

  return {
    frameTimes,
    hopSamples,
    outputSamples,
    outputDurationSec: outputSamples / sampleRate,
  };
}

export function formatResynthTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

function createComplexBuffer(fft: FFT): Float64Array {
  return Float64Array.from(fft.createComplexArray());
}

function normalizePeak(samples: Float32Array, target = 0.92): void {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }

  if (peak > 0) {
    const gain = target / peak;
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] *= gain;
    }
  }
}

export function resynthesizeFrame(complexSpectrum: Float64Array, fftSize: number): Float32Array {
  const fft = new FFT(fftSize);
  const spectrum = Float64Array.from(complexSpectrum);
  fft.completeSpectrum(spectrum);

  const frequencyDomain = createComplexBuffer(fft);
  const timeDomain = createComplexBuffer(fft);
  frequencyDomain.set(spectrum);
  fft.inverseTransform(timeDomain, frequencyDomain);

  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i += 1) {
    samples[i] = timeDomain[i * 2];
  }

  normalizePeak(samples);
  return samples;
}

export function resynthesizeSequence(
  getComplexSpectrum: (time: number) => Float64Array,
  startTime: number,
  frameCount: number,
  hopRatio: number,
  fftSize: number,
  sampleRate: number,
  duration: number,
): Float32Array {
  const plan = computeResynthPlan(startTime, frameCount, hopRatio, fftSize, sampleRate, duration);
  const { frameTimes } = plan;

  if (frameTimes.length === 0) {
    return new Float32Array(0);
  }

  if (frameTimes.length === 1) {
    return resynthesizeFrame(getComplexSpectrum(frameTimes[0]), fftSize);
  }

  const output = new Float32Array(plan.outputSamples);

  for (let frame = 0; frame < frameTimes.length; frame += 1) {
    const frameSamples = resynthesizeFrame(getComplexSpectrum(frameTimes[frame]), fftSize);
    const offset = frame * plan.hopSamples;
    for (let i = 0; i < fftSize; i += 1) {
      output[offset + i] += frameSamples[i];
    }
  }

  normalizePeak(output);
  return output;
}

export function buildResynthPreview(
  getComplexSpectrum: (time: number) => Float64Array,
  startTime: number,
  frameCount: number,
  hopRatio: number,
  fftSize: number,
  sampleRate: number,
  duration: number,
): ResynthPreview | null {
  const plan = computeResynthPlan(startTime, frameCount, hopRatio, fftSize, sampleRate, duration);

  if (plan.frameTimes.length === 0) {
    return null;
  }

  const frames: ResynthFramePreview[] = plan.frameTimes.map((centerTime, index) => ({
    index,
    centerTime,
    offsetSamples: index * plan.hopSamples,
    samples: resynthesizeFrame(getComplexSpectrum(centerTime), fftSize),
  }));

  if (frames.length === 1) {
    return {
      plan,
      frames,
      combined: Float32Array.from(frames[0].samples),
    };
  }

  const combined = new Float32Array(plan.outputSamples);

  for (const frame of frames) {
    for (let i = 0; i < fftSize; i += 1) {
      combined[frame.offsetSamples + i] += frame.samples[i];
    }
  }

  normalizePeak(combined);

  return { plan, frames, combined };
}

export function estimateResynthDuration(
  frameCount: number,
  hopRatio: number,
  fftSize: number,
  sampleRate: number,
  startTime: number,
  audioDuration: number,
): { frames: number; seconds: number } {
  const plan = computeResynthPlan(startTime, frameCount, hopRatio, fftSize, sampleRate, audioDuration);
  return { frames: plan.frameTimes.length, seconds: plan.outputDurationSec };
}

export async function playResynthBuffer(
  samples: Float32Array,
  sampleRate: number,
  context: AudioContext,
  onSource?: (source: AudioBufferSourceNode) => void,
): Promise<void> {
  if (samples.length === 0) {
    return;
  }

  const buffer = context.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(new Float32Array(samples), 0);

  await new Promise<void>((resolve, reject) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => resolve();
    onSource?.(source);

    try {
      source.start(0);
    } catch (error) {
      reject(error);
    }
  });
}
