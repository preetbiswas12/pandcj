 'use client'
import React, { useEffect, useState } from 'react'
import { assets } from '@/assets/assets'

const PageIntro = ({ initial = null }) => {
  const [settings, setSettings] = useState(initial)

  useEffect(() => {
    let mounted = true
    let es

    try {
      es = new EventSource('/api/settings/stream?key=pageintro')
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

  const title = settings?.title || 'Sale of the summer collection'
  const image = settings?.image || (assets.slide_1?.src ?? assets.slide_1)

  return (
    <section className="page-intro relative">
      <div
        className="page-intro__slide bg-cover bg-center h-130 flex items-center"
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="container mx-auto px-6">
          <div className="page-intro__slide__content max-w-lg text-white">
            <h2 className="text-5xl font-semibold leading-tight">{title}</h2>
          </div>
        </div>
      </div>

      <div className="shop-data bg-white">
        <div className="container mx-auto px-6 py-6">
          <ul className="shop-data__items flex flex-col md:flex-row gap-4 md:gap-6">
            <li className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-gray-100 grid place-items-center">✨</div>
              <div className="data-item__content">
                <h4 className="font-medium">Symbol Of Elegance</h4>
                <p className="text-sm text-muted-foreground">A true gem of Elegance</p>
              </div>
            </li>

            <li className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-gray-100 grid place-items-center">👤</div>
              <div className="data-item__content">
                <h4 className="font-medium">99% Satisfied Customers</h4>
                <p className="text-sm text-muted-foreground">Our clients' opinions speak for themselves</p>
              </div>
            </li>

            <li className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-gray-100 grid place-items-center">🔄</div>
              <div className="data-item__content">
                <h4 className="font-medium">Replacement Guaranteed</h4>
                <p className="text-sm text-muted-foreground">7 days warranty for each product from our store</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export default PageIntro
