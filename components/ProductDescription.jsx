'use client'
import { ArrowRight, StarIcon, Edit2Icon, Trash2Icon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import ReviewForm from "./ReviewForm"
import EditReviewForm from "./EditReviewForm"
import { useUser } from "@clerk/nextjs"
import toast from "react-hot-toast"

const ProductDescription = ({ product = {} }) => {

    const { user } = useUser();
    const [selectedTab, setSelectedTab] = useState('Description')
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [editingReview, setEditingReview] = useState(null)

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

    const handleReviewSuccess = async () => {
        // Ensure we wait a moment for the database to sync, then refetch
        await new Promise(r => setTimeout(r, 500));
        await fetchReviews();
    }

    const handleDeleteReview = async (ratingId) => {
        if (!confirm('Are you sure you want to delete this review?')) return;
        
        try {
            if (!user?.id) {
                toast.error('You must be logged in to delete reviews');
                return;
            }

            const res = await fetch(`/api/ratings/${ratingId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete review');
            }

            toast.success('Review deleted successfully');
            await fetchReviews();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Could not delete review');
        }
    }

    return (
        <div className="my-12 sm:my-18 text-xs sm:text-sm text-slate-600">

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-4 sm:mb-6 max-w-2xl items-center">
                {['Description', 'Reviews'].map((tab, index) => (
                    <button className={`${tab === selectedTab ? 'border-b-[1.5px] font-semibold' : 'text-slate-400'} px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm flex items-center gap-2`} key={index} onClick={() => setSelectedTab(tab)}>
                        {tab}
                        {tab === 'Reviews' && <span className='text-xs bg-slate-200 px-2 py-0.5 rounded-full'>{reviews.length}</span>}
                    </button>
                ))}
            </div>

            {/* Description */}
            {selectedTab === "Description" && (
                <p className="max-w-xl text-xs sm:text-sm leading-relaxed">{description}</p>
            )}

            {/* Reviews */}
            {selectedTab === "Reviews" && (
                <div className="w-full">
                    {/* Review Form Modal - removed, now in ProductDetails */}

                    {/* Reviews List */}
                    {loading ? (
                        <p className="text-slate-500 text-xs sm:text-sm">Loading reviews...</p>
                    ) : reviews.length > 0 ? (
                        <div className="flex flex-col gap-4 sm:gap-6">
                            {reviews.map((item, index) => (
                                <div key={index} className="flex gap-2 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200 last:border-0">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        <Image
                                            src={item?.userImage || '/assets/slide_1.jpg'}
                                            alt={item?.userName || 'User'}
                                            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full object-cover"
                                            width={50}
                                            height={50}
                                            onError={(e) => { e.target.src = '/assets/slide_1.jpg' }}
                                        />
                                    </div>

                                    {/* Review Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Rating Stars */}
                                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                            {Array(5).fill('').map((_, i) => (
                                                <StarIcon
                                                    key={i}
                                                    size={14}
                                                    className='sm:size-4'
                                                    fill={(item?.rating || 0) >= i + 1 ? "#FFD700" : "#D1D5DB"}
                                                    stroke={(item?.rating || 0) >= i + 1 ? "#FFD700" : "#D1D5DB"}
                                                />
                                            ))}
                                            <span className="text-xs font-medium text-slate-700 ml-1">
                                                {item?.rating}/5
                                            </span>
                                        </div>

                                        {/* User Name and Date */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 text-xs sm:text-sm md:text-base">
                                                    {item?.userName || 'Anonymous'}
                                                </p>
                                                <p className="text-xs text-slate-500 mb-2">
                                                    {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                                                </p>
                                            </div>
                                            
                                            {/* Edit/Delete Buttons - only show for review author */}
                                            {user?.id === item?.userId && (
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => setEditingReview({...item, productName: product.name})}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition"
                                                        title="Edit review"
                                                    >
                                                        <Edit2Icon size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReview(item._id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                                                        title="Delete review"
                                                    >
                                                        <Trash2Icon size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Review Text */}
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-words">
                                            {item?.review || ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 sm:py-10">
                            <p className="text-slate-500 mb-3 sm:mb-4 text-xs sm:text-sm">No reviews yet. Be the first to review!</p>
                        </div>
                    )}

                    {/* Edit Review Modal */}
                    {editingReview && (
                        <EditReviewForm
                            review={editingReview}
                            onClose={() => setEditingReview(null)}
                            onSuccess={handleReviewSuccess}
                        />
                    )}
                </div>
            )}

            {/* Store Page removed per request */}
        </div>
    )
}

export default ProductDescription