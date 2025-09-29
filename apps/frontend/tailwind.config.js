/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode primary system (teal-based)
        primary: {
          50: '#E6F7FF',
          100: '#B3E0EF',  // disabled state
          200: '#90E0EF',
          300: '#74D0E4',
          400: '#5BBACD',
          500: '#0096C7',  // main accent
          600: '#0077A5',  // hover
          700: '#005F84',  // focus
          800: '#003D52',
          900: '#002A36',
          disabled: '#B3E0EF',
        },

        secondary: {
          50: '#E6F7FF',
          100: '#D6F4F9',  // disabled
          200: '#B3E0EF',
          300: '#90E0EF',  // main
          400: '#74D0E4',  // hover
          500: '#5BBACD',  // focus
          600: '#4A9CB0',
          700: '#3A7C93',
          800: '#2A5B75',
          900: '#1A3B58',
        },

        // Background system with proper dark mode support
        background: {
          50: '#ffffff',   // light mode primary
          100: '#f8fafc',  // light mode secondary
          200: '#f1f5f9',  // light mode tertiary
          800: '#1e293b',  // dark mode tertiary
          900: '#0f172a',  // dark mode secondary
          950: '#121212',  // dark mode primary (from specs)
        },

        // Surface system for cards/components
        surface: {
          50: '#ffffff',   // light cards
          100: '#f8fafc',  // light elevated
          200: '#f1f5f9',  // light hover
          700: '#334155',  // dark hover
          800: '#1e293b',  // dark elevated
          900: '#0f172a',  // dark cards
        },

        // Text system with proper contrast
        text: {
          50: '#f8fafc',   // dark mode primary text
          100: '#f1f5f9',  // dark mode secondary text
          200: '#e2e8f0',  // dark mode tertiary text
          600: '#475569',  // light mode tertiary text
          700: '#334155',  // light mode secondary text
          900: '#0f172a',  // light mode primary text
        },

        // Update success/error to match specs
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#52B788',  // from specs
          600: '#3D936B',
          700: '#2F7353',
          800: '#1f5f3f',
          900: '#14532d',
        },

        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#E63946',  // light mode (from specs)
          600: '#CC2E3B',
          700: '#A92632',
          800: '#7f1d1d',
          900: '#FF5C66',  // dark mode error (from specs)
        },
      },

      // Extend spacing with 8pt grid system
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        '0.5': '4px',   // 4pt
        '1': '8px',     // 8pt (maps to Tailwind's existing system)
        '1.5': '12px',  // 12pt
        '2': '16px',    // 16pt
        '3': '24px',    // 24pt
        '4': '32px',    // 32pt
        '5': '40px',    // 40pt
        '6': '48px',    // 48pt
      },

      // Add typography scale from specs
      fontSize: {
        'h1': ['32px', { lineHeight: '1.25', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
        'small': ['12px', { lineHeight: '1.3', fontWeight: '500' }],
      },

      // Add font families for multi-language support
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'sans-ar': ['Cairo', 'Tajawal', 'Noto Sans Arabic', 'sans-serif'],
      },

      // RTL-aware utilities
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        '0.5': '4px',   // 4pt
        '1': '8px',     // 8pt (maps to Tailwind's existing system)
        '1.5': '12px',  // 12pt
        '2': '16px',    // 16pt
        '3': '24px',    // 24pt
        '4': '32px',    // 32pt
        '5': '40px',    // 40pt
        '6': '48px',    // 48pt
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 