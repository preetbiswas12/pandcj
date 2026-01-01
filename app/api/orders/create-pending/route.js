import { randomUUID } from 'crypto'
import mongodb from '@/lib/mongodb'

export async function POST(req) {
  try {
    const body = await req.json()
    const { items, total, address, userId } = body || {}
    if (!items || !Array.isArray(items) || items.length === 0) return new Response(JSON.stringify({ error: 'No items' }), { status: 400 })

    // ensure user exists minimally
    const uid = userId || `guest-${randomUUID()}`
    await mongodb.user.upsert(uid, { name: (address && address.name) || `User ${uid}`, email: (address && address.email) || `${uid}@example.com` })

    // create pending order with items
    const orderId = randomUUID()
    const created = await mongodb.order.create({
      id: orderId,
      total: Number(total) || items.reduce((s, i) => s + (Number(i.price || 0) * Number(i.quantity || 0)), 0),
      status: 'pending',
      userId: uid,
      items: items.map(i => ({
        productId: i.productId || (i.product && i.product.id) || `prod-${randomUUID()}`,
        quantity: Number(i.quantity || 1),
        price: Number(i.price || 0),
        storeId: i.storeId || 'default-store'
      })),
      address: address || {},
      paymentMethod: 'razorpay',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    })

    return new Response(JSON.stringify({ localOrderId: created.id }), { status: 200 })
  } catch (err) {
    console.error('create-pending error', err)
    return new Response(JSON.stringify({ error: 'Could not create pending order' }), { status: 500 })
  }
}
