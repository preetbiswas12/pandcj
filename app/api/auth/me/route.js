import { getSessionUser } from '@/lib/auth'

export async function GET(req) {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated', message: 'No valid session found' }), { status: 401 })
    }

    return new Response(
      JSON.stringify(user),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[/api/auth/me] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch user' }), { status: 500 })
  }
}
