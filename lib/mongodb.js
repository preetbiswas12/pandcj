import { MongoClient, ObjectId } from 'mongodb'
import { randomUUID } from 'crypto'

const MONGO_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB || 'gocart'

// Global client for reuse across requests
const globalForMongo = globalThis

async function getMongoClient() {
  if (!MONGO_URI) throw new Error('MONGODB_URI not configured')
  
  if (globalForMongo._mongoClient && globalForMongo._mongoClient.topology) {
    try {
      await globalForMongo._mongoClient.db('admin').command({ ping: 1 })
      return globalForMongo._mongoClient
    } catch (e) {
      // Connection dead, recreate
      globalForMongo._mongoClient = null
    }
  }

  const client = new MongoClient(MONGO_URI)
  await client.connect()
  globalForMongo._mongoClient = client
  return client
}

async function getDB() {
  const client = await getMongoClient()
  return client.db(DB_NAME)
}

async function getCollection(name) {
  const db = await getDB()
  return db.collection(name)
}

export const mongodb = {
  // Store operations
  store: {
    async create(data) {
      const coll = await getCollection('stores')
      const id = data.id || randomUUID()
      const doc = {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const result = await coll.insertOne(doc)
      return { ...doc, _id: result.insertedId }
    },

    async findById(id) {
      const coll = await getCollection('stores')
      return await coll.findOne({ id })
    },

    async findByUserId(userId) {
      const coll = await getCollection('stores')
      return await coll.findOne({ userId })
    },

    async findMany(filter = {}, limit = 100) {
      const coll = await getCollection('stores')
      return await coll.find(filter).limit(limit).sort({ createdAt: -1 }).toArray()
    },

    async update(id, data) {
      const coll = await getCollection('stores')
      const result = await coll.findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async delete(id) {
      const coll = await getCollection('stores')
      const result = await coll.deleteOne({ id })
      return result.deletedCount > 0
    },

    async upsertMany(stores) {
      const coll = await getCollection('stores')
      const ops = stores.map(store => ({
        updateOne: {
          filter: { id: store.id },
          update: { $set: { ...store, updatedAt: new Date() } },
          upsert: true,
        },
      }))
      const result = await coll.bulkWrite(ops)
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount }
    },
  },

  // Product operations
  product: {
    async create(data) {
      const coll = await getCollection('products')
      const id = data.id || randomUUID()
      const doc = {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const result = await coll.insertOne(doc)
      return { ...doc, _id: result.insertedId }
    },

    async findById(id) {
      const coll = await getCollection('products')
      return await coll.findOne({ id })
    },

    async findByStoreId(storeId, limit = 100) {
      const coll = await getCollection('products')
      return await coll.find({ storeId }).limit(limit).sort({ createdAt: -1 }).toArray()
    },

    async findMany(filter = {}, limit = 100, skip = 0) {
      const coll = await getCollection('products')
      return await coll
        .find(filter)
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .toArray()
    },

    async findByCategory(category, limit = 100) {
      const coll = await getCollection('products')
      return await coll
        .find({ category })
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray()
    },

    async search(query, limit = 100) {
      const coll = await getCollection('products')
      const regex = new RegExp(query, 'i')
      return await coll
        .find({ $or: [{ name: regex }, { description: regex }] })
        .limit(limit)
        .toArray()
    },

    async update(id, data) {
      const coll = await getCollection('products')
      const result = await coll.findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async delete(id) {
      const coll = await getCollection('products')
      const result = await coll.deleteOne({ id })
      return result.deletedCount > 0
    },

    async upsertMany(products) {
      const coll = await getCollection('products')
      const ops = products.map(product => ({
        updateOne: {
          filter: { id: product.id },
          update: { $set: { ...product, updatedAt: new Date() } },
          upsert: true,
        },
      }))
      const result = await coll.bulkWrite(ops)
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount }
    },
  },

  // Order operations
  order: {
    async create(data) {
      const coll = await getCollection('orders')
      const id = data.id || randomUUID()
      const doc = {
        id,
        ...data,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const result = await coll.insertOne(doc)
      return { ...doc, _id: result.insertedId }
    },

    async findById(id) {
      const coll = await getCollection('orders')
      return await coll.findOne({ id })
    },

    async findByUserId(userId, limit = 100) {
      const coll = await getCollection('orders')
      return await coll.find({ userId }).limit(limit).sort({ createdAt: -1 }).toArray()
    },

    async findByStoreId(storeId, limit = 100) {
      const coll = await getCollection('orders')
      return await coll.find({ items: { $elemMatch: { storeId } } }).limit(limit).sort({ createdAt: -1 }).toArray()
    },

    async findMany(filter = {}, limit = 100) {
      const coll = await getCollection('orders')
      return await coll.find(filter).limit(limit).sort({ createdAt: -1 }).toArray()
    },

    async update(id, data) {
      const coll = await getCollection('orders')
      const result = await coll.findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async updateStatus(id, status) {
      const coll = await getCollection('orders')
      const result = await coll.findOneAndUpdate(
        { id },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async delete(id) {
      const coll = await getCollection('orders')
      const result = await coll.deleteOne({ id })
      return result.deletedCount > 0
    },

    async countByStatus(status) {
      const coll = await getCollection('orders')
      return await coll.countDocuments({ status })
    },

    async upsertMany(orders) {
      const coll = await getCollection('orders')
      const ops = orders.map(order => ({
        updateOne: {
          filter: { id: order.id },
          update: { $set: { ...order, updatedAt: new Date() } },
          upsert: true,
        },
      }))
      const result = await coll.bulkWrite(ops)
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount }
    },
  },

  // Newsletter operations
  newsletter: {
    async subscribe(email) {
      const coll = await getCollection('newsletters')
      const result = await coll.findOneAndUpdate(
        { email },
        { $set: { email, subscribed: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      )
      return result.value
    },

    async unsubscribe(email) {
      const coll = await getCollection('newsletters')
      const result = await coll.findOneAndUpdate(
        { email },
        { $set: { subscribed: false, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async findByEmail(email) {
      const coll = await getCollection('newsletters')
      return await coll.findOne({ email })
    },

    async findMany(filter = {}, limit = 1000) {
      const coll = await getCollection('newsletters')
      return await coll.find(filter).limit(limit).sort({ createdAt: -1 }).toArray()
    },

    async getSubscribed(limit = 1000) {
      const coll = await getCollection('newsletters')
      return await coll.find({ subscribed: true }).limit(limit).toArray()
    },

    async delete(email) {
      const coll = await getCollection('newsletters')
      const result = await coll.deleteOne({ email })
      return result.deletedCount > 0
    },

    async upsertMany(emails) {
      const coll = await getCollection('newsletters')
      const ops = emails.map(email => ({
        updateOne: {
          filter: { email },
          update: { $set: { email, subscribed: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      }))
      const result = await coll.bulkWrite(ops)
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount }
    },
  },

  // Coupon operations
  coupon: {
    async create(data) {
      const coll = await getCollection('coupons')
      const doc = {
        code: data.code.toUpperCase(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const result = await coll.insertOne(doc)
      return { ...doc, _id: result.insertedId }
    },

    async findByCode(code) {
      const coll = await getCollection('coupons')
      return await coll.findOne({ code: code.toUpperCase() })
    },

    async findMany(filter = {}, limit = 100) {
      const coll = await getCollection('coupons')
      return await coll.find(filter).limit(limit).sort({ createdAt: -1 }).toArray()
    },

    async update(code, data) {
      const coll = await getCollection('coupons')
      const result = await coll.findOneAndUpdate(
        { code: code.toUpperCase() },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async delete(code) {
      const coll = await getCollection('coupons')
      const result = await coll.deleteOne({ code: code.toUpperCase() })
      return result.deletedCount > 0
    },

    async incrementUsage(code) {
      const coll = await getCollection('coupons')
      const result = await coll.findOneAndUpdate(
        { code: code.toUpperCase() },
        { $inc: { usedCount: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async upsertMany(coupons) {
      const coll = await getCollection('coupons')
      const ops = coupons.map(coupon => ({
        updateOne: {
          filter: { code: coupon.code.toUpperCase() },
          update: { $set: { ...coupon, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      }))
      const result = await coll.bulkWrite(ops)
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount }
    },
  },

  // Settings/Config operations
  setting: {
    async get(key) {
      const coll = await getCollection('settings')
      return await coll.findOne({ key })
    },

    async set(key, value) {
      const coll = await getCollection('settings')
      const result = await coll.findOneAndUpdate(
        { key },
        { $set: { key, value, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      )
      return result.value
    },

    async delete(key) {
      const coll = await getCollection('settings')
      const result = await coll.deleteOne({ key })
      return result.deletedCount > 0
    },
  },

  // User operations
  user: {
    async create(data) {
      const coll = await getCollection('users')
      const id = data.id || randomUUID()
      const doc = {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const result = await coll.insertOne(doc)
      return { ...doc, _id: result.insertedId }
    },

    async findById(id) {
      const coll = await getCollection('users')
      return await coll.findOne({ id })
    },

    async findByEmail(email) {
      const coll = await getCollection('users')
      return await coll.findOne({ email })
    },

    async update(id, data) {
      const coll = await getCollection('users')
      const result = await coll.findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
      return result.value
    },

    async upsert(id, data) {
      const coll = await getCollection('users')
      const result = await coll.findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() }, $setOnInsert: { id, createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      )
      return result.value
    },
  },
}

export default mongodb
