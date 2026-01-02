import fs from 'fs'
import path from 'path'
import prisma from '@/lib/prisma'

export default async function OrderDetailPage({ params }) {
  const { id } = await params
  const publicDir = path.join(process.cwd(), 'public')
  const storeId = 'default-store'

  // Try DB first
  let order = null
  try {
    console.log('[OrderDetail] 🔍 Fetching order:', id, 'from database')
    order = await prisma.order.findUnique({ where: { id }, include: { orderItems: { include: { product: true } }, address: true } })
    if (order) console.log('[OrderDetail] ✅ Order found in database')
    
    if (order && Array.isArray(order.orderItems)) {
      for (const it of order.orderItems) {
        if (!it.product || !it.product.id) {
          try {
            const prod = await prisma.product.findUnique({ where: { id: it.productId } })
            if (prod) it.product = prod
            else it.product = { id: it.productId || null, name: (it.product && it.product.name) || 'Product', images: [] }
          } catch (e) {
            console.error('[OrderDetail] ⚠️ Error fetching product:', e.message)
            it.product = { id: it.productId || null, name: (it.product && it.product.name) || 'Product', images: [] }
          }
        }
      }
    }
  } catch (e) {
    console.error('[OrderDetail] ❌ Database error:', e.message)
    order = null
  }

  // Fallback to filesystem if DB not available or order not found
  if (!order) {
    console.log('[OrderDetail] 📁 Trying filesystem fallback...')
    // try per-store orders first
    const storeOrdersPath = path.join(publicDir, 'stores', storeId, 'orders.json')

    if (fs.existsSync(storeOrdersPath)) {
      try {
        console.log('[OrderDetail] 📂 Checking store orders')
        const raw = fs.readFileSync(storeOrdersPath, 'utf8') || '[]'
        const list = JSON.parse(raw)
        order = list.find(o => o.id === id) || null
      } catch (e) { order = null }
    }

    if (!order) {
      const ordersPath = path.join(publicDir, 'orders.json')
      if (fs.existsSync(ordersPath)) {
        try {
          const raw = fs.readFileSync(ordersPath, 'utf8') || '[]'
          const list = JSON.parse(raw)
          order = list.find(o => o.id === id) || null
        } catch (e) { order = null }
      }
    }
  }

  if (!order) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Order not found</h2>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4">Order Details</h2>

      <section className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="font-medium">Customer</h3>
        <p className="text-sm text-slate-600">{order.address?.name || 'N/A'}</p>
        <p className="text-sm text-slate-600">{order.address?.street || ''}</p>
        <p className="text-sm text-slate-600">{order.address?.city || ''} {order.address?.state || ''} {order.address?.zip || ''}</p>
        <p className="text-sm text-slate-600">{order.address?.country || ''}</p>
        <p className="text-sm text-slate-600">Phone: {order.address?.phone || 'N/A'}</p>
        <p className="text-sm text-slate-600">Email: {order.address?.email || 'N/A'}</p>
      </section>

      <section className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="font-medium">Order Info</h3>
        <p className="text-sm text-slate-600">Order ID: {order.id}</p>
        <p className="text-sm text-slate-600">Placed on: {new Date(order.createdAt).toLocaleString()}</p>
        <p className="text-sm text-slate-600">Payment: {order.paymentMethod || 'N/A'}</p>
        <p className="text-sm text-slate-600">Status: {String(order.status).replace(/_/g, ' ')}</p>
        <p className="text-sm text-slate-600">Total: {order.total}</p>
      </section>

      <section className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-2">Items</h3>
        <ul>
          {order.orderItems.map((it, i) => (
            <li key={i} className="py-2 border-b last:border-b-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{(it.product && it.product.name) || it.product?.id || 'Product'}</div>
                  <div className="text-sm text-slate-600">Qty: {it.quantity} • Price: {it.price}</div>
                </div>
                <div className="text-sm text-slate-600">Store: {it.storeId || 'default-store'}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
