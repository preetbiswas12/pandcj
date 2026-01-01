"use client"
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import FileButton from '@/components/FileButton'
import { assets } from '@/assets/assets'

export default function AdminPageIntro() {
  const [title, setTitle] = useState('')
  const [image, setImage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
      fetch('/api/admin/pageintro?ts=' + Date.now(), { credentials: 'include' }).then(r => r.json()).then(data => {
      if (data) {
        setTitle(data.title || '')
        setImage(data.image || '')
      }
    }).catch(() => {})
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
        if (body?.url) setImage(body.url)
        else if (body?.dataUrl) setImage(body.dataUrl)
        else setImage(dataUrl)
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
      if (body?.success) toast.success('Saved')
      else toast.error('Save failed')
      // refresh values from server to ensure UI matches persisted state
      if (body?.success) {
        try {
          const r = await fetch('/api/admin/pageintro?ts=' + Date.now(), { credentials: 'include' })
          const d = await r.json()
          if (d) {
            setTitle(d.title || '')
            setImage(d.image || '')
          }
        } catch (e) {}
      }
    } catch (err) { toast.error('Save failed') }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h3 className="text-2xl font-semibold mb-4">Edit Page Intro</h3>
      <label className="block mb-2">Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mb-4 p-3 border rounded" />

      <label className="block mb-2">Image</label>
      <div className="flex items-center gap-4 mb-4">
        <FileButton accept="image/*" label={loading ? 'Uploading...' : 'Choose image'} onChange={handleUpload} previewUrl={image || (assets.slide_1?.src ?? assets.slide_1)} />
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  )
}
