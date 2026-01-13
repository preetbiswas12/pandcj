
'use client'
import Loading from "@/components/Loading"
import { CircleDollarSignIcon, ShoppingBasketIcon, StarIcon, TagsIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { generateProductSlug } from "@/lib/productSlug"

export default function Dashboard() {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: [],
    })

    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: 'Total Earnings', value: currency + dashboardData.totalEarnings, icon: CircleDollarSignIcon },
        { title: 'Total Orders', value: dashboardData.totalOrders, icon: TagsIcon },
        { title: 'Total Ratings', value: dashboardData.ratings.length, icon: StarIcon },
    ]

    const fetchDashboardData = async () => {
        try {
            const storeId = 'default-store'
            // products
            let products = []
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 4000) // 4s timeout
                const res = await fetch('/api/products', { signal: controller.signal })
                clearTimeout(timeout)
                if (res.ok) products = await res.json()
            } catch (e) { if (e.name !== 'AbortError') console.error(e); products = [] }

            // orders (query API by store)
            let orders = []
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 4000) // 4s timeout
                const res = await fetch(`/api/orders?storeId=${encodeURIComponent(storeId)}`, { signal: controller.signal })
                clearTimeout(timeout)
                if (res.ok) orders = await res.json()
            } catch (e) { if (e.name !== 'AbortError') console.error(e); orders = [] }

            // filter cancelled
            const visibleOrders = orders.filter(o => !(o.status && String(o.status).toUpperCase().startsWith('CANCEL')))

            const totalEarnings = visibleOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)

            setDashboardData({
                totalProducts: (products || []).filter(p => (p.storeId || 'default-store') === storeId).length,
                totalEarnings,
                totalOrders: visibleOrders.length,
                ratings: [],
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
        // subscribe to realtime updates for this store
        const storeId = 'default-store'
        let es
        try {
            es = new EventSource(`/api/orders/stream?storeId=${encodeURIComponent(storeId)}`)
            es.addEventListener('summary', (ev) => {
                try {
                    const msg = JSON.parse(ev.data)
                    if (msg && msg.data) {
                        setDashboardData(prev => ({ ...prev, totalEarnings: msg.data.totalAmount, totalOrders: msg.data.totalOrders }))
                    }
                } catch (e) { }
            })
        } catch (e) { }
        return () => { try { if (es) es.close() } catch (e) {} }
    }, [])

    if (loading) return <Loading />

    return (
        <div className=" text-slate-500 mb-28">
            <h1 className="text-2xl">Seller <span className="text-slate-800 font-medium">Dashboard</span></h1>

            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
                            <div className="flex flex-col gap-3 text-xs">
                                <p>{card.title}</p>
                                <b className="text-2xl font-medium text-slate-700">{card.value}</b>
                            </div>
                            <card.icon size={50} className=" w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                        </div>
                    ))
                }
            </div>

            <h2>Total Reviews</h2>

            <div className="mt-5">
                {
                    dashboardData.ratings.map((review, index) => (
                        <div key={index} className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-6 border-b border-slate-200 text-sm text-slate-600 max-w-4xl">
                            <div>
                                <div className="flex gap-3">
                                    <Image src={review.user.image} alt="User avatar" className="w-10 aspect-square rounded-full" width={100} height={100} />
                                    <div>
                                        <p className="font-medium">{review.user.name}</p>
                                        <p className="font-light text-slate-500">{new Date(review.createdAt).toDateString()}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-slate-500 max-w-xs leading-6">{review.review}</p>
                            </div>
                            <div className="flex flex-col justify-between gap-6 sm:items-end">
                                <div className="flex flex-col sm:items-end">
                                    <p className="text-slate-400">{review.product?.category}</p>
                                    <p className="font-medium">{review.product?.name}</p>
                                    <div className='flex items-center'>
                                        {Array(5).fill('').map((_, index) => (
                                            <StarIcon key={index} size={17} className='mt-0.5' fill={review.rating >= index + 1 ? "#00C950" : "#D1D5DB"} stroke={review.rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => router.push(`/product/${generateProductSlug(review.product.name, review.product.id)}`)} className="bg-slate-100 px-5 py-2 hover:bg-slate-200 rounded transition-all">View Product</button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}