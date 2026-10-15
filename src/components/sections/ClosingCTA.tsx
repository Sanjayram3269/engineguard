import React from 'react';
import { ArrowRight, ShieldCheck, Activity } from 'lucide-react';

interface ClosingCTAProps {
  onTestModelClick: () => void;
}

export const ClosingCTA: React.FC<ClosingCTAProps> = ({ onTestModelClick }) => {
  return (
    <section className="relative py-24 px-6 sm:px-8 bg-[#08090A] border-t border-[#292D31] overflow-hidden font-sans">
      {/* Background Subtle Warm Ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-[#D66A32]/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center space-y-6 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101214] border border-[#292D31] text-[11px] font-mono text-[#D66A32]">
          <Activity className="w-3.5 h-3.5 text-[#D66A32]" />
          <span>PREVENTIVE ENGINE INTELLIGENCE</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F1F2F3] tracking-tight leading-[1.1]">
          Understand Every Pulse. <br />
          <span className="text-[#A4A9AF]">
            Before Failure Manifests.
          </span>
        </h2>

        <p className="max-w-xl mx-auto text-sm sm:text-base text-[#A4A9AF] font-normal leading-relaxed">
          Experience deeper clarity into your vehicle's mechanical health through real-time harmonic order tracking, acoustic signal processing, and thermodynamic telemetry.
        </p>

        {/* CTA Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#test-model"
            onClick={(e) => {
              e.preventDefault();
              onTestModelClick();
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-semibold text-xs font-mono tracking-wider uppercase transition flex items-center justify-center gap-2.5 shadow-xl shadow-black/50 group cursor-pointer"
          >
            <span>Test The Model</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
          </a>
        </div>

        <div className="pt-4 flex items-center justify-center gap-6 text-xs text-[#737A82] font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#A4A9AF]" /> Non-destructive Testing
          </span>
          <span>•</span>
          <span>ISO 10816 Vibration Compliance</span>
          <span>•</span>
          <span>Deterministic Edge Inference</span>
        </div>
      </div>
    </section>
  );
};
