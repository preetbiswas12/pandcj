'use client'
import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react'
import AddressModal from './AddressModal';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart } from '@/lib/features/cart/cartSlice'
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider'

const OrderSummary = ({ totalPrice, items }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

    const router = useRouter();

    // Safe fallback for addressList - handle undefined/null
    const addressListFromRedux = useSelector(state => state.address?.list);
    const addressList = Array.isArray(addressListFromRedux) ? addressListFromRedux : [];

    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { isSignedIn, user } = useAuth();
    const dispatch = useDispatch();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [shippingCharge, setShippingCharge] = useState(0);
    const [estimatedDays, setEstimatedDays] = useState(null);
    const [loadingShipping, setLoadingShipping] = useState(false);

    useEffect(() => {
        setIsAuthenticated(isSignedIn);
    }, [isSignedIn]);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        
        if (!couponCodeInput.trim()) {
            toast.error('Please enter a coupon code');
            return;
        }

        try {
            // Calculate total amount including shipping
            const currentTotal = totalPrice + shippingCharge;
            
            // Build query string with userId if available
            let queryString = `code=${couponCodeInput.trim()}&totalAmount=${currentTotal}`;
            if (user?.id) {
                queryString += `&userId=${user.id}`;
            }
            
            const res = await fetch(`/api/coupon/validate?${queryString}`, {
                method: 'GET',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Invalid coupon code');
            }

            const couponData = await res.json();
            
            if (!couponData.valid) {
                throw new Error(couponData.error || 'Invalid or expired coupon');
            }

            // Check minimum order amount
            if (couponData.minimumOrderAmount && currentTotal < couponData.minimumOrderAmount) {
                throw new Error(`This coupon requires a minimum order amount of ${currency}${couponData.minimumOrderAmount}. Current amount: ${currency}${currentTotal}`);
            }

            setCoupon(couponData);
            setCouponCodeInput('');
            toast.success(`Coupon "${couponData.code}" applied successfully!`);
        } catch (error) {
            toast.error(error.message || 'Failed to apply coupon');
            setCouponCodeInput('');
        }
    }

    const loadRazorpayScript = () => new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return reject(new Error('no window'))
        if (window.Razorpay) return resolve(true)
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve(true)
        script.onerror = () => reject(new Error('Razorpay script load failed'))
        document.body.appendChild(script)
    })

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (!isSignedIn && !isAuthenticated) {
            setShowLoginModal(true)
            return
        }

        if (!selectedAddress) {
            toast.error('Please add or select an address before placing order')
            return
        }

        // Check if any items are out of stock
        const outOfStockItems = items.filter(it => {
            const product = it.product || it
            return product?.stock === 'out_of_stock'
        })

        if (outOfStockItems.length > 0) {
            toast.error('Some items in your cart are out of stock. Please remove them before placing order.')
            return
        }

        try {
            const payload = {
                items: (items || []).map(it => {
                    const product = it.product || it
                    return {
                        productId: product?.id || null,
                        quantity: Number(it.quantity || product?.quantity || 1),
                        price: Number(it.price || product?.price || 0),
                        name: product?.name || '',
                        images: product?.images || [],
                        storeId: product?.storeId || (it.storeId || 'default-store')
                    }
                }),
                subtotal: totalPrice,
                shippingCharge: shippingCharge,
                coupon: coupon ? {
                    code: coupon.code,
                    discount: coupon.discount,
                    discountAmount: (coupon.discount / 100 * (totalPrice + shippingCharge))
                } : null,
                total: coupon ? ((totalPrice + shippingCharge) - (coupon.discount / 100 * (totalPrice + shippingCharge))) : (totalPrice + shippingCharge),
                address: selectedAddress || {},
                paymentMethod: 'RAZORPAY',
                userId: user?.id || null
            }

            // Create local pending order first
            const pendingRes = await fetch('/api/orders/create-pending', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (!pendingRes.ok) throw new Error('Could not create pending order')
            const { localOrderId } = await pendingRes.json()

            await loadRazorpayScript()
            const createRes = await fetch('/api/payments/razorpay/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: totalPrice + shippingCharge, localOrderId }) })
            if (!createRes.ok) throw new Error('Could not create payment')
            const { razorpayOrderId, amount, currency } = await createRes.json()
            
            // Start 10 minute expiry timer
            let timer = null
            try { 
                timer = setTimeout(async () => {
                    try {
                        // mark pending order expired on the server
                        await fetch('/api/orders/expire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ localOrderId }) })
                    } catch (e) { /* ignore */ }
                    try { window.Razorpay && window.Razorpay.close && window.Razorpay.close() } catch (e) {}
                    toast.error('Payment session expired')
                    router.push('/cart')
                }, 10 * 60 * 1000) 
            } catch (e) { timer = null }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: amount,
                currency: currency || 'INR',
                name: 'P&C Jewellery',
                description: 'Order Payment',
                order_id: razorpayOrderId,
                handler: async function (response) {
                    try {
                        // clear expiry timer
                        if (timer) clearTimeout(timer)
                        console.log('💳 Payment successful! Verifying order...')
                        console.log('[OrderSummary] localOrderId being sent:', localOrderId)
                        
                        const verifyRes = await fetch('/api/payments/razorpay/verify', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ 
                                razorpay_order_id: response.razorpay_order_id, 
                                razorpay_payment_id: response.razorpay_payment_id, 
                                razorpay_signature: response.razorpay_signature, 
                                localOrderId, 
                                payload 
                            }) 
                        })
                        
                        console.log('[OrderSummary] Verify response status:', verifyRes.status)
                        
                        if (!verifyRes.ok) {
                            const errorData = await verifyRes.json()
                            throw new Error(`Payment verification failed: ${errorData.error || 'Unknown error'}`)
                        }
                        
                        const data = await verifyRes.json()
                        console.log('[OrderSummary] Verify response data:', data)
                        
                        if (!data.ok || !data.id) {
                            throw new Error('Verify response missing order ID')
                        }
                        
                        // Create order in Shiprocket for shipping
                        try {
                            console.log('🚀 Creating Shiprocket order for:', data.id)
                            const shipRes = await fetch('/api/shiprocket/create-order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId: data.id,
                                    items: payload.items,
                                    totalPrice: payload.total,
                                    deliveryAddress: selectedAddress,
                                    shippingCharge: shippingCharge,
                                    userEmail: user?.primaryEmailAddress?.email || '',
                                    userName: user?.fullName || selectedAddress.name || ''
                                })
                            })
                            const shipData = await shipRes.json()
                            console.log('📦 Shiprocket response:', shipData)
                            if (!shipRes.ok) {
                                console.warn('⚠️ Shiprocket error:', shipData.warning || shipData.error)
                            } else {
                                console.log('✅ Shiprocket order created successfully')
                            }
                        } catch (shipErr) {
                            console.error('❌ Shiprocket order creation failed:', shipErr.message)
                            // Don't fail order just because shipping failed
                        }
                        
                        console.log('🧹 Clearing cart...')
                        dispatch(clearCart())
                        
                        toast.success('✅ Payment successful and order placed!')
                        
                        console.log('📍 Redirecting to /orders...')
                        // Use setTimeout to ensure cart is cleared before redirect
                        setTimeout(() => {
                            console.log('📍 Actually redirecting now...')
                            router.push('/orders')
                        }, 500)
                    } catch (err) {
                        console.error('❌ Error in payment handler:', err.message || err)
                        toast.error(err.message || 'Payment verified but order processing failed')
                    }
                },
                prefill: {
                    name: selectedAddress.name || '',
                    email: (user && (user.email || (user.primaryEmailAddress && user.primaryEmailAddress.email))) || '',
                    contact: selectedAddress.phone || ''
                },
                theme: { color: '#2563eb' }
            }

            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (err) {
            console.error(err)
            toast.error('Could not place order')
        }
    }

    const handlePlaceClick = (e) => {
        if (!isAuthenticated) {
            setShowLoginModal(true)
            return
        }

        toast.promise(handlePlaceOrder(e), { loading: 'placing Order...' })
    }

    useEffect(() => {
        // Load selected address from localStorage on mount
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('selectedAddress')
            if (saved) {
                try {
                    setSelectedAddress(JSON.parse(saved))
                } catch (e) {
                    localStorage.removeItem('selectedAddress')
                }
            }
        }
    }, [])

    useEffect(() => {
        // Save selected address to localStorage whenever it changes
        if (typeof window !== 'undefined') {
            if (selectedAddress) {
                localStorage.setItem('selectedAddress', JSON.stringify(selectedAddress))
            } else {
                localStorage.removeItem('selectedAddress')
            }
        }
    }, [selectedAddress])

    useEffect(() => {
        // Use Clerk's isSignedIn where available, fallback to localStorage check for older flows
        if (typeof window !== 'undefined') {
            const authKeys = ['user', 'clerkUserId', 'authToken', 'token']
            const found = authKeys.some(k => !!localStorage.getItem(k))
            setIsAuthenticated(found || !!isSignedIn)
        }
    }, [isSignedIn])

    // Fetch shipping charges when address or items change
    useEffect(() => {
        if (!selectedAddress || !items || items.length === 0) {
            setShippingCharge(0)
            setEstimatedDays(null)
            return
        }

        const fetchShippingCharge = async () => {
            setLoadingShipping(true)
            try {
                // Get the item weight from environment variable or default to 0.25 kg
                const itemWeight = parseFloat(process.env.NEXT_PUBLIC_SINGLE_ITEM_WEIGHT || '0.25')
                
                const requestBody = {
                    items: (items || []).map(it => {
                        const product = it.product || it
                        return {
                            productId: product?.id,
                            quantity: Number(it.quantity || 1),
                            weight: itemWeight
                        }
                    }),
                    deliveryAddress: selectedAddress,
                    coupon: coupon || null
                }
                
                console.log('[OrderSummary] 📦 Fetching shipping charge for PIN:', selectedAddress.zip)
                
                const res = await fetch('/api/shiprocket/calculate-charges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                })
                
                const data = await res.json()
                console.log('[OrderSummary] 📨 API Response Status:', res.status)
                console.log('[OrderSummary] 📨 Shipping charge:', data.shippingCharge, 'Estimated days:', data.estimatedDays)
                
                if (res.ok && data.shippingCharge !== undefined && data.shippingCharge !== null) {
                    const charge = Number(data.shippingCharge)
                    setShippingCharge(charge)
                    setEstimatedDays(data.estimatedDays || null)
                    console.log('[OrderSummary] ✅ Shipping charge updated to: ₹' + charge, 'Days:', data.estimatedDays)
                } else {
                    // API returned an error or invalid data
                    let errorMsg = data.error || data.message || 'Could not calculate shipping for this location'
                    
                    // Ensure we don't show just status codes or numbers as error messages
                    if (!errorMsg || errorMsg === '200' || errorMsg === '400' || /^\d+$/.test(String(errorMsg))) {
                        errorMsg = 'Shipping not available for this location'
                    }
                    
                    if (!res.ok && !data.error) {
                        errorMsg = 'Server error (HTTP ' + res.status + ')'
                    }
                    
                    console.error('[OrderSummary] ❌ API error:', errorMsg)
                    console.error('[OrderSummary] ❌ Response data:', data)
                    toast.error(errorMsg)
                    setShippingCharge(0)
                }
            } catch (err) {
                console.error('[OrderSummary] ❌ Network error:', err)
                toast.error('Failed to fetch shipping charges: ' + err.message)
                setShippingCharge(0)
            } finally {
                setLoadingShipping(false)
            }
        }

        fetchShippingCharge()
    }, [selectedAddress, items, coupon])

    return (
        <div className='w-full max-w-lg lg:max-w-85 bg-slate-50/30 border border-slate-200 text-slate-500 text-xs sm:text-sm rounded-xl p-4 sm:p-7'>
            <h2 className='text-lg sm:text-xl font-medium text-slate-600'>Payment Summary</h2>
            <div className='my-3 sm:my-4 py-3 sm:py-4 border-y border-slate-200 text-slate-400'>
                <p className='text-xs sm:text-sm font-medium mb-2'>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-start sm:items-center flex-wrap'>
                            <p className='text-xs sm:text-sm break-words flex-1'>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer flex-shrink-0' size={16} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-slate-400 p-2 sm:p-2 w-full my-2 sm:my-3 outline-none rounded text-xs sm:text-sm' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList
                                                .map((address, index) => ({ address, index }))
                                                .filter(({ address }) => address.name && address.city && address.zip)
                                                .map(({ address, index }) => (
                                                    <option key={index} value={index}>{address.name}, {address.city}, {address.state}, {address.zip}</option>
                                                ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1 text-xs sm:text-sm' aria-label="Add delivery address" onClick={() => setShowAddressModal(true)} >Add Address <PlusIcon size={16} /></button>
                        </div>
                    )
                }
            </div>
            <div className='pb-3 sm:pb-4 border-b border-slate-200'>
                <div className='flex justify-between gap-2 text-xs sm:text-sm'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <div className='flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end'>
                            <p>{currency}{shippingCharge.toFixed(2)}</p>
                            {loadingShipping && <span className='text-xs text-slate-400'>calculating...</span>}
                            {estimatedDays && <span className='text-xs text-green-600'>({estimatedDays}d)</span>}
                        </div>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * (totalPrice + shippingCharge)).toFixed(2)}`}</p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2 sm:mt-3'>
                        <label htmlFor="coupon-input" className='sr-only'>Coupon Code</label>
                        <input id="coupon-input" onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Coupon Code' className='border border-slate-400 p-1.5 sm:p-2 rounded w-full outline-none text-xs sm:text-sm' />
                        <button type="submit" aria-label="Apply coupon code" className='bg-slate-600 text-white px-3 py-1.5 sm:py-2 rounded hover:bg-slate-800 active:scale-95 transition-all whitespace-nowrap text-xs sm:text-sm'>Apply</button>
                    </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-1 sm:gap-2 text-xs mt-2 flex-wrap'>
                            <p>Code: <span className='font-semibold'>{coupon.code.toUpperCase()}</span></p>
                            <p className='hidden sm:block'>{coupon.description}</p>
                            <XIcon size={14} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer flex-shrink-0 ml-auto' />
                        </div>
                    )
                }
            </div>
            <div className='flex justify-between py-3 sm:py-4 text-xs sm:text-sm'>
                <p>Total:</p>
                <p className='font-medium text-right'>{currency}{coupon ? ((totalPrice + shippingCharge) - (coupon.discount / 100 * (totalPrice + shippingCharge))).toFixed(2) : (totalPrice + shippingCharge).toLocaleString()}</p>
            </div>
            <button
                onClick={handlePlaceClick}
                className={`w-full py-2 sm:py-2.5 px-3 rounded active:scale-95 transition-all text-xs sm:text-sm font-medium ${isAuthenticated ? 'bg-slate-700 text-white hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
                {isAuthenticated ? 'Place Order' : 'Login to Place Order'}
            </button>

            {/* Login required modal */}
            {showLoginModal && (
                <div onClick={() => setShowLoginModal(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white p-4 sm:p-6 rounded shadow max-w-sm w-full">
                        <h3 className="text-base sm:text-lg font-semibold mb-2">Login required</h3>
                        <p className="text-xs sm:text-sm text-slate-600 mb-4">You need to be logged in to place an order.</p>
                        <div className="flex gap-2 justify-end flex-col-reverse sm:flex-row">
                            <button onClick={() => setShowLoginModal(false)} className="px-3 py-2 bg-slate-200 rounded text-xs sm:text-sm">Cancel</button>
                            <button onClick={() => router.push('/sign-in')} className="px-3 py-2 bg-slate-700 text-white rounded text-xs sm:text-sm">Sign in</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} initial={selectedAddress} onSave={(addr) => setSelectedAddress(addr)} />}

        </div>
    )
}

export default OrderSummary