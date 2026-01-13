'use client'
import { useRef, useEffect } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { clearCart } from '@/lib/features/cart/cartSlice'

const CART_STORAGE_KEY = 'gocart_cart_v1'

function loadCartFromStorage() {
  try {
    if (typeof window === 'undefined') return undefined
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    // Ensure cart state has proper structure
    const cart = {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      total: typeof parsed?.total === 'number' ? parsed.total : 0
    }
    // expected shape matches cart slice state
    return { cart }
  } catch (e) {
    console.warn('Could not load cart from storage', e)
    return undefined
  }
}

function saveCartToStorage(cartState) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState))
  } catch (e) {
    // ignore quota errors
  }
}

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  const saveTimerRef = useRef(null)
  if (!storeRef.current) {
    const preloaded = loadCartFromStorage()
    storeRef.current = makeStore(preloaded)
  }

  // subscribe to store changes and persist cart slice
  useEffect(() => {
    const handleChange = () => {
      try {
        const state = storeRef.current.getState()
        if (state && state.cart) {
          // debounce writes to localStorage
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          saveTimerRef.current = setTimeout(() => {
            saveCartToStorage({ total: state.cart.total, items: state.cart.items })
            saveTimerRef.current = null
          }, 1000)
        }
      } catch (e) {
        // swallow
      }
    }

    const unsubscribe = storeRef.current.subscribe(handleChange)

    // flush pending saves on unload or when component unmounts
    const flush = () => {
      try {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }
        const state = storeRef.current.getState()
        if (state && state.cart) saveCartToStorage({ total: state.cart.total, items: state.cart.items })
      } catch (e) {
        /* ignore */
      }
    }

    if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush)

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', flush)
    }
  }, [])

  // If the URL contains ?resetCart=1, force-clear persisted cart and Redux state once
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const url = new URL(window.location.href)
      if (url.searchParams.get('resetCart') === '1') {
        // remove persisted key
        try { window.localStorage.removeItem(CART_STORAGE_KEY) } catch (e) {}
        // dispatch clearCart to reset Redux state
        try { storeRef.current.dispatch(clearCart()) } catch (e) {}
        // remove the query param and reload without creating history entry
        url.searchParams.delete('resetCart')
        window.location.replace(url.toString())
      }
    } catch (e) {}
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}