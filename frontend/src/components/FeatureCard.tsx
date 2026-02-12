interface FeatureCardProps {
    icon: React.ReactNode
    title: string
    description: string
    gradient: string
}

export function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
    return (
        <div className="group relative glass-card p-6 sm:p-8 hover:-translate-y-2 hover:shadow-card-hover transition-all duration-300 animate-fade-in">
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${gradient} rounded-t-2xl`} />

            {/* Icon */}
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-gray-100 mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>
        </div>
    )
}
