import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
const DB_NAME = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || 'gocart'

async function getClient() {
  if (!MONGO_URI) throw new Error('MONGODB_URI not set')
  if (global._mongoClient) return global._mongoClient
  const c = new MongoClient(MONGO_URI, { useUnifiedTopology: true })
  await c.connect()
  global._mongoClient = c
  return c
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const key = url.searchParams.get('key') || 'banner' // 'banner' or 'pageintro'

    const client = await getClient()
    const db = client.db(DB_NAME)
    const coll = db.collection('settings')

    // Get initial value
    const initial = await coll.findOne({ key })

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    const send = async (obj) => {
      const payload = `event: update\ndata: ${JSON.stringify(obj)}\n\n`
      await writer.write(new TextEncoder().encode(payload))
    }

    // Send initial event
    await writer.ready
    await send({ type: 'initial', data: initial?.value || null })

    // Set up change stream
    const changeStream = coll.watch(
      [{ $match: { 'fullDocument.key': key } }],
      { fullDocument: 'updateLookup' }
    )

    // Listen for changes
    (async () => {
      try {
        for await (const change of changeStream) {
          if (change.fullDocument) {
            await send({ type: 'update', data: change.fullDocument.value })
          }
        }
      } catch (e) {
        // stream closed or error
      } finally {
        try { await writer.close() } catch (e) {}
        try { await changeStream.close() } catch (e) {}
      }
    })()

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })

    return new Response(readable, { status: 200, headers })
  } catch (e) {
    console.error('Settings stream error:', e)
    return new Response('error', { status: 500 })
  }
}

export default GET
