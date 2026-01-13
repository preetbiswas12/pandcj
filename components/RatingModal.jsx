'use client'

import { Star } from 'lucide-react';
import React, { useState } from 'react'
import { XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/providers/AuthProvider';

const RatingModal = ({ ratingModal, setRatingModal }) => {

    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating < 1 || rating > 5) {
            return toast.error('Please select a rating (1-5 stars)');
        }
        if (review.trim().length < 5) {
            return toast.error('Review must be at least 5 characters');
        }

        try {
            setLoading(true);
            const payload = {
                userId: user?.id,
                userName: user?.fullName || 'Anonymous',
                userImage: null,
                productId: ratingModal?.productId,
                orderId: ratingModal?.orderId,
                rating: Number(rating),
                review: review.trim(),
            };

            const res = await fetch('/api/ratings/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to submit review');
            }

            toast.success('Review submitted successfully!');
            setRatingModal(null);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Could not submit review');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
            <div className='bg-white rounded-lg shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto'>
                <div className='sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between'>
                    <h2 className='text-lg sm:text-xl font-semibold text-slate-800'>Rate Product</h2>
                    <button 
                        onClick={() => setRatingModal(null)} 
                        className='p-1 text-gray-500 hover:text-gray-700 transition'
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                <div className='p-4 sm:p-6 space-y-6'>
                    {/* Star Rating */}
                    <div>
                        <p className='text-sm font-medium text-slate-700 mb-3'>Your Rating</p>
                        <div className='flex items-center gap-2 justify-center'>
                            {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                    key={i}
                                    className={`size-8 sm:size-10 cursor-pointer transition ${rating > i ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                                    onClick={() => setRating(i + 1)}
                                />
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className='text-center text-sm text-yellow-600 mt-3'>
                                {rating} star{rating !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {/* Review Text */}
                    <div>
                        <label htmlFor='modal-review-text' className='block text-sm font-medium text-slate-700 mb-2'>
                            Your Review (minimum 5 characters)
                        </label>
                        <textarea
                            id='modal-review-text'
                            className='w-full p-3 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none text-sm'
                            placeholder='Share your experience...'
                            rows='4'
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            disabled={loading}
                        />
                        <p className='text-xs text-slate-500'>
                            {review.length} characters
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className='flex gap-3 flex-col sm:flex-row pt-4 border-t border-gray-200'>
                        <button
                            onClick={() => setRatingModal(null)}
                            disabled={loading}
                            className='flex-1 px-4 py-2 border border-gray-300 rounded-md text-slate-700 font-medium hover:bg-gray-50 transition disabled:bg-gray-100 disabled:text-gray-400 text-sm'
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={loading}
                            className='flex-1 px-4 py-2 bg-yellow-500 text-white font-medium rounded-md hover:bg-yellow-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm'
                        >
                            {loading ? 'Submitting...' : 'Submit Rating'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RatingModal