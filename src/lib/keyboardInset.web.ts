import { useEffect, useState } from 'react';

/**
 * How far the on-screen keyboard covers the bottom of the page. In the Home Screen app on
 * iPhone the keyboard sits over fixed content, so bottom sheets lift themselves by this much.
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return undefined;
    const update = () => setHeight(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return height;
}
