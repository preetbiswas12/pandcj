import mongodb from '@/lib/mongodb'

const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || 'pandc'

async function computeSummary(coll, storeId) {
  const match = {}
  if (storeId) match.storeId = storeId

  // Use aggregation pipeline to avoid loading all documents
  const pipeline = [
    { $match: match },
    {
      $facet: {
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
  let changeStream = null
  let writer = null
  
  try {
    const url = new URL(req.url)
    const storeId = url.searchParams.get('storeId') || undefined

    const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.())
    const db = client.db(DB_NAME)
    const coll = db.collection('orders')

    const initial = await computeSummary(coll, storeId)

    const { readable, writable } = new TransformStream()
    writer = writable.getWriter()

    const send = async (obj) => {
      try {
        const payload = `event: summary\ndata: ${JSON.stringify(obj)}\n\n`
        await writer.write(new TextEncoder().encode(payload))
      } catch (e) {
        console.error('Send error:', e)
      }
    }

    await send({ type: 'initial', data: initial })

    // set up change stream
    const pipeline = storeId ? [{ $match: { storeId } }] : []
    changeStream = coll.watch(pipeline, { fullDocument: 'updateLookup' })

    // iterate change stream in background
    ;(async () => {
      try {
        for await (const change of changeStream) {
          try {
            const latest = await computeSummary(coll, storeId)
            await send({ type: 'update', data: latest })
          } catch (e) {
            console.error('Compute summary error:', e)
          }
        }
      } catch (e) {
        if (!e.message.includes('Stream closed')) {
          console.error('Change stream error:', e)
        }
      } finally {
        try { 
          if (changeStream) await changeStream.close()
          if (writer) await writer.close() 
        } catch (e) {}
      }
    })()

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })

    return new Response(readable, { status: 200, headers })
  } catch (e) {
    console.error('Orders stream error:', e)
    try { 
      if (changeStream) await changeStream.close()
      if (writer) await writer.close() 
    } catch (err) {}
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export default GET
