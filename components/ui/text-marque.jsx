// component.jsx
'use client';

import { useRef, useEffect, forwardRef } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useAnimationFrame,
  useMotionValue,
} from 'motion/react';
import { cn } from '@/lib/utils';

const Component = forwardRef(function Component(
  {
    children,
    baseVelocity = -5,
    clasname,
    scrollDependent = false,
    delay = 0,
  },
  ref
) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });

  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], {
    clamp: false,
  });

  // Remove wrapping to show full text without scrolling off right side
  const x = useTransform(baseX, (v) => `${Math.max(-100, v)}%`);

  const directionFactor = useRef(1);
  const hasStarted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      hasStarted.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useAnimationFrame((_, delta) => {
    if (!hasStarted.current) return;

    let moveBy = directionFactor.current * baseVelocity * (delta / 10000);

    if (scrollDependent) {
      if (velocityFactor.get() < 0) directionFactor.current = -1;
      else if (velocityFactor.get() > 0) directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      ref={ref}
      className="w-full overflow-x-hidden overflow-y-hidden whitespace-normal flex items-center justify-center px-4"
    >
      <motion.div
        className="flex whitespace-nowrap gap-10 flex-nowrap items-center"
        style={{ x }}
      >
        {Array.from({ length: 1 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'inline-block align-middle leading-[1.05] text-[min(8vw,80px)] bg-gradient-to-r from-yellow-400 via-yellow-300 to-red-500 bg-clip-text text-transparent',
              clasname
            )}
            style={{whiteSpace: 'normal', width: '100%'}}
          >
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
});

export default Component;
