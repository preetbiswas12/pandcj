import mongodb from '@/lib/mongodb'

export async function GET() {
  try {
    const coupons = await mongodb.coupon.findMany({})
    return new Response(JSON.stringify(coupons), { status: 200 })
  } catch (err) {
    console.error('GET /api/admin/coupons failed:', err)
    return new Response(JSON.stringify([]), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { code, description, discount, forNewUser, forMember, isPublic, expiresAt } = body

    if (!code || discount === undefined) {
      return new Response(JSON.stringify({ error: 'code and discount required' }), { status: 400 })
    }

    // Check if coupon code already exists
    const existing = await mongodb.coupon.findByCode(code)
    if (existing) {
      return new Response(JSON.stringify({ error: 'Coupon code already exists' }), { status: 409 })
    }

    const newCoupon = await mongodb.coupon.create({
      code,
      description: description || '',
      discount: Number(discount) || 0,
      forNewUser: !!forNewUser,
      forMember: !!forMember,
      isPublic: !!isPublic,
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usedCount: 0,
    })

    return new Response(JSON.stringify(newCoupon), { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/coupons failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to create coupon' }), { status: 500 })
  }
}

