---
name: Industrial Precision
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#45474c'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#555e74'
  primary: '#01081a'
  on-primary: '#ffffff'
  primary-container: '#172033'
  on-primary-container: '#7f879f'
  inverse-primary: '#bdc6e0'
  secondary: '#8c4f10'
  on-secondary: '#ffffff'
  secondary-container: '#fdad67'
  on-secondary-container: '#763f00'
  tertiary: '#000917'
  on-tertiary: '#ffffff'
  tertiary-container: '#102134'
  on-tertiary-container: '#7989a0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2fc'
  primary-fixed-dim: '#bdc6e0'
  on-primary-fixed: '#121b2e'
  on-primary-fixed-variant: '#3e475b'
  secondary-fixed: '#ffdcc2'
  secondary-fixed-dim: '#ffb77b'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#6d3a00'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
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
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-mono:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system defines an industrial-grade enterprise manufacturing execution and operations platform. It projects uncompromising reliability, architectural rigor, and functional clarity. Tailored for plant managers, process engineers, supply chain directors, and operations leads, the interface strips away decorative superficiality in favor of dense, legible telemetry, structural discipline, and immediate situational awareness.

The visual style blends **Corporate / Modern** enterprise discipline with **Tactile Industrial Precision**. Crisp white card surfaces rest upon a grounding warm ivory workspace, framed by dark midnight structural zones and punctuated by refined copper accents. The emotional resonance is calm, authoritative, and mission-critical: a digital twin to precision instrumentation where every border, metric, and indicator carries operational weight.

## Colors
The palette balances institutional authority with high-contrast functional hierarchy, avoiding saturated neons, tech blues, or decorative gradients.

### Palette Architecture
- **Primary Dark (Midnight Navy - `#172033`):** The primary color anchor. Used for primary system structures (persistent navigation sidebars, high-level headers), foundational text, and high-impact data readouts.
- **Secondary Accent (Refined Copper - `#B87333`):** The strategic visual driver. Reserved for primary operational CTAs, active workflow sequence indicators, selected navigation nodes, and mission-critical metric highlights.
- **Canvas Base (Warm Ivory - `#F7F5F0`):** Neutral application canvas offering warm, low-fatigue contrast against both deep navy chrome and clean white surfaces.
- **Surfaces (Clean White - `#FFFFFF`):** High-density workspace tiles, operational matrices, data grids, inspection tables, and input forms.
- **Secondary Text (Slate - `#64748B`):** Metadata, axis labels, industrial units of measure, table headers, and structural subtitles.
- **Structural Lines (Warm Light Grey - `#E5E1D8`):** Strict perimeter bounds, grid dividers, table row separations, and field containers.

### Functional & Semantic States
- **Success (Muted Green - `#3F7D5A`):** Nominal yield, validated batches, passing inspection thresholds.
- **Warning (Muted Amber - `#B7791F`):** Tooling wear warnings, calibration drifts, non-blocking queue lags.
- **Error (Muted Red - `#A84A4A`):** E-stops, line halts, parameter out-of-spec tolerances, validation errors.

## Typography
Typography is treated as an architectural framework. `Inter` provides high legibility at dense data scales with a neutral, systematic profile.

### Typographic Hierarchy Rules
- **Numerical Telemetry:** All real-time telemetry, part counters, and timestamps utilize tabular numbers (`tnum`) to eliminate optical jitter during live streaming updates.
- **Section Headers & Metric Labels:** Uppercase micro-labels (`label-sm`) with positive letter spacing (`0.04em`) are dedicated to column headers, batch identifiers, machine state labels, and technical parameters.
- **Contrast Hierarchy:** Level titles use `#172033` to command instant hierarchy; secondary technical specifications and dimensional units leverage `#64748B`.
- **Display Scaling:** Restrict `display-lg` to global plant overview dashboards and executive KPI modules. In dense manufacturing execution screens, typography peaks at `headline-lg`.

## Layout & Spacing
The layout relies on a continuous, dense 12-column fluid grid tailored to heavy instrumentation, supervisory control, and data visualization.

### Rhythm & Grids
- **Structural Canvas:** The base view adopts an anchored split model: a fixed-width 260px Midnight Navy navigation rail on the left, flanked by a fluid warm ivory (`#F7F5F0`) workspace partitioned into white modules.
- **Component Padding Scale:** 
  - `space-xs` (4px) / `space-sm` (8px): Micro-gaps between badge indicators, icon-text pairings, and table cell vertical padding.
  - `space-md` (16px): Standard internal card padding, modular gutters, and form field stacks.
  - `space-lg` (24px): Primary section breaks and card-to-card structural offsets.
  - `space-xl` (32px): Boundary margins for expansive viewport layouts.

### Breakpoints & Density Adaptations
- **Desktop (1440px+):** Full 12-column instrumentation matrix. Multi-pane line diagrams, active process flow, and diagnostic split-panes.
- **Tablet / Workstation (768px - 1439px):** Sidebar collapses into a high-density 64px icon rail. Grid compresses to 6 columns; table cells adjust to compact mode using `gutter-compact`.
- **Field Terminal / Mobile (< 768px):** Single-column stacked workflow. Left sidebar transforms into an off-canvas drawer. Outer margins reduce to `margin-mobile` (16px).

