import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  X,
  Play,
  Cpu,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Waves,
  Activity,
  BarChart3,
  Keyboard,
  CheckSquare,
  Square,
  Zap,
  Trash2,
  Box
} from 'lucide-react';
import {
  TabularEngineData,
  AudioEngineData,
  VibrationEngineData,
  DiagnosticResult
} from '../../types/diagnosis';
import {
  TABULAR_PRESETS,
  AUDIO_PRESETS,
  VIBRATION_PRESETS,
  evaluateTabularData,
  evaluateAudioData,
  evaluateVibrationData,
  evaluateTabularDataViaApi,
  evaluateAudioDataViaApi,
  evaluateVibrationDataViaApi,
  parseTabularCsv
} from '../../lib/diagnosticEngine';
import { analyzeAudioFile, parseVibrationCsv as parseVibrationCsvFull } from '../../lib/signalProcessing';
import { COMPONENT_METADATA } from '../../types/engine';
import { TestingEngineCanvas } from './TestingEngineCanvas';
import { DiagnosticCharts } from './DiagnosticCharts';
import { TabularInputPanel } from './TabularInputPanel';
import { ActionableRecommendations } from './ActionableRecommendations';
import { UnifiedResultsDashboard, UnifiedResultsData } from './UnifiedResultsDashboard';
import { StreamOutputResult } from './DiagnosticOutputCards';
import { calculateEngineHealthIndex } from '../../lib/engineHealthIndex';
import { summarizeTabularCsv, summarizeManualTabularData, TabularDataSummary } from '../../lib/tabularCsvSummary';

interface TestingPageProps {
  onBackToLanding: () => void;
}

type LabState = 'UPLOAD' | 'ANALYZING' | 'RESULT';
type TabularSubMode = 'manual' | 'csv';
type ActiveTab = 'tabular' | 'audio' | 'vibration';
type ResultViewMode = 'dashboard' | 'cad';

