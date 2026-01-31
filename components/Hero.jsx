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
        let esTimeout
        let pollInterval
        let initialFetchTimeout

        // Fetch initial data immediately on mount with timeout
        const fetchInitial = async () => {
          try {
            const controller = new AbortController()
            initialFetchTimeout = setTimeout(() => controller.abort(), 3000) // 3s timeout
            
            const res = await fetch(`/api/admin/banner?ts=${Date.now()}`, { signal: controller.signal })
            clearTimeout(initialFetchTimeout)
            
            if (res.ok) {
              const data = await res.json()
              if (mounted && data) {
                console.log('[Hero] Initial data fetched:', data)
                setSettings(data)
              }
            }
          } catch (e) {
            console.error('[Hero] Initial fetch error:', e?.message || e)
          }
        }

        // Fetch immediately on mount
        fetchInitial()

        const fetchLatest = async () => {
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 2000) // 2s timeout for polling
            
            const res = await fetch(`/api/admin/banner?ts=${Date.now()}`, { signal: controller.signal })
            clearTimeout(timeout)
            
            if (res.ok) {
              const data = await res.json()
              if (mounted && data) {
                console.log('[Hero] Poll fetched:', data)
                setSettings(data)
              }
            }
          } catch (e) {
            if (e.name !== 'AbortError') {
              console.error('[Hero] Poll error:', e?.message || e)
            }
          }
        }

        // Poll every 5 seconds for updates (increased from 3 to reduce load)
        pollInterval = setInterval(fetchLatest, 5000)

        return () => {
            mounted = false
            if (pollInterval) clearInterval(pollInterval)
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout)
        }
    }, [])

    const s = settings || {}

    const left = s.left || {}
    const topRight = s.topRight || {}
    const bottomRight = s.bottomRight || {}

    return (
        <div className='mx-3 sm:mx-6'>
            <div className='flex max-xl:flex-col gap-4 sm:gap-8 max-w-7xl mx-auto my-8 sm:my-10'>
                <div
                    className='relative flex-1 flex flex-col rounded-2xl sm:rounded-3xl xl:min-h-100 group'
                    style={
                        left.bgColor
                            ? { backgroundColor: left.bgColor }
                            : left.bgImage
                                ? { backgroundImage: `url(${left.bgImage})`, backgroundSize: 'cover' }
                                : { backgroundColor: '#fcf2dcff' }
                    }
                >
                    <div className='p-3 sm:p-8 md:p-12 lg:p-16'>
                        <div className='inline-flex items-center gap-2 sm:gap-3 pr-2 sm:pr-4 p-1 rounded-full text-xs sm:text-sm' style={{ background: left.newsBg || '#ef9b86ff' }}>
                            <span className='bg-yellow-600 px-2 sm:px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs'>{left.newsLabel}</span>
                            <span className='text-black text-xs sm:text-sm'>{left.newsDescription}</span> 
                        </div>
                        <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.2] my-2 sm:my-3 font-medium text-black max-w-xs  sm:max-w-md'>
                            {left.title}
                        </h2>
                        <div className='text-black text-xs sm:text-sm font-medium mt-3 sm:mt-4 md:mt-8'>
                            <p className='text-black'>{left.priceLabel}</p>
                            <p className='text-2xl sm:text-3xl text-black'>{currency}{left.price}</p>
                        </div>
                        <a href={left.learnMoreLink} className='inline-block'>
                            <button className='bg-slate-800 text-white text-xs sm:text-sm py-2 sm:py-2.5 px-5 sm:px-7 md:py-3 md:px-10 lg:py-5 lg:px-12 mt-3 sm:mt-4 md:mt-8 lg:mt-10 rounded-md hover:bg-slate-900 active:scale-95 active:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 transition-all duration-150 shadow-md hover:shadow-lg transform hover:scale-105'>BUY NOW</button>
                        </a>
                    </div>
                    <Image className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm' src={left.modelImage} alt="Featured product model" />
                </div>
                    <div className='flex flex-col md:flex-row xl:flex-col gap-3 sm:gap-5 w-full xl:max-w-sm text-xs sm:text-sm text-black'>
                    <div
                        className='flex-1 flex flex-row sm:flex-row md:flex-col xl:flex-row xl:items-center xl:justify-between w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 px-5 sm:px-8 group shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1'
                        style={{
                            backgroundColor: topRight.bgColor || '#FED7AA',
                            ...(topRight.bgImage ? { backgroundImage: `url(${topRight.bgImage})`, backgroundSize: 'cover' } : {})
                        }}
                    >
                        <Image className='w-20 sm:w-35 md:w-32 xl:w-24 order-first md:order-first xl:order-last drop-shadow-lg' src={topRight.image} alt={topRight.title || "Featured item"} />
                        <div className='mt-0 sm:mt-4 md:mt-4 xl:mt-0 ml-3 sm:ml-0 flex flex-col justify-center'>
                            <p className='text-xl sm:text-2xl md:text-3xl font-semibold text-slate-800 max-w-40 leading-tight'>{topRight.title}</p>
                            <p className='flex items-center gap-1 mt-3 sm:mt-4'><a href={topRight.link} className='flex items-center gap-1 text-slate-700 text-sm sm:text-sm font-medium hover:text-yellow-600 transition-colors'>View more <ArrowRightIcon className='group-hover:translate-x-1 transition-transform' size={16} /></a></p>
                        </div>
                    </div>
                    <div
                        className='flex-1 flex flex-row sm:flex-row md:flex-col xl:flex-row xl:items-center xl:justify-between w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 px-5 sm:px-8 group shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1'
                        style={{
                            backgroundColor: bottomRight.bgColor || '#DBEAFE',
                            ...(bottomRight.bgImage ? { backgroundImage: `url(${bottomRight.bgImage})`, backgroundSize: 'cover' } : {})
                        }}
                    >
                        <Image className='w-20 sm:w-35 md:w-32 xl:w-24 order-first md:order-first xl:order-last drop-shadow-lg' src={bottomRight.image} alt={bottomRight.title || "Featured item"} />
                        <div className='mt-0 sm:mt-4 md:mt-4 xl:mt-0 ml-3 sm:ml-0 flex flex-col justify-center'>
                            <p className='text-xl sm:text-2xl md:text-3xl font-semibold text-slate-800 max-w-40 leading-tight'>{bottomRight.title}</p>
                            <p className='flex items-center gap-1 mt-3 sm:mt-4'><a href={bottomRight.link} className='flex items-center gap-1 text-slate-700 text-sm sm:text-sm font-medium hover:text-yellow-600 transition-colors'>View more <ArrowRightIcon className='group-hover:translate-x-1 transition-transform' size={16} /></a></p>
                        </div>
                    </div>
                </div>
            </div>
            <CategoriesMarquee />
        </div>

    )
}

export default Hero