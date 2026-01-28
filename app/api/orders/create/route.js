import mongodb from '@/lib/mongodb'
import { randomUUID } from 'crypto'

export async function POST(req) {
  try {
    const body = await req.json()
    const { items, total, address, paymentMethod, userId, couponCode } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items in order' }), { status: 400 })
    }

    const enrichedItems = await Promise.all(
      items.map(async (it) => {
        const product = await mongodb.product.findById(it.productId)
        return {
          productId: it.productId,
          product: product || { id: it.productId, name: it.name || 'Unknown', images: it.images || [] },
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || (product ? product.price : 0),
          storeId: product ? product.storeId : (it.storeId || 'default-store')
        }
      })
    )

    // Ensure user exists
    const uid = userId || `guest-${randomUUID()}`
    await mongodb.user.upsert(uid, {
      name: (address && address.name) || (address && address.fullName) || 'Guest',
      email: (address && address.email) || `${uid}@example.com`,
    })

    // Apply coupon if provided
    let discountAmount = 0
    if (couponCode) {
      const coupon = await mongodb.coupon.findByCode(couponCode)
      if (coupon) {
        // Check if expired (skip if noExpiry is true)
        const isExpired = !coupon.noExpiry && coupon.expiresAt && new Date(coupon.expiresAt) < new Date()
        
        // Check if user is new (only if coupon requires new user)
        let isNewUser = true
        if (coupon.forNewUser) {
          const userOrderHistory = await mongodb.order.findByUserId(uid, 100)
          isNewUser = !userOrderHistory || userOrderHistory.length === 0
        }

        if (!isExpired && isNewUser) {
          discountAmount = (total * coupon.discount) / 100
          await mongodb.coupon.incrementUsage(couponCode)
        }
      }
    }

    // Create order
    const newOrder = await mongodb.order.create({
      userId: uid,
      items: enrichedItems,
      total: Number(total) || 0,
      discountAmount,
      finalTotal: (Number(total) || 0) - discountAmount,
      address: address || {},
      paymentMethod: paymentMethod || 'razorpay',
      couponCode: couponCode || null,
      status: 'pending',
    })

    return new Response(JSON.stringify(newOrder), { status: 201 })
  } catch (err) {
    console.error('POST /api/orders failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to create order' }), { status: 500 })
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const orderId = url.searchParams.get('orderId')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500)

    if (orderId) {
      const order = await mongodb.order.findById(orderId)
      return new Response(JSON.stringify(order || {}), { status: 200 })
    }

    if (userId) {
      const orders = await mongodb.order.findByUserId(userId, limit)
      return new Response(JSON.stringify(orders), { status: 200 })
    }

    // Admin: get all orders
    const orders = await mongodb.order.findMany({}, limit)
    return new Response(JSON.stringify(orders), { status: 200 })
  } catch (err) {
    console.error('GET /api/orders failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const { orderId, status } = body

    if (!orderId || !status) {
      return new Response(JSON.stringify({ error: 'orderId and status required' }), { status: 400 })
    }

    const updated = await mongodb.order.updateStatus(orderId, status)
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    console.error('PUT /api/orders failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update order' }), { status: 500 })
  }
}
