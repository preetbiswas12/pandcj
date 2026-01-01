import mongodb from '../lib/mongodb.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrateJsonToMongoDB() {
  try {
    console.log('Starting migration of JSON data to MongoDB...')
    
    // Migrate stores
    const storesPath = path.join(__dirname, '../public/stores.json')
    if (fs.existsSync(storesPath)) {
      try {
        const storesData = JSON.parse(fs.readFileSync(storesPath, 'utf-8'))
        if (Array.isArray(storesData) && storesData.length > 0) {
          const result = await mongodb.store.upsertMany(storesData)
          console.log(`✓ Migrated ${result.upsertedCount} stores (${result.modifiedCount} updated)`)
        }
      } catch (e) {
        console.error('✗ Failed to migrate stores:', e.message)
      }
    }

    // Migrate products
    const productsPath = path.join(__dirname, '../public/products.json')
    if (fs.existsSync(productsPath)) {
      try {
        const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'))
        if (Array.isArray(productsData) && productsData.length > 0) {
          const result = await mongodb.product.upsertMany(productsData)
          console.log(`✓ Migrated ${result.upsertedCount} products (${result.modifiedCount} updated)`)
        }
      } catch (e) {
        console.error('✗ Failed to migrate products:', e.message)
      }
    }

    // Migrate orders
    const ordersPath = path.join(__dirname, '../public/orders.json')
    if (fs.existsSync(ordersPath)) {
      try {
        const ordersData = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'))
        if (Array.isArray(ordersData) && ordersData.length > 0) {
          const result = await mongodb.order.upsertMany(ordersData)
          console.log(`✓ Migrated ${result.upsertedCount} orders (${result.modifiedCount} updated)`)
        }
      } catch (e) {
        console.error('✗ Failed to migrate orders:', e.message)
      }
    }

    // Migrate newsletters
    const newslettersPath = path.join(__dirname, '../public/newsletters.json')
    if (fs.existsSync(newslettersPath)) {
      try {
        const newslettersData = JSON.parse(fs.readFileSync(newslettersPath, 'utf-8'))
        if (Array.isArray(newslettersData) && newslettersData.length > 0) {
          const result = await mongodb.newsletter.upsertMany(newslettersData)
          console.log(`✓ Migrated ${result.upsertedCount} newsletter emails (${result.modifiedCount} updated)`)
        }
      } catch (e) {
        console.error('✗ Failed to migrate newsletters:', e.message)
      }
    }

    // Migrate coupons
    const couponsPath = path.join(__dirname, '../public/coupons.json')
    if (fs.existsSync(couponsPath)) {
      try {
        const couponsData = JSON.parse(fs.readFileSync(couponsPath, 'utf-8'))
        if (Array.isArray(couponsData) && couponsData.length > 0) {
          const result = await mongodb.coupon.upsertMany(couponsData)
          console.log(`✓ Migrated ${result.upsertedCount} coupons (${result.modifiedCount} updated)`)
        }
      } catch (e) {
        console.error('✗ Failed to migrate coupons:', e.message)
      }
    }

    console.log('\n✓ Migration complete!')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

migrateJsonToMongoDB().then(() => {
  process.exit(0)
})
