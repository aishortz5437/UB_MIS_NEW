import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // UrbanBuild custom colors
        ub: {
          navy: "hsl(var(--ub-navy))",
          "navy-light": "hsl(var(--ub-navy-light))",
          slate: "hsl(var(--ub-slate))",
          amber: "hsl(var(--ub-amber))",
          "amber-light": "hsl(var(--ub-amber-light))",
          success: "hsl(var(--ub-success))",
          "success-light": "hsl(var(--ub-success-light))",
          warning: "hsl(var(--ub-warning))",
          "warning-light": "hsl(var(--ub-warning-light))",
          danger: "hsl(var(--ub-danger))",
          "danger-light": "hsl(var(--ub-danger-light))",
          info: "hsl(var(--ub-info))",
          "info-light": "hsl(var(--ub-info-light))",
          rnb: "hsl(var(--ub-rnb))",
          roads: "hsl(var(--ub-roads))",
          bridges: "hsl(var(--ub-bridges))",
          btp: "hsl(var(--ub-btp))",
          "btp-foreground": "hsl(var(--ub-btp-foreground))",
          ens: "hsl(var(--ub-ens))",
        },
        status: {
          pending: "hsl(var(--status-pending))",
          "pending-bg": "hsl(var(--status-pending-bg))",
          progress: "hsl(var(--status-progress))",
          "progress-bg": "hsl(var(--status-progress-bg))",
          review: "hsl(var(--status-review))",
          "review-bg": "hsl(var(--status-review-bg))",
          completed: "hsl(var(--status-completed))",
          "completed-bg": "hsl(var(--status-completed-bg))",
        },
        priority: {
          high: "hsl(var(--priority-high))",
          "high-bg": "hsl(var(--priority-high-bg))",
          medium: "hsl(var(--priority-medium))",
          "medium-bg": "hsl(var(--priority-medium-bg))",
          low: "hsl(var(--priority-low))",
          "low-bg": "hsl(var(--priority-low-bg))",
        },
        premium: {
          completed: "#10b981",
          "completed-light": "#d1fae5",
          running: "#f59e0b",
          "running-light": "#fef3c7",
          pipeline: "#6366f1",
          "pipeline-light": "#e0e7ff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'soft-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
