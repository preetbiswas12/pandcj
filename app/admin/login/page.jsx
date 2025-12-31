"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, role: 'ADMIN' }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data?.error || 'Login failed')
    try {
      // Prefer full reload to ensure server receives the auth cookie and
      // renders the admin page with authenticated data. Client-side
      // transitions can sometimes not include cookies for server RSC
      // fetches depending on edge/CDN behaviors.
      console.log('Login success — navigating to /admin')
      window.location.href = '/admin'
    } catch (e) {
      router.push('/admin')
    }
  }

  return (
    <div className="max-w-md mx-auto py-20">
      <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input autoFocus required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
        <input required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 border rounded" />
        {error && <div role="alert" className="text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          aria-disabled={loading}
          className={`w-full p-2 rounded transition transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed ${loading ? 'bg-gray-400 text-gray-700' : 'bg-black text-white hover:opacity-90 active:scale-95 active:translate-y-0.5 cursor-pointer'}`}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
