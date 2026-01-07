"use client"
import PageTitle from "@/components/PageTitle"
import { useState, useEffect } from "react";
import OrderItem from "@/components/OrderItem";
import { useUser } from '@clerk/nextjs'

export const metadata = {
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        }
    }
};

export default function Orders() {
    const { isSignedIn, user } = useUser()
    const [orders, setOrders] = useState([])

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                if (!isSignedIn || !user?.id) return setOrders([])
                const res = await fetch(`/api/orders?userId=${user.id}`)
                if (!res.ok) return setOrders([])
                const all = await res.json()
                setOrders(all)
            } catch (err) {
                setOrders([])
            }
        }

        fetchOrders()
    }, [isSignedIn, user])

    return (
        <div className="min-h-[70vh] mx-3 sm:mx-6">
            {orders.length > 0 ? (
                <div className="my-12 sm:my-20 max-w-7xl mx-auto">
                    <PageTitle heading="My Orders" text={`Showing total ${orders.length} orders`} linkText={'Go to home'} />

                    <div className="overflow-x-auto">
                        <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-3 sm:border-spacing-y-12 border-spacing-x-2 sm:border-spacing-x-4">
                            <thead>
                                <tr className="text-xs sm:text-sm text-slate-600 max-md:hidden">
                                    <th className="text-left">Product</th>
                                    <th className="text-center">Total Price</th>
                                    <th className="text-left">Address</th>
                                    <th className="text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <OrderItem order={order} key={order.id} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="min-h-[80vh] flex items-center justify-center text-slate-400">
                    <h1 className="text-xl sm:text-2xl md:text-4xl font-semibold text-center px-4">You have no orders</h1>
                </div>
            )}
        </div>
    )
}