import fs from 'fs'
import path from 'path'
import os from 'os'
import { MongoClient } from 'mongodb'

const SETTINGS_PATH = path.join(process.cwd(), 'public', 'pageintro-settings.json')

export async function getPageIntro() {
  // Prefer DB-backed pageintro when available
  try {
    const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
    const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (uri && uri.split('/').pop())
    if (uri && dbName) {
      const client = new MongoClient(uri)
      await client.connect()
      try {
        const db = client.db(dbName)
        const doc = await db.collection('pageintro').findOne({ key: 'site' })
        if (doc) return doc
      } finally {
        try { await client.close() } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('PageIntro DB read failed', e?.message || e)
  }

  // fallback to public file or tmp
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
      return JSON.parse(raw)
    }
    const tmpPath = path.join(os.tmpdir(), 'pandc-pageintro-settings.json')
    if (fs.existsSync(tmpPath)) {
      const rawTmp = fs.readFileSync(tmpPath, 'utf-8')
      return JSON.parse(rawTmp)
    }
  } catch (e) {
    console.warn('PageIntro file read failed', e)
  }
  return null
}

export async function savePageIntro(obj) {
  // save to DB if configured
  try {
    const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
    const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (uri && uri.split('/').pop())
    if (uri && dbName) {
      const client = new MongoClient(uri)
      await client.connect()
      try {
        const db = client.db(dbName)
        await db.collection('pageintro').updateOne({ key: 'site' }, { $set: { ...obj, key: 'site' } }, { upsert: true })
        // also try to write public file best-effort
        try { writeSettings(obj) } catch (e) {}
        return { ok: true, provider: 'db' }
      } finally {
        try { await client.close() } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('PageIntro DB write failed', e?.message || e)
  }

  const ok = writeSettings(obj)
  return ok ? { ok: true, provider: 'fs' } : { ok: false }
}

function writeSettings(obj) {
  try {
    const dir = path.dirname(SETTINGS_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(obj, null, 2), 'utf-8')
    return true
  } catch (err) {
    try {
      const tmpPath = path.join(os.tmpdir(), 'pandc-pageintro-settings.json')
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf-8')
      return true
    } catch (tmpErr) {
      return false
    }
  }
}
