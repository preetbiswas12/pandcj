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

        try {
            es = new EventSource('/api/settings/stream?key=banner')
            console.log('[Hero] EventSource connected')
            
            // Close EventSource if it doesn't establish connection after 3 seconds (fail fast)
            esTimeout = setTimeout(() => {
                console.warn('[Hero] EventSource timeout (3s), closing and relying on polling')
                if (es) {
                    es.close()
                    es = null
                }
            }, 3000)
            
            es.addEventListener('update', (ev) => {
                try {
                    // Clear timeout once we get a message
                    if (esTimeout) {
                        clearTimeout(esTimeout)
                        esTimeout = null
                    }
                    const msg = JSON.parse(ev.data)
                    console.log('[Hero] EventSource update received:', msg)
                    if (mounted && msg && msg.data) {
                        console.log('[Hero] Setting banner data:', msg.data)
                        setSettings(msg.data)
                    }
                } catch (e) { 
                    console.error('[Hero] Parse error:', e)
                }
            })
            
            es.onerror = () => {
                console.error('[Hero] EventSource error, closing connection and relying on polling')
                if (es) {
                    es.close()
                    es = null
                }
                if (esTimeout) clearTimeout(esTimeout)
            }
        } catch (e) { 
            console.error('[Hero] EventSource setup error:', e)
        }

        return () => {
            mounted = false
            if (es) es.close()
            if (pollInterval) clearInterval(pollInterval)
            if (initialFetchTimeout) clearTimeout(initialFetchTimeout)
            if (esTimeout) clearTimeout(esTimeout)
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
                        className='flex-1 flex flex-row sm:flex-row md:flex-col xl:flex-row xl:items-center xl:justify-between w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 px-4 sm:px-8 group'
                        style={
                            topRight.bgColor
                                ? { backgroundColor: topRight.bgColor }
                                : topRight.bgImage
                                    ? { backgroundImage: `url(${topRight.bgImage})`, backgroundSize: 'cover' }
                                    : { backgroundColor: '#FED7AA' }
                        }
                    >
                        <Image className='w-24 sm:w-35 md:w-32 xl:w-24 order-first md:order-first xl:order-last' src={topRight.image} alt={topRight.title || "Featured item"} />
                        <div className='mt-4 sm:mt-4 md:mt-4 xl:mt-0 ml-4 sm:ml-0'>
                            <p className='text-2xl sm:text-2xl md:text-3xl font-medium text-black max-w-40'>{topRight.title}</p>
                            <p className='flex items-center gap-1 mt-2 sm:mt-4'><a href={topRight.link} className='flex items-center gap-1 text-black text-sm sm:text-sm'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={16} /></a> </p>
                        </div>
                    </div>
                    <div
                        className='flex-1 flex flex-row sm:flex-row md:flex-col xl:flex-row xl:items-center xl:justify-between w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 px-4 sm:px-8 group'
                        style={
                            bottomRight.bgColor
                                ? { backgroundColor: bottomRight.bgColor }
                                : bottomRight.bgImage
                                    ? { backgroundImage: `url(${bottomRight.bgImage})`, backgroundSize: 'cover' }
                                    : { backgroundColor: '#DBEAFE' }
                        }
                    >
                        <Image className='w-24 sm:w-35 md:w-32 xl:w-24 order-first md:order-first xl:order-last' src={bottomRight.image} alt={bottomRight.title || "Featured item"} />
                        <div className='mt-4 sm:mt-4 md:mt-4 xl:mt-0 ml-4 sm:ml-0'>
                            <p className='text-2xl sm:text-2xl md:text-3xl font-medium text-black max-w-40'>{bottomRight.title}</p>
                            <p className='flex items-center gap-1 mt-2 sm:mt-4'><a href={bottomRight.link} className='flex items-center gap-1 text-black text-sm sm:text-sm'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={16} /></a> </p>
                        </div>
                    </div>
                </div>
            </div>
            <CategoriesMarquee />
        </div>

    )
}

export default Hero