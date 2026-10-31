import { useI18n } from '../i18n/I18nContext';
import type { AppTab } from '../types';

interface TabBarProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabBar({ activeTab, onChange }: TabBarProps) {
  const { t } = useI18n();
  const tabs: { id: AppTab; label: string; hint: string }[] = [
    { id: 'analysis', label: t('tabAnalysis'), hint: '1' },
    { id: 'vco', label: t('tabVco'), hint: '2' },
    { id: 'phase', label: t('tabPhase'), hint: '3' },
    { id: 'resynth', label: t('tabResynth'), hint: '4' },
  ];

  return (
    <div className="tab-bar" role="tablist" aria-label={t('tablist')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? 'tab active' : 'tab'}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          <span className="tab-hint">{tab.hint}</span>
        </button>
      ))}
    </div>
  );
}
