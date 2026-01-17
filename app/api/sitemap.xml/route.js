import mongodb from '@/lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || 'pandc';
const DOMAIN = 'https://pandcjewellery.com';
const SITEMAP_CACHE_DURATION = 3600000; // 1 hour in milliseconds
const MAX_PRODUCTS_IN_SITEMAP = 40000; // Google sitemap limit is 50,000, we use 40,000 for safety
const PRODUCTS_PER_BATCH = 500; // Batch size for pagination

let sitemapCache = null;
let sitemapCacheTime = 0;

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Helper to generate SEO-friendly slug
function generateProductSlug(name, id) {
  const slugName = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  return `${slugName}-${id}`;
}

// Helper to format date for XML (YYYY-MM-DD)
function formatDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

async function fetchProducts() {
  try {
    const client = await mongodb.getMongoClient?.() || (await (await import('@/lib/mongodb')).getMongoClient?.());
    const db = client.db(DB_NAME);
    
    // Fetch only active, published products sorted by popularity/recency
    // Only take the top MAX_PRODUCTS_IN_SITEMAP products
    const products = await db.collection('products')
      .find({ 
        // Filter for active products (optional - adjust based on your schema)
        // status: { $ne: 'inactive' },
        // You can add rating or views filter here
      })
      .sort({ views: -1, createdAt: -1 }) // Sort by views descending, then by date
      .limit(MAX_PRODUCTS_IN_SITEMAP)
      .toArray();
    
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

function generateSitemapXml(products) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:mobile="http://www.mobile.googlebot.org/schemas/mobile/1.0">

  <!-- Homepage -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <mobile:mobile />
  </url>

  <!-- Shop Page -->
  <url>
    <loc>${DOMAIN}/shop</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <mobile:mobile />
  </url>

  <!-- Pricing Page -->
  <url>
    <loc>${DOMAIN}/pricing</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <mobile:mobile />
  </url>

  <!-- Orders Page -->
  <url>
    <loc>${DOMAIN}/orders</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <mobile:mobile />
  </url>

`;

  // Add top products only (limited to MAX_PRODUCTS_IN_SITEMAP)
  if (products && products.length > 0) {
    const totalProducts = products.length;
    console.log(`Adding ${totalProducts} products to sitemap (max: ${MAX_PRODUCTS_IN_SITEMAP})`);
    
    products.forEach((product, index) => {
      const slug = generateProductSlug(product.name, product.id);
      const productUrl = `${DOMAIN}/product/${slug}`;
      const lastMod = product.updatedAt ? formatDate(product.updatedAt) : formatDate(product.createdAt || new Date());
      
      // Higher priority for top products, lower for less popular ones
      const priority = Math.max(0.5, 0.8 - (index / totalProducts) * 0.3).toFixed(1);
      
      xml += `  <!-- Product: ${escapeXml(product.name)} -->
  <url>
    <loc>${escapeXml(productUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
    <mobile:mobile />
  </url>

`;
    });
  }

  xml += `</urlset>`;
  return xml;
}

export async function GET(request) {
  // Check cache first
  const now = Date.now();
  if (sitemapCache && (now - sitemapCacheTime) < SITEMAP_CACHE_DURATION) {
    return new Response(sitemapCache, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // 1 hour browser cache
      },
    });
  }

  try {
    const products = await fetchProducts();
    const xml = generateSitemapXml(products);
    // Cache the sitemap
    sitemapCache = xml;
    sitemapCacheTime = now;
    
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // 1 hour browser cache
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
