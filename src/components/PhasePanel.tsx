import { PhaseCanvas } from './PhaseCanvas';
import type { FrequencyZoom } from './spectrumChartUtils';
import type { AnalysisSettings, SpectrumResult } from '../types';

interface PhasePanelProps {
  spectrum: SpectrumResult | null;
  settings: AnalysisSettings;
  zoom: FrequencyZoom | null;
}

export function PhasePanel({ spectrum, settings, zoom }: PhasePanelProps) {
  if (!spectrum) {
    return (
      <div className="phase-tab-panel empty">
        <p>Загрузите аудио и выберите момент времени для просмотра фазы.</p>
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
