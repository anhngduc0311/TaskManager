---
name: Deep Space Logic
colors:
  surface: '#0f141b'
  surface-dim: '#0f141b'
  surface-bright: '#343941'
  surface-container-lowest: '#090f15'
  surface-container-low: '#171c23'
  surface-container: '#1b2027'
  surface-container-high: '#252a32'
  surface-container-highest: '#30353d'
  on-surface: '#dee2ec'
  on-surface-variant: '#c1c6d4'
  inverse-surface: '#dee2ec'
  inverse-on-surface: '#2c3138'
  outline: '#8b919e'
  outline-variant: '#414752'
  surface-tint: '#a8c8ff'
  primary: '#a8c8ff'
  on-primary: '#003062'
  primary-container: '#579dff'
  on-primary-container: '#003468'
  inverse-primary: '#005eb4'
  secondary: '#c3c7cc'
  on-secondary: '#2d3135'
  secondary-container: '#43474c'
  on-secondary-container: '#b2b5ba'
  tertiary: '#abcae7'
  on-tertiary: '#11334a'
  tertiary-container: '#81a0bc'
  on-tertiary-container: '#16374e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#a8c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#00468a'
  secondary-fixed: '#e0e3e8'
  secondary-fixed-dim: '#c3c7cc'
  on-secondary-fixed: '#181c20'
  on-secondary-fixed-variant: '#43474c'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#abcae7'
  on-tertiary-fixed: '#001e31'
  on-tertiary-fixed-variant: '#2b4a62'
  background: '#0f141b'
  on-background: '#dee2ec'
  surface-variant: '#30353d'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
---

## Brand & Style

This design system is built for high-velocity software engineering and product management teams. The brand personality is **Systematic, Professional, and Focused**. It prioritizes deep work by reducing visual noise through a dark-first interface that minimizes eye strain during long sessions.

The style is **Corporate Modern with a Developer-Centric lean**. It utilizes a "Surface-on-Surface" approach, where depth is communicated through subtle tonal shifts rather than heavy shadows. The aesthetic is clean and utilitarian, emphasizing information density and clear hierarchy to help users navigate complex project data without cognitive overload. It evokes a sense of reliability and technical precision.

## Colors

The palette is anchored by **Deep Charcoal (#161B22)**, providing a sophisticated backdrop that feels more expansive than pure black. 

- **Primary Action**: A vibrant **Software Blue (#579DFF)** is used exclusively for primary calls to action, active states, and focus indicators. This high-contrast pairing ensures functional elements are immediately discoverable.
- **Surface Hierarchy**: We use a three-tier background system: `background_base` for the lowest level, `surface_primary` for sidebars and main containers, and `surface_secondary` for cards and interactive components.
- **Feedback & Status**: Success, warning, and error states should use desaturated versions of green, amber, and red to maintain the professional, low-stimulation environment.

## Typography

The typography system balances modern aesthetics with technical utility. 

**Hanken Grotesk** is used for headlines to provide a sharp, contemporary feel that distinguishes sections and page titles. **Inter** handles the bulk of the UI's body text, chosen for its exceptional legibility in data-dense environments and wide range of weights. For metadata, IDs (e.g., Task Keys like KAN-101), and technical labels, **JetBrains Mono** is employed to give a subtle "code-like" feel that resonates with developer workflows.

On mobile devices, `headline-lg` should scale down to `24px` to prevent text wrapping on smaller viewports.

## Layout & Spacing

This design system utilizes a **Fixed-Fluid Hybrid Grid**. 
- **Sidebars**: Navigation sidebars are fixed at 240px or 280px depending on content complexity.
- **Main Canvas**: The primary content area is fluid, using a 12-column system for dashboard layouts and a horizontal-scrolling flex container for Kanban boards.

Spacing follows a strict **4px baseline grid**. All padding and margins must be multiples of 4 to maintain mathematical harmony. For task cards, use `md` (16px) internal padding. For dense lists, use `sm` (8px) vertical padding between rows.

## Elevation & Depth

In this dark-themed environment, we avoid traditional drop shadows which can appear "dirty" or muddy on dark backgrounds. Instead, we use:

1.  **Tonal Elevation**: As an element moves "closer" to the user, its surface color becomes lighter (`surface_primary` -> `surface_secondary`).
2.  **Low-Contrast Outlines**: Every container, card, and input field uses a subtle 1px border (#30363D). This provides clear structural definition without the need for shadows.
3.  **Active Focus**: When an element is focused or active, the border transitions to the primary `Software Blue` or gains a 2px outer glow with 20% opacity of the primary color.

## Shapes

The shape language is **Soft and Precise**. 

A base radius of **4px (0.25rem)** is applied to most UI components including buttons, input fields, and small chips. Larger containers like Task Cards use **8px (0.5rem)** to differentiate them from smaller interactive elements. This subtle rounding maintains a professional, engineered look while avoiding the harshness of sharp corners. Avoid pill-shapes except for status indicators or specific notification badges.

## Components

- **Buttons**: Primary buttons are solid `Software Blue` with white text. Secondary buttons use a `surface_secondary` fill with a subtle border. Ghost buttons are reserved for low-priority actions in toolbars.
- **Task Cards**: Use `surface_secondary` background. Include a top-aligned ID label in `JetBrains Mono` and a body title in `Inter` (Medium weight).
- **Inputs**: Input fields should have a background darker than the surface they sit on to create a "well" effect, with a `Software Blue` border on focus.
- **Status Chips**: Use "Subtle" variants—low opacity background colors with high-contrast text (e.g., a dark green background with light green text for "Done").
- **Navigation**: Sidebar items use a 4px vertical bar on the left side of the item to indicate the active state, paired with a slight background highlight.
- **Board Columns**: Columns should have a `background_base` fill with a 1px dashed or solid border to clearly separate work stages.