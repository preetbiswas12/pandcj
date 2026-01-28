import mongodb from '@/lib/mongodb'

export async function GET(req, { params }) {
  try {
    const { code } = await params

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

    // Return valid coupon info (without sensitive data)
    return new Response(JSON.stringify({
      valid: true,
      code: coupon.code,
      discount: coupon.discount,
      description: coupon.description,
      expiresAt: coupon.expiresAt,
      noExpiry: coupon.noExpiry,
      minimumOrderAmount: coupon.minimumOrderAmount || 0,
      applyToShipping: coupon.applyToShipping || false
    }), { status: 200 })
  } catch (err) {
    console.error('GET /api/coupon/[code] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to validate coupon' }), { status: 500 })
  }
}
