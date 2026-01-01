import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')

    if (!code) {
      return new Response(JSON.stringify({ error: 'Coupon code is required' }), { status: 400 })
    }

    const coupon = await mongodb.coupon.findByCode(code)
    
    if (!coupon) {
      return new Response(JSON.stringify({ valid: false, error: 'Coupon not found' }), { status: 404 })
    }

    // Check if expired
    if (new Date(coupon.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'Coupon expired' }), { status: 400 })
    }

    // Return valid coupon info (without sensitive data)
    return new Response(JSON.stringify({
      valid: true,
      code: coupon.code,
      discount: coupon.discount,
      description: coupon.description,
      expiresAt: coupon.expiresAt,
    }), { status: 200 })
  } catch (err) {
    console.error('GET /api/coupon/[code] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to validate coupon' }), { status: 500 })
  }
}
