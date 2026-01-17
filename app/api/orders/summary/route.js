import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || process.env.NEXT_PUBLIC_MONGODB_DB || 'pandc'

async function getClient() {
  if (!MONGO_URI) throw new Error('MONGODB_URI not set')
  if (global._mongoClient) return global._mongoClient
  const c = new MongoClient(MONGO_URI)
  await c.connect()
  global._mongoClient = c
  return c
}

async function computeSummary({ storeId } = {}) {
  const client = await getClient()
  const coll = client.db(DB_NAME).collection('orders')
  const match = {}
  if (storeId) match.storeId = storeId

  // Use aggregation pipeline to avoid loading all documents into memory
  const pipeline = [
    { $match: match },
    {
      $facet: {
        all: [
          { $count: 'total' }
        ],
        cancelled: [
          {
            $match: {
              status: { $regex: '^CANCEL', $options: 'i' }
            }
          },
          { $count: 'total' }
        ],
        revenue: [
          {
            $match: {
              status: { $not: { $regex: '^CANCEL', $options: 'i' } }
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: { $toDouble: '$total' } },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]

  const result = await coll.aggregate(pipeline).toArray()
  const data = result[0] || {}
  
  const totalOrders = data.revenue?.[0]?.count || 0
  const totalAmount = data.revenue?.[0]?.totalAmount || 0
  const cancelledCount = data.cancelled?.[0]?.total || 0
  
  return { totalOrders, totalAmount, cancelled: cancelledCount }
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const storeId = url.searchParams.get('storeId') || undefined
    const summary = await computeSummary({ storeId })
    return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

export default GET
