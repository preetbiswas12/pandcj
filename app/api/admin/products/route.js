import fs from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, description, mrp, price, images, category, storeId } = body || {}

    if (!name || !description || !images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'name, description and at least one image are required' }), { status: 400 })
    }

    const publicDir = path.join(process.cwd(), 'public')
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

    const productsFile = path.join(publicDir, 'products.json')
    let products = []
    if (fs.existsSync(productsFile)) {
      try { products = JSON.parse(fs.readFileSync(productsFile, 'utf8') || '[]') } catch (e) { products = [] }
    }

    const newProduct = {
      id: randomUUID(),
      name,
      description,
      mrp: Number(mrp) || 0,
      price: Number(price) || 0,
      images,
      category: category || 'Others',
      inStock: true,
      storeId: storeId || 'default-store',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    products.push(newProduct)
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
        return new Response(JSON.stringify({ error: 'Could not create product' }), { status: 500 })
      }
    }

    return new Response(JSON.stringify(newProduct), { status: 201 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Could not create product' }), { status: 500 })
  }
}
