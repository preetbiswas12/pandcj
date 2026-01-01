import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const body = await req.json()
    const { userId, storeId } = body

    if (!userId || !storeId) {
      return new Response(JSON.stringify({ error: 'userId and storeId are required' }), { status: 400 })
    }

    // Verify the store belongs to this user
    const store = await mongodb.store.findById(storeId)
    if (!store || store.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Store not found or access denied' }), { status: 403 })
    }

    // Get products for this store
    const products = await mongodb.product.findByStoreId(storeId)
    return new Response(JSON.stringify(products), { status: 200 })
  } catch (err) {
    console.error('GET /api/store/products failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch store products' }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, description, mrp, price, images, category, storeId, userId } = body

    if (!name || !description || !images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'name, description, and at least one image are required' }), { status: 400 })
    }

    if (!storeId || !userId) {
      return new Response(JSON.stringify({ error: 'storeId and userId are required' }), { status: 400 })
    }

    // Verify store ownership
    const store = await mongodb.store.findById(storeId)
    if (!store || store.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Store not found or access denied' }), { status: 403 })
    }

    const newProduct = await mongodb.product.create({
      name,
      description,
      mrp: Number(mrp) || 0,
      price: Number(price) || 0,
      images,
      category: category || 'Others',
      inStock: true,
      storeId,
    })

    return new Response(JSON.stringify(newProduct), { status: 201 })
  } catch (err) {
    console.error('POST /api/store/products failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to create product' }), { status: 500 })
  }
}
