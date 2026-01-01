// demo.tsx
import React from 'react';
import Component from '@/components/ui/text-marque';

function CategoriesMarquee() {
  return (
    <>
      <div className='min-h-[150px] grid place-content-center'>
        <Component
          delay={500}
          baseVelocity={-3}
          clasname='font-bold tracking-[-0.07em] leading-[90%]'
        >
          Timeless elegance for every moment worth celebrating—discover pieces you'll treasure forever.
        </Component>
        <Component
          delay={500}
          baseVelocity={3}
          clasname='font-bold tracking-[-0.07em] leading-[90%]'
        >
          Where craftsmanship meets desire—find the jewellery that tells your story.
        </Component>
      </div>
    </>
  );
}

export default CategoriesMarquee;