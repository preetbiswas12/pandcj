import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { extractProductIdFromSlug } from "@/lib/productSlug";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({ params }) {
    // Fetch product from API based on productId slug
    try {
        const productId = params.productId;
        // Extract actual ID from slug (format: name-uuid)
        const uuidMatch = productId.match(/([a-f0-9-]{36})$/);
        const actualId = uuidMatch ? uuidMatch[1] : productId;
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'https://pandcjewellery.com'}/api/products/${actualId}`,
            { next: { revalidate: 3600 } }
        );
        
        if (!response.ok) {
            return {
                title: 'Product | P&C Jewellery',
                robots: { index: true, follow: true }
            };
        }
        
        const product = await response.json();
        
        return {
            title: `${product.name} | Premium Jewelry | P&C Jewellery`,
            description: product.description?.substring(0, 160) || `Shop ${product.name} at P&C Jewellery. Premium jewelry with free worldwide shipping.`,
            keywords: `${product.name}, ${product.category}, jewelry, earrings, necklaces`,
            robots: {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    'max-image-preview': 'large',
                }
            },
            alternates: {
                canonical: `https://pandcjewellery.com/product/${productId}`
            },
            openGraph: {
                url: `https://pandcjewellery.com/product/${productId}`,
                title: `${product.name} | P&C Jewellery`,
                description: product.description?.substring(0, 160) || 'Shop premium jewelry',
                images: product.images ? [{
                    url: product.images[0],
                    width: 1200,
                    height: 1200,
                    alt: product.name
                }] : []
            }
        };
    } catch (error) {
        return {
            title: 'Product | P&C Jewellery',
            robots: { index: true, follow: true }
        };
    }
}

export default function Product() {

    const { productId } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState();
    const products = useSelector(state => state.product.list || []);

    const fetchProduct = async () => {
        // Extract actual product ID from slug (slug format: product-name-uuid)
        const actualId = extractProductIdFromSlug(productId);
        const product = products.find((product) => product.id === actualId);
        setProduct(product);
    }

    useEffect(() => {
        if (products.length > 0) {
            fetchProduct()
        }
        scrollTo(0, 0)
    }, [productId,products]);

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto">

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-800 py-4 transition-colors font-medium text-sm sm:text-base"
                >
                    <ArrowLeft size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Back to Shop</span>
                </button>

                {/* Breadcrums */}
                <div className="  text-gray-600 text-sm mt-8 mb-5">
                    Home / Products / {product?.category}
                </div>

                {/* Product Details */}
                {product && (<ProductDetails product={product} />)}

                {/* Description & Reviews */}
                {product && (<ProductDescription product={product} />)}
            </div>
        </div>
    );
}