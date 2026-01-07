import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import ProductsLoader from '@/components/ProductsLoader'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { assets } from '@/assets/assets'
import { organizationSchema, eCommerceSchema } from '@/lib/seoSchema'

export const metadata = {
    title: "P&C Jewellery - Premium Jewelry Store",
    description: "P&C Jewellery is your one stop for all kinds of premium jewelry. Explore exquisite designs in earrings, necklaces, and more with free shipping worldwide, T&C apply.",
    keywords: "jewelry, earrings, necklaces, premium jewelry, online jewelry store, pandcjewellery",
    icons: {
        icon: '/assets/pandcjewellery.jpg'
    },
    openGraph: {
        type: 'website',
        url: 'https://pandcjewellery.com',
        title: 'P&C Jewellery - Premium Jewelry',
        description: 'Discover exquisite jewelry designs at P&C Jewellery',
        siteName: 'P&C Jewellery',
        images: [
            {
                url: 'https://pandcjewellery.com/logo.png',
                width: 1200,
                height: 630,
                alt: 'P&C Jewellery'
            }
        ]
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1
        }
    },
    alternates: {
        canonical: 'https://pandcjewellery.com'
    },
    metadataBase: new URL('https://pandcjewellery.com')
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                {/* Google Tag Manager */}
                <script dangerouslySetInnerHTML={{__html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K5DV6MLK');`}} />
                {/* End Google Tag Manager */}
                
                <link rel="icon" href={assets.pandcjewellery.src} />
                <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
                <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_CODE" />
                <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" />
                
                {/* Structured Data - Organization */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
                />
                
                {/* Structured Data - E-Commerce */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(eCommerceSchema) }}
                />
            </head>
            <body className="font-amoria antialiased">
                {/* Google Tag Manager (noscript) */}
                <noscript>
                    <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K5DV6MLK"
                    height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe>
                </noscript>
                {/* End Google Tag Manager (noscript) */}
                
                <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
                <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
                    <StoreProvider>
                        <Toaster />
                        <ProductsLoader />
                        {children}
                    </StoreProvider>
                </ClerkProvider>
            </body>
        </html>
    );
}
