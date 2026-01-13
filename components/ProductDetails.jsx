'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { toast } from 'react-hot-toast'
import { addToWishlist, removeFromWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon, Heart, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Counter from "./Counter";
import ReviewForm from "./ReviewForm";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/app/providers/AuthProvider";

const ProductDetails = ({ product = {} }) => {
    const productId = product?.id ?? '';
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

    const cart = useSelector(state => state.cart.items || []);
    const wishlistItems = useSelector(state => state.wishlist?.items || [])
    const inWishlist = wishlistItems.find(i => i.id === productId)
    const isInCart = cart.some(item => item.id === productId)
    const dispatch = useDispatch();
    const { user } = useAuth();

    const router = useRouter();

    const images = Array.isArray(product.images) && product.images.length ? product.images : ['/assets/slide_1.jpg'];
    const ratings = Array.isArray(product.rating) && product.rating.length ? product.rating : [];

    const [mainImage, setMainImage] = useState(images[0]);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewCount, setReviewCount] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const imgWrapRef = useRef(null);
    const [showLens, setShowLens] = useState(false);
    const [lensStyle, setLensStyle] = useState({});
    const ZOOM_LEVEL = 2.5;
    const LENS_SIZE = 260;

    // Fetch reviews and calculate average rating from API
    useEffect(() => {
        if (productId) {
            const fetchReviews = async () => {
                try {
                    const res = await fetch(`/api/ratings/product?productId=${productId}`);
                    if (res.ok) {
                        const data = await res.json();
                        const reviews = data.data || [];
                        setReviewCount(reviews.length);
                        
                        // Calculate average rating from reviews
                        if (reviews.length > 0) {
                            const avgRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length;
                            setAverageRating(avgRating);
                        } else {
                            setAverageRating(0);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching reviews:', err);
                }
            };
            fetchReviews();
        }
    }, [productId]);

    const addToCartHandler = () => {
        if (!productId) return;
        if (product.inStock === false) return toast.error('Product is out of stock')
        dispatch(addToCart({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.images?.[0],
            product: product,
            quantity: 1
        }));
        toast.success('Added to cart!');
    }

    const toggleWishlist = () => {
        if (!productId) return
        if (inWishlist) dispatch(removeFromWishlist(productId))
        else dispatch(addToWishlist({ id: productId, name: product.name, price: product.price, images: product.images || [], category: product.category }))
    }

    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {images.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(images[index])} className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer">
                            <Image src={image} className="group-hover:scale-103 group-active:scale-95 transition" alt="Product thumbnail" width={45} height={45} />
                        </div>
                    ))}
                </div>
                <div ref={imgWrapRef} onMouseMove={(e) => {
                    const wrap = imgWrapRef.current;
                    if (!wrap) return;
                    const rect = wrap.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const bgX = x * ZOOM_LEVEL - LENS_SIZE / 2;
                    const bgY = y * ZOOM_LEVEL - LENS_SIZE / 2;
                    const left = x - LENS_SIZE / 2;
                    const top = y - LENS_SIZE / 2;
                    setLensStyle({
                        left: `${Math.max(0, Math.min(rect.width - LENS_SIZE, left))}px`,
                        top: `${Math.max(0, Math.min(rect.height - LENS_SIZE, top))}px`,
                        backgroundImage: `url(${mainImage})`,
                        backgroundSize: `${rect.width * ZOOM_LEVEL}px ${rect.height * ZOOM_LEVEL}px`,
                        backgroundPosition: `-${Math.max(0, Math.min(rect.width * ZOOM_LEVEL - LENS_SIZE, bgX))}px -${Math.max(0, Math.min(rect.height * ZOOM_LEVEL - LENS_SIZE, bgY))}px`
                    });
                    setShowLens(true);
                }} onMouseLeave={() => setShowLens(false)} className="relative flex justify-center items-center h-100 sm:size-113 rounded-lg overflow-hidden bg-slate-100">
                    <Image src={mainImage} alt="Main product image" width={250} height={250} className="w-full h-full object-cover" />
                    {showLens && (
                        <div style={{
                            position: 'absolute',
                            width: LENS_SIZE,
                            height: LENS_SIZE,
                            borderRadius: '9999px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.6)',
                            pointerEvents: 'none',
                            backgroundRepeat: 'no-repeat',
                            ...lensStyle
                        }} />
                    )}
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 mt-2'>
                    <div className='flex items-center gap-2'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={16} className='sm:size-[14px] mt-0.5 shrink-0' fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} stroke={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                        ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 sm:ml-3">
                        <span className="font-semibold text-slate-700">{averageRating.toFixed(1)}</span> · {reviewCount} Review{reviewCount !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p> {currency}{product.price} </p>
                    <p className="text-xl text-slate-500 line-through">{currency}{product.mrp}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                    <TagIcon size={14} />
                    <p>Save {product.mrp ? ((product.mrp - product.price) / product.mrp * 100).toFixed(0) : 0}% right now</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4 mt-6 sm:mt-8">
                    {isInCart && (
                        <div className="flex flex-col gap-2">
                            <p className="text-base sm:text-lg text-slate-800 font-semibold">Quantity</p>
                            <Counter productId={productId} />
                        </div>
                    )}
                    <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row flex-1 sm:flex-initial">
                        <button onClick={() => !isInCart ? addToCartHandler() : router.push('/cart')} className="w-full sm:w-auto bg-slate-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition">
                            {!isInCart ? 'Add to Cart' : 'View Cart'}
                        </button>
                        <button title="Add to wishlist" aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"} onClick={toggleWishlist} className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium ${inWishlist ? 'bg-rose-100 text-rose-600' : 'bg-white border'} border-slate-200`}>
                            <Heart size={16} className="shrink-0" />
                            <span className="hidden sm:inline">{inWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
                            <span className="sm:hidden">{inWishlist ? 'Saved' : 'Wishlist'}</span>
                        </button>
                        {user && (
                            <button onClick={() => setShowReviewForm(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition font-medium text-xs sm:text-sm">
                                <MessageCircle size={16} className="shrink-0" />
                                <span className="hidden sm:inline">Write Review</span>
                                <span className="sm:hidden">Review</span>
                            </button>
                        )}
                    </div>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Shipping Worldwide , T&C apply. </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> 100% Secured Payment </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Trusted by top brands </p>
                </div>

                {/* Review Form Modal */}
                {showReviewForm && (
                    <ReviewForm
                        productId={productId}
                        productName={product.name}
                        onClose={() => setShowReviewForm(false)}
                        onSuccess={() => {
                            // Refetch review count
                            fetch(`/api/ratings/product?productId=${productId}`)
                                .then(r => r.json())
                                .then(d => setReviewCount(d.count || 0))
                                .catch(e => console.error(e));
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default ProductDetails