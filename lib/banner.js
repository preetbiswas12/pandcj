import mongodb from './mongodb'

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
    return { ok: true, provider: 'db', result }
  } catch (e) {
    console.error('Banner save failed', e?.message || e)
    return { ok: false, error: e?.message || e }
  }
}
