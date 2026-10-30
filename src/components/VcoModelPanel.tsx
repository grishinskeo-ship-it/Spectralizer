import { useMemo } from 'react';
import { buildVcoModel, exportVcoModelCsv } from '../audio/vcoModel';
import type { AnalysisSettings, SpectrumResult } from '../types';

interface VcoModelPanelProps {
  spectrum: SpectrumResult | null;
  settings: AnalysisSettings;
}

export function VcoModelPanel({ spectrum, settings }: VcoModelPanelProps) {
  const model = useMemo(() => {
    if (!spectrum) {
      return null;
    }
    return buildVcoModel(spectrum, settings.harmonicCount);
  }, [spectrum, settings.harmonicCount]);

  if (!spectrum || !model) {
    return (
      <div className="vco-panel empty">
        <p>Загрузите аудио и выберите момент времени для моделирования VCO.</p>
      </div>
    );
  }

  const copyCsv = async () => {
    await navigator.clipboard.writeText(exportVcoModelCsv(model));
  };

  return (
    <div className="vco-panel">
      <div className="vco-summary">
        <div>
          <span>Fundamental</span>
          <strong>{model.fundamentalHz.toFixed(1)} Hz</strong>
        </div>
        <div>
          <span>V/Oct (C0=0 V)</span>
          <strong>{model.fundamentalVOct.toFixed(3)} V</strong>
        </div>
        <div>
          <span>Нота</span>
          <strong>{model.fundamentalNote}</strong>
        </div>
        <div>
          <span>Время среза</span>
          <strong>{spectrum.time.toFixed(2)} s</strong>
        </div>
      </div>

      <ul className="vco-notes">
        {model.rackNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      <div className="vco-table-wrap">
        <table className="vco-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Freq (Hz)</th>
              <th>Note</th>
              <th>V/Oct</th>
              <th>dB rel.</th>
              <th>Level</th>
              <th>VCV Rack</th>
            </tr>
          </thead>
          <tbody>
            {model.partials.map((row) => (
              <tr key={row.index} className={row.relativeDb > -24 ? 'strong' : ''}>
                <td>{row.label}</td>
                <td>{row.frequency.toFixed(1)}</td>
                <td>{row.noteName}</td>
                <td>{row.vOct.toFixed(3)}</td>
                <td>{row.relativeDb.toFixed(1)}</td>
                <td>
                  <div className="level-bar">
                    <div className="level-fill" style={{ width: `${row.normalizedLevel * 100}%` }} />
                  </div>
                </td>
                <td>{row.vcvHint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="upload-button" onClick={() => void copyCsv()}>
        Копировать CSV
      </button>
    </div>
  );
}
