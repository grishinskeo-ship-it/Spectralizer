import { useI18n } from '../i18n/I18nContext';
import { PhaseCanvas } from './PhaseCanvas';
import type { FrequencyZoom } from './spectrumChartUtils';
import type { AnalysisSettings, SpectrumResult } from '../types';

interface PhasePanelProps {
  spectrum: SpectrumResult | null;
  settings: AnalysisSettings;
  zoom: FrequencyZoom | null;
}

export function PhasePanel({ spectrum, settings, zoom }: PhasePanelProps) {
  const { t } = useI18n();
  if (!spectrum) {
    return (
      <div className="phase-tab-panel empty">
        <p>{t('phaseEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="phase-tab-panel">
      <PhaseCanvas
        spectrum={spectrum}
        settings={settings}
        zoom={zoom}
      />
    </div>
  );
}
