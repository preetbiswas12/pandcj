import { getMongoClient } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const DB_NAME = process.env.MONGODB_DB || 'pandc'

/**
 * GET /api/categories - Fetch all categories
 * POST /api/categories - Create new category
 */
export async function GET(request) {
    try {
        const client = await getMongoClient()
        const db = client.db(DB_NAME)
        const categoriesCollection = db.collection('categories')

        const categories = await categoriesCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray()

        return Response.json({
            success: true,
            data: categories
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
    } catch (error) {
        console.error('[Categories API] Error:', error)
        return Response.json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { name, image } = body

        if (!name || !image) {
            return Response.json({
                success: false,
                message: 'Name and image are required'
            }, { status: 400 })
        }

        const client = await getMongoClient()
        const db = client.db(DB_NAME)
        const categoriesCollection = db.collection('categories')

        const result = await categoriesCollection.insertOne({
            name,
            image,
            createdAt: new Date(),
            updatedAt: new Date()
        })

        return Response.json({
            success: true,
            message: 'Category created successfully',
            data: {
                _id: result.insertedId,
                name,
                image,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }, { status: 201 })
    } catch (error) {
        console.error('[Categories API] Error:', error)
        return Response.json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        }, { status: 500 })
    }
}
