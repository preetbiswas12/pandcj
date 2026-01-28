import mongodb from '@/lib/mongodb'

export async function GET(req, { params }) {
  try {
    const { code } = await params
    const userId = new URL(req.url).searchParams.get('userId')

    if (!code) {
      return new Response(JSON.stringify({ error: 'Coupon code is required' }), { status: 400 })
    }

    const coupon = await mongodb.coupon.findByCode(code)
    
    if (!coupon) {
      return new Response(JSON.stringify({ valid: false, error: 'Coupon not found' }), { status: 404 })
    }

    // Check if expired (skip if noExpiry is true)
    if (!coupon.noExpiry && coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'Coupon expired' }), { status: 400 })
    }

    // Check if coupon is for new users only
    if (coupon.forNewUser && userId) {
      const userOrders = await mongodb.order.findByUserId(userId, 100)
      if (userOrders && userOrders.length > 0) {
        return new Response(JSON.stringify({ 
          valid: false,
          error: 'This coupon is only available for new users',
          forNewUserOnly: true
        }), { status: 400 })
      }
    }

    // Return valid coupon info (without sensitive data)
    return new Response(JSON.stringify({
      valid: true,
      code: coupon.code,
      discount: coupon.discount,
      description: coupon.description,
      expiresAt: coupon.expiresAt,
      noExpiry: coupon.noExpiry,
      minimumOrderAmount: coupon.minimumOrderAmount || 0,
      applyToShipping: coupon.applyToShipping || false,
      forNewUser: coupon.forNewUser || false
    }), { status: 200 })
  } catch (err) {
    console.error('GET /api/coupon/[code] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to validate coupon' }), { status: 500 })
  }
}
