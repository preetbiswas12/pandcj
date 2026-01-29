import { getMongoClient } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const DB_NAME = process.env.MONGODB_DB || 'pandc'

/**
 * GET /api/categories/[id] - Fetch single category
 * PUT /api/categories/[id] - Update category
 * DELETE /api/categories/[id] - Delete category
 */
export async function GET(request, { params }) {
    try {
        let { id } = params
        
        // Handle invalid ObjectId format - log and return clear error
        if (!id || typeof id !== 'string' || id.length < 24) {
            console.error('[Categories API] Invalid ID format:', id, 'Length:', id?.length)
            return Response.json({
                success: false,
                message: 'Invalid category ID format'
            }, { status: 400 })
        }

        if (!ObjectId.isValid(id)) {
            console.error('[Categories API] ObjectId validation failed for:', id)
            return Response.json({
                success: false,
                message: 'Invalid category ID'
            }, { status: 400 })
        }

        const client = await getMongoClient()
        const db = client.db(DB_NAME)
        const categoriesCollection = db.collection('categories')

        const category = await categoriesCollection.findOne({
            _id: new ObjectId(id)
        })

        if (!category) {
            return Response.json({
                success: false,
                message: 'Category not found'
            }, { status: 404 })
        }

        return Response.json({
            success: true,
            data: category
        })
    } catch (error) {
        console.error('[Categories API] Error:', error)
        return Response.json({
            success: false,
            message: 'Failed to fetch category',
            error: error.message
        }, { status: 500 })
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = params
        const body = await request.json()
        const { name, image } = body

        if (!ObjectId.isValid(id)) {
            return Response.json({
                success: false,
                message: 'Invalid category ID'
            }, { status: 400 })
        }

        if (!name && !image) {
            return Response.json({
                success: false,
                message: 'At least one field is required'
            }, { status: 400 })
        }

        const client = await getMongoClient()
        const db = client.db(DB_NAME)
        const categoriesCollection = db.collection('categories')

        const updateData = {}
        if (name) updateData.name = name
        if (image) updateData.image = image
        updateData.updatedAt = new Date()

        const result = await categoriesCollection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        )

        if (!result.value) {
            return Response.json({
                success: false,
                message: 'Category not found'
            }, { status: 404 })
        }

        return Response.json({
            success: true,
            message: 'Category updated successfully',
            data: result.value
        })
    } catch (error) {
        console.error('[Categories API] Error:', error)
        return Response.json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        let { id } = params
        
        // Validate ID format
        if (!id || typeof id !== 'string' || id.length < 24) {
            console.error('[Categories API DELETE] Invalid ID format:', id, 'Length:', id?.length)
            return Response.json({
                success: false,
                message: 'Invalid category ID format - corrupted data. Please contact support.'
            }, { status: 400 })
        }

        if (!ObjectId.isValid(id)) {
            console.error('[Categories API DELETE] ObjectId validation failed for:', id)
            return Response.json({
                success: false,
                message: 'Invalid category ID'
            }, { status: 400 })
        }

        const client = await getMongoClient()
        const db = client.db(DB_NAME)
        const categoriesCollection = db.collection('categories')

        const result = await categoriesCollection.deleteOne({
            _id: new ObjectId(id)
        })

        if (result.deletedCount === 0) {
            return Response.json({
                success: false,
                message: 'Category not found'
            }, { status: 404 })
        }

        return Response.json({
            success: true,
            message: 'Category deleted successfully'
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
    } catch (error) {
        console.error('[Categories API DELETE] Error:', error)
        return Response.json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        }, { status: 500 })
    }
}
