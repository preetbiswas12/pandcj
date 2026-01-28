import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const totalAmount = parseFloat(url.searchParams.get('totalAmount')) || 0
    const userId = url.searchParams.get('userId')

    if (!code) {
      return new Response(JSON.stringify({ error: 'Coupon code required' }), { status: 400 })
    }

    const coupon = await mongodb.coupon.findByCode(code)
    
    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), { status: 404 })
    }

    // Check if coupon is expired (skip if noExpiry is true)
    if (!coupon.noExpiry && coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: 'Coupon has expired' }), { status: 400 })
    }

    // Check if coupon is for new users only
    if (coupon.forNewUser && userId) {
      const userOrders = await mongodb.order.findByUserId(userId, 100)
      if (userOrders && userOrders.length > 0) {
        return new Response(JSON.stringify({ 
          error: 'This coupon is only available for new users',
          forNewUserOnly: true
        }), { status: 400 })
      }
    }

    // Check minimum order amount
    if (coupon.minimumOrderAmount && totalAmount < coupon.minimumOrderAmount) {
      return new Response(JSON.stringify({ 
        error: `Minimum order amount of ₹${coupon.minimumOrderAmount} required for this coupon`,
        minimumOrderAmount: coupon.minimumOrderAmount,
        currentAmount: totalAmount
      }), { status: 400 })
    }

    // Return coupon details (minus sensitive info)
    return new Response(JSON.stringify({
      code: coupon.code,
      discount: coupon.discount,
      description: coupon.description,
      minimumOrderAmount: coupon.minimumOrderAmount || 0,
      applyToShipping: coupon.applyToShipping || false,
      forNewUser: coupon.forNewUser || false,
      valid: true,
    }), { status: 200 })
  } catch (err) {
    console.error('GET /api/coupon/validate failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to validate coupon' }), { status: 500 })
  }
}
