import mongodb from '@/lib/mongodb'

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, username, description, address, contact, email, logo, status = 'approved', isActive = true, userId } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 })
    }

    // Check if store already exists for this user
    const existing = await mongodb.store.findByUserId(userId)
    if (existing) {
      const updated = await mongodb.store.update(existing.id, {
        name, username, description, address, contact, email, logo, status, isActive
      })
      return new Response(JSON.stringify(updated), { status: 200 })
    }

    // Create new store
    const newStore = await mongodb.store.create({
      userId,
      name,
      username,
      description,
      address,
      contact,
      email,
      logo,
      status,
      isActive,
    })

    return new Response(JSON.stringify(newStore), { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/stores failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to create/update store' }), { status: 500 })
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const storeId = url.searchParams.get('storeId')

    if (storeId) {
      const store = await mongodb.store.findById(storeId)
      return new Response(JSON.stringify(store || {}), { status: 200 })
    }

    if (userId) {
      const store = await mongodb.store.findByUserId(userId)
      return new Response(JSON.stringify(store || {}), { status: 200 })
    }

    // Admin: get all stores
    const stores = await mongodb.store.findMany({})
    return new Response(JSON.stringify(stores), { status: 200 })
  } catch (err) {
    console.error('GET /api/admin/stores failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch stores' }), { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const { storeId, ...data } = body

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), { status: 400 })
    }

    const updated = await mongodb.store.update(storeId, data)
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    console.error('PUT /api/admin/stores failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update store' }), { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const url = new URL(req.url)
    const storeId = url.searchParams.get('storeId')

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), { status: 400 })
    }

    const success = await mongodb.store.delete(storeId)
    return new Response(JSON.stringify({ success }), { status: 200 })
  } catch (err) {
    console.error('DELETE /api/admin/stores failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to delete store' }), { status: 500 })
  }
}
