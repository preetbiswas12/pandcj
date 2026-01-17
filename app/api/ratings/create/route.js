import mongodb from '@/lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || 'pandc';

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, userName, userImage, productId, orderId, rating, review } = body;

    // Validation
    if (!userId || !productId || !rating || !review) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, productId, rating, review' }),
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be between 1 and 5' }),
        { status: 400 }
      );
    }

    if (review.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Review must be at least 5 characters' }),
        { status: 400 }
      );
    }

    // Use the global pooled connection
    const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.());
    const db = client.db(DB_NAME);
    const ratingsCollection = db.collection('ratings');

    // Create rating document
    const ratingDoc = {
      userId,
      userName: userName || 'Anonymous',
      userImage: userImage || null,
      productId,
      orderId: orderId || null,
      rating: Number(rating),
      review: review.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert into database
    const result = await ratingsCollection.insertOne(ratingDoc);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Review submitted successfully',
        ratingId: result.insertedId,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error creating rating:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to submit review', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
