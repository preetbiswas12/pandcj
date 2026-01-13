'use client'
import { XIcon, ArrowLeftIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from 'react-redux'
import { useRouter } from "next/navigation"
import { addAddress } from '@/lib/features/address/addressSlice'

const AddressModal = ({ setShowAddressModal, initial = {}, onSave = null }) => {

    const dispatch = useDispatch()
    const router = useRouter()

    const [address, setAddress] = useState({
        name: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        phone: ''
    })

    useEffect(() => {
        if (initial) setAddress(a => ({ ...a, ...initial }))
    }, [initial])

    const handleAddressChange = (e) => {
        let value = e.target.value
        
        // Strip leading 0 from phone number
        if (e.target.name === 'phone') {
            value = value.replace(/^0+/, '')
        }
        
        setAddress({
            ...address,
            [e.target.name]: value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        // basic validation for required billing fields
        if (!address.name || !address.email || !address.phone || !address.zip) {
            toast.error('Please fill name, email, phone and pincode')
            return
        }

        // add to redux
        try {
            dispatch(addAddress(address))
            if (typeof onSave === 'function') onSave(address)
            setShowAddressModal(false)
            toast.success('Address added')
        } catch (err) {
            console.error(err)
            toast.error('Could not save address')
        }
    }

    return (
        <form onSubmit={e => toast.promise(handleSubmit(e), { loading: 'Adding Address...' })} className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center p-4">
            <div className="flex flex-col gap-3 sm:gap-5 text-slate-700 w-full max-w-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl sm:text-3xl">Add New <span className="font-semibold">Address</span></h2>
                    <ArrowLeftIcon onClick={() => setShowAddressModal(false)} className="cursor-pointer hover:text-slate-500 transition" size={24} />
                </div>
                <input name="name" onChange={handleAddressChange} value={address.name} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="text" placeholder="Full name" required />
                <input name="email" onChange={handleAddressChange} value={address.email} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="email" placeholder="Email address" required />
                <input name="street" onChange={handleAddressChange} value={address.street} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="text" placeholder="Street / Address line" />
                <div className="flex gap-3 sm:gap-4">
                    <input name="city" onChange={handleAddressChange} value={address.city} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="text" placeholder="City" />
                    <input name="state" onChange={handleAddressChange} value={address.state} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="text" placeholder="State" />
                </div>
                <div className="flex gap-3 sm:gap-4">
                    <input name="zip" onChange={handleAddressChange} value={address.zip} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="text" placeholder="Pincode" required />
                    <input name="country" onChange={handleAddressChange} value={address.country} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="text" placeholder="Country" />
                </div>
                <input name="phone" onChange={handleAddressChange} value={address.phone} className="p-2 px-4 outline-none border border-slate-200 rounded w-full text-sm sm:text-base" type="text" placeholder="Mobile number" required />
                <button className="bg-slate-800 text-white text-xs sm:text-sm font-medium py-2.5 sm:py-3 rounded-md hover:bg-slate-900 active:scale-95 transition-all w-full">SAVE ADDRESS</button>
            </div>
            <XIcon size={24} className="absolute top-4 sm:top-5 right-4 sm:right-5 text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => setShowAddressModal(false)} />
        </form>
    )
}

export default AddressModal