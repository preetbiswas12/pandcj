'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSignedIn, setIsSignedIn] = useState(false)

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store'
        })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
          setIsSignedIn(true)
          console.log('[AuthProvider] User authenticated:', userData.email)
        } else {
          console.log('[AuthProvider] No valid session found')
          setUser(null)
          setIsSignedIn(false)
        }
      } catch (err) {
        console.error('[AuthProvider] Auth check error:', err)
        setUser(null)
        setIsSignedIn(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Login failed')
    }

    const data = await res.json()
    setUser(data.user)
    setIsSignedIn(true)
    return data.user
  }

  const signup = async (email, password, fullName) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
      credentials: 'include'
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Signup failed')
    }

    const data = await res.json()
    setUser(data.user)
    setIsSignedIn(true)
    return data.user
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      setIsSignedIn(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSignedIn,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
