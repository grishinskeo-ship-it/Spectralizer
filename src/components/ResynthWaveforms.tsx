import { useEffect, useRef, useState } from 'react';
import { formatResynthTime, type ResynthPreview } from '../audio/resynth';
import { formatTime } from '../audio/loadAudio';
import {
  formatSampleRange,
  getSampleBounds,
  getSampleTicks,
  sampleToX,
  xToSample,
  zoomSampleAtCursor,
  type SampleZoom,
} from './resynthChartUtils';

interface ResynthWaveformsProps {
  preview: ResynthPreview | null;
  sampleRate: number;
  zoom: SampleZoom | null;
  onZoomChange: (zoom: SampleZoom | null) => void;
}

interface ZoomBrush {
  startX: number;
  endX: number;
}

const FRAME_COLORS = [
  '#58a6ff',
  '#3fb950',
  '#ffa657',
  '#bc8cff',
  '#f778ba',
  '#79c0ff',
  '#56d364',
  '#ff9bce',
];

function computePeaks(samples: Float32Array, targetPoints: number): Float32Array {
  const blockSize = Math.max(1, Math.floor(samples.length / targetPoints));
  const peaks = new Float32Array(targetPoints);

  for (let i = 0; i < targetPoints; i += 1) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, samples.length);
    let peak = 0;

    for (let j = start; j < end; j += 1) {
      peak = Math.max(peak, Math.abs(samples[j]));
    }

    peaks[i] = peak;
  }

  return peaks;
}

function visibleOverlayPeak(preview: ResynthPreview, bounds: SampleZoom): number {
  let maxPeak = 0;

  for (const frame of preview.frames) {
    const frameStart = frame.offsetSamples;
    const frameEnd = frame.offsetSamples + frame.samples.length;
    if (frameEnd < bounds.min || frameStart > bounds.max) {
      continue;
    }

    const peaks = computePeaks(frame.samples, Math.min(frame.samples.length, 256));
    const blockSize = Math.max(1, Math.floor(frame.samples.length / peaks.length));

    for (let i = 0; i < peaks.length; i += 1) {
      const globalSample = frameStart + i * blockSize;
      if (globalSample >= bounds.min && globalSample <= bounds.max) {
        maxPeak = Math.max(maxPeak, peaks[i]);
      }
    }
  }

  return maxPeak;
}

