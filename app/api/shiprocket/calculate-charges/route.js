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

    // Get Shiprocket token to verify PIN serviceability
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

    const pinCode = String(deliveryAddress.zip)
    const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in'
    const PICKUP_PIN = process.env.SHIPROCKET_PICKUP_PIN || '110001'
    const SINGLE_ITEM_WEIGHT = Number(process.env.SINGLE_ITEM_WEIGHT || 0.5) // Weight of 1 item for shipping calculation

    console.log('[Shiprocket] 📍 From:', PICKUP_PIN, '→ To:', pinCode, '| Weight: ' + SINGLE_ITEM_WEIGHT + ' kg (single item)')

    // Call Shiprocket to check serviceability and get rate for 1 item weight (NOT total cart weight)
    try {
      const ratesUrl = `${SHIPROCKET_BASE_URL}/v1/external/courier/serviceability/?pickup_postcode=${PICKUP_PIN}&delivery_postcode=${pinCode}&cod=0&weight=${SINGLE_ITEM_WEIGHT}`
      
      console.log('[Shiprocket] 🔗 Checking rates for PIN:', pinCode, 'with weight:', SINGLE_ITEM_WEIGHT, 'kg')

      const ratesRes = await fetch(ratesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const ratesData = await ratesRes.json()

      console.log('[Shiprocket] 📨 API Response Status:', ratesRes.status)

      // Check if we got valid rates - Shiprocket structure: data.available_courier_companies
      const couriers = ratesData.data?.available_courier_companies || []
      console.log('[Shiprocket] 📊 Available couriers:', couriers.length)
      
      if (ratesRes.status === 200 && Array.isArray(couriers) && couriers.length > 0) {
        // Get the best rate for this PIN
        const bestRate = couriers[0]
        const estimatedDays = Number(bestRate.estimated_delivery_days || 2)
        
        // Extract the actual shipping charge from Shiprocket for 1 item
        const shippingCharge = Number(bestRate.freight_charge || bestRate.rate || 0)
        
        console.log('[Shiprocket] 📊 Best rate for PIN', pinCode + ':', '₹' + shippingCharge)
        console.log('[Shiprocket] ✅ PIN is serviceable. Delivery days:', estimatedDays)

        if (!shippingCharge || shippingCharge === 0) {
          console.error('[Shiprocket] ❌ Invalid rate received')
          return new Response(
            JSON.stringify({ 
              error: 'Could not extract shipping rate for PIN ' + pinCode,
              shippingCharge: null
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

        console.log('[Shiprocket] ✅ Final shipping charge: ₹' + finalCharge + ' (for PIN ' + pinCode + ', estimated ' + estimatedDays + ' days)')

        return new Response(
          JSON.stringify({
            shippingCharge: Math.round(finalCharge),
            estimatedDays,
            message: 'Shipping charge for PIN ' + pinCode
          }),
          { status: 200 }
        )
      } else {
        console.error('[Shiprocket] ❌ PIN not serviceable')
        console.error('[Shiprocket] Status:', ratesRes.status)
        console.error('[Shiprocket] Couriers available:', couriers.length)
        
        return new Response(
          JSON.stringify({ 
            error: 'Shipping not available for PIN ' + pinCode,
            shippingCharge: null
          }),
          { status: 400 }
        )
      }

    } catch (shiprocketErr) {
      console.error('[Shiprocket] ❌ API call failed:', shiprocketErr.message)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify delivery PIN: ' + shiprocketErr.message,
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
