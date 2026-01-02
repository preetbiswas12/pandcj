import mongodb from '@/lib/mongodb'

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

    if (!orderId || !items || !deliveryAddress) {
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

    // Prepare order data for Shiprocket
    const shiprocketOrder = {
      order_id: String(orderId),
      order_date: new Date().toISOString().split('T')[0],
      pickup_location_id: Number(SHIPROCKET_PICKUP_LOCATION_ID),
      
      // Billing Information
      billing_customer_name: deliveryAddress.name || userName || 'Customer',
      billing_email: userEmail || deliveryAddress.email || 'customer@example.com',
      billing_phone: deliveryAddress.phone || '9999999999',
      billing_address: deliveryAddress.line1 || deliveryAddress.address || 'Address',
      billing_address_2: deliveryAddress.line2 || '',
      billing_city: deliveryAddress.city || '',
      billing_state: deliveryAddress.state || '',
      billing_pincode: String(deliveryAddress.zip || ''),
      billing_country: 'India',
      
      // Shipping Information (same as billing for India)
      shipping_is_billing: true,
      shipping_customer_name: deliveryAddress.name || userName || 'Customer',
      shipping_email: userEmail || deliveryAddress.email || 'customer@example.com',
      shipping_phone: deliveryAddress.phone || '9999999999',
      shipping_address: deliveryAddress.line1 || deliveryAddress.address || 'Address',
      shipping_address_2: deliveryAddress.line2 || '',
      shipping_city: deliveryAddress.city || '',
      shipping_state: deliveryAddress.state || '',
      shipping_pincode: String(deliveryAddress.zip || ''),
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
      
      // Package dimensions (default)
      weight: items.reduce((sum, item) => sum + (Number(item.weight || 0.5) * Number(item.quantity || 1)), 0),
      length: 10,
      breadth: 10,
      height: 10
    }

    console.log('[Shiprocket] Creating order:', { orderId, customerName: shiprocketOrder.billing_customer_name })

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
    console.log('[Shiprocket] Response:', JSON.stringify(createData).slice(0, 500))

    // Handle both response formats from Shiprocket
    if (createData && (createData.status_code === 1 || createData.success === true)) {
      const shiprocketOrderId = createData.data?.order_id || createData.order_id || String(orderId)
      const shipmentData = createData.data?.shipments?.[0] || createData.shipments?.[0]
      const awbCode = shipmentData?.awb_code || shipmentData?.awb || null

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
        console.log('[Shiprocket] Order details saved to MongoDB')
      } catch (dbErr) {
        console.warn('[Shiprocket] Could not save Shiprocket details to MongoDB:', dbErr.message)
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
      console.warn('[Shiprocket] Order creation failed:', errorMsg)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order created locally but Shiprocket sync failed',
          warning: errorMsg,
          shiprocket_error: createData.errors || createData.error
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
