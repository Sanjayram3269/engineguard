import React from 'react';
import { Target, Cpu, ShieldCheck } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="relative py-24 px-6 sm:px-8 bg-[#08090A] border-t border-[#292D31] font-sans">
      <div className="max-w-6xl mx-auto space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5 text-left">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#D66A32] bg-[#101214] px-3 py-1 rounded-full border border-[#292D31] inline-block font-semibold">
              ENGINEERING ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F1F2F3] tracking-tight leading-tight">
              Real Kinematics. <br />
              Actionable Clarity.
            </h2>
            <p className="text-sm text-[#A4A9AF] leading-relaxed">
              Internal combustion engines are high-precision kinematic systems operating under thousands of micro-explosions per minute. When clearances wear by even fractions of a millimeter, their harmonic signature changes long before catastrophic seizure occurs.
            </p>
            <p className="text-sm text-[#737A82] leading-relaxed">
              EnginePulse AI bridges mechanical engineering and signal intelligence. By decoding high-frequency vibrational and acoustic harmonics, we provide actionable clarity so technicians, race teams, and fleet operators can maintain engines with complete confidence.
            </p>
          </div>

          <div className="space-y-3.5">
            {[
              {
                icon: Target,
                title: 'Cycle-Synchronous Crank Angle Tracking',
                desc: 'Every acoustic impulse is mapped to crankshaft angle, distinguishing intake valve seating from piston ring flutter.'
              },
              {
                icon: Cpu,
                title: 'Physics-Grounded Diagnostic Rules',
                desc: 'Inference models are trained on real-world kinematics, thermodynamics, and OEM tolerance baselines, eliminating speculative black-box guesses.'
              },
              {
                icon: ShieldCheck,
                title: 'Non-Destructive Condition Assessment',
                desc: 'Acoustic and vibrational analysis works externally, providing immediate mechanical visibility without tearing down the engine.'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-[#101214] border border-[#292D31] p-5 rounded-xl flex items-start gap-4 shadow-md hover:border-[#D66A32]/50 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center text-[#D66A32] flex-shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#F1F2F3]">{item.title}</h3>
                  <p className="text-xs text-[#A4A9AF] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
