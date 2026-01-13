'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"

export default function StoreAddProduct() {

    const categories = ['Earrings', 'Necklace', 'Heavy Necklace', 'Fashionable Earrings', 'Others']

    const [images, setImages] = useState({ 1: { file: null, preview: null }, 2: { file: null, preview: null }, 3: { file: null, preview: null }, 4: { file: null, preview: null } })
    const [storeId, setStoreId] = useState(null)
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
        stock: "in_stock"
    })
    const [loading, setLoading] = useState(false)

    // Fetch user's store on component mount
    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await fetch('/api/store', { credentials: 'include' })
                if (res.ok) {
                    const store = await res.json()
                    setStoreId(store?.id || 'default-store')
                } else {
                    // Fallback to default store if no user store found
                    setStoreId('default-store')
                }
            } catch (err) {
                console.error('Failed to fetch store:', err)
                // Fallback to default store
                setStoreId('default-store')
            }
        }
        fetchStore()
    }, [])

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)

            if (!storeId) {
                toast.error('Store information not available')
                setLoading(false)
                return
            }

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
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout for upload
                const res = await fetch('/api/admin/stores/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: base64, filename: file.name }), signal: controller.signal })
                clearTimeout(timeout)
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
                mrp: Number(productInfo.mrp),
                price: Number(productInfo.price),
                images: uploadedUrls,
                category: productInfo.category,
                stock: productInfo.stock,
                storeId: storeId
            }

            const controller2 = new AbortController()
            const timeout2 = setTimeout(() => controller2.abort(), 4000) // 4s timeout
            const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller2.signal })
            clearTimeout(timeout2)
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData?.error || 'Failed to create product')
            }
            const created = await res.json()
            toast.success('Product added successfully!')
            // reset form
            setProductInfo({ name: '', description: '', mrp: 0, price: 0, category: '', stock: 'in_stock' })
            setImages({ 1: { file: null, preview: null }, 2: { file: null, preview: null }, 3: { file: null, preview: null }, 4: { file: null, preview: null } })
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Product creation error:', err)
                throw new Error(err.message || 'Could not add product')
            }
            throw new Error('Request timeout - please try again')
        } finally { setLoading(false) }
        
    }


    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })} className="text-slate-500 mb-28 p-4 sm:p-0">
            <h1 className="text-xl sm:text-2xl">Add New <span className="text-slate-800 font-medium">Products</span></h1>
            <p className="mt-5 sm:mt-7 text-sm sm:text-base">Product Images</p>

            <div className="flex gap-2 sm:gap-3 mt-4 flex-wrap">
                {Object.keys(images).map((key) => {
                    const image = images[key]
                    return (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image width={150} height={150} className='h-28 w-28 sm:h-40 sm:w-40 border border-slate-200 rounded cursor-pointer object-cover' src={image?.preview ? image.preview : assets.upload_area} alt="" />
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
                    )
                })
                }
            </div>

            <label htmlFor="" className="flex flex-col gap-2 my-6">
                Name
                <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="Enter product name" className="w-full sm:max-w-sm p-2 px-4 outline-none border border-slate-200 rounded text-sm" required />
            </label>

            <label htmlFor="" className="flex flex-col gap-2 my-6">
                Description
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Enter product description" rows={5} className="w-full sm:max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none text-sm" required />
            </label>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-5">
                <label htmlFor="" className="flex flex-col gap-2 flex-1 sm:flex-none">
                    Actual Price (₹)
                    <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" className="w-full sm:max-w-45 p-2 px-4 outline-none border border-slate-200 rounded text-sm" required />
                </label>
                <label htmlFor="" className="flex flex-col gap-2 flex-1 sm:flex-none">
                    Offer Price (₹)
                    <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" className="w-full sm:max-w-45 p-2 px-4 outline-none border border-slate-200 rounded text-sm" required />
                </label>
            </div>

            <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full sm:max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded text-sm" required>
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>

            <label htmlFor="" className="flex flex-col gap-2 my-6">
                Stock Status
                <select onChange={e => setProductInfo({ ...productInfo, stock: e.target.value })} value={productInfo.stock} className="w-full sm:max-w-sm p-2 px-4 outline-none border border-slate-200 rounded text-sm">
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>
            </label>

            <br />

            <button disabled={loading} className="w-full sm:w-auto bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition text-sm font-medium">Add Product</button>
        </form>
    )
}