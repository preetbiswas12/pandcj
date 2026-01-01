import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')

    if (!code) {
      return new Response(JSON.stringify({ error: 'Coupon code required' }), { status: 400 })
    }

    const coupon = await mongodb.coupon.findByCode(code)
    
    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), { status: 404 })
    }

    // Check if coupon is expired
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: 'Coupon has expired' }), { status: 400 })
    }

    // Return coupon details (minus sensitive info)
    return new Response(JSON.stringify({
      code: coupon.code,
      discount: coupon.discount,
      description: coupon.description,
      valid: true,
    }), { status: 200 })
  } catch (err) {
    console.error('GET /api/coupon/validate failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to validate coupon' }), { status: 500 })
  }
}
