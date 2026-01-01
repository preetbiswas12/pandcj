import fs from 'fs'
import path from 'path'
import os from 'os'

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const file = path.join(publicDir, 'newsletters.json')
    if (!fs.existsSync(file)) return new Response(JSON.stringify([]), { status: 200 })
    const data = JSON.parse(fs.readFileSync(file, 'utf8') || '[]')
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Could not read newsletters' }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const email = (body?.email || '').trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 })
    }

    const publicDir = path.join(process.cwd(), 'public')
    const file = path.join(publicDir, 'newsletters.json')
    let list = []
    try { list = JSON.parse(fs.readFileSync(file, 'utf8') || '[]') } catch (e) { list = [] }
    // avoid duplicates
    if (list.find(item => item.email.toLowerCase() === email.toLowerCase())) {
      return new Response(JSON.stringify({ ok: true, message: 'Already subscribed' }), { status: 200 })
    }

    const entry = { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8), email, createdAt: new Date().toISOString() }
    list.unshift(entry)
    try {
      fs.writeFileSync(file, JSON.stringify(list, null, 2))
    } catch (err) {
      console.error('Failed to write newsletters.json to public dir', err)
      try {
        const tmpPath = path.join(os.tmpdir(), 'pandc-newsletters.json')
        fs.writeFileSync(tmpPath, JSON.stringify(list, null, 2))
        console.warn('Wrote newsletters to tmp:', tmpPath)
      } catch (tmpErr) {
        console.error('Failed to write newsletters to tmp', tmpErr)
        return new Response(JSON.stringify({ error: 'Could not save subscription' }), { status: 500 })
      }
    }

    return new Response(JSON.stringify({ ok: true, entry }), { status: 201 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Could not save subscription' }), { status: 500 })
  }
}
