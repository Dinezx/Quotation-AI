/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stitch: {
          surface: '#fbf9f4',
          'surface-dim': '#dbdad5',
          'surface-bright': '#fbf9f4',
          'surface-container-lowest': '#ffffff',
          'surface-container-low': '#f5f3ee',
          'surface-container': '#f0eee9',
          'surface-container-high': '#eae8e3',
          'surface-container-highest': '#e4e2dd',
          'on-surface': '#1b1c19',
          'on-surface-variant': '#45474c',
          outline: '#76777d',
          'outline-variant': '#c6c6cd',
          line: '#E5E1D8',
          canvas: '#fbf9f4',
          navy: {
            DEFAULT: '#172033',
            dark: '#102134',
            border: '#1f2d47',
          },
          copper: {
            DEFAULT: '#B87333',
            hover: '#A46328',
            container: '#fdad67',
            light: '#ffdcc2',
          },
          muted: '#7f879f',
          inactive: '#bdc6e0',
          success: '#3F7D5A',
          warning: '#B7791F',
          error: '#A84A4A',
        },
        industrial: {
          dark: '#102134',
          slate: '#172033',
          muted: '#64748b',
          border: '#E5E1D8',
          borderDark: '#c6c6cd',
          surface: '#fbf9f4',
          card: '#ffffff',
          accent: '#B87333',
          accentHover: '#A46328',
          accentLight: '#fdf6ef',
          success: '#3F7D5A',
          successLight: '#ecfdf5',
          warning: '#B7791F',
          warningLight: '#fffbeb',
          danger: '#A84A4A',
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
