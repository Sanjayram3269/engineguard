import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ENGINE_COMPONENTS, EngineComponentMeta } from '../../types/engine';
import { EngineAssembly } from '../engine/EngineAssembly';
import { StudioLighting } from '../engine/StudioLighting';
import {
  RotateCcw,
  Camera,
  Layers,
  CheckCircle2,
  X
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface StageInfo {
  index: string;
  title: string;
  subtitle: string;
  range: [number, number];
  targetProgress: number;
}

const STAGES: StageInfo[] = [
  {
    index: '01',
    title: 'Complete Sealed Engine',
    subtitle: 'All mechanical subsystems seated in calibrated factory alignment. The four-stroke combustion assembly in nominal operating state.',
    range: [0.0, 0.22],
    targetProgress: 0.0
  },
  {
    index: '02',
    title: 'Cylinder Head & Valvetrain',
    subtitle: 'A356-T6 cast aluminum cylinder head and MLS gasket lift on +Y, revealing pent-roof combustion chambers, 16 valves, and dual overhead camshafts.',
    range: [0.22, 0.48],
    targetProgress: 0.35
  },
  {
    index: '03',
    title: 'Reciprocating Pistons & Rods',
    subtitle: 'Forged 2618 aluminum pistons and H-beam connecting rods extract upwards out of the cast-iron cylinder bores, exposing ring lands and wrist pins.',
    range: [0.48, 0.72],
    targetProgress: 0.6
  },
  {
    index: '04',
    title: 'Crankshaft & Lower Sump',
    subtitle: 'Counterweighted forged steel crankshaft and baffled oil pan drop on -Y, exposing induction-hardened main journals and rod bearings.',
    range: [0.72, 0.88],
    targetProgress: 0.8
  },
  {
    index: '05',
    title: 'Full Exploded Architecture',
    subtitle: 'Tuned stainless 4-into-1 header and equal-length intake plenum expand laterally, providing 360° visibility into every moving component.',
    range: [0.88, 1.0],
    targetProgress: 1.0
  }
];

export const ScrollExplodedSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);

  const [explosionProgress, setExplosionProgress] = useState<number>(0);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>('pistons');
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'front'>('iso');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);

  // Determine current active narrative stage based on explosion progress
  const currentStage = STAGES.find(
    (s) => explosionProgress >= s.range[0] && explosionProgress <= s.range[1]
  ) || STAGES[0];

  useEffect(() => {
    if (!containerRef.current || !stickyRef.current) return;

    // Create GSAP ScrollTrigger to scrub explosionProgress
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        onUpdate: (self) => {
          setExplosionProgress(self.progress);
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Jump to specific stage
  const jumpToStage = (stage: StageInfo) => {
    if (!containerRef.current) return;
    const totalScroll = containerRef.current.offsetHeight - window.innerHeight;
    const targetScroll = containerRef.current.offsetTop + totalScroll * stage.targetProgress;

    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  };

  // Camera preset handler
  const setCameraPreset = (view: 'iso' | 'top' | 'front') => {
    setCameraView(view);
    if (!controlsRef.current) return;

    let targetPos = [4.2, 3.2, 5.0];
    if (view === 'top') targetPos = [0.1, 7.5, 0.1];
    if (view === 'front') targetPos = [0, 0.5, 6.0];

    gsap.to(controlsRef.current.object.position, {
      x: targetPos[0],
      y: targetPos[1],
      z: targetPos[2],
      duration: 1.0,
      ease: 'power2.inOut',
      onUpdate: () => controlsRef.current.update()
    });
  };

  const selectedMeta: EngineComponentMeta | null = selectedComponentId
    ? ENGINE_COMPONENTS[selectedComponentId]
    : null;

  return (
    <section
      id="explore-engine"
      ref={containerRef}
      className="relative w-full h-[320vh] bg-[#08090A]"
    >
      {/* Sticky Viewport Container */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between"
      >
        {/* Top Section Header Overlay */}
        <div className="absolute top-20 left-6 sm:left-12 z-20 max-w-md pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101214]/90 border border-[#292D31] text-[11px] font-mono text-[#D66A32] mb-3 backdrop-blur-md">
            <Layers className="w-3.5 h-3.5 text-[#D66A32]" />
            <span>EXPLODED ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F2F3] tracking-tight leading-tight">
            See What Drives You.
          </h2>
          <p className="text-xs sm:text-sm text-[#A4A9AF] mt-2 leading-relaxed">
            Scroll to separate internal components and understand how your engine operates under nominal combustion cycles.
          </p>
        </div>

        {/* Camera View & Rotation Presets (Top Right) */}
        <div className="absolute top-20 right-6 sm:right-12 z-20 flex items-center gap-1.5 bg-[#101214]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#292D31] text-xs font-mono">
          <Camera className="w-3.5 h-3.5 text-[#D66A32]" />
          <button
            onClick={() => setCameraPreset('iso')}
            className={`px-2 py-0.5 rounded transition ${
              cameraView === 'iso' ? 'bg-[#D66A32] text-white' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
          >
            Iso
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`px-2 py-0.5 rounded transition ${
              cameraView === 'top' ? 'bg-[#D66A32] text-white' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className={`px-2 py-0.5 rounded transition ${
              cameraView === 'front' ? 'bg-[#D66A32] text-white' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
          >
            Front
          </button>
          <div className="w-[1px] h-3 bg-[#292D31] mx-1" />
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
              isAutoRotating ? 'text-[#D66A32]' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
          >
            <RotateCcw className={`w-3 h-3 ${isAutoRotating ? 'animate-spin' : ''}`} />
            Spin
          </button>
        </div>

        {/* 3D WebGL Canvas */}
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
          <Canvas shadows dpr={[1, 2]}>
            <PerspectiveCamera makeDefault position={[4.2, 3.2, 5.0]} fov={42} />
            <StudioLighting />

            <EngineAssembly
              explosionProgress={explosionProgress}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              hoveredComponentId={hoveredComponentId}
              onHoverComponent={setHoveredComponentId}
            />

            <ContactShadows
              position={[0, -1.8, 0]}
              opacity={0.65}
              scale={10}
              blur={2.0}
              far={4.5}
              color="#000000"
            />

            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.05}
              autoRotate={isAutoRotating}
              autoRotateSpeed={0.8}
              minDistance={2.5}
              maxDistance={12}
              maxPolarAngle={Math.PI / 2 + 0.15}
            />
          </Canvas>
        </div>

        {/* Right Stage Progression Dots & Step Indicators */}
        <div className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-4 bg-[#101214]/85 backdrop-blur-md p-4 rounded-2xl border border-[#292D31]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#737A82] mb-1">
            Assembly Phase
          </div>
          {STAGES.map((s) => {
            const isActive = currentStage.index === s.index;
            return (
              <button
                key={s.index}
                onClick={() => jumpToStage(s)}
                className={`flex items-center gap-3 text-left transition group ${
                  isActive ? 'text-[#F1F2F3]' : 'text-[#737A82] hover:text-[#A4A9AF]'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-[#D66A32] ring-4 ring-[#D66A32]/20 scale-125'
                      : 'bg-[#292D31] group-hover:bg-[#737A82]'
                  }`}
                />
                <div>
                  <div className="text-xs font-mono font-medium flex items-center gap-1.5">
                    <span>{s.index}.</span>
                    <span>{s.title}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Left Bottom Active Stage Narrative Overlay */}
        <div className="absolute bottom-8 left-6 sm:left-12 z-20 max-w-lg pointer-events-none">
          <div className="bg-[#101214]/90 backdrop-blur-md border border-[#292D31] p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[#D66A32] mb-1">
              <span>PHASE {currentStage.index} OF 05</span>
              <span>•</span>
              <span className="text-[#A4A9AF] font-normal">{Math.round(explosionProgress * 100)}% DISPLACEMENT</span>
            </div>
            <h3 className="text-lg font-bold text-[#F1F2F3]">{currentStage.title}</h3>
            <p className="text-xs text-[#A4A9AF] mt-2 leading-relaxed">
              {currentStage.subtitle}
            </p>
          </div>
        </div>

        {/* Component Inspection Modal / Overlay (When Clicked) */}
        {selectedMeta && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-12 z-30 w-[90vw] sm:w-80">
            <div className="bg-[#101214]/95 backdrop-blur-xl border border-[#292D31] rounded-2xl p-4 shadow-2xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#D66A32] uppercase tracking-wider block">
                    Component Telemetry
                  </span>
                  <h4 className="text-sm font-bold text-[#F1F2F3]">
                    {selectedMeta.name}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedComponentId(null)}
                  className="p-1 rounded-lg text-[#737A82] hover:text-[#F1F2F3] hover:bg-[#171A1D]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 pt-2 text-xs border-t border-[#292D31] font-sans">
                <div>
                  <span className="text-[#737A82] font-mono text-[10px] uppercase tracking-wide block mb-1">
                    Material & Fabrication
                  </span>
                  <p className="text-[#F1F2F3] leading-relaxed bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                    {selectedMeta.materialDescription}
                  </p>
                </div>

                <div>
                  <span className="text-[#737A82] font-mono text-[10px] uppercase tracking-wide block mb-1">
                    Role in Engine Cycle
                  </span>
                  <p className="text-[#A4A9AF] leading-relaxed bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                    {selectedMeta.mechanicalFunction}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#292D31] flex items-center justify-between text-[11px] font-mono text-[#737A82]">
                <span>Status: Calibrated</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Nominal Geometry
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
