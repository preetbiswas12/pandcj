#!/usr/bin/env node

/**
 * Migration script: Moves data from JSON files to MongoDB
 * Reads from public/*.json files and upserts into MongoDB collections
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongodb from '../lib/mongodb.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function migrateData() {
  console.log('Starting MongoDB migration from JSON files...')

  try {
    // Migrate stores
    console.log('\n1. Migrating stores...')
    const storesPath = path.join(__dirname, '../public/stores.json')
    if (fs.existsSync(storesPath)) {
      const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8') || '[]')
      if (stores.length > 0) {
        const result = await mongodb.store.upsertMany(stores)
        console.log(`  ✓ Migrated ${result.upsertedCount} new stores, updated ${result.modifiedCount}`)
      }
    } else {
      console.log('  - No stores.json found')
    }

    // Migrate products
    console.log('\n2. Migrating products...')
    const productsPath = path.join(__dirname, '../public/products.json')
    if (fs.existsSync(productsPath)) {
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf8') || '[]')
      if (products.length > 0) {
        const result = await mongodb.product.upsertMany(products)
        console.log(`  ✓ Migrated ${result.upsertedCount} new products, updated ${result.modifiedCount}`)
      }
    } else {
      console.log('  - No products.json found')
    }

    // Migrate orders
    console.log('\n3. Migrating orders...')
    const ordersPath = path.join(__dirname, '../public/orders.json')
    if (fs.existsSync(ordersPath)) {
      const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8') || '[]')
      if (orders.length > 0) {
        const result = await mongodb.order.upsertMany(orders)
        console.log(`  ✓ Migrated ${result.upsertedCount} new orders, updated ${result.modifiedCount}`)
      }
    } else {
      console.log('  - No orders.json found')
    }

    // Migrate newsletters
    console.log('\n4. Migrating newsletters...')
    const newslettersPath = path.join(__dirname, '../public/newsletters.json')
    if (fs.existsSync(newslettersPath)) {
      const newsletters = JSON.parse(fs.readFileSync(newslettersPath, 'utf8') || '[]')
      if (newsletters.length > 0) {
        const emails = newsletters.map(n => n.email || n)
        const result = await mongodb.newsletter.upsertMany(emails)
        console.log(`  ✓ Migrated ${result.upsertedCount} new newsletters, updated ${result.modifiedCount}`)
      }
    } else {
      console.log('  - No newsletters.json found')
    }

    // Migrate coupons
    console.log('\n5. Migrating coupons...')
    const couponsPath = path.join(__dirname, '../public/coupons.json')
    if (fs.existsSync(couponsPath)) {
      const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8') || '[]')
      if (coupons.length > 0) {
        const result = await mongodb.coupon.upsertMany(coupons)
        console.log(`  ✓ Migrated ${result.upsertedCount} new coupons, updated ${result.modifiedCount}`)
      }
    } else {
      console.log('  - No coupons.json found')
    }

    console.log('\n✓ Migration completed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('\n✗ Migration failed:', err.message)
    process.exit(1)
  }
}

migrateData()
