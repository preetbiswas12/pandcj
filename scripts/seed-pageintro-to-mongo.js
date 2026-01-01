#!/usr/bin/env node
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const os = require('os')
const { MongoClient } = require('mongodb')

async function main() {
  const SETTINGS_PATH = path.join(process.cwd(), 'public', 'pageintro-settings.json')
  const tmpPath = path.join(os.tmpdir(), 'pandc-pageintro-settings.json')

  let data = null
  if (fs.existsSync(SETTINGS_PATH)) {
    try { data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) } catch (e) { console.error('Failed to parse public pageintro file', e) }
  }
  if (!data && fs.existsSync(tmpPath)) {
    try { data = JSON.parse(fs.readFileSync(tmpPath, 'utf-8')) } catch (e) { console.error('Failed to parse tmp pageintro file', e) }
  }
  if (!data) {
    console.warn('No pageintro settings found in public or tmp. Using default pageintro settings.')
    data = {
      title: 'Sale of the summer collection',
      image: '/assets/slide_1.jpg'
    }
  }

  const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }
  const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (() => {
    try { return uri.split('/').pop().split('?')[0] } catch { return null }
  })()
  if (!dbName) {
    console.error('MONGODB_DB not set and could not infer from URI')
    process.exit(1)
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  try {
    await client.connect()
    const db = client.db(dbName)
    const col = db.collection('pageintro')
    const doc = Object.assign({}, data, { key: 'site' })
    const res = await col.updateOne({ key: 'site' }, { $set: doc }, { upsert: true })
    console.log('Upserted pageintro into MongoDB, result:', res.result || res)
    process.exit(0)
  } catch (e) {
    console.error('Failed to write to MongoDB', e)
    process.exit(1)
  } finally {
    try { await client.close() } catch (e) {}
  }
}

main()
