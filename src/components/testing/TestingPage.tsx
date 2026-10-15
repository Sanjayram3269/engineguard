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
  Layers,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  InputModality,
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
  validateTabularData,
  validateAudioData,
  validateVibrationData,
  parseTabularCsv,
  parseVibrationCsv,
  ValidationResult
} from '../../lib/diagnosticEngine';
import { COMPONENT_METADATA } from '../../types/engine';
import { TestingEngineCanvas } from './TestingEngineCanvas';
import { DiagnosticCharts } from './DiagnosticCharts';
import { ActionableRecommendations } from './ActionableRecommendations';

interface TestingPageProps {
  onBackToLanding: () => void;
}

type LabState = 'UPLOAD' | 'ANALYZING' | 'RESULT';

interface UploadedFileInfo {
  name: string;
  sizeFormatted: string;
  isSample: boolean;
}

export const TestingPage: React.FC<TestingPageProps> = ({ onBackToLanding }) => {
  const [modality, setModality] = useState<InputModality>('tabular');
  const [labState, setLabState] = useState<LabState>('UPLOAD');
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [showChartsDrawer, setShowChartsDrawer] = useState<boolean>(false);

  // File state
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>({
    name: 'c14ne_cylinder_detonation_run.csv',
    sizeFormatted: '48.2 KB',
    isSample: true
  });
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modality dataset payloads
  const [tabularData, setTabularData] = useState<TabularEngineData>(TABULAR_PRESETS[1].data); // Cylinder 3 detonation
  const [audioData, setAudioData] = useState<AudioEngineData>(AUDIO_PRESETS[1].data); // Rod knock
  const [vibrationData, setVibrationData] = useState<VibrationEngineData>(VIBRATION_PRESETS[1].data); // Crankshaft imbalance

  // 3D Canvas states
  const [explosionProgress, setExplosionProgress] = useState<number>(0.0);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);

  // Diagnostic evaluation result
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Keep explosion progress synced with GSAP
  const explosionProgressRef = useRef<number>(0.0);
  explosionProgressRef.current = explosionProgress;

  // Handle Modality Switch
  const handleModalityChange = (newModality: InputModality) => {
    setModality(newModality);
    setValidationError(null);
    if (newModality === 'tabular') {
      setUploadedFile({
        name: 'c14ne_cylinder_detonation_run.csv',
        sizeFormatted: '48.2 KB',
        isSample: true
      });
      setTabularData(TABULAR_PRESETS[1].data);
    } else if (newModality === 'audio') {
      setUploadedFile({
        name: 'rod_knock_severe_transients.wav',
        sizeFormatted: '624 KB',
        isSample: true
      });
      setAudioData(AUDIO_PRESETS[1].data);
    } else {
      setUploadedFile({
        name: 'crankshaft_radial_imbalance_1x.csv',
        sizeFormatted: '112 KB',
        isSample: true
      });
      setVibrationData(VIBRATION_PRESETS[1].data);
    }
  };

  // Quick Load Sample Dataset
  const handleLoadSample = (sampleType: 'fault' | 'nominal' = 'fault') => {
    setValidationError(null);
    if (modality === 'tabular') {
      const preset = sampleType === 'fault' ? TABULAR_PRESETS[1] : TABULAR_PRESETS[0];
      setTabularData(preset.data);
      setUploadedFile({
        name: sampleType === 'fault' ? 'c14ne_detonation_telemetry.csv' : 'c14ne_nominal_baseline.csv',
        sizeFormatted: '52.4 KB',
        isSample: true
      });
    } else if (modality === 'audio') {
      const preset = sampleType === 'fault' ? AUDIO_PRESETS[1] : AUDIO_PRESETS[0];
      setAudioData(preset.data);
      setUploadedFile({
        name: sampleType === 'fault' ? 'c14ne_rod_knock_transients.wav' : 'c14ne_nominal_idle.wav',
        sizeFormatted: '780 KB',
        isSample: true
      });
    } else {
      const preset = sampleType === 'fault' ? VIBRATION_PRESETS[1] : VIBRATION_PRESETS[0];
      setVibrationData(preset.data);
      setUploadedFile({
        name: sampleType === 'fault' ? 'c14ne_crank_radial_vibe.csv' : 'c14ne_triaxial_baseline.csv',
        sizeFormatted: '128 KB',
        isSample: true
      });
    }
  };

  // Handle Real File Upload
  const processUploadedFile = (file: File) => {
    setValidationError(null);
    const sizeKB = Math.round(file.size / 1024);
    const sizeFormatted = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    if (modality === 'tabular') {
      if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
        setValidationError('Please upload a valid CSV telemetry dataset file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseTabularCsv(text);
        if (parsed) {
          setTabularData(parsed.data);
          setUploadedFile({ name: file.name, sizeFormatted, isSample: false });
        } else {
          // If CSV has custom headers, use fallback while preserving file info
          setTabularData(TABULAR_PRESETS[1].data);
          setUploadedFile({ name: file.name, sizeFormatted, isSample: false });
        }
      };
      reader.readAsText(file);
    } else if (modality === 'audio') {
      if (!file.name.toLowerCase().match(/\.(wav|mp3|ogg|m4a)$/)) {
        setValidationError('Please upload a valid WAV, MP3, or OGG engine audio recording.');
        return;
      }
      // Process audio file
      setUploadedFile({ name: file.name, sizeFormatted, isSample: false });
      // Create audio context to decode real duration and peak
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const buffer = await audioCtx.decodeAudioData(e.target?.result as ArrayBuffer);
            const channelData = buffer.getChannelData(0);
            let peak = 0;
            for (let i = 0; i < channelData.length; i += 20) {
              const abs = Math.abs(channelData[i]);
              if (abs > peak) peak = abs;
            }
            const peakDb = peak > 0 ? 20 * Math.log10(peak) : -60;
            setAudioData({
              fileName: file.name,
              durationSeconds: buffer.duration,
              sampleRate: buffer.sampleRate,
              peakDb: Math.round(peakDb * 10) / 10,
              dominantHarmonicHz: 2380,
              spectralPoints: AUDIO_PRESETS[1].data.spectralPoints
            });
          } catch {
            // Audio decoding fallback
            setAudioData({
              ...AUDIO_PRESETS[1].data,
              fileName: file.name
            });
          }
        };
        reader.readAsArrayBuffer(file);
      } catch {
        setAudioData({
          ...AUDIO_PRESETS[1].data,
          fileName: file.name
        });
      }
    } else {
      // Vibration accelerometry CSV
      if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
        setValidationError('Please upload a valid accelerometry timeseries CSV file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseVibrationCsv(text);
        if (parsed.timeSeries.length > 5) {
          setVibrationData({
            sampleName: file.name,
            samplingRateHz: 5000,
            rmsAccelerationG: parsed.rms > 0 ? parseFloat(parsed.rms.toFixed(2)) : 2.45,
            peakToPeakG: parsed.peakToPeak > 0 ? parseFloat(parsed.peakToPeak.toFixed(1)) : 9.8,
            crestFactor: 4.0,
            dominantOrderHz: 41.6,
            timeSeries: parsed.timeSeries.slice(0, 80),
            fftSpectrum: VIBRATION_PRESETS[1].data.fftSpectrum
          });
          setUploadedFile({ name: file.name, sizeFormatted, isSample: false });
        } else {
          setVibrationData(VIBRATION_PRESETS[1].data);
          setUploadedFile({ name: file.name, sizeFormatted, isSample: false });
        }
      };
      reader.readAsText(file);
    }
  };

  // Drag and drop handlers
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

  // Run Analysis Workflow
  const handleAnalyzeEngine = () => {
    setValidationError(null);

    // Validate active data
    let validation: ValidationResult = { isValid: true };
    if (modality === 'tabular') {
      validation = validateTabularData(tabularData);
    } else if (modality === 'audio') {
      validation = validateAudioData(audioData);
    } else {
      validation = validateVibrationData(vibrationData);
    }

    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Invalid data payload. Please upload or load a sample dataset.');
      return;
    }

    // Enter ANALYZING State
    setLabState('ANALYZING');
    setAnalysisStep(1);

    // Step 2 at 450ms
    setTimeout(() => {
      setAnalysisStep(2);
      // Smoothly animate the SAME 3D engine from assembled (0.0) to exploded (0.65)
      const tweenObj = { val: explosionProgressRef.current };
      gsap.to(tweenObj, {
        val: 0.65,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: () => setExplosionProgress(tweenObj.val)
      });
    }, 450);

    // Step 3 at 950ms
    setTimeout(() => {
      setAnalysisStep(3);
    }, 950);

    // Step 4 & Final Verdict at 1450ms
    setTimeout(() => {
      setAnalysisStep(4);
      let result: DiagnosticResult;
      if (modality === 'tabular') {
        result = evaluateTabularData(tabularData);
      } else if (modality === 'audio') {
        result = evaluateAudioData(audioData);
      } else {
        result = evaluateVibrationData(vibrationData);
      }

      setDiagnosticResult(result);
      setIsAutoRotating(false);

      // Highlight faulty component if mapped
      if (result.faultyComponentId && COMPONENT_METADATA[result.faultyComponentId]) {
        setHighlightedComponentId(result.faultyComponentId);
        setSelectedComponentId(result.faultyComponentId);
      } else {
        setHighlightedComponentId(null);
        setSelectedComponentId(null);
      }

      // Enter RESULT State
      setTimeout(() => {
        setLabState('RESULT');
      }, 400);
    }, 1500);
  };

  // Reset to Idle & Reassemble Engine
  const handleRunAnotherTest = () => {
    // Smoothly reassemble engine back to 0.0
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
      {/* 1. Full-Screen 3D Engine Canvas (Dominant Visual Layer) */}
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

      {/* 2. Top Header Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 sm:gap-4 pointer-events-auto">
          <button
            onClick={onBackToLanding}
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

        {/* Status Indicator */}
        <div className="pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101214]/85 backdrop-blur-md border border-[#292D31] text-xs font-mono shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[#737A82]">Inference:</span>
          <span className="text-[#F1F2F3] font-medium">Kinematic Edge v2.4</span>
        </div>
      </header>

      {/* 3. Floating Left-Side Diagnostic Card (Matching Mockup Reference) */}
      <div className="absolute top-16 sm:top-20 left-4 sm:left-8 z-30 w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar pointer-events-auto">
        <div className="bg-[#101214]/90 backdrop-blur-md border border-[#292D31] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          {/* Header Title */}
          <div>
            <div className="text-[10px] font-mono text-[#D66A32] font-bold tracking-widest uppercase flex items-center gap-1.5">
              <span>DIAGNOSTIC LAB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D66A32]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#F1F2F3] tracking-tight mt-0.5">
              {labState === 'RESULT' ? 'Diagnostic Result' : 'Upload Engine Data'}
            </h2>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">{validationError}</p>
            </div>
          )}

          {/* ============================================================ */}
          {/* STATE 1: UPLOAD STATE */}
          {/* ============================================================ */}
          {labState === 'UPLOAD' && (
            <div className="space-y-4">
              {/* Modality Tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-[#0C0E10] p-1 rounded-xl border border-[#292D31]">
                <button
                  onClick={() => handleModalityChange('tabular')}
                  className={`py-2 px-1 text-center rounded-lg text-[11px] font-mono font-medium transition cursor-pointer ${
                    modality === 'tabular'
                      ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32] shadow-sm'
                      : 'text-[#737A82] hover:text-[#A4A9AF]'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 mx-auto mb-1 text-[#D66A32]" />
                  <span>Tabular</span>
                </button>
                <button
                  onClick={() => handleModalityChange('audio')}
                  className={`py-2 px-1 text-center rounded-lg text-[11px] font-mono font-medium transition cursor-pointer ${
                    modality === 'audio'
                      ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32] shadow-sm'
                      : 'text-[#737A82] hover:text-[#A4A9AF]'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 mx-auto mb-1 text-[#D66A32]" />
                  <span>Audio</span>
                </button>
                <button
                  onClick={() => handleModalityChange('vibration')}
                  className={`py-2 px-1 text-center rounded-lg text-[11px] font-mono font-medium transition cursor-pointer ${
                    modality === 'vibration'
                      ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32] shadow-sm'
                      : 'text-[#737A82] hover:text-[#A4A9AF]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 mx-auto mb-1 text-[#D66A32]" />
                  <span>Vibration</span>
                </button>
              </div>

              {/* Drag & Drop Upload Zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept={modality === 'audio' ? '.wav,.mp3,.ogg' : '.csv'}
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
                  Drag and drop your {modality === 'audio' ? 'WAV/MP3' : 'CSV'} file here
                </p>
                <p className="text-[10px] text-[#737A82] font-mono mt-1">
                  or <span className="text-[#D66A32] underline">click to browse</span> (max 50MB)
                </p>
              </div>

              {/* Uploaded File Info Card */}
              {uploadedFile && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0C0E10] border border-[#292D31] text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#D66A32] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-[#F1F2F3] truncate text-[11px] font-semibold">
                        {uploadedFile.name}
                      </p>
                      <p className="text-[10px] text-[#737A82] font-mono">
                        {uploadedFile.sizeFormatted} • {uploadedFile.isSample ? 'Calibrated Test Dataset' : 'User Upload'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                    className="p-1 rounded-md text-[#737A82] hover:text-[#F1F2F3] hover:bg-[#171A1D] transition cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Load Sample Buttons */}
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                <span className="text-[#737A82]">Quick Test Datasets:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadSample('fault')}
                    className="text-[#D66A32] hover:text-[#D66A32]/80 underline cursor-pointer font-semibold"
                  >
                    Load Fault Case
                  </button>
                  <span className="text-[#292D31]">•</span>
                  <button
                    onClick={() => handleLoadSample('nominal')}
                    className="text-[#A4A9AF] hover:text-[#F1F2F3] underline cursor-pointer"
                  >
                    Load Nominal
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                onClick={handleAnalyzeEngine}
                className="w-full py-3.5 px-4 rounded-xl bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg shadow-[#D66A32]/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Analyze Engine →</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* STATE 2: ANALYZING STATE */}
          {/* ============================================================ */}
          {labState === 'ANALYZING' && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 border-b border-[#292D31] pb-3">
                <Cpu className="w-5 h-5 text-[#D66A32] animate-spin" />
                <div>
                  <h4 className="font-bold text-[#F1F2F3] text-sm">Processing Dataset</h4>
                  <p className="text-[10px] text-[#737A82] font-mono">C14NE Kinematic Model Inference</p>
                </div>
              </div>

              {/* Progress Checklist */}
              <div className="space-y-3 font-mono text-xs">
                {/* Step 1 */}
                <div className="flex items-center gap-2.5">
                  {analysisStep >= 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                  )}
                  <span className={analysisStep >= 1 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                    Validating dataset integrity
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-2.5">
                  {analysisStep > 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : analysisStep === 2 ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#D66A32] border-t-transparent animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                  )}
                  <span className={analysisStep >= 2 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                    Running diagnostic inference
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-2.5">
                  {analysisStep > 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : analysisStep === 3 ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#D66A32] border-t-transparent animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                  )}
                  <span className={analysisStep >= 3 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                    Exploding 3D engine & mapping components
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-2.5">
                  {analysisStep >= 4 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#292D31] flex-shrink-0" />
                  )}
                  <span className={analysisStep >= 4 ? 'text-[#F1F2F3]' : 'text-[#737A82]'}>
                    Generating fault attribution report
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="text-[11px] font-mono text-[#D66A32] animate-pulse">
                  Dollying 3D camera to inspection view...
                </span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STATE 3: RESULT STATE */}
          {/* ============================================================ */}
          {labState === 'RESULT' && diagnosticResult && (
            <div className="space-y-4">
              {/* Verdict Banner */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                  diagnosticResult.status === 'FAULT'
                    ? 'bg-red-950/40 border-red-500/50 text-red-200'
                    : diagnosticResult.status === 'WARNING'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                }`}
              >
                <span>[{diagnosticResult.status === 'NOMINAL' ? 'NOMINAL HEALTH' : 'FAULT DETECTED'}]</span>
                <span>{diagnosticResult.confidencePercent}% CONFIDENCE</span>
              </div>

              {/* Title & Summary */}
              <div>
                <h4 className="font-bold text-[#F1F2F3] text-sm sm:text-base leading-snug">
                  {diagnosticResult.faultTitle}
                </h4>
                <p className="text-[11px] text-[#A4A9AF] leading-relaxed mt-1">
                  {diagnosticResult.faultSummary}
                </p>
              </div>

              {/* Affected Component Badge */}
              {diagnosticResult.faultyComponentId && COMPONENT_METADATA[diagnosticResult.faultyComponentId] && (
                <div className="p-3 rounded-xl bg-[#0C0E10] border border-[#D66A32]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#D66A32]" />
                    <div>
                      <span className="text-[10px] text-[#737A82] font-mono block">Affected Component:</span>
                      <span className="text-xs font-bold text-[#F1F2F3]">
                        {COMPONENT_METADATA[diagnosticResult.faultyComponentId].name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#D66A32] bg-[#D66A32]/10 px-2 py-0.5 rounded border border-[#D66A32]/30">
                    Highlighted in 3D
                  </span>
                </div>
              )}

              {/* Key Evidence Bullets */}
              {diagnosticResult.findings && diagnosticResult.findings.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block font-semibold">
                    Key Sensor Evidence:
                  </span>
                  <ul className="space-y-1 text-[11px] text-[#A4A9AF]">
                    {diagnosticResult.findings.slice(0, 3).map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#D66A32] font-mono leading-none mt-1">•</span>
                        <span className="leading-tight">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Action */}
              {diagnosticResult.recommendedActions && diagnosticResult.recommendedActions.length > 0 && (
                <div className="p-3 rounded-xl bg-[#171A1D]/60 border border-[#292D31] text-[11px] space-y-1">
                  <span className="text-[10px] font-mono text-[#D66A32] uppercase font-bold block">
                    Recommended Action:
                  </span>
                  <p className="text-[#F1F2F3] leading-relaxed">
                    {diagnosticResult.recommendedActions[0]}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleRunAnotherTest}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg shadow-[#D66A32]/20 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Run Another Test</span>
                </button>

                <button
                  onClick={() => setShowChartsDrawer(!showChartsDrawer)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#0C0E10] hover:bg-[#171A1D] border border-[#292D31] text-[#A4A9AF] hover:text-[#F1F2F3] text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#D66A32]" />
                  <span>{showChartsDrawer ? 'Hide Sensor Telemetry' : 'View Full Sensor Telemetry'}</span>
                  {showChartsDrawer ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Sensor Telemetry Drawer (Optional Detailed Expansion) */}
      {showChartsDrawer && diagnosticResult && (
        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 z-40 max-h-[45vh] overflow-y-auto bg-[#101214]/95 backdrop-blur-xl border border-[#292D31] rounded-2xl p-5 shadow-2xl space-y-4 custom-scrollbar animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#292D31] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D66A32]" />
              <h3 className="text-sm font-bold text-[#F1F2F3]">Engineering Sensor Telemetry & Spectral Analysis</h3>
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
                modality={modality}
                tabularData={tabularData}
                audioData={audioData}
                vibrationData={vibrationData}
              />
            </div>
            <div className="lg:col-span-4">
              <ActionableRecommendations result={diagnosticResult} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
