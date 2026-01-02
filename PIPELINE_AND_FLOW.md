# GoCart Order Pipeline & Flow Documentation

## 1. HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER BROWSER                            │
│              (OrderSummary Component - React/Redux)                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                              │
│  /api/orders/create-pending                                         │
│  /api/payments/razorpay/create                                      │
│  /api/payments/razorpay/verify                                      │
│  /api/orders/expire                                                 │
│  /api/orders (POST/GET/PUT)                                         │
│  /api/shiprocket/calculate-shipping (TO BE CREATED)                │
│  /api/shiprocket/create-order (TO BE CREATED)                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                              │
│  • MongoDB (Order persistence)                                       │
│  • Razorpay (Payment processing)                                    │
│  • Shiprocket (Shipping & logistics) - TO BE INTEGRATED             │
│  • Cloudinary (Image storage)                                       │
│  • Clerk (Authentication)                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. COMPLETE ORDER FLOW WITH TIMEOUTS

### **SCENARIO A: COD (Cash on Delivery)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER INTERFACE - OrderSummary.jsx                                       │
├─────────────────────────────────────────────────────────────────────────┤

1. USER SELECTS:
   - Address (from Redux state.address.list)
   - Items (from Redux state.cart)
   - Payment Method: "COD"
   - Coupon (optional)
   
2. CLICK "PLACE ORDER"
   └─> Call handlePlaceOrder(event)
       ├─ Validate authentication (Clerk)
       ├─ Validate address selected
       ├─ Validate no out-of-stock items
       └─ Build payload:
          {
            items: [{ productId, quantity, price, name, images, storeId }],
            total: totalPrice + shippingCharge,
            shippingCharge: 0 (for COD, no calc in current impl),
            address: selectedAddress,
            paymentMethod: "COD",
            userId: user.id,
            couponCode?: "ABC123"
          }

3. POST /api/orders (line 130 of OrderSummary.jsx)
   └─> Endpoint: app/api/orders/route.js
       
       PROCESSING:
       a) Enrich items with product details from MongoDB
       b) Create/upsert user in MongoDB if not exists
       c) Apply coupon discount (if valid & not expired)
       d) Create order document:
          {
            id: uuid,
            userId: user.id,
            items: enrichedItems,
            total: totalPrice,
            discountAmount: 0,
            finalTotal: totalPrice,
            address: address,
            paymentMethod: "COD",
            status: "pending" (becomes "confirmed" after payment)
          }
       e) Save to MongoDB orders collection
       f) Return: { id, items, total, ... }

4. FRONTEND RESPONSE HANDLING
   ├─ dispatch(clearCart()) → Clear Redux cart state
   ├─ toast.success("Order placed")
   └─ router.push('/orders') → Navigate to orders page

5. DATABASE STATE
   └─> MongoDB orders collection:
       {
         "_id": ObjectId,
         "id": "uuid-1234",
         "userId": "clerk-user-id",
         "items": [ enriched products with storeId ],
         "total": 4500,
         "address": { name, phone, city, state, zip },
         "paymentMethod": "COD",
         "status": "pending",
         "createdAt": ISODate
       }

6. REAL-TIME NOTIFICATIONS (SSE)
   └─> /api/orders/stream (listening stores)
       └─> All stores receive notification:
           event: "new_order"
           data: { orderId, items, totalAmount, address }

