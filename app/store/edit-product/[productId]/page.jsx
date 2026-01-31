'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useParams } from "next/navigation"

export default function StoreEditProduct() {

    const params = useParams()
    const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId
    const categories = ['Earrings', 'Necklace', 'Heavy Necklace', 'Fashionable Earrings', 'Others']

    const [images, setImages] = useState({ 1: { file: null, preview: null }, 2: { file: null, preview: null }, 3: { file: null, preview: null }, 4: { file: null, preview: null } })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
        stock: "in_stock",
        images: [],
        itemNumber: ""
    })
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 4000) // 4s timeout
                const res = await fetch(`/api/products/${productId}`, { signal: controller.signal })
                clearTimeout(timeout)
                if (!res.ok) throw new Error('Failed to fetch product')
                const product = await res.json()
                setProductInfo({
                    name: product.name || "",
                    description: product.description || "",
                    mrp: product.mrp || 0,
                    price: product.price || 0,
                    category: product.category || "",
                    stock: product.stock || "in_stock",
                    images: product.images || [],
                    itemNumber: product.itemNumber || ""
                })
                // Set preview images
                if (product.images && product.images.length > 0) {
                    const newImages = { ...images }
                    product.images.forEach((img, idx) => {
                        const key = String(idx + 1)
                        if (newImages[key]) {
                            newImages[key].preview = img
                        }
                    })
                    setImages(newImages)
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.error(e)
                toast.error('Could not load product')
            } finally {
                setInitialLoading(false)
            }
        }
        if (productId) fetchProduct()
    }, [productId])

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)

            // upload new images that are selected
            const uploadedUrls = [...productInfo.images]
            for (const key of Object.keys(images)) {
                const item = images[key]
                const file = item?.file
                const preview = item?.preview
                
                // Skip if no new file selected and preview exists (existing image)
                if (!file && preview && uploadedUrls.includes(preview)) continue
                
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
                if (body?.url) {
                    // Replace old image or add new one
                    const idx = parseInt(key) - 1
                    if (uploadedUrls[idx]) {
                        uploadedUrls[idx] = body.url
                    } else {
                        uploadedUrls.push(body.url)
                    }
                }
            }

            const payload = {
                name: productInfo.name,
                description: productInfo.description,
                mrp: productInfo.mrp,
                price: productInfo.price,
                images: uploadedUrls,
                category: productInfo.category,
                stock: productInfo.stock,
                storeId: 'default-store',
                itemNumber: productInfo.itemNumber
            }

            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 4000) // 4s timeout
            const res = await fetch(`/api/admin/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
            clearTimeout(timeout)
            if (!res.ok) throw new Error('Failed to update product')
            const updated = await res.json()
            toast.success('Product updated')
            // redirect after success
            setTimeout(() => window.location.href = '/store/manage-product', 1000)
        } catch (err) {
            console.error(err)
            toast.error('Could not update product')
        } finally { setLoading(false) }
        
    }

    if (initialLoading) return <div className="text-slate-500">Loading...</div>

    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Updating Product..." })} className="text-slate-500 mb-28">
            <h1 className="text-2xl">Edit <span className="text-slate-800 font-medium">Product</span></h1>
            <p className="mt-7">Product Images</p>

            <div htmlFor="" className="flex gap-3 mt-4">
                {Object.keys(images).map((key) => {
                    const image = images[key]
                    return (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image width={150} height={150} className='h-40 w-40 border border-slate-200 rounded cursor-pointer object-cover' src={image?.preview ? image.preview : assets.upload_area} alt="Product image upload area" />
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

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Name
                <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="Enter product name" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required />
            </label>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Item Number
                <input type="text" name="itemNumber" onChange={onChangeHandler} value={productInfo.itemNumber} placeholder="Enter item number (e.g., PN-001)" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" />
            </label>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Description
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Enter product description" rows={5} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
            </label>

            <div className="flex gap-5">
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Actual Price (₹)
                    <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded" required />
                </label>
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Offer Price (₹)
                    <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded" required />
                </label>
            </div>

            <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded" required>
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>

            <label htmlFor="" className="flex flex-col gap-2 my-6">
                Stock Status
                <select onChange={e => setProductInfo({ ...productInfo, stock: e.target.value })} value={productInfo.stock} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded">
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>
            </label>

            <br />

            <button disabled={loading} className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition">Update Product</button>
        </form>
    )
}
