#!/usr/bin/env node
require('dotenv').config()
const { MongoClient } = require('mongodb')

async function main() {
  const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }
  const dbName = process.env.MONGODB_DB || process.env.NEXT_PUBLIC_MONGODB_DB || (() => {
    try { return uri.split('/').pop().split('?')[0] } catch { return null }
  })()
  if (!dbName) {
    console.error('MONGODB_DB not set and could not infer')
    process.exit(1)
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)
    const doc = await db.collection('pageintro').findOne({ key: 'site' })
    console.log('pageintro doc:', JSON.stringify(doc, null, 2))
    process.exit(0)
  } catch (e) {
    console.error('Error reading pageintro from MongoDB', e)
    process.exit(1)
  } finally {
    try { await client.close() } catch (e) {}
  }
}

main()
