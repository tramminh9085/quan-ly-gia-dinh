# Design System Master — Quản Lý Gia Đình (Tổ Ấm Số)

> Generated following `ui-ux-pro-max` v2.0 reasoning rules for **Family Calendar & Chores (#137)** + **Personal Finance Tracker (#91)**.

## 1. Visual Direction & Style
- **Primary Style:** Soft UI Evolution + Bento Box Grid
- **Keywords:** Evolved soft UI, subtle multi-layer elevation, accessible contrast, warm family-friendly hierarchy, scannable Bento cards, smooth micro-interactions (`200ms cubic-bezier(0.22, 1, 0.36, 1)`).
- **Anti-Patterns to Avoid:**
  - No emojis used as structural UI icons (use vector SVG icons with `aria-hidden="true"`).
  - Avoid harsh 3px pure-black Neubrutalist borders that clutter data-dense cards.
  - Avoid neon gradients or low-contrast muted text (`< 4.5:1`).
  - Avoid tiny icon-only hit areas without padding.

## 2. Color Tokens (Light Mode — High Readability)
| Token | Hex | Role | Contrast Note |
|-------|-----|------|---------------|
| `--bg-main` | `#F8FAFC` | App background canvas | Cool alabaster with subtle warm radial mesh |
| `--bg-surface` | `#FFFFFF` | Primary Bento card surface | Elevated with soft multi-layer shadow |
| `--bg-subtle` | `#F1F5FD` | Secondary surface / filter bar | Subtle blue-tinted surface |
| `--text-main` | `#0F172A` | Primary headings & body text | 15.8:1 on white (WCAG AAA) |
| `--text-secondary` | `#475569` | Secondary labels & metadata | 7.5:1 on white (WCAG AAA) |
| `--primary` | `#2563EB` | Primary brand & active navigation | Family Trust Blue |
| `--secondary` | `#059669` | Paid status, income & completion | Chore / Finance Emerald |
| `--cta` | `#D97706` | Highlights, lunar badges & reminders | Warm Amber |
| `--danger` | `#DC2626` | Unpaid alert, urgent countdown & delete | Alert Red |
| `--border-subtle` | `#E2E8F0` | Standard card & input border | Clean 1.5px structural separation |
| `--border-strong` | `#CBD5E1` | Interactive hover border | Emphasized separation |

## 3. Typography Scale
- **Primary Font:** `Be Vietnam Pro` / `Plus Jakarta Sans` (optimized for Vietnamese diacritics and tabular numbers)
- **Numeric Data:** `font-variant-numeric: tabular-nums` on all currency (`VNĐ`), dates, and countdowns.
- **Scale:**
  - Display / Hero Value: `1.5rem–1.75rem` (`24–28px`), `font-weight: 800`, `letter-spacing: -0.02em`
  - Section Heading (H2): `1.125rem–1.25rem` (`18–20px`), `font-weight: 700`
  - Card Title (H3): `1rem–1.0625rem` (`16–17px`), `font-weight: 700`
  - Body: `0.875rem–0.9375rem` (`14–15px`), `font-weight: 500`, `line-height: 1.5`
  - Badge / Label: `0.75rem` (`12px`), `font-weight: 600`, `letter-spacing: 0.02em`

## 4. Spacing & Elevation System
- **Spacing Rhythm:** 4px/8px base unit (`8px`, `12px`, `16px`, `20px`, `24px`, `32px`)
- **Border Radius:**
  - Bento Cards: `20px` (`1.25rem`)
  - Inner Sub-cards / Alerts: `14px` (`0.875rem`)
  - Buttons & Inputs: `12px` (`0.75rem`)
  - Badges / Pills: `9999px`
- **Shadows (Soft UI Evolution):**
  - Card: `0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.06)`
  - Card Hover: `0 4px 12px rgba(15, 23, 42, 0.06), 0 16px 32px -6px rgba(37, 99, 235, 0.10)`

## 5. Pre-Delivery Checklist Applied
- [x] Vector SVG icons (`lucide-react`) replace all structural emojis
- [x] Decorative icons have `aria-hidden="true"`; icon-only buttons have `aria-label`
- [x] Minimum touch targets (`>= 40x40px` / `44px` on mobile) for interactive controls
- [x] Keyboard `:focus-visible` ring and `prefers-reduced-motion` media query supported
- [x] Resilient text wrapping on badges, chips, and currency figures
