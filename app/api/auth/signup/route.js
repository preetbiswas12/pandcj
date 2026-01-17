import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongodb from '@/lib/mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const DB_NAME = process.env.MONGODB_DB || 'pandc'

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, password, fullName } = body || {}

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400 })
    }

    const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.())
    const db = client.db(DB_NAME)
    const users = db.collection('users')
    const existingUser = await users.findOne({ email: String(email).toLowerCase() })

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), { status: 409 })
    }

    const passwordHash = hashPassword(password)
    const userId = new Date().getTime().toString()

    const newUser = {
      id: userId,
      email: String(email).toLowerCase(),
      password: passwordHash,
      fullName: fullName || '',
      createdAt: new Date(),
      role: 'USER'
    }

    await users.insertOne(newUser)

    // Create JWT token instead of session token
    const jwtToken = jwt.sign(
      { 
        userId: userId, 
        email: newUser.email,
        role: 'USER'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Set JWT cookie
    const cookie = `pandc_user_token=${jwtToken}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: userId,
          email: newUser.email,
          fullName: newUser.fullName
        }
      }),
      {
        status: 201,
        headers: { 'Set-Cookie': cookie }
      }
    )
  } catch (err) {
    console.error('Signup error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Signup failed' }), { status: 500 })
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: 'POST only' }), { status: 405 })
}
