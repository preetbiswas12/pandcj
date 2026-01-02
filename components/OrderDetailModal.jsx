'use client'
import React from 'react'

export default function OrderDetailModal({ open, order, onClose }) {
  if (!open || !order) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="pointer-events-auto fixed right-6 bottom-6 w-96 max-h-[80vh] overflow-auto bg-white rounded-lg shadow-xl p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">Order Details</h3>
        </div>

        <section className="mt-3 mb-4">
          <h4 className="font-medium">Customer</h4>
          <p className="text-sm text-slate-600">{order.address?.name || 'N/A'}</p>
          <p className="text-sm text-slate-600">{order.address?.street}</p>
          <p className="text-sm text-slate-600">{order.address?.city} {order.address?.state} {order.address?.zip}</p>
          <p className="text-sm text-slate-600">{order.address?.country}</p>
          <p className="text-sm text-slate-600">Phone: {order.address?.phone}</p>
          <p className="text-sm text-slate-600">Email: {order.address?.email || 'N/A'}</p>
        </section>

        <section className="mb-4">
          <h4 className="font-medium">Order Info</h4>
          <p className="text-sm text-slate-600">Order ID: {order.id}</p>
          <p className="text-sm text-slate-600">Placed on: {new Date(order.createdAt).toLocaleString()}</p>
          <p className="text-sm text-slate-600">Payment: {order.paymentMethod || 'N/A'}</p>
          <p className="text-sm text-slate-600">Status: {String(order.status).replace(/_/g, ' ')}</p>
          <p className="text-sm text-slate-600">Total: {order.total}</p>
        </section>

        <section className="mb-4">
          <h4 className="font-medium">Items</h4>
          <ul className="text-sm text-slate-700">
            {(order?.orderItems || []).map((it, i) => (
              <li key={i} className="py-2 border-b last:border-b-0">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{(it.product && it.product.name) || it.product?.id || 'Product'}</div>
                    <div className="text-xs text-slate-500">Qty: {it.quantity}</div>
                  </div>
                  <div className="text-sm text-slate-600">{it.price}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded">Close</button>
        </div>
      </div>
    </div>
  )
}
