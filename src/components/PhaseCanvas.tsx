import { useEffect, useRef, useState } from 'react';
import type { AnalysisSettings, SpectrumResult } from '../types';
import {
  PLOT_PADDING,
  frequencyToLabel,
  frequencyToX,
  getFrequencyBounds,
  getFrequencyTicks,
  getPlotPoint,
  type FrequencyZoom,
} from './spectrumChartUtils';

interface PhaseHover {
  frequency: number;
  phaseRadians: number;
  plotX: number;
  plotY: number;
}

interface PhaseCanvasProps {
  spectrum: SpectrumResult | null;
  settings: AnalysisSettings;
  zoom: FrequencyZoom | null;
}

function phaseToY(radians: number, plotHeight: number): number {
  const normalized = (radians + Math.PI) / (2 * Math.PI);
  return plotHeight - normalized * plotHeight;
}

function phaseToLabel(radians: number): string {
  const degrees = (radians * 180) / Math.PI;
  return `${degrees.toFixed(1)}°`;
}

export function PhaseCanvas({ spectrum, settings, zoom }: PhaseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const [hover, setHover] = useState<PhaseHover | null>(null);

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
    ctx.strokeRect(PLOT_PADDING.left, PLOT_PADDING.top, plotWidth, plotHeight);

    if (!spectrum?.phases) {
      ctx.fillStyle = '#8b949e';
      ctx.font = '13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Фаза появится после загрузки аудио', width / 2, height / 2);
      return;
    }

    const nyquist = spectrum.sampleRate / 2;
    const bounds = getFrequencyBounds(spectrum, zoom);

    if (settings.showGrid) {
      ctx.strokeStyle = '#21262d';
      ctx.fillStyle = '#6e7681';
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';

      for (const freq of getFrequencyTicks(bounds, settings.frequencyScale, nyquist)) {
        const x = PLOT_PADDING.left + frequencyToX(freq, bounds, plotWidth, settings.frequencyScale);
        ctx.beginPath();
        ctx.moveTo(x, PLOT_PADDING.top);
        ctx.lineTo(x, PLOT_PADDING.top + plotHeight);
        ctx.stroke();
      }

      ctx.textAlign = 'right';
      for (const deg of [180, 90, 0, -90, -180]) {
        const rad = (deg * Math.PI) / 180;
        const y = PLOT_PADDING.top + phaseToY(rad, plotHeight);
        ctx.beginPath();
        ctx.moveTo(PLOT_PADDING.left, y);
        ctx.lineTo(PLOT_PADDING.left + plotWidth, y);
        ctx.stroke();
        ctx.fillText(`${deg}°`, PLOT_PADDING.left - 6, y + 3);
      }
    }

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
      const y = PLOT_PADDING.top + phaseToY(spectrum.phases[i], plotHeight);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (started) {
      ctx.strokeStyle = '#3fb950';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (hover) {
      const crossX = PLOT_PADDING.left + hover.plotX;
      const crossY = PLOT_PADDING.top + hover.plotY;
      ctx.strokeStyle = 'rgba(255, 166, 87, 0.85)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(crossX, PLOT_PADDING.top);
      ctx.lineTo(crossX, PLOT_PADDING.top + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffa657';
      ctx.beginPath();
      ctx.arc(crossX, crossY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#8b949e';
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Фаза (°)', PLOT_PADDING.left + 4, PLOT_PADDING.top + 12);
  }, [spectrum, settings, zoom, hover]);

  const handleMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !spectrum?.phases) {
      setHover(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const plotWidth = rect.width - PLOT_PADDING.left - PLOT_PADDING.right;
    const plotHeight = rect.height - PLOT_PADDING.top - PLOT_PADDING.bottom;
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

    if (!point) {
      setHover(null);
      return;
    }

    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < spectrum.frequencies.length; i += 1) {
      const x = frequencyToX(spectrum.frequencies[i], bounds, plotWidth, settings.frequencyScale);
      const dist = Math.abs(x - point.plotX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }

    setHover({
      frequency: spectrum.frequencies[nearest],
      phaseRadians: spectrum.phases[nearest],
      plotX: frequencyToX(spectrum.frequencies[nearest], bounds, plotWidth, settings.frequencyScale),
      plotY: phaseToY(spectrum.phases[nearest], plotHeight),
    });
  };

  const tooltipStyle = hover
    ? {
      left: `${PLOT_PADDING.left + hover.plotX + 12}px`,
      top: `${Math.max(6, PLOT_PADDING.top + hover.plotY - 40)}px`,
    }
    : undefined;

  return (
    <div className="phase-chart-container">
      <canvas
        ref={canvasRef}
        className="phase-canvas"
        aria-label="График фазы спектра"
        onPointerMove={(event) => handleMove(event.clientX, event.clientY)}
        onPointerLeave={() => setHover(null)}
      />
      {hover && (
        <div className="spectrum-tooltip phase-tooltip" style={tooltipStyle}>
          <span>{frequencyToLabel(hover.frequency)}</span>
          <strong>{phaseToLabel(hover.phaseRadians)}</strong>
        </div>
      )}
    </div>
  );
}
