import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupportedAudioFile } from './audio/formats';
import { loadAudioFile } from './audio/loadAudio';
import { playResynthBuffer, type ResynthPreview } from './audio/resynth';
import { SpectrumAnalyzer } from './audio/spectrum';
import { FileUpload } from './components/FileUpload';
import { RecentFilesList } from './components/RecentFilesList';
import { SettingsPanel } from './components/SettingsPanel';
import { SpectrumCanvas } from './components/SpectrumCanvas';
import { PhasePanel } from './components/PhasePanel';
import { ResynthPanel } from './components/ResynthPanel';
import { TabBar } from './components/TabBar';
import { VcoModelPanel } from './components/VcoModelPanel';
import { WaveformOverview } from './components/WaveformOverview';
import { adjustFrequencyZoom } from './components/spectrumChartUtils';
import { adjustSampleZoom } from './components/resynthChartUtils';
import type { FrequencyZoom } from './components/spectrumChartUtils';
import type { SampleZoom } from './components/resynthChartUtils';
import { LanguageSwitch } from './components/LanguageSwitch';
import { useHotkeys } from './hooks/useHotkeys';
import { useI18n } from './i18n/I18nContext';
import { saveRecentFile } from './storage/recentFiles';
import { DEFAULT_SETTINGS } from './types';
import type { AnalysisSettings, AppTab, LoadedAudio, LoopRegion, SpectrumResult } from './types';
import './App.css';

