import { useMemo } from 'react';
import { buildVcoModel, exportVcoModelCsv } from '../audio/vcoModel';
import { useI18n } from '../i18n/I18nContext';
import type { AnalysisSettings, SpectrumResult } from '../types';

interface VcoModelPanelProps {
  spectrum: SpectrumResult | null;
  settings: AnalysisSettings;
}

export function VcoModelPanel({ spectrum, settings }: VcoModelPanelProps) {
  const { t, lang } = useI18n();
  const model = useMemo(() => {
    if (!spectrum) {
      return null;
    }
    return buildVcoModel(spectrum, settings.harmonicCount, lang);
  }, [spectrum, settings.harmonicCount, lang]);

  if (!spectrum || !model) {
    return (
      <div className="vco-panel empty">
        <p>{t('vcoEmpty')}</p>
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
          <span>{t('vcoFundamental')}</span>
          <strong>{model.fundamentalHz.toFixed(1)} Hz</strong>
        </div>
        <div>
          <span>{t('vcoVoct')}</span>
          <strong>{model.fundamentalVOct.toFixed(3)} V</strong>
        </div>
        <div>
          <span>{t('vcoNote')}</span>
          <strong>{model.fundamentalNote}</strong>
        </div>
        <div>
          <span>{t('vcoTime')}</span>
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
              <th>{t('vcoColHash')}</th>
              <th>{t('vcoColFreq')}</th>
              <th>{t('vcoColNote')}</th>
              <th>{t('vcoColVoct')}</th>
              <th>{t('vcoColDb')}</th>
              <th>{t('vcoColLevel')}</th>
              <th>{t('vcoColRack')}</th>
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
        {t('vcoCopyCsv')}
      </button>
    </div>
  );
}