⏱️ TIMELINE: ~1-3 seconds total
```

---

### **SCENARIO B: RAZORPAY (Online Payment)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER INTERFACE - OrderSummary.jsx                                       │
├─────────────────────────────────────────────────────────────────────────┤

1. USER SELECTS:
   - Address
   - Items
   - Payment Method: "RAZORPAY"
   
2. CLICK "PLACE ORDER"
   └─> Call handlePlaceOrder(event)
       └─> Build payload (same as COD)
           {
             items: [...],
             total: totalPrice + shippingCharge,
             shippingCharge: 0,
             address: selectedAddress,
             paymentMethod: "RAZORPAY",
             userId: user.id
           }

3. CREATE PENDING ORDER (line 97)
   ┌──> POST /api/orders/create-pending
   │    └─> Endpoint: app/api/orders/create-pending/route.js
   │        
   │        PROCESSING:
   │        a) Create temporary order with:
   │           - status: "pending"
   │           - expiresAt: NOW + 10 minutes
   │           - Items saved WITHOUT enrichment
   │        b) Save to MongoDB
   │        c) Return: { localOrderId: "uuid" }
   │
   │    ⏱️ ~500ms
   │
   └── RESPONSE: { localOrderId }

4. LOAD RAZORPAY SCRIPT (line 101)
   └─> loadRazorpayScript()
       └─> Dynamically load https://checkout.razorpay.com/v1/checkout.js

5. CREATE RAZORPAY PAYMENT ORDER (line 102)
   ┌──> POST /api/payments/razorpay/create
   │    └─> Endpoint: app/api/payments/razorpay/create/route.js
   │        
   │        PROCESSING:
   │        a) Convert amount to paise: amount * 100
   │        b) Call Razorpay API: instance.orders.create()
   │           {
   │             amount: amount_in_paise,
   │             currency: "INR",
   │             receipt: `rcpt_${timestamp}`,
   │             payment_capture: 1
   │           }
   │        c) Save razorpayOrderId to pending order (optional)
   │        d) Return: { razorpayOrderId, amount, currency }
   │
   │    ⏱️ ~1-2 seconds (Razorpay API latency)
   │
   └── RESPONSE: { razorpayOrderId: "order_ABC123" }

6. START 10-MINUTE EXPIRY TIMER (line 106)
   └─> setTimeout(() => {
         POST /api/orders/expire { localOrderId }
         window.Razorpay.close()
         toast.error("Payment session expired")
         router.push('/cart')
       }, 10 * 60 * 1000)

7. OPEN RAZORPAY CHECKOUT MODAL (line 128)
   └─> window.Razorpay(options).open()
       ├─ Display payment form
       ├─ User enters UPI/card details
       └─ User submits payment
       
       ⏱️ USER TIME: Variable (2-10 minutes typically)

8. PAYMENT GATEWAY PROCESSING (Razorpay)
   └─> User confirms payment in Razorpay app
       └─> Payment success/failure response returned

9. ON PAYMENT SUCCESS - Razorpay Callback Handler (line 113)
   ┌──> handler: async function(response) {
   │    └─> response contains:
   │        {
   │          razorpay_order_id: "order_ABC123",
   │          razorpay_payment_id: "pay_XYZ789",
   │          razorpay_signature: "hmac_signature"
   │        }
   │
   │    a) Clear 10-minute expiry timer
   │
   │    b) POST /api/payments/razorpay/verify
   │       └─> Endpoint: app/api/payments/razorpay/verify/route.js
   │           
   │           PROCESSING:
   │           1) Verify HMAC signature:
   │              expected = HMAC-SHA256(
   │                "${razorpay_order_id}|${razorpay_payment_id}",
   │                RAZORPAY_KEY_SECRET
   │              )
   │              if (expected !== razorpay_signature) {
   │                return 400 "Invalid signature"
   │              }
   │           
   │           2) Check local order expiry:
   │              localOrder = db.orders.findById(localOrderId)
   │              if (localOrder.expiresAt < NOW) {
   │                Refund payment via Razorpay API
   │                Mark local order as "expired"
   │                return { ok: false, refunded: true }
   │              }
   │           
   │           3) Create final order from payload:
   │              db.orders.create({
   │                userId: payload.userId,
   │                items: enrichedItems,
   │                total: payload.total,
   │                address: payload.address,
   │                paymentMethod: "RAZORPAY",
   │                razorpayOrderId: razorpay_order_id,
   │                razorpayPaymentId: razorpay_payment_id,
   │                status: "confirmed",
   │                createdAt: NOW
   │              })
   │           
   │           ⏱️ ~1-3 seconds
   │           
   │           Response: { id, items, total, ... }
   │
   │    c) CREATE SHIPROCKET ORDER (line 119 - TO BE IMPLEMENTED)
   │       └─> POST /api/shiprocket/create-order
   │           └─> Endpoint: app/api/shiprocket/create-order/route.js
   │               
   │               INPUTS:
   │               {
   │                 orderId: localOrderId,
   │                 items: enrichedItems,
   │                 totalPrice: payload.total,
   │                 deliveryAddress: selectedAddress,
   │                 shippingCharge: shippingCharge,
   │                 userEmail: user.email,
   │                 userName: user.fullName
   │               }
   │               
   │               PROCESSING:
   │               1) Call Shiprocket API: POST /orders/create
   │                  {
   │                    order_id: orderId,
   │                    order_date: NOW,
   │                    pickup_location_id: 1,
   │                    billing_customer_name: address.name,
   │                    billing_email: user.email,
   │                    billing_phone: address.phone,
   │                    billing_address: address.line1,
   │                    billing_city: address.city,
   │                    billing_state: address.state,
   │                    billing_pincode: address.zip,
   │                    shipping_is_billing: true,
   │                    order_items: [
   │                      {
   │                        name: item.name,
   │                        sku: item.productId,
   │                        units: item.quantity,
   │                        selling_price: item.price
   │                      }
   │                    ],
   │                    payment_method: "Prepaid"
   │                  }
   │               
   │               2) Save shiprocket_order_id to order:
   │                  db.orders.update(orderId, {
   │                    shiprocket_order_id: response.order_id,
   │                    shiprocket_awb: response.shipments[0].awb_code
   │                  })
   │               
   │               ⏱️ ~1-2 seconds
   │               
   │               Response: { order_id, shipments[{ awb_code }] }
   │
   │       ❌ IF FAILS:
   │           └─> console.error() logged
   │           └─> Order still confirmed (non-blocking)
   │           └─> Manual Shiprocket creation needed
   │
   │    d) dispatch(clearCart()) → Clear Redux cart
   │    e) toast.success("Payment successful and order placed")
   │    f) router.push('/orders') → Navigate to orders page
   │
   └─> END OF SUCCESS HANDLER

10. IF PAYMENT FAILS / USER CLOSES MODAL
    └─> User cancels payment
        └─> Razorpay modal closes
        └─> No callback triggered
        └─> 10-minute timer still running
        
        WHEN TIMER EXPIRES:
        POST /api/orders/expire { localOrderId }
        └─> Mark order as "expired"
        └─> User sees: "Payment session expired"
        └─> Redirect to /cart

⏱️ TOTAL TIMELINE: 5-15 minutes (user-dependent)
```

