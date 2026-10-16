import React from 'react';
import { ArrowRight, ChevronDown, Activity, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, ContactShadows } from '@react-three/drei';
import { EngineAssembly } from '../engine/EngineAssembly';
import { StudioLighting } from '../engine/StudioLighting';

interface HeroSectionProps {
  onTestModelClick: () => void;
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onTestModelClick,
  onExploreClick
}) => {
  return (
    <section className="relative min-h-[92vh] flex items-center pt-24 pb-16 px-6 sm:px-8 lg:px-12 bg-[#08090A] overflow-hidden font-sans border-b border-[#292D31]">
      {/* Subtle industrial grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#F1F2F3 1px, transparent 1px), linear-gradient(90deg, #F1F2F3 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Controlled warm ambient focus */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[350px] bg-[#D66A32]/8 blur-[160px] pointer-events-none rounded-full" />

      <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
        {/* Left Column: Automotive Technology Narrative (lg: col 1-7) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101214] border border-[#292D31] text-[11px] font-mono text-[#A4A9AF]">
            <span className="w-2 h-2 rounded-full bg-[#D66A32] animate-pulse flex-shrink-0" />
            <span className="tracking-wider uppercase text-[#D66A32] font-semibold">
              Engine Diagnostics Architecture
            </span>
            <span className="text-[#292D31]">•</span>
            <span className="text-[#737A82] hidden sm:inline">Harmonic Order Tracking</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#F1F2F3] leading-[1.05]">
            Understand <br />
            Every <span className="text-[#D66A32]">Pulse.</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-base sm:text-lg text-[#A4A9AF] font-normal leading-relaxed">
            Transforming internal combustion acoustic, vibration, and thermodynamic signals into verified mechanical clarity. Isolate component failure before catastrophic breakdown.
          </p>

          {/* CTA Button Group */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
            <a
              href="#test-model"
              onClick={(e) => {
                e.preventDefault();
                onTestModelClick();
              }}
              className="px-7 py-3.5 rounded-lg bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-semibold text-xs font-mono tracking-wider uppercase transition flex items-center justify-center gap-2.5 shadow-lg shadow-black/50 group cursor-pointer"
            >
              <span>Test The Model</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
            </a>

            <button
              onClick={onExploreClick}
              className="px-6 py-3.5 rounded-lg bg-[#101214] hover:bg-[#171A1D] text-[#F1F2F3] font-medium text-xs font-mono border border-[#292D31] transition flex items-center justify-center gap-2 group"
            >
              <span>Explore 3D Engine</span>
              <ChevronDown className="w-4 h-4 text-[#737A82] group-hover:translate-y-0.5 transition" />
            </button>
          </div>

          {/* Technical Value Specs Grid */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl">
            {[
              { label: 'Harmonic Tracking', icon: Activity },
              { label: 'Tri-Modal Input', icon: Zap },
              { label: 'Subsystem Attribution', icon: Shield },
              { label: '0.05 mm Clearance', icon: CheckCircle2 }
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[#101214] border border-[#292D31] text-[11px] text-[#A4A9AF] font-mono"
              >
                <item.icon className="w-3.5 h-3.5 text-[#D66A32] flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive Hero 3D Engine Viewport (lg: col 8-12) */}
        <div className="lg:col-span-5 h-[380px] sm:h-[460px] lg:h-[520px] w-full relative bg-[#0c0e10] rounded-2xl border border-[#292D31] overflow-hidden shadow-2xl">
          {/* Viewport Top HUD Tag */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            <span className="text-[10px] font-mono text-[#A4A9AF] bg-[#101214]/90 backdrop-blur-md px-2.5 py-1 rounded border border-[#292D31]">
              ASSEMBLY: INLINE-4 DOHC TURBO
            </span>
            <span className="text-[10px] font-mono text-[#737A82] bg-[#101214]/90 backdrop-blur-md px-2 py-1 rounded border border-[#292D31]">
              INTERACTIVE 3D
            </span>
          </div>

          {/* 3D WebGL Canvas */}
          <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas shadows dpr={[1, 1.5]}>
              <PerspectiveCamera makeDefault position={[4.0, 2.8, 4.8]} fov={38} />
              <StudioLighting />

              <EngineAssembly
                explosionProgress={0}
                selectedComponentId={null}
                onSelectComponent={() => {}}
                hoveredComponentId={null}
                onHoverComponent={() => {}}
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
                enableDamping
                dampingFactor={0.05}
                autoRotate
                autoRotateSpeed={0.9}
                minDistance={3.0}
                maxDistance={9.0}
                maxPolarAngle={Math.PI / 2 + 0.1}
              />
            </Canvas>
          </div>

          {/* Viewport Bottom Prompt */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-[10px] font-mono text-[#737A82] pointer-events-none">
            <span className="bg-[#101214]/90 backdrop-blur-md px-2 py-0.5 rounded border border-[#292D31]">
              Rotate 360° to inspect components
            </span>
            <a
              href="#test-model"
              onClick={(e) => {
                e.preventDefault();
                onTestModelClick();
              }}
              className="pointer-events-auto text-[#D66A32] hover:text-white bg-[#101214]/90 backdrop-blur-md px-2.5 py-0.5 rounded border border-[#D66A32]/40 transition cursor-pointer"
            >
              Diagnose Assembly →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
