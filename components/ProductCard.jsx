"use client"
import { StarIcon, Heart, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addToWishlist, removeFromWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { useAuth } from '@/app/providers/AuthProvider'
import ReviewForm from './ReviewForm'
import { generateProductSlug } from '@/lib/productSlug'

const ProductCard = ({ product }) => {

    const dispatch = useDispatch()
    const { user } = useAuth()
    const wishlistItems = useSelector(state => state.wishlist?.items || [])
    const inWishlist = wishlistItems.find(i => i.id === product.id)
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [rating, setRating] = useState(0)

    const toggleWishlist = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (inWishlist) dispatch(removeFromWishlist(product.id))
        else dispatch(addToWishlist(product))
    }

    // Fetch reviews from API to get real ratings
    useEffect(() => {
        if (product?.id) {
            const fetchReviews = async () => {
                try {
                    const res = await fetch(`/api/ratings/product?productId=${product.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        const reviews = data.data || [];
                        if (reviews.length > 0) {
                            const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
                            setRating(Math.round(avgRating));
                        } else {
                            setRating(0);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching reviews:', err);
                    setRating(0);
                }
            };
            fetchReviews();
        }
    }, [product?.id])

    const handleReviewClick = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (user) {
            setShowReviewForm(true)
        } else {
            // Redirect to sign in or show message
            alert('Please sign in to write a review')
        }
    }

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    return (
        <>
            <div className='group max-xl:mx-auto relative'>
                <Link href={`/product/${generateProductSlug(product.name, product.id)}`} className='block rounded-md hover:shadow-md transition'>
                    <div className='bg-[#F5F5F5] h-40 sm:h-56 md:h-68 rounded-lg flex items-center justify-center overflow-hidden'>
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
                    <div className='pt-2 px-1 sm:px-0'>
                        <h3 className='font-medium text-xs sm:text-sm md:text-base text-slate-800 line-clamp-2 leading-snug'>{product.name}</h3>
                        <div className='flex gap-0.5 mt-1.5 mb-1.5'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon key={index} size={14} className='sm:size-[16px] md:size-[18px] shrink-0' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} stroke={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                            ))}
                        </div>
                        <p className='font-semibold text-xs sm:text-sm md:text-base text-slate-900'>{currency}{product.price}</p>
                    </div>
                </Link>

                {/* Wishlist Button - always visible */}
                <button 
                    onClick={toggleWishlist} 
                    className={`absolute right-1.5 sm:right-2 top-1.5 sm:top-2 p-1.5 sm:p-2 rounded-full transition ${inWishlist ? 'bg-rose-100 text-rose-600' : 'bg-white/90 text-slate-600'} shadow-lg`} 
                    aria-label="Toggle wishlist"
                >
                    <Heart size={14} className='sm:size-[16px]' />
                </button>

                {/* Review Button - visible on hover (desktop) and always on mobile */}
                <button
                    onClick={handleReviewClick}
                    className='absolute left-1.5 sm:left-2 top-1.5 sm:top-2 p-1.5 sm:p-2 rounded-full bg-white/90 text-slate-600 shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200'
                    aria-label="Write review"
                >
                    <MessageCircle size={14} className='sm:size-[16px]' />
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