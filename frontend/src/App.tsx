import { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { HeroSection } from './components/hero/HeroSection';
import { ScrollExplodedSection } from './components/exploded/ScrollExplodedSection';
import { HowItWorks } from './components/sections/HowItWorks';
import { WhyItMatters } from './components/sections/WhyItMatters';
import { AboutSection } from './components/sections/AboutSection';
import { ClosingCTA } from './components/sections/ClosingCTA';
import { Footer } from './components/layout/Footer';
import { TestingPage } from './components/testing/TestingPage';

type ViewMode = 'landing' | 'testing';

// Comprehensive route checker supporting hash, path, and query routes
const isTestingPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = (window.location.hash || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();

  return (
    hash === '#test-model' ||
    hash.startsWith('#test') ||
    hash.startsWith('#/test') ||
    path === '/test-model' ||
    path.startsWith('/test') ||
    search.includes('test-model') ||
    search.includes('view=testing')
  );
};

export default function App() {
  // Initialize view directly from URL to prevent flash of landing page on direct navigation
  const [view, setView] = useState<ViewMode>(() => (isTestingPath() ? 'testing' : 'landing'));

  // Sync route state across hash changes, popstate (browser back/forward), and direct navigation
  useEffect(() => {
    const syncRoute = () => {
      const shouldBeTesting = isTestingPath();
      setView((prev) => (prev !== (shouldBeTesting ? 'testing' : 'landing') ? (shouldBeTesting ? 'testing' : 'landing') : prev));
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  const navigateToTesting = () => {
    if (window.location.hash !== '#test-model') {
      window.location.hash = '#test-model';
    }
    setView('testing');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const navigateToLanding = () => {
    if (window.location.hash.includes('test')) {
      if (window.history.pushState) {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
    }
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const scrollToExplore = () => {
    const el = document.getElementById('explore-engine');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (view === 'testing') {
    return <TestingPage onBackToLanding={navigateToLanding} />;
  }

  return (
    <div className="min-h-screen bg-[#08090A] text-[#F1F2F3] flex flex-col font-sans selection:bg-[#D66A32] selection:text-white">
      {/* Top Navbar */}
      <Navbar onTestModelClick={navigateToTesting} />

      {/* Main Landing Page Flow */}
      <main className="flex-1">
        {/* 1. Cinematic Side-by-Side Hero Section */}
        <HeroSection
          onTestModelClick={navigateToTesting}
          onExploreClick={scrollToExplore}
        />

        {/* 2. Flagship Scroll-Driven 3D Exploded Engine Section */}
        <ScrollExplodedSection />

        {/* 3. Diagnostic Pipeline (How It Works) */}
        <HowItWorks />

        {/* 4. Engineering Value (Why It Matters) */}
        <WhyItMatters />

        {/* 5. Built on Engineering (Architecture / About) */}
        <AboutSection />

        {/* 6. Closing Call-To-Action */}
        <ClosingCTA onTestModelClick={navigateToTesting} />
      </main>

      {/* Footer */}
      <Footer onTestModelClick={navigateToTesting} />
    </div>
  );
}
