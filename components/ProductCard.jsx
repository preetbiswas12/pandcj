"use client"
import { StarIcon, Heart, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addToWishlist, removeFromWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { useUser } from '@clerk/nextjs'
import ReviewForm from './ReviewForm'

const ProductCard = ({ product }) => {

    const dispatch = useDispatch()
    const { user } = useUser()
    const wishlistItems = useSelector(state => state.wishlist?.items || [])
    const inWishlist = wishlistItems.find(i => i.id === product.id)
    const [showReviewForm, setShowReviewForm] = useState(false)

    const toggleWishlist = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (inWishlist) dispatch(removeFromWishlist(product.id))
        else dispatch(addToWishlist(product))
    }

    const handleReviewClick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (user) {
            setShowReviewForm(true)
        } else {
            // Redirect to sign in or show message
            alert('Please sign in to write a review')
        }
    }

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    // calculate the average rating of the product (guard missing data)
    let rating = 0
    if (product && product.rating && Array.isArray(product.rating) && product.rating.length > 0) {
        rating = Math.round(product.rating.reduce((acc, curr) => acc + (curr.rating || 0), 0) / product.rating.length)
    }

    return (
        <>
            <div className='group max-xl:mx-auto relative'>
                <Link href={`/product/${product.id}`} className='block p-2 sm:p-0 rounded-md hover:shadow-sm transition'>
                    <div className='bg-[#F5F5F5] h-44 sm:h-68 sm:w-60 rounded-lg flex items-center justify-center overflow-hidden'>
                        {product?.images && product.images.length > 0 ? (
                            <Image width={500} height={500} className='object-cover w-full h-full' src={product.images[0]} alt={product.name || ''} />
                        ) : (
                            <div className='w-full h-full flex items-center justify-center text-slate-400 text-xs text-center'>No Image</div>
                        )}
                    </div>
                    {(product.inStock === false || product.stock === 'out_of_stock') && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                            <span className="bg-rose-100 text-rose-600 px-2 sm:px-3 py-1 rounded-md font-medium text-xs sm:text-sm">Out of stock</span>
                        </div>
                    )}
                    <div className='flex items-start justify-between gap-3 text-sm text-slate-800 pt-2 max-w-full'>
                        <div className='min-w-0 flex-1'>
                            <p className='font-medium text-xs sm:text-sm text-slate-800 truncate'>{product.name}</p>
                            <div className='flex gap-1 mt-1'>
                                {Array(5).fill('').map((_, index) => (
                                    <StarIcon key={index} size={12} className='sm:size-[14px] text-transparent mt-0.5 shrink-0' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                                ))}
                            </div>
                        </div>
                        <p className='whitespace-nowrap font-semibold text-xs sm:text-sm'>{currency}{product.price}</p>
                    </div>
                </Link>

                {/* Wishlist Button - always visible */}
                <button 
                    onClick={toggleWishlist} 
                    className={`absolute right-2 top-2 p-2 sm:p-3 rounded-full transition ${inWishlist ? 'bg-rose-100 text-rose-600' : 'bg-white/90 text-slate-600'} shadow-lg`} 
                    aria-label="Toggle wishlist"
                >
                    <Heart size={16} className='sm:size-[18px]' />
                </button>

                {/* Review Button - visible on hover (desktop) and always on mobile */}
                <button
                    onClick={handleReviewClick}
                    className='absolute left-2 top-2 p-2 sm:p-3 rounded-full bg-white/90 text-slate-600 shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200'
                    aria-label="Write review"
                >
                    <MessageCircle size={16} className='sm:size-[18px]' />
                </button>
            </div>

            {/* Review Form Modal */}
            {showReviewForm && (
                <ReviewForm
                    productId={product.id}
                    productName={product.name}
                    onClose={() => setShowReviewForm(false)}
                    onSuccess={() => {}}
                />
            )}
        </>
    )
}

export default ProductCard