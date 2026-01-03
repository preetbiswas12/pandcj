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
        const client = await getClient();
        const db = client.db(DB_NAME);

        // Delete all orders from the database
        const ordersCollection = db.collection('orders');
        const result = await ordersCollection.deleteMany({});

        return new Response(
            JSON.stringify({
                success: true,
                message: 'All order history has been deleted',
                deletedCount: result.deletedCount,
            }),
            { status: 200 }
        );
    } catch (err) {
        console.error('Error deleting all orders:', err);
        return new Response(
            JSON.stringify({ error: 'Failed to delete orders', details: err.message }),
            { status: 500 }
        );
    }
}
