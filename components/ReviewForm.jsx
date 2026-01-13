'use client'

import { Star, XIcon } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/providers/AuthProvider';

const ReviewForm = ({ productId, productName, onClose, onSuccess }) => {
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
                productId,
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
            if (typeof onSuccess === 'function') onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Could not submit review');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
            <div className='bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto'>
                <button 
                    onClick={onClose} 
                    className='absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-gray-500 hover:text-gray-700 transition'
                >
                    <XIcon size={20} />
                </button>

                <h2 className='text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 mb-1 pr-8'>Write a Review</h2>
                <p className='text-xs sm:text-sm text-slate-600 mb-4'>{productName}</p>

                {/* Star Rating */}
                <div className='mb-5 sm:mb-6'>
                    <p className='text-xs sm:text-sm font-medium text-slate-700 mb-2 sm:mb-3'>Your Rating</p>
                    <div className='flex items-center gap-1.5 sm:gap-2 justify-center'>
                        {Array.from({ length: 5 }, (_, i) => (
                            <Star
                                key={i}
                                className={`size-7 sm:size-8 md:size-10 cursor-pointer transition ${
                                    rating > i 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                }`}
                                onClick={() => setRating(i + 1)}
                            />
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className='text-center text-xs sm:text-sm text-yellow-600 mt-2'>
                            {rating} star{rating !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {/* Review Text */}
                <div className='mb-5 sm:mb-6'>
                    <label htmlFor='review-textarea' className='block text-xs sm:text-sm font-medium text-slate-700 mb-2'>
                        Your Review (minimum 5 characters)
                    </label>
                    <textarea
                        id='review-textarea'
                        className='w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none text-xs sm:text-sm'
                        placeholder='Share your experience with this product...'
                        rows='4'
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        disabled={loading}
                    />
                    <p className='text-xs text-slate-500 mt-1'>
                        {review.length} characters
                    </p>
                </div>

                {/* Buttons */}
                <div className='flex gap-2 sm:gap-3 flex-col-reverse sm:flex-row pt-3 sm:pt-4 border-t border-gray-200'>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className='flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-md text-slate-700 font-medium hover:bg-gray-50 transition disabled:bg-gray-100 disabled:text-gray-400 text-xs sm:text-sm'
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className='flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-yellow-500 text-white font-medium rounded-md hover:bg-yellow-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm'
                    >
                        {loading ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewForm;
