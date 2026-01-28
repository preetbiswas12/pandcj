'use client'
import { Suspense } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, FilterIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"
import { useProductFilters } from "@/lib/hooks/useProductFilters"
import PriceRangeFilter from "@/components/filters/PriceRangeFilter"
import CategoryFilter from "@/components/filters/CategoryFilter"

function ShopContent() {
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

    // Use custom hook for all filter logic
    const {
        selectedCategory,
        selectedSort,
        priceRange,
        showMobileFilters,
        filteredProducts,
        activeFilterCount,
        hasActiveFilters,
        setShowMobileFilters,
        handleCategoryChange,
        handleSortChange,
        handlePriceChange,
        handleResetFilters,
    } = useProductFilters(products)

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
                            <CategoryFilter
                                categories={categories}
                                selectedCategory={selectedCategory}
                                onCategoryChange={handleCategoryChange}
                            />

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
                                <PriceRangeFilter
                                    priceRange={priceRange}
                                    onPriceChange={handlePriceChange}
                                />
                            </div>

                            {/* Reset Button */}
                            {hasActiveFilters && (
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
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex-shrink-0 relative"
                            >
                                <FilterIcon size={16} />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
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
                            <div className="md:hidden mb-4 bg-white rounded-lg border border-slate-200 p-4 space-y-6">
                                {/* Mobile Categories */}
                                <div>
                                    <CategoryFilter
                                        categories={categories}
                                        selectedCategory={selectedCategory}
                                        onCategoryChange={handleCategoryChange}
                                    />
                                </div>

                                {/* Mobile Price Range */}
                                <div className="border-t border-slate-200 pt-6">
                                    <PriceRangeFilter
                                        priceRange={priceRange}
                                        onPriceChange={handlePriceChange}
                                    />
                                </div>

                                {/* Mobile Reset Button */}
                                {hasActiveFilters && (
                                    <div className="border-t border-slate-200 pt-6">
                                        <button
                                            onClick={handleResetFilters}
                                            className="w-full py-2 px-3 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                                        >
                                            Clear All Filters
                                        </button>
                                    </div>
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