'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers/AuthProvider'
import Image from 'next/image'
import { CheckCircleIcon, ChevronRightIcon, PackageIcon, TruckIcon, CheckIcon } from 'lucide-react'

const OrderStatusTimeline = ({ status, createdAt }) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
  
  const statuses = [
    { label: 'Confirmed', value: 'confirmed', icon: CheckCircleIcon },
    { label: 'Processing', value: 'processing', icon: PackageIcon },
    { label: 'Shipped', value: 'shipped', icon: TruckIcon },
    { label: 'Delivered', value: 'delivered', icon: CheckIcon }
  ]

  // Map order status to timeline index
  const getStatusIndex = (orderStatus) => {
    if (!orderStatus) return -1
    const status = String(orderStatus).toLowerCase()
    if (status.includes('confirmed')) return 0
    if (status.includes('processing')) return 1
    if (status.includes('shipped')) return 2
    if (status.includes('delivered')) return 3
    if (status.includes('cancelled')) return -1
    return -1
  }

  const currentStatusIndex = getStatusIndex(status)
  const isCancelled = status && String(status).toUpperCase().startsWith('CANCEL')

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 md:p-8 rounded-lg mb-6 sm:mb-8">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-4 sm:mb-6 md:mb-8">Order Status</h2>
      
      {isCancelled ? (
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-6 text-center">
          <p className="text-red-700 font-semibold text-lg">🚫 Order Cancelled</p>
          <p className="text-red-600 text-sm mt-2">This order has been cancelled</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Progress Bar */}
          <div className="relative px-1 sm:px-2">
            {/* Background connecting line */}
            <div className="absolute left-5 sm:left-8 right-5 sm:right-8 top-5 sm:top-7 h-1.5 sm:h-2 bg-gray-200 rounded-full -z-20" />
            
            {/* Filled progress line */}
            <div className="absolute h-1.5 sm:h-2 bg-green-500 rounded-full -z-10 transition-all duration-500" 
              style={{
                left: currentStatusIndex >= 0 ? '1.25rem' : 'auto',
                right: currentStatusIndex >= 0 ? `calc(100% - ${((currentStatusIndex + 1) / 4) * 100}% + 1.25rem)` : 'auto',
                top: '1.25rem',
                width: currentStatusIndex >= 0 ? `calc(${((currentStatusIndex + 1) / 4) * 100}% - 1.25rem)` : '0%'
              }}
            />
            
            <div className="flex justify-between">
              {statuses.map((s, index) => {
                const Icon = s.icon
                const isCompleted = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex

                return (
                  <div key={s.value} className="flex flex-col items-center flex-1 relative z-10">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-all border-3 sm:border-4 ${
                        isCompleted
                          ? 'bg-green-500 text-white border-green-500 shadow-lg'
                          : isCurrent
                          ? 'bg-white text-green-500 border-green-500 shadow-md'
                          : 'bg-gray-100 text-gray-400 border-gray-300'
                      }`}
                    >
                      <Icon size={16} className="sm:size-[20px] md:size-[24px]" />
                    </div>
                    <p
                      className={`text-xs sm:text-sm font-semibold text-center ${
                        isCompleted ? 'text-green-600' : isCurrent ? 'text-green-600' : 'text-slate-600'
                      }`}
                    >
                      {s.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Current Status Text */}
          <div className="text-center mt-4 sm:mt-6 md:mt-8">
            <p className="text-slate-600 text-xs sm:text-sm">
              Current Status: <span className="font-semibold text-blue-600">{String(status || 'pending').replace(/_/g, ' ').toUpperCase()}</span>
            </p>
            {createdAt && (
              <p className="text-slate-500 text-xs mt-1 sm:mt-2">
                Ordered on {new Date(createdAt).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isSignedIn } = useAuth()
  const orderId = params.id

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

  // Fetch order details
  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setError('Please sign in to view order details')
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Order not found')
          } else {
            setError('Failed to load order')
          }
          return
        }

        const data = await res.json()
        
        // Verify the order belongs to the current user
        if (data.userId !== user.id) {
          setError('You do not have permission to view this order')
          return
        }

        setOrder(data)
      } catch (err) {
        setError('Error loading order: ' + err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()

    // Set up polling for real-time updates every 10 seconds
    const interval = setInterval(fetchOrder, 10000)
    return () => clearInterval(interval)
  }, [orderId, user?.id, isSignedIn])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[70vh] mx-6 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            onClick={() => router.push('/orders')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] mx-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Order not found</p>
          <button
            onClick={() => router.push('/orders')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  const items = order.items || order.orderItems || []

  return (
    <div className="min-h-[100vh] bg-slate-50 py-6 sm:py-8 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/orders')}
            className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm mb-3 sm:mb-4 flex items-center gap-2"
          >
            ← Back to Orders
          </button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Order #{order.id?.slice(-8).toUpperCase()}</h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Status Timeline */}
        <OrderStatusTimeline status={order.status} createdAt={order.createdAt} />

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6">Order Items</h2>
          <div className="space-y-4 sm:space-y-6">
            {items.length > 0 ? (
              items.map((item, index) => {
                const product = item.product || item
                const productName = product?.name || 'Unknown Product'
                const productImages = product?.images || []
                const imageUrl = productImages?.[0]

                return (
                  <div key={index} className="flex gap-3 sm:gap-4 pb-4 sm:pb-6 border-b last:border-b-0">
                    {/* Product Image */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={productName}
                          width={96}
                          height={96}
                          className="w-full h-full object-contain"
                          unoptimized={imageUrl.includes('cloudinary')}
                        />
                      ) : (
                        <span className="text-slate-400 text-xs text-center px-1">No Image</span>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm sm:text-base md:text-lg break-words">{productName}</h3>
                      <p className="text-slate-600 text-xs sm:text-sm mt-1">Qty: {item.quantity}</p>
                      <p className="text-slate-600 text-xs sm:text-sm">Price: {currency}{item.price}</p>
                    </div>

                    {/* Item Total */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm sm:text-base md:text-lg text-slate-800">
                        {currency}{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-slate-500 text-xs sm:text-sm">No items in this order</p>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4">Shipping Address</h2>
            <div className="text-slate-700 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <p className="font-semibold">{order.address?.name || 'N/A'}</p>
              <p className="break-words">{order.address?.street || order.address?.address || 'N/A'}</p>
              {order.address?.line2 && <p className="break-words">{order.address.line2}</p>}
              <p className="break-words">
                {order.address?.city || ''} {order.address?.state || ''} {order.address?.zip || ''}
              </p>
              <p>{order.address?.country || 'India'}</p>
              <p className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                <span className="text-slate-600">Phone: </span>
                <span className="font-medium break-words">{order.address?.phone || 'N/A'}</span>
              </p>
              <p className="break-words">
                <span className="text-slate-600">Email: </span>
                <span className="font-medium">{order.address?.email || 'N/A'}</span>
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4">Order Summary</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal:</span>
                <span>{currency}{(order.total - (order.shippingCharge || 0)).toFixed(2)}</span>
              </div>
              {order.shippingCharge > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Shipping:</span>
                  <span>{currency}{order.shippingCharge.toFixed(2)}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{currency}{order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 sm:pt-3 flex justify-between font-bold text-sm sm:text-base text-slate-800">
                <span>Total:</span>
                <span>{currency}{order.finalTotal || order.total}</span>
              </div>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t space-y-1.5 sm:space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-medium">{order.paymentMethod || 'Razorpay'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Status:</span>
                  <span className={`font-medium ${order.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.isPaid ? '✓ Paid' : 'Pending'}
                  </span>
                </div>
                {order.paymentId && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment ID:</span>
                    <span className="text-xs font-mono text-slate-500">{order.paymentId.slice(-8)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition text-xs sm:text-sm"
          >
            Back to Orders
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-xs sm:text-sm"
          >
            Print Order
          </button>
        </div>
      </div>
    </div>
  )
}