---

## 3. DATABASE SCHEMA & COLLECTIONS

### **Orders Collection Structure**

```javascript
{
  // IDENTIFIERS
  _id: ObjectId,                    // MongoDB primary key
  id: "uuid",                       // Application ID (auto-generated)
  
  // BASIC INFO
  userId: "clerk-user-123",
  status: "pending" | "confirmed" | "expired",
  paymentMethod: "COD" | "RAZORPAY",
  
  // ORDER ITEMS
  items: [
    {
      productId: "prod-abc",
      quantity: 2,
      price: 1500,
      name: "Product Name",
      images: ["url1", "url2"],
      storeId: "store-123"
    }
  ],
  
  // PRICING
  total: 4500,
  discountAmount: 450,              // From coupon
  finalTotal: 4050,
  shippingCharge: 0,                // TO BE ADDED
  
  // ADDRESS
  address: {
    name: "John Doe",
    phone: "9876543210",
    email: "john@example.com",
    line1: "123 Main St",
    line2: "Apt 4B",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400001"
  },
  
  // PAYMENT TRACKING
  razorpayOrderId: "order_ABC123",  // If Razorpay
  razorpayPaymentId: "pay_XYZ789",  // If Razorpay
  
  // SHIPPING TRACKING (TO BE ADDED)
  shiprocket_order_id: "ship_123",
  shiprocket_awb: "ABC1234567",     // Air Waybill number
  
  // COUPON
  couponCode: "SAVE10",
  
  // TIMESTAMPS
  expiresAt: ISODate,               // For pending orders only (10 min)
  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

## 4. API ENDPOINT DIRECTORY

### **4.1 Order Endpoints**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/orders` | POST | Create final order | ✅ IMPLEMENTED |
| `/api/orders` | GET | Fetch orders (userId/storeId/all) | ✅ IMPLEMENTED |
| `/api/orders` | PUT | Update order status | ✅ IMPLEMENTED |
| `/api/orders/create-pending` | POST | Create temporary pending order | ✅ IMPLEMENTED |
| `/api/orders/expire` | POST | Mark pending order as expired | ✅ IMPLEMENTED |
| `/api/orders/stream` | GET | SSE real-time order updates | ✅ IMPLEMENTED |

