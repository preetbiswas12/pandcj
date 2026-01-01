import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const storeId = url.searchParams.get('storeId')

    if (!userId || !storeId) {
      return new Response(JSON.stringify({ error: 'userId and storeId are required' }), { status: 400 })
    }

    // Verify store ownership
    const store = await mongodb.store.findById(storeId)
    if (!store || store.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Store not found or access denied' }), { status: 403 })
    }

    // Get orders for this store
    const orders = await mongodb.order.findByStoreId(storeId)
    return new Response(JSON.stringify(orders), { status: 200 })
  } catch (err) {
    console.error('GET /api/store/orders failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const { orderId, status, userId, storeId } = body

    if (!orderId || !status || !userId || !storeId) {
      return new Response(JSON.stringify({ error: 'orderId, status, userId, and storeId are required' }), { status: 400 })
    }

    // Verify store ownership
    const store = await mongodb.store.findById(storeId)
    if (!store || store.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Store not found or access denied' }), { status: 403 })
    }

    // Update order status
    const updated = await mongodb.order.updateStatus(orderId, status)
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    console.error('PUT /api/store/orders failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update order' }), { status: 500 })
  }
}
