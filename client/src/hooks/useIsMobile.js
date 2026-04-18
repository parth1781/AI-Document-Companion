import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport width is 768px or less (mobile).
 * Updates automatically on window resize.
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};
