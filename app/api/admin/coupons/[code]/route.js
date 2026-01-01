import mongodb from '@/lib/mongodb'

export async function GET(req, { params }) {
  try {
    const code = params?.code
    if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 })

    const coupon = await mongodb.coupon.findByCode(code)
    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(coupon), { status: 200 })
  } catch (err) {
    console.error('GET /api/admin/coupons/[code] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch coupon' }), { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const code = params?.code
    if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 })

    const success = await mongodb.coupon.delete(code)
    if (!success) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), { status: 404 })
    }

    return new Response(JSON.stringify({ success }), { status: 200 })
  } catch (err) {
    console.error('DELETE /api/admin/coupons/[code] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to delete coupon' }), { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const code = params?.code
    if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 })

    const body = await req.json()
    const coupon = await mongodb.coupon.update(code, body)
    
    if (!coupon) {
      return new Response(JSON.stringify({ error: 'Coupon not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(coupon), { status: 200 })
  } catch (err) {
    console.error('PUT /api/admin/coupons/[code] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update coupon' }), { status: 500 })
  }
}
