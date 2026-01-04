// lib/analytics.js
// Google Analytics event tracking utilities

// Track page views
export const pageview = (url) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    })
  }
}

// Track custom events
export const event = ({ action, category, label, value }) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// E-commerce tracking events
export const trackProductView = (product) => {
  event({
    action: 'view_item',
    category: 'Ecommerce',
    label: product.name,
    value: product.price,
  })
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'INR',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
      }]
    })
  }
}

export const trackAddToCart = (product, quantity = 1) => {
  event({
    action: 'add_to_cart',
    category: 'Ecommerce',
    label: product.name,
    value: product.price * quantity,
  })
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'INR',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: quantity,
      }]
    })
  }
}

export const trackRemoveFromCart = (product, quantity = 1) => {
  event({
    action: 'remove_from_cart',
    category: 'Ecommerce',
    label: product.name,
    value: product.price * quantity,
  })
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'remove_from_cart', {
      currency: 'INR',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: quantity,
      }]
    })
  }
}

export const trackBeginCheckout = (items, totalValue) => {
  event({
    action: 'begin_checkout',
    category: 'Ecommerce',
    label: 'Checkout Started',
    value: totalValue,
  })
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'INR',
      value: totalValue,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
      }))
    })
  }
}

export const trackPurchase = (orderId, items, totalValue) => {
  event({
    action: 'purchase',
    category: 'Ecommerce',
    label: `Order ${orderId}`,
    value: totalValue,
  })
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      currency: 'INR',
      value: totalValue,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
      }))
    })
  }
}

export const trackSearch = (searchTerm) => {
  event({
    action: 'search',
    category: 'Engagement',
    label: searchTerm,
  })
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    })
  }
}

export const trackReview = (productId, rating) => {
  event({
    action: 'review_submitted',
    category: 'Engagement',
    label: productId,
    value: rating,
  })
}

export const trackNewsletterSignup = (email) => {
  event({
    action: 'newsletter_signup',
    category: 'Engagement',
    label: 'Newsletter',
  })
}
