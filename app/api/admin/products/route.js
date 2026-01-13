import mongodb from '@/lib/mongodb'

// Create new product
export async function POST(req) {
  try {
    const body = await req.json()
    const { name, description, mrp, price, images, category, stock, storeId } = body

    if (!name || !description || !images || !Array.isArray(images) || images.length === 0) {
      console.error('POST /api/admin/products: Missing required fields', { name: !!name, description: !!description, images: Array.isArray(images) ? images.length : 'not-array' })
      return new Response(JSON.stringify({ error: 'name, description, and at least one image are required' }), { status: 400 })
    }

    if (!storeId) {
      console.error('POST /api/admin/products: Missing storeId')
      return new Response(JSON.stringify({ error: 'storeId is required' }), { status: 400 })
    }

    // Validate numeric values
    const mrrpNum = Number(mrp)
    const priceNum = Number(price)
    
    if (isNaN(mrrpNum) || isNaN(priceNum)) {
      console.error('POST /api/admin/products: Invalid price values', { mrp, price })
      return new Response(JSON.stringify({ error: 'MRP and price must be valid numbers' }), { status: 400 })
    }

    const newProduct = await mongodb.product.create({
      name,
      description,
      mrp: mrrpNum,
      price: priceNum,
      images,
      category: category || 'Others',
      stock: stock || 'in_stock',
      inStock: stock !== 'out_of_stock',
      storeId,
    })

    console.log('POST /api/admin/products: Product created successfully', { id: newProduct.id, name: newProduct.name })
    return new Response(JSON.stringify(newProduct), { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/products failed:', err.message, err.stack)
    return new Response(JSON.stringify({ error: err.message || 'Failed to create product' }), { status: 500 })
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
