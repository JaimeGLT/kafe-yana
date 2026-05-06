import { useRef, useCallback } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollL = useRef(0);
  const moved = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    dragging.current = true;
    moved.current = false;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollL.current = ref.current.scrollLeft;
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 4) moved.current = true;
    ref.current.scrollLeft = scrollL.current - walk;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!ref.current) return;
    dragging.current = false;
    ref.current.style.cursor = 'grab';
    ref.current.style.userSelect = '';
  }, []);

  const onMouseLeave = onMouseUp;

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, wasDragged: () => moved.current };
}
