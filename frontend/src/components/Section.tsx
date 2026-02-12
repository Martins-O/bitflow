import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  children: ReactNode
}

export function Section({ id, title, children }: Props) {
  return (
    <section
      id={id}
      className="glass-card p-8 mb-8 relative overflow-hidden animate-fade-in"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bitcoin-orange/40 to-transparent" />
      <h3 className="text-2xl font-bold text-gray-100 text-center mb-6">
        {title}
      </h3>
      {children}
    </section>
  )
}
