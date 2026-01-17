import { MongoClient } from 'mongodb'
import { randomUUID } from 'crypto'

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || process.env.NEXT_PUBLIC_MONGODB_DB || 'pandcjewellery'

const globalForMongo = globalThis

async function getClient() {
  if (!MONGO_URI) throw new Error('MONGODB_URI not set')
  
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
  return globalForMongo._mongoClient
}

function simpleMatch(filter, doc) {
  if (!filter) return true
  for (const k of Object.keys(filter)) {
    if (filter[k] === undefined) continue
    if (doc[k] !== filter[k]) return false
  }
  return true
}

async function findCollection(name) {
  const client = await getClient()
  return client.db(DB_NAME).collection(name)
}

function normalizeId(obj) {
  if (!obj) return obj
  if (!obj.id && obj._id) obj.id = String(obj._id)
  return obj
}

const mongo = {
  async $connect() {
    await getClient()
  },
  async $disconnect() {
    if (globalForMongo._mongoClient) {
      try { await globalForMongo._mongoClient.close() } catch (e) {}
      delete globalForMongo._mongoClient
    }
  },
  user: {
    async upsert({ where, create, update }) {
      const coll = await findCollection('users')
      const id = where && where.id ? where.id : (create && create.id) || randomUUID()
      const now = new Date()
      const doc = { ...(create || {}), ...(update || {}), id, updatedAt: now }
      await coll.updateOne({ id }, { $set: doc }, { upsert: true })
      return doc
    },
    async findUnique({ where }) {
      const coll = await findCollection('users')
      const doc = await coll.findOne(where || {})
      return doc || null
    },
    async findFirst({ where, orderBy } = {}) {
      const coll = await findCollection('users')
      const opts = {}
      if (orderBy && orderBy.createdAt === 'desc') opts.sort = { createdAt: -1 }
      const doc = await coll.findOne(where || {}, opts)
      return doc || null
    },
    async create({ data }) {
      const coll = await findCollection('users')
      const id = data.id || randomUUID()
      const doc = { ...data, id, createdAt: new Date(), updatedAt: new Date() }
      await coll.insertOne(doc)
      return doc
    },
  },
  address: {
    async create({ data }) {
      const coll = await findCollection('addresses')
      const id = data.id || randomUUID()
      const doc = { ...data, id, createdAt: new Date(), updatedAt: new Date() }
      await coll.insertOne(doc)
      return doc
    }
  },
  store: {
    async upsert({ where, create, update }) {
      const coll = await findCollection('stores')
      const id = where && (where.id || where.userId) ? (where.id || where.userId) : (create && create.id) || randomUUID()
      const doc = { ...(create || {}), ...(update || {}), id, updatedAt: new Date() }
      await coll.updateOne({ id }, { $set: doc }, { upsert: true })
      return doc
    },
    async findUnique({ where }) {
      const coll = await findCollection('stores')
      const doc = await coll.findOne(where || {})
      return doc || null
    },
    async findMany({ orderBy } = {}) {
      const coll = await findCollection('stores')
      const cursor = coll.find({})
      if (orderBy && orderBy.createdAt === 'desc') cursor.sort({ createdAt: -1 })
      const arr = await cursor.toArray()
      return arr
    },
    async update({ where, data }) {
      const coll = await findCollection('stores')
      await coll.updateOne(where, { $set: { ...data, updatedAt: new Date() } })
      return await coll.findOne(where)
    },
    async create({ data }) {
      const coll = await findCollection('stores')
      const id = data.id || randomUUID()
      const doc = { ...data, id, createdAt: new Date(), updatedAt: new Date() }
      await coll.insertOne(doc)
      return doc
    },
    async delete({ where }) {
      const coll = await findCollection('stores')
      await coll.deleteOne(where)
      return { count: 1 }
    },
    async updateMany({ where, data }) {
      const coll = await findCollection('stores')
      const res = await coll.updateMany(where || {}, { $set: data })
      return { count: res.modifiedCount }
    }
  },
  product: {
    async findMany({ orderBy, include } = {}) {
      const coll = await findCollection('products')
      const cursor = coll.find({})
      if (orderBy && orderBy.createdAt === 'desc') cursor.sort({ createdAt: -1 })
      const arr = await cursor.toArray()
      if (include && include.store) {
        const storesColl = await findCollection('stores')
        for (const p of arr) {
          p.store = await storesColl.findOne({ id: p.storeId })
        }
      }
      return arr
    },
    async findUnique({ where }) {
      const coll = await findCollection('products')
      const doc = await coll.findOne(where || {})
      return doc || null
    },
    async upsert({ where, create, update }) {
      const coll = await findCollection('products')
      const id = where && where.id ? where.id : (create && create.id) || randomUUID()
      const doc = { ...(create || {}), ...(update || {}), id, updatedAt: new Date() }
      if (!doc.createdAt) doc.createdAt = new Date()
      await coll.updateOne({ id }, { $set: doc }, { upsert: true })
      return doc
    },
    async create({ data }) {
      const coll = await findCollection('products')
      const id = data.id || randomUUID()
      const doc = { ...data, id, createdAt: new Date(), updatedAt: new Date() }
      await coll.insertOne(doc)
      return doc
    }
  },
  order: {
    async create({ data }) {
      const coll = await findCollection('orders')
      const id = data.id || randomUUID()
      const orderItems = (data.orderItems && data.orderItems.create) ? data.orderItems.create.map(it => ({
        id: it.id || randomUUID(),
        productId: it.productId || (it.product && it.product.id) || null,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        name: (it.product && it.product.name) || it.name || '',
        images: (it.product && it.product.images) || it.images || []
      })) : (data.orderItems || [])

      const doc = {
        ...data,
        id,
        orderItems,
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date()
      }
      await coll.insertOne(doc)
      return doc
    },
    async findMany({ where, orderBy, include } = {}) {
      const coll = await findCollection('orders')
      const q = where || {}
      const cursor = coll.find(q)
      if (orderBy && orderBy.createdAt === 'desc') cursor.sort({ createdAt: -1 })
      const arr = await cursor.toArray()
      if (include && include.orderItems && include.orderItems.include && include.orderItems.include.product) {
        const prodColl = await findCollection('products')
        for (const ord of arr) {
          if (Array.isArray(ord.orderItems)) {
            for (const it of ord.orderItems) {
              try {
                const prod = await prodColl.findOne({ id: it.productId })
                if (prod) it.product = prod
                else it.product = { id: it.productId, name: (it.name || 'Product'), images: it.images || [] }
              } catch (e) {
                it.product = { id: it.productId, name: (it.name || 'Product'), images: it.images || [] }
              }
            }
          }
        }
      }
      if (include && include.address) {
        const addrColl = await findCollection('addresses')
        for (const ord of arr) {
          if (ord.addressId) ord.address = await addrColl.findOne({ id: ord.addressId })
        }
      }
      return arr
    },
    async findUnique({ where, include } = {}) {
      const coll = await findCollection('orders')
      const doc = await coll.findOne(where || {})
      if (!doc) return null
      if (include && include.orderItems && include.orderItems.include && include.orderItems.include.product) {
        const prodColl = await findCollection('products')
        for (const it of (doc.orderItems || [])) {
          try { it.product = await prodColl.findOne({ id: it.productId }) } catch (e) { it.product = { id: it.productId, name: it.name || 'Product', images: it.images || [] } }
        }
      }
      if (include && include.address) {
        const addrColl = await findCollection('addresses')
        if (doc.addressId) doc.address = await addrColl.findOne({ id: doc.addressId })
      }
      return doc
    },
    async findFirst({ where, orderBy } = {}) {
      const coll = await findCollection('orders')
      const doc = await coll.findOne(where || {}, { sort: { createdAt: -1 } })
      return doc || null
    },
    async update({ where, data, include } = {}) {
      const coll = await findCollection('orders')
      await coll.updateOne(where, { $set: { ...data, updatedAt: new Date() } })
      const updated = await coll.findOne(where)
      if (include && include.orderItems) {
        if (include.orderItems.include && include.orderItems.include.product) {
          const prodColl = await findCollection('products')
          for (const it of (updated.orderItems || [])) {
            it.product = await prodColl.findOne({ id: it.productId })
          }
        }
      }
      if (include && include.address && updated.addressId) {
        const addrColl = await findCollection('addresses')
        updated.address = await addrColl.findOne({ id: updated.addressId })
      }
      return updated
    },
    async delete({ where }) {
      const coll = await findCollection('orders')
      await coll.deleteOne(where)
      return { count: 1 }
    },
    async updateMany({ where, data }) {
      const coll = await findCollection('orders')
      const res = await coll.updateMany(where || {}, { $set: data })
      return { count: res.modifiedCount }
    }
  }
}

export default mongo
