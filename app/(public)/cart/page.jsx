'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from '@/lib/features/cart/cartSlice'
import { removeFromWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { toast } from 'react-hot-toast'

export default function Cart() {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    
    const { items: cartItems = [] } = useSelector(state => state.cart || { items: [] });
    const dispatch = useDispatch();

    const [totalPrice, setTotalPrice] = useState(0);
    const wishlistItems = useSelector(state => state.wishlist?.items || [])

    const calculateTotalPrice = () => {
        if (!Array.isArray(cartItems)) return
        const total = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
        setTotalPrice(total)
    }

    const handleDeleteItemFromCart = (id) => {
        dispatch(deleteItemFromCart({ id }))
    }

    const moveWishlistToCart = (product) => {
        if (!product || !product.id) return
        if (product.inStock === false) {
            toast.error('Cannot add — product is out of stock')
            return
        }
        dispatch(addToCart({ 
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0],
            product: product,
            quantity: 1
        }))
        dispatch(removeFromWishlist(product.id))
    }

    useEffect(() => {
        calculateTotalPrice()
    }, [cartItems]);

    return cartItems.length > 0 ? (
        <div className="min-h-screen mx-3 sm:mx-6 text-slate-800">

            <div className="max-w-7xl mx-auto">
                {/* Title */}
                <PageTitle heading="My Cart" text="items in your cart" linkText="Add more" />

                <div className="flex flex-col lg:flex-row items-start justify-between gap-4 sm:gap-5">

                    {/* Cart Items - Desktop Table / Mobile Cards */}
                    <div className="w-full lg:max-w-4xl">
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-slate-600 table-auto">
                                <thead>
                                    <tr className="text-sm">
                                        <th className="text-left">Product</th>
                                        <th>Quantity</th>
                                        <th>Total Price</th>
                                        <th>Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        cartItems.map((item, index) => (
                                            <tr key={index} className="border-b hover:bg-slate-50 transition">
                                                <td className="flex gap-3 py-3">
                                                    <div className="flex gap-3 items-center justify-center bg-slate-100 size-16 sm:size-18 rounded-md flex-shrink-0">
                                                        <Image src={item.image} className="h-12 sm:h-14 w-auto" alt={item.name || "Product image"} width={45} height={45} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                                        <p className="text-xs text-slate-500">{item.product?.category || 'N/A'}</p>
                                                        <p className="text-sm font-semibold mt-1">{currency}{item.price}</p>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <Counter productId={item.id} />
                                                </td>
                                                <td className="text-center font-semibold">{currency}{(item.price * item.quantity).toLocaleString()}</td>
                                                <td className="text-center">
                                                    <button onClick={() => handleDeleteItemFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full active:scale-95 transition-all inline-flex">
                                                        <Trash2Icon size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {
                                cartItems.map((item, index) => (
                                    <div key={index} className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200 hover:shadow-md transition">
                                        <div className="flex gap-3 mb-3">
                                            <div className="flex gap-3 items-center justify-center bg-slate-100 size-16 rounded-md flex-shrink-0">
                                                <Image src={item.image} className="h-12 w-auto" alt={item.name || "Product image"} width={45} height={45} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.product?.category || 'N/A'}</p>
                                                <p className="text-sm font-semibold mt-1">{currency}{item.price}</p>
                                            </div>
                                            <button onClick={() => handleDeleteItemFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full active:scale-95 transition-all">
                                                <Trash2Icon size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                                            <span className="text-xs text-slate-600">Qty:</span>
                                            <Counter productId={item.id} />
                                            <span className="text-sm font-semibold ml-auto">{currency}{(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Sidebar - Cart Summary and Wishlist */}
                    <div className="w-full lg:w-80">
                        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm sticky top-24">
                            <div className="flex gap-2 mb-4">
                                <button className="flex-1 py-2 px-3 bg-yellow-600 text-white rounded text-sm font-medium">Cart</button>
                                <a href="#wishlist" className="flex-1 py-2 px-3 text-slate-600 text-sm font-medium rounded border border-slate-300 text-center">Wishlist</a>
                            </div>
                            <div>
                                <OrderSummary totalPrice={totalPrice} items={cartItems} />
                            </div>
                        </div>

                        <div id="wishlist" className="mt-4 bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-sm mb-3">Wishlist ({wishlistItems.length})</h3>
                            {wishlistItems.length === 0 ? (
                                <p className="text-xs sm:text-sm text-slate-500">No items in wishlist</p>
                            ) : (
                                <div className="flex flex-col gap-2 sm:gap-3">
                                    {wishlistItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-2 pb-3 border-b last:border-b-0 last:pb-0">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="bg-slate-100 size-10 sm:size-12 rounded flex items-center justify-center flex-shrink-0">
                                                    <Image src={item.images && item.images[0] ? item.images[0] : '/assets/slide_1.jpg'} alt="" width={48} height={48} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium truncate">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{currency}{item.price}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => moveWishlistToCart(item)} className="px-2 sm:px-3 py-1 bg-slate-800 text-white rounded text-xs sm:text-sm flex-shrink-0 hover:bg-slate-700 transition">Add</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex items-center justify-center">
            <div className="text-center">
                <div className="mx-auto mb-6 w-48 h-48 md:w-64 md:h-64">
                    <img src="/images/empty_cart.png" alt="empty cart" className=" w-full h-full " />
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-800">Your cart is empty and sad :(</h1>
                <p className="text-slate-500 mt-2">Add something to make it happy!</p>
                <div className="mt-6">
                    <a href="/shop" className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-md">Continue Shopping</a>
                </div>
            </div>
        </div>
    )
}