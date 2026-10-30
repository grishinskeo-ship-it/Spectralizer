import { useCallback, useEffect, useRef, useState } from 'react';
import { computeHarmonics } from '../audio/harmonics';
import type { AnalysisSettings, SpectrumResult } from '../types';
import {
  PLOT_PADDING,
  frequencyToLabel,
  frequencyToX,
  getFrequencyBounds,
  getFrequencyTicks,
  getPlotPoint,
  magnitudeToDisplay,
  magnitudeToLabel,
  xToFrequency,
  type FrequencyZoom,
  type PlotHover,
} from './spectrumChartUtils';

interface SpectrumCanvasProps {
  spectrum: SpectrumResult | null;
  settings: AnalysisSettings;
  zoom: FrequencyZoom | null;
  onZoomChange: (zoom: FrequencyZoom | null) => void;
}

interface BrushSelection {
  startX: number;
  endX: number;
}

export function SpectrumCanvas({ spectrum, settings, zoom, onZoomChange }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const [hover, setHover] = useState<PlotHover | null>(null);
  const [brush, setBrush] = useState<BrushSelection | null>(null);
  const draggingRef = useRef(false);

  const resetZoom = useCallback(() => {
    onZoomChange(null);
  }, [onZoomChange]);

  const getLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const plotWidth = rect.width - PLOT_PADDING.left - PLOT_PADDING.right;
    const plotHeight = rect.height - PLOT_PADDING.top - PLOT_PADDING.bottom;

    return { rect, plotWidth, plotHeight };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const prevSize = canvasSizeRef.current;

    if (rect.width !== prevSize.width || rect.height !== prevSize.height || dpr !== prevSize.dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvasSizeRef.current = { width: rect.width, height: rect.height, dpr };
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const plotWidth = width - PLOT_PADDING.left - PLOT_PADDING.right;
    const plotHeight = height - PLOT_PADDING.top - PLOT_PADDING.bottom;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.strokeRect(PLOT_PADDING.left, PLOT_PADDING.top, plotWidth, plotHeight);

    if (!spectrum) {
      ctx.fillStyle = '#8b949e';
      ctx.font = '14px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Загрузите аудиофайл для анализа спектра', width / 2, height / 2);
      return;
    }

    const nyquist = spectrum.sampleRate / 2;
    const bounds = getFrequencyBounds(spectrum, zoom);

    if (settings.showGrid) {
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#6e7681';
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';

      const freqLines = getFrequencyTicks(bounds, settings.frequencyScale, nyquist);

      for (const freq of freqLines) {
        const x = PLOT_PADDING.left + frequencyToX(freq, bounds, plotWidth, settings.frequencyScale);
        ctx.beginPath();
        ctx.moveTo(x, PLOT_PADDING.top);
        ctx.lineTo(x, PLOT_PADDING.top + plotHeight);
        ctx.stroke();

        const label = freq >= 1000 ? `${freq / 1000}k` : `${Math.round(freq)}`;
        ctx.fillText(label, x, height - 12);
      }

      const magLines = settings.magnitudeScale === 'db'
        ? [settings.dbMax, settings.dbMax - 20, settings.dbMax - 40, settings.dbMax - 60, settings.dbMin]
        : [1, 0.75, 0.5, 0.25, 0];

      ctx.textAlign = 'right';
      for (const mag of magLines) {
        const normalized = settings.magnitudeScale === 'db'
          ? (mag - settings.dbMin) / (settings.dbMax - settings.dbMin)
          : mag;
        const y = PLOT_PADDING.top + plotHeight - normalized * plotHeight;

        ctx.beginPath();
        ctx.moveTo(PLOT_PADDING.left, y);
        ctx.lineTo(PLOT_PADDING.left + plotWidth, y);
        ctx.stroke();

        const label = settings.magnitudeScale === 'db' ? `${mag} dB` : `${(mag * 100).toFixed(0)}%`;
        ctx.fillText(label, PLOT_PADDING.left - 8, y + 4);
      }
    }

    const gradient = ctx.createLinearGradient(0, PLOT_PADDING.top, 0, PLOT_PADDING.top + plotHeight);
    gradient.addColorStop(0, '#58a6ff');
    gradient.addColorStop(0.5, '#a371f7');
    gradient.addColorStop(1, '#f778ba');

    ctx.beginPath();
    let started = false;

    for (let i = 0; i < spectrum.frequencies.length; i += 1) {
      const freq = spectrum.frequencies[i];

      if (freq < bounds.min || freq > bounds.max) {
        continue;
      }

      if (freq < 20 && settings.frequencyScale === 'log') {
        continue;
      }

      const x = PLOT_PADDING.left + frequencyToX(freq, bounds, plotWidth, settings.frequencyScale);
      const normalized = Math.min(1, Math.max(0, magnitudeToDisplay(spectrum.magnitudes[i], settings)));
      const y = PLOT_PADDING.top + plotHeight - normalized * plotHeight;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (started) {
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(PLOT_PADDING.left + plotWidth, PLOT_PADDING.top + plotHeight);
      ctx.lineTo(PLOT_PADDING.left, PLOT_PADDING.top + plotHeight);
      ctx.closePath();

      const fillGradient = ctx.createLinearGradient(0, PLOT_PADDING.top, 0, PLOT_PADDING.top + plotHeight);
      fillGradient.addColorStop(0, 'rgba(88, 166, 255, 0.35)');
      fillGradient.addColorStop(1, 'rgba(88, 166, 255, 0.02)');
      ctx.fillStyle = fillGradient;
      ctx.fill();
    }

    if (brush) {
      const left = PLOT_PADDING.left + Math.min(brush.startX, brush.endX);
      const selectionWidth = Math.abs(brush.endX - brush.startX);
      ctx.fillStyle = 'rgba(88, 166, 255, 0.15)';
      ctx.fillRect(left, PLOT_PADDING.top, selectionWidth, plotHeight);
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, PLOT_PADDING.top, selectionWidth, plotHeight);
    }

    if (hover && !brush) {
      const crossX = PLOT_PADDING.left + hover.plotX;
      const crossY = PLOT_PADDING.top + hover.plotY;

      ctx.strokeStyle = 'rgba(255, 166, 87, 0.85)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(crossX, PLOT_PADDING.top);
      ctx.lineTo(crossX, PLOT_PADDING.top + plotHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(PLOT_PADDING.left, crossY);
      ctx.lineTo(PLOT_PADDING.left + plotWidth, crossY);
      ctx.stroke();

      ctx.setLineDash([]);

      ctx.fillStyle = '#ffa657';
      ctx.beginPath();
      ctx.arc(crossX, crossY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (settings.showPeaks && spectrum.peakMagnitude > 0 && !brush) {
      const peakFreq = spectrum.peakFrequency;
      if (peakFreq >= bounds.min && peakFreq <= bounds.max) {
        const peakX = PLOT_PADDING.left + frequencyToX(peakFreq, bounds, plotWidth, settings.frequencyScale);
        const peakNorm = Math.min(1, Math.max(0, magnitudeToDisplay(spectrum.peakMagnitude, settings)));
        const peakY = PLOT_PADDING.top + plotHeight - peakNorm * plotHeight;

        ctx.fillStyle = '#ffa657';
        ctx.beginPath();
        ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
        ctx.fill();

        if (!hover) {
          ctx.fillStyle = '#e6edf3';
          ctx.font = '12px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`Пик: ${frequencyToLabel(peakFreq)}`, peakX + 10, peakY - 8);
        }
      }
    }

    if (settings.showHarmonics && spectrum.peakFrequency > 0 && !brush) {
      const harmonics = computeHarmonics(spectrum, settings.harmonicCount);
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';

      for (const harmonic of harmonics) {
        if (harmonic.index === 1) {
          continue;
        }

        if (harmonic.frequency < bounds.min || harmonic.frequency > bounds.max) {
          continue;
        }

        const x = PLOT_PADDING.left + frequencyToX(harmonic.frequency, bounds, plotWidth, settings.frequencyScale);
        ctx.strokeStyle = 'rgba(163, 113, 247, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(x, PLOT_PADDING.top);
        ctx.lineTo(x, PLOT_PADDING.top + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#a371f7';
        ctx.fillText(`×${harmonic.index}`, x, PLOT_PADDING.top + 12);
      }
    }

    ctx.fillStyle = '#8b949e';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Частота (Hz)', PLOT_PADDING.left + plotWidth / 2 - 40, height - 2);

    ctx.save();
    ctx.translate(14, PLOT_PADDING.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(settings.magnitudeScale === 'db' ? 'Амплитуда (dB)' : 'Амплитуда', 0, 0);
    ctx.restore();
  }, [spectrum, settings, hover, zoom, brush]);

  const handlePointerMove = (clientX: number, clientY: number) => {
    const layout = getLayout();
    if (!layout || !spectrum) {
      return;
    }

    const { rect, plotWidth, plotHeight } = layout;
    const localX = clientX - rect.left - PLOT_PADDING.left;

    if (draggingRef.current && brush) {
      const clampedX = Math.min(plotWidth, Math.max(0, localX));
      setBrush({ ...brush, endX: clampedX });
      return;
    }

    const bounds = getFrequencyBounds(spectrum, zoom);
    const point = getPlotPoint(
      spectrum,
      settings,
      bounds,
      plotWidth,
      plotHeight,
      clientX,
      clientY,
      rect,
    );
    setHover(point);
  };

  const handlePointerDown = (clientX: number) => {
    const layout = getLayout();
    if (!layout || !spectrum) {
      return;
    }

    const { rect, plotWidth } = layout;
    const localX = clientX - rect.left - PLOT_PADDING.left;

    if (localX < 0 || localX > plotWidth) {
      return;
    }

    draggingRef.current = true;
    setBrush({ startX: localX, endX: localX });
    setHover(null);
  };

  const handlePointerUp = () => {
    if (!draggingRef.current || !brush || !spectrum) {
      draggingRef.current = false;
      setBrush(null);
      return;
    }

    draggingRef.current = false;

    const layout = getLayout();
    if (!layout) {
      setBrush(null);
      return;
    }

    const { plotWidth } = layout;
    const selectionWidth = Math.abs(brush.endX - brush.startX);

    if (selectionWidth >= 12) {
      const bounds = getFrequencyBounds(spectrum, zoom);
      const startFreq = xToFrequency(Math.min(brush.startX, brush.endX), bounds, plotWidth, settings.frequencyScale);
      const endFreq = xToFrequency(Math.max(brush.startX, brush.endX), bounds, plotWidth, settings.frequencyScale);

      if (Math.abs(endFreq - startFreq) > 1) {
        onZoomChange({ min: startFreq, max: endFreq });
      }
    }

    setBrush(null);
  };

  const tooltipStyle = hover
    ? {
      left: `${PLOT_PADDING.left + hover.plotX + 14}px`,
      top: `${Math.max(8, PLOT_PADDING.top + hover.plotY - 48)}px`,
    }
    : undefined;

  return (
    <div className="spectrum-chart-container">
      <canvas
        ref={canvasRef}
        className="spectrum-canvas"
        aria-label="График спектра частот"
        onPointerMove={(event) => handlePointerMove(event.clientX, event.clientY)}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }
          canvasRef.current?.setPointerCapture(event.pointerId);
          handlePointerDown(event.clientX);
        }}
        onPointerUp={(event) => {
          canvasRef.current?.releasePointerCapture(event.pointerId);
          handlePointerUp();
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          setBrush(null);
        }}
        onPointerLeave={() => {
          if (!draggingRef.current) {
            setHover(null);
          }
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          resetZoom();
        }}
      />

      {hover && !brush && (
        <div className="spectrum-tooltip" style={tooltipStyle}>
          <span>{frequencyToLabel(hover.frequency)}</span>
          <strong>{magnitudeToLabel(hover.magnitude, settings)}</strong>
        </div>
      )}

      {zoom && (
        <button type="button" className="reset-zoom-button" onClick={resetZoom}>
          Сбросить масштаб ({frequencyToLabel(zoom.min)} – {frequencyToLabel(zoom.max)})
        </button>
      )}

      <div className="spectrum-chart-hint">
        Наведите для значений · выделите диапазон для zoom · двойной клик — сброс
      </div>
    </div>
  );
}
