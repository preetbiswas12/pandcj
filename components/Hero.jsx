'use client'
import { assets } from '@/assets/assets'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import CategoriesMarquee from './CategoriesMarquee'

const Hero = ({ initial = null }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
    const [settings, setSettings] = useState(initial)

    useEffect(() => {
        let mounted = true
        let es

        try {
            es = new EventSource('/api/settings/stream?key=banner')
            es.addEventListener('update', (ev) => {
                try {
                    const msg = JSON.parse(ev.data)
                    if (mounted && msg && msg.data) {
                        setSettings(msg.data)
                    }
                } catch (e) { }
            })
        } catch (e) { }

        return () => {
            mounted = false
            if (es) es.close()
        }
    }, [])

    const s = settings || {}

    const left = s.left || {}
    const topRight = s.topRight || {}
    const bottomRight = s.bottomRight || {}

    return (
        <div className='mx-6'>
            <div className='flex max-xl:flex-col gap-8 max-w-7xl mx-auto my-10'>
                <div
                    className='relative flex-1 flex flex-col rounded-3xl xl:min-h-100 group'
                    style={
                        left.bgColor
                            ? { backgroundColor: left.bgColor }
                            : left.bgImage
                                ? { backgroundImage: `url(${left.bgImage})`, backgroundSize: 'cover' }
                                : { backgroundColor: '#fcf2dcff' }
                    }
                >
                    <div className='p-5 sm:p-16'>
                        <div className='inline-flex items-center gap-3 pr-4 p-1 rounded-full text-xs sm:text-sm' style={{ background: left.newsBg || '#ef9b86ff' }}>
                            <span className='bg-yellow-600 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs'>{left.newsLabel || 'NEWS'}</span>
                            <span className='text-black'>{left.newsDescription || 'Free Shipping on Orders Above ₹2999!'}</span> 
                        </div>
                        <h2 className='text-3xl sm:text-5xl leading-[1.2] my-3 font-medium text-black max-w-xs  sm:max-w-md'>
                            {left.title || "Gadgets you'll love. Prices you'll trust."}
                        </h2>
                        <div className='text-black text-sm font-medium mt-4 sm:mt-8'>
                            <p className='text-black'>{left.priceLabel || 'Starts from'}</p>
                            <p className='text-3xl text-black'>{currency}{left.price || '4.90'}</p>
                        </div>
                        <a href={left.learnMoreLink || '/'} className='inline-block'>
                            <button className='bg-slate-800 text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition'>BUY NOW</button>
                        </a>
                    </div>
                    <Image className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm' src={left.modelImage || assets.hero_model_img} alt="" />
                </div>
                    <div className='flex flex-col md:flex-row xl:flex-col gap-5 w-full xl:max-w-sm text-sm text-black'>
                    <div
                        className='flex-1 flex items-center justify-between w-full rounded-3xl p-6 px-8 group'
                        style={
                            topRight.bgColor
                                ? { backgroundColor: topRight.bgColor }
                                : topRight.bgImage
                                    ? { backgroundImage: `url(${topRight.bgImage})`, backgroundSize: 'cover' }
                                    : { backgroundColor: '#FED7AA' }
                        }
                    >
                        <div>
                            <p className='text-3xl font-medium text-black max-w-40'>{topRight.title || 'Best products'}</p>
                            <p className='flex items-center gap-1 mt-4'><a href={topRight.link || '#'} className='flex items-center gap-1 text-black'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} /></a> </p>
                        </div>
                        <Image className='w-35' src={topRight.image || assets.hero_product_img1} alt="" />
                    </div>
                    <div
                        className='flex-1 flex items-center justify-between w-full rounded-3xl p-6 px-8 group'
                        style={
                            bottomRight.bgColor
                                ? { backgroundColor: bottomRight.bgColor }
                                : bottomRight.bgImage
                                    ? { backgroundImage: `url(${bottomRight.bgImage})`, backgroundSize: 'cover' }
                                    : { backgroundColor: '#DBEAFE' }
                        }
                    >
                        <div>
                            <p className='text-3xl font-medium text-black max-w-40'>{bottomRight.title || '20% discounts'}</p>
                            <p className='flex items-center gap-1 mt-4'><a href={bottomRight.link || '#'} className='flex items-center gap-1 text-black'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} /></a> </p>
                        </div>
                        <Image className='w-35' src={bottomRight.image || assets.hero_product_img2} alt="" />
                    </div>
                </div>
            </div>
            <CategoriesMarquee />
        </div>

    )
}

export default Hero