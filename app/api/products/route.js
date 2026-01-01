import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const category = searchParams.get('category')
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500)
    const skip = Number(searchParams.get('skip')) || 0

    let products
    if (storeId) {
      products = await mongodb.product.findByStoreId(storeId, limit)
    } else if (category) {
      products = await mongodb.product.findByCategory(category, limit)
    } else {
      products = await mongodb.product.findMany({}, limit, skip)
    }

    return new Response(JSON.stringify(products), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('GET /api/products failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), { status: 500 })
  }
}

