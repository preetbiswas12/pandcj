'use client'
import React, { useState } from 'react'
import Title from './Title'

const Newsletter = () => {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e?.preventDefault()
        setStatus(null)
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus({ type: 'error', message: 'Please enter a valid email.' })
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/admin/newsletters', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ email }),
                credentials: 'include'
            })
            
            if (!res.ok) {
                const data = await res.json()
                setStatus({ type: 'error', message: data.error || 'Subscription failed' })
                return
            }

            const data = await res.json()
            if (data && (data.ok || data.message)) {
                setStatus({ type: 'success', message: 'Subscribed successfully!' })
                setEmail('')
            } else {
                setStatus({ type: 'error', message: 'Subscription failed' })
            }
        } catch (err) {
            console.error('Newsletter subscription error:', err)
            setStatus({ type: 'error', message: 'Network error. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='relative overflow-hidden'>
            {/* Background gradient */}
            <div className='absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-amber-50'></div>
            
            <div className='relative flex flex-col items-center mx-4 sm:mx-6 my-12 sm:my-16 py-10 sm:py-14'>
                <div className='text-center mb-6'>
                    <h2 className='text-2xl sm:text-3xl font-bold text-slate-800 mb-3'>Join Our Family</h2>
                    <p className='text-sm sm:text-base text-slate-600 max-w-md mx-auto px-4'>Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox.</p>
                </div>
                
                <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row bg-white text-sm p-2 rounded-2xl sm:rounded-full w-full max-w-xl shadow-lg border border-slate-100'>
                    <label htmlFor='newsletter-email' className='sr-only'>Email address for newsletter</label>
                    <input 
                        id='newsletter-email' 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className='flex-1 px-5 py-3 sm:py-0 outline-none bg-transparent text-slate-700 placeholder-slate-400 text-center sm:text-left' 
                        type="email" 
                        placeholder='Enter your email address' 
                        aria-label='Email address for newsletter' 
                    />
                    <button 
                        disabled={loading} 
                        type="submit" 
                        className='font-semibold bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-8 py-3.5 rounded-xl sm:rounded-full hover:from-yellow-600 hover:to-amber-600 active:scale-95 transition-all shadow-md hover:shadow-lg disabled:opacity-50' 
                        aria-label={loading ? 'Sending newsletter subscription' : 'Subscribe to newsletter'}
                    >
                        {loading ? 'Sending...' : 'Get Updates'}
                    </button>
                </form>
                
                {status && (
                    <p className={`mt-4 text-sm font-medium ${status.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{status.message}</p>
                )}
            </div>
        </div>
    )
}

export default Newsletter