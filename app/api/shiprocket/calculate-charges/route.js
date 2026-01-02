import mongodb from '@/lib/mongodb'

// Cache for Shiprocket token to avoid repeated auth calls
let cachedToken = null
let tokenExpiry = null

async function getShiprocketToken() {
  // Return cached token if still valid (expires in ~24 hours)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
  const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    console.warn('Shiprocket credentials not configured')
    return null
  }

  try {
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
      // Cache token for 23 hours (1 hour before typical 24-hour expiry)
      tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
      console.log('[Shiprocket] Token obtained and cached')
      return authData.token
    } else {
      console.warn('[Shiprocket] Auth failed:', authData.message || 'Unknown error')
      return null
    }
  } catch (err) {
    console.error('[Shiprocket] Token fetch error:', err.message)
    return null
  }
}

// Calculate shipping charges from Shiprocket
export async function POST(req) {
  try {
    const body = await req.json()
    const { items, deliveryAddress, coupon } = body

    if (!deliveryAddress || !deliveryAddress.zip) {
      return new Response(
        JSON.stringify({ error: 'Delivery address with PIN code required', shippingCharge: 0 }),
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Items required', shippingCharge: 0 }), { status: 400 })
    }

    const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in'

    // Try to get Shiprocket token
    const token = await getShiprocketToken()

    if (!token) {
      console.warn('[Shiprocket] No token available, using fallback pricing')
      // Use fallback pricing
      let shippingCharge = 60
      const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight || 0.5) * Number(item.quantity || 1)), 0)
      shippingCharge += Math.ceil(totalWeight / 0.5) * 20

      const pinCode = String(deliveryAddress.zip)
      const firstDigit = pinCode.charAt(0)
      if (firstDigit === '1') {
        shippingCharge += 0
      } else if (['2', '3', '4', '5'].includes(firstDigit)) {
        shippingCharge += 30
      } else if (['6', '7', '8', '9'].includes(firstDigit)) {
        shippingCharge += 60
      } else {
        shippingCharge += 40
      }

      let finalCharge = shippingCharge
      if (coupon && coupon.applyToShipping && coupon.discount) {
        const discount = (shippingCharge * Number(coupon.discount)) / 100
        finalCharge = Math.max(0, shippingCharge - discount)
      }

      return new Response(
        JSON.stringify({
          shippingCharge: Math.round(finalCharge),
          estimatedDays: 3,
          courier: 'Standard Delivery',
          message: 'Shipping charge calculated (fallback - Shiprocket unavailable)'
        }),
        { status: 200 }
      )
    }

    // Calculate total weight
    const totalWeight = items.reduce((sum, item) => {
      return sum + (Number(item.weight || 0.5) * Number(item.quantity || 1))
    }, 0)

    const pinCode = String(deliveryAddress.zip)

    // Call Shiprocket Rates API to get accurate shipping charges
    try {
      const ratesRes = await fetch(`${SHIPROCKET_BASE_URL}/v1/external/courier/serviceability/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickup_postcode: process.env.SHIPROCKET_PICKUP_PIN || '110001',
          delivery_postcode: pinCode,
          cod: 0, // No Cash on Delivery (prepaid only)
          weight: totalWeight
        })
      })

      const ratesData = await ratesRes.json()

      // If API call succeeds, use the rates
      if (ratesData && Array.isArray(ratesData.data) && ratesData.data.length > 0) {
        // Get the cheapest courier option
        const bestRate = ratesData.data[0]
        const shippingCharge = Number(bestRate.rate || 100)
        const estimatedDays = Number(bestRate.estimated_delivery_days || 3)
        const courier = bestRate.courier_name || 'Standard Delivery'

        // Apply coupon discount to shipping if applicable
        let finalCharge = shippingCharge
        if (coupon && coupon.applyToShipping) {
          const discount = (shippingCharge * Number(coupon.discount)) / 100
          finalCharge = Math.max(0, shippingCharge - discount)
        }

        console.log(`[Shiprocket] Rates calculated for PIN ${pinCode}: ₹${shippingCharge}`)

        return new Response(
          JSON.stringify({
            shippingCharge: Math.round(finalCharge),
            estimatedDays,
            courier,
            message: 'Shipping charge calculated from Shiprocket'
          }),
          { status: 200 }
        )
      }
    } catch (shiprocketErr) {
      console.warn('[Shiprocket] Rates API call failed, using fallback pricing:', shiprocketErr.message)
      // Continue with fallback calculation
    }

    // FALLBACK: Calculate shipping based on pincode & weight
    let shippingCharge = 60 // Base charge in INR

    // Weight-based charge (₹20 per 500g)
    shippingCharge += Math.ceil(totalWeight / 0.5) * 20

    // Add zone-based charges
    const firstDigit = pinCode.charAt(0)
    if (firstDigit === '1') {
      // Delhi NCR
      shippingCharge += 0
    } else if (['2', '3', '4', '5'].includes(firstDigit)) {
      // Tier 1 cities (Mumbai, Bangalore, etc.)
      shippingCharge += 30
    } else if (['6', '7', '8', '9'].includes(firstDigit)) {
      // Tier 2 cities & remote areas
      shippingCharge += 60
    } else {
      shippingCharge += 40
    }

    // Apply coupon discount if applicable
    let finalCharge = shippingCharge
    if (coupon && coupon.applyToShipping && coupon.discount) {
      const discount = (shippingCharge * Number(coupon.discount)) / 100
      finalCharge = Math.max(0, shippingCharge - discount)
    }

    return new Response(
      JSON.stringify({
        shippingCharge: Math.round(finalCharge),
        estimatedDays: 3,
        courier: 'Standard Delivery',
        message: 'Shipping charge calculated (fallback)'
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('[Shiprocket] Shipping charge calculation error:', err)
    // Return default shipping charge on error (non-blocking failure)
    return new Response(
      JSON.stringify({
        shippingCharge: 100,
        estimatedDays: 3,
        courier: 'Standard Delivery',
        message: 'Error calculating charges, using default'
      }),
      { status: 200 }
    )
  }
}
