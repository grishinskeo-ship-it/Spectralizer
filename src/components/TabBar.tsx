import type { AppTab } from '../types';

interface TabBarProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

const TABS: { id: AppTab; label: string; hint: string }[] = [
  { id: 'analysis', label: 'Анализ', hint: '1' },
  { id: 'vco', label: 'VCV VCO', hint: '2' },
  { id: 'phase', label: 'Фаза', hint: '3' },
  { id: 'resynth', label: 'Resynth', hint: '4' },
];

export function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Режимы приложения">
      {TABS.map((tab) => (
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
