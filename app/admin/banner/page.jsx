"use client"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import FileButton from '@/components/FileButton'

export default function AdminBanner() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({})

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/banner', { credentials: 'include' })
      const data = await res.json()
      setSettings(data || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const handleFile = async (file) => {
    if (!file) return ''
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          // upload via existing upload API
          const b64 = reader.result.split(',')[1]
          const res = await fetch('/api/admin/stores/upload', { method: 'POST', credentials: 'include', body: JSON.stringify({ data: b64, name: file.name }), headers: { 'Content-Type': 'application/json' } })
          const json = await res.json()
          resolve(json.url || '')
        } catch (e) { reject(e) }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/banner', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      if (!res.ok) throw new Error('Failed')
      toast.success('Saved')
    } catch (err) {
      toast.error('Save failed')
      console.error(err)
    } finally { setLoading(false) }
  }

  const onFileChange = async (e, path) => {
    const file = e.target.files?.[0]
    if (!file) return

    // immediate preview: read data URL and set it in UI while upload runs
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      setSettings(prev => {
        const copy = JSON.parse(JSON.stringify(prev || {}))
        const parts = path.split('.')
        let cur = copy
        for (let i=0;i<parts.length-1;i++) { cur[parts[i]] = cur[parts[i]] || {}; cur = cur[parts[i]] }
        cur[parts[parts.length-1]] = dataUrl
        return copy
      })

      try {
        const uploadedUrl = await handleFile(file)
        if (uploadedUrl) {
          setSettings(prev => {
            const copy = JSON.parse(JSON.stringify(prev || {}))
            const parts = path.split('.')
            let cur = copy
            for (let i=0;i<parts.length-1;i++) { cur[parts[i]] = cur[parts[i]] || {}; cur = cur[parts[i]] }
            cur[parts[parts.length-1]] = uploadedUrl
            return copy
          })
        }
      } catch (err) {
        console.error('Upload failed', err)
      }
    }
    reader.readAsDataURL(file)
  }

  if (loading) return <Loading />

  return (
    <div className="text-slate-500 mb-40">
      <h2 className="text-2xl">Banner <span className="text-slate-800 font-medium">Settings</span></h2>

      <div className="mt-6 space-y-6 max-w-3xl">
        <section className="bg-white p-4 rounded border">
          <h3 className="font-semibold">Left (Big) Box</h3>
          <label className="block mt-2">News Label
            <input value={settings.left?.newsLabel||''} onChange={e=>setSettings(s=>({...s,left:{...(s.left||{}),newsLabel:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">News Description
            <input value={settings.left?.newsDescription||''} onChange={e=>setSettings(s=>({...s,left:{...(s.left||{}),newsDescription:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">Price
            <input value={settings.left?.price||''} onChange={e=>setSettings(s=>({...s,left:{...(s.left||{}),price:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">Redirect Link
            <input value={settings.left?.learnMoreLink||''} onChange={e=>setSettings(s=>({...s,left:{...(s.left||{}),learnMoreLink:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">Background Image
            <FileButton accept="image/*" label="Choose image" onChange={(e)=>onFileChange(e,'left.bgImage')} previewUrl={settings.left?.bgImage} />
          </label>
          <label className="block mt-2">Background Color
            <input type="color" value={settings.left?.bgColor||"#DCFCE7"} onChange={e=>setSettings(s=>({...s,left:{...(s.left||{}),bgColor:e.target.value}}))} className="w-24 h-10 p-1 border rounded" />
          </label>
          <label className="block mt-2">Model/Image
            <FileButton accept="image/*" label="Choose image" onChange={(e)=>onFileChange(e,'left.modelImage')} previewUrl={settings.left?.modelImage} />
          </label>
        </section>

        <section className="bg-white p-4 rounded border">
          <h3 className="font-semibold">Top Right Box</h3>
          <label className="block mt-2">Title
            <input value={settings.topRight?.title||''} onChange={e=>setSettings(s=>({...s,topRight:{...(s.topRight||{}),title:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">Link
            <input value={settings.topRight?.link||''} onChange={e=>setSettings(s=>({...s,topRight:{...(s.topRight||{}),link:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">Background Image
            <FileButton accept="image/*" label="Choose image" onChange={(e)=>onFileChange(e,'topRight.bgImage')} previewUrl={settings.topRight?.bgImage} />
          </label>
          <label className="block mt-2">Background Color
            <input type="color" value={settings.topRight?.bgColor||"#FED7AA"} onChange={e=>setSettings(s=>({...s,topRight:{...(s.topRight||{}),bgColor:e.target.value}}))} className="w-24 h-10 p-1 border rounded" />
          </label>
          <label className="block mt-2">Image
            <FileButton accept="image/*" label="Choose image" onChange={(e)=>onFileChange(e,'topRight.image')} previewUrl={settings.topRight?.image} />
          </label>
        </section>

        <section className="bg-white p-4 rounded border">
          <h3 className="font-semibold">Bottom Right Box</h3>
          <label className="block mt-2">Title
            <input value={settings.bottomRight?.title||''} onChange={e=>setSettings(s=>({...s,bottomRight:{...(s.bottomRight||{}),title:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">Link
            <input value={settings.bottomRight?.link||''} onChange={e=>setSettings(s=>({...s,bottomRight:{...(s.bottomRight||{}),link:e.target.value}}))} className="w-full p-2 border rounded" />
          </label>
          <label className="block mt-2">Background Image
            <FileButton accept="image/*" label="Choose image" onChange={(e)=>onFileChange(e,'bottomRight.bgImage')} previewUrl={settings.bottomRight?.bgImage} />
          </label>
          <label className="block mt-2">Background Color
            <input type="color" value={settings.bottomRight?.bgColor||"#DBEAFE"} onChange={e=>setSettings(s=>({...s,bottomRight:{...(s.bottomRight||{}),bgColor:e.target.value}}))} className="w-24 h-10 p-1 border rounded" />
          </label>
          <label className="block mt-2">Image
            <FileButton accept="image/*" label="Choose image" onChange={(e)=>onFileChange(e,'bottomRight.image')} previewUrl={settings.bottomRight?.image} />
          </label>
        </section>

        <div className="flex gap-3">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  )
}
