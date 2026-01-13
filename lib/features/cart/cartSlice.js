import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        items: [],
        total: 0,
    },
    reducers: {
        addToCart: (state, action) => {
            // Ensure state.items exists
            if (!Array.isArray(state.items)) {
                state.items = []
            }
            
            const { id, name, price, image, quantity = 1, product } = action.payload
            
            // Check if product already exists in cart
            const existingItem = state.items.find(item => item.id === id)
            
            if (existingItem) {
                // Increase quantity if it already exists
                existingItem.quantity = (existingItem.quantity || 1) + (quantity || 1)
            } else {
                // Add new item to cart
                state.items.push({
                    id,
                    name,
                    price,
                    image,
                    quantity: quantity || 1,
                    product: product || {}
                })
            }
            
            // Update total count
            state.total = state.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        },
        removeFromCart: (state, action) => {
            if (!Array.isArray(state.items)) {
                state.items = []
            }
            
            const { id } = action.payload
            const item = state.items.find(item => item.id === id)
            
            if (item) {
                if (item.quantity > 1) {
                    item.quantity--
                } else {
                    state.items = state.items.filter(item => item.id !== id)
                }
            }
            
            state.total = state.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        },
        deleteItemFromCart: (state, action) => {
            if (!Array.isArray(state.items)) {
                state.items = []
            }
            
            const { id } = action.payload
            state.items = state.items.filter(item => item.id !== id)
            state.total = state.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        },
        updateQuantity: (state, action) => {
            if (!Array.isArray(state.items)) {
                state.items = []
            }
            
            const { id, quantity } = action.payload
            const item = state.items.find(item => item.id === id)
            
            if (item) {
                if (quantity <= 0) {
                    state.items = state.items.filter(item => item.id !== id)
                } else {
                    item.quantity = quantity
                }
            }
            
            state.total = state.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        },
        clearCart: (state) => {
            state.items = []
            state.total = 0
        },
    }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart, updateQuantity } = cartSlice.actions

export default cartSlice.reducer
