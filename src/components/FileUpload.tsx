import { useEffect, useRef } from 'react';
import { AUDIO_ACCEPT } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileName: string | null;
  loading: boolean;
  error: string | null;
  openTrigger?: number;
}

export function FileUpload({ onFileSelect, fileName, loading, error, openTrigger = 0 }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openTrigger > 0) {
      inputRef.current?.click();
    }
  }, [openTrigger]);

  return (
    <div className="file-upload">
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFileSelect(file);
          }
          event.target.value = '';
        }}
      />
      <button
        type="button"
        className="upload-button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? 'Загрузка…' : 'Открыть аудио'}
      </button>
      {fileName && <span className="file-name">{fileName}</span>}
      {error && <span className="file-error">{error}</span>}
    </div>
  );
}
