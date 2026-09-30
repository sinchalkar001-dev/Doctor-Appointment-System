/** @type {import('tailwindcss').Config} */

// Every colour resolves to a CSS variable from src/styles/tokens.css, so the
// palette lives in one place and opacity modifiers (bg-action/10) still work.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const tonal = (name) => ({
  DEFAULT: token(`color-${name}`),
  soft: token(`color-${name}-soft`),
  line: token(`color-${name}-line`),
  ink: token(`color-${name}-ink`),
});

const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';

module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('color-canvas'),
        surface: {
          DEFAULT: token('color-surface'),
          muted: token('color-surface-muted'),
          sunken: token('color-surface-sunken'),
        },
        ink: {
          DEFAULT: token('color-ink'),
          soft: token('color-ink-soft'),
          muted: token('color-ink-muted'),
          inverse: token('color-ink-inverse'),
        },
        line: {
          DEFAULT: token('color-line'),
          strong: token('color-line-strong'),
        },
        action: {
          DEFAULT: token('color-action'),
          hover: token('color-action-hover'),
          active: token('color-action-active'),
          soft: token('color-action-soft'),
        },
        sign: {
          DEFAULT: token('color-sign'),
          raised: token('color-sign-raised'),
          line: token('color-sign-line'),
          muted: token('color-sign-muted'),
        },
        signal: token('color-signal'),
        focus: token('color-focus'),
        dept: {
          red: token('dept-red'),
          orange: token('dept-orange'),
          gold: token('dept-gold'),
          green: token('dept-green'),
          teal: token('dept-teal'),
          blue: token('dept-blue'),
          violet: token('dept-violet'),
          magenta: token('dept-magenta'),
        },
        pending: tonal('pending'),
        confirmed: tonal('confirmed'),
        cancelled: tonal('cancelled'),
        danger: {
          ...tonal('danger'),
          hover: token('color-danger-hover'),
          'on-sign': token('color-danger-on-sign'),
        },
      },
      fontFamily: {
        sans: [
          '"Atkinson Hyperlegible Next"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        chip: 'var(--radius-chip)',
        control: 'var(--radius-control)',
        plate: 'var(--radius-plate)',
        dialog: 'var(--radius-dialog)',
      },
      boxShadow: {
        raise: 'var(--shadow-raise)',
        overlay: 'var(--shadow-overlay)',
      },
      maxWidth: {
        page: '75rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'dialog-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'drawer-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'none' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // The directory board rows turn over like a split-flap sign on load.
        'flip-in': {
          from: { opacity: '0', transform: 'perspective(600px) rotateX(-80deg)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out both',
        'dialog-in': `dialog-in 220ms ${easeOut} both`,
        'drawer-in': `drawer-in 280ms ${easeOut} both`,
        'toast-in': `toast-in 220ms ${easeOut} both`,
        'menu-in': 'menu-in 140ms ease-out both',
        'flip-in': `flip-in 520ms ${easeOut} both`,
      },
    },
  },
  plugins: [],
};
