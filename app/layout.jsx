import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import ProductsLoader from '@/components/ProductsLoader'
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { assets } from '@/assets/assets'
import localFont from 'next/font/local'

const amoria = localFont({
    src: [
        {
            path: '../public/font/AMORIA.otf',
            weight: '400',
            style: 'normal',
        }
    ],
    variable: '--font-amoria',
    fallback: ['sans-serif']
})

export const metadata = {
    title: "P&C Jewellery",
    description: "P&C Jewellery is your one stop for all kinds of jewellery.",
    icons: {
        icon: '/assets/pandcjewellery.jpg'
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={amoria.variable}>
            <head>
                <link rel="icon" href={assets.pandcjewellery.src} />
            </head>
            <body className="font-amoria antialiased">
                <ClerkProvider>
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
