import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import AddressModal from './AddressModal';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart } from '@/lib/features/cart/cartSlice'
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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
    const { isSignedIn, user } = useUser();
    const dispatch = useDispatch();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [shippingCharge, setShippingCharge] = useState(0);
    const [estimatedDays, setEstimatedDays] = useState(null);
    const [loadingShipping, setLoadingShipping] = useState(false);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        
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
                total: totalPrice + shippingCharge,
                shippingCharge: shippingCharge,
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
                name: 'Gocart',
                description: 'Order Payment',
                order_id: razorpayOrderId,
                handler: async function (response) {
                    try {
                        // clear expiry timer
                        if (timer) clearTimeout(timer)
                        const verifyRes = await fetch('/api/payments/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, localOrderId, payload }) })
                        if (!verifyRes.ok) throw new Error('Payment verification failed')
                        const data = await verifyRes.json()
                        
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
                        
                        dispatch(clearCart())
                        toast.success('Payment successful and order placed')
                        router.push('/orders')
                    } catch (err) {
                        console.error(err)
                        toast.error('Payment successful but order creation failed')
                    }
                },
                prefill: {
                    name: selectedAddress.name || '',
                    email: (user && user.primaryEmailAddress && user.primaryEmailAddress.email) || '',
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
                const requestBody = {
                    items: (items || []).map(it => {
                        const product = it.product || it
                        return {
                            productId: product?.id,
                            quantity: Number(it.quantity || 1),
                            weight: 0.5
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
                console.log('[OrderSummary] 📨 API Response Full:', JSON.stringify(data))
                
                if (res.ok && data.shippingCharge !== undefined && data.shippingCharge !== null) {
                    const charge = Number(data.shippingCharge)
                    setShippingCharge(charge)
                    setEstimatedDays(data.estimatedDays || null)
                    console.log('[OrderSummary] ✅ Shipping charge set to: ₹' + charge)
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
        <div className='w-full max-w-lg lg:max-w-85 bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.city}, {address.state}, {address.zip}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)} >Add Address <PlusIcon size={18} /></button>
                        </div>
                    )
                }
            </div>
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <div className='flex items-center gap-2'>
                            <p>{currency}{shippingCharge.toFixed(2)}</p>
                            {loadingShipping && <span className='text-xs text-slate-400'>calculating...</span>}
                            {estimatedDays && <span className='text-xs text-green-600'>({estimatedDays} days)</span>}
                        </div>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * (totalPrice + shippingCharge)).toFixed(2)}`}</p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Coupon Code' className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Apply</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>
            <div className='flex justify-between py-4'>
                <p>Total:</p>
                <p className='font-medium text-right'>{currency}{coupon ? ((totalPrice + shippingCharge) - (coupon.discount / 100 * (totalPrice + shippingCharge))).toFixed(2) : (totalPrice + shippingCharge).toLocaleString()}</p>
            </div>
            <button
                onClick={handlePlaceClick}
                className={`w-full py-2.5 rounded active:scale-95 transition-all ${isAuthenticated ? 'bg-slate-700 text-white hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
                {isAuthenticated ? 'Place Order' : 'Login to Place Order'}
            </button>

            {/* Login required modal */}
            {showLoginModal && (
                <div onClick={() => setShowLoginModal(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={e => e.stopPropagation()} className="bg-white p-6 rounded shadow max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-2">Login required</h3>
                        <p className="text-sm text-slate-600 mb-4">You need to be logged in to place an order.</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowLoginModal(false)} className="px-3 py-2 bg-slate-200 rounded">Cancel</button>
                            <button onClick={() => router.push('/sign-in')} className="px-3 py-2 bg-slate-700 text-white rounded">Sign in</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} initial={selectedAddress} onSave={(addr) => setSelectedAddress(addr)} />}

        </div>
    )
}

export default OrderSummary