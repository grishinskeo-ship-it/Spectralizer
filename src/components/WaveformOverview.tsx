import { useEffect, useRef, type RefObject } from 'react';
import type { LoadedAudio, LoopRegion } from '../types';
import { computeWaveformPeaks } from '../audio/spectrum';
import { formatTime } from '../audio/loadAudio';

interface WaveformOverviewProps {
  audio: LoadedAudio | null;
  currentTime: number;
  liveTimeRef: RefObject<number>;
  isPlaying: boolean;
  loopRegion: LoopRegion | null;
  loopEnabled: boolean;
  onTimeChange: (time: number) => void;
  onLoopRegionChange: (region: LoopRegion | null) => void;
  onClearLoop: () => void;
}

interface LoopBrush {
  startX: number;
  endX: number;
}

export function WaveformOverview({
  audio,
  currentTime,
  liveTimeRef,
  isPlaying,
  loopRegion,
  loopEnabled,
  onTimeChange,
  onLoopRegionChange,
  onClearLoop,
}: WaveformOverviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const loopDraggingRef = useRef(false);
  const loopBrushRef = useRef<LoopBrush | null>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const layoutRef = useRef({ width: 0, height: 0, dpr: 1 });

  const timeToX = (time: number, width: number) => (time / (audio?.duration ?? 1)) * width;

  const xToTime = (x: number, width: number) => {
    const ratio = Math.min(1, Math.max(0, x / width));
    return ratio * (audio?.duration ?? 0);
  };

  const drawFrame = (time: number, loopBrush: LoopBrush | null = null) => {
    const canvas = canvasRef.current;
    const peaks = peaksRef.current;
    if (!canvas || !audio || !peaks) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const { width, height, dpr } = layoutRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, width, height);

    const midY = height / 2;
    ctx.strokeStyle = '#30363d';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    ctx.fillStyle = '#388bfd';
    for (let i = 0; i < peaks.length; i += 1) {
      const x = (i / peaks.length) * width;
      const barHeight = peaks[i] * (height * 0.45);
      ctx.fillRect(x, midY - barHeight, Math.max(1, width / peaks.length), barHeight * 2);
    }

    const activeLoop = loopBrush
      ? {
          start: xToTime(Math.min(loopBrush.startX, loopBrush.endX), width),
          end: xToTime(Math.max(loopBrush.startX, loopBrush.endX), width),
        }
      : loopRegion;

    if (activeLoop) {
      const left = timeToX(activeLoop.start, width);
      const right = timeToX(activeLoop.end, width);
      ctx.fillStyle = loopEnabled ? 'rgba(63, 185, 80, 0.18)' : 'rgba(63, 185, 80, 0.08)';
      ctx.fillRect(left, 0, right - left, height);
      ctx.strokeStyle = loopEnabled ? '#3fb950' : '#238636';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, 0, right - left, height);
    }

    const playheadX = timeToX(time, width);
    ctx.strokeStyle = '#ffa657';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = '#ffa657';
    ctx.beginPath();
    ctx.arc(playheadX, midY, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audio) {
      peaksRef.current = null;
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    layoutRef.current = { width: rect.width, height: rect.height, dpr };
    peaksRef.current = computeWaveformPeaks(audio.buffer, 'mono', Math.floor(rect.width));
    drawFrame(currentTime);
  }, [audio]);

  useEffect(() => {
    if (isPlaying) {
      return;
    }

    drawFrame(currentTime);
  }, [currentTime, isPlaying, loopRegion, loopEnabled, audio]);

  useEffect(() => {
    if (!isPlaying || !audio) {
      return;
    }

    let rafId = 0;

    const tick = () => {
      drawFrame(liveTimeRef.current ?? currentTime);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, audio, liveTimeRef, currentTime, loopRegion, loopEnabled]);

  const handlePointer = (clientX: number, width: number) => {
    onTimeChange(xToTime(clientX - canvasRef.current!.getBoundingClientRect().left, width));
  };

  const displayTime = isPlaying ? (liveTimeRef.current ?? currentTime) : currentTime;

  return (
    <div className="waveform-panel">
      <div className="waveform-header">
        <span>
          Позиция во времени
          {loopEnabled && loopRegion ? ' · loop' : loopRegion ? ' · loop (выкл.)' : ''}
        </span>
        <div className="waveform-header-actions">
          {loopRegion && (
            <button
              type="button"
              className="text-button"
              onClick={onClearLoop}
            >
              Сбросить loop
            </button>
          )}
          <span className="time-display">
            {audio ? `${formatTime(displayTime)} / ${formatTime(audio.duration)}` : '—'}
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        aria-label="Обзор waveform с ползунком времени"
        onDoubleClick={(event) => {
          if (event.shiftKey && loopRegion) {
            event.preventDefault();
            onClearLoop();
          }
        }}
        onPointerDown={(event) => {
          if (!audio) {
            return;
          }

          const rect = canvasRef.current!.getBoundingClientRect();
          const localX = event.clientX - rect.left;

          if (event.shiftKey) {
            loopDraggingRef.current = true;
            loopBrushRef.current = { startX: localX, endX: localX };
            drawFrame(currentTime, loopBrushRef.current);
            canvasRef.current?.setPointerCapture(event.pointerId);
            return;
          }

          draggingRef.current = true;
          canvasRef.current?.setPointerCapture(event.pointerId);
          handlePointer(event.clientX, rect.width);
        }}
        onPointerMove={(event) => {
          if (!audio) {
            return;
          }

          const rect = canvasRef.current!.getBoundingClientRect();
          const localX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));

          if (loopDraggingRef.current && loopBrushRef.current) {
            loopBrushRef.current = { ...loopBrushRef.current, endX: localX };
            drawFrame(currentTime, loopBrushRef.current);
            return;
          }

          if (draggingRef.current) {
            handlePointer(event.clientX, rect.width);
          }
        }}
        onPointerUp={(event) => {
          if (loopDraggingRef.current && loopBrushRef.current && audio) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const width = Math.abs(loopBrushRef.current.endX - loopBrushRef.current.startX);

            if (width >= 8) {
              const start = xToTime(Math.min(loopBrushRef.current.startX, loopBrushRef.current.endX), rect.width);
              const end = xToTime(Math.max(loopBrushRef.current.startX, loopBrushRef.current.endX), rect.width);
              if (end - start > 0.05) {
                onLoopRegionChange({ start, end });
              }
            }

            loopDraggingRef.current = false;
            loopBrushRef.current = null;
            drawFrame(currentTime);
          }

          draggingRef.current = false;
          canvasRef.current?.releasePointerCapture(event.pointerId);
        }}
      />
      {audio && (
        <input
          type="range"
          className="time-slider"
          min={0}
          max={audio.duration}
          step={0.001}
          value={currentTime}
          onChange={(event) => onTimeChange(Number(event.target.value))}
          aria-label="Ползунок времени"
        />
      )}
      <p className="setting-hint">
        Shift + drag — выделить loop. Shift + dblclick или Esc — сбросить.
      </p>
    </div>
  );
}
