/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#0A0D1A',
          secondary: '#111827',
          tertiary: '#1F2937',
        },
        'bitcoin-orange': {
          DEFAULT: '#F7931A',
          light: '#FFB347',
          dark: '#E07D00',
          50: '#FFF8F0',
          100: '#FFECD0',
          200: '#FFD9A0',
          300: '#FFC671',
          400: '#FFB347',
          500: '#F7931A',
          600: '#E07D00',
          700: '#B86500',
          800: '#8F4E00',
          900: '#663700',
        },
        'starknet-purple': {
          DEFAULT: '#A594F9',
          light: '#C4B5FD',
          dark: '#7C3AED',
        },
        'dispute-red': {
          DEFAULT: '#EF4444',
          light: '#FCA5A5',
          dark: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
      backgroundImage: {
        'orange-gradient': 'linear-gradient(135deg, #F7931A 0%, #E07D00 100%)',
        'orange-gradient-hover': 'linear-gradient(135deg, #FFB347 0%, #F7931A 100%)',
        'success-gradient': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'danger-gradient': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        'purple-gradient': 'linear-gradient(135deg, #A594F9 0%, #7C3AED 100%)',
      },
      boxShadow: {
        'glow-orange': '0 0 20px rgba(247, 147, 26, 0.3)',
        'glow-orange-lg': '0 0 40px rgba(247, 147, 26, 0.4)',
        'glow-purple': '0 0 20px rgba(165, 148, 249, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 64px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 20px 60px rgba(247, 147, 26, 0.15), 0 0 30px rgba(247, 147, 26, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'spin-slow': 'spin 1s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 2s infinite',
        'grid-shift': 'gridShift 20s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        gridShift: {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-50px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
