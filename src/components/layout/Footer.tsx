import React from 'react';
import { Activity, Github, Linkedin, Twitter } from 'lucide-react';

interface FooterProps {
  onTestModelClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onTestModelClick }) => {
  return (
    <footer className="relative py-14 px-6 sm:px-8 bg-[#08090A] border-t border-[#292D31] text-[#737A82] font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#D66A32]" />
              </div>
              <span className="text-[#F1F2F3] font-extrabold tracking-tight text-base">
                EnginePulse <span className="text-[#D66A32] font-mono text-xs">AI</span>
              </span>
            </div>
            <p className="text-xs text-[#A4A9AF] max-w-sm leading-relaxed">
              Real-time engine intelligence platform turning mechanical vibration, acoustic frequencies, and thermodynamic telemetry into preventive maintenance clarity.
            </p>
          </div>

          {/* Nav & Legal Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs font-mono">
            <div>
              <span className="text-[#F1F2F3] font-semibold block mb-3 text-[11px] uppercase tracking-wider">
                Product
              </span>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#test-model"
                    onClick={(e) => {
                      if (onTestModelClick) {
                        e.preventDefault();
                        onTestModelClick();
                      }
                    }}
                    className="hover:text-[#F1F2F3] text-[#D66A32] font-semibold transition"
                  >
                    Test The Model →
                  </a>
                </li>
                <li>
                  <a href="#explore-engine" className="hover:text-[#F1F2F3] transition text-[#A4A9AF]">
                    Explore 3D Engine
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-[#F1F2F3] transition text-[#A4A9AF]">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#why-it-matters" className="hover:text-[#F1F2F3] transition text-[#A4A9AF]">
                    Why It Matters
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-[#F1F2F3] transition text-[#A4A9AF]">
                    Architecture
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[#F1F2F3] font-semibold block mb-3 text-[11px] uppercase tracking-wider">
                Engineering
              </span>
              <ul className="space-y-2 text-[#737A82]">
                <li>Harmonic Tracking</li>
                <li>Acoustic Wavelets</li>
                <li>PBR 3D Pipeline</li>
                <li>Kinematic Models</li>
              </ul>
            </div>

            <div>
              <span className="text-[#F1F2F3] font-semibold block mb-3 text-[11px] uppercase tracking-wider">
                Compliance
              </span>
              <ul className="space-y-2 text-[#737A82]">
                <li>ISO 10816 Vibration</li>
                <li>Deterministic Rules</li>
                <li>Edge Client Engine</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Socials */}
        <div className="pt-6 border-t border-[#292D31] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#737A82]">
          <p>
            © 2026 EnginePulse AI. Built for precision automotive engineering. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-[#A4A9AF]">
            <a href="#" className="hover:text-[#F1F2F3] transition p-1">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-[#F1F2F3] transition p-1">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-[#F1F2F3] transition p-1">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
