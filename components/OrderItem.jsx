 'use client'
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import { useRouter } from 'next/navigation'

const OrderItem = ({ order, editable = false, onStatusChange = null, onCancel = null, onView = null }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    const [ratingModal, setRatingModal] = useState(null);
    const [failedImages, setFailedImages] = useState(new Set());
    const isCancelled = order.status && String(order.status).toUpperCase().startsWith('CANCEL');

    const { ratings } = useSelector(state => state.rating);
    const router = useRouter()
    
    const handleImageError = (imageUrl) => {
        setFailedImages(prev => new Set([...prev, imageUrl]))
    }

    return (
        <>
            <tr className={`text-sm cursor-pointer hover:bg-slate-50 transition ${isCancelled ? 'opacity-60 bg-red-50' : ''}`} onClick={() => !editable && router.push(`/orders/${order.id}`)}>
                <td className="text-left">
                    <div className="flex flex-col gap-6">
                        {(order?.orderItems || order?.items || []).map((item, index) => {
                            // Handle both data structures: enriched items with product object, and simple items with productId
                            const product = item.product || item
                            const productName = product?.name || 'Unknown Product'
                            const productImages = product?.images || []
                            const imageUrl = productImages?.[0]
                            
                            return (
                            <div key={index} className="flex items-center gap-4">
                                <div className={`w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md overflow-hidden ${isCancelled ? 'opacity-50' : ''}`}>
                                    {imageUrl && !failedImages.has(imageUrl) ? (
                                        <Image
                                            className="h-14 w-auto object-contain"
                                            src={imageUrl}
                                            alt="product_img"
                                            width={50}
                                            height={50}
                                            onError={() => handleImageError(imageUrl)}
                                            unoptimized={imageUrl.includes('cloudinary')}
                                        />
                                    ) : (
                                        <span className="text-slate-400 text-xs text-center px-2">No Image</span>
                                    )}
                                </div>
                                <div className="flex flex-col justify-center text-sm">
                                    <p className={`font-medium text-base ${isCancelled ? 'line-through text-red-600' : 'text-slate-600'}`}>
                                        {productName}
                                    </p>
                                    <p className={isCancelled ? 'line-through text-red-600' : ''}>{currency}{item.price} Qty : {item.quantity}</p>
                                    <p className="mb-1">{new Date(order.createdAt).toDateString()}</p>
                                    <div>
                                        {ratings.find(rating => order.id === rating.orderId && (product?.id || item.productId) === rating.productId)
                                            ? <Rating value={ratings.find(rating => order.id === rating.orderId && (product?.id || item.productId) === rating.productId).rating} />
                                            : <button onClick={(e) => { e.stopPropagation(); setRatingModal({ orderId: order.id, productId: product?.id || item.productId }) }} className={`text-yellow-500 hover:bg-yellow-50 transition ${(order.status !== "DELIVERED" || isCancelled) && 'hidden'}`}>Rate Product</button>
                                        }</div>
                                    {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
                                </div>
                            </div>
                        )})}
                    </div>
                </td>

                <td className={`text-center max-md:hidden ${isCancelled ? 'line-through text-red-600' : ''}`}>
                    {currency}{order.total}
                </td>

                <td className={`text-left max-md:hidden ${isCancelled ? 'text-red-600' : ''}`}>
                    <p>{order.address.name}, {order.address.street},</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country},</p>
                    <p>{order.address?.phone || 'N/A'}</p>
                    <p>Email: {order.address?.email || 'N/A'}</p>
                </td>

                <td className="text-left space-y-2 text-sm max-md:hidden">
                    {editable && typeof onStatusChange === 'function' ? (
                        <div className="flex flex-col gap-2">
                            <select
                                value={order.status}
                                onChange={(e) => { e.stopPropagation(); onStatusChange(order.id, e.target.value) }}
                                className="px-3 py-1 rounded border"
                            >
                                <option value="ORDER_PLACED">Ordered</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                            </select>
                            <div className="flex items-center gap-2">
                                {onCancel && (order.status === 'ORDER_PLACED' || order.status === 'PROCESSING') && (
                                    <button onClick={(e) => { e.stopPropagation(); onCancel(order.id) }} className="text-red-600 bg-red-50 px-3 py-1 rounded">Cancel</button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); router.push(`/store/orders/${order.id}`) }} className="text-slate-700 bg-slate-100 px-3 py-1 rounded">View</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div
                                className={`flex items-center justify-center gap-1 rounded-full p-1 ${
                                    isCancelled ? 'text-white bg-red-600' :
                                    order.status === 'PROCESSING' ? 'text-yellow-500 bg-yellow-100' :
                                    order.status === 'DELIVERED' ? 'text-green-500 bg-green-100' :
                                    'text-slate-500 bg-slate-100'
                                }`}
                            >
                                <DotIcon size={10} className="scale-250" />
                                {String(order.status).split('_').join(' ').toLowerCase()}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {onCancel && (order.status === 'ORDER_PLACED' || order.status === 'PROCESSING') && !isCancelled && (
                                    <button onClick={(e) => { e.stopPropagation(); onCancel(order.id) }} className="text-red-600 bg-red-50 px-3 py-1 rounded text-xs">Cancel</button>
                                )}
                                {editable ? (
                                    onView ? (
                                        <button onClick={(e) => { e.stopPropagation(); onView(order) }} className="text-slate-700 bg-slate-100 px-3 py-1 rounded text-xs">View</button>
                                    ) : (
                                        <button onClick={(e) => { e.stopPropagation(); router.push(`/store/orders/${order.id}`) }} className="text-slate-700 bg-slate-100 px-3 py-1 rounded text-xs">View</button>
                                    )
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); router.push(`/orders/${order.id}`) }} className="text-blue-600 bg-blue-50 px-3 py-1 rounded text-xs">View Details</button>
                                )}
                            </div>
                        </>
                    )}
                </td>
            </tr>
            {/* Mobile */}
            <tr className={`md:hidden ${isCancelled ? 'opacity-60 bg-red-50' : ''}`}>
                <td colSpan={5}>
                    <p className={isCancelled ? 'line-through text-red-600' : ''}>{order.address.name}, {order.address.street}</p>
                    <p className={isCancelled ? 'text-red-600' : ''}>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country}</p>
                    <p>{order.address?.phone || 'N/A'}</p>
                    <p>Email: {order.address?.email || 'N/A'}</p>
                    <br />
                    <div className="flex items-center flex-wrap gap-2">
                        {editable && typeof onStatusChange === 'function' ? (
                            <select
                                value={order.status}
                                onChange={(e) => onStatusChange(order.id, e.target.value)}
                                className="px-3 py-1 rounded border mx-auto text-xs"
                            >
                                <option value="ORDER_PLACED">Ordered</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                            </select>
                        ) : (
                            <div className="mx-auto flex items-center gap-2">
                                <span className={`text-center px-3 py-1.5 rounded text-xs font-medium ${
                                    isCancelled ? 'bg-red-600 text-white' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {String(order.status).replace(/_/g, ' ').toLowerCase()}
                                </span>
                                {onCancel && (order.status === 'ORDER_PLACED' || order.status === 'PROCESSING') && !isCancelled && (
                                    <button onClick={() => onCancel(order.id)} className="text-red-600 bg-red-50 px-3 py-1 rounded text-xs">Cancel</button>
                                )}
                                {editable && (
                                    <button onClick={() => { if (typeof window !== 'undefined') window.location.href = `/store/orders/${order.id}` }} className="text-slate-700 bg-slate-100 px-3 py-1 rounded text-xs">View</button>
                                )}
                            </div>
                        )}
                    </div>
                </td>
            </tr>
            <tr>
                <td colSpan={4}>
                    <div className="border-b border-slate-300 w-6/7 mx-auto" />
                </td>
            </tr>
        </>
    )
}

export default OrderItem