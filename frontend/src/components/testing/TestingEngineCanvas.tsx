import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { RotateCcw, Eye, X, Activity } from 'lucide-react';
import { EngineAssembly } from '../engine/EngineAssembly';
import { StudioLighting } from '../engine/StudioLighting';
import { COMPONENT_METADATA } from '../../types/engine';

interface TestingEngineCanvasProps {
  explosionProgress: number;
  onExplosionChange?: (progress: number) => void;
  highlightedComponentId: string | null;
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  hoveredComponentId?: string | null;
  onHoverComponent?: (id: string | null) => void;
  isAutoRotating?: boolean;
  onToggleAutoRotate?: () => void;
  isFaultDiagnosed?: boolean;
}

export const TestingEngineCanvas: React.FC<TestingEngineCanvasProps> = ({
  explosionProgress,
  highlightedComponentId,
  selectedComponentId,
  onSelectComponent,
  hoveredComponentId = null,
  onHoverComponent = () => {},
  isAutoRotating = true,
  onToggleAutoRotate,
  isFaultDiagnosed = false
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [internalAutoRotate, setInternalAutoRotate] = useState<boolean>(true);
  const [cameraView, setCameraView] = useState<'iso' | 'front' | 'top'>('iso');
  const [isDesktop, setIsDesktop] = useState<boolean>(true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveAutoRotate = onToggleAutoRotate ? isAutoRotating : internalAutoRotate;
  const toggleRotate = () => {
    if (onToggleAutoRotate) {
      onToggleAutoRotate();
    } else {
      setInternalAutoRotate((prev) => !prev);
    }
  };

  // Animate camera dolly forward upon fault diagnosis / explosion
  useEffect(() => {
    if (!controlsRef.current) return;
    if (isFaultDiagnosed && explosionProgress > 0.3) {
      // Dolly in closer for diagnostic inspection
      gsap.to(controlsRef.current.object.position, {
        x: isDesktop ? 3.0 : 2.5,
        y: 2.1,
        z: isDesktop ? 3.8 : 3.4,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => controlsRef.current?.update()
      });
    } else if (explosionProgress < 0.05) {
      // Dolly back to idle revolving view
      gsap.to(controlsRef.current.object.position, {
        x: isDesktop ? 3.8 : 3.2,
        y: 2.4,
        z: isDesktop ? 4.6 : 4.2,
        duration: 1.2,
        ease: 'power2.inOut',
        onUpdate: () => controlsRef.current?.update()
      });
    }
  }, [isFaultDiagnosed, explosionProgress, isDesktop]);

  // Handle camera view presets
  const setCameraPreset = (preset: 'iso' | 'front' | 'top') => {
    setCameraView(preset);
    if (!controlsRef.current) return;

    let targetCamPos = [isDesktop ? 3.8 : 3.2, 2.4, isDesktop ? 4.6 : 4.2];
    if (preset === 'front') {
      targetCamPos = [isDesktop ? 0.6 : 0, 0.9, 5.2];
    } else if (preset === 'top') {
      targetCamPos = [isDesktop ? 0.6 : 0, 6.4, 0.1];
    }

    gsap.to(controlsRef.current.object.position, {
      x: targetCamPos[0],
      y: targetCamPos[1],
      z: targetCamPos[2],
      duration: 1.0,
      ease: 'power2.inOut',
      onUpdate: () => controlsRef.current?.update()
    });
  };

  const activeComponentId = selectedComponentId || highlightedComponentId;
  const activeMeta = activeComponentId ? COMPONENT_METADATA[activeComponentId] : null;

  // Offset engine position slightly to the right on desktop to balance with the left floating card
  const enginePosition: [number, number, number] = [isDesktop ? 0.55 : 0, -0.15, 0];

  return (
    <div className="relative w-full h-full min-h-screen bg-[#08090A] overflow-hidden select-none">
      {/* Background Radial Glow & Gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_65%_45%,rgba(214,106,50,0.08)_0%,rgba(10,12,14,0.4)_50%,rgba(8,9,10,0.95)_100%)]" />

      {/* Top Camera & Spin Controls Bar */}
      <div className="absolute top-4 right-4 sm:right-8 z-30 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1 bg-[#101214]/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#292D31] text-xs font-mono shadow-xl">
          <button
            onClick={() => setCameraPreset('iso')}
            className={`px-2.5 py-1 rounded-md transition ${
              cameraView === 'iso' ? 'bg-[#D66A32] text-white font-bold' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
          >
            Iso
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className={`px-2.5 py-1 rounded-md transition ${
              cameraView === 'front' ? 'bg-[#D66A32] text-white font-bold' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`px-2.5 py-1 rounded-md transition ${
              cameraView === 'top' ? 'bg-[#D66A32] text-white font-bold' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
          >
            Top
          </button>
          <div className="w-[1px] h-3.5 bg-[#292D31] mx-1" />
          <button
            onClick={toggleRotate}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition ${
              effectiveAutoRotate ? 'text-[#D66A32]' : 'text-[#A4A9AF] hover:text-[#F1F2F3]'
            }`}
            title={effectiveAutoRotate ? 'Pause Rotation' : 'Resume Revolving'}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${effectiveAutoRotate ? 'animate-spin' : ''}`} />
            <span>{effectiveAutoRotate ? 'Revolving' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Right Technical Specs HUD (Matching Mockup) */}
      <div className="absolute top-20 right-4 sm:right-8 z-20 pointer-events-none hidden md:flex flex-col items-end space-y-2 text-right font-mono">
        <div className="bg-[#101214]/85 backdrop-blur-md border border-[#292D31]/90 rounded-2xl p-4 space-y-2 shadow-2xl text-[11px] min-w-[220px]">
          <div className="text-[10px] text-[#D66A32] font-bold tracking-widest uppercase border-b border-[#292D31] pb-1.5 flex items-center justify-between">
            <span>Engine Specs</span>
            <Activity className="w-3.5 h-3.5 text-[#D66A32]" />
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#737A82]">DISPLACEMENT:</span>
            <span className="text-[#F1F2F3] font-bold">1.4 L</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#737A82]">CYLINDERS:</span>
            <span className="text-[#F1F2F3] font-bold">4 In-Line</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#737A82]">FUEL SYSTEM:</span>
            <span className="text-[#F1F2F3] font-bold">MPFI</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#737A82]">MAX POWER:</span>
            <span className="text-[#F1F2F3] font-bold">73 kW @ 6000 rpm</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#737A82]">MAX TORQUE:</span>
            <span className="text-[#F1F2F3] font-bold">126 Nm @ 4000 rpm</span>
          </div>
          <div className="pt-1.5 border-t border-[#292D31] flex justify-between text-[10px] text-[#A4A9AF]">
            <span>FIRING ORDER:</span>
            <span className="text-[#D66A32] font-semibold">1 - 3 - 4 - 2</span>
          </div>
        </div>
      </div>

      {/* Bottom Left Engine Nomenclature Badge (Matching Mockup) */}
      <div className="absolute bottom-6 left-6 sm:left-10 z-20 pointer-events-none hidden sm:flex items-center gap-2 font-mono text-xs">
        <div className="bg-[#101214]/85 backdrop-blur-md border border-[#292D31] px-3.5 py-2 rounded-xl text-[#A4A9AF] flex items-center gap-2.5 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D66A32] animate-pulse" />
          <span className="font-bold text-[#F1F2F3]">C14NE</span>
          <span className="text-[#292D31]">/</span>
          <span>1.4L 4-CYLINDER PETROL ENGINE</span>
        </div>
      </div>

      {/* 3D WebGL Canvas Filling the entire Viewport */}
      <div className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[isDesktop ? 3.8 : 3.2, 2.4, isDesktop ? 4.6 : 4.2]} fov={36} />
          <StudioLighting />

          <group position={enginePosition}>
            <EngineAssembly
              explosionProgress={explosionProgress}
              selectedComponentId={activeComponentId}
              onSelectComponent={onSelectComponent}
              hoveredComponentId={hoveredComponentId}
              onHoverComponent={onHoverComponent}
            />
          </group>

          <ContactShadows
            position={[isDesktop ? 0.55 : 0, -1.8, 0]}
            opacity={0.65}
            scale={12}
            blur={2.2}
            far={4.8}
            color="#000000"
          />

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            autoRotate={effectiveAutoRotate}
            autoRotateSpeed={0.55}
            target={[isDesktop ? 0.55 : 0, 0, 0]}
            minDistance={2.0}
            maxDistance={10}
            maxPolarAngle={Math.PI / 2 + 0.12}
          />
        </Canvas>
      </div>

      {/* Floating Active Component Info Card (Overlay) */}
      {activeMeta && (
        <div className="absolute bottom-6 right-4 sm:right-8 max-w-xs sm:max-w-sm z-30 bg-[#101214]/95 backdrop-blur-md border border-[#292D31] p-4 rounded-xl shadow-2xl text-xs space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#D66A32] uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#D66A32]" />
              {activeComponentId === highlightedComponentId ? 'Diagnosed Fault Component' : 'Selected Component'}
            </span>
            <button
              onClick={() => onSelectComponent(null)}
              className="text-[#737A82] hover:text-[#F1F2F3] p-0.5 rounded cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h5 className="font-bold text-[#F1F2F3] text-sm">{activeMeta.name}</h5>
          <p className="text-[11px] text-[#A4A9AF] leading-relaxed line-clamp-2">
            {activeMeta.mechanicalFunction}
          </p>
          <div className="pt-2 border-t border-[#292D31] flex items-center justify-between text-[10px] font-mono text-[#737A82]">
            <span>Subsystem: {activeMeta.subsystem}</span>
            <span className="text-[#D66A32] font-semibold">3D Highlighted</span>
          </div>
        </div>
      )}
    </div>
  );
};
