import { type ReactNode } from 'react'

interface FormFieldProps {
    label: string
    id: string
    icon?: ReactNode
    error?: string
    children: ReactNode
}

export function FormField({ label, id, icon, error, children }: FormFieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <label htmlFor={id} className="text-sm font-semibold text-gray-400">
                    {label}
                </label>
                {error && <span className="text-xs text-red-400 animate-fade-in">{error}</span>}
            </div>

            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-bitcoin-orange transition-colors z-10 pointer-events-none">
                        {icon}
                    </div>
                )}
                <div>
                    {children}
                </div>
            </div>
        </div>
    )
}
