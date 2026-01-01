import mongodb from '@/lib/mongodb'

// Create new product
export async function POST(req) {
  try {
    const body = await req.json()
    const { name, description, mrp, price, images, category, storeId } = body

    if (!name || !description || !images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'name, description, and at least one image are required' }), { status: 400 })
    }

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), { status: 400 })
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
    console.error('POST /api/admin/products failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to create product' }), { status: 500 })
  }
}

// Get products
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const storeId = url.searchParams.get('storeId')
    const category = url.searchParams.get('category')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500)

    let products
    if (storeId) {
      products = await mongodb.product.findByStoreId(storeId, limit)
    } else if (category) {
      products = await mongodb.product.findByCategory(category, limit)
    } else {
      products = await mongodb.product.findMany({}, limit)
    }

    return new Response(JSON.stringify(products), { status: 200 })
  } catch (err) {
    console.error('GET /api/admin/products failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), { status: 500 })
  }
}
