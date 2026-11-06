import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProgressProvider } from './lib/progress';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Vocab from './pages/Vocab';
import Kanji from './pages/Kanji';
import ReadingList from './pages/ReadingList';
import Reading from './pages/Reading';

// Helper component to scroll window to top on route navigation
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <ProgressProvider>
      <HashRouter>
        <ScrollToTop />
        <div className="app-layout">
          <Header />
          <main className="main-content" id="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/vocab" element={<Vocab />} />
              <Route path="/kanji" element={<Kanji />} />
              <Route path="/reading" element={<ReadingList />} />
              <Route path="/reading/:id" element={<Reading />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </ProgressProvider>
  );
}
