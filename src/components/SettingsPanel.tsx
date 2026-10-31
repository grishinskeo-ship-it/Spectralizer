import { windowLabel } from '../audio/windows';
import { hopKey } from '../i18n/strings';
import { useI18n } from '../i18n/I18nContext';
import type { AnalysisSettings, LoopRegion, WindowType } from '../types';
import { FFT_SIZES, HARMONIC_COUNT_OPTIONS, PLAYBACK_FPS_OPTIONS, RESYNTH_FRAME_COUNT_OPTIONS, RESYNTH_HOP_RATIO_OPTIONS } from '../types';

interface SettingsPanelProps {
  settings: AnalysisSettings;
  onChange: (settings: AnalysisSettings) => void;
  disabled: boolean;
  loopRegion: LoopRegion | null;
  onClearLoop: () => void;
}

const WINDOW_TYPES: WindowType[] = ['rectangular', 'hanning', 'hamming', 'blackman'];

export function SettingsPanel({ settings, onChange, disabled, loopRegion, onClearLoop }: SettingsPanelProps) {
  const { t } = useI18n();
  const update = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <aside className="settings-panel">
      <h2>{t('settingsAnalysis')}</h2>

      <label className="setting">
        <span>{t('fftSize')}</span>
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
        <span>{t('window')}</span>
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
        <span>{t('channel')}</span>
        <select
          value={settings.channel}
          disabled={disabled}
          onChange={(event) => update('channel', event.target.value as AnalysisSettings['channel'])}
        >
          <option value="mono">{t('channelMono')}</option>
          <option value="left">{t('channelLeft')}</option>
          <option value="right">{t('channelRight')}</option>
        </select>
      </label>

      <label className="setting">
        <span>{t('freqScale')}</span>
        <select
          value={settings.frequencyScale}
          disabled={disabled}
          onChange={(event) => update('frequencyScale', event.target.value as AnalysisSettings['frequencyScale'])}
        >
          <option value="log">{t('freqLog')}</option>
          <option value="linear">{t('freqLinear')}</option>
        </select>
      </label>

      <label className="setting">
        <span>{t('magScale')}</span>
        <select
          value={settings.magnitudeScale}
          disabled={disabled}
          onChange={(event) => update('magnitudeScale', event.target.value as AnalysisSettings['magnitudeScale'])}
        >
          <option value="db">{t('magDb')}</option>
          <option value="linear">{t('magLinear')}</option>
        </select>
      </label>

      {settings.magnitudeScale === 'db' && (
        <>
          <label className="setting">
            <span>{t('dbMin', { value: settings.dbMin })}</span>
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
            <span>{t('dbMax', { value: settings.dbMax })}</span>
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
        <span>{t('smoothing', { value: settings.smoothing })}</span>
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
        <span>{t('showGrid')}</span>
      </label>

      <label className="setting checkbox">
        <input
          type="checkbox"
          checked={settings.showPeaks}
          disabled={disabled}
          onChange={(event) => update('showPeaks', event.target.checked)}
        />
        <span>{t('showPeak')}</span>
      </label>

      <label className="setting checkbox">
        <input
          type="checkbox"
          checked={settings.showHarmonics}
          disabled={disabled}
          onChange={(event) => update('showHarmonics', event.target.checked)}
        />
        <span>{t('showHarmonics')}</span>
      </label>

      {settings.showHarmonics && (
        <label className="setting">
          <span>{t('harmonicCount', { value: settings.harmonicCount })}</span>
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

      <h2 className="settings-section">{t('settingsResynth')}</h2>

      <label className="setting">
        <span>{t('frameCount', { value: settings.resynthFrameCount })}</span>
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
        <span>{t('hop')}</span>
        <select
          value={settings.resynthHopRatio}
          disabled={disabled}
          onChange={(event) => update('resynthHopRatio', Number(event.target.value))}
        >
          {RESYNTH_HOP_RATIO_OPTIONS.map((value) => (
            <option key={value} value={value}>{t(hopKey(value))}</option>
          ))}
        </select>
      </label>

      <h2 className="settings-section">{t('settingsPlayback')}</h2>

      <label className="setting checkbox">
        <input
          type="checkbox"
          checked={settings.loopEnabled}
          disabled={disabled || !loopRegion}
          onChange={(event) => update('loopEnabled', event.target.checked)}
        />
        <span>{loopRegion ? t('loop') : t('loopNeedRegion')}</span>
      </label>
      {loopRegion && (
        <button
          type="button"
          className="text-button settings-clear-loop"
          disabled={disabled}
          onClick={onClearLoop}
        >
          {t('clearLoopRegion')}
        </button>
      )}

      <label className="setting">
        <span>{t('playbackFps', { value: settings.playbackFps })}</span>
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
      <p className="setting-hint">{t('settingsHint')}</p>
    </aside>
  );
}
