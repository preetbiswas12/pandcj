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
            const data = await res.json()
            if (res.ok) {
                setStatus({ type: 'success', message: data.message || 'Subscribed successfully' })
                setEmail('')
            } else {
                setStatus({ type: 'error', message: data.error || 'Subscription failed' })
            }
        } catch (err) {
            console.error('Newsletter subscription error:', err)
            setStatus({ type: 'error', message: 'Network error. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='flex flex-col items-center mx-4 my-15'>
            <Title title="Join Newsletter" description="Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox on release." visibleButton={false} />
            <form onSubmit={handleSubmit} className='flex bg-slate-100 text-sm p-1 rounded-full w-full max-w-xl my-10 border-2 border-white ring ring-slate-200'>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className='flex-1 pl-5 outline-none bg-transparent' type="email" placeholder='Enter your email address' />
                <button disabled={loading} type="submit" className='font-medium bg-yellow-500 text-white px-7 py-3 rounded-full hover:scale-103 active:scale-95 transition'>
                    {loading ? 'Sending...' : 'Get Updates'}
                </button>
            </form>
            {status && (
                <p className={`text-sm ${status.type === 'error' ? 'text-red-500' : 'text-yellow-600'}`}>{status.message}</p>
            )}
        </div>
    )
}

export default Newsletter