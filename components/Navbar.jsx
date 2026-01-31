'use client'
import { Search, ShoppingCart, Heart, Menu, X, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuth } from '@/app/providers/AuthProvider'
import toast from 'react-hot-toast'

const Navbar = () => {

    const router = useRouter();
    const { isSignedIn, user, logout } = useAuth()

    const [search, setSearch] = useState('')
    const cartCount = useSelector(state => state.cart.total)
    const wishlistCount = useSelector(state => state.wishlist?.items?.length || 0)
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        onScroll()
        window.addEventListener('scroll', onScroll)
        setMounted(true)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
    }

    const handleLogout = async () => {
        await logout()
        toast.success('Logged out successfully')
        router.push('/')
        setMobileOpen(false)
    }

    const navBgClass = scrolled ? 'bg-white text-slate-700 shadow-md' : 'bg-transparent text-white'

    return (
        <nav className={`fixed w-full top-0 left-0 z-50 transition-all ${navBgClass}`}>
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">

                    {/* Mobile Menu Button - Left Side */}
                    <div className="sm:hidden">
                        <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className={`p-2 rounded ${scrolled ? 'bg-white/20 text-slate-700' : 'text-white'}`}>
                            <Menu />
                        </button>
                    </div>

                    <Link href="/" className="relative text-4xl font-semibold flex items-center gap-3 sm:flex-none flex-1 justify-center sm:justify-start">
                        <span className="text-2xl font-semibold"><span className="text-yellow-600">P&C</span><span className="text-slate-500">Jewellery</span></span>
                    </Link>

                    {/* Desktop Menu */}}
                    <div className={`hidden sm:flex items-center gap-4 lg:gap-8 ${scrolled ? 'text-slate-600' : 'text-white'}`}>
                        <Link href="/">Home</Link>
                        <Link href="/shop">Shop</Link> 
                        <Link href="/orders">Orders</Link>
                        <Link href="/about">About</Link>

                        <form onSubmit={handleSearch} className={`hidden xl:flex items-center w-xs text-sm gap-2 px-4 py-3 rounded-full ${scrolled ? 'bg-slate-100' : 'bg-white/20'}`}>
                            <Search size={18} className="text-slate-600" />
                            <label htmlFor="desktop-search" className='sr-only'>Search products</label>
                            <input id="desktop-search" className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>

                        <Link href="/cart" className={`relative flex items-center gap-2 ${scrolled ? 'text-slate-600' : 'text-white'}`} aria-label={`Shopping cart, ${cartCount} items`}>
                            <ShoppingCart size={18} />
                            {cartCount > 0 && <span className="absolute -top-2 left-3 text-[10px] font-bold text-white bg-slate-600 size-4 rounded-full flex items-center justify-center">{cartCount}</span>}
                        </Link>
                        <Link href="/wishlist" className={`relative flex items-center gap-2 ${scrolled ? 'text-slate-600' : 'text-white'}`} aria-label={`Wishlist, ${wishlistCount} items`}>
                            <Heart size={18} />
                            {wishlistCount > 0 && <span className="absolute -top-2 left-3 text-[10px] font-bold text-white bg-rose-500 size-4 rounded-full flex items-center justify-center">{wishlistCount}</span>}
                        </Link>
                        {mounted && (
                            <>
                                {isSignedIn && user ? (
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm ${scrolled ? 'text-slate-600' : 'text-white'}`}>{user.fullName || user.email}</span>
                                        <button 
                                            onClick={handleLogout}
                                            className={`${scrolled ? 'px-6 py-2 bg-red-500 hover:bg-red-600 text-white' : 'px-6 py-2 bg-white text-red-500 hover:bg-gray-100'} transition rounded-full font-medium text-sm`}
                                        >
                                            Logout
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => router.push('/sign-in')} className={`${scrolled ? 'px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white' : 'px-6 py-2 bg-white text-indigo-600 hover:bg-gray-100'} transition rounded-full font-medium text-sm`}>
                                        Login
                                    </button>
                                )}
                            </>
                        )}

                    </div>

                    {/* Empty div for right spacing on mobile */}
                    <div className="sm:hidden w-10"></div>
                </div>
            </div>
            <hr className={`${scrolled ? 'border-gray-300' : 'border-transparent'} mt-0`} />

            {/* Mobile Overlay Menu */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 bg-white sm:hidden text-slate-700">
                    <div className="flex items-center justify-between p-4 border-b">
                        <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                            <span className="text-2xl font-semibold"><span className="text-yellow-600">P&C</span><span className="text-slate-500">Jewellery</span></span>
                        </Link>
                        <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2">
                            <X />
                        </button>
                    </div>
                    <div className="p-6">
                        <nav className="flex flex-col gap-3 mb-6 pb-6 border-b">
                            <Link href="/" onClick={() => setMobileOpen(false)} className="text-base font-medium hover:text-yellow-600 transition">Home</Link>
                            <Link href="/shop" onClick={() => setMobileOpen(false)} className="text-base font-medium hover:text-yellow-600 transition">Shop</Link>
                            <Link href="/orders" onClick={() => setMobileOpen(false)} className="text-base font-medium hover:text-yellow-600 transition">Orders</Link>
                            <Link href="/cart" onClick={() => setMobileOpen(false)} className="text-base font-medium hover:text-yellow-600 transition">Cart</Link>
                            <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="text-base font-medium hover:text-yellow-600 transition">Wishlist</Link>
                            <Link href="/about" onClick={() => setMobileOpen(false)} className="text-base font-medium hover:text-yellow-600 transition">About</Link>
                        </nav>

                        <form onSubmit={handleSearch} className="mt-6">
                            <div className="flex items-center gap-2 border rounded-full px-3 py-2">
                                <Search size={16} />
                                <label htmlFor="mobile-search" className='sr-only'>Search products</label>
                                <input id="mobile-search" className="w-full outline-none" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
                                <button type="submit" className="text-sm px-3 py-1 bg-yellow-600 text-white rounded">Search</button>
                            </div>
                        </form>

                        <div className="mt-6 pt-4 border-t">
                            {mounted && (
                                <>
                                    {isSignedIn && user ? (
                                        <div className="space-y-3">
                                            <div className="px-3 py-2 bg-slate-100 rounded text-sm">
                                                <p className="font-medium text-slate-900">{user.fullName || user.email}</p>
                                                <p className="text-xs text-slate-600">{user.email}</p>
                                            </div>
                                            <button 
                                                onClick={handleLogout}
                                                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center gap-2"
                                            >
                                                <LogOut size={16} />
                                                Logout
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => router.push('/sign-in')} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                                            Login
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar