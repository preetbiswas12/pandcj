// lib/analyticsExamples.js
// Example implementations showing how to track analytics events throughout the app

import { 
  trackProductView, 
  trackAddToCart, 
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  trackSearch,
  trackReview,
  trackNewsletterSignup
} from './analytics'

/**
 * IMPLEMENTATION EXAMPLES:
 * 
 * Copy and integrate these into their respective components
 */

// 1. PRODUCT PAGE - Track when user views a product
export function exampleProductPage() {
  // In components/ProductDetails.jsx or app/(public)/product/[productId]/page.jsx
  useEffect(() => {
    if (product) {
      trackProductView({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
      })
    }
  }, [product])
}

// 2. ADD TO CART - Track when user adds item to cart
export function exampleAddToCart() {
  // In components/ProductDetails.jsx
  const handleAddToCart = (product, quantity) => {
    // ... existing add to cart logic
    
    trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
    }, quantity)
  }
}

// 3. REMOVE FROM CART - Track when user removes item
export function exampleRemoveFromCart() {
  // In cart components
  const handleRemoveFromCart = (product, quantity) => {
    // ... existing remove logic
    
    trackRemoveFromCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
    }, quantity)
  }
}

// 4. SEARCH - Track search queries
export function exampleSearch() {
  // In app/(public)/shop/page.jsx
  useEffect(() => {
    if (search) {
      trackSearch(search)
    }
  }, [search])
}

// 5. CHECKOUT - Track when checkout begins
export function exampleBeginCheckout() {
  // In checkout component
  const handleCheckoutStart = (cartItems, total) => {
    trackBeginCheckout(
      cartItems.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
      })),
      total
    )
  }
}

// 6. PURCHASE - Track completed orders
export function examplePurchase() {
  // In order success/confirmation component
  const handleOrderSuccess = (order) => {
    trackPurchase(
      order.id,
      order.items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
      })),
      order.total
    )
  }
}

// 7. REVIEW - Track review submissions
export function exampleReviewSubmit() {
  // In components/ReviewForm.jsx
  const handleSubmitReview = (productId, rating) => {
    // ... existing review logic
    
    trackReview(productId, rating)
  }
}

// 8. NEWSLETTER - Track newsletter signups
export function exampleNewsletterSignup() {
  // In components/Newsletter.jsx
  const handleNewsletterSubmit = async (email) => {
    // ... existing newsletter logic
    
    trackNewsletterSignup(email)
  }
}
