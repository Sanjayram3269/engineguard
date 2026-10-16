import React, { useState, useEffect } from 'react';
import { Activity, Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onTestModelClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onTestModelClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Explore 3D Engine', href: '#explore-engine' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Why It Matters', href: '#why-it-matters' },
    { label: 'Architecture', href: '#about' }
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 font-sans ${
        isScrolled
          ? 'bg-[#08090A]/90 backdrop-blur-md border-b border-[#292D31] py-3.5 shadow-xl shadow-black/60'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center group-hover:border-[#D66A32] transition">
            <Activity className="w-4 h-4 text-[#D66A32]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#F1F2F3] font-extrabold tracking-tight text-base">
              EnginePulse
            </span>
            <span className="text-[#D66A32] font-semibold text-xs font-mono">AI</span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-medium text-[#A4A9AF] hover:text-[#F1F2F3] transition tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Primary Action */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#test-model"
            onClick={(e) => {
              e.preventDefault();
              onTestModelClick();
            }}
            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-medium text-xs font-mono tracking-wider transition shadow-sm cursor-pointer"
          >
            <span>Test The Model</span>
            <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition" />
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-[#171A1D] border border-[#292D31] text-[#A4A9AF]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#101214] border-b border-[#292D31] px-6 py-5 space-y-4 shadow-2xl">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[#A4A9AF] hover:text-[#F1F2F3] transition py-1"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-[#292D31]">
            <a
              href="#test-model"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                onTestModelClick();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#D66A32] text-white font-medium text-xs font-mono tracking-wider uppercase shadow-md cursor-pointer"
            >
              <span>Test The Model</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};
