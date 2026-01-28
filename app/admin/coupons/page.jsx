'use client'
import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { DeleteIcon } from "lucide-react"

export default function AdminCoupons() {

    const [coupons, setCoupons] = useState([])

    const [newCoupon, setNewCoupon] = useState({
        code: '',
        description: '',
        discount: '',
        forNewUser: false,
        forMember: false,
        isPublic: false,
        applyToShipping: false,
        expiresAt: new Date(),
        noExpiry: false,
        minimumOrderAmount: 0
    })

    const fetchCoupons = async () => {
        try {
            const res = await fetch('/api/admin/coupons', { credentials: 'include' })
            if (!res.ok) { setCoupons([]); return }
            const data = await res.json()
            setCoupons(data || [])
        } catch (e) { console.error(e); setCoupons([]) }
    }

    const handleAddCoupon = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                code: newCoupon.code.trim(),
                description: newCoupon.description,
                discount: Number(newCoupon.discount),
                forNewUser: !!newCoupon.forNewUser,
                forMember: !!newCoupon.forMember,
                isPublic: !!newCoupon.isPublic,
                applyToShipping: !!newCoupon.applyToShipping,
                noExpiry: !!newCoupon.noExpiry,
                minimumOrderAmount: Number(newCoupon.minimumOrderAmount) || 0,
                expiresAt: newCoupon.noExpiry ? null : (typeof newCoupon.expiresAt === 'string' ? newCoupon.expiresAt : new Date(newCoupon.expiresAt).toISOString())
            }
            const res = await fetch('/api/admin/coupons', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (res.status === 409) { toast.error('Coupon code already exists'); return }
            if (!res.ok) throw new Error('Add failed')
            const created = await res.json()
            setCoupons(prev => [created, ...prev])
            setNewCoupon({ code: '', description: '', discount: '', forNewUser: false, forMember: false, isPublic: false, applyToShipping: false, expiresAt: new Date(), noExpiry: false, minimumOrderAmount: 0 })
            toast.success('Coupon added')
        } catch (e) { console.error(e); toast.error('Could not add coupon') }
    }

    const handleChange = (e) => {
        setNewCoupon({ ...newCoupon, [e.target.name]: e.target.value })
    }

    const deleteCoupon = async (code) => {
        if (!code) {
            throw new Error('Coupon code is missing')
        }
        try {
            const res = await fetch(`/api/admin/coupons/${code}`, { method: 'DELETE', credentials: 'include' })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Delete failed')
            }
            setCoupons(prev => prev.filter(c => c.code !== code))
            return true
        } catch (e) { 
            console.error('Delete error:', e)
            throw new Error(e.message || 'Could not delete coupon')
        }
    }

    useEffect(() => {
        fetchCoupons();
    }, [])

    return (
        <div className="text-slate-500 mb-40">

            {/* Add Coupon */}
            <form onSubmit={(e) => toast.promise(handleAddCoupon(e), { loading: "Adding coupon..." })} className="max-w-sm text-sm">
                <h2 className="text-2xl">Add <span className="text-slate-800 font-medium">Coupons</span></h2>
                <div className="flex gap-2 max-sm:flex-col mt-2">
                    <input type="text" placeholder="Coupon Code" className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="code" value={newCoupon.code} onChange={handleChange} required
                    />
                    <input type="number" placeholder="Coupon Discount (%)" min={1} max={100} className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="discount" value={newCoupon.discount} onChange={handleChange} required
                    />
                </div>
                <input type="text" placeholder="Coupon Description" className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                    name="description" value={newCoupon.description} onChange={handleChange} required
                />

                <div className="flex gap-2 max-sm:flex-col mt-2">
                    <input type="number" placeholder="Minimum Order Amount (₹)" min={0} step={0.01} className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="minimumOrderAmount" value={newCoupon.minimumOrderAmount} onChange={handleChange}
                    />
                </div>

                <label>
                    <p className="mt-3">Coupon Expiry Date</p>
                    <input type="date" placeholder="Coupon Expires At" className="w-full mt-1 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="expiresAt" value={format(newCoupon.expiresAt, 'yyyy-MM-dd')} onChange={handleChange} disabled={newCoupon.noExpiry}
                    />
                </label>

                <div className="mt-5">
                    <div className="flex gap-2 mt-3">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input type="checkbox" className="sr-only peer"
                                name="noExpiry" checked={newCoupon.noExpiry}
                                onChange={(e) => setNewCoupon({ ...newCoupon, noExpiry: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-yellow-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>No Expiry Date</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input type="checkbox" className="sr-only peer"
                                name="forNewUser" checked={newCoupon.forNewUser}
                                onChange={(e) => setNewCoupon({ ...newCoupon, forNewUser: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-yellow-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>For New User</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input type="checkbox" className="sr-only peer"
                                name="forMember" checked={newCoupon.forMember}
                                onChange={(e) => setNewCoupon({ ...newCoupon, forMember: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-yellow-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>For Member</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input type="checkbox" className="sr-only peer"
                                name="applyToShipping" checked={newCoupon.applyToShipping}
                                onChange={(e) => setNewCoupon({ ...newCoupon, applyToShipping: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-yellow-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>Apply to Shipping</p>
                    </div>
                </div>
                <button className="mt-4 p-2 px-10 rounded bg-slate-700 text-white active:scale-95 transition">Add Coupon</button>
            </form>

            {/* List Coupons */}
            <div className="mt-14">
                <h2 className="text-2xl">List <span className="text-slate-800 font-medium">Coupons</span></h2>
                <div className="overflow-x-auto mt-4 rounded-lg border border-slate-200 max-w-4xl">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Code</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Description</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Discount</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Min Order</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Expires At</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">New User</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">For Member</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Apply to Shipping</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {coupons.map((coupon) => (
                                <tr key={coupon.code} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 font-medium text-slate-800">{coupon.code}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.description}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.discount}%</td>
                                    <td className="py-3 px-4 text-slate-800">₹{coupon.minimumOrderAmount || 0}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.noExpiry ? 'Never' : format(coupon.expiresAt, 'yyyy-MM-dd')}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.forNewUser ? 'Yes' : 'No'}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.forMember ? 'Yes' : 'No'}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.applyToShipping ? 'Yes' : 'No'}</td>
                                    <td className="py-3 px-4 text-slate-800">
                                        <DeleteIcon onClick={() => {
                                            if (!coupon.code) {
                                                toast.error('Invalid coupon code')
                                                return
                                            }
                                            toast.promise(deleteCoupon(coupon.code), { loading: "Deleting coupon...", success: "Coupon deleted", error: (err) => err.message })
                                        }} className="w-5 h-5 text-red-500 hover:text-red-800 cursor-pointer transition" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}