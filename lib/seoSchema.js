// lib/seoSchema.js
// Structured data schemas for jewelry e-commerce

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'P&C Jewellery',
  url: 'https://pandcjewellery.qzz.io',
  logo: 'https://pandcjewellery.qzz.io/logo.png',
  description: 'Premium jewelry store offering exquisite designs in earrings, necklaces, and more.',
  sameAs: [
    'https://www.facebook.com/pandcjewellery',
    'https://www.instagram.com/pandcjewellery',
    'https://www.twitter.com/pandcjewellery'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-XXXX-XXXX',
    contactType: 'Customer Service'
  }
};

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'P&C Jewellery',
  image: 'https://pandcjewellery.qzz.io/logo.png',
  description: 'Trusted jewelry store with premium designs',
  url: 'https://pandcjewellery.qzz.io',
  telephone: '+1-XXXX-XXXX',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'IN'
  },
  priceRange: '₹₹₹'
};

export const productSchema = (product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images?.[0] || '',
  brand: {
    '@type': 'Brand',
    name: 'P&C Jewellery'
  },
  offers: {
    '@type': 'Offer',
    url: `https://pandcjewellery.qzz.io/product/${product.id}`,
    priceCurrency: 'INR',
    price: product.price,
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availability: product.stock === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    seller: {
      '@type': 'Organization',
      name: 'P&C Jewellery'
    }
  },
  aggregateRating: product.rating && product.rating.length > 0 ? {
    '@type': 'AggregateRating',
    ratingValue: (product.rating.reduce((sum, r) => sum + r.rating, 0) / product.rating.length).toFixed(1),
    reviewCount: product.rating.length
  } : undefined
});

export const breadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url
  }))
});

export const faqSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is P&C Jewellery?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'P&C Jewellery is a premium online jewelry store offering exquisite designs in earrings, necklaces, and other jewelry items.'
        }
      },
      {
        '@type': 'Question',
        name: 'Do you offer free shipping?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, we offer free shipping worldwide on orders above 2999 Rupees.'
        }
      },
      {
        '@type': 'Question',
        name: 'What is your return policy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We offer hassle-free returns within 30 days of purchase with full refund.'
        }
      },
      {
        '@type': 'Question',
        name: 'Are your products authentic?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, all our jewelry pieces are 100% authentic and verified for quality.'
        }
      }
    ]
  }
];

export const eCommerceSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'P&C Jewellery',
  url: 'https://pandcjewellery.qzz.io',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://pandcjewellery.qzz.io/shop?search={search_term_string}'
    },
    query_input: 'required name=search_term_string'
  }
};
