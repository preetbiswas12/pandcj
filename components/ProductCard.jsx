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
                <Link href={`/product/${generateProductSlug(product.name, product.id)}`} className='bg-white rounded-xl sm:rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col overflow-hidden border border-slate-100'>
                    <div className='bg-slate-50 h-36 sm:h-56 md:h-68 flex items-center justify-center overflow-hidden relative flex-shrink-0'>
                        {product?.images && product.images.length > 0 ? (
                            <Image 
                                width={500} 
                                height={500} 
                                className={`object-cover w-full h-full transition-all group-hover:scale-105 ${isOutOfStock ? 'blur-sm' : ''}`}
                                src={product.images[0]} 
                                alt={product.name || ''} 
                            />
                        ) : (
                            <div className='w-full h-full flex items-center justify-center text-slate-400 text-xs text-center'>No Image</div>
                        )}
                        
                        {/* Out of Stock Overlay */}
                        {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="bg-rose-600 text-white px-3 sm:px-4 py-2 rounded-md font-bold text-xs sm:text-sm shadow-lg">
                                    Out of Stock
                                </span>
                            </div>
                        )}
                        
                        {/* Discount Badge */}
                        {discountPercent > 0 && !isOutOfStock && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md shadow-md">
                                -{discountPercent}%
                            </div>
                        )}
                    </div>
                    
                    {/* Product Info - Fixed Height Container */}
                    <div className='p-3 sm:p-4 pb-14 sm:pb-14 flex flex-col flex-grow bg-white'>
                        <h3 className='font-semibold text-xs sm:text-sm md:text-base text-slate-800 line-clamp-2 leading-snug min-h-[32px] sm:min-h-[40px]'>{product.name}</h3>
                        <div className='flex gap-0.5 mt-2 mb-2'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon key={index} size={12} className='sm:size-[14px] md:size-[16px] shrink-0' fill={rating >= index + 1 ? "#FBBF24" : "#E5E7EB"} stroke={rating >= index + 1 ? "#FBBF24" : "#E5E7EB"} />
                            ))}
                        </div>
                        <div className='flex items-center gap-1.5 sm:gap-2 flex-wrap mt-auto'>
                            <p className='font-bold text-sm sm:text-base md:text-lg text-slate-900'>{currency}{product.price}</p>
                            {originalPrice && originalPrice > product.price && (
                                <p className='text-[10px] sm:text-xs text-slate-400 line-through'>{currency}{originalPrice}</p>
                            )}
                        </div>
                    </div>
                </Link>

                {/* Wishlist Button - always visible */}
                <button 
                    onClick={toggleWishlist} 
                    className={`absolute right-2 sm:right-3 top-2 sm:top-3 p-2 sm:p-2.5 rounded-full transition-all active:scale-90 ${inWishlist ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-500'} shadow-md hover:shadow-lg`} 
                    aria-label="Toggle wishlist"
                >
                    <Heart size={14} className='sm:size-[16px]' fill={inWishlist ? 'currentColor' : 'none'} />
                </button>

                {/* Quick View Button - visible on mobile and hover (desktop) */}
                <button
                    onClick={handleQuickView}
                    className='absolute left-2 sm:left-3 top-2 sm:top-3 p-2 sm:p-2.5 rounded-full bg-white text-slate-600 shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:shadow-lg hover:bg-slate-100 active:scale-90'
                    aria-label="Quick view"
                    title="Quick View"
                >
                    <Eye size={14} className='sm:size-[16px]' />
                </button>

                {/* Add to Cart Button - Bottom Right */}
                <button
                    onClick={handleAddToCart}
                    disabled={product.inStock === false || product.stock === 'out_of_stock'}
                    className='absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-2.5 sm:p-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg transition-all duration-200 active:scale-90 hover:from-yellow-600 hover:to-amber-600 hover:shadow-xl disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed'
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