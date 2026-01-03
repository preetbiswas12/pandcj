import mongodb from '@/lib/mongodb'

export async function GET(req, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400 }
      )
    }

    // Fetch order from MongoDB
    const order = await mongodb.order.findById(id)

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404 }
      )
    }

    return new Response(
      JSON.stringify(order),
      { status: 200 }
    )
  } catch (err) {
    console.error('[Orders GET] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch order' }),
      { status: 500 }
    )
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { address } = body

    if (!id || !address) {
      return new Response(
        JSON.stringify({ error: 'Order ID and address are required' }),
        { status: 400 }
      )
    }

    // Validate required address fields
    if (!address.name || !address.email || !address.phone || !address.zip || !address.city || !address.state) {
      return new Response(
        JSON.stringify({ error: 'Missing required address fields' }),
        { status: 400 }
      )
    }

    // Update order in MongoDB
    const updated = await mongodb.order.update(id, {
      address: {
        name: address.name,
        email: address.email,
        phone: address.phone,
        street: address.street || address.address || '',
        landmark: address.landmark || '',
        alternatePhone: address.alternatePhone || '',
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country || 'India'
      }
    })

    if (!updated) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, order: updated }),
      { status: 200 }
    )
  } catch (err) {
    console.error('[PATCH /api/orders/[id]] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to update order', details: err.message }),
      { status: 500 }
    )
  }
}

export async function GET(req, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400 }
      )
    }

    const order = await mongodb.order.findById(id)

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404 }
      )
    }

    return new Response(JSON.stringify(order), { status: 200 })
  } catch (err) {
    console.error('[GET /api/orders/[id]] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch order' }),
      { status: 500 }
    )
  }
}
