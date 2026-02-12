import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'

export function HomePage() {
  return (
    <div className="space-y-0">
      <Hero />
      <Features />
      <HowItWorks />
    </div>
  )
}
