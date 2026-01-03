import Razorpay from 'razorpay'
import mongodb from '@/lib/mongodb'

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

export async function POST(req) {
  try {
    const body = await req.json()
    const { amount, currency = 'INR', receipt, localOrderId } = body || {}
    if (!amount) return new Response(JSON.stringify({ error: 'Amount required' }), { status: 400 })

    // Razorpay expects amount in paise
    const amt = Math.round(Number(amount) * 100)
    const rReceipt = receipt || `rcpt_${Date.now()}`

    const order = await instance.orders.create({ amount: amt, currency, receipt: rReceipt, payment_capture: 1 })

    // if localOrderId provided, persist mapping in MongoDB
    if (localOrderId) {
      try {
        await mongodb.order.update(localOrderId, { razorpayOrderId: order.id })
        console.log('[Razorpay] ✅ Linked Razorpay order to MongoDB order:', order.id, '←→', localOrderId)
      } catch (e) {
        console.warn('[Razorpay] Could not link razorpayOrderId to MongoDB order:', e.message || e)
      }
    }

    return new Response(JSON.stringify({ razorpayOrderId: order.id, amount: amt, currency }), { status: 200 })
  } catch (err) {
    console.error('Razorpay create error', err)
    return new Response(JSON.stringify({ error: 'Could not create razorpay order' }), { status: 500 })
  }
}
