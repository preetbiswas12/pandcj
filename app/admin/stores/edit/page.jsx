"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Loading from "@/components/Loading"
import toast from "react-hot-toast"

export default function AdminStoreEdit() {
  const router = useRouter()
  const params = useSearchParams()
  const storeId = params?.get("id")

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: "",
    username: "",
    description: "",
    address: "",
    contact: "",
    email: "",
    logo: "",
  })

  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState("")

  useEffect(() => {
    // In single-store mode, load store details from API by id when available.
    // This is a placeholder loader; replace with real fetch when backend exists.
    const load = async () => {
      if (storeId) {
        try {
          // Try the server API first
          const res = await fetch(`/api/admin/stores?userId=${storeId}`)
          if (res.ok) {
            const json = await res.json()
            if (json && json.id) {
              setForm({
                name: json.name || '',
                username: json.username || '',
                description: json.description || '',
                address: json.address || '',
                contact: json.contact || '',
                email: json.email || '',
                logo: json.logo || '',
              })
              if (json.logo) setPreview(json.logo)
            }
          }
        } catch (e) {
          console.error('Failed to load store', e)
        }
      }
      setLoading(false)
    }
    load()
  }, [storeId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
  }

  const handleFilePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      setPreview(dataUrl)
      try {
        setUploading(true)
        const filename = `${Date.now()}_${file.name}`
        const res = await fetch('/api/admin/stores/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, data: dataUrl }),
        })
        if (!res.ok) throw new Error('upload failed')
        const json = await res.json()
        setForm((s) => ({ ...s, logo: json.url }))
        setPreview(json.url)
      } catch (err) {
        console.error(err)
        // ignore — toast will show on save
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCancel = () => router.push("/admin/stores")

  const handleSubmit = async (e) => {
    e.preventDefault()
    await toast.promise(
      (async () => {
        const payload = { ...form }
        const url = storeId ? `/api/admin/stores/${storeId}` : `/api/admin/stores`
        const method = storeId ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error('Save failed')
        router.push('/admin/stores')
      })(),
      {
        loading: 'Saving...',
        success: 'Store updated',
        error: 'Failed to save',
      }
    )
  }

  if (loading) return <Loading />

  return (
    <div className="text-slate-500 mb-28">
      <h1 className="text-2xl">Edit <span className="text-slate-800 font-medium">Store</span></h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl bg-white p-6 rounded shadow">
        <div className="grid grid-cols-1 gap-4">
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Store name</div>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </label>

          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Username</div>
            <input name="username" value={form.username} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </label>

          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Description</div>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full border px-3 py-2 rounded" />
          </label>

          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Address</div>
            <input name="address" value={form.address} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              <div className="text-xs text-slate-500 mb-1">Contact</div>
              <input name="contact" value={form.contact} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
            </label>
            <label className="text-sm">
              <div className="text-xs text-slate-500 mb-1">Email</div>
              <input name="email" value={form.email} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
            </label>
          </div>

          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Logo</div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-linear-to-r from-emerald-500 to-yellow-600 text-white px-4 py-2 rounded-lg shadow hover:from-emerald-600 hover:to-yellow-700 transition">
                <input className="hidden" type="file" accept="image/*" onChange={handleFilePick} />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M4 3a1 1 0 011-1h10a1 1 0 011 1v6a1 1 0 11-2 0V5H6v10h4a1 1 0 110 2H5a1 1 0 01-1-1V3z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Choose Logo</span>
              </label>

              {uploading && <p className="text-sm text-slate-500">Uploading...</p>}
            </div>
            {preview && (
              <img src={preview} alt="logo preview" className="mt-3 h-24 w-24 object-contain rounded-lg border" />
            )}
          </label>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="px-6 py-3 bg-linear-to-r from-emerald-500 to-yellow-600 text-white rounded-lg shadow-lg hover:from-emerald-600 hover:to-yellow-700 font-semibold transition">Save</button>
            <button type="button" onClick={handleCancel} className="px-5 py-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </form>
    </div>
  )
}
