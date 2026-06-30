import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
        cursorRef.current.style.opacity = '1';
      }
      if (glowRef.current) {
        glowRef.current.style.opacity = '1';
      }
    };

    const updateGlow = () => {
      // Dampen the glowing outer aura for a floating delay effect
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      }

      animationFrameId = requestAnimationFrame(updateGlow);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') !== null || 
        target.closest('a') !== null || 
        target.closest('.interactive-card') !== null ||
        target.classList.contains('cursor-pointer');

      setIsHovered(isInteractive);
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    
    updateGlow();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Dynamic Cursor Light Spot */}
      <div
        ref={glowRef}
        className="custom-cursor-glow select-none pointer-events-none fixed left-0 top-0 opacity-0 transition-opacity duration-300"
        style={{
          transform: 'translate3d(0, 0, 0) translate(-50%, -50%)',
          willChange: 'transform'
        }}
        id="custom-cursor-glow-spot"
      />

      {/* Central Laser Dot */}
      <div
        ref={cursorRef}
        className={`custom-cursor select-none pointer-events-none fixed left-0 top-0 opacity-0 transition-opacity duration-300 ${isHovered ? 'scale-200 bg-pink-500' : 'bg-indigo-500'}`}
        style={{
          transform: 'translate3d(0, 0, 0) translate(-50%, -50%)',
          willChange: 'transform'
        }}
        id="custom-laser-dot"
      />
    </>
  );
};
