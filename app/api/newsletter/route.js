import mongodb from '@/lib/mongodb'

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, action } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 })
    }

    let result
    if (action === 'unsubscribe') {
      result = await mongodb.newsletter.unsubscribe(email)
    } else {
      result = await mongodb.newsletter.subscribe(email)
    }

    return new Response(JSON.stringify({ success: true, result }), { status: 200 })
  } catch (err) {
    console.error('POST /api/newsletter failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to process newsletter request' }), { status: 500 })
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 })
    }

    const subscription = await mongodb.newsletter.findByEmail(email)
    return new Response(JSON.stringify(subscription || { email, subscribed: false }), { status: 200 })
  } catch (err) {
    console.error('GET /api/newsletter failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to fetch subscription status' }), { status: 500 })
  }
}
