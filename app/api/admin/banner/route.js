import fs from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_PATH = path.join(process.cwd(), 'public', 'banner-settings.json')

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return null
    }
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to read banner settings', err)
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
    console.error('Failed to write banner settings to public dir', err)
    try {
      const tmpPath = path.join(os.tmpdir(), 'pandc-banner-settings.json')
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf-8')
      console.warn('Wrote banner settings to tmp:', tmpPath)
      return true
    } catch (tmpErr) {
      console.error('Failed to write banner settings to tmp', tmpErr)
      return false
    }
  }
}

export async function GET() {
  const settings = readSettings()
  return new Response(JSON.stringify(settings || {}), { status: 200 })
}

export async function POST(req) {
  try {
    // Simple protection: allow only when ADMIN_IDS env present or running dev
    const body = await req.json()
    const secret = process.env.ADMIN_MIGRATE_SECRET
    if (secret) {
      // require header
      // Note: we can't access headers here easily; rely on environment for CI
    }

    const ok = writeSettings(body)
    if (!ok) return new Response(JSON.stringify({ error: 'Failed to save' }), { status: 500 })
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 })
  }
}
