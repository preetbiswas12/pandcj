'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import ReviewForm from "./ReviewForm"
import { useUser } from "@clerk/nextjs"

const ProductDescription = ({ product = {} }) => {

    const { user } = useUser();
    const [selectedTab, setSelectedTab] = useState('Description')
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [showReviewForm, setShowReviewForm] = useState(false)

    const description = product?.description || '';
    const ratings = Array.isArray(product?.rating) ? product.rating : [];
    const store = product?.store || {};

    // Fetch reviews from API
    useEffect(() => {
        if (selectedTab === 'Reviews' && product?.id) {
            fetchReviews();
        }
    }, [selectedTab, product?.id])

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/ratings/product?productId=${product.id}`);
            if (!res.ok) throw new Error('Failed to fetch reviews');
            const data = await res.json();
            setReviews(data.data || []);
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }

    const handleReviewSuccess = () => {
        fetchReviews();
    }

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {['Description', 'Reviews'].map((tab, index) => (
                    <button className={`${tab === selectedTab ? 'border-b-[1.5px] font-semibold' : 'text-slate-400'} px-3 py-2 font-medium`} key={index} onClick={() => setSelectedTab(tab)}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Description */}
            {selectedTab === "Description" && (
                <p className="max-w-xl">{description}</p>
            )}

            {/* Reviews */}
            {selectedTab === "Reviews" && (
                <div className="w-full">
                    {/* Write Review Button */}
                    {user && (
                        <button
                            onClick={() => setShowReviewForm(true)}
                            className="mb-6 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-medium text-sm sm:text-base"
                        >
                            Write a Review
                        </button>
                    )}

                    {/* Review Form Modal */}
                    {showReviewForm && (
                        <ReviewForm
                            productId={product.id}
                            productName={product.name}
                            onClose={() => setShowReviewForm(false)}
                            onSuccess={handleReviewSuccess}
                        />
                    )}

                    {/* Reviews List */}
                    {loading ? (
                        <p className="text-slate-500">Loading reviews...</p>
                    ) : reviews.length > 0 ? (
                        <div className="flex flex-col gap-6">
                            {reviews.map((item, index) => (
                                <div key={index} className="flex gap-3 sm:gap-5 pb-6 border-b border-slate-200 last:border-0">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        <Image
                                            src={item?.userImage || '/assets/slide_1.jpg'}
                                            alt={item?.userName || 'User'}
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                                            width={50}
                                            height={50}
                                            onError={(e) => { e.target.src = '/assets/slide_1.jpg' }}
                                        />
                                    </div>

                                    {/* Review Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Rating Stars */}
                                        <div className="flex items-center gap-2 mb-1">
                                            {Array(5).fill('').map((_, i) => (
                                                <StarIcon
                                                    key={i}
                                                    size={16}
                                                    className='text-transparent'
                                                    fill={(item?.rating || 0) >= i + 1 ? "#FFD700" : "#D1D5DB"}
                                                />
                                            ))}
                                            <span className="text-xs sm:text-sm font-medium text-slate-700">
                                                {item?.rating}/5
                                            </span>
                                        </div>

                                        {/* User Name and Date */}
                                        <p className="font-semibold text-slate-800 text-sm sm:text-base">
                                            {item?.userName || 'Anonymous'}
                                        </p>
                                        <p className="text-xs sm:text-sm text-slate-500 mb-2">
                                            {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                                        </p>

                                        {/* Review Text */}
                                        <p className="text-sm sm:text-base text-slate-700 leading-relaxed break-words">
                                            {item?.review || ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-slate-500 mb-4">No reviews yet. Be the first to review!</p>
                            {user && (
                                <button
                                    onClick={() => setShowReviewForm(true)}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-medium text-sm"
                                >
                                    Write the First Review
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Store Page removed per request */}
        </div>
    )
}

export default ProductDescription