function App() {
  const { t } = useI18n();
  const [audio, setAudio] = useState<LoadedAudio | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [spectrum, setSpectrum] = useState<SpectrumResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequencyZoom, setFrequencyZoom] = useState<FrequencyZoom | null>(null);
  const [resynthZoom, setResynthZoom] = useState<SampleZoom | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('analysis');
  const [loopRegion, setLoopRegion] = useState<LoopRegion | null>(null);
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const [openFileTrigger, setOpenFileTrigger] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [resynthBusy, setResynthBusy] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const resynthSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastChartUpdateRef = useRef(0);
  const liveTimeRef = useRef(0);
  const analyzerRef = useRef<SpectrumAnalyzer | null>(null);
  const loopRegionRef = useRef(loopRegion);
  const settingsRef = useRef(settings);
  const audioRef = useRef(audio);
  settingsRef.current = settings;
  loopRegionRef.current = loopRegion;
  audioRef.current = audio;

  const clearLoopRegion = useCallback(() => {
    setLoopRegion(null);
    setSettings((prev) => (prev.loopEnabled ? { ...prev, loopEnabled: false } : prev));
  }, []);

  const clearPlaybackLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const haltSource = useCallback(() => {
    const source = sourceRef.current;
    if (!source) {
      return;
    }

    source.onended = null;
    try {
      source.stop();
    } catch {
      // Уже остановлен.
    }
    sourceRef.current = null;
  }, []);

  const seekTo = useCallback((time: number, analyze = true) => {
    const duration = audioRef.current?.duration ?? 0;
    const clamped = Math.min(Math.max(time, 0), duration);
    liveTimeRef.current = clamped;
    setCurrentTime(clamped);
    if (analyze && analyzerRef.current) {
      setSpectrum(analyzerRef.current.analyze(clamped));
    }
    return clamped;
  }, []);

  const pausePlayback = useCallback(() => {
    clearPlaybackLoop();

    const source = sourceRef.current;
    const context = audioContextRef.current;

    if (source && context) {
      seekTo(context.currentTime - startedAtRef.current);
    }

    haltSource();
    setIsPlaying(false);
  }, [clearPlaybackLoop, haltSource, seekTo]);

  const stopPlayback = useCallback(() => {
    clearPlaybackLoop();
    haltSource();
    setIsPlaying(false);
  }, [clearPlaybackLoop, haltSource]);

  const handleSourceEnded = useCallback(() => {
    const currentAudio = audioRef.current;
    if (!currentAudio) {
      stopPlayback();
      return;
    }

    if (settingsRef.current.loopEnabled && loopRegionRef.current) {
      return;
    }

    seekTo(currentAudio.duration);
    sourceRef.current = null;
    clearPlaybackLoop();
    setIsPlaying(false);
  }, [clearPlaybackLoop, seekTo, stopPlayback]);

  const startPlaybackLoop = useCallback((context: AudioContext) => {
    const tick = (now: number) => {
      const currentAudio = audioRef.current;
      if (!currentAudio) {
        stopPlayback();
        return;
      }

      let time = context.currentTime - startedAtRef.current;
      liveTimeRef.current = time;

      const loop = loopRegionRef.current;
      if (settingsRef.current.loopEnabled && loop && time >= loop.end) {
        time = loop.start;
        liveTimeRef.current = time;
        setCurrentTime(time);
        setSpectrum(analyzerRef.current!.analyze(time));

        haltSource();
        const source = context.createBufferSource();
        source.buffer = currentAudio.buffer;
        source.connect(context.destination);
        source.onended = handleSourceEnded;
        source.start(0, loop.start);
        sourceRef.current = source;
        startedAtRef.current = context.currentTime - loop.start;
        lastChartUpdateRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (time >= currentAudio.duration) {
        seekTo(currentAudio.duration);
        stopPlayback();
        return;
      }

      const interval = 1000 / settingsRef.current.playbackFps;
      if (now - lastChartUpdateRef.current >= interval) {
        lastChartUpdateRef.current = now;
        setCurrentTime(time);
        setSpectrum(analyzerRef.current!.analyze(time));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [haltSource, handleSourceEnded, seekTo, stopPlayback]);

  const startPlayback = useCallback(async (fromTime?: number) => {
    const currentAudio = audioRef.current;
    if (!currentAudio || !analyzerRef.current) {
      return;
    }

    const startAt = fromTime ?? liveTimeRef.current;
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;

    if (context.state === 'suspended') {
      await context.resume();
    }

    haltSource();

    const source = context.createBufferSource();
    source.buffer = currentAudio.buffer;
    source.connect(context.destination);
    source.onended = handleSourceEnded;
    source.start(0, startAt);
    sourceRef.current = source;
    startedAtRef.current = context.currentTime - startAt;
    lastChartUpdateRef.current = 0;
    liveTimeRef.current = startAt;
    setCurrentTime(startAt);
    setIsPlaying(true);
    startPlaybackLoop(context);
  }, [haltSource, handleSourceEnded, startPlaybackLoop]);

  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      pausePlayback();
      return;
    }
    await startPlayback(currentTime);
  }, [currentTime, isPlaying, pausePlayback, startPlayback]);

  const playResynth = useCallback(async () => {
    if (!analyzerRef.current || !audioRef.current || resynthBusy) {
      return;
    }

    pausePlayback();
    setResynthBusy(true);

    try {
      const { resynthFrameCount, resynthHopRatio } = settingsRef.current;
      const samples = analyzerRef.current.resynthesizeFrames(
        liveTimeRef.current,
        resynthFrameCount,
        resynthHopRatio,
      );
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;

      if (context.state === 'suspended') {
        await context.resume();
      }

      try {
        resynthSourceRef.current?.stop();
      } catch {
        // ignore
      }
      resynthSourceRef.current = null;

      await playResynthBuffer(
        samples,
        audioRef.current.sampleRate,
        context,
        (source) => {
          resynthSourceRef.current = source;
        },
      );
    } finally {
      setResynthBusy(false);
    }
  }, [pausePlayback, resynthBusy]);

  const loadFile = useCallback(async (file: File) => {
    if (!isSupportedAudioFile(file)) {
      setError(t('errorUnsupported'));
      return;
    }

    stopPlayback();
    setLoading(true);
    setError(null);

    try {
      const loaded = await loadAudioFile(file);
      await saveRecentFile(file);
      setRecentRefreshKey((value) => value + 1);

      analyzerRef.current = new SpectrumAnalyzer(loaded.buffer, settingsRef.current);
      setFrequencyZoom(null);
      setResynthZoom(null);
      setLoopRegion(null);
      setAudio(loaded);
      liveTimeRef.current = 0;
      setCurrentTime(0);
      setSpectrum(analyzerRef.current.analyze(0));
    } catch {
      setError(t('errorDecode'));
      setAudio(null);
      setFrequencyZoom(null);
      analyzerRef.current = null;
      setSpectrum(null);
    } finally {
      setLoading(false);
    }
  }, [stopPlayback, t]);

  useEffect(() => {
    if (!audio || !analyzerRef.current) {
      return;
    }

    analyzerRef.current.updateSettings(settings);
  }, [audio, settings]);

  useEffect(() => {
    if (!audio || !analyzerRef.current || isPlaying) {
      return;
    }

    setSpectrum(analyzerRef.current.analyze(currentTime));
  }, [audio, currentTime, isPlaying, settings]);

  useEffect(() => () => {
    stopPlayback();
    void audioContextRef.current?.close();
  }, [stopPlayback]);

  const nyquist = audio ? audio.sampleRate / 2 : 22050;

  const resynthPreview = useMemo((): ResynthPreview | null => {
    if (!audio || !analyzerRef.current) {
      return null;
    }

    return analyzerRef.current.buildResynthPreview(
      currentTime,
      settings.resynthFrameCount,
      settings.resynthHopRatio,
    );
  }, [
    audio,
    currentTime,
    settings.resynthFrameCount,
    settings.resynthHopRatio,
    settings.fftSize,
    settings.windowType,
    settings.channel,
  ]);

  useEffect(() => {
    setResynthZoom(null);
  }, [resynthPreview?.plan.outputSamples]);

  const hotkeyActions = useMemo(() => ({
    onTogglePlay: () => { void togglePlayback(); },
    onSeek: (delta: number) => {
      if (isPlaying) {
        pausePlayback();
      }
      seekTo(currentTime + delta);
    },
    onResetZoom: () => {
      if (loopRegion) {
        clearLoopRegion();
        return;
      }
      if (activeTab === 'resynth' && resynthZoom) {
        setResynthZoom(null);
        return;
      }
      setFrequencyZoom(null);
    },
    onZoomIn: () => {
      if (activeTab === 'resynth' && resynthPreview) {
        setResynthZoom((zoom) => adjustSampleZoom(zoom, resynthPreview.plan.outputSamples, 0.5));
        return;
      }
      setFrequencyZoom((zoom) => adjustFrequencyZoom(zoom, nyquist, 0.5));
    },
    onZoomOut: () => {
      if (activeTab === 'resynth' && resynthPreview) {
        setResynthZoom((zoom) => adjustSampleZoom(zoom, resynthPreview.plan.outputSamples, 2));
        return;
      }
      setFrequencyZoom((zoom) => adjustFrequencyZoom(zoom, nyquist, 2));
    },
    onToggleLoop: () => {
      setSettings((prev) => {
        if (prev.loopEnabled) {
          return { ...prev, loopEnabled: false };
        }
        if (loopRegion) {
          return { ...prev, loopEnabled: true };
        }
        return prev;
      });
    },
    onClearLoop: clearLoopRegion,
    onTabAnalysis: () => setActiveTab('analysis'),
    onTabVco: () => setActiveTab('vco'),
    onTabPhase: () => setActiveTab('phase'),
    onTabResynth: () => setActiveTab('resynth'),
    onOpenFile: () => setOpenFileTrigger((value) => value + 1),
    onResynth: () => { void playResynth(); },
  }), [activeTab, clearLoopRegion, currentTime, isPlaying, loopRegion, nyquist, pausePlayback, playResynth, resynthPreview, resynthZoom, seekTo, togglePlayback]);

  useHotkeys(hotkeyActions, true);

  const infoItems = useMemo(() => {
    if (!audio || !spectrum) {
      return [];
    }

    return [
      { label: t('infoSampleRate'), value: `${audio.sampleRate} Hz` },
      { label: t('infoBins'), value: `${settings.fftSize / 2}` },
      { label: t('infoResolution'), value: `${(audio.sampleRate / settings.fftSize).toFixed(2)} Hz/bin` },
      { label: t('infoRefresh'), value: isPlaying ? t('infoRefreshLive', { value: settings.playbackFps }) : t('infoRefreshDemand') },
      { label: t('infoPeak'), value: spectrum.peakFrequency >= 1000
        ? `${(spectrum.peakFrequency / 1000).toFixed(2)} kHz`
        : `${spectrum.peakFrequency.toFixed(1)} Hz` },
    ];
  }, [audio, spectrum, settings.fftSize, settings.playbackFps, isPlaying, t]);

  return (
    <div
      className={dragActive ? 'app drag-active' : 'app'}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        const file = event.dataTransfer.files[0];
        if (file) {
          void loadFile(file);
        }
      }}
    >
      {dragActive && <div className="drop-overlay">{t('dropFile')}</div>}

      <header className="app-header">
        <div>
          <h1>Spectralizer</h1>
          {import.meta.env.MODE === 'web' && (
            <p>
              {t('webBadge')} · <a href="../">{t('docs')}</a>
              {' · '}
              <a href="https://github.com/grishinskeo-ship-it/Spectralizer/releases/tag/v1.0.0">{t('download')}</a>
            </p>
          )}
        </div>
        <div className="header-actions">
          <LanguageSwitch />
          <FileUpload
            onFileSelect={(file) => { void loadFile(file); }}
            fileName={audio?.fileName ?? null}
            loading={loading}
            error={error}
            openTrigger={openFileTrigger}
          />
          <button
            type="button"
            className="play-button"
            disabled={!audio || loading}
            onClick={() => void togglePlayback()}
          >
            {isPlaying ? t('pause') : t('play')}
          </button>
        </div>
      </header>

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      <main className="app-main">
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          disabled={!audio}
          loopRegion={loopRegion}
          onClearLoop={clearLoopRegion}
        />

        <section className="analysis-panel">
          <RecentFilesList
            refreshKey={recentRefreshKey}
            onOpen={(file) => { void loadFile(file); }}
          />

          {activeTab === 'analysis' && (
            <>
              {infoItems.length > 0 && (
                <ul className="info-bar">
                  {infoItems.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              )}

              <div className="spectrum-stack">
                <SpectrumCanvas
                  spectrum={spectrum}
                  settings={settings}
                  zoom={frequencyZoom}
                  onZoomChange={setFrequencyZoom}
                />
              </div>

              <WaveformOverview
                audio={audio}
                currentTime={currentTime}
                liveTimeRef={liveTimeRef}
                isPlaying={isPlaying}
                loopRegion={loopRegion}
                loopEnabled={settings.loopEnabled}
                onLoopRegionChange={(region) => {
                  setLoopRegion(region);
                  if (region) {
                    setSettings((prev) => ({ ...prev, loopEnabled: true }));
                  }
                }}
                onClearLoop={clearLoopRegion}
                onTimeChange={(time) => {
                  if (isPlaying) {
                    pausePlayback();
                  }
                  seekTo(time);
                }}
              />
            </>
          )}

          {activeTab === 'phase' && (
            <PhasePanel
              spectrum={spectrum}
              settings={settings}
              zoom={frequencyZoom}
            />
          )}

          {activeTab === 'resynth' && (
            <ResynthPanel
              audio={audio}
              currentTime={currentTime}
              settings={settings}
              resynthBusy={resynthBusy}
              preview={resynthPreview}
              resynthZoom={resynthZoom}
              onResynthZoomChange={setResynthZoom}
              onSettingsChange={setSettings}
              onResynth={() => { void playResynth(); }}
            />
          )}

          {activeTab === 'vco' && (
            <VcoModelPanel spectrum={spectrum} settings={settings} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
