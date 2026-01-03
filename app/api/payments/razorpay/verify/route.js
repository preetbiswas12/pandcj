import crypto from 'crypto'
import { randomUUID } from 'crypto'
import mongodb from '@/lib/mongodb'
import Razorpay from 'razorpay'

const razorpayInstance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })

export async function POST(req) {
  try {
    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payload } = body || {}

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature payload' }), { status: 400 })
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    const expected = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
    const debug = process.env.DEBUG_RAZORPAY === '1'
    if (debug) {
      try {
        console.log('[razorpay:verify] incoming signature:', razorpay_signature)
        console.log('[razorpay:verify] computed signature:', expected)
        console.log('[razorpay:verify] payload (truncated):', JSON.stringify(payload).length > 2000 ? JSON.stringify(payload).slice(0, 2000) + '...[truncated]' : JSON.stringify(payload))
      } catch (e) { /* ignore logging errors */ }
    }
    if (expected !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }

    // signature valid — handle payment and create DB order from payload
    const { items, total, address, userId, localOrderId, couponCode } = payload || {}
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items to create order' }), { status: 400 })
    }

    // If localOrderId is provided, check expiry
    if (localOrderId) {
      try {
        const local = await mongodb.order.findById(localOrderId)
        if (!local) return new Response(JSON.stringify({ error: 'Local order not found' }), { status: 404 })
        // if expired, refund payment immediately
        if (local.expiresAt && new Date(local.expiresAt).getTime() < Date.now()) {
          try {
            const refund = await razorpayInstance.payments.refund(razorpay_payment_id)
            await mongodb.order.updateStatus(localOrderId, 'expired')
            return new Response(JSON.stringify({ ok: false, refunded: true, refundId: refund.id }), { status: 200 })
          } catch (e) {
            console.error('refund failed', e)
            await mongodb.order.updateStatus(localOrderId, 'expired')
            return new Response(JSON.stringify({ ok: false, refunded: false }), { status: 500 })
          }
        }
      } catch (e) {
        console.warn('could not load local order', e.message || e)
      }
    }

    // Ensure user
    const uid = userId || `guest-${randomUUID()}`
    await mongodb.user.upsert(uid, { name: (address && address.name) || `User ${uid}`, email: (address && address.email) || `${uid}@example.com` })

    // Enrich items with product details
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

    // Apply coupon if provided
    let discountAmount = 0
    if (couponCode) {
      const coupon = await mongodb.coupon.findByCode(couponCode)
      if (coupon && new Date(coupon.expiresAt) > new Date()) {
        discountAmount = (total * coupon.discount) / 100
        await mongodb.coupon.incrementUsage(couponCode)
      }
    }

    // Update the pending order to confirmed (don't create new one)
    let createdOrder
    if (localOrderId) {
      // Update existing pending order to confirmed
      createdOrder = await mongodb.order.update(localOrderId, {
        status: 'confirmed',
        isPaid: true,
        paymentId: razorpay_payment_id,
        paymentMethod: 'razorpay',
        finalTotal: (Number(total) || 0) - discountAmount,
        discountAmount
      })
    } else {
      // Fallback: Create new order if no local order ID
      const orderId = randomUUID()
      createdOrder = await mongodb.order.create({
        id: orderId,
        userId: uid,
        items: enrichedItems,
        total: Number(total) || 0,
        discountAmount,
        finalTotal: (Number(total) || 0) - discountAmount,
        address: address || {},
        paymentMethod: 'razorpay',
        paymentId: razorpay_payment_id,
        couponCode: couponCode || null,
        status: 'confirmed',
        isPaid: true,
      })
    }

    return new Response(JSON.stringify({ ok: true, id: createdOrder.id }), { status: 200 })
  } catch (err) {
    console.error('Razorpay verify/create order error', err)
    return new Response(JSON.stringify({ error: 'Could not verify payment or create order' }), { status: 500 })
  }
}
