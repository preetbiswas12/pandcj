import { MongoClient } from 'mongodb'
import crypto from 'crypto'

async function getDb() {
  const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
  const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (uri && uri.split('/').pop())
  if (!uri || !dbName) throw new Error('MONGODB_URI or MONGODB_DB not set')
  const client = new MongoClient(uri)
  await client.connect()
  return { db: client.db(dbName), client }
}

function verifyPassword(stored, provided) {
  try {
    if (!stored || !stored.salt || !stored.hash) return false
    const derived = crypto.scryptSync(provided, stored.salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(stored.hash, 'hex'))
  } catch (e) {
    return false
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, password, role } = body || {}
    if (!email || !password) return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 })

    const { db, client } = await getDb()
    try {
      const users = db.collection('users')
      const user = await users.findOne({ email: String(email).toLowerCase() })
      if (!user) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })

      // expect password stored as { salt, hash }
      if (!verifyPassword(user.password, password)) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })

      // Check if admin login and user is not admin
      if (role === 'ADMIN' && user.role !== 'ADMIN') {
        return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 })
      }

      // Handle admin login differently
      if (role === 'ADMIN' && user.role === 'ADMIN') {
        const token = crypto.randomBytes(32).toString('hex')
        const sessions = db.collection('admin_sessions')
        const now = new Date()
        const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

        await sessions.insertOne({
          token,
          userId: user.id || user._id,
          createdAt: now,
          expiresAt: expires
        })

        // Set admin session cookie
        const cookie = `pandc_admin_token=${token}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`

        return new Response(
          JSON.stringify({
            ok: true,
            token: token,
            user: {
              id: user.id || user._id,
              email: user.email,
              fullName: user.fullName || '',
              role: 'ADMIN'
            }
          }),
          {
            status: 200,
            headers: { 'Set-Cookie': cookie }
          }
        )
      }

      // Create session token for regular users
      const token = crypto.randomBytes(32).toString('hex')
      const sessions = db.collection('user_sessions')
      const now = new Date()
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

      await sessions.insertOne({
        token,
        userId: user.id || user._id,
        createdAt: now,
        expiresAt: expires
      })

      // Set session cookie
      const cookie = `pandc_user_token=${token}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`

      return new Response(
        JSON.stringify({
          ok: true,
          token: token,
          user: {
            id: user.id || user._id,
            email: user.email,
            fullName: user.fullName || ''
          }
        }),
        {
          status: 200,
          headers: { 'Set-Cookie': cookie }
        }
      )
    } finally {
      try {
        await client.close()
      } catch (e) {}
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Login failed' }), { status: 500 })
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: 'POST only' }), { status: 405 })
}

