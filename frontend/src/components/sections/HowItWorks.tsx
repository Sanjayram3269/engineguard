import React from 'react';
import { Activity, Cpu, FileText, ArrowRight, Radio } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Engine Signals',
      icon: Radio,
      tag: 'Signal Acquisition',
      desc: 'We capture multi-modal engine signals including high-frequency vibration harmonics, acoustic pressure waves, and combustion phase resonance.'
    },
    {
      num: '02',
      title: 'Signal Processing',
      icon: Activity,
      tag: 'Harmonic Filtering',
      desc: 'Raw sensor telemetry is cleaned, filtered, and converted into cycle-synchronous order tracking and time-frequency spectrograms.'
    },
    {
      num: '03',
      title: 'Physics-Based Inference',
      icon: Cpu,
      tag: 'Order Tracking Models',
      desc: 'Kinematic and thermodynamic models compare current harmonic signatures against calibrated nominal baselines to detect micro-deviations.'
    },
    {
      num: '04',
      title: 'Actionable Protocols',
      icon: FileText,
      tag: 'Preventive Clarity',
      desc: 'You receive clear, plain-language engineering insights explaining mechanical condition, enabling timely decisions before road failures occur.'
    }
  ];

  return (
    <section id="how-it-works" className="relative py-24 px-6 sm:px-8 bg-[#08090A] border-t border-[#292D31] font-sans">
      <div className="max-w-6xl mx-auto space-y-14">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#D66A32] bg-[#101214] px-3 py-1 rounded-full border border-[#292D31] inline-block font-semibold">
              DIAGNOSTIC PIPELINE
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F1F2F3] tracking-tight">
              From Engine Signals <br />
              to Mechanical Clarity.
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#A4A9AF] leading-relaxed">
            EnginePulse AI processes multi-modal acoustic, vibration, and thermodynamic signals to isolate physical component wear long before diagnostic trouble codes trigger.
          </p>
        </div>

        {/* 4 Process Cards Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative group bg-[#101214] border border-[#292D31] hover:border-[#D66A32]/60 rounded-xl p-5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold font-mono text-[#737A82] group-hover:text-[#D66A32] transition-colors">
                    {step.num}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-[#171A1D] border border-[#292D31] group-hover:border-[#D66A32]/40 flex items-center justify-center transition-colors">
                    <step.icon className="w-4 h-4 text-[#A4A9AF] group-hover:text-[#D66A32] transition-colors" />
                  </div>
                </div>

                <span className="text-[10px] font-mono uppercase tracking-wider text-[#737A82] block mb-1">
                  {step.tag}
                </span>
                <h3 className="text-base font-bold text-[#F1F2F3] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-[#A4A9AF] leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-[#292D31] flex items-center text-[11px] font-mono text-[#737A82] group-hover:text-[#D66A32] transition-colors">
                <span>Phase {step.num} Ready</span>
                <ArrowRight className="w-3 h-3 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
