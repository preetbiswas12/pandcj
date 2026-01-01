import mongodb from '@/lib/mongodb'

// Update product
export async function PATCH(req, { params }) {
  try {
    const { id } = await params || {}
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const body = await req.json()
    const product = await mongodb.product.update(id, body)
    
    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    return new Response(JSON.stringify(product), { status: 200 })
  } catch (err) {
    console.error('PATCH /api/admin/products/[id] failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update product' }), { status: 500 })
  }
}

// Delete product
export async function DELETE(req, { params }) {
  try {
    const { id } = await params || {}
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    const success = await mongodb.product.delete(id)
    if (!success) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    return new Response(JSON.stringify({ success }), { status: 200 })
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
    const productsFile = path.join(publicDir, 'products.json')
    if (!fs.existsSync(productsFile)) return new Response(JSON.stringify({ error: 'No products' }), { status: 404 })

    let products = []
    try { products = JSON.parse(fs.readFileSync(productsFile, 'utf8') || '[]') } catch (e) { products = [] }

    const exists = products.find(p => p.id === id)
    if (!exists) return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })

    products = products.filter(p => p.id !== id)

    try {
      fs.writeFileSync(productsFile, JSON.stringify(products, null, 2))
    } catch (err) {
      console.error('Failed to write products.json to public dir', err)
      try {
        const tmpPath = path.join(os.tmpdir(), 'pandc-products.json')
        fs.writeFileSync(tmpPath, JSON.stringify(products, null, 2))
        console.warn('Wrote products to tmp:', tmpPath)
      } catch (tmpErr) {
        console.error('Failed to write products to tmp', tmpErr)
        return new Response(JSON.stringify({ error: 'Could not delete product' }), { status: 500 })
      }
    }

    return new Response(JSON.stringify({ id }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Could not delete product' }), { status: 500 })
  }
}
