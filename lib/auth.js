import { MongoClient } from 'mongodb'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import mongodb from '@/lib/mongodb'

// Global client reuse (similar to mongodb.js)
const globalForMongo = globalThis
const MONGO_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB || 'pandc'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

async function getMongoClient() {
  if (!MONGO_URI) throw new Error('MONGODB_URI not configured')
  
  // Check if client exists and is still connected
  if (globalForMongo._mongoClient) {
    try {
      await globalForMongo._mongoClient.db('admin').command({ ping: 1 })
      return globalForMongo._mongoClient
    } catch (e) {
      // Connection is dead, create a new one
      try {
        await globalForMongo._mongoClient.close()
      } catch (closeErr) {}
      globalForMongo._mongoClient = null
    }
  }

  // Create new client with connection pooling settings
  const client = new MongoClient(MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 60000,
    waitQueueTimeoutMS: 10000
  })
  await client.connect()
  globalForMongo._mongoClient = client
  return client
}

async function getDB() {
  const client = await getMongoClient()
  return client.db(DB_NAME)
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pandc_user_token')?.value
    
    console.log('[getSessionUser] Token from cookie:', token ? 'exists' : 'missing')
    if (!token) return null

    try {
      // Verify JWT token directly
      const decoded = verifyToken(token)
      console.log('[getSessionUser] Token verified, userId:', decoded.userId)
      
      if (!decoded || !decoded.userId) return null

      // Fetch user from database
      const db = await getDB()
      const users = db.collection('users')
      const user = await users.findOne({ id: decoded.userId })

      console.log('[getSessionUser] User found:', !!user)
      return user
        ? {
            id: user.id || user._id,
            email: user.email,
            fullName: user.fullName || '',
            primaryEmailAddress: { email: user.email }
          }
        : null
    } catch (dbErr) {
      console.error('[getSessionUser] Database or token error:', dbErr.message)
      return null
    }
  } catch (err) {
    console.error('[getSessionUser] Error:', err.message)
    return null
  }
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log('[verifyToken] Token verified for user:', decoded.userId)
    return decoded
  } catch (err) {
    console.error('[verifyToken] Token verification failed:', err.message)
    return null
  }
}