## Elevation & Depth
In alignment with industrial ergonomics, visual depth is achieved via crisp planar layering and structural outlines rather than atmospheric or decorative drop shadows.

### Elevation Tiers
- **Tier 0 (Base Ground - `#F7F5F0`):** The foundational application canvas. Flat, raw, and matte.
- **Tier 1 (Surface Containers - `#FFFFFF`):** Work panels, telemetry tiles, and data tables. Elevated strictly via a 1px solid border (`#E5E1D8`). Ambient drops are nearly imperceptible: `0 1px 2px rgba(23, 32, 51, 0.04)`.
- **Tier 2 (Interactive Flyouts & Hover States):** Table row hover transitions, action sheets, and flyout configuration panels. Outlined with `#E5E1D8` and paired with a tight directional shadow: `0 4px 12px rgba(23, 32, 51, 0.08)`.
- **Tier 3 (Modals & Emergency Interventions):** System override confirmations, machine diagnostic modals, and critical dialogues. Framed by an active structural border and supported by an elevation shadow: `0 12px 28px rgba(23, 32, 51, 0.16)` over a `#172033` backdrop at 40% opacity.

## Shapes
The design system employs a **Soft (Level 1)** geometric standard. This geometry balances technical precision with modern enterprise refinement, ensuring data containers remain architectural rather than playful.

- **Base Components (`rounded` / 4px / `0.25rem`):** Buttons, inputs, tags, table rows, and status badges.
- **Structural Enclosures (`rounded-lg` / 8px / `0.5rem`):** Diagnostic cards, telemetry modules, and popover panels.
- **Overlays (`rounded-xl` / 12px / `0.75rem`):** System modals and parameter configuration drawers.
- **Zero Radius (`0px`):** The Midnight Navy sidebar, persistent technical status bars, and inner table data cell dividers remain strictly rectilinear to preserve boundary alignment.

## Components

### Buttons
- **Primary CTA:** Solid Refined Copper (`#B87333`) fill, clean white (`#FFFFFF`) bold label, 4px border radius. Hover: `#A46328`. Focused: 2px ring in `#172033` with a 2px offset.
- **Secondary Operational:** White (`#FFFFFF`) fill, 1px solid `#E5E1D8` border, `#172033` text. Hover: `#F7F5F0` background with border darkened to `#64748B`.
- **Subtle / Ghost:** Transparent fill, `#64748B` text. Hover: `#F7F5F0` background and `#172033` text.
- **Destructive:** Solid `#A84A4A` fill, `#FFFFFF` text. Used exclusively for emergency stops, critical process abortions, and purge commands.

### Inputs & Field Controls
- **Text Inputs & Dropdowns:** 36px standard compact height. Surface: `#FFFFFF`. Border: 1px solid `#E5E1D8`. Text: `#172033`. Placeholder: `#64748B` at 60% opacity. On Focus: 1px solid `#B87333` with a subtle 1px copper glow.
- **Checkboxes & Radios:** 16px square/circle with 1px `#E5E1D8` outline. Checked state utilizes a solid `#172033` fill with an optical white glyph.

### Cards & Data Tables
- **Cards:** Clean white `#FFFFFF` surface enclosed by a 1px solid `#E5E1D8` border with 8px radius (`rounded-lg`). Card header features 16px padding, subtle border divider, and a micro-label category tag.
- **Data Tables:** High-density layout. Header background: `#F7F5F0`, border-bottom 1px solid `#E5E1D8`, text in `#64748B` uppercase micro-label font. Alternating row fills are avoided; instead, use a 1px `#E5E1D8` horizontal divider and a `#F7F5F0` fill on row hover.

### Status Indicators & Chips
- **Telemetry Chips:** Pill-soft tags (4px radius) with subdued backgrounds and semantic borders.
  - Nominal: `#3F7D5A` at 10% tint, `#3F7D5A` text, 1px `#3F7D5A` border at 30% opacity.
  - Alert: `#B7791F` at 10% tint, `#B7791F` text.
  - Fault: `#A84A4A` at 10% tint, `#A84A4A` text.
- **Machine State Dots:** 8px circular indicators placed next to line items: `#3F7D5A` (Running), `#B7791F` (Idle/Changeover), `#A84A4A` (Halted/Faulted).

### Navigation & Workflow Steppers
- **Sidebar Navigation:** Solid Midnight Navy (`#172033`) canvas. Inactive items: `#64748B` text and icons. Hover: text shifts to `#FFFFFF`. Active item: `#FFFFFF` text, subtle navy tint background, anchored by a 3px vertical Refined Copper (`#B87333`) border strip on the left edge.
- **Workflow Step Tracker:** Connected sequential nodes. Inactive nodes use `#E5E1D8` rings; completed nodes are filled with `#172033`; active execution steps feature a `#B87333` copper fill with an pulsing copper outer ring.