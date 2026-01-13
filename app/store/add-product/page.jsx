'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function StoreAddProduct() {

    const router = useRouter()
    const categories = ['Earrings', 'Necklace', 'Heavy Necklace', 'Fashionable Earrings', 'Others']

    const [images, setImages] = useState({ 1: { file: null, preview: null }, 2: { file: null, preview: null }, 3: { file: null, preview: null }, 4: { file: null, preview: null } })
    const [storeId, setStoreId] = useState(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
        stock: "in_stock"
    })
    const [loading, setLoading] = useState(false)

    // Check admin authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                console.log('[AddProduct] Checking store authentication...')
                const authToken = localStorage.getItem('authToken')
                if (!authToken) {
                    console.log('[AddProduct] No auth token, redirecting to store login')
                    toast.error('Please login to add products')
                    setTimeout(() => {
                        router.push('/store/login')
                    }, 1000)
                    return
                }

                console.log('[AddProduct] Auth token available, verifying...')
                const res = await fetch('/api/auth/me', {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                })

                if (res.ok) {
                    const user = await res.json()
                    console.log('[AddProduct] User authenticated:', user.id)
                    setIsAuthenticated(true)
                    fetchStore(authToken)
                } else {
                    console.log('[AddProduct] Auth verification failed, redirecting to login')
                    toast.error('Session expired, please login again')
                    localStorage.removeItem('authToken')
                    setTimeout(() => {
                        router.push('/store/login')
                    }, 1000)
                }
            } catch (err) {
                console.error('[AddProduct] Auth check error:', err)
                toast.error('Authentication error, please login again')
                setTimeout(() => {
                    router.push('/store/login')
                }, 1000)
            }
        }

        checkAuth()
    }, [router])

    // Fetch user's store
    const fetchStore = async (token) => {
        try {
            console.log('[AddProduct] Fetching store...')
            const res = await fetch('/api/store', { 
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            
            if (res.ok) {
                const store = await res.json()
                console.log('[AddProduct] Store fetched successfully:', store)
                setStoreId(store?.id || 'default-store')
            } else {
                console.warn('[AddProduct] Failed to fetch store')
                setStoreId('default-store')
            }
        } catch (err) {
            console.error('[AddProduct] Failed to fetch store:', err)
            setStoreId('default-store')
        }
    }

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        const loadingToast = toast.loading('Adding Product...')
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
                
                try {
                    console.log('[AddProduct] Uploading image:', file.name)
                    const dataUrl = preview || await new Promise((resolve, reject) => {
                        const r = new FileReader()
                        r.onload = () => resolve(r.result)
                        r.onerror = reject
                        r.readAsDataURL(file)
                    })
                    const base64 = dataUrl.split(',')[1]
                    const res = await fetch('/api/admin/stores/upload', { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ data: base64, filename: file.name }) 
                    })
                    
                    // Check if response is ok first before parsing
                    if (!res.ok) {
                        let errorMsg = 'Unknown error'
                        try {
                            const body = await res.json()
                            errorMsg = body?.error?.message || body?.error || 'Upload failed'
                        } catch {
                            errorMsg = `HTTP ${res.status}`
                        }
                        console.error('[AddProduct] Upload failed:', errorMsg)
                        throw new Error(errorMsg)
                    }
                    
                    // Parse successful response
                    const body = await res.json()
                    if (!body?.url) {
                        throw new Error('No URL returned from server')
                    }
                    
                    console.log('[AddProduct] Image uploaded successfully:', body.url)
                    uploadedUrls.push(body.url)
                } catch (uploadErr) {
                    console.error('[AddProduct] Upload error:', uploadErr.message)
                    toast.error(`Failed to upload ${file.name}: ${uploadErr.message}`)
                    throw uploadErr
                }
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

            console.log('[AddProduct] Sending payload:', payload)

            const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            
            console.log('[AddProduct] Response status:', res.status)
            
            if (!res.ok) {
                const errorData = await res.json()
                console.error('[AddProduct] Error response:', errorData)
                throw new Error(errorData?.error || 'Failed to create product')
            }
            const created = await res.json()
            console.log('[AddProduct] Product created:', created)
            toast.dismiss(loadingToast)
            toast.success('Product added successfully!')
            // reset form
            setProductInfo({ name: '', description: '', mrp: 0, price: 0, category: '', stock: 'in_stock' })
            setImages({ 1: { file: null, preview: null }, 2: { file: null, preview: null }, 3: { file: null, preview: null }, 4: { file: null, preview: null } })
        } catch (err) {
            console.error('[AddProduct] Error:', err)
            toast.dismiss(loadingToast)
            toast.error(err.message || 'Could not add product')
        } finally { 
            setLoading(false) 
        }
    }


    return (
        <form onSubmit={onSubmitHandler} className="text-slate-500 mb-28 p-4 sm:p-0">
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