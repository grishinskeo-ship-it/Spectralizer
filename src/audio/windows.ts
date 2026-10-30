import type { WindowType } from '../types';

export function applyWindow(
  samples: Float32Array,
  type: WindowType,
  output?: Float32Array,
): Float32Array {
  const n = samples.length;
  const windowed = output ?? new Float32Array(n);

  for (let i = 0; i < n; i += 1) {
    let w = 1;

    switch (type) {
      case 'hanning':
        w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1 || 1)));
        break;
      case 'hamming':
        w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1 || 1));
        break;
      case 'blackman':
        w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1 || 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (n - 1 || 1));
        break;
      case 'rectangular':
      default:
        w = 1;
        break;
    }

    windowed[i] = samples[i] * w;
  }

  return windowed;
}

export function windowLabel(type: WindowType): string {
  switch (type) {
    case 'hanning':
      return 'Hanning';
    case 'hamming':
      return 'Hamming';
    case 'blackman':
      return 'Blackman';
    default:
      return 'Rectangular';
  }
}
