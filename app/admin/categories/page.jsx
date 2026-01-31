'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Trash2, Edit, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'

const CategoriesAdmin = () => {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null })
    const router = useRouter()

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/categories')
            if (res.ok) {
                const data = await res.json()
                setCategories(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
            toast.error('Failed to fetch categories')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        setDeleteConfirm({ open: true, id })
    }

    const handleConfirmDelete = async () => {
        const id = deleteConfirm.id
        setDeleteConfirm({ open: false, id: null })

        try {
            // Encode the ID in case it contains special characters
            const encodedId = encodeURIComponent(id)
            const res = await fetch(`/api/categories/${encodedId}`, {
                method: 'DELETE'
            })

            const data = await res.json()

            if (res.ok) {
                toast.success('Category deleted successfully')
                setCategories(categories.filter(cat => cat._id !== id))
            } else {
                toast.error(data.message || 'Failed to delete category')
            }
        } catch (error) {
            console.error('Error deleting category:', error)
            toast.error('Failed to delete category')
        }
    }

    const handleCancelDelete = () => {
        setDeleteConfirm({ open: false, id: null })
    }

    return (
        <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100'>
            <div className='max-w-7xl mx-auto p-6'>
                {/* Header */}
                <div className='flex items-center justify-between mb-8'>
                    <div>
                        <h1 className='text-3xl font-bold text-slate-900'>Categories Management</h1>
                        <p className='text-slate-600 mt-2'>Manage product categories for your store</p>
                    </div>
                    <Link
                        href='/admin/categories/add'
                        className='flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors'
                    >
                        <Plus size={20} />
                        Add Category
                    </Link>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className='flex justify-center items-center h-64'>
                        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500'></div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && categories.length === 0 && (
                    <div className='bg-white rounded-lg shadow-sm p-12 text-center'>
                        <p className='text-slate-600 mb-4'>No categories yet</p>
                        <Link
                            href='/admin/categories/add'
                            className='text-yellow-600 hover:text-yellow-700 font-semibold'
                        >
                            Create the first category
                        </Link>
                    </div>
                )}

                {/* Categories Table */}
                {!loading && categories.length > 0 && (
                    <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead className='bg-slate-50 border-b border-slate-200'>
                                    <tr>
                                        <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900'>Image</th>
                                        <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900'>Category Name</th>
                                        <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900'>Created At</th>
                                        <th className='px-6 py-4 text-right text-sm font-semibold text-slate-900'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-slate-200'>
                                    {categories.map((category) => (
                                        <tr key={category._id} className='hover:bg-slate-50 transition-colors'>
                                            {/* Image */}
                                            <td className='px-6 py-4'>
                                                <div className='relative w-16 h-16 rounded-full overflow-hidden bg-slate-100'>
                                                    <Image
                                                        src={category.image}
                                                        alt={category.name}
                                                        fill
                                                        className='object-cover'
                                                    />
                                                </div>
                                            </td>

                                            {/* Name */}
                                            <td className='px-6 py-4'>
                                                <p className='text-slate-900 font-medium'>{category.name}</p>
                                            </td>

                                            {/* Created At */}
                                            <td className='px-6 py-4 text-slate-600'>
                                                {new Date(category.createdAt).toLocaleDateString()}
                                            </td>

                                            {/* Actions */}
                                            <td className='px-6 py-4'>
                                                <div className='flex items-center justify-end gap-3'>
                                                    <Link
                                                        href={`/admin/categories/${category._id}/edit`}
                                                        className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                                                        title='Edit'
                                                    >
                                                        <Edit size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(category._id)}
                                                        className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                                                        title='Delete'
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteConfirm.open}
                title="Delete Category"
                message="Are you sure you want to delete this category?"
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onClose={handleCancelDelete}
            />
        </div>
    )
}

export default CategoriesAdmin
