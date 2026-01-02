import mongodb from '@/lib/mongodb'

export default async function OrderDetailPage({ params }) {
  const { id } = await params

  let order = null
  try {
    console.log('[OrderDetail] 🔍 Fetching order from MongoDB:', id)
    order = await mongodb.order.findById(id)
    if (order) {
      console.log('[OrderDetail] ✅ Order found in MongoDB')
    } else {
      console.log('[OrderDetail] ⚠️ Order not found in MongoDB')
    }
  } catch (e) {
    console.error('[OrderDetail] ❌ MongoDB error:', e.message)
    order = null
  }

  if (!order) {
    return (
      <div className="p-6 max-w-3xl">
        <h2 className="text-xl font-semibold text-red-600">Order not found</h2>
        <p className="text-slate-600 mt-2">The order with ID "{id}" could not be found.</p>
      </div>
    )
  }

  // Ensure orderItems is an array
  const orderItems = Array.isArray(order.orderItems) ? order.orderItems : []

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4">Order Details</h2>

      <section className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="font-medium">Customer</h3>
        <p className="text-sm text-slate-600">{order.address?.name || 'N/A'}</p>
        <p className="text-sm text-slate-600">{order.address?.line1 || order.address?.address || ''}</p>
        <p className="text-sm text-slate-600">{order.address?.city || ''} {order.address?.state || ''} {order.address?.zip || ''}</p>
        <p className="text-sm text-slate-600">{order.address?.country || 'India'}</p>
        <p className="text-sm text-slate-600">Phone: {order.address?.phone || 'N/A'}</p>
        <p className="text-sm text-slate-600">Email: {order.address?.email || 'N/A'}</p>
      </section>

      <section className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="font-medium">Order Info</h3>
        <p className="text-sm text-slate-600">Order ID: {order.id}</p>
        <p className="text-sm text-slate-600">Placed on: {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</p>
        <p className="text-sm text-slate-600">Payment: {order.paymentMethod || 'N/A'}</p>
        <p className="text-sm text-slate-600">Status: {String(order.status || 'pending').replace(/_/g, ' ')}</p>
        <p className="text-sm text-slate-600">Total: ₹{order.total || 0}</p>
        {order.shippingCharge && <p className="text-sm text-slate-600">Shipping: ₹{order.shippingCharge}</p>}
      </section>

      <section className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-2">Items ({orderItems.length})</h3>
        {orderItems.length === 0 ? (
          <p className="text-slate-500">No items in this order</p>
        ) : (
          <ul>
            {orderItems.map((it, i) => (
              <li key={i} className="py-2 border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.product?.name || it.name || 'Product'}</div>
                    <div className="text-sm text-slate-600">Qty: {it.quantity} • Price: ₹{it.price}</div>
                  </div>
                  <div className="text-sm text-slate-600">Store: {it.storeId || 'default-store'}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
