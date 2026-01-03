'use client'

import { Star } from 'lucide-react';
import React, { useState } from 'react'
import { XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/nextjs';

const RatingModal = ({ ratingModal, setRatingModal }) => {

    const { user } = useUser();
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
                userImage: user?.imageUrl || null,
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
        <div className='fixed inset-0 z-120 flex items-center justify-center bg-black/10'>
            <div className='bg-white p-8 rounded-lg shadow-lg w-96 relative'>
                <button onClick={() => setRatingModal(null)} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700'>
                    <XIcon size={20} />
                </button>
                <h2 className='text-xl font-medium text-slate-600 mb-4'>Rate Product</h2>
                <div className='flex items-center justify-center mb-4'>
                    {Array.from({ length: 5 }, (_, i) => (
                        <Star
                            key={i}
                            className={`size-8 cursor-pointer ${rating > i ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                            onClick={() => setRating(i + 1)}
                        />
                    ))}
                </div>
                <textarea
                    className='w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400'
                    placeholder='Write your review (optional)'
                    rows='4'
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    disabled={loading}
                ></textarea>
                <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className='w-full bg-yellow-500 text-white py-2 rounded-md hover:bg-yellow-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed'
                >
                    {loading ? 'Submitting...' : 'Submit Rating'}
                </button>
            </div>
        </div>
    )
}

export default RatingModal