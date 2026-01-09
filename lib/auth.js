import { MongoClient } from 'mongodb'
import { cookies } from 'next/headers'

async function getDb() {
  const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
  const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (uri && uri.split('/').pop())
  if (!uri || !dbName) throw new Error('MONGODB_URI or MONGODB_DB not set')
  const client = new MongoClient(uri)
  await client.connect()
  return { db: client.db(dbName), client }
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pandc_user_token')?.value
    
    console.log('[getSessionUser] Token from cookie:', token ? 'exists' : 'missing')
    if (!token) return null

    const { db, client } = await getDb()

    try {
      const sessions = db.collection('user_sessions')
      const session = await sessions.findOne({
        token,
        expiresAt: { $gt: new Date() }
      })

      console.log('[getSessionUser] Session found:', !!session)
      if (!session) return null

      const users = db.collection('users')
      const user = await users.findOne({ id: session.userId })

      console.log('[getSessionUser] User found:', !!user)
      return user
        ? {
            id: user.id || user._id,
            email: user.email,
            fullName: user.fullName || '',
            primaryEmailAddress: { email: user.email }
          }
        : null
    } finally {
      try {
        await client.close()
      } catch (e) {}
    }
  } catch (err) {
    console.error('[getSessionUser] Error:', err.message)
    return null
  }
}
