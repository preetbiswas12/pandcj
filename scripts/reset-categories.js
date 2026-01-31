/**
 * Script to reset (delete all) categories from the database
 * Usage: MONGODB_URI="your_uri" node scripts/reset-categories.js
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB || 'pandc'

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is not set')
    console.error('Usage: MONGODB_URI="mongodb+srv://..." node scripts/reset-categories.js')
    process.exit(1)
}

async function resetCategories() {
    let client

    try {
        console.log('Connecting to MongoDB...')
        client = new MongoClient(MONGODB_URI)
        await client.connect()
        
        const db = client.db(DB_NAME)
        const categoriesCollection = db.collection('categories')

        // Count existing categories
        const count = await categoriesCollection.countDocuments()
        console.log(`Found ${count} categories in the database`)

        if (count === 0) {
            console.log('No categories to delete. Database is already empty.')
            return
        }

        // Delete all categories
        const result = await categoriesCollection.deleteMany({})
        console.log(`✅ Successfully deleted ${result.deletedCount} categories`)

        console.log('\nCategories database has been reset.')
    } catch (error) {
        console.error('❌ Error resetting categories:', error.message)
        process.exit(1)
    } finally {
        if (client) {
            await client.close()
            console.log('Database connection closed')
        }
    }
}

resetCategories()
