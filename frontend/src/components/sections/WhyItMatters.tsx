import React from 'react';
import { Wrench, ShieldAlert, Clock, Gauge, BarChart2, ShieldCheck } from 'lucide-react';

export const WhyItMatters: React.FC = () => {
  const benefits = [
    {
      icon: Wrench,
      title: 'Fewer Catastrophic Failures',
      desc: 'Identify mechanical degradation early to prevent sudden roadside stoppages, broken connecting rods, and hazardous component destruction.',
      highlight: 'Early Detection'
    },
    {
      icon: ShieldAlert,
      title: 'Lower Repair Capital',
      desc: 'Catching valve wear, bearing friction, or head gasket creep early prevents collateral internal damage requiring full block replacement.',
      highlight: 'Proactive Savings'
    },
    {
      icon: Clock,
      title: 'Extended Powertrain Life',
      desc: 'Consistent thermal and mechanical balance preserves cylinder bore coatings, bearings, and valvetrain geometry for hundreds of thousands of miles.',
      highlight: 'Preserved Integrity'
    }
  ];

  return (
    <section id="why-it-matters" className="relative py-24 px-6 sm:px-8 bg-[#08090A] border-t border-[#292D31] font-sans">
      <div className="max-w-6xl mx-auto space-y-14">
        {/* Section Header */}
        <div className="max-w-2xl space-y-3 text-left">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#D66A32] bg-[#101214] px-3 py-1 rounded-full border border-[#292D31] inline-block font-semibold">
            ENGINEERING VALUE
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F1F2F3] tracking-tight">
            Catch Wear Signatures <br />
            Before They Escalate.
          </h2>
          <p className="text-sm text-[#A4A9AF] leading-relaxed pt-1">
            Internal combustion powertrains broadcast subtle harmonic warnings long before diagnostic fault codes register. EnginePulse AI gives engineers and technicians the ability to act while repairs remain non-destructive.
          </p>
        </div>

        {/* 3 Core Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="bg-[#101214] border border-[#292D31] hover:border-[#D66A32]/50 rounded-xl p-6 space-y-4 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center text-[#D66A32]">
                    <b.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737A82] bg-[#171A1D] px-2 py-0.5 rounded border border-[#292D31]">
                    {b.highlight}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#F1F2F3] tracking-tight">
                  {b.title}
                </h3>
                <p className="text-xs text-[#A4A9AF] leading-relaxed">
                  {b.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-[#292D31] flex items-center gap-2 text-xs font-mono text-[#A4A9AF]">
                <ShieldCheck className="w-4 h-4 text-[#D66A32]" />
                <span>Verified Diagnostic Envelope</span>
              </div>
            </div>
          ))}
        </div>

        {/* Engineering Reliability Metrics Row */}
        <div className="bg-[#101214] border border-[#292D31] rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-[#F1F2F3] flex items-center justify-center sm:justify-start gap-2">
              <Gauge className="w-5 h-5 text-[#D66A32]" />
              <span>4 Cycles</span>
            </div>
            <p className="text-xs text-[#737A82] font-mono">
              Intake • Compression • Power • Exhaust Synchronous
            </p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-[#292D31] sm:pl-6">
            <div className="text-2xl font-bold font-mono text-[#F1F2F3] flex items-center justify-center sm:justify-start gap-2">
              <BarChart2 className="w-5 h-5 text-[#A4A9AF]" />
              <span>1X – 4X Orders</span>
            </div>
            <p className="text-xs text-[#737A82] font-mono">
              Cycle-synchronous rotational tracking
            </p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-[#292D31] sm:pl-6">
            <div className="text-2xl font-bold font-mono text-[#F1F2F3] flex items-center justify-center sm:justify-start gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>&lt; 0.05 mm</span>
            </div>
            <p className="text-xs text-[#737A82] font-mono">
              Bearing clearance degradation detection threshold
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
