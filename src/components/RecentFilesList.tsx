import { useEffect, useState } from 'react';
import { formatFileSize } from '../audio/formats';
import { useI18n } from '../i18n/I18nContext';
import { listRecentFiles, loadRecentFile } from '../storage/recentFiles';
import type { RecentFileEntry } from '../types';

interface RecentFilesListProps {
  onOpen: (file: File) => void;
  refreshKey: number;
}

export function RecentFilesList({ onOpen, refreshKey }: RecentFilesListProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<RecentFileEntry[]>([]);

  useEffect(() => {
    void listRecentFiles().then(setItems).catch(() => setItems([]));
  }, [refreshKey]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="recent-files">
      <span className="recent-files-title">{t('recent')}</span>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="recent-file-button"
              onClick={() => {
                void loadRecentFile(item.id).then((file) => {
                  if (file) {
                    onOpen(file);
                  }
                });
              }}
            >
              <span>{item.name}</span>
              <small>{formatFileSize(item.size)}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