### **4.2 Payment Endpoints**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/payments/razorpay/create` | POST | Create Razorpay order | ✅ IMPLEMENTED |
| `/api/payments/razorpay/verify` | POST | Verify Razorpay payment signature | ✅ IMPLEMENTED |
| `/api/payments/razorpay/webhook` | POST | Webhook for payment status | ✅ IMPLEMENTED |

### **4.3 Shiprocket Endpoints (TO BE CREATED)**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/shiprocket/calculate-shipping` | GET | Get shipping charge for pincode | 🚀 TO DO |
| `/api/shiprocket/create-order` | POST | Create order in Shiprocket | 🚀 TO DO |

---

## 5. COMPONENT FLOW

### **OrderSummary.jsx Detailed Flow**

```
OrderSummary Component
│
├─ STATE MANAGEMENT
│  ├─ paymentMethod: "COD" | "RAZORPAY"
│  ├─ selectedAddress: { name, phone, ... }
│  ├─ shippingCharge: 0 (currently unused)
│  ├─ coupon: ""
│  └─ isAuthenticated: boolean
│
├─ HOOKS
│  └─ useEffect: Load address from localStorage on mount
│
└─ HANDLERS
   │
   └─ handlePlaceOrder(e)
      │
      ├─ VALIDATION
      │  ├─ Check authentication (Clerk)
      │  ├─ Check address selected
      │  └─ Check no out-of-stock items
      │
      ├─ BUILD PAYLOAD
      │  └─ items, total, address, paymentMethod, userId
      │
      ├─ PATH 1: COD
      │  └─ POST /api/orders
      │     └─ Clear cart
      │     └─ Navigate to /orders
      │
      └─ PATH 2: RAZORPAY
         │
         ├─ POST /api/orders/create-pending
         │  └─ Get: localOrderId
         │
         ├─ POST /api/payments/razorpay/create
         │  └─ Get: razorpayOrderId
         │
         ├─ START 10-MIN TIMER
         │  └─ POST /api/orders/expire on timeout
         │
         ├─ OPEN RAZORPAY MODAL
         │  └─ User enters payment details
         │
         └─ ON SUCCESS
            │
            ├─ POST /api/payments/razorpay/verify
            │  └─ Validate signature
            │  └─ Create final order
            │
            ├─ POST /api/shiprocket/create-order (NEW)
            │  └─ Create shipping order
            │
            ├─ Clear cart
            └─ Navigate to /orders
```

---

## 6. TIMELINE WITH LATENCIES

### **Optimistic Case (COD)**
```
START
  ├─ 0ms     → User clicks "Place Order"
  ├─ 10ms    → Validation checks pass
  ├─ 20ms    → Payload built
  ├─ 50ms    → POST /api/orders sent
  │
  ├─ 500ms   → API processing:
  │            ├─ Product enrichment
  │            ├─ User upsert
  │            ├─ Coupon validation
  │            └─ Order creation
  │
  ├─ 550ms   → Response received
  ├─ 570ms   → Cart cleared (Redux)
  ├─ 590ms   → Toast shown
  └─ 600ms   → Navigation to /orders

TOTAL: ~600ms (user perceives as instant)
```

