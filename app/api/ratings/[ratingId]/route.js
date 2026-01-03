import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'pandcjewellery';

async function getClient() {
    if (!MONGO_URI) throw new Error('MONGODB_URI not set');
    if (global._mongoClient) return global._mongoClient;
    const c = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
    await c.connect();
    global._mongoClient = c;
    return c;
}

export async function DELETE(req, { params }) {
    try {
        const { ratingId } = params;
        let body = {};
        try {
            body = await req.json();
        } catch (e) {
            // Body might not be valid JSON
            console.error('Failed to parse request body:', e);
        }
        
        const { userId } = body;

        // Validate inputs
        if (!ratingId) {
            return new Response(
                JSON.stringify({ error: 'Rating ID is required' }),
                { status: 400 }
            );
        }

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'User ID is required' }),
                { status: 400 }
            );
        }

        const client = await getClient();
        const db = client.db(DB_NAME);
        const ratingsCollection = db.collection('ratings');

        // Check if review exists and belongs to the user
        const review = await ratingsCollection.findOne({
            _id: new ObjectId(ratingId)
        });

        if (!review) {
            return new Response(
                JSON.stringify({ error: 'Review not found' }),
                { status: 404 }
            );
        }

        if (review.userId !== userId) {
            return new Response(
                JSON.stringify({ error: 'You can only delete your own reviews' }),
                { status: 403 }
            );
        }

        // Delete the review
        const result = await ratingsCollection.deleteOne({
            _id: new ObjectId(ratingId)
        });

        if (result.deletedCount === 0) {
            return new Response(
                JSON.stringify({ error: 'Failed to delete review' }),
                { status: 500 }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Review deleted successfully'
            }),
            { status: 200 }
        );

    } catch (error) {
        console.error('Error deleting review:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to delete review',
                details: error.message
            }),
            { status: 500 }
        );
    }
}
