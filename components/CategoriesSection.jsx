'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/app/providers/AuthProvider'
import { Settings } from 'lucide-react'

const CategoriesSection = () => {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()
    const isAdmin = user?.role === 'ADMIN'

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories', {
                    cache: 'no-store'
                })
                if (res.ok) {
                    const data = await res.json()
                    setCategories(data.data || [])
                } else {
                    console.warn('Failed to fetch categories:', res.status)
                }
            } catch (error) {
                console.error('Error fetching categories:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchCategories()
        
        // Refresh categories every 5 minutes to catch any deletions
        const interval = setInterval(fetchCategories, 5 * 60 * 1000)
        
        return () => clearInterval(interval)
    }, [])

    if (categories.length === 0) return null

    return (
        <div className='py-4 sm:py-6 mx-3 sm:mx-6 md:mx-8'>
            <div className='max-w-7xl mx-auto'>
                {/* Admin Link - Only visible to admins */}
                {isAdmin && (
                    <div className='flex justify-end mb-2'>
                        <Link
                            href='/admin/categories'
                            className='flex items-center gap-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors text-xs'
                            title='Manage Categories'
                        >
                            <Settings size={14} />
                            <span className='max-sm:hidden'>Manage</span>
                        </Link>
                    </div>
                )}

                {/* Categories Grid - Flipkart Style */}
                <div className='flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8'>
                    {categories.map((category) => (
                        <Link
                            key={category._id}
                            href={category.link || `/shop?category=${encodeURIComponent(category.name)}`}
                            className='flex flex-col items-center gap-2 group cursor-pointer min-w-[70px] sm:min-w-[80px] md:min-w-[100px]'
                        >
                            {/* Circular Image */}
                            <div className='relative w-14 sm:w-16 md:w-20 h-14 sm:h-16 md:h-20 rounded-full overflow-hidden shadow-sm group-hover:shadow-md transition-all group-hover:scale-105'>
                                <Image
                                    src={category.image}
                                    alt={category.name}
                                    fill
                                    className='object-cover'
                                />
                            </div>

                            {/* Category Name */}
                            <p className='text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 text-center line-clamp-2 group-hover:text-yellow-600 transition-colors'>
                                {category.name}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default CategoriesSection
