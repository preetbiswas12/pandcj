'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Upload, X } from 'lucide-react'

const EditCategory = () => {
    const router = useRouter()
    const params = useParams()
    const categoryId = params.id

    const [formData, setFormData] = useState({
        name: '',
        image: '',
        link: ''
    })
    const [imagePreview, setImagePreview] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)

    // Fetch category data
    useEffect(() => {
        const fetchCategory = async () => {
            try {
                console.log('[EditCategory] Fetching category with ID:', categoryId)
                const res = await fetch(`/api/categories/${categoryId}`)
                if (res.ok) {
                    const data = await res.json()
                    const category = data.data
                    setFormData({
                        name: category.name,
                        image: category.image,
                        link: category.link || ''
                    })
                    setImagePreview(category.image)
                    console.log('[EditCategory] Category loaded successfully')
                } else {
                    const errorData = await res.json()
                    console.error('[EditCategory] Failed to load:', errorData)
                    toast.error(errorData.message || 'Category not found')
                    router.push('/admin/categories')
                }
            } catch (error) {
                console.error('[EditCategory] Error fetching category:', error)
                toast.error('Failed to load category')
                router.push('/admin/categories')
            } finally {
                setLoading(false)
            }
        }

        if (categoryId) {
            fetchCategory()
        }
    }, [categoryId, router])

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            
            // Read file as base64
            const reader = new FileReader()
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1]
                
                try {
                    const res = await fetch('/api/admin/stores/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ data: base64, name: file.name })
                    })

                    if (res.ok) {
                        const data = await res.json()
                        const imageUrl = data.url || data.dataUrl
                        setFormData(prev => ({ ...prev, image: imageUrl }))
                        setImagePreview(imageUrl)
                        toast.success('Image uploaded successfully')
                    } else {
                        toast.error('Failed to upload image')
                    }
                } catch (error) {
                    console.error('Error uploading image:', error)
                    toast.error('Failed to upload image')
                } finally {
                    setUploading(false)
                }
            }
            reader.readAsDataURL(file)
        } catch (error) {
            console.error('Error reading file:', error)
            toast.error('Failed to read file')
            setUploading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error('Category name is required')
            return
        }

        if (!formData.image) {
            toast.error('Category image is required')
            return
        }
if (!formData.link.trim()) {
            toast.error('Category link is required')
            return
        }

        
        try {
            setSubmitting(true)
            const res = await fetch(`/api/categories/${categoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                toast.success('Category updated successfully')
                router.push('/admin/categories')
            } else {
                const error = await res.json()
                toast.error(error.message || 'Failed to update category')
            }
        } catch (error) {
            console.error('Error updating category:', error)
            toast.error('Failed to update category')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500'></div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6'>
            <div className='max-w-2xl mx-auto'>
                {/* Header */}
                <div className='mb-8'>
                    <h1 className='text-3xl font-bold text-slate-900'>Edit Category</h1>
                    <p className='text-slate-600 mt-2'>Update category details</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className='bg-white rounded-lg shadow-sm p-8'>
                    {/* Category Name */}
                    <div className='mb-8'>
                        <label className='block text-sm font-semibold text-slate-900 mb-2'>
                            Category Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                        Category Link */}
                    <div className='mb-8'>
                        <label className='block text-sm font-semibold text-slate-900 mb-2'>
                            Category Link *
                        </label>
                        <input
                            type="text"
                            name="link"
                            value={formData.link}
                            onChange={handleInputChange}
                            placeholder="e.g., /shop?category=Jewelry"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/*     placeholder="e.g., Women's Jewelry, Men's Clothing"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Image Upload */}
                    <div className='mb-8'>
                        <label className='block text-sm font-semibold text-slate-900 mb-4'>
                            Category Image (1080x1080px) *
                        </label>

                        {imagePreview ? (
                            <div className='relative w-48 h-48 mx-auto mb-4'>
                                <div className='relative w-full h-full rounded-full overflow-hidden bg-slate-100'>
                                    <Image
                                        src={imagePreview}
                                        alt='Preview'
                                        fill
                                        className='object-cover'
                                    />
                                </div>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setImagePreview(null)
                                        setFormData(prev => ({ ...prev, image: '' }))
                                    }}
                                    className='absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors'
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : null}

                        <label className='flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-yellow-500 transition-colors bg-slate-50'>
                            <div className='text-center'>
                                <Upload size={40} className='mx-auto text-slate-400 mb-2' />
                                <p className='text-sm font-medium text-slate-900'>
                                    Click to upload or drag and drop
                                </p>
                                <p className='text-xs text-slate-500 mt-1'>
                                    PNG, JPG, GIF up to 10MB
                                </p>
                            </div>
                            <input
                                type='file'
                                accept='image/*'
                                onChange={handleImageChange}
                                disabled={uploading}
                                className='hidden'
                            />
                        </label>

                        {uploading && (
                            <p className='text-sm text-slate-600 mt-2 text-center'>Uploading image...</p>
                        )}
                    </div>

                    {/* Submit Buttons */}
                    <div className='flex items-center gap-3 pt-6 border-t border-slate-200'>
                        <button
                            type='button'
                            onClick={() => router.back()}
                            className='px-6 py-2 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium'
                        >
                            Cancel
                        </button>
                        <button
                            type='submit'
                            disabled={submitting || uploading}
                            className='px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {submitting ? 'Updating...' : 'Update Category'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default EditCategory
