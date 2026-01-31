// demo.tsx
import React from 'react';
import Component from '@/components/ui/text-marque';

function CategoriesMarquee() {
  return (
    <>
      <div className='min-h-[120px] sm:min-h-[150px] grid place-content-center bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl mx-0 sm:mx-0 overflow-hidden'>
        <Component
          delay={500}
          baseVelocity={-.25}
          clasname='font-bold tracking-[-0.03em] leading-[90%] text-white/90'
        >
          ✨ Timeless elegance for every moment worth celebrating — discover pieces you'll treasure forever ✨
        </Component>
        <Component
          delay={500}
          baseVelocity={.25}
          clasname='font-bold tracking-[-0.03em] leading-[90%] text-yellow-400/90'
        >
          💎 Where craftsmanship meets desire — find the jewellery that tells your story 💎
        </Component>
      </div>
    </>
  );
}

export default CategoriesMarquee;