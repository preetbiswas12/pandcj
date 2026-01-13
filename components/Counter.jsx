'use client'
import { addToCart, removeFromCart, updateQuantity } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId }) => {

    const { items } = useSelector(state => state.cart);
    const dispatch = useDispatch();

    // Find the item in the cart
    const cartItem = items.find(item => item.id === productId);
    const quantity = cartItem?.quantity || 0;

    const addToCartHandler = () => {
        if (cartItem) {
            // If item exists, update quantity
            dispatch(updateQuantity({ id: productId, quantity: quantity + 1 }))
        } else {
            // If item doesn't exist, this shouldn't happen in Counter context
            dispatch(addToCart({ productId }))
        }
    }

    const removeFromCartHandler = () => {
        if (quantity > 1) {
            dispatch(updateQuantity({ id: productId, quantity: quantity - 1 }))
        } else {
            dispatch(removeFromCart({ id: productId }))
        }
    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none">-</button>
            <p className="p-1">{quantity}</p>
            <button onClick={addToCartHandler} className="p-1 select-none">+</button>
        </div>
    )
}

export default Counter