import mongodb from '@/lib/mongodb'

export async function GET(req, context) {
  try {
    const params = await context.params
    const id = params?.id

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing store id' }), { status: 400 })
    }

    const store = await mongodb.store.findById(id)
    if (!store) {
      return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(store), { status: 200 })
  } catch (err) {
    console.error('GET /api/admin/stores/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch store' }), { status: 500 })
  }
}

export async function PUT(req, context) {
  try {
    const params = await context.params
    const id = params?.id
    const body = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing store id' }), { status: 400 })
    }

    const updated = await mongodb.store.update(id, body)
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    console.error('PUT /api/admin/stores/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update store' }), { status: 500 })
  }
}

export async function DELETE(req, context) {
  try {
    const params = await context.params
    const id = params?.id

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
    }

    const success = await mongodb.store.delete(id)
    if (!success) {
      return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404 })
    }

    return new Response(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /api/admin/stores/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to delete store' }), { status: 500 })
  }
}
