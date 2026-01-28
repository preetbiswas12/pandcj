'use client'
import React from 'react'

const PriceRangeFilter = ({ priceRange, onPriceChange }) => {
    const handleMinChange = (value) => {
        const newMin = parseInt(value)
        if (newMin <= priceRange[1]) {
            onPriceChange(newMin, priceRange[1])
        }
    }

    const handleMaxChange = (value) => {
        const newMax = parseInt(value)
        if (newMax >= priceRange[0]) {
            onPriceChange(priceRange[0], newMax)
        }
    }

    return (
        <div>
            <h4 className="font-medium text-slate-700 mb-4 text-sm">Price Range</h4>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-slate-600 mb-2">
                        Min Price: ₹{priceRange[0]}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="10000"
                        value={priceRange[0]}
                        onChange={(e) => handleMinChange(e.target.value)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-600 mb-2">
                        Max Price: ₹{priceRange[1]}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="10000"
                        value={priceRange[1]}
                        onChange={(e) => handleMaxChange(e.target.value)}
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
    )
}

export default PriceRangeFilter
