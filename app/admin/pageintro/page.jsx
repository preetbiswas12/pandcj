"use client"
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import FileButton from '@/components/FileButton'
import { assets } from '@/assets/assets'

export default function AdminPageIntro() {
  const [title, setTitle] = useState('')
  const [image, setImage] = useState('')
  const [loading, setLoading] = useState(false)
  const autoSaveTimeoutRef = React.useRef(null)
  const hasUnsavedChangesRef = React.useRef(false)

  useEffect(() => {
    fetch('/api/admin/pageintro?ts=' + Date.now(), { credentials: 'include' }).then(r => r.json()).then(data => {
      if (data) {
        setTitle(data.title || '')
        setImage(data.image || '')
      }
    }).catch(() => {})

    // Set up EventSource for real-time updates
    let mounted = true
    let es
    let esTimeout
    let pollInterval

    const fetchLatest = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 2000) // 2s timeout
        const res = await fetch(`/api/admin/pageintro?ts=${Date.now()}`, { credentials: 'include', signal: controller.signal })
        clearTimeout(timeout)
        if (res.ok) {
          const data = await res.json()
          if (mounted && data && !hasUnsavedChangesRef.current) {
            console.log('[AdminPageIntro] Poll fetched:', data)
            setTitle(data.title || '')
            setImage(data.image || '')
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('[AdminPageIntro] Poll error:', e)
      }
    }

    // Poll every 3 seconds for updates as fallback
    pollInterval = setInterval(fetchLatest, 3000)

    try {
      es = new EventSource('/api/settings/stream?key=pageintro')
      console.log('[AdminPageIntro] EventSource connected')
      
      // Close EventSource if it doesn't establish connection after 3 seconds (fail fast)
      esTimeout = setTimeout(() => {
        console.warn('[AdminPageIntro] EventSource timeout (3s), closing and relying on polling')
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
          console.log('[AdminPageIntro] EventSource update received:', msg)
          if (mounted && msg && msg.data) {
            setTitle(msg.data.title || '')
            setImage(msg.data.image || '')
          }
        } catch (e) {
          console.error('[AdminPageIntro] Parse error:', e)
        }
      })

      es.onerror = () => {
        console.error('[AdminPageIntro] EventSource error, closing connection and relying on polling')
        if (es) {
          es.close()
          es = null
        }
        if (esTimeout) clearTimeout(esTimeout)
      }
    } catch (e) {
      console.error('[AdminPageIntro] EventSource setup error:', e)
    }

    return () => {
      mounted = false
      if (es) es.close()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      const base64 = dataUrl.split(',')[1]
      setLoading(true)
      try {
        const res = await fetch('/api/admin/stores/upload', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: base64, name: file.name })
        })
        const body = await res.json()
        // Prefer returned URL (Cloudinary or public upload). If not provided (tmp fallback), use the data URL for preview.
        const uploadedUrl = body?.url || body?.dataUrl || dataUrl
        setImage(uploadedUrl)
        
        // Auto-save the image immediately after upload
        hasUnsavedChangesRef.current = true
        try {
          const saveRes = await fetch('/api/admin/pageintro', { 
            method: 'POST', 
            credentials: 'include', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ title, image: uploadedUrl }) 
          })
          const saveBody = await saveRes.json()
          if (saveBody?.success) {
            console.log('[AdminPageIntro] Image auto-saved successfully')
            hasUnsavedChangesRef.current = false
            toast.success('Image updated')
          }
        } catch (err) {
          console.error('[AdminPageIntro] Auto-save failed:', err)
        }
      } catch (err) {
        toast.error('Upload failed')
      } finally { setLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pageintro', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, image }) })
      const body = await res.json()
      if (body?.success) {
        toast.success('Saved')
        hasUnsavedChangesRef.current = false
        // refresh values from server to ensure UI matches persisted state
        try {
          const r = await fetch('/api/admin/pageintro?ts=' + Date.now(), { credentials: 'include' })
          const d = await r.json()
          if (d) {
            setTitle(d.title || '')
            setImage(d.image || '')
          }
        } catch (e) {}
      }
      else toast.error('Save failed')
    } catch (err) { toast.error('Save failed') }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h3 className="text-xl sm:text-2xl font-semibold mb-6">Edit Page Intro</h3>
      
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700">Title</label>
          <input 
            value={title} 
            onChange={(e) => {
              setTitle(e.target.value)
              hasUnsavedChangesRef.current = true
            }} 
            className="w-full p-2 sm:p-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter page title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700">Image</label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <FileButton 
              accept="image/*" 
              label={loading ? 'Uploading...' : 'Choose image'} 
              onChange={handleUpload} 
              previewUrl={image || (assets.slide_1?.src ?? assets.slide_1)} 
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
          <button 
            onClick={handleSave} 
            disabled={loading} 
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
