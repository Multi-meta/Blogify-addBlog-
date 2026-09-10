// ============================================================
// ScrollToTop Component
// Jumps to the top of the page on every link click or redirect —
// including clicking Home / Blogify while already on the home page.
// Browser back/forward navigation is left alone.
// ============================================================

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

function ScrollToTop() {
  // A link to the current URL still creates a new location key
  const { key } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    // 'instant' overrides the smooth scroll-behavior set on <html>
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [key, navigationType]);

  return null;
}

export default ScrollToTop;
