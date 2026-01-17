import { getSessionUser } from '@/lib/auth'
import { verifyToken } from '@/lib/auth'
import mongodb from '@/lib/mongodb'

export async function GET(req) {
  try {
    // First try getSessionUser (cookie-based JWT token)
    let user = await getSessionUser()
    
    if (user) {
      console.log('[/api/auth/me] User from session:', user.id)
      return new Response(
        JSON.stringify(user),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fallback: Try to get from Authorization header (JWT token)
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7)
        const decoded = verifyToken(token)
        
        if (decoded && decoded.userId) {
          console.log('[/api/auth/me] User from JWT token:', decoded.userId)
          // Fetch user from database using global mongodb client
          const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.())
          const db = client.db(process.env.MONGODB_DB || 'pandc')
          const users = await db.collection('users').findOne({ id: decoded.userId })
          
          if (users) {
            return new Response(
              JSON.stringify({
                id: users.id || users._id,
                email: users.email,
                fullName: users.fullName || '',
                primaryEmailAddress: { email: users.email }
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
        }
      } catch (tokenErr) {
        console.log('[/api/auth/me] JWT verification failed:', tokenErr.message)
      }
    }

    // No valid auth found
    console.log('[/api/auth/me] No valid authentication found')
    return new Response(JSON.stringify({ error: 'Not authenticated', message: 'No valid session found' }), { status: 401 })
  } catch (err) {
    console.error('[/api/auth/me] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Auth check failed' }), { status: 500 })
  }
}
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch user' }), { status: 500 })
  }
}
