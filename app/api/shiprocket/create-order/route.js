import mongodb from '@/lib/mongodb'

// Sanitize inputs for Shiprocket API
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return 'customer@example.com'
  const cleaned = email.trim().toLowerCase()
  // Basic email validation
  if (cleaned.includes('@') && cleaned.includes('.')) return cleaned
  return 'customer@example.com'
}

function sanitizePhone(phone) {
  if (!phone) return '9999999999'
  // Remove all non-digits, keep only first 10 digits
  const cleaned = phone.toString().replace(/\D/g, '').slice(0, 10)
  // Pad with 9s if too short
  return cleaned.padEnd(10, '9')
}

function sanitizeString(str) {
  if (!str) return 'N/A'
  return String(str).trim().slice(0, 100)
}

// Cache for Shiprocket token
let cachedToken = null
let tokenExpiry = null

async function getShiprocketToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
  const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    console.warn('[Shiprocket] Credentials not configured')
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
      tokenExpiry = Date.now() + 23 * 60 * 60 * 1000 // Cache for 23 hours
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

// Create order in Shiprocket after Razorpay payment
export async function POST(req) {
  try {
    const body = await req.json()
    const { orderId, items, totalPrice, deliveryAddress, shippingCharge, userEmail, userName } = body

    console.log('[Shiprocket] 📥 Request body keys:', Object.keys(body))

    if (!orderId || !items || !deliveryAddress) {
      console.error('[Shiprocket] ❌ Missing required fields:', { 
        hasOrderId: !!orderId, 
        hasItems: !!items, 
        hasAddress: !!deliveryAddress 
      })
      return new Response(JSON.stringify({ error: 'Missing required fields: orderId, items, deliveryAddress' }), {
        status: 400
      })
    }

    // Get Shiprocket token
    const token = await getShiprocketToken()

    // If Shiprocket is not configured, don't fail the order (non-blocking)
    if (!token) {
      console.warn('[Shiprocket] No token available, order created locally without Shiprocket sync')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order created but Shiprocket integration unavailable',
          warning: 'Shiprocket credentials not configured or auth failed'
        }),
        { status: 200 }
      )
    }

    const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in'
    const SHIPROCKET_PICKUP_LOCATION_ID = process.env.SHIPROCKET_PICKUP_LOCATION_ID || '1'

    // Extract first and last name from full name
    const fullName = deliveryAddress.name || userName || 'Customer'
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || 'Customer'
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Order'

    // Prepare order data for Shiprocket
    const shiprocketOrder = {
      order_id: String(orderId).slice(0, 50),
      order_date: new Date().toISOString().split('T')[0],
      pickup_location_id: Number(SHIPROCKET_PICKUP_LOCATION_ID),
      
      // Billing Information
      billing_customer_name: sanitizeString(firstName),
      billing_last_name: sanitizeString(lastName),
      billing_email: sanitizeEmail(userEmail || deliveryAddress.email),
      billing_phone: sanitizePhone(deliveryAddress.phone),
      billing_address: sanitizeString(deliveryAddress.street || deliveryAddress.line1 || deliveryAddress.address || 'Address'),
      billing_address_2: sanitizeString(deliveryAddress.line2 || deliveryAddress.landmark || ''),
      billing_city: sanitizeString(deliveryAddress.city || 'City'),
      billing_state: sanitizeString(deliveryAddress.state || 'State'),
      billing_pincode: String(deliveryAddress.zip || '').replace(/\D/g, '').slice(0, 6),
      billing_country: 'India',
      
      // Shipping Information (same as billing for India)
      shipping_is_billing: true,
      shipping_customer_name: sanitizeString(firstName),
      shipping_last_name: sanitizeString(lastName),
      shipping_email: sanitizeEmail(userEmail || deliveryAddress.email),
      shipping_phone: sanitizePhone(deliveryAddress.phone),
      shipping_address: sanitizeString(deliveryAddress.street || deliveryAddress.line1 || deliveryAddress.address || 'Address'),
      shipping_address_2: sanitizeString(deliveryAddress.line2 || deliveryAddress.landmark || ''),
      shipping_city: sanitizeString(deliveryAddress.city || 'City'),
      shipping_state: sanitizeString(deliveryAddress.state || 'State'),
      shipping_pincode: String(deliveryAddress.zip || '').replace(/\D/g, '').slice(0, 6),
      shipping_country: 'India',
      
      // Order Items
      order_items: items.map(item => ({
        name: String(item.name || 'Product'),
        sku: String(item.productId || `SKU-${item.id}`),
        units: Number(item.quantity || 1),
        selling_price: Number(item.price || 0),
        discount: 0,
        tax: 0,
        hsn_code: '6204' // Generic product HSN code
      })),
      
      // Payment & Pricing
      payment_method: 'Prepaid',
      sub_total: Number(totalPrice || 0) - Number(shippingCharge || 0),
      shipping_charges: Number(shippingCharge || 0),
      cod_amount: 0, // Prepaid only, no COD
      
      // Package dimensions
      weight: items.reduce((sum, item) => sum + (Number(item.weight || 0.5) * Number(item.quantity || 1)), 0),
      length: 35,
      breadth: 30,
      height: 3
    }

    console.log('[Shiprocket] 🚀 Creating order:', { orderId, customerName: shiprocketOrder.billing_customer_name, itemCount: shiprocketOrder.order_items.length })
    console.log('[Shiprocket] 📋 Full payload:', JSON.stringify(shiprocketOrder, null, 2).slice(0, 1000) + '...')

    // Create order in Shiprocket
    const createRes = await fetch(`${SHIPROCKET_BASE_URL}/v1/external/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shiprocketOrder)
    })

    const createData = await createRes.json()
    console.log('[Shiprocket] 📨 HTTP Status:', createRes.status)
    console.log('[Shiprocket] 📦 Response:', JSON.stringify(createData, null, 2).slice(0, 1000) + '...')

    // Handle both response formats from Shiprocket
    if (createData && (createData.status_code === 1 || createData.success === true)) {
      const shiprocketOrderId = createData.data?.order_id || createData.order_id || String(orderId)
      const shipmentData = createData.data?.shipments?.[0] || createData.shipments?.[0]
      const awbCode = shipmentData?.awb_code || shipmentData?.awb || null

      console.log('[Shiprocket] ✅ Order created with ID:', shiprocketOrderId, '| AWB:', awbCode || 'Pending')

      // Save Shiprocket details to order in MongoDB
      try {
        const updateData = {
          shiprocket_order_id: shiprocketOrderId,
          shiprocket_status: 'pending'
        }

        if (awbCode) {
          updateData.shiprocket_awb = awbCode
        }

        // Update order with Shiprocket details
        await mongodb.order.update(orderId, updateData)
        console.log('[Shiprocket] ✅ Order details saved to MongoDB')
      } catch (dbErr) {
        console.warn('[Shiprocket] ⚠️ Could not save Shiprocket details to MongoDB:', dbErr.message)
        // Don't fail if DB update fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order created in Shiprocket successfully',
          shiprocket_order_id: shiprocketOrderId,
          awb_code: awbCode,
          shipments: createData.data?.shipments || []
        }),
        { status: 201 }
      )
    } else {
      // Shiprocket returned an error but order was created locally
      const errorMsg = createData.message || createData.error || 'Unknown Shiprocket error'
      const errors = createData.errors || createData.error_details || []
      console.error('[Shiprocket] ❌ Order creation failed:', errorMsg)
      console.error('[Shiprocket] ❌ Error details:', errors)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order created locally but Shiprocket sync failed',
          warning: errorMsg,
          shiprocket_error: errors,
          note: 'Order is confirmed in our system. Shipping will be created manually or retried.'
        }),
        { status: 200 }
      )
    }
  } catch (err) {
    console.error('[Shiprocket] Order creation error:', err.message)

    // Non-blocking failure: order is already confirmed in local system
    // Shiprocket creation is secondary and can be retried
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order created locally but Shiprocket integration failed',
        warning: `Shiprocket error: ${err.message}`,
        note: 'Order is confirmed. Shipping will be created manually or via retry.'
      }),
      { status: 200 }
    )
  }
}
