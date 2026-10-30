import { useMemo } from 'react';
import { estimateResynthDuration } from '../audio/resynth';
import type { ResynthPreview } from '../audio/resynth';
import { formatTime } from '../audio/loadAudio';
import type { AnalysisSettings, LoadedAudio } from '../types';
import { RESYNTH_FRAME_COUNT_OPTIONS, RESYNTH_HOP_RATIO_OPTIONS } from '../types';
import type { SampleZoom } from './resynthChartUtils';
import { ResynthWaveforms } from './ResynthWaveforms';

interface ResynthPanelProps {
  audio: LoadedAudio | null;
  currentTime: number;
  settings: AnalysisSettings;
  resynthBusy: boolean;
  preview: ResynthPreview | null;
  resynthZoom: SampleZoom | null;
  onResynthZoomChange: (zoom: SampleZoom | null) => void;
  onSettingsChange: (settings: AnalysisSettings) => void;
  onResynth: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds >= 1) {
    return `${seconds.toFixed(2)} s`;
  }
  return `${(seconds * 1000).toFixed(0)} ms`;
}

export function ResynthPanel({
  audio,
  currentTime,
  settings,
  resynthBusy,
  preview,
  resynthZoom,
  onResynthZoomChange,
  onSettingsChange,
  onResynth,
}: ResynthPanelProps) {
  const update = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const estimate = useMemo(() => (
    audio
      ? estimateResynthDuration(
        settings.resynthFrameCount,
        settings.resynthHopRatio,
        settings.fftSize,
        audio.sampleRate,
        currentTime,
        audio.duration,
      )
      : { frames: 0, seconds: 0 }
  ), [audio, currentTime, settings.fftSize, settings.resynthFrameCount, settings.resynthHopRatio]);

  const frameMs = audio ? (settings.fftSize / audio.sampleRate) * 1000 : 0;

  if (!audio) {
    return (
      <div className="resynth-panel empty">
        <p>Загрузите аудио для экспериментального resynth через iFFT.</p>
      </div>
    );
  }

  return (
    <div className="resynth-panel">
      <div className="resynth-summary">
        <div>
          <span>Старт</span>
          <strong>{formatTime(currentTime)}</strong>
        </div>
        <div>
          <span>Кадров</span>
          <strong>{estimate.frames} / {settings.resynthFrameCount}</strong>
        </div>
        <div>
          <span>Длительность</span>
          <strong>{formatDuration(estimate.seconds)}</strong>
        </div>
        <div>
          <span>Окно FFT</span>
          <strong>{frameMs.toFixed(0)} ms</strong>
        </div>
      </div>

      <ResynthWaveforms
        preview={preview}
        sampleRate={audio.sampleRate}
        zoom={resynthZoom}
        onZoomChange={onResynthZoomChange}
      />

      <div className="resynth-controls">
        <label className="setting">
          <span>Кол-во кадров</span>
          <select
            value={settings.resynthFrameCount}
            onChange={(event) => update('resynthFrameCount', Number(event.target.value))}
          >
            {RESYNTH_FRAME_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>

        <label className="setting">
          <span>Шаг между кадрами</span>
          <select
            value={settings.resynthHopRatio}
            onChange={(event) => update('resynthHopRatio', Number(event.target.value))}
          >
            {RESYNTH_HOP_RATIO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="resynth-bar">
        <button
          type="button"
          className="play-button"
          disabled={resynthBusy || estimate.frames === 0}
          onClick={() => void onResynth()}
        >
          {resynthBusy ? 'Resynth…' : 'Resynth (R)'}
        </button>
        <p className="setting-hint">
          Экспериментальный overlap-add iFFT от текущей позиции. Окно анализа не инвертируется — звук приблизительный.
        </p>
      </div>
    </div>
  );
}