### **Worst Case (Razorpay)**
```
START
  ├─ 0ms        → User clicks "Place Order"
  ├─ 500ms      → Pending order created
  ├─ 1500ms     → Razorpay script loaded
  ├─ 2500ms     → Razorpay payment order created
  ├─ 3000ms     → Payment modal opens
  │
  ├─ 3000-600000ms → USER TIME (2-10 minutes)
  │                  User enters payment details
  │
  ├─ 600000ms   → User clicks "Pay"
  ├─ 602000ms   → Razorpay processes payment
  │
  ├─ 603500ms   → Payment success callback
  ├─ 604000ms   → Razorpay verify signature
  ├─ 605000ms   → Create final order in MongoDB
  ├─ 606000ms   → Create Shiprocket order
  ├─ 607000ms   → Cart cleared
  ├─ 607500ms   → Navigation to /orders
  │
  └─ TOTAL: ~10 minutes 7 seconds (mostly user time)
```

---

## 7. ERROR HANDLING FLOWS

### **Scenario: Payment Signature Invalid**
```
USER → POST /api/payments/razorpay/verify
         ├─ Compute expected signature
         ├─ Compare with incoming signature
         └─ MISMATCH DETECTED ❌
            ├─ Return 400 "Invalid signature"
            ├─ Frontend catches error
            ├─ Show toast: "Payment verification failed"
            ├─ Pending order NOT expired yet
            └─ User can retry
```

### **Scenario: Order Expired Before Verification**
```
USER → Clicks "Place Order"
       ├─ Creates pending order
       ├─ Starts 10-minute timer
       ├─ Opens Razorpay modal
       └─ Takes 15 minutes to complete payment
          └─ Timer expires at 10 minutes
             ├─ POST /api/orders/expire called
             ├─ Order marked as "expired"
             └─ When payment comes late:
                ├─ Verification check finds expired order
                ├─ Refund payment automatically
                └─ Return "Order expired, refund initiated"
```

### **Scenario: Shiprocket Order Creation Fails**
```
USER → Payment verified successfully
       ├─ POST /api/orders → ✅ SUCCEEDS
       ├─ POST /api/shiprocket/create-order → ❌ FAILS
       │  (Network error, Shiprocket API down, etc)
       │
       ├─ Error caught (line 125)
       ├─ console.error logged
       └─ Order continues anyway ✅
          (Non-blocking failure - order is already confirmed)
          
RESOLUTION:
├─ Admin manually creates Shiprocket order
└─ Or implement retry queue mechanism
```

---

## 8. REAL-TIME UPDATES (SSE Streams)

### **How Stores Get Notified of New Orders**

```
New Order Created
  │
  └─> MongoDB inserts document
      └─> Change stream triggered (via /api/orders/stream)
          └─> All connected store clients receive:
              {
                event: "insert",
                fullDocument: { order details }
              }
              │
              └─> Store dashboard updates in real-time
                  └─> Shows new order notification
```

**Stream Endpoint Structure:**
```javascript
GET /api/orders/stream?storeId=store-123
│
├─ Opens Server-Sent Events connection
├─ Filters orders by storeId (if provided)
├─ Watches MongoDB change stream for inserts/updates
└─ Sends SSE events:
   data: {
     event: "insert|update|delete",
     fullDocument: { ... order data ... }
   }
```

---

## 9. CURRENT STATE vs. TO-DO

### **✅ IMPLEMENTED (Working)**
- ✅ Order creation (COD & Razorpay)
- ✅ Pending order system (10-min timeout)
- ✅ Payment verification (HMAC signature)
- ✅ Order enrichment with product details
- ✅ Coupon discount application
- ✅ User upsert on order creation
- ✅ Stock validation (out-of-stock check)
- ✅ Address persistence (localStorage)
- ✅ Real-time order notifications (SSE)

