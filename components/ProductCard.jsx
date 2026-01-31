"use client"
import { StarIcon, Heart, MessageCircle, ShoppingCartIcon, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addToWishlist, removeFromWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { useAuth } from '@/app/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import ReviewForm from './ReviewForm'
import QuickViewModal from './QuickViewModal'
import { generateProductSlug } from '@/lib/productSlug'
import toast from 'react-hot-toast'

// ProductCard now accepts rating as prop instead of fetching individually
const ProductCard = ({ product, rating = 0 }) => {

    const dispatch = useDispatch()
    const router = useRouter()
    const { user } = useAuth()
    const wishlistItems = useSelector(state => state.wishlist?.items || [])
    const inWishlist = wishlistItems.find(i => i.id === product.id)
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [showQuickView, setShowQuickView] = useState(false)

    const toggleWishlist = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (inWishlist) dispatch(removeFromWishlist(product.id))
        else dispatch(addToWishlist(product))
    }

    const handleReviewClick = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (user) {
            setShowReviewForm(true)
        } else {
            alert('Please sign in to write a review')
        }
    }

    const handleQuickView = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setShowQuickView(true)
    }

    const handleAddToCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        dispatch(addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0],
            product: product,
            quantity: 1
        }))
        
        toast.success('Added to cart!')
    }

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
    const originalPrice = product.originalPrice || product.mrp
    const discountPercent = originalPrice ? Math.round(((originalPrice - product.price) / originalPrice) * 100) : 0
    const isOutOfStock = product.inStock === false || product.stock === 'out_of_stock'
    const isLowStock = product.stock < 5 && product.stock > 0

    return (
        <>
            <div className='group max-xl:mx-auto relative h-full'>
                <Link href={`/product/${generateProductSlug(product.name, product.id)}`} className='rounded-md hover:shadow-md transition h-full flex flex-col'>
                    <div className='bg-[#F5F5F5] h-40 sm:h-56 md:h-68 rounded-lg flex items-center justify-center overflow-hidden relative flex-shrink-0'>
                        {product?.images && product.images.length > 0 ? (
                            <Image 
                                width={500} 
                                height={500} 
                                className={`object-cover w-full h-full transition-all ${isOutOfStock ? 'blur-sm' : ''}`}
                                src={product.images[0]} 
                                alt={product.name || ''} 
                            />
                        ) : (
                            <div className='w-full h-full flex items-center justify-center text-slate-400 text-xs text-center'>No Image</div>
                        )}
                        
                        {/* Out of Stock Overlay with Blurred Image */}
                        {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                                <span className="bg-rose-600 text-white px-3 sm:px-4 py-2 rounded-md font-bold text-xs sm:text-sm">
                                    Out of Stock
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {/* Product Info - Fixed Height Container */}
                    <div className='pt-2 pb-12 px-1 sm:px-0 flex flex-col flex-grow'>
                        <h3 className='font-medium text-xs sm:text-sm md:text-base text-slate-800 line-clamp-2 leading-snug h-8 sm:h-10 md:h-12'>{product.name}</h3>
                        <div className='flex gap-0.5 mt-1.5 mb-1.5'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon key={index} size={14} className='sm:size-[16px] md:size-[18px] shrink-0' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} stroke={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                            ))}
                        </div>
                        <div className='flex items-center gap-2 flex-wrap'>
                            <p className='font-semibold text-xs sm:text-sm md:text-base text-slate-900'>{currency}{product.price}</p>
                            {originalPrice && originalPrice > product.price && (
                                <p className='text-xs sm:text-sm text-slate-400 line-through'>{currency}{originalPrice}</p>
                            )}
                            {discountPercent > 0 && (
                                <span className='text-xs sm:text-sm font-medium text-green-600'>Save {discountPercent}%</span>
                            )}
                        </div>
                    </div>
                </Link>

                {/* Wishlist Button - always visible */}
                <button 
                    onClick={toggleWishlist} 
                    className={`absolute right-1.5 sm:right-2 top-1.5 sm:top-2 p-1.5 sm:p-2 rounded-full transition active:scale-90 ${inWishlist ? 'bg-rose-100 text-rose-600' : 'bg-white/90 text-slate-600'} shadow-lg hover:shadow-xl`} 
                    aria-label="Toggle wishlist"
                >
                    <Heart size={14} className='sm:size-[16px]' />
                </button>

                {/* Review Button - visible on hover (desktop) and always on mobile */}
                <button
                    onClick={handleReviewClick}
                    className='absolute left-1.5 sm:left-2 top-1.5 sm:top-2 p-1.5 sm:p-2 rounded-full bg-white/90 text-slate-600 shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 hover:shadow-xl active:scale-90'
                    aria-label="Write review"
                >
                    <MessageCircle size={14} className='sm:size-[16px]' />
                </button>

                {/* Quick View Button - visible on mobile and hover (desktop) */}
                <button
                    onClick={handleQuickView}
                    className='absolute left-12 sm:left-12 top-1.5 sm:top-2 p-1.5 sm:p-2 rounded-full bg-white/90 text-slate-600 shadow-lg opacity-100 sm:group-hover:opacity-100 transition-opacity duration-200 hover:shadow-xl active:scale-90'
                    aria-label="Quick view"
                    title="Quick View"
                >
                    <Eye size={14} className='sm:size-[16px]' />
                </button>

                {/* Add to Cart Button - Bottom Right (always visible) */}
                <button
                    onClick={handleAddToCart}
                    disabled={product.inStock === false || product.stock === 'out_of_stock'}
                    className='absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-2 sm:p-2.5 rounded-full bg-slate-800 text-white shadow-lg transition-all duration-200 active:scale-90 hover:bg-slate-900 hover:shadow-xl disabled:bg-slate-300 disabled:cursor-not-allowed'
                    aria-label="Add to cart"
                    title="Add to cart"
                >
                    <ShoppingCartIcon size={16} className='sm:size-[18px]' />
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

            {/* Quick View Modal */}
            {showQuickView && (
                <QuickViewModal
                    product={product}
                    rating={rating}
                    onClose={() => setShowQuickView(false)}
                />
            )}
        </>
    )
}

export default ProductCard