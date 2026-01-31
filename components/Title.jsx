'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Title = ({ title, description, visibleButton = true, href = '' }) => {

    return (
        <div className='flex flex-col items-center text-center px-4'>
            <h2 className='text-2xl sm:text-3xl font-bold text-slate-800'>{title}</h2>
            <div className='flex flex-col sm:flex-row items-center gap-2 sm:gap-5 text-sm text-slate-600 mt-3'>
                <p className='max-w-lg'>{description}</p>
                {visibleButton && (
                    <Link href={href} className='text-yellow-600 font-semibold flex items-center gap-1 hover:text-yellow-700 transition-colors whitespace-nowrap'>
                        View more <ArrowRight size={14} />
                    </Link>
                )}
            </div>
        </div>
    )
}

export default Title