### **🚀 TO-DO (Shiprocket Integration)**
1. Create `/api/shiprocket/calculate-shipping` endpoint
   - Input: { pincode, items: [{ weight, dimensions }] }
   - Output: { shippingCharge, estimatedDays }
   - Display in OrderSummary before payment

2. Create `/api/shiprocket/create-order` endpoint
   - Input: { orderId, items, address, total }
   - Output: { shiprocket_order_id, awb_code }
   - Called after Razorpay verification

3. Update OrderSummary component
   - Add `shippingCharge` state
   - Add effect to fetch shipping when address changes
   - Update total calculation: `totalPrice + shippingCharge`

4. Add environment variables
   - `SHIPROCKET_API_KEY`
   - `SHIPROCKET_BASE_URL`

5. Create Shiprocket helper (`lib/shiprocket.js`)
   - Wrapper for API calls
   - Error handling & retries

6. Update MongoDB schema
   - Add `shiprocket_order_id` field
   - Add `shiprocket_awb` field
   - Add `shippingCharge` field

---

## 10. CODE REFERENCES

### **Key Files**
- **Frontend**: `components/OrderSummary.jsx` (lines 45-180)
- **Order Creation**: `app/api/orders/route.js` (lines 1-60)
- **Pending Orders**: `app/api/orders/create-pending/route.js`
- **Payment Verification**: `app/api/payments/razorpay/verify/route.js`
- **Shiprocket** (NEW): `app/api/shiprocket/calculate-shipping/route.js`
- **Shiprocket** (NEW): `app/api/shiprocket/create-order/route.js`

### **Key Data Flow Variables**
```
OrderSummary.jsx:
├─ totalPrice (from props)
├─ shippingCharge (state - currently 0)
├─ selectedAddress (state)
├─ paymentMethod (state)
├─ items (from Redux cart)
└─ coupon (state)

Payload Structure:
{
  items: Array<{ productId, quantity, price, name, images, storeId }>,
  total: number,
  shippingCharge: number,
  address: Object,
  paymentMethod: "COD" | "RAZORPAY",
  userId: string,
  couponCode?: string
}
```

---

## 11. INTEGRATION CHECKLIST FOR SHIPROCKET

- [ ] Get Shiprocket API credentials
- [ ] Set up environment variables (.env.local)
- [ ] Create `/api/shiprocket/calculate-shipping/route.js`
- [ ] Create `/api/shiprocket/create-order/route.js`
- [ ] Create `lib/shiprocket.js` helper
- [ ] Update `OrderSummary.jsx` with shipping fee calculation
- [ ] Update `components/OrderSummary.jsx` display logic
- [ ] Add shipping charge to order payload
- [ ] Update MongoDB order schema (shippingCharge field)
- [ ] Test COD flow with shipping
- [ ] Test Razorpay flow with shipping
- [ ] Add Shiprocket order tracking (optional)
- [ ] Add webhook for Shiprocket status updates (optional)

---

## 12. QUICK REFERENCE DIAGRAM

```
BROWSER (User)
│
├─ [COD Path]
│  └─ POST /api/orders
│     └─ ✅ Order confirmed
│
└─ [RAZORPAY Path]
   ├─ POST /api/orders/create-pending (temp order, 10min timeout)
   ├─ POST /api/payments/razorpay/create (payment order)
   ├─ MODAL: Razorpay Checkout
   └─ ON SUCCESS:
      ├─ POST /api/payments/razorpay/verify (signature validation)
      ├─ POST /api/shiprocket/create-order (shipping)
      └─ ✅ Order confirmed + shipping created

MONGODB
├─ orders (confirmed + pending)
├─ users (auto-created)
└─ coupons (discount tracking)

EXTERNAL
├─ Razorpay (payment processing)
└─ Shiprocket (shipping logistics)
```

---

**Last Updated**: Based on current codebase analysis
**Next Steps**: Implement Shiprocket integration endpoints
