import type { AnalysisSettings, LoopRegion, WindowType } from '../types';
import { FFT_SIZES, HARMONIC_COUNT_OPTIONS, PLAYBACK_FPS_OPTIONS, RESYNTH_FRAME_COUNT_OPTIONS, RESYNTH_HOP_RATIO_OPTIONS } from '../types';
import { windowLabel } from '../audio/windows';

interface SettingsPanelProps {
  settings: AnalysisSettings;
  onChange: (settings: AnalysisSettings) => void;
  disabled: boolean;
  loopRegion: LoopRegion | null;
  onClearLoop: () => void;
}

const WINDOW_TYPES: WindowType[] = ['rectangular', 'hanning', 'hamming', 'blackman'];

export function SettingsPanel({ settings, onChange, disabled, loopRegion, onClearLoop }: SettingsPanelProps) {
  const update = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <aside className="settings-panel">
      <h2>Настройки анализа</h2>

      <label className="setting">
        <span>Размер FFT</span>
        <select
          value={settings.fftSize}
          disabled={disabled}
          onChange={(event) => update('fftSize', Number(event.target.value))}
        >
          {FFT_SIZES.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>

      <label className="setting">
        <span>Оконная функция</span>
        <select
          value={settings.windowType}
          disabled={disabled}
          onChange={(event) => update('windowType', event.target.value as WindowType)}
        >
          {WINDOW_TYPES.map((type) => (
            <option key={type} value={type}>{windowLabel(type)}</option>
          ))}
        </select>
      </label>

      <label className="setting">
        <span>Канал</span>
        <select
          value={settings.channel}
          disabled={disabled}
          onChange={(event) => update('channel', event.target.value as AnalysisSettings['channel'])}
        >
          <option value="mono">Mono (среднее)</option>
          <option value="left">Левый</option>
          <option value="right">Правый</option>
        </select>
      </label>

      <label className="setting">
        <span>Шкала частот</span>
        <select
          value={settings.frequencyScale}
          disabled={disabled}
          onChange={(event) => update('frequencyScale', event.target.value as AnalysisSettings['frequencyScale'])}
        >
          <option value="log">Логарифмическая</option>
          <option value="linear">Линейная</option>
        </select>
      </label>

      <label className="setting">
        <span>Шкала амплитуды</span>
        <select
          value={settings.magnitudeScale}
          disabled={disabled}
          onChange={(event) => update('magnitudeScale', event.target.value as AnalysisSettings['magnitudeScale'])}
        >
          <option value="db">Decibel (dB)</option>
          <option value="linear">Линейная</option>
        </select>
      </label>

      {settings.magnitudeScale === 'db' && (
        <>
          <label className="setting">
            <span>Мин. dB ({settings.dbMin})</span>
            <input
              type="range"
              min={-120}
              max={-20}
              step={1}
              value={settings.dbMin}
              disabled={disabled}
              onChange={(event) => update('dbMin', Number(event.target.value))}
            />
          </label>

          <label className="setting">
            <span>Макс. dB ({settings.dbMax})</span>
            <input
              type="range"
              min={-40}
              max={20}
              step={1}
              value={settings.dbMax}
              disabled={disabled}
              onChange={(event) => update('dbMax', Number(event.target.value))}
            />
          </label>
        </>
      )}

      <label className="setting">
        <span>Сглаживание ({settings.smoothing})</span>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={settings.smoothing}
          disabled={disabled}
          onChange={(event) => update('smoothing', Number(event.target.value))}
        />
      </label>

      <label className="setting checkbox">
        <input
          type="checkbox"
          checked={settings.showGrid}
          disabled={disabled}
          onChange={(event) => update('showGrid', event.target.checked)}
        />
        <span>Показать сетку</span>
      </label>

      <label className="setting checkbox">
        <input
          type="checkbox"
          checked={settings.showPeaks}
          disabled={disabled}
          onChange={(event) => update('showPeaks', event.target.checked)}
        />
        <span>Маркер пиковой частоты</span>
      </label>

      <label className="setting checkbox">
        <input
          type="checkbox"
          checked={settings.showHarmonics}
          disabled={disabled}
          onChange={(event) => update('showHarmonics', event.target.checked)}
        />
        <span>Показать гармоники</span>
      </label>

      {settings.showHarmonics && (
        <label className="setting">
          <span>Кол-во гармоник ({settings.harmonicCount})</span>
          <select
            value={settings.harmonicCount}
            disabled={disabled}
            onChange={(event) => update('harmonicCount', Number(event.target.value))}
          >
            {HARMONIC_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
      )}

      <h2 className="settings-section">Resynth</h2>

      <label className="setting">
        <span>Кол-во кадров ({settings.resynthFrameCount})</span>
        <select
          value={settings.resynthFrameCount}
          disabled={disabled}
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
          disabled={disabled}
          onChange={(event) => update('resynthHopRatio', Number(event.target.value))}
        >
          {RESYNTH_HOP_RATIO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <h2 className="settings-section">Воспроизведение</h2>

      <label className="setting checkbox">
        <input
          type="checkbox"
          checked={settings.loopEnabled}
          disabled={disabled || !loopRegion}
          onChange={(event) => update('loopEnabled', event.target.checked)}
        />
        <span>Loop {loopRegion ? '' : '(сначала выделите регион)'}</span>
      </label>
      {loopRegion && (
        <button
          type="button"
          className="text-button settings-clear-loop"
          disabled={disabled}
          onClick={onClearLoop}
        >
          Сбросить loop-регион
        </button>
      )}

      <label className="setting">
        <span>Частота обновления графиков ({settings.playbackFps} FPS)</span>
        <select
          value={settings.playbackFps}
          disabled={disabled}
          onChange={(event) => update('playbackFps', Number(event.target.value))}
        >
          {PLAYBACK_FPS_OPTIONS.map((fps) => (
            <option key={fps} value={fps}>{fps} FPS</option>
          ))}
        </select>
      </label>
      <p className="setting-hint">
        Waveform ~60 FPS. Спектр — с выбранным FPS. Hotkeys: Space, ←/→, L, Shift+L, R, Esc, +/-, 1/2/3/4, Ctrl+O.
      </p>
    </aside>
  );
}
