declare module 'fft.js' {
  export default class FFT {
    constructor(size: number);
    createComplexArray(): Float64Array | number[];
    realTransform(output: Float64Array | number[], input: Float64Array | number[]): void;
    completeSpectrum(spectrum: Float64Array | number[]): void;
    inverseTransform(output: Float64Array | number[], input: Float64Array | number[]): void;
  }
}
