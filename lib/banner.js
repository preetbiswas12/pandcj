import mongodb from './mongodb'
 import { globalCache, CACHE_KEYS } from './cache'

export async function getBanner() {
  try {
    const setting = await mongodb.setting.get('banner')
    return setting ? setting.value : null
  } catch (e) {
    console.warn('Banner DB read failed', e?.message || e)
    return null
  }
}

export async function saveBanner(obj) {
  try {
    const result = await mongodb.setting.set('banner', obj)
    // Clear cache so next fetch gets fresh data
    globalCache.clear(CACHE_KEYS.BANNER_SETTINGS)
    return { ok: true, provider: 'db', result }
  } catch (e) {
    console.error('Banner save failed', e?.message || e)
    return { ok: false, error: e?.message || e }
  }
}
