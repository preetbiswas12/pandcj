'use client'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-6 py-12">
        <div className="inline-block mb-6">
          <div className="text-6xl md:text-8xl font-bold text-slate-800">404</div>
        </div>

        <div className="mx-auto mb-6 h-48 w-48 md:h-60 md:w-60 rounded">
          <img src="/images/404.png" alt="not found" className="object-contain h-full w-full" />
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-slate-800 mb-3">Oops! Page not found</h1>
        <p className="text-slate-500 mb-6">The page you are looking for might have been removed or temporarily unavailable.</p>

        <Link href="/" className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-md font-medium">Back to HomePage</Link>
      </div>
    </div>
  )
}
