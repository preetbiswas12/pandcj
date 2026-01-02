import mongodb from '@/lib/mongodb'

// Cache for Shiprocket token to avoid repeated auth calls
let cachedToken = null
let tokenExpiry = null

async function getShiprocketToken() {
  // Return cached token if still valid (expires in ~24 hours)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('[Shiprocket] Using cached token')
    return cachedToken
  }

  const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
  const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    console.error('[Shiprocket] ❌ Credentials missing: EMAIL or PASSWORD not in .env')
    return null
  }

  try {
    console.log('[Shiprocket] 🔐 Authenticating with email:', SHIPROCKET_EMAIL)
    
    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
      })
    })

    const authData = await authRes.json()

    if (authData.token) {
      cachedToken = authData.token
      tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
      console.log('[Shiprocket] ✅ Token obtained successfully (cached for 23 hours)')
      return authData.token
    } else {
      console.error('[Shiprocket] ❌ Auth failed:', authData.message || 'Unknown error')
      console.error('[Shiprocket] Response:', authData)
      return null
    }
  } catch (err) {
    console.error('[Shiprocket] ❌ Token fetch error:', err.message)
    return null
  }
}

// Calculate shipping charges from Shiprocket ONLY
export async function POST(req) {
  try {
    const body = await req.json()
    const { items, deliveryAddress, coupon } = body

    console.log('[Shiprocket] 📦 Calculating charges for PIN:', deliveryAddress?.zip)

    // Validate inputs
    if (!deliveryAddress || !deliveryAddress.zip) {
      console.error('[Shiprocket] ❌ Missing delivery address or PIN')
      return new Response(
        JSON.stringify({ 
          error: 'Delivery address with PIN code required',
          shippingCharge: null 
        }),
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      console.error('[Shiprocket] ❌ No items provided')
      return new Response(
        JSON.stringify({ 
          error: 'Items required',
          shippingCharge: null 
        }),
        { status: 400 }
      )
    }

    // Get Shiprocket token
    const token = await getShiprocketToken()
    if (!token) {
      console.error('[Shiprocket] ❌ Could not obtain authentication token')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed - check credentials in .env',
          shippingCharge: null 
        }),
        { status: 401 }
      )
    }

    // Calculate total weight
    const totalWeight = items.reduce((sum, item) => {
      return sum + (Number(item.weight || 0.5) * Number(item.quantity || 1))
    }, 0)

    const pinCode = String(deliveryAddress.zip)
    const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in'
    const PICKUP_PIN = process.env.SHIPROCKET_PICKUP_PIN || '110001'

    console.log('[Shiprocket] 📍 From:', PICKUP_PIN, '→ To:', pinCode, '| Weight:', totalWeight, 'kg')

    // Call Shiprocket Rates API - try POST first (more reliable)
    try {
      const ratesUrl = `${SHIPROCKET_BASE_URL}/v1/external/courier/serviceability/`
      
      const requestPayload = {
        pickup_postcode: PICKUP_PIN,
        delivery_postcode: pinCode,
        cod: 0,
        weight: totalWeight
      }
      
      console.log('[Shiprocket] 🔗 Calling API (POST):', ratesUrl)
      console.log('[Shiprocket] 📤 Request payload:', JSON.stringify(requestPayload, null, 2))

      const ratesRes = await fetch(ratesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      })

      const ratesData = await ratesRes.json()

      console.log('[Shiprocket] 📨 API Response Status:', ratesRes.status)
      console.log('[Shiprocket] 📨 Full Response:', JSON.stringify(ratesData, null, 2))

      // Check if we got valid rates - Shiprocket structure: data.available_courier_companies
      const couriers = ratesData.data?.available_courier_companies || []
      console.log('[Shiprocket] 📊 Available couriers:', couriers.length)
      
      if (ratesRes.status === 200 && Array.isArray(couriers) && couriers.length > 0) {
        // Get the first (cheapest/recommended) courier option
        const bestRate = couriers[0]
        console.log('[Shiprocket] 📊 Best rate object keys:', Object.keys(bestRate))
        console.log('[Shiprocket] 📊 Best rate full:', JSON.stringify(bestRate, null, 2))
        
        // Try multiple field names for the rate
        const shippingCharge = Number(
          bestRate.rate || 
          bestRate.rating || 
          bestRate.freight_charge || 
          bestRate.total_charge || 
          bestRate.charges || 
          0
        )
        const estimatedDays = Number(bestRate.estimated_delivery_days || bestRate.delivery_days || 3)
        
        console.log('[Shiprocket] 💰 Extracted charge:', shippingCharge, 'Days:', estimatedDays)

        if (!shippingCharge || shippingCharge === 0) {
          console.error('[Shiprocket] ❌ Invalid rate received - all charge fields were 0 or missing')
          console.error('[Shiprocket] ❌ Available fields:', bestRate)
          return new Response(
            JSON.stringify({ 
              error: 'Shipping charge could not be extracted from courier response',
              shippingCharge: null,
              debug: { bestRate }
            }),
            { status: 400 }
          )
        }

        // Apply coupon discount to shipping if applicable
        let finalCharge = shippingCharge
        if (coupon && coupon.applyToShipping && coupon.discount) {
          const discount = (shippingCharge * Number(coupon.discount)) / 100
          finalCharge = Math.max(0, shippingCharge - discount)
        }

        console.log('[Shiprocket] ✅ Charge calculated: ₹' + finalCharge + ' (estimated ' + estimatedDays + ' days)')

        return new Response(
          JSON.stringify({
            shippingCharge: Math.round(finalCharge),
            estimatedDays,
            message: 'Shipping charge from Shiprocket'
          }),
          { status: 200 }
        )
      } else {
        console.error('[Shiprocket] ❌ No rates found')
        console.error('[Shiprocket] Status:', ratesRes.status)
        console.error('[Shiprocket] Couriers available:', couriers.length)
        console.error('[Shiprocket] Full response status field:', ratesData.status)
        console.error('[Shiprocket] Error:', ratesData.message || ratesData.errors)
        
        // Build error message - avoid using raw status codes
        let errorMsg = 'Shipping not available for this location'
        if (ratesData.message && ratesData.message !== 'undefined' && !/^\d+$/.test(String(ratesData.message))) {
          errorMsg = ratesData.message
        } else if (ratesData.errors && ratesData.errors !== 'undefined' && !/^\d+$/.test(String(ratesData.errors))) {
          errorMsg = ratesData.errors
        }
        
        return new Response(
          JSON.stringify({ 
            error: errorMsg,
            shippingCharge: null,
            details: {
              status: ratesRes.status,
              couriersFound: couriers.length,
              message: ratesData.message,
              errors: ratesData.errors
            }
          }),
          { status: 400 }
        )
      }

    } catch (shiprocketErr) {
      console.error('[Shiprocket] ❌ API call failed:', shiprocketErr.message)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch shipping rates: ' + shiprocketErr.message,
          shippingCharge: null 
        }),
        { status: 500 }
      )
    }

  } catch (err) {
    console.error('[Shiprocket] ❌ Unexpected error:', err.message)
    return new Response(
      JSON.stringify({
        error: 'Server error: ' + err.message,
        shippingCharge: null
      }),
      { status: 500 }
    )
  }
}
