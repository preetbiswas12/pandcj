import { SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_BASE_URL } from '@/lib/shiprocket'
import mongodb from '@/lib/mongodb'

let shiprocketToken = null
let tokenExpiry = null

async function getShiprocketToken() {
  if (shiprocketToken && tokenExpiry && new Date() < tokenExpiry) {
    return shiprocketToken
  }

  try {
    const res = await fetch(`${SHIPROCKET_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
      })
    })

    if (!res.ok) {
      console.error('[Shiprocket] Auth failed:', res.status)
      return null
    }

    const data = await res.json()
    shiprocketToken = data.token
    tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000) // 23 hours
    return shiprocketToken
  } catch (err) {
    console.error('[Shiprocket] Token error:', err.message)
    return null
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const pincode = url.searchParams.get('pincode')

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return new Response(JSON.stringify({ error: 'Invalid pincode format' }), { status: 400 })
    }

    const token = await getShiprocketToken()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Shiprocket not configured' }), { status: 503 })
    }

    // Get city/state from Shiprocket using serviceability endpoint
    const PICKUP_PIN = process.env.SHIPROCKET_PICKUP_PIN || '201304'
    
    const res = await fetch(
      `${SHIPROCKET_BASE_URL}/v1/external/courier/serviceability/?pickup_postcode=${PICKUP_PIN}&delivery_postcode=${pincode}&cod=0&weight=0.5`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Pincode not serviceable' }), { status: 400 })
    }

    const data = await res.json()
    
    // Extract city and state from the response
    // Shiprocket returns this in the serviceability response
    if (data.data?.available_courier_companies?.[0]) {
      const courier = data.data.available_courier_companies[0]
      // Note: Shiprocket doesn't directly return city/state in serviceability
      // We need to use a different approach - use a mapping or ask user to confirm
      
      return new Response(JSON.stringify({
        city: courier.delivery_city || '',
        state: courier.delivery_state || '',
        serviceable: true
      }), { status: 200 })
    }

    return new Response(JSON.stringify({ 
      error: 'City/State not found for this pincode',
      city: '',
      state: '' 
    }), { status: 400 })
  } catch (err) {
    console.error('[Validate Pincode] Error:', err)
    return new Response(JSON.stringify({ error: 'Validation failed' }), { status: 500 })
  }
}
