'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"

export default function StoreAddProduct() {

    const categories = ['Earrings', 'Necklace', 'Heavy Necklace', 'Fashionable Earrings', 'Others']

    const [images, setImages] = useState({ 1: { file: null, preview: null }, 2: { file: null, preview: null }, 3: { file: null, preview: null }, 4: { file: null, preview: null } })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
    })
    const [loading, setLoading] = useState(false)


    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)

            // upload images that are selected
            const uploadedUrls = []
            for (const key of Object.keys(images)) {
                const item = images[key]
                const file = item?.file
                const preview = item?.preview
                if (!file) continue
                const dataUrl = preview || await new Promise((resolve, reject) => {
                    const r = new FileReader()
                    r.onload = () => resolve(r.result)
                    r.onerror = reject
                    r.readAsDataURL(file)
                })
                const base64 = dataUrl.split(',')[1]
                const res = await fetch('/api/admin/stores/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: base64, filename: file.name }) })
                const body = await res.json()
                if (!res.ok) {
                    throw new Error(`Upload failed: ${body?.error?.message || 'Unknown error'}`)
                }
                if (body?.url) uploadedUrls.push(body.url)
            }

            if (uploadedUrls.length === 0) {
                toast.error('Please upload at least one image')
                setLoading(false)
                return
            }

            const payload = {
                name: productInfo.name,
                description: productInfo.description,
                mrp: productInfo.mrp,
                price: productInfo.price,
                images: uploadedUrls,
                category: productInfo.category,
                storeId: 'default-store'
            }

            const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (!res.ok) throw new Error('Failed to create product')
            const created = await res.json()
            toast.success('Product added')
            // reset form
            setProductInfo({ name: '', description: '', mrp: 0, price: 0, category: '' })
            setImages({ 1: null, 2: null, 3: null, 4: null })
        } catch (err) {
            console.error(err)
            toast.error('Could not add product')
        } finally { setLoading(false) }
        
    }


    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })} className="text-slate-500 mb-28">
            <h1 className="text-2xl">Add New <span className="text-slate-800 font-medium">Products</span></h1>
            <p className="mt-7">Product Images</p>

            <div htmlFor="" className="flex gap-3 mt-4">
                {Object.keys(images).map((key) => (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image width={300} height={300} className='h-15 w-auto border border-slate-200 rounded cursor-pointer' src={images[key].preview ? images[key].preview : assets.upload_area} alt="" />
                        <input type="file" accept='image/*' id={`images${key}`} onChange={async e => {
                            const file = e.target.files[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = () => {
                                setImages(prev => ({ ...prev, [key]: { file, preview: reader.result } }))
                            }
                            reader.readAsDataURL(file)
                        }} hidden />
                    </label>
                ))}
            </div>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Name
                <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="Enter product name" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required />
            </label>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Description
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Enter product description" rows={5} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
            </label>

            <div className="flex gap-5">
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Actual Price (₹)
                    <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" rows={5} className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Offer Price (₹)
                    <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" rows={5} className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
            </div>

            <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded" required>
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>

            <br />

            <button disabled={loading} className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition">Add Product</button>
        </form>
    )
}