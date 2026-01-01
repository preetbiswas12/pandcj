import fs from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_PATH = path.join(process.cwd(), 'public', 'pageintro-settings.json')

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return null
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to read pageintro settings', err)
    return null
  }
}

function writeSettings(obj) {
  try {
    const dir = path.dirname(SETTINGS_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(obj, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to write pageintro settings to public dir', err)
    try {
      const tmpPath = path.join(os.tmpdir(), 'pandc-pageintro-settings.json')
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf-8')
      console.warn('Wrote pageintro settings to tmp:', tmpPath)
      return true
    } catch (tmpErr) {
      console.error('Failed to write pageintro settings to tmp', tmpErr)
      return false
    }
  }
}

export async function GET() {
  const settings = readSettings()
  return new Response(JSON.stringify(settings || {}), { status: 200 })
}

export async function POST(req) {
  import fs from 'fs'
  import path from 'path'
  import os from 'os'
  import { MongoClient } from 'mongodb'

  const SETTINGS_PATH = path.join(process.cwd(), 'public', 'pageintro-settings.json')

  function readSettings() {
    try {
      if (!fs.existsSync(SETTINGS_PATH)) {
        // public file not present — attempt to read fallback from tmp
        const tmpPath = path.join(os.tmpdir(), 'pandc-pageintro-settings.json')
        if (fs.existsSync(tmpPath)) {
          try {
            const rawTmp = fs.readFileSync(tmpPath, 'utf-8')
            return JSON.parse(rawTmp)
          } catch (tmpErr) {
            console.error('Failed to read pageintro settings from tmp', tmpErr)
            return null
          }
        }
        return null
      }
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
      return JSON.parse(raw)
    } catch (err) {
      console.error('Failed to read pageintro settings', err)
      return null
    }
  }

  function writeSettings(obj) {
    try {
      // Ensure directory exists before writing
      const dir = path.dirname(SETTINGS_PATH)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(obj, null, 2), 'utf-8')
      return true
    } catch (err) {
      console.error('Failed to write pageintro settings to public dir', err)
      try {
        const tmpPath = path.join(os.tmpdir(), 'pandc-pageintro-settings.json')
        fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf-8')
        console.warn('Wrote pageintro settings to tmp:', tmpPath)
        return true
      } catch (tmpErr) {
        console.error('Failed to write pageintro settings to tmp', tmpErr)
        return false
      }
    }
  }

  async function tryGetPageIntroFromDb() {
    try {
      const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
      const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (uri && uri.split('/').pop())
      if (!uri || !dbName) return null
      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
      await client.connect()
      try {
        const db = client.db(dbName)
        const doc = await db.collection('pageintro').findOne({ key: 'site' })
        return doc || null
      } finally {
        try { await client.close() } catch (e) {}
      }
    } catch (e) {
      console.warn('PageIntro DB read failed', e?.message || e)
      return null
    }
  }

  async function trySavePageIntroToDb(obj) {
    try {
      const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
      const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (uri && uri.split('/').pop())
      if (!uri || !dbName) return false
      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
      await client.connect()
      try {
        const db = client.db(dbName)
        await db.collection('pageintro').updateOne({ key: 'site' }, { $set: { ...obj, key: 'site' } }, { upsert: true })
        return true
      } finally {
        try { await client.close() } catch (e) {}
      }
    } catch (e) {
      console.warn('PageIntro DB write failed', e?.message || e)
      return false
    }
  }

  export async function GET() {
    // Prefer DB-backed pageintro when available
    const dbDoc = await tryGetPageIntroFromDb()
    if (dbDoc) return new Response(JSON.stringify(dbDoc || {}), { status: 200 })

    const settings = readSettings()
    return new Response(JSON.stringify(settings || {}), { status: 200 })
  }

  export async function POST(req) {
    try {
      const body = await req.json()

      // Try to persist to DB first
      const dbOk = await trySavePageIntroToDb(body)
      if (dbOk) {
        // Also attempt to persist to filesystem so public reads update immediately (best-effort)
        try { writeSettings(body) } catch (e) { /* ignore */ }
        return new Response(JSON.stringify({ success: true, provider: 'db' }), { status: 200 })
      }

      // Fallback to filesystem/tmp
      const ok = writeSettings(body)
      if (!ok) return new Response(JSON.stringify({ error: 'Failed to save' }), { status: 500 })
      return new Response(JSON.stringify({ success: true, provider: 'fs' }), { status: 200 })
    } catch (err) {
      console.error(err)
      return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 })
    }
  }
