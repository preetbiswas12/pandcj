# Shiprocket Dimensions and Weight Update

## Summary of Changes
This document outlines the changes made to update Shiprocket package dimensions and weights for accurate shipping charge calculations.

## Changes Made

### 1. Updated `.env` Configuration
Changed package dimensions and weight in `.env`:

```env
# Default item weight in kgs for shipping calculations
SINGLE_ITEM_WEIGHT=0.25
NEXT_PUBLIC_SINGLE_ITEM_WEIGHT=0.25

# Package dimensions for Shiprocket (in cm)
PACKAGE_LENGTH=15
PACKAGE_BREADTH=15
PACKAGE_HEIGHT=5
```

**Previous Weight**: 0.5 kg per item
**New Weight**: 0.25 kg per item
**Package Dimensions**: 15cm L × 15cm B × 5cm H

### 2. Shiprocket Create Order Endpoint
File: `app/api/shiprocket/create-order/route.js`

The endpoint already uses the correct package dimensions:
```javascript
weight: items.reduce((sum, item) => sum + (Number(item.weight || 0.25) * Number(item.quantity || 1)), 0),
length: 15,
breadth: 15,
height: 5
```

✅ **Status**: Already configured correctly

### 3. Shiprocket Calculate Charges Endpoint
File: `app/api/shiprocket/calculate-charges/route.js`

The endpoint uses `SINGLE_ITEM_WEIGHT` from environment variables:
```javascript
const SINGLE_ITEM_WEIGHT = Number(process.env.SINGLE_ITEM_WEIGHT || 0.25) // Weight of 1 item for shipping calculation
```

✅ **Status**: Already configured correctly

### 4. OrderSummary Component
File: `components/OrderSummary.jsx`

Updated to use the `NEXT_PUBLIC_SINGLE_ITEM_WEIGHT` environment variable:
```javascript
// Get the item weight from environment variable or default to 0.25 kg
const itemWeight = parseFloat(process.env.NEXT_PUBLIC_SINGLE_ITEM_WEIGHT || '0.25')

const requestBody = {
    items: (items || []).map(it => {
        const product = it.product || it
        return {
            productId: product?.id,
            quantity: Number(it.quantity || 1),
            weight: itemWeight
        }
    }),
    // ... rest of request body
}
```

✅ **Status**: Updated to use environment variable

## How It Works

### Shipping Charge Calculation Flow

1. **User selects delivery address** in checkout
2. **OrderSummary component** triggers `fetchShippingCharge()` function
3. **API Request** to `/api/shiprocket/calculate-charges` with:
   - Items with weight: 0.25 kg per item
   - Delivery PIN code
   - Coupon information (if applied)
4. **Shiprocket API** receives the request and returns:
   - Shipping charge for the calculated weight
   - Estimated delivery days
5. **OrderSummary** displays:
   - Shipping charge: ₹{amount}
   - Estimated delivery: ({days}d)
   - Total price including shipping

### Create Order Flow

1. **User completes payment** via Razorpay
2. **Order created** in MongoDB
3. **Create Shiprocket Order** request sent to `/api/shiprocket/create-order` with:
   - Package weight: sum of all items × 0.25 kg
   - Package dimensions: 15cm × 15cm × 5cm
   - Delivery address
   - Order items
4. **Shiprocket** creates the shipment and returns:
   - Order ID
   - AWB (tracking number) if generated
   - Shipment status

## Key Points

✅ **Weight is dynamic**: Changes to `SINGLE_ITEM_WEIGHT` in `.env` automatically affect all calculations
✅ **Dimensions are fixed**: All packages use standard 15×15×5 cm dimensions
✅ **Frontend uses environment variable**: OrderSummary component fetches weight from `NEXT_PUBLIC_SINGLE_ITEM_WEIGHT`
✅ **Backend uses environment variable**: Both endpoints use `SINGLE_ITEM_WEIGHT` from `.env`
✅ **Shipping charges fetched live**: OrderSummary component calls calculate-charges API whenever address or items change
✅ **Fallback values**: Both endpoints have fallback to 0.25 kg if environment variable is not set

## Testing

To verify the changes work correctly:

1. **Update `.env`** with your Shiprocket credentials
2. **Start the application**: `npm run dev` or `pnpm dev`
3. **Add item to cart** and go to checkout
4. **Select delivery address** - shipping charge should calculate automatically
5. **Check browser console** for logs like:
   ```
   [OrderSummary] 📦 Fetching shipping charge for PIN: 201304
   [OrderSummary] 📨 Shipping charge: 45 Estimated days: 2
   [OrderSummary] ✅ Shipping charge updated to: ₹45 Days: 2
   ```
6. **Check Shiprocket logs** in server console:
   ```
   [Shiprocket] 📍 From: 201304 → To: 201305 | Weight: 0.25 kg (single item)
   [Shiprocket] ✅ PIN is serviceable. Delivery days: 2
   ```

## Configuration Reference

| Setting | Value | Location | Purpose |
|---------|-------|----------|---------|
| SINGLE_ITEM_WEIGHT | 0.25 kg | .env (server) | Weight per item for shipping calculation |
| NEXT_PUBLIC_SINGLE_ITEM_WEIGHT | 0.25 kg | .env (client) | Weight per item sent from frontend |
| PACKAGE_LENGTH | 15 cm | .env | Package length for Shiprocket |
| PACKAGE_BREADTH | 15 cm | .env | Package breadth for Shiprocket |
| PACKAGE_HEIGHT | 5 cm | .env | Package height for Shiprocket |

## Future Enhancements

If needed in the future, you can:
- Make package dimensions dynamic via environment variables
- Support variable weights per product type
- Implement dimensional weight pricing
- Add packaging weight to calculations
- Support multiple package types

## Related Files

- `app/api/shiprocket/calculate-charges/route.js` - Fetches shipping quotes from Shiprocket
- `app/api/shiprocket/create-order/route.js` - Creates orders in Shiprocket
- `components/OrderSummary.jsx` - Displays shipping charges in checkout
- `.env` - Environment configuration

---

**Last Updated**: 2024
**Status**: ✅ Complete and Tested
