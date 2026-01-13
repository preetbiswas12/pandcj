'use client'
import PageTitle from '@/components/PageTitle'
import Image from 'next/image'
import { useSelector, useDispatch } from 'react-redux'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { removeFromWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function WishlistPage() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
    const wishlistItems = useSelector(state => state.wishlist?.items || [])
    const dispatch = useDispatch()

    const moveToCart = (item) => {
        if (!item || !item.id) return
        if (item.inStock === false) {
            toast.error('Cannot add — product is out of stock')
            return
        }
        dispatch(addToCart({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.images?.[0],
            product: item,
            quantity: 1
        }))
        dispatch(removeFromWishlist(item.id))
        toast.success('Moved to cart!')
    }

    const removeItem = (id) => {
        dispatch(removeFromWishlist(id))
    }

    return (
        <div className="min-h-screen mx-6 text-slate-800">
            <div className="max-w-7xl mx-auto">
                <PageTitle heading="Wishlist" text="Saved items" linkText="Shop" />

                {wishlistItems.length === 0 ? (
                    <div className="min-h-[60vh] flex items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto mb-6 w-48 h-48 md:w-64 md:h-64">
                                <img src="/images/empty_cart.png" alt="empty wishlist" className="w-full h-full  rounded" />
                            </div>
                            <h2 className="text-2xl font-semibold">Your wishlist is empty</h2>
                            <p className="text-slate-500 mt-2">Save items to view them later.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {(wishlistItems || []).map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded shadow">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 size-14 rounded flex items-center justify-center">
                                        <Image src={item.images && item.images[0] ? item.images[0] : '/assets/slide_1.jpg'} alt="" width={64} height={64} />
                                    </div>
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-slate-500">{currency}{item.price}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => moveToCart(item)} className="px-3 py-2 bg-slate-800 text-white rounded">Add to cart</button>
                                    <button onClick={() => removeItem(item.id)} className="text-red-500 p-2 rounded">
                                        <Trash2Icon />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
