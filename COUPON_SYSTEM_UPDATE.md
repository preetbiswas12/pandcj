# Coupon System Update - No Expiry & Minimum Order Amount

## Overview
Updated the coupon system to support:
1. **No Expiry Date Option** - Admin can create coupons that never expire
2. **Minimum Order Amount** - Coupons only apply when order total exceeds a specified amount

## Changes Made

### 1. Admin Coupon Page (`app/admin/coupons/page.jsx`)
- Added **"No Expiry Date"** toggle checkbox
- Added **"Minimum Order Amount"** input field
- When "No Expiry" is toggled ON, the date picker is disabled
- Updated coupon list table to show:
  - **Min Order** column (displays minimum order amount in ₹)
  - **Expires At** column shows "Never" for no-expiry coupons

### 2. Admin API (`app/api/admin/coupons/route.js`)
- Updated POST endpoint to handle new fields:
  - `noExpiry`: boolean (default: false)
  - `minimumOrderAmount`: number (default: 0)
- If `noExpiry` is true, `expiresAt` is set to `null`

### 3. Coupon Validation APIs

#### Public Coupon Endpoint (`app/api/coupon/[code]/route.js`)
- Updated to skip expiry check if `noExpiry` is true
- Returns `noExpiry`, `minimumOrderAmount`, and `applyToShipping` in response

#### Validation Endpoint (`app/api/coupon/validate/route.js`)
- Now accepts `totalAmount` query parameter for validation
- Checks if order total meets minimum requirement
- Returns error with required amount if minimum not met
- Skips expiry validation for no-expiry coupons
- Includes `minimumOrderAmount` in response

### 4. Checkout Component (`components/OrderSummary.jsx`)
- Updated `handleCouponCode` function to:
  - Calculate total including shipping charges
  - Pass total amount to validation API
  - Validate minimum order amount before applying coupon
  - Show helpful error message if minimum not met

## How It Works

### Creating a Coupon (Admin)
1. Go to Admin > Coupons
2. Fill in coupon details (code, discount %, description)
3. **Optional**: Set minimum order amount (e.g., ₹500)
4. **Optional**: Toggle "No Expiry Date" to make it never expire
5. If not using "No Expiry", select expiry date
6. Click "Add Coupon"

### Applying a Coupon (Customer)
1. At checkout, enter coupon code
2. System validates:
   - Coupon exists and is valid
   - Coupon is not expired (unless no-expiry)
   - **Order total meets minimum requirement** ← NEW
3. If all checks pass, coupon is applied with discount
4. If minimum not met, error shows required amount

## Database Fields
Coupons collection now stores:
```javascript
{
  code: "SUMMER20",
  discount: 20,  // percentage
  description: "Summer Sale",
  minimumOrderAmount: 500,  // minimum order to apply coupon (₹)
  noExpiry: false,  // if true, coupon never expires
  expiresAt: null,  // null if noExpiry is true
  applyToShipping: true,
  forNewUser: false,
  forMember: true,
  // ... other fields
}
```

## Examples

### Example 1: No Expiry Coupon
- Code: `LOYALTY100`
- Discount: 10%
- No Expiry: ✓ (never expires)
- Minimum Order: ₹1000

### Example 2: Time-Limited with Minimum
- Code: `FLASH50`
- Discount: 15%
- Expires At: 2026-02-28
- Minimum Order: ₹2000

### Example 3: No Minimum
- Code: `WELCOME10`
- Discount: 10%
- Expires At: 2026-03-31
- Minimum Order: ₹0 (applies to any order)

## Error Messages

| Scenario | Message |
|----------|---------|
| Coupon not found | "Coupon not found" |
| Coupon expired | "Coupon has expired" |
| Below minimum | "Minimum order amount of ₹{amount} required for this coupon" |
| Valid coupon | "Coupon applied successfully!" |

## Testing

### Test Case 1: No Expiry Coupon
1. Create coupon with "No Expiry" toggled
2. Check database - `expiresAt` should be null
3. Apply coupon - should work regardless of date

### Test Case 2: Minimum Order Amount
1. Create coupon with minimum: ₹500
2. Try to apply with cart total: ₹400 → should fail
3. Add more items to reach ₹600 → should apply successfully

### Test Case 3: Both Features
1. Create no-expiry coupon with ₹1000 minimum
2. Verify expiry validation skipped
3. Verify minimum order check enforced
