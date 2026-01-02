import mongodb from '@/lib/mongodb'

// Update product (PATCH and PUT)
export async function PATCH(req, { params }) {
  try {
    const { id } = await params || {}
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const body = await req.json()
    // Sync stock field with inStock boolean
    if (body.stock) {
      body.inStock = body.stock !== 'out_of_stock'
    }
    
    console.log('PATCH /api/admin/products updating id:', id, 'with body:', body)
    const product = await mongodb.product.update(id, body)
    
    if (!product) {
      console.error('Product not found for id:', id)
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(product), { status: 200 })
  } catch (err) {
    console.error('PATCH /api/admin/products/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update product', details: err.message }), { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params || {}
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const body = await req.json()
    // Sync stock field with inStock boolean
    if (body.stock) {
      body.inStock = body.stock !== 'out_of_stock'
    }
    
    console.log('PUT /api/admin/products updating id:', id, 'with body:', body)
    
    // First check if product exists
    const exists = await mongodb.product.findById(id)
    console.log('Product exists check:', exists ? 'YES' : 'NO')
    
    const product = await mongodb.product.update(id, body)
    
    if (!product) {
      console.error('Product not found for id:', id)
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(product), { status: 200 })
  } catch (err) {
    console.error('PUT /api/admin/products/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update product', details: err.message }), { status: 500 })
  }
}

// Delete product
export async function DELETE(req, { params }) {
  try {
    const { id } = await params || {}
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const product = await mongodb.product.findById(id)
    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    const success = await mongodb.product.delete(id)
    if (!success) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    return new Response(JSON.stringify({ id: product.id }), { status: 200 })
  } catch (err) {
    console.error('DELETE /api/admin/products/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to delete product' }), { status: 500 })
  }
}

// Get single product
export async function GET(req, { params }) {
  try {
    const { id } = await params || {}
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const product = await mongodb.product.findById(id)
    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(product), { status: 200 })
  } catch (err) {
    console.error('GET /api/admin/products/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch product' }), { status: 500 })
  }
}
