import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    const db = await (async () => {
      const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.())
      return client.db(process.env.MONGODB_DB || 'gocart')
    })()

    const coll = db.collection('stores')

    // Initial data
    const filter = userId ? { userId } : {}
    const initial = await coll.find(filter).toArray()

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    const send = async (data) => {
      const payload = `event: update\ndata: ${JSON.stringify(data)}\n\n`
      await writer.write(new TextEncoder().encode(payload))
    }

    // Send initial stores list
    await send({ type: 'initial', stores: initial })

    // Watch for changes
    const pipeline = userId ? [{ $match: { userId } }] : []
    const changeStream = coll.watch(pipeline, { fullDocument: 'updateLookup' })

    // Background listener
    ;(async () => {
      try {
        for await (const change of changeStream) {
          const stores = await coll.find(filter).toArray()
          await send({ type: 'stores_updated', stores, change: change.operationType })
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
    console.error('Stores stream error:', err)
    return new Response('error', { status: 500 })
  }
}
