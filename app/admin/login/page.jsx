"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      console.log('[AdminLogin] Attempting login with email:', email)
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, role: 'ADMIN' }),
      })
      
      const data = await res.json()
      console.log('[AdminLogin] Response status:', res.status)
      
      if (!res.ok) {
        console.error('[AdminLogin] Login failed:', data?.error)
        setError(data?.error || 'Login failed')
        toast.error(data?.error || 'Login failed')
        setLoading(false)
        return
      }

      console.log('[AdminLogin] Login successful')
      
      // Store the token in localStorage if provided
      if (data.token) {
        localStorage.setItem('authToken', data.token)
        console.log('[AdminLogin] Token stored in localStorage')
      }
      
      toast.success('Login successful!')
      
      // Navigate to admin page with full reload to ensure cookie is received
      setTimeout(() => {
        window.location.href = '/admin'
      }, 500)
    } catch (err) {
      console.error('[AdminLogin] Error:', err)
      setError(err.message || 'An error occurred')
      toast.error(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-slate-800">Admin Panel</h1>
          <p className="text-slate-600 mb-8">Login to manage your store</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                autoFocus
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white font-medium py-2.5 rounded-lg hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-600 text-sm mt-6">
            Administrator credentials required
          </p>
        </div>
      </div>
    </div>
  )
}
