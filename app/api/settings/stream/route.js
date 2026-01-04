import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || process.env.NEXT_PUBLIC_MONGODB_DB || 'pandc'

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
    console.log(`[Settings Stream] Initial value for key ${key}:`, initial?.value)

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    const send = async (obj) => {
      const payload = `event: update\ndata: ${JSON.stringify(obj)}\n\n`
      console.log(`[Settings Stream] Sending payload:`, payload)
      await writer.write(new TextEncoder().encode(payload))
    }

    // Send initial event
    await writer.ready
    await send({ type: 'initial', data: initial?.value || null })

    // Set up change stream - watch for updates/inserts on this key
    const changeStream = coll.watch(
      [
        {
          $match: {
            $or: [
              { 'fullDocument.key': key, operationType: 'insert' },
              { 'fullDocument.key': key, operationType: 'update' },
              { 'fullDocument.key': key, operationType: 'replace' }
            ]
          }
        }
      ],
      { fullDocument: 'updateLookup' }
    )

    // Listen for changes
    (async () => {
      try {
        console.log(`[Settings Stream] Listening for changes on key: ${key}`)
        for await (const change of changeStream) {
          console.log(`[Settings Stream] Change detected:`, change.operationType, 'fullDocument.key:', change.fullDocument?.key)
          if (change.fullDocument && change.fullDocument.key === key) {
            console.log(`[Settings Stream] Sending update for key: ${key}`, change.operationType, 'value:', change.fullDocument.value)
            await send({ type: 'update', data: change.fullDocument.value })
          }
        }
      } catch (e) {
        console.error(`[Settings Stream] Watch error for key ${key}:`, e?.message || e)
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
