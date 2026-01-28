import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export const useProductFilters = (products) => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const search = searchParams.get('search')

    // Initialize from URL params
    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedSort, setSelectedSort] = useState('newest')
    const [priceRange, setPriceRange] = useState([0, 10000])
    const [showMobileFilters, setShowMobileFilters] = useState(false)

    // Initialize from URL on mount
    useEffect(() => {
        const category = searchParams.get('category') || ''
        const sort = searchParams.get('sort') || 'newest'
        const minPrice = parseInt(searchParams.get('minPrice') || '0')
        const maxPrice = parseInt(searchParams.get('maxPrice') || '10000')

        setSelectedCategory(category)
        setSelectedSort(sort)
        setPriceRange([minPrice, maxPrice])
    }, [])

    // Update URL when filters change
    const updateURL = (category, sort, minPrice, maxPrice) => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (category) params.set('category', category)
        if (sort !== 'newest') params.set('sort', sort)
        if (minPrice !== 0) params.set('minPrice', minPrice)
        if (maxPrice !== 10000) params.set('maxPrice', maxPrice)

        const queryString = params.toString()
        router.push(`/shop${queryString ? '?' + queryString : ''}`)
    }

    // Handle category change
    const handleCategoryChange = (category) => {
        setSelectedCategory(category)
        updateURL(category, selectedSort, priceRange[0], priceRange[1])
        setShowMobileFilters(false)
    }

    // Handle sort change
    const handleSortChange = (sort) => {
        setSelectedSort(sort)
        updateURL(selectedCategory, sort, priceRange[0], priceRange[1])
    }

    // Handle price change
    const handlePriceChange = (minPrice, maxPrice) => {
        setPriceRange([minPrice, maxPrice])
        updateURL(selectedCategory, selectedSort, minPrice, maxPrice)
    }

    // Reset all filters
    const handleResetFilters = () => {
        setSelectedCategory('')
        setSelectedSort('newest')
        setPriceRange([0, 10000])
        router.push(search ? `/shop?search=${search}` : '/shop')
    }

    // Memoized filtered and sorted products
    const filteredProducts = useMemo(() => {
        let result = [...products]

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

        // Sort products
        if (selectedSort === 'price_asc') {
            result.sort((a, b) => a.price - b.price)
        } else if (selectedSort === 'price_desc') {
            result.sort((a, b) => b.price - a.price)
        } else if (selectedSort === 'name_asc') {
            result.sort((a, b) => a.name.localeCompare(b.name))
        } else {
            // newest (default)
            result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        }

        return result
    }, [products, search, selectedCategory, selectedSort, priceRange])

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (selectedCategory) count++
        if (selectedSort !== 'newest') count++
        if (priceRange[0] !== 0 || priceRange[1] !== 10000) count++
        return count
    }, [selectedCategory, selectedSort, priceRange])

    // Check if any filters are active
    const hasActiveFilters = activeFilterCount > 0

    return {
        // State
        selectedCategory,
        selectedSort,
        priceRange,
        showMobileFilters,
        filteredProducts,
        activeFilterCount,
        hasActiveFilters,
        
        // Setters
        setShowMobileFilters,
        
        // Handlers
        handleCategoryChange,
        handleSortChange,
        handlePriceChange,
        handleResetFilters,
    }
}
