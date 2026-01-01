import mongodb from '@/lib/mongodb'

export async function POST(req) {
  try {
    const body = await req.json()
    const { localOrderId } = body || {}
    if (!localOrderId) return new Response(JSON.stringify({ error: 'localOrderId required' }), { status: 400 })

    try {
      const ord = await mongodb.order.findById(localOrderId)
      if (!ord) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
      if (ord.status === 'expired') return new Response(JSON.stringify({ ok: true }), { status: 200 })
      await mongodb.order.updateStatus(localOrderId, 'expired')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    } catch (e) {
      console.warn('Could not expire order', e.message || e)
      return new Response(JSON.stringify({ error: 'Could not expire order' }), { status: 500 })
    }
  } catch (err) {
    console.error('expire error', err)
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}
