/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        // Responsive font sizes with clamp
        'xs-responsive': 'clamp(0.75rem, 2vw, 0.875rem)',
        'sm-responsive': 'clamp(0.875rem, 2.5vw, 1rem)',
        'base-responsive': 'clamp(1rem, 3vw, 1.125rem)',
        'lg-responsive': 'clamp(1.125rem, 3.5vw, 1.25rem)',
        'xl-responsive': 'clamp(1.25rem, 4vw, 1.5rem)',
        '2xl-responsive': 'clamp(1.5rem, 5vw, 2rem)',
        '3xl-responsive': 'clamp(2rem, 6vw, 3rem)',
      },
      spacing: {
        // Touch-friendly sizes
        'touch': '44px',
        'touch-sm': '36px',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      minHeight: {
        'touch': '44px',
        'touch-sm': '36px',
      },
      minWidth: {
        'touch': '44px',
        'touch-sm': '36px',
      },
      screens: {
        'xs': '475px',
        'touch': { 'raw': '(pointer: coarse)' },
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
