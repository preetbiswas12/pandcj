import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const storeId = url.searchParams.get('storeId')

    const db = await (async () => {
      const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.())
      return client.db(process.env.MONGODB_DB || 'gocart')
    })()

    const coll = db.collection('products')

    // Initial data
    const filter = storeId ? { storeId } : {}
    const initial = await coll.find(filter).toArray()

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    const send = async (data) => {
      const payload = `event: update\ndata: ${JSON.stringify(data)}\n\n`
      await writer.write(new TextEncoder().encode(payload))
    }

    // Send initial product list
    await send({ type: 'initial', products: initial })

    // Watch for changes
    const pipeline = storeId ? [{ $match: { storeId } }] : []
    const changeStream = coll.watch(pipeline, { fullDocument: 'updateLookup' })

    // Background listener
    ;(async () => {
      try {
        for await (const change of changeStream) {
          const products = await coll.find(filter).toArray()
          await send({ type: 'products_updated', products, change: change.operationType })
        }
      } catch (e) {
        console.error('Change stream error:', e)
      } finally {
        try { await writer.close() } catch (e) {}
      }
    })()

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (err) {
    console.error('Products stream error:', err)
    return new Response('error', { status: 500 })
  }
}
