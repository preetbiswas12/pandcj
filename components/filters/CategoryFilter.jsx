'use client'
import React from 'react'

const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }) => {
    return (
        <div className="mb-6">
            <h4 className="font-medium text-slate-700 mb-3 text-sm">Categories</h4>
            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="category"
                        value=""
                        checked={selectedCategory === ''}
                        onChange={(e) => onCategoryChange(e.target.value)}
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
                            onChange={(e) => onCategoryChange(e.target.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-600">{cat}</span>
                    </label>
                ))}
            </div>
        </div>
    )
}

export default CategoryFilter
