/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          dark: '#0f172a',
          slate: '#1e293b',
          muted: '#64748b',
          border: '#e2e8f0',
          borderDark: '#cbd5e1',
          surface: '#f8fafc',
          card: '#ffffff',
          accent: '#2563eb',
          accentHover: '#1d4ed8',
          accentLight: '#eff6ff',
          success: '#059669',
          successLight: '#ecfdf5',
          warning: '#d97706',
          warningLight: '#fffbeb',
          danger: '#dc2626',
          dangerLight: '#fef2f2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'crisp': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'industrial': '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
        'a4': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};