export const TestingPage: React.FC<TestingPageProps> = ({ onBackToLanding }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tabular');
  const [labState, setLabState] = useState<LabState>('UPLOAD');
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>('dashboard');
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [showChartsDrawer, setShowChartsDrawer] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ============================================================
  // STREAM STATES (3 Independent Streams)
  // ============================================================

  // 1. Tabular Stream
  const [tabularIncluded, setTabularIncluded] = useState<boolean>(true);
  const [tabularSubMode, setTabularSubMode] = useState<TabularSubMode>('manual');
  const [tabularData, setTabularData] = useState<TabularEngineData | null>(TABULAR_PRESETS[0].data);
  const [manualTabularData, setManualTabularData] = useState<TabularEngineData | null>(TABULAR_PRESETS[0].data);
  const [tabularFile, setTabularFile] = useState<File | null>(null);
  const [tabularFileName, setTabularFileName] = useState<string>('c14ne_nominal_baseline.csv');
  const [tabularFileSize, setTabularFileSize] = useState<string>('52.4 KB');
  const [isTabularSample, setIsTabularSample] = useState<boolean>(true);

  // 2. Audio Stream
  const [audioIncluded, setAudioIncluded] = useState<boolean>(true);
  const [audioData, setAudioData] = useState<AudioEngineData | null>(AUDIO_PRESETS[0].data);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('c14ne_nominal_idle.wav');
  const [audioFileSize, setAudioFileSize] = useState<string>('780 KB');
  const [isAudioSample, setIsAudioSample] = useState<boolean>(true);

  // 3. Vibration Stream
  const [vibrationIncluded, setVibrationIncluded] = useState<boolean>(true);
  const [vibrationData, setVibrationData] = useState<VibrationEngineData | null>(VIBRATION_PRESETS[0].data);
  const [vibrationFile, setVibrationFile] = useState<File | null>(null);
  const [vibrationFileName, setVibrationFileName] = useState<string>('c14ne_triaxial_baseline.csv');
  const [vibrationFileSize, setVibrationFileSize] = useState<string>('128 KB');
  const [isVibrationSample, setIsVibrationSample] = useState<boolean>(true);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3D Canvas states
  const [explosionProgress, setExplosionProgress] = useState<number>(0.0);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);

  // Unified Diagnostic evaluation results
  const [unifiedResultsData, setUnifiedResultsData] = useState<UnifiedResultsData | null>(null);
  const [primaryDiagnosticResult, setPrimaryDiagnosticResult] = useState<DiagnosticResult | null>(null);

  // Audio preview playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);

  // Explosion progress ref for GSAP tweening
  const explosionProgressRef = useRef<number>(0.0);
  explosionProgressRef.current = explosionProgress;

  // Stream Availability Computations
  const hasTabularData = tabularSubMode === 'manual' ? (tabularData !== null) : (tabularFile !== null || tabularData !== null);
  const hasAudioData = audioFile !== null || audioData !== null;
  const hasVibrationData = vibrationFile !== null || vibrationData !== null;

  const isTabActive = tabularIncluded && hasTabularData;
  const isAudActive = audioIncluded && hasAudioData;
  const isVibActive = vibrationIncluded && hasVibrationData;

  const activeStreamsCount = (isTabActive ? 1 : 0) + (isAudActive ? 1 : 0) + (isVibActive ? 1 : 0);
  const activeStreamNames: string[] = [];
  if (isTabActive) activeStreamNames.push('Tabular');
  if (isAudActive) activeStreamNames.push('Audio');
  if (isVibActive) activeStreamNames.push('Vibration');

  // ============================================================
  // AUDIO PREVIEW
  // ============================================================
  const stopAudioPreview = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch {}
      activeSourceRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const handleToggleAudioPreview = () => {
    if (isPlayingAudio) {
      stopAudioPreview();
      return;
    }
    if (!audioData) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (audioData.audioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = audioData.audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlayingAudio(false);
        source.start(0);
        activeSourceRef.current = source;
        setIsPlayingAudio(true);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = audioData.dominantHarmonicHz > 0 ? Math.min(2000, Math.max(50, audioData.dominantHarmonicHz)) : 125;
        osc.type = freq > 1500 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        activeSourceRef.current = osc;
        setIsPlayingAudio(true);

        setTimeout(() => {
          if (activeSourceRef.current === osc) {
            try { osc.stop(); } catch {}
            setIsPlayingAudio(false);
          }
        }, Math.min(4000, (audioData.durationSeconds || 3.5) * 1000));
      }
    } catch {
      setIsPlayingAudio(false);
    }
  };

  // ============================================================
  // VIBRATION CHANNEL CHANGE
  // ============================================================
  const handleVibrationChannelChange = (ch: string) => {
    if (!vibrationData) return;

    if (vibrationData.rawCsvText) {
      const parsed = parseVibrationCsvFull(vibrationData.rawCsvText, vibrationData.sampleName, ch);
      if (parsed.success && parsed.data) {
        setVibrationData(parsed.data);
        if (unifiedResultsData) {
          setUnifiedResultsData({
            ...unifiedResultsData,
            vibrationData: parsed.data
          });
        }
        return;
      }
    }
    const updated = { ...vibrationData, selectedChannel: ch };
    setVibrationData(updated);
    if (unifiedResultsData) {
      setUnifiedResultsData({
        ...unifiedResultsData,
        vibrationData: updated
      });
    }
  };

  // ============================================================
  // QUICK BENCHMARK LOADERS (Part 1.3)
  // ============================================================
  const handleLoadNominalBenchmarks = () => {
    stopAudioPreview();
    setValidationError(null);

    // Tabular
    setTabularData(TABULAR_PRESETS[0].data);
    setManualTabularData(TABULAR_PRESETS[0].data);
    setTabularFile(null);
    setTabularFileName('c14ne_nominal_baseline.csv');
    setTabularFileSize('52.4 KB');
    setIsTabularSample(true);
    setTabularIncluded(true);

    // Audio
    setAudioData(AUDIO_PRESETS[0].data);
    setAudioFile(null);
    setAudioFileName('c14ne_nominal_idle.wav');
    setAudioFileSize('780 KB');
    setIsAudioSample(true);
    setAudioIncluded(true);

    // Vibration
    setVibrationData(VIBRATION_PRESETS[0].data);
    setVibrationFile(null);
    setVibrationFileName('c14ne_triaxial_baseline.csv');
    setVibrationFileSize('128 KB');
    setIsVibrationSample(true);
    setVibrationIncluded(true);
  };

  const handleLoadFaultBenchmarks = () => {
    stopAudioPreview();
    setValidationError(null);

    // Tabular
    setTabularData(TABULAR_PRESETS[1].data);
    setManualTabularData(TABULAR_PRESETS[1].data);
    setTabularFile(null);
    setTabularFileName('c14ne_detonation_telemetry.csv');
    setTabularFileSize('48.2 KB');
    setIsTabularSample(true);
    setTabularIncluded(true);

    // Audio
    setAudioData(AUDIO_PRESETS[1].data);
    setAudioFile(null);
    setAudioFileName('rod_knock_severe_transients.wav');
    setAudioFileSize('624 KB');
    setIsAudioSample(true);
    setAudioIncluded(true);

    // Vibration
    setVibrationData(VIBRATION_PRESETS[1].data);
    setVibrationFile(null);
    setVibrationFileName('crankshaft_radial_imbalance_1x.csv');
    setVibrationFileSize('112 KB');
    setIsVibrationSample(true);
    setVibrationIncluded(true);
  };

  const handleClearAllStreams = () => {
    stopAudioPreview();
    setValidationError(null);
    setTabularIncluded(false);
    setAudioIncluded(false);
    setVibrationIncluded(false);
  };

  // Individual Stream Preset Loaders
  const handleLoadTabularPreset = (idx: number) => {
    const preset = TABULAR_PRESETS[idx];
    setTabularData(preset.data);
    setManualTabularData(preset.data);
    setTabularFile(null);
    setTabularFileName(preset.title);
    setTabularFileSize('48 KB');
    setIsTabularSample(true);
    setTabularIncluded(true);
  };

  const handleLoadAudioPreset = (idx: number) => {
    stopAudioPreview();
    const preset = AUDIO_PRESETS[idx];
    setAudioData(preset.data);
    setAudioFile(null);
    setAudioFileName(preset.title);
    setAudioFileSize('640 KB');
    setIsAudioSample(true);
    setAudioIncluded(true);
  };

  const handleLoadVibrationPreset = (idx: number) => {
    const preset = VIBRATION_PRESETS[idx];
    setVibrationData(preset.data);
    setVibrationFile(null);
    setVibrationFileName(preset.title);
    setVibrationFileSize('112 KB');
    setIsVibrationSample(true);
    setVibrationIncluded(true);
  };

  // ============================================================
  // FILE UPLOAD PROCESSOR
  // ============================================================
  const processUploadedFile = async (file: File) => {
    stopAudioPreview();
    setValidationError(null);

    const sizeKB = Math.round(file.size / 1024);
    const sizeFormatted = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    if (activeTab === 'tabular') {
      if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
        setValidationError('Please upload a valid CSV telemetry dataset file.');
        return;
      }
      try {
        const text = await file.text();
        const parsed = parseTabularCsv(text);
        if (parsed) {
          setTabularData(parsed.data);
          setTabularFile(file);
          setTabularFileName(file.name);
          setTabularFileSize(sizeFormatted);
          setIsTabularSample(false);
          setTabularIncluded(true);
        } else {
          setValidationError('Could not parse required telemetry columns. Ensure format matches the 14-parameter telemetry schema.');
        }
      } catch (err: any) {
        setValidationError(`Failed to read CSV: ${err?.message || 'Unknown error'}`);
      }
    } else if (activeTab === 'audio') {
      if (!file.name.toLowerCase().match(/\.(wav|mp3|ogg|m4a|aac|flac)$/)) {
        setValidationError('Please upload a valid audio recording (WAV, MP3, OGG, M4A, FLAC).');
        return;
      }
      try {
        const analyzed = await analyzeAudioFile(file);
        setAudioData(analyzed);
        setAudioFile(file);
        setAudioFileName(file.name);
        setAudioFileSize(sizeFormatted);
        setIsAudioSample(false);
        setAudioIncluded(true);
      } catch (err: any) {
        console.error('Audio decoding error', err);
        setValidationError(`Unable to decode audio recording: ${err?.message || 'Unsupported format'}. Please ensure file is a valid audio file.`);
      }
    } else {
      // Vibration CSV
      if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
        setValidationError('Please upload a valid accelerometry timeseries CSV file.');
        return;
      }
      try {
        const text = await file.text();
        const parsed = parseVibrationCsvFull(text, file.name);
        if (parsed.success && parsed.data) {
          setVibrationData(parsed.data);
          setVibrationFile(file);
          setVibrationFileName(file.name);
          setVibrationFileSize(sizeFormatted);
          setIsVibrationSample(false);
          setVibrationIncluded(true);
        } else {
          setValidationError(parsed.error || 'Failed to parse vibration CSV file. Missing valid Time or Channel columns.');
        }
      } catch (err: any) {
        console.error('Vibration parsing error', err);
        setValidationError(`Failed to parse vibration CSV: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // ============================================================
  // UNIFIED EXECUTION ENGINE (Concurrent Promise.allSettled)
  // ============================================================
  const handleAnalyzeEngine = () => {
    setValidationError(null);

    if (activeStreamsCount === 0) {
      setValidationError('Please configure and include at least one diagnostic data stream (Tabular, Audio, or Vibration) to analyze.');
      return;
    }

    // Enter ANALYZING State
    setLabState('ANALYZING');
    setAnalysisStep(1);

    // Step 2 at 400ms: Animate 3D Engine Explosion
    setTimeout(() => {
      setAnalysisStep(2);
      const tweenObj = { val: explosionProgressRef.current };
      gsap.to(tweenObj, {
        val: 0.65,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: () => setExplosionProgress(tweenObj.val)
      });
    }, 400);

    // Step 3 at 900ms
    setTimeout(() => {
      setAnalysisStep(3);
    }, 900);

    // Step 4 & Final Verdict at 1400ms
    setTimeout(async () => {
      setAnalysisStep(4);

      // --- Stream 1: Tabular Promise ---
      const tabularPromise = (async (): Promise<{ output: StreamOutputResult; diag?: DiagnosticResult }> => {
        if (!isTabActive) {
          return {
            output: {
              status: 'NOT_PROVIDED',
              summary: 'Tabular sensor stream was not provided or excluded from this diagnostic run.'
            }
          };
        }

        try {
          let res: DiagnosticResult;
          if (tabularFile && tabularSubMode === 'csv') {
            res = await evaluateTabularDataViaApi(tabularFile);
          } else if (tabularData) {
            res = await evaluateTabularDataViaApi(tabularData);
          } else {
            return { output: { status: 'NOT_PROVIDED', summary: 'No tabular dataset supplied.' } };
          }

          return {
            output: {
              status: 'SUCCESS',
              rawPrediction: res.rawPredictedClass ?? res.faultTitle,
              confidence: (res.confidencePercent || 0) / 100,
              confidenceType: 'Softmax probability',
              summary: res.faultSummary,
              metadata: {
                'Predicted Class': res.rawPredictedClass ?? res.faultTitle,
                'Fault Attribution': res.faultTitle,
                'Confidence': `${res.confidencePercent}%`,
                'Affected Component': res.faultyComponentId ? COMPONENT_METADATA[res.faultyComponentId]?.name : 'None',
              }
            },
            diag: res
          };
        } catch (err: any) {
          // Fallback to local deterministic evaluator if API is unreachable
          try {
            if (tabularData) {
              const localRes = evaluateTabularData(tabularData);
              return {
                output: {
                  status: 'SUCCESS',
                  rawPrediction: localRes.rawPredictedClass ?? localRes.faultTitle,
                  confidence: (localRes.confidencePercent || 0) / 100,
                  confidenceType: 'Local heuristic fallback',
                  summary: localRes.faultSummary,
                  metadata: {
                    'Predicted Class': localRes.rawPredictedClass ?? localRes.faultTitle,
                    'Fault Attribution': localRes.faultTitle,
                    'Confidence': `${localRes.confidencePercent}%`,
                  }
                },
                diag: localRes
              };
            }
          } catch {}
          return {
            output: {
              status: 'FAILED',
              error: err?.message || 'Tabular inference failed'
            }
          };
        }
      })();

      // --- Stream 2: Audio Promise ---
      const audioPromise = (async (): Promise<{ output: StreamOutputResult; diag?: DiagnosticResult }> => {
        if (!isAudActive) {
          return {
            output: {
              status: 'NOT_PROVIDED',
              summary: 'Acoustic audio stream was not provided or excluded from this diagnostic run.'
            }
          };
        }

        try {
          let res: DiagnosticResult;
          if (audioFile) {
            res = await evaluateAudioDataViaApi(audioFile);
          } else if (audioData) {
            res = evaluateAudioData(audioData);
          } else {
            return { output: { status: 'NOT_PROVIDED', summary: 'No audio recording supplied.' } };
          }

          return {
            output: {
              status: 'SUCCESS',
              rawPrediction: res.rawPredictedClass ?? res.faultTitle,
              confidence: (res.confidencePercent || 0) / 100,
              confidenceType: 'Acoustic feature classifier',
              summary: res.faultSummary,
              metadata: {
                'Predicted Class': res.rawPredictedClass ?? res.faultTitle,
                'Fault Attribution': res.faultTitle,
                'Confidence': `${res.confidencePercent}%`,
                'Dominant Harmonic': `${audioData?.dominantHarmonicHz?.toFixed(1) || 'N/A'} Hz`,
                'Peak Level': `${audioData?.peakDb?.toFixed(1) || 'N/A'} dBFS`,
              }
            },
            diag: res
          };
        } catch (err: any) {
          if (audioData) {
            const localRes = evaluateAudioData(audioData);
            return {
              output: {
                status: 'SUCCESS',
                rawPrediction: localRes.rawPredictedClass ?? localRes.faultTitle,
                confidence: (localRes.confidencePercent || 0) / 100,
                confidenceType: 'Local heuristic fallback',
                summary: localRes.faultSummary,
              },
              diag: localRes
            };
          }
          return {
            output: {
              status: 'FAILED',
              error: err?.message || 'Audio inference failed'
            }
          };
        }
      })();

      // --- Stream 3: Vibration Promise ---
      const vibrationPromise = (async (): Promise<{ output: StreamOutputResult; diag?: DiagnosticResult }> => {
        if (!isVibActive) {
          return {
            output: {
              status: 'NOT_PROVIDED',
              summary: 'Vibration accelerometry stream was not provided or excluded from this diagnostic run.'
            }
          };
        }

        try {
          let res: DiagnosticResult;
          if (vibrationFile) {
            res = await evaluateVibrationDataViaApi(vibrationFile);
          } else if (vibrationData) {
            res = evaluateVibrationData(vibrationData);
          } else {
            return { output: { status: 'NOT_PROVIDED', summary: 'No vibration timeseries supplied.' } };
          }

          return {
            output: {
              status: 'SUCCESS',
              rawPrediction: res.rawPredictedClass ?? res.faultTitle,
              confidence: (res.confidencePercent || 0) / 100,
              confidenceType: 'Vibration dynamics classifier',
              summary: res.faultSummary,
              metadata: {
                'Predicted Class': res.rawPredictedClass ?? res.faultTitle,
                'Fault Attribution': res.faultTitle,
                'Confidence': `${res.confidencePercent}%`,
                'RMS Amplitude': `${vibrationData?.rmsAccelerationG?.toFixed(3) || 'N/A'} units`,
                'Dominant Frequency': `${vibrationData?.dominantOrderHz?.toFixed(1) || 'N/A'} Hz`,
              }
            },
            diag: res
          };
        } catch (err: any) {
          if (vibrationData) {
            const localRes = evaluateVibrationData(vibrationData);
            return {
              output: {
                status: 'SUCCESS',
                rawPrediction: localRes.rawPredictedClass ?? localRes.faultTitle,
                confidence: (localRes.confidencePercent || 0) / 100,
                confidenceType: 'Local heuristic fallback',
                summary: localRes.faultSummary,
              },
              diag: localRes
            };
          }
          return {
            output: {
              status: 'FAILED',
              error: err?.message || 'Vibration inference failed'
            }
          };
        }
      })();

      // --- Stream 4: Tabular Summary Promise (Part 3) ---
      const summaryPromise = (async (): Promise<TabularDataSummary | null> => {
        if (!isTabActive) return null;
        try {
          if (tabularSubMode === 'csv' && tabularFile) {
            const text = await tabularFile.text();
            return summarizeTabularCsv(text, tabularFileName);
          } else if (tabularData) {
            return summarizeManualTabularData(tabularData as unknown as Record<string, number>);
          }
        } catch (e) {
          console.error('Error generating tabular summary', e);
        }
        return null;
      })();

      // Concurrently settle all promises
      const [tabSettled, audSettled, vibSettled, summarySettled] = await Promise.allSettled([
        tabularPromise,
        audioPromise,
        vibrationPromise,
        summaryPromise
      ]);

      const tabResult = tabSettled.status === 'fulfilled'
        ? tabSettled.value
        : { output: { status: 'FAILED' as const, error: (tabSettled.reason as Error)?.message || 'Tabular failed' } };

      const audResult = audSettled.status === 'fulfilled'
        ? audSettled.value
        : { output: { status: 'FAILED' as const, error: (audSettled.reason as Error)?.message || 'Audio failed' } };

      const vibResult = vibSettled.status === 'fulfilled'
        ? vibSettled.value
        : { output: { status: 'FAILED' as const, error: (vibSettled.reason as Error)?.message || 'Vibration failed' } };

      const tabularSummary: TabularDataSummary | null = summarySettled.status === 'fulfilled'
        ? summarySettled.value
        : null;

      // Compute Engine Health Index (EHI) using exact Part 6 formula & weights
      const healthIndex = calculateEngineHealthIndex({
        tabularPrediction: tabResult.output.status === 'SUCCESS' ? tabResult.output.rawPrediction : null,
        audioPrediction: audResult.output.status === 'SUCCESS' ? audResult.output.rawPrediction : null,
        vibrationPrediction: vibResult.output.status === 'SUCCESS' ? vibResult.output.rawPrediction : null,
      });

      // Assemble complete Unified Results Data structure
      const unified: UnifiedResultsData = {
        timestamp: new Date().toISOString(),
        outputs: {
          tabular: tabResult.output,
          audio: audResult.output,
          vibration: vibResult.output,
        },
        tabularSummary,
        audioData: isAudActive ? audioData : null,
        vibrationData: isVibActive ? vibrationData : null,
        healthIndex,
        tabularError: tabResult.output.status === 'FAILED' ? tabResult.output.error : null,
        audioError: audResult.output.status === 'FAILED' ? audResult.output.error : null,
        vibrationError: vibResult.output.status === 'FAILED' ? vibResult.output.error : null,
      };

      setUnifiedResultsData(unified);

      // Determine primary diagnosed fault for 3D engine canvas component highlighting
      const primaryDiag = tabResult.diag || vibResult.diag || audResult.diag || null;
      setPrimaryDiagnosticResult(primaryDiag);

      if (primaryDiag?.faultyComponentId && COMPONENT_METADATA[primaryDiag.faultyComponentId]) {
        setHighlightedComponentId(primaryDiag.faultyComponentId);
        setSelectedComponentId(primaryDiag.faultyComponentId);
      } else {
        setHighlightedComponentId(null);
        setSelectedComponentId(null);
      }

      setIsAutoRotating(false);

      // Transition to RESULT state
      setTimeout(() => {
        setLabState('RESULT');
        setResultViewMode('dashboard');
      }, 350);
    }, 1400);
  };

  // Reset to Idle & Reassemble Engine
  const handleRunAnotherTest = () => {
    stopAudioPreview();
    const tweenObj = { val: explosionProgressRef.current };
    gsap.to(tweenObj, {
      val: 0.0,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => setExplosionProgress(tweenObj.val),
      onComplete: () => {
        setHighlightedComponentId(null);
        setSelectedComponentId(null);
        setIsAutoRotating(true);
      }
    });

    setLabState('UPLOAD');
    setResultViewMode('dashboard');
    setShowChartsDrawer(false);
    setUnifiedResultsData(null);
    setPrimaryDiagnosticResult(null);
  };

  const handleEditInputs = () => {
    stopAudioPreview();
    const tweenObj = { val: explosionProgressRef.current };
    gsap.to(tweenObj, {
      val: 0.0,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => setExplosionProgress(tweenObj.val),
      onComplete: () => {
        setHighlightedComponentId(null);
        setSelectedComponentId(null);
        setIsAutoRotating(true);
      }
    });

    setLabState('UPLOAD');
    setShowChartsDrawer(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08090A] text-[#F1F2F3] font-sans select-none">
      {/* ============================================================ */}
      {/* 1. FULL-SCREEN 3D ENGINE CANVAS (Visual Background Layer)   */}
      {/* ============================================================ */}
      <div className="absolute inset-0 w-full h-full z-0">
        <TestingEngineCanvas
          explosionProgress={explosionProgress}
          onExplosionChange={setExplosionProgress}
          highlightedComponentId={highlightedComponentId}
          selectedComponentId={selectedComponentId}
          onSelectComponent={setSelectedComponentId}
          hoveredComponentId={hoveredComponentId}
          onHoverComponent={setHoveredComponentId}
          isAutoRotating={isAutoRotating}
          onToggleAutoRotate={() => setIsAutoRotating(!isAutoRotating)}
          isFaultDiagnosed={labState === 'RESULT'}
        />
      </div>

      {/* ============================================================ */}
      {/* 2. TOP HEADER NAVIGATION BAR                                 */}
      {/* ============================================================ */}
      <header className="absolute top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 sm:gap-4 pointer-events-auto">
          <button
            onClick={() => {
              stopAudioPreview();
              onBackToLanding();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101214]/85 hover:bg-[#171A1D] backdrop-blur-md border border-[#292D31] text-xs font-mono text-[#A4A9AF] hover:text-[#F1F2F3] transition shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <div className="h-4 w-[1px] bg-[#292D31] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#F1F2F3]">
              EnginePulse <span className="text-[#D66A32]">Diagnostic Lab</span>
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {labState === 'RESULT' && (
            <div className="flex items-center bg-[#101214]/90 backdrop-blur-md border border-[#292D31] p-1 rounded-xl shadow-lg">
              <button
                onClick={() => setResultViewMode('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  resultViewMode === 'dashboard'
                    ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32]/60 font-semibold shadow-sm'
                    : 'text-[#737A82] hover:text-[#A4A9AF]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#D66A32]" />
                <span>Diagnostic Report</span>
              </button>
              <button
                onClick={() => setResultViewMode('cad')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  resultViewMode === 'cad'
                    ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32]/60 font-semibold shadow-sm'
                    : 'text-[#737A82] hover:text-[#A4A9AF]'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-[#D66A32]" />
                <span>3D Engine View</span>
              </button>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101214]/85 backdrop-blur-md border border-[#292D31] text-xs font-mono shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#737A82]">Inference:</span>
            <span className="text-[#F1F2F3] font-medium">Kinematic Edge v2.4</span>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 3. RESULT STATE: FULL DASHBOARD VIEW (Part 8 Exact Order)    */}
      {/* ============================================================ */}
      {labState === 'RESULT' && resultViewMode === 'dashboard' && unifiedResultsData && (
        <div className="absolute inset-0 top-14 z-30 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <UnifiedResultsDashboard
              data={unifiedResultsData}
              onEditInputs={handleEditInputs}
              onRunAnotherTest={handleRunAnotherTest}
              onSelectVibrationChannel={handleVibrationChannelChange}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. FLOATING CONTROL PANEL (UPLOAD / ANALYZING / 3D CAD VIEW)  */}
      {/* ============================================================ */}
      {!(labState === 'RESULT' && resultViewMode === 'dashboard') && (
        <div className="absolute top-16 sm:top-20 left-4 sm:left-8 z-30 w-[380px] sm:w-[460px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar pointer-events-auto">
          <div className="bg-[#101214]/90 backdrop-blur-md border border-[#292D31] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">

            {/* Header Title */}
            <div>
              <div className="text-[10px] font-mono text-[#D66A32] font-bold tracking-widest uppercase flex items-center gap-1.5">
                <span>MULTI-STREAM DIAGNOSTIC WORKSPACE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D66A32]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#F1F2F3] tracking-tight mt-0.5">
                {labState === 'RESULT' ? 'Diagnostic Verdict' : 'Configure Engine Inputs'}
              </h2>
              {labState === 'UPLOAD' && (
                <p className="text-[11px] text-[#737A82] font-mono mt-0.5">
                  Supply 1, 2, or all 3 streams. Universal engine analysis will evaluate active streams.
                </p>
              )}
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{validationError}</p>
              </div>
            )}

            {/* ============================================================ */}
            {/* STATE 1: UPLOAD & STREAM CONFIGURATION WORKSPACE            */}
            {/* ============================================================ */}
            {labState === 'UPLOAD' && (
              <div className="space-y-4">

                {/* Quick Benchmark Loaders (Part 1.3) */}
                <div className="bg-[#0C0E10] p-2.5 rounded-xl border border-[#292D31] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#737A82]">
                    <span className="flex items-center gap-1 uppercase tracking-wider font-semibold">
                      <Zap className="w-3 h-3 text-[#D66A32]" />
                      Quick Benchmark Loaders:
                    </span>
                    <button
                      onClick={handleClearAllStreams}
                      className="hover:text-red-400 transition cursor-pointer flex items-center gap-0.5"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <button
                      onClick={handleLoadNominalBenchmarks}
                      className="py-1.5 px-2.5 rounded-lg bg-[#171A1D] hover:bg-[#292D31] border border-[#292D31] hover:border-emerald-500/40 text-[#A4A9AF] hover:text-emerald-300 transition text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nominal (All 3)</span>
                    </button>
                    <button
                      onClick={handleLoadFaultBenchmarks}
                      className="py-1.5 px-2.5 rounded-lg bg-[#171A1D] hover:bg-[#292D31] border border-[#292D31] hover:border-[#D66A32]/60 text-[#A4A9AF] hover:text-[#F1F2F3] transition text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D66A32]" />
                      <span>Faults (All 3)</span>
                    </button>
                  </div>
                </div>

                {/* Stream Switcher Tabs with Live Status Badges */}
                <div className="grid grid-cols-3 gap-1.5 bg-[#0C0E10] p-1 rounded-xl border border-[#292D31]">
                  {/* Tab 1: Tabular */}
                  <button
                    onClick={() => { setActiveTab('tabular'); setValidationError(null); }}
                    className={`py-2 px-1 text-center rounded-lg text-[11px] font-mono font-medium transition cursor-pointer relative ${
                      activeTab === 'tabular'
                        ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32] shadow-sm'
                        : 'text-[#737A82] hover:text-[#A4A9AF]'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 mx-auto mb-1 text-[#D66A32]" />
                    <span className="block font-semibold">Tabular</span>
                    <span className="text-[9px] block mt-0.5">
                      {isTabActive ? (
                        <span className="text-emerald-400 font-bold">● Ready</span>
                      ) : hasTabularData ? (
                        <span className="text-[#737A82]">○ Off</span>
                      ) : (
                        <span className="text-amber-400">△ Empty</span>
                      )}
                    </span>
                  </button>

                  {/* Tab 2: Audio */}
                  <button
                    onClick={() => { setActiveTab('audio'); setValidationError(null); }}
                    className={`py-2 px-1 text-center rounded-lg text-[11px] font-mono font-medium transition cursor-pointer relative ${
                      activeTab === 'audio'
                        ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32] shadow-sm'
                        : 'text-[#737A82] hover:text-[#A4A9AF]'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5 mx-auto mb-1 text-[#D66A32]" />
                    <span className="block font-semibold">Audio</span>
                    <span className="text-[9px] block mt-0.5">
                      {isAudActive ? (
                        <span className="text-emerald-400 font-bold">● Ready</span>
                      ) : hasAudioData ? (
                        <span className="text-[#737A82]">○ Off</span>
                      ) : (
                        <span className="text-amber-400">△ Empty</span>
                      )}
                    </span>
                  </button>

                  {/* Tab 3: Vibration */}
                  <button
                    onClick={() => { setActiveTab('vibration'); setValidationError(null); }}
                    className={`py-2 px-1 text-center rounded-lg text-[11px] font-mono font-medium transition cursor-pointer relative ${
                      activeTab === 'vibration'
                        ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32] shadow-sm'
                        : 'text-[#737A82] hover:text-[#A4A9AF]'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 mx-auto mb-1 text-[#D66A32]" />
                    <span className="block font-semibold">Vibration</span>
                    <span className="text-[9px] block mt-0.5">
                      {isVibActive ? (
                        <span className="text-emerald-400 font-bold">● Ready</span>
                      ) : hasVibrationData ? (
                        <span className="text-[#737A82]">○ Off</span>
                      ) : (
                        <span className="text-amber-400">△ Empty</span>
                      )}
                    </span>
                  </button>
                </div>

                {/* Active Stream Inclusion Toggle & Title */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0C0E10] border border-[#292D31]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (activeTab === 'tabular') setTabularIncluded(!tabularIncluded);
                        else if (activeTab === 'audio') setAudioIncluded(!audioIncluded);
                        else setVibrationIncluded(!vibrationIncluded);
                      }}
                      className="cursor-pointer text-[#D66A32]"
                    >
                      {(activeTab === 'tabular' ? tabularIncluded : activeTab === 'audio' ? audioIncluded : vibrationIncluded) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[#737A82]" />
                      )}
                    </button>
                    <span className="text-xs font-mono font-medium text-[#F1F2F3]">
                      Include {activeTab === 'tabular' ? 'Tabular Sensors' : activeTab === 'audio' ? 'Audio Acoustics' : 'Vibration Dynamics'} in Diagnosis
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    (activeTab === 'tabular' ? isTabActive : activeTab === 'audio' ? isAudActive : isVibActive)
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#171A1D] border-[#292D31] text-[#737A82]'
                  }`}>
                    {(activeTab === 'tabular' ? isTabActive : activeTab === 'audio' ? isAudActive : isVibActive)
                      ? 'Active'
                      : 'Excluded'}
                  </span>
                </div>

                {/* ------------------------------------------------------------ */}
                {/* TAB 1 CONTENT: TABULAR SENSORS                               */}
                {/* ------------------------------------------------------------ */}
                {activeTab === 'tabular' && (
                  <div className="space-y-3">
                    {/* Sub-Mode Toggle: Manual vs CSV */}
                    <div className="grid grid-cols-2 gap-1 bg-[#0C0E10] p-0.5 rounded-lg border border-[#292D31]">
                      <button
                        onClick={() => { setTabularSubMode('manual'); setValidationError(null); }}
                        className={`py-1.5 px-2 text-center rounded-md text-[10px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          tabularSubMode === 'manual'
                            ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32]/50 shadow-sm'
                            : 'text-[#737A82] hover:text-[#A4A9AF]'
                        }`}
                      >
                        <Keyboard className="w-3 h-3" />
                        Manual 14-Sensor Entry
                      </button>
                      <button
                        onClick={() => { setTabularSubMode('csv'); setValidationError(null); }}
                        className={`py-1.5 px-2 text-center rounded-md text-[10px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          tabularSubMode === 'csv'
                            ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32]/50 shadow-sm'
                            : 'text-[#737A82] hover:text-[#A4A9AF]'
                        }`}
                      >
                        <UploadCloud className="w-3 h-3" />
                        Upload CSV
                      </button>
                    </div>

                    {/* Manual 14-Sensor Input Form */}
                    {tabularSubMode === 'manual' && (
                      <TabularInputPanel
                        hideSubmitButton={true}
                        initialData={manualTabularData || tabularData}
                        onChange={(data: TabularEngineData) => {
                          setTabularData(data);
                          setManualTabularData(data);
                          setTabularIncluded(true);
                        }}
                      />
                    )}

                    {/* CSV Upload Mode */}
                    {tabularSubMode === 'csv' && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              processUploadedFile(e.target.files[0]);
                            }
                          }}
                        />

                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                            isDragOver
                              ? 'border-[#D66A32] bg-[#D66A32]/10'
                              : 'border-[#292D31] hover:border-[#737A82] bg-[#0C0E10]/50'
                          }`}
                        >
                          <UploadCloud className="w-8 h-8 text-[#D66A32] mx-auto mb-2" />
                          <p className="text-xs font-medium text-[#F1F2F3]">
                            Drag and drop your telemetry CSV file here
                          </p>
                          <p className="text-[10px] text-[#737A82] font-mono mt-1">
                            or <span className="text-[#D66A32] underline">click to browse</span> (max 50MB)
                          </p>
                        </div>

                        {/* File Card */}
                        {tabularFileName && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0C0E10] border border-[#292D31] text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-[#D66A32] flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-mono text-[#F1F2F3] truncate text-[11px] font-semibold">
                                  {tabularFileName}
                                </p>
                                <p className="text-[10px] text-[#737A82] font-mono">
                                  {tabularFileSize} • {isTabularSample ? 'Benchmark Sample' : 'User Upload'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setTabularFile(null);
                                setTabularFileName('');
                                setTabularData(null);
                              }}
                              className="p-1 rounded-md text-[#737A82] hover:text-[#F1F2F3] hover:bg-[#171A1D] transition cursor-pointer"
                              title="Clear tabular file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Sample Buttons */}
                        <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                          <span className="text-[#737A82]">Tabular Presets:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLoadTabularPreset(1)}
                              className="text-[#D66A32] hover:text-[#D66A32]/80 underline cursor-pointer font-semibold"
                            >
                              Detonation Fault
                            </button>
                            <span className="text-[#292D31]">•</span>
                            <button
                              onClick={() => handleLoadTabularPreset(0)}
                              className="text-[#A4A9AF] hover:text-[#F1F2F3] underline cursor-pointer"
                            >
                              Nominal Baseline
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------------ */}
                {/* TAB 2 CONTENT: AUDIO ACOUSTICS                               */}
                {/* ------------------------------------------------------------ */}
                {activeTab === 'audio' && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".wav,.mp3,.ogg,.m4a,.aac,.flac,audio/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processUploadedFile(e.target.files[0]);
                        }
                      }}
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                        isDragOver
                          ? 'border-[#D66A32] bg-[#D66A32]/10'
                          : 'border-[#292D31] hover:border-[#737A82] bg-[#0C0E10]/50'
                      }`}
                    >
                      <Waves className="w-8 h-8 text-[#D66A32] mx-auto mb-2" />
                      <p className="text-xs font-medium text-[#F1F2F3]">
                        Drag and drop your audio recording (WAV, MP3) here
                      </p>
                      <p className="text-[10px] text-[#737A82] font-mono mt-1">
                        or <span className="text-[#D66A32] underline">click to browse</span> (max 50MB)
                      </p>
                    </div>

                    {/* Audio Info Card & Audition Preview */}
                    {audioData && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0C0E10] border border-[#292D31] text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-[#D66A32] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-mono text-[#F1F2F3] truncate text-[11px] font-semibold">
                                {audioFileName}
                              </p>
                              <p className="text-[10px] text-[#737A82] font-mono">
                                {audioFileSize} • {isAudioSample ? 'Benchmark Sample' : 'User Upload'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              stopAudioPreview();
                              setAudioFile(null);
                              setAudioFileName('');
                              setAudioData(null);
                            }}
                            className="p-1 rounded-md text-[#737A82] hover:text-[#F1F2F3] hover:bg-[#171A1D] transition cursor-pointer"
                            title="Clear audio file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Audition + Quick Metrics */}
                        <div className="bg-[#0C0E10] p-2.5 rounded-xl border border-[#292D31] flex items-center justify-between">
                          <div className="min-w-0 text-[10px] font-mono">
                            <span className="text-[#737A82] block">Acoustic Peak:</span>
                            <span className="text-[#D66A32] font-bold">{audioData.dominantHarmonicHz.toFixed(1)} Hz</span>
                            <span className="text-[#737A82]"> • {audioData.peakDb.toFixed(1)} dBFS</span>
                          </div>
                          <button
                            onClick={handleToggleAudioPreview}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition cursor-pointer ${
                              isPlayingAudio
                                ? 'bg-[#D66A32] text-white shadow-sm'
                                : 'bg-[#171A1D] hover:bg-[#292D31] text-[#F1F2F3] border border-[#292D31]'
                            }`}
                          >
                            {isPlayingAudio ? (
                              <>
                                <span className="w-2 h-2 rounded-sm bg-white" /> Stop
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" /> Audition
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Presets */}
                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                      <span className="text-[#737A82]">Audio Presets:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadAudioPreset(1)}
                          className="text-[#D66A32] hover:text-[#D66A32]/80 underline cursor-pointer font-semibold"
                        >
                          Rod Knock
                        </button>
                        <span className="text-[#292D31]">•</span>
                        <button
                          onClick={() => handleLoadAudioPreset(0)}
                          className="text-[#A4A9AF] hover:text-[#F1F2F3] underline cursor-pointer"
                        >
                          Nominal Idle
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------ */}
                {/* TAB 3 CONTENT: VIBRATION ACCELEROMETRY                      */}
                {/* ------------------------------------------------------------ */}
                {activeTab === 'vibration' && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processUploadedFile(e.target.files[0]);
                        }
                      }}
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                        isDragOver
                          ? 'border-[#D66A32] bg-[#D66A32]/10'
                          : 'border-[#292D31] hover:border-[#737A82] bg-[#0C0E10]/50'
                      }`}
                    >
                      <Activity className="w-8 h-8 text-[#D66A32] mx-auto mb-2" />
                      <p className="text-xs font-medium text-[#F1F2F3]">
                        Drag and drop your vibration CSV file here
                      </p>
                      <p className="text-[10px] text-[#737A82] font-mono mt-1">
                        or <span className="text-[#D66A32] underline">click to browse</span> (max 50MB)
                      </p>
                    </div>

                    {/* Vibration File Card & Controls */}
                    {vibrationData && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0C0E10] border border-[#292D31] text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-[#D66A32] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-mono text-[#F1F2F3] truncate text-[11px] font-semibold">
                                {vibrationFileName}
                              </p>
                              <p className="text-[10px] text-[#737A82] font-mono">
                                {vibrationFileSize} • {isVibrationSample ? 'Benchmark Sample' : 'User Upload'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setVibrationFile(null);
                              setVibrationFileName('');
                              setVibrationData(null);
                            }}
                            className="p-1 rounded-md text-[#737A82] hover:text-[#F1F2F3] hover:bg-[#171A1D] transition cursor-pointer"
                            title="Clear vibration file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Jitter Warning if any */}
                        {vibrationData.qualityWarning && (
                          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed font-mono">{vibrationData.qualityWarning}</p>
                          </div>
                        )}

                        {/* Channel Selection */}
                        {vibrationData.availableChannels && vibrationData.availableChannels.length > 1 && (
                          <div className="bg-[#0C0E10] p-2.5 rounded-xl border border-[#292D31] space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-[#A4A9AF]">Active Channel:</span>
                              <span className="text-[#D66A32] font-semibold">{vibrationData.selectedChannel || 'Channel 1'}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {vibrationData.availableChannels.map((ch) => {
                                const isActive = (vibrationData.selectedChannel || vibrationData.availableChannels![0]) === ch;
                                return (
                                  <button
                                    key={ch}
                                    onClick={() => handleVibrationChannelChange(ch)}
                                    className={`py-1 rounded text-center text-[10px] font-mono transition cursor-pointer ${
                                      isActive
                                        ? 'bg-[#D66A32] text-white font-bold'
                                        : 'bg-[#171A1D] border border-[#292D31] text-[#A4A9AF] hover:text-[#F1F2F3]'
                                    }`}
                                  >
                                    {ch}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                          <div className="bg-[#0C0E10] p-2 rounded-lg border border-[#292D31]">
                            <span className="text-[#737A82] block">RMS Amplitude:</span>
                            <span className="text-[#F1F2F3] font-bold">{vibrationData.rmsAccelerationG.toFixed(4)} units</span>
                          </div>
                          <div className="bg-[#0C0E10] p-2 rounded-lg border border-[#292D31]">
                            <span className="text-[#737A82] block">Dominant Frequency:</span>
                            <span className="text-[#D66A32] font-bold">{vibrationData.dominantOrderHz.toFixed(1)} Hz</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Presets */}
                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                      <span className="text-[#737A82]">Vibration Presets:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadVibrationPreset(1)}
                          className="text-[#D66A32] hover:text-[#D66A32]/80 underline cursor-pointer font-semibold"
                        >
                          Radial Imbalance
                        </button>
                        <span className="text-[#292D31]">•</span>
                        <button
                          onClick={() => handleLoadVibrationPreset(0)}
                          className="text-[#A4A9AF] hover:text-[#F1F2F3] underline cursor-pointer"
                        >
                          Triaxial Baseline
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================ */}
                {/* UNIFIED EXECUTION BUTTON (Part 1.4)                           */}
                {/* ============================================================ */}
                <div className="pt-2 space-y-2 border-t border-[#292D31]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#737A82]">
                    <span>Analysis Scope:</span>
                    <span className="text-[#F1F2F3] font-semibold">
                      {activeStreamsCount > 0 ? `${activeStreamsCount} of 3 Streams (${activeStreamNames.join(' + ')})` : '0 Streams Selected'}
                    </span>
                  </div>

                  <button
                    onClick={handleAnalyzeEngine}
                    disabled={activeStreamsCount === 0}
                    className={`w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg ${
                      activeStreamsCount > 0
                        ? 'bg-[#D66A32] hover:bg-[#D66A32]/90 text-white shadow-[#D66A32]/20 cursor-pointer'
                        : 'bg-[#171A1D] text-[#737A82] border border-[#292D31] cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {activeStreamsCount > 0
                        ? `Analyze My Engine (${activeStreamsCount} Stream${activeStreamsCount === 1 ? '' : 's'}) →`
                        : 'Select At Least 1 Stream'}
                    </span>
                  </button>
                </div>

              </div>
            )}

            {/* ============================================================ */}
            {/* STATE 2: ANALYZING STATE                                    */}
            {/* ============================================================ */}
            {labState === 'ANALYZING' && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 border-b border-[#292D31] pb-3">
                  <Cpu className="w-5 h-5 text-[#D66A32] animate-spin" />
                  <div>
                    <h4 className="font-bold text-[#F1F2F3] text-sm">Processing Diagnostic Streams</h4>
                    <p className="text-[10px] text-[#737A82] font-mono">
                      Evaluating {activeStreamsCount} Stream{activeStreamsCount === 1 ? '' : 's'} ({activeStreamNames.join(', ')})
                    </p>
                  </div>
                </div>

                {/* Progress Checklist */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2.5">
                    {analysisStep >= 1 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                    )}
                    <span className={analysisStep >= 1 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                      Validating active input streams
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {analysisStep > 2 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : analysisStep === 2 ? (
                      <div className="w-4 h-4 rounded-full border-2 border-[#D66A32] border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                    )}
                    <span className={analysisStep >= 2 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                      Running concurrent model inference
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {analysisStep > 3 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : analysisStep === 3 ? (
                      <div className="w-4 h-4 rounded-full border-2 border-[#D66A32] border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                    )}
                    <span className={analysisStep >= 3 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                      Exploding 3D engine & mapping fault attribution
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {analysisStep >= 4 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                    )}
                    <span className={analysisStep >= 4 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                      Calculating Engine Health Index & cross-stream consensus
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[11px] font-mono text-[#D66A32] animate-pulse">
                    Synthesizing multi-modal telemetry...
                  </span>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* STATE 3: 3D CAD INSPECTION VIEW (When in RESULT state)        */}
            {/* ============================================================ */}
            {labState === 'RESULT' && resultViewMode === 'cad' && unifiedResultsData && (
              <div className="space-y-4">
                {/* Health Index Score Badge */}
                <div className="p-3.5 rounded-xl bg-[#0C0E10] border border-[#292D31] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#737A82] block">Engine Health Index:</span>
                    <span className={`text-xl font-black font-mono ${
                      unifiedResultsData.healthIndex.score !== null && unifiedResultsData.healthIndex.score >= 80
                        ? 'text-emerald-400'
                        : unifiedResultsData.healthIndex.score !== null && unifiedResultsData.healthIndex.score >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {unifiedResultsData.healthIndex.scoreFormatted}
                      {unifiedResultsData.healthIndex.score !== null && <span className="text-xs text-[#737A82]"> / 100</span>}
                    </span>
                  </div>
                  <button
                    onClick={() => setResultViewMode('dashboard')}
                    className="px-3 py-1.5 rounded-lg bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>View Report</span>
                  </button>
                </div>

                {/* Affected Component Highlight Card */}
                {highlightedComponentId && COMPONENT_METADATA[highlightedComponentId] ? (
                  <div className="p-3 rounded-xl bg-[#0C0E10] border border-[#D66A32]/50 space-y-1">
                    <span className="text-[10px] font-mono text-[#D66A32] uppercase font-bold block">
                      Attributed Component (Exploded 3D Focus):
                    </span>
                    <p className="text-sm font-bold text-[#F1F2F3]">
                      {COMPONENT_METADATA[highlightedComponentId].name}
                    </p>
                    <p className="text-[11px] text-[#A4A9AF]">
                      {COMPONENT_METADATA[highlightedComponentId].mechanicalFunction}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#0C0E10] border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Nominal engine operation: No isolated faulty components detected.</span>
                  </div>
                )}

                {/* 3 Streams Summary Pills */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block font-semibold">
                    Stream Diagnoses:
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between p-2 rounded-lg bg-[#0C0E10] border border-[#292D31]">
                      <span className="text-[#A4A9AF]">Tabular:</span>
                      <span className={unifiedResultsData.outputs.tabular.status === 'SUCCESS' ? 'text-[#F1F2F3] font-medium' : 'text-[#737A82]'}>
                        {unifiedResultsData.outputs.tabular.status === 'SUCCESS' ? (unifiedResultsData.outputs.tabular.metadata?.['Predicted Class'] || 'Evaluated') : 'Excluded'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-[#0C0E10] border border-[#292D31]">
                      <span className="text-[#A4A9AF]">Audio:</span>
                      <span className={unifiedResultsData.outputs.audio.status === 'SUCCESS' ? 'text-[#F1F2F3] font-medium' : 'text-[#737A82]'}>
                        {unifiedResultsData.outputs.audio.status === 'SUCCESS' ? (unifiedResultsData.outputs.audio.metadata?.['Predicted Class'] || 'Evaluated') : 'Excluded'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-[#0C0E10] border border-[#292D31]">
                      <span className="text-[#A4A9AF]">Vibration:</span>
                      <span className={unifiedResultsData.outputs.vibration.status === 'SUCCESS' ? 'text-[#F1F2F3] font-medium' : 'text-[#737A82]'}>
                        {unifiedResultsData.outputs.vibration.status === 'SUCCESS' ? (unifiedResultsData.outputs.vibration.metadata?.['Predicted Class'] || 'Evaluated') : 'Excluded'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => setResultViewMode('dashboard')}
                    className="w-full py-3 px-4 rounded-xl bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#D66A32]/20"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Open Comprehensive Dashboard →</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleEditInputs}
                      className="py-2.5 px-3 rounded-xl bg-[#0C0E10] hover:bg-[#171A1D] border border-[#292D31] text-[#A4A9AF] hover:text-[#F1F2F3] text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit Inputs</span>
                    </button>
                    <button
                      onClick={handleRunAnotherTest}
                      className="py-2.5 px-3 rounded-xl bg-[#0C0E10] hover:bg-[#171A1D] border border-[#292D31] text-[#A4A9AF] hover:text-[#F1F2F3] text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>New Test</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SENSOR TELEMETRY DRAWER (When in 3D CAD mode)             */}
      {/* ============================================================ */}
      {showChartsDrawer && primaryDiagnosticResult && (
        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 z-40 max-h-[45vh] overflow-y-auto bg-[#101214]/95 backdrop-blur-xl border border-[#292D31] rounded-2xl p-5 shadow-2xl space-y-4 custom-scrollbar animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#292D31] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D66A32]" />
              <h3 className="text-sm font-bold text-[#F1F2F3]">Engineering Telemetry & Spectral Analysis</h3>
            </div>
            <button
              onClick={() => setShowChartsDrawer(false)}
              className="p-1 rounded-lg text-[#737A82] hover:text-[#F1F2F3] hover:bg-[#171A1D] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <DiagnosticCharts
                modality={activeTab}
                tabularData={tabularData || TABULAR_PRESETS[0].data}
                audioData={audioData || AUDIO_PRESETS[0].data}
                vibrationData={vibrationData || VIBRATION_PRESETS[0].data}
              />
            </div>
            <div className="lg:col-span-4">
              <ActionableRecommendations result={primaryDiagnosticResult} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
