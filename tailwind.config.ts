import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D1117',
        'bg-secondary': '#161B22',
        'bg-tertiary': '#21262D',
        'brand-primary': '#00D26A',
        'brand-light': '#3EE992',
        'brand-dark': '#00A854',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8B949E',
        'text-muted': '#6E7681',
        'border-default': '#30363D',
        'border-active': '#00D26A',
        'error': '#FF6B6B',
        'warning': '#F59E0B',
        'success': '#00D26A',
        // 保留旧的颜色以兼容
        'tech-black': '#0D1117',
        'tech-gray': '#161B22',
        'border-gray': '#30363D',
        'neon-green': '#00D26A',
        'electric-orange': '#F59E0B',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
        'glow-brand': '0 0 20px rgba(0, 210, 106, 0.3)',
        'glow-brand-strong': '0 0 40px rgba(0, 210, 106, 0.5)',
        'glow-error': '0 0 20px rgba(255, 107, 107, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 210, 106, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 210, 106, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
