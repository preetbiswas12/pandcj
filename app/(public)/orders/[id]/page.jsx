'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
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
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg mb-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Order Status</h2>
      
      {isCancelled ? (
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-6 text-center">
          <p className="text-red-700 font-semibold text-lg">🚫 Order Cancelled</p>
          <p className="text-red-600 text-sm mt-2">This order has been cancelled</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="relative">
            <div className="flex justify-between mb-8">
              {statuses.map((s, index) => {
                const Icon = s.icon
                const isCompleted = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex

                return (
                  <div key={s.value} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-slate-300 text-slate-600'
                      } ${isCurrent ? 'ring-4 ring-blue-400' : ''}`}
                    >
                      <Icon size={24} />
                    </div>
                    <p
                      className={`text-sm font-medium text-center ${
                        isCompleted ? 'text-green-600' : 'text-slate-600'
                      }`}
                    >
                      {s.label}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Connecting Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-slate-300 -z-10">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{
                  width: currentStatusIndex >= 0 ? `${(currentStatusIndex / 3) * 100}%` : '0%'
                }}
              />
            </div>
          </div>

          {/* Current Status Text */}
          <div className="text-center mt-8">
            <p className="text-slate-600 text-sm">
              Current Status: <span className="font-semibold text-blue-600">{String(status || 'pending').replace(/_/g, ' ').toUpperCase()}</span>
            </p>
            {createdAt && (
              <p className="text-slate-500 text-xs mt-2">
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
  const { user, isSignedIn } = useUser()
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
    <div className="min-h-[100vh] bg-slate-50 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/orders')}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-4 flex items-center gap-2"
          >
            ← Back to Orders
          </button>
          <h1 className="text-3xl font-bold text-slate-800">Order #{order.id?.slice(-8).toUpperCase()}</h1>
          <p className="text-slate-600 text-sm mt-2">
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Order Items</h2>
          <div className="space-y-6">
            {items.length > 0 ? (
              items.map((item, index) => {
                const product = item.product || item
                const productName = product?.name || 'Unknown Product'
                const productImages = product?.images || []
                const imageUrl = productImages?.[0]

                return (
                  <div key={index} className="flex gap-4 pb-6 border-b last:border-b-0">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                        <span className="text-slate-400 text-xs text-center">No Image</span>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-lg">{productName}</h3>
                      <p className="text-slate-600 text-sm mt-1">Quantity: {item.quantity}</p>
                      <p className="text-slate-600 text-sm">Price: {currency}{item.price}</p>
                      {product?.storeId && (
                        <p className="text-slate-500 text-xs mt-2">Store: {product.storeId}</p>
                      )}
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-800">
                        {currency}{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-slate-500">No items in this order</p>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Shipping Address</h2>
            <div className="text-slate-700 space-y-2">
              <p className="font-semibold">{order.address?.name || 'N/A'}</p>
              <p>{order.address?.street || order.address?.address || 'N/A'}</p>
              {order.address?.line2 && <p>{order.address.line2}</p>}
              <p>
                {order.address?.city || ''} {order.address?.state || ''} {order.address?.zip || ''}
              </p>
              <p>{order.address?.country || 'India'}</p>
              <p className="mt-4 pt-4 border-t">
                <span className="text-slate-600">Phone: </span>
                <span className="font-medium">{order.address?.phone || 'N/A'}</span>
              </p>
              <p>
                <span className="text-slate-600">Email: </span>
                <span className="font-medium">{order.address?.email || 'N/A'}</span>
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Order Summary</h2>
            <div className="space-y-3">
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
              <div className="border-t pt-3 flex justify-between font-bold text-lg text-slate-800">
                <span>Total:</span>
                <span>{currency}{order.finalTotal || order.total}</span>
              </div>

              <div className="mt-6 pt-6 border-t space-y-2">
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
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="flex-1 px-6 py-3 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition"
          >
            Back to Orders
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Print Order
          </button>
        </div>
      </div>
    </div>
  )
}
