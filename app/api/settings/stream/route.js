import mongodb from '@/lib/mongodb'

const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || process.env.NEXT_PUBLIC_MONGODB_DB || 'pandc'

export async function GET(req) {
  let changeStream = null
  let writer = null
  
  try {
    const url = new URL(req.url)
    const key = url.searchParams.get('key') || 'banner' // 'banner' or 'pageintro'

    const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.())
    const db = client.db(DB_NAME)
    const coll = db.collection('settings')

    // Get initial value
    const initial = await coll.findOne({ key })
    console.log(`[Settings Stream] Initial value for key ${key}:`, initial?.value)

    const { readable, writable } = new TransformStream()
    writer = writable.getWriter()

    const send = async (obj) => {
      try {
        const payload = `event: update\ndata: ${JSON.stringify(obj)}\n\n`
        console.log(`[Settings Stream] Sending payload:`, payload)
        await writer.write(new TextEncoder().encode(payload))
      } catch (e) {
        console.error('Send error:', e)
      }
    }

    // Send initial event
    await send({ type: 'initial', data: initial?.value || null })

    // Set up change stream - watch for updates/inserts on this key
    changeStream = coll.watch(
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
    ;(async () => {
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
        if (!e.message.includes('Stream closed')) {
          console.error(`[Settings Stream] Watch error for key ${key}:`, e?.message || e)
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
    console.error('Settings stream error:', e)
    try { 
      if (changeStream) await changeStream.close()
      if (writer) await writer.close() 
    } catch (err) {}
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export default GET
