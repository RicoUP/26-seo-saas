import { Link } from 'react-router-dom'
import { Check, Star, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

function CountdownTimer() {
    const [timeLeft, setTimeLeft] = useState({ days: 14, hours: 0, minutes: 0, seconds: 0 })
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { days, hours, minutes, seconds } = prev
                if (seconds > 0) seconds--
                else if (minutes > 0) { minutes--; seconds = 59 }
                else if (hours > 0) { hours--; minutes = 59; seconds = 59 }
                else if (days > 0) { days--; hours = 23; minutes = 59; seconds = 59 }
                return { days, hours, minutes, seconds }
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])
    return (
        <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.days}d</span>
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.hours}h</span>
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.minutes}m</span>
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.seconds}s</span>
        </div>
    )
}

const plans = [
    {
        name: 'Starter',
        price: 49,
        oldPrice: 79,
        description: 'Perfect for 1 website, solo business owners',
        features: ['50 keyword lookups/mo', '10 AI blog posts/mo', '0 local pages', '1-click WordPress publish', 'Manual rank tracker', 'Monthly email digest', '7-day money-back guarantee'],
        cta: 'Get Started',
        popular: false
    },
    {
        name: 'Growth',
        price: 99,
        oldPrice: 149,
        description: 'For multi-site businesses and small agencies',
        features: ['200 keyword lookups/mo', '25 AI blog posts/mo', '5 local pages/mo', '1-click WordPress publish', 'Manual rank tracker', 'Monthly email digest', 'Priority support', '7-day money-back guarantee'],
        cta: 'Start Growing',
        popular: true
    },
    {
        name: 'Pro',
        price: 199,
        oldPrice: 299,
        description: 'For agencies scaling with pSEO',
        features: ['1,000 keyword lookups/mo', 'Unlimited AI blog posts', '20 local pages/mo', '1-click WordPress publish', 'Manual rank tracker', 'Weekly email digest', 'Priority support', 'White-label exports', '7-day money-back guarantee'],
        cta: 'Go Pro',
        popular: false
    }
]

export default function Pricing() {
    const { isAuthenticated } = useAuth()

    return (
        <div className="flex flex-col">
            {/* FOMO Banner */}
            <div className="hero-gradient text-white py-2.5 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap text-sm">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">Prices increase in</span>
                    <CountdownTimer />
                    <span>— lock in current prices forever</span>
                </div>
            </div>

            <div className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">Simple pricing</h1>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            Replace your $2,000/mo SEO agency with AI. One flat price. No hidden fees.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {plans.map((plan, i) => (
                            <div key={i} className={`relative rounded-2xl border ${plan.popular ? 'border-brand-500 shadow-xl shadow-brand-500/10' : 'border-gray-200 shadow-sm'} bg-white overflow-hidden`}>
                                {plan.popular && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-600 to-accent-600 text-white text-center py-2 text-sm font-semibold">
                                        <div className="flex items-center justify-center gap-1">
                                            <Star className="w-4 h-4 fill-white" /> Most Popular
                                        </div>
                                    </div>
                                )}
                                <div className={`p-8 ${plan.popular ? 'pt-14' : ''}`}>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                                    <div className="flex items-end gap-2 mb-1">
                                        <span className="text-5xl font-extrabold text-gray-900">${plan.price}</span>
                                        <span className="text-gray-500 mb-1">/mo</span>
                                    </div>
                                    <p className="text-sm text-gray-400 line-through mb-6">${plan.oldPrice}/mo soon</p>
                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((f, j) => (
                                            <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    {isAuthenticated ? (
                                        <Link to="/settings" className="w-full py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold rounded-xl hover:shadow-lg transition-shadow text-center block">
                                            Manage Plan
                                        </Link>
                                    ) : (
                                        <Link to="/register" className="w-full py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold rounded-xl hover:shadow-lg transition-shadow text-center block">
                                            {plan.cta}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-gray-500 text-sm">
                            All plans include a 7-day money-back guarantee. No questions asked.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
