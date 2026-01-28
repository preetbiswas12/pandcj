'use client'
import { Suspense, useState, useEffect } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, FilterIcon, ChevronDownIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"

function ShopContent() {

    // get query params ?search=abc
    const searchParams = useSearchParams()
    const search = searchParams.get('search')
    const router = useRouter()

    const products = useSelector(state => state.product.list || [])
    
    const categories = ['Earrings', 'Necklace', 'Heavy Necklace', 'Fashionable Earrings', 'Others']
    const sortOptions = [
        { label: 'Newest', value: 'newest' },
        { label: 'Price: Low to High', value: 'price_asc' },
        { label: 'Price: High to Low', value: 'price_desc' },
        { label: 'Name: A to Z', value: 'name_asc' },
    ]

    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedSort, setSelectedSort] = useState('newest')
    const [showMobileFilters, setShowMobileFilters] = useState(false)
    const [filteredProducts, setFilteredProducts] = useState([])
    const [priceRange, setPriceRange] = useState([0, 10000])

    // Filter and sort products
    useEffect(() => {
        let result = [...products] // Create a copy to avoid mutating Redux state

        // Filter by search
        if (search) {
            result = result.filter(product =>
                product.name.toLowerCase().includes(search.toLowerCase())
            )
        }

        // Filter by category
        if (selectedCategory) {
            result = result.filter(product =>
                product.category === selectedCategory
            )
        }

        // Filter by price range
        result = result.filter(product =>
            product.price >= priceRange[0] && product.price <= priceRange[1]
        )

        // Sort products (now safe because we have a copy)
        if (selectedSort === 'price_asc') {
            result.sort((a, b) => a.price - b.price)
        } else if (selectedSort === 'price_desc') {
            result.sort((a, b) => b.price - a.price)
        } else if (selectedSort === 'name_asc') {
            result.sort((a, b) => a.name.localeCompare(b.name))
        } else {
            // newest (default) - reverse order by creation
            result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        }

        setFilteredProducts(result)
    }, [products, search, selectedCategory, selectedSort, priceRange])

    const handleCategoryChange = (category) => {
        setSelectedCategory(category)
        setShowMobileFilters(false)
    }

    const handleSortChange = (sort) => {
        setSelectedSort(sort)
    }

    const handleResetFilters = () => {
        setSelectedCategory('')
        setSelectedSort('newest')
        setPriceRange([0, 10000])
    }

    return (
        <div className="min-h-[70vh] mx-3 sm:mx-6 md:mx-8">
            <div className="max-w-7xl mx-auto">
                <h1 onClick={() => router.push('/shop')} className="text-lg sm:text-xl md:text-2xl text-slate-500 my-4 sm:my-6 flex items-center gap-2 cursor-pointer hover:text-slate-700 transition"> 
                    {search && <MoveLeftIcon size={16} className="sm:size-[20px]" />}  All <span className="text-slate-700 font-medium">Products</span>
                </h1>

                <div className="flex gap-4 md:gap-6 mb-6">
                    {/* Desktop Filters */}
                    <div className="hidden md:block w-48 flex-shrink-0">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h3 className="font-semibold text-slate-800 mb-4">Filter & Sort</h3>

                            {/* Categories */}
                            <div className="mb-6">
                                <h4 className="font-medium text-slate-700 mb-3 text-sm">Categories</h4>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="category"
                                            value=""
                                            checked={selectedCategory === ''}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-600">All Categories</span>
                                    </label>
                                    {categories.map((cat) => (
                                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="category"
                                                value={cat}
                                                checked={selectedCategory === cat}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-600">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sort */}
                            <div className="mb-6 pb-6 border-b border-slate-200">
                                <h4 className="font-medium text-slate-700 mb-3 text-sm">Sort By</h4>
                                <div className="space-y-2">
                                    {sortOptions.map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="sort"
                                                value={option.value}
                                                checked={selectedSort === option.value}
                                                onChange={(e) => handleSortChange(e.target.value)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-600">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h4 className="font-medium text-slate-700 mb-4 text-sm">Price Range</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-2">Min Price: ₹{priceRange[0]}</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10000"
                                            value={priceRange[0]}
                                            onChange={(e) => {
                                                const newMin = parseInt(e.target.value);
                                                if (newMin <= priceRange[1]) {
                                                    setPriceRange([newMin, priceRange[1]]);
                                                }
                                            }}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-2">Max Price: ₹{priceRange[1]}</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10000"
                                            value={priceRange[1]}
                                            onChange={(e) => {
                                                const newMax = parseInt(e.target.value);
                                                if (newMax >= priceRange[0]) {
                                                    setPriceRange([priceRange[0], newMax]);
                                                }
                                            }}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                        />
                                    </div>
                                    <div className="pt-2 border-t border-slate-100">
                                        <p className="text-sm font-semibold text-slate-700">
                                            ₹{priceRange[0]} - ₹{priceRange[1]}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Reset Button */}
                            {(selectedCategory || selectedSort !== 'newest' || priceRange[0] !== 0 || priceRange[1] !== 10000) && (
                                <button
                                    onClick={handleResetFilters}
                                    className="w-full py-2 px-3 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Mobile Filter Bar */}
                        <div className="md:hidden mb-4 flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex-shrink-0"
                            >
                                <FilterIcon size={16} />
                                Filters
                            </button>
                            <div className="flex-1 min-w-[150px]">
                                <select
                                    value={selectedSort}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Mobile Filters Dropdown */}
                        {showMobileFilters && (
                            <div className="md:hidden mb-4 bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="font-medium text-slate-700 mb-3">Categories</h4>
                                <div className="space-y-2 mb-6 pb-6 border-b border-slate-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mobile-category"
                                            value=""
                                            checked={selectedCategory === ''}
                                            onChange={(e) => handleCategoryChange(e.target.value)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-600">All Categories</span>
                                    </label>
                                    {categories.map((cat) => (
                                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="mobile-category"
                                                value={cat}
                                                checked={selectedCategory === cat}
                                                onChange={(e) => handleCategoryChange(e.target.value)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-600">{cat}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Mobile Price Range */}
                                <div className="mb-6">
                                    <h4 className="font-medium text-slate-700 mb-4 text-sm">Price Range</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-2">Min Price: ₹{priceRange[0]}</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="10000"
                                                value={priceRange[0]}
                                                onChange={(e) => {
                                                    const newMin = parseInt(e.target.value);
                                                    if (newMin <= priceRange[1]) {
                                                        setPriceRange([newMin, priceRange[1]]);
                                                    }
                                                }}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-2">Max Price: ₹{priceRange[1]}</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="10000"
                                                value={priceRange[1]}
                                                onChange={(e) => {
                                                    const newMax = parseInt(e.target.value);
                                                    if (newMax >= priceRange[0]) {
                                                        setPriceRange([priceRange[0], newMax]);
                                                    }
                                                }}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                            />
                                        </div>
                                        <div className="pt-2 border-t border-slate-100">
                                            <p className="text-sm font-semibold text-slate-700">
                                                ₹{priceRange[0]} - ₹{priceRange[1]}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {selectedCategory && (
                                    <button
                                        onClick={() => handleCategoryChange('')}
                                        className="w-full py-2 px-3 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                                    >
                                        Clear Category
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Product Count */}
                        <div className="mb-4 text-sm text-slate-600">
                            Showing <span className="font-medium">{filteredProducts.length}</span> products
                            {selectedCategory && ` in ${selectedCategory}`}
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mx-auto mb-32">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
                            ) : (
                                <div className="col-span-full py-12 text-center text-slate-500">
                                    <p className="mb-2">No products found</p>
                                    {(selectedCategory || selectedSort !== 'newest') && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Clear filters and try again
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default function Shop() {
  return (
    <Suspense fallback={<div>Loading shop...</div>}>
      <ShopContent />
    </Suspense>
  );
}