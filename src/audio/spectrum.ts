import FFT from 'fft.js';
import { resynthesizeFrame, resynthesizeSequence, buildResynthPreview } from './resynth';
import type { AnalysisSettings, ChannelMode, SpectrumResult } from '../types';
import { getChannelData } from './loadAudio';
import { applyWindow } from './windows';

function extractFrame(
  data: Float32Array,
  centerSample: number,
  frame: Float32Array,
): void {
  const fftSize = frame.length;
  const half = Math.floor(fftSize / 2);

  for (let i = 0; i < fftSize; i += 1) {
    const sourceIndex = centerSample - half + i;
    frame[i] = sourceIndex >= 0 && sourceIndex < data.length ? data[sourceIndex] : 0;
  }
}

function smoothMagnitudesInPlace(magnitudes: Float32Array, scratch: Float32Array, amount: number): void {
  if (amount <= 0) {
    return;
  }

  const radius = Math.max(1, Math.round(amount));
  scratch.set(magnitudes);

  for (let i = 0; i < magnitudes.length; i += 1) {
    let sum = 0;
    let count = 0;

    for (let j = i - radius; j <= i + radius; j += 1) {
      if (j >= 0 && j < scratch.length) {
        sum += scratch[j];
        count += 1;
      }
    }

    magnitudes[i] = sum / count;
  }
}

export class SpectrumAnalyzer {
  private buffer: AudioBuffer;

  private channel: ChannelMode;

  private fftSize: number;

  private channelData: Float32Array;

  private sampleRate: number;

  private fft: FFT;

  private output: Float64Array;

  private fftInput: Float64Array;

  private frame: Float32Array;

  private windowed: Float32Array;

  private smoothScratch: Float32Array;

  private frequencies: Float32Array;

  private magnitudes: Float32Array;

  private phases: Float32Array;

  private complexSpectrum: Float64Array;

  private settings: AnalysisSettings;

  constructor(buffer: AudioBuffer, settings: AnalysisSettings) {
    this.buffer = buffer;
    this.settings = settings;
    this.channel = settings.channel;
    this.fftSize = settings.fftSize;
    this.channelData = getChannelData(buffer, settings.channel);
    this.sampleRate = buffer.sampleRate;
    this.fft = new FFT(settings.fftSize);
    this.output = Float64Array.from(this.fft.createComplexArray());
    this.fftInput = new Float64Array(settings.fftSize);
    this.frame = new Float32Array(settings.fftSize);
    this.windowed = new Float32Array(settings.fftSize);
    this.smoothScratch = new Float32Array(settings.fftSize / 2);
    this.frequencies = new Float32Array(settings.fftSize / 2);
    this.magnitudes = new Float32Array(settings.fftSize / 2);
    this.phases = new Float32Array(settings.fftSize / 2);
    this.complexSpectrum = new Float64Array(settings.fftSize * 2);

    for (let i = 0; i < this.frequencies.length; i += 1) {
      this.frequencies[i] = (i * this.sampleRate) / settings.fftSize;
    }
  }

  updateSettings(settings: AnalysisSettings): void {
    this.settings = settings;

    if (settings.channel !== this.channel || settings.fftSize !== this.fftSize) {
      this.channel = settings.channel;
      this.fftSize = settings.fftSize;
      this.channelData = getChannelData(this.buffer, settings.channel);
      this.fft = new FFT(settings.fftSize);
      this.output = Float64Array.from(this.fft.createComplexArray());
      this.fftInput = new Float64Array(settings.fftSize);
      this.frame = new Float32Array(settings.fftSize);
      this.windowed = new Float32Array(settings.fftSize);
      this.smoothScratch = new Float32Array(settings.fftSize / 2);
      this.frequencies = new Float32Array(settings.fftSize / 2);
      this.magnitudes = new Float32Array(settings.fftSize / 2);
      this.phases = new Float32Array(settings.fftSize / 2);
      this.complexSpectrum = new Float64Array(settings.fftSize * 2);

      for (let i = 0; i < this.frequencies.length; i += 1) {
        this.frequencies[i] = (i * this.sampleRate) / settings.fftSize;
      }
    }
  }

  analyze(time: number): SpectrumResult {
    const { settings } = this;
    const centerSample = Math.min(
      Math.max(Math.round(time * this.sampleRate), 0),
      this.channelData.length - 1,
    );

    extractFrame(this.channelData, centerSample, this.frame);
    applyWindow(this.frame, settings.windowType, this.windowed);

    for (let i = 0; i < this.windowed.length; i += 1) {
      this.fftInput[i] = this.windowed[i];
    }

    this.fft.realTransform(this.output, this.fftInput);

    const binCount = this.magnitudes.length;
    let peakFrequency = 0;
    let peakMagnitude = 0;

    for (let i = 0; i < binCount; i += 1) {
      const real = this.output[i * 2];
      const imag = this.output[i * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag) / settings.fftSize;
      this.magnitudes[i] = magnitude;
      this.phases[i] = Math.atan2(imag, real);

      if (i >= 1 && magnitude > peakMagnitude) {
        peakMagnitude = magnitude;
        peakFrequency = this.frequencies[i];
      }
    }

    this.complexSpectrum.set(this.output);

    smoothMagnitudesInPlace(this.magnitudes, this.smoothScratch, settings.smoothing);

    return {
      frequencies: this.frequencies,
      magnitudes: this.magnitudes,
      phases: this.phases,
      peakFrequency,
      peakMagnitude,
      sampleRate: this.sampleRate,
      time,
    };
  }

  resynthesize(): Float32Array {
    return resynthesizeFrame(this.complexSpectrum, this.fftSize);
  }

  resynthesizeFrames(startTime: number, frameCount: number, hopRatio: number): Float32Array {
    const duration = this.channelData.length / this.sampleRate;

    return resynthesizeSequence(
      (time) => {
        this.analyze(time);
        return this.complexSpectrum;
      },
      startTime,
      frameCount,
      hopRatio,
      this.fftSize,
      this.sampleRate,
      duration,
    );
  }

  buildResynthPreview(startTime: number, frameCount: number, hopRatio: number) {
    const duration = this.channelData.length / this.sampleRate;

    return buildResynthPreview(
      (time) => {
        this.analyze(time);
        return this.complexSpectrum;
      },
      startTime,
      frameCount,
      hopRatio,
      this.fftSize,
      this.sampleRate,
      duration,
    );
  }
}

export function analyzeSpectrum(
  buffer: AudioBuffer,
  time: number,
  settings: AnalysisSettings,
): SpectrumResult {
  const analyzer = new SpectrumAnalyzer(buffer, settings);
  return analyzer.analyze(time);
}

export function computeWaveformPeaks(
  buffer: AudioBuffer,
  channel: 'mono' | 'left' | 'right',
  targetPoints: number,
): Float32Array {
  const data = getChannelData(buffer, channel);
  const blockSize = Math.max(1, Math.floor(data.length / targetPoints));
  const peaks = new Float32Array(targetPoints);

  for (let i = 0; i < targetPoints; i += 1) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, data.length);
    let peak = 0;

    for (let j = start; j < end; j += 1) {
      peak = Math.max(peak, Math.abs(data[j]));
    }

    peaks[i] = peak;
  }

  return peaks;
}
