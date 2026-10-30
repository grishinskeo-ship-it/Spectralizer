import type { LoadedAudio } from '../types';

import { isSupportedAudioFile } from './formats';

export async function loadAudioFile(file: File): Promise<LoadedAudio> {
  if (!isSupportedAudioFile(file)) {
    throw new Error('Unsupported format');
  }
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  await audioContext.close();

  return {
    buffer,
    fileName: file.name,
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
  };
}

export function getChannelData(buffer: AudioBuffer, channel: 'mono' | 'left' | 'right'): Float32Array {
  if (buffer.numberOfChannels === 1 || channel === 'mono') {
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0);
    }

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const mono = new Float32Array(left.length);

    for (let i = 0; i < left.length; i += 1) {
      mono[i] = (left[i] + right[i]) / 2;
    }

    return mono;
  }

  const index = channel === 'left' ? 0 : 1;
  return buffer.getChannelData(Math.min(index, buffer.numberOfChannels - 1));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
}