function drawTimelineWave(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  offsetSamples: number,
  bounds: SampleZoom,
  width: number,
  height: number,
  color: string,
  fillAlpha: number,
  ampScale: number,
): void {
  if (samples.length === 0 || ampScale <= 0) {
    return;
  }

  const targetPoints = Math.max(32, Math.floor(width));
  const peaks = computePeaks(samples, targetPoints);
  const blockSize = Math.max(1, Math.floor(samples.length / peaks.length));
  const midY = height / 2;

  const topPath: { x: number; y: number }[] = [];
  const bottomPath: { x: number; y: number }[] = [];

  for (let i = 0; i < peaks.length; i += 1) {
    const globalSample = offsetSamples + i * blockSize;
    if (globalSample < bounds.min || globalSample > bounds.max) {
      continue;
    }

    const x = sampleToX(globalSample, bounds, width);
    topPath.push({ x, y: midY - peaks[i] * ampScale });
    bottomPath.push({ x, y: midY + peaks[i] * ampScale });
  }

  if (topPath.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(topPath[0].x, midY);
  for (const point of topPath) {
    ctx.lineTo(point.x, point.y);
  }
  for (let i = bottomPath.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(bottomPath[i].x, bottomPath[i].y);
  }
  ctx.closePath();

  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;
  } else {
    ctx.fillStyle = color;
  }
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(topPath[0].x, topPath[0].y);
  for (let i = 1; i < topPath.length; i += 1) {
    ctx.lineTo(topPath[i].x, topPath[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.stroke();
}

function drawCombinedWave(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  bounds: SampleZoom,
  width: number,
  height: number,
): void {
  const start = Math.max(0, Math.floor(bounds.min));
  const end = Math.min(samples.length, Math.ceil(bounds.max));
  const slice = samples.subarray(start, end);
  const targetPoints = Math.max(64, Math.floor(width));
  const peaks = computePeaks(slice, targetPoints);
  const blockSize = Math.max(1, Math.floor(slice.length / peaks.length));
  const midY = height / 2;

  let maxPeak = 0;
  for (let i = 0; i < peaks.length; i += 1) {
    maxPeak = Math.max(maxPeak, peaks[i]);
  }

  const ampScale = maxPeak > 0 ? (height * 0.42) / maxPeak : 0;
  if (ampScale <= 0) {
    return;
  }

  const topPath: { x: number; y: number }[] = [];

  for (let i = 0; i < peaks.length; i += 1) {
    const globalSample = start + i * blockSize;
    const x = sampleToX(globalSample, bounds, width);
    topPath.push({ x, y: midY - peaks[i] * ampScale });
  }

  ctx.beginPath();
  ctx.moveTo(topPath[0].x, midY);
  for (const point of topPath) {
    ctx.lineTo(point.x, point.y);
  }
  for (let i = topPath.length - 1; i >= 0; i -= 1) {
    const x = topPath[i].x;
    ctx.lineTo(x, midY + (midY - topPath[i].y));
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 166, 87, 0.18)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(topPath[0].x, topPath[0].y);
  for (let i = 1; i < topPath.length; i += 1) {
    ctx.lineTo(topPath[i].x, topPath[i].y);
  }
  ctx.strokeStyle = '#ffa657';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHopMarkers(
  ctx: CanvasRenderingContext2D,
  preview: ResynthPreview,
  bounds: SampleZoom,
  width: number,
  height: number,
): void {
  if (preview.frames.length <= 1) {
    return;
  }

  ctx.strokeStyle = 'rgba(139, 148, 158, 0.35)';
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1;

  for (const frame of preview.frames) {
    if (frame.offsetSamples < bounds.min || frame.offsetSamples > bounds.max) {
      continue;
    }

    const x = sampleToX(frame.offsetSamples, bounds, width);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawTimeAxis(
  ctx: CanvasRenderingContext2D,
  bounds: SampleZoom,
  width: number,
  height: number,
  sampleRate: number,
): void {
  ctx.strokeStyle = '#30363d';
  ctx.fillStyle = '#6e7681';
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';

  const axisY = height - 4;
  ctx.beginPath();
  ctx.moveTo(0, axisY);
  ctx.lineTo(width, axisY);
  ctx.stroke();

  for (const tick of getSampleTicks(bounds, 5)) {
    const x = sampleToX(tick, bounds, width);
    ctx.beginPath();
    ctx.moveTo(x, axisY - 4);
    ctx.lineTo(x, axisY);
    ctx.stroke();
    ctx.fillText(`${((tick / sampleRate) * 1000).toFixed(1)} ms`, x, axisY - 6);
  }
}

function drawZoomBrush(
  ctx: CanvasRenderingContext2D,
  brush: ZoomBrush,
  height: number,
): void {
  const left = Math.min(brush.startX, brush.endX);
  const brushWidth = Math.abs(brush.endX - brush.startX);
  ctx.fillStyle = 'rgba(88, 166, 255, 0.12)';
  ctx.strokeStyle = 'rgba(88, 166, 255, 0.85)';
  ctx.lineWidth = 1;
  ctx.fillRect(left, 0, brushWidth, height);
  ctx.strokeRect(left, 0, brushWidth, height  );
}

export function ResynthWaveforms({
  preview,
  sampleRate,
  zoom,
  onZoomChange,
}: ResynthWaveformsProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const combinedRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const brushRef = useRef<ZoomBrush | null>(null);
  const [brush, setBrush] = useState<ZoomBrush | null>(null);

  const resetZoom = () => onZoomChange(null);

  useEffect(() => {
    brushRef.current = brush;
  }, [brush]);

  useEffect(() => {
    const overlayCanvas = overlayRef.current;
    const combinedCanvas = combinedRef.current;
    if (!overlayCanvas || !combinedCanvas) {
      return;
    }

    const overlayRect = overlayCanvas.getBoundingClientRect();
    const combinedRect = combinedCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    overlayCanvas.width = overlayRect.width * dpr;
    overlayCanvas.height = overlayRect.height * dpr;
    combinedCanvas.width = combinedRect.width * dpr;
    combinedCanvas.height = combinedRect.height * dpr;

    const overlayCtx = overlayCanvas.getContext('2d');
    const combinedCtx = combinedCanvas.getContext('2d');
    if (!overlayCtx || !combinedCtx) {
      return;
    }

    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    combinedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    overlayCtx.clearRect(0, 0, overlayRect.width, overlayRect.height);
    combinedCtx.clearRect(0, 0, combinedRect.width, combinedRect.height);

    overlayCtx.fillStyle = '#0d1117';
    overlayCtx.fillRect(0, 0, overlayRect.width, overlayRect.height);
    combinedCtx.fillStyle = '#0d1117';
    combinedCtx.fillRect(0, 0, combinedRect.width, combinedRect.height);

    if (!preview) {
      overlayCtx.fillStyle = '#8b949e';
      overlayCtx.font = '13px "Segoe UI", system-ui, sans-serif';
      overlayCtx.textAlign = 'center';
      overlayCtx.fillText('Нет кадров для resynth', overlayRect.width / 2, overlayRect.height / 2);
      return;
    }

    const bounds = getSampleBounds(preview.plan.outputSamples, zoom);
    const overlayHeight = overlayRect.height - 18;
    const combinedHeight = combinedRect.height - 18;
    const activeBrush = brushRef.current;

    const drawMidline = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.strokeStyle = '#30363d';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    drawMidline(overlayCtx, overlayRect.width, overlayHeight);
    drawHopMarkers(overlayCtx, preview, bounds, overlayRect.width, overlayHeight);

    const overlayPeak = visibleOverlayPeak(preview, bounds);
    const overlayAmpScale = overlayPeak > 0 ? (overlayHeight * 0.42) / overlayPeak : 0;

    for (const frame of preview.frames) {
      const color = FRAME_COLORS[frame.index % FRAME_COLORS.length];
      drawTimelineWave(
        overlayCtx,
        frame.samples,
        frame.offsetSamples,
        bounds,
        overlayRect.width,
        overlayHeight,
        color,
        0.22,
        overlayAmpScale,
      );
    }

    if (activeBrush) {
      drawZoomBrush(overlayCtx, activeBrush, overlayHeight);
    }

    drawTimeAxis(overlayCtx, bounds, overlayRect.width, overlayRect.height, sampleRate);

    drawMidline(combinedCtx, combinedRect.width, combinedHeight);
    drawCombinedWave(combinedCtx, preview.combined, bounds, combinedRect.width, combinedHeight);

    if (activeBrush) {
      drawZoomBrush(combinedCtx, activeBrush, combinedHeight);
    }

    drawTimeAxis(combinedCtx, bounds, combinedRect.width, combinedRect.height, sampleRate);
  }, [preview, sampleRate, zoom, brush]);

  useEffect(() => {
    const canvases = [overlayRef.current, combinedRef.current].filter(Boolean) as HTMLCanvasElement[];

    const applyBrushZoom = (canvasWidth: number) => {
      const activeBrush = brushRef.current;
      if (!preview || !activeBrush) {
        return;
      }

      const selectionWidth = Math.abs(activeBrush.endX - activeBrush.startX);
      if (selectionWidth < 12) {
        return;
      }

      const bounds = getSampleBounds(preview.plan.outputSamples, zoom);
      const startSample = xToSample(Math.min(activeBrush.startX, activeBrush.endX), bounds, canvasWidth);
      const endSample = xToSample(Math.max(activeBrush.startX, activeBrush.endX), bounds, canvasWidth);

      if (Math.abs(endSample - startSample) >= 2) {
        onZoomChange({ min: startSample, max: endSample });
      }
    };

    const cleanups = canvases.map((canvas) => {
      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0 || !preview) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const localX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
        draggingRef.current = true;
        const nextBrush = { startX: localX, endX: localX };
        brushRef.current = nextBrush;
        setBrush(nextBrush);
        canvas.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!draggingRef.current || !brushRef.current) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const localX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
        const nextBrush = { ...brushRef.current, endX: localX };
        brushRef.current = nextBrush;
        setBrush(nextBrush);
      };

      const onPointerUp = (event: PointerEvent) => {
        if (!draggingRef.current) {
          return;
        }

        draggingRef.current = false;
        canvas.releasePointerCapture(event.pointerId);

        const rect = canvas.getBoundingClientRect();
        applyBrushZoom(rect.width);
        brushRef.current = null;
        setBrush(null);
      };

      const onWheel = (event: WheelEvent) => {
        if (!preview) {
          return;
        }

        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const localX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
        const bounds = getSampleBounds(preview.plan.outputSamples, zoom);
        const cursorSample = xToSample(localX, bounds, rect.width);
        const factor = event.deltaY < 0 ? 0.8 : 1.25;
        const next = zoomSampleAtCursor(zoom, preview.plan.outputSamples, cursorSample, factor);

        if (next.min <= 0 && next.max >= preview.plan.outputSamples) {
          onZoomChange(null);
        } else {
          onZoomChange(next);
        }
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });

      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [preview, zoom, onZoomChange]);

  if (!preview) {
    return (
      <div className="resynth-waves empty">
        <p>Нет кадров для resynth в текущей позиции.</p>
      </div>
    );
  }

  const bounds = getSampleBounds(preview.plan.outputSamples, zoom);

  return (
    <div className="resynth-waves">
      {zoom && (
        <button type="button" className="reset-zoom-button" onClick={resetZoom}>
          Сбросить масштаб ({formatSampleRange(bounds.min, bounds.max, sampleRate)})
        </button>
      )}

      <div className="resynth-waves-section">
        <div className="resynth-waves-header">
          <h3>Кадры iFFT</h3>
          <span className="setting-hint">Каждая волна смещена на {preview.plan.hopSamples} samples</span>
        </div>
        <ul className="resynth-frame-legend">
          {preview.frames.map((frame) => (
            <li key={frame.index}>
              <span
                className="resynth-frame-swatch"
                style={{ background: FRAME_COLORS[frame.index % FRAME_COLORS.length] }}
              />
              <span>
                Кадр {frame.index + 1}
                {' · '}
                {formatTime(frame.centerTime)}
                {' · '}
                offset {frame.offsetSamples}
              </span>
            </li>
          ))}
        </ul>
        <canvas
          ref={overlayRef}
          className="resynth-waves-canvas overlay zoomable"
          aria-label="Наложение iFFT-кадров resynth"
          onDoubleClick={(event) => {
            event.preventDefault();
            resetZoom();
          }}
        />
      </div>

      <div className="resynth-waves-section">
        <div className="resynth-waves-header">
          <h3>Итог overlap-add</h3>
          <span className="setting-hint">
            {preview.plan.outputSamples.toLocaleString()} samples · {formatResynthTime(preview.plan.outputDurationSec)}
          </span>
        </div>
        <canvas
          ref={combinedRef}
          className="resynth-waves-canvas combined zoomable"
          aria-label="Итоговая волна resynth"
          onDoubleClick={(event) => {
            event.preventDefault();
            resetZoom();
          }}
        />
      </div>

      <p className="resynth-zoom-hint">
        Выделите диапазон для zoom · колесо мыши · двойной клик или Esc — сброс · +/- — масштаб
      </p>
    </div>
  );
}
