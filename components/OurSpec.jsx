"use client"
import { useState } from 'react'

const OurSpec = () => {
	const [email, setEmail] = useState('')

	const handleSubmit = (e) => {
		e.preventDefault()
		// placeholder: hook to your subscribe API
		console.log('subscribe', email)
		setEmail('')
	}

	return (
		<section className="relative">
			<div
				className="bg-cover bg-center h-40 sm:h-55 md:h-75 lg:h-90"
				style={{ backgroundImage: "url('/images/subscribe.jpg')" }}
			>
				<div className="absolute inset-0 bg-black/50"></div>
				<div className="container mx-auto px-4 sm:px-6 relative z-10 h-full flex items-center">
					<div className="w-full flex flex-col items-center justify-center sm:items-start sm:justify-between gap-4 sm:gap-6">
						<div className="max-w-lg text-white text-center sm:text-left">
							<h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">Subscribe to get discount and affordable prices of jewellery right on release.</h2>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

export default OurSpec
