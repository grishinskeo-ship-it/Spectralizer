import { useEffect } from 'react';

interface HotkeyActions {
  onTogglePlay: () => void;
  onSeek: (delta: number) => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLoop: () => void;
  onTabAnalysis: () => void;
  onTabVco: () => void;
  onTabPhase: () => void;
  onTabResynth: () => void;
  onOpenFile: () => void;
  onResynth: () => void;
  onClearLoop: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function useHotkeys(actions: HotkeyActions, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        actions.onTogglePlay();
        return;
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        actions.onSeek(event.shiftKey ? -1 : -0.1);
        return;
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();
        actions.onSeek(event.shiftKey ? 1 : 0.1);
        return;
      }

      if (event.code === 'Escape') {
        actions.onResetZoom();
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        actions.onZoomIn();
        return;
      }

      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        actions.onZoomOut();
        return;
      }

      if (event.key.toLowerCase() === 'l' && event.shiftKey) {
        event.preventDefault();
        actions.onClearLoop();
        return;
      }

      if (event.key.toLowerCase() === 'l') {
        actions.onToggleLoop();
        return;
      }

      if (event.key === '1') {
        actions.onTabAnalysis();
        return;
      }

      if (event.key === '4') {
        actions.onTabResynth();
        return;
      }

      if (event.key === '3') {
        actions.onTabPhase();
        return;
      }

      if (event.key === '2') {
        actions.onTabVco();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        actions.onOpenFile();
        return;
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        actions.onResynth();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, enabled]);
}
