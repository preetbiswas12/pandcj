import { MongoClient } from 'mongodb';

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

export async function DELETE(req) {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get('email');

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email query parameter is required' }),
                { status: 400 }
            );
        }

        const client = await getClient();
        const db = client.db(DB_NAME);

        // Delete all orders for this user
        const ordersCollection = db.collection('orders');
        const ordersResult = await ordersCollection.deleteMany({ userEmail: email });

        // Delete all reviews for this user
        const ratingsCollection = db.collection('ratings');
        const ratingsResult = await ratingsCollection.deleteMany({ userEmail: email });

        // Delete from wishlists if applicable
        const wishlistCollection = db.collection('wishlists');
        const wishlistResult = await wishlistCollection.deleteMany({ userEmail: email });

        return new Response(
            JSON.stringify({
                success: true,
                message: `User data reset for ${email}`,
                deletedOrders: ordersResult.deletedCount,
                deletedRatings: ratingsResult.deletedCount,
                deletedWishlists: wishlistResult.deletedCount,
            }),
            { status: 200 }
        );
    } catch (err) {
        console.error('Error resetting user data:', err);
        return new Response(
            JSON.stringify({ error: 'Failed to reset user data', details: err.message }),
            { status: 500 }
        );
    }
}
