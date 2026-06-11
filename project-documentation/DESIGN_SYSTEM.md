# DESIGN_SYSTEM.md

## 1. Design Goals

Lazuli is a clean, utilitarian SaaS dashboard for agile project management. The original prototype uses a restrained light-gray workspace, white cards and panels, a dark navy topbar, a white left sidebar, compact task cards, small semantic badges, Lucide-style outline icons, subtle borders, and a strong blue primary action color.

## Product Overrides Approved During Implementation

These requirements supersede prototype-only assumptions elsewhere in this document:

* The authenticated landing page is **Meus Projetos**, not a role dashboard.
* Admin users have both **Meus Projetos** and a separate **Projetos Admin** route.
* Sprint Board, Backlog, team members, and sprint history navigation is hidden until a project is selected.
* The desktop sidebar retains the documented `w-64` expanded state, but is retractable to an icon rail to increase Board space.
* Login demonstrations must use one real login form. Separate admin/user login actions shown in early mockups were demo-only.
* First-administrator setup and invitation activation screens are part of the authentication surface even though they are absent from the prototype images.

The goal of this design system is to preserve the prototype’s appearance while making the implementation cleaner, reusable, and maintainable with React, Tailwind CSS, and shadcn/ui.

This document should be treated as the source of truth for refactoring the prototype. It does not redesign the UI. It maps the current visual style into semantic tokens, shadcn-compatible components, reusable app components, and migration rules.

---

## 2. Token Strategy

Use semantic tokens instead of hardcoded Tailwind palette classes wherever possible. Raw Tailwind colors may still be referenced in comments or migration notes, but component code should prefer tokens such as `bg-background`, `text-foreground`, `bg-primary`, `border-border`, and `text-muted-foreground`.

Recommended shadcn-compatible tokens:

| Semantic name            | Purpose                                                            | Approx. prototype value | CSS variable               | Tailwind/shadcn usage                                                  |
| ------------------------ | ------------------------------------------------------------------ | ----------------------: | -------------------------- | ---------------------------------------------------------------------- |
| `background`             | Main app canvas behind pages and boards                            |   `#F9FAFB` / `gray-50` | `--background`             | `bg-background`                                                        |
| `foreground`             | Default text color                                                 |  `#111827` / `gray-900` | `--foreground`             | `text-foreground`                                                      |
| `primary`                | Main brand/action color, active states, progress, focus            |  `#2563EB` / `blue-600` | `--primary`                | `bg-primary text-primary-foreground`, `text-primary`, `border-primary` |
| `primary-foreground`     | Text/icons on primary backgrounds                                  |               `#FFFFFF` | `--primary-foreground`     | `text-primary-foreground`                                              |
| `secondary`              | Neutral secondary button/surface background                        |  `#F3F4F6` / `gray-100` | `--secondary`              | `bg-secondary`                                                         |
| `secondary-foreground`   | Text on secondary surfaces                                         | `#1E293B` / `slate-800` | `--secondary-foreground`   | `text-secondary-foreground`                                            |
| `accent`                 | Active nav background, light selected state, pale blue highlights  |   `#EFF6FF` / `blue-50` | `--accent`                 | `bg-accent text-accent-foreground`                                     |
| `accent-foreground`      | Text/icons on accent background                                    |  `#1D4ED8` / `blue-700` | `--accent-foreground`      | `text-accent-foreground`                                               |
| `muted`                  | Muted panels, table headers, toolbar backgrounds, modal right pane |  `#F8FAFC` / `slate-50` | `--muted`                  | `bg-muted`                                                             |
| `muted-foreground`       | Secondary text, subtitles, timestamps, metadata                    |  `#6B7280` / `gray-500` | `--muted-foreground`       | `text-muted-foreground`                                                |
| `destructive`            | Delete/logout/error/blocked emphasis                               |   `#DC2626` / `red-600` | `--destructive`            | `bg-destructive text-destructive-foreground`, `text-destructive`       |
| `destructive-foreground` | Text/icons on destructive backgrounds                              |               `#FFFFFF` | `--destructive-foreground` | `text-destructive-foreground`                                          |
| `border`                 | Main borders and dividers                                          |  `#E5E7EB` / `gray-200` | `--border`                 | `border-border`                                                        |
| `input`                  | Form control border                                                |  `#D1D5DB` / `gray-300` | `--input`                  | `border-input`                                                         |
| `ring`                   | Focus ring color                                                   |  `#3B82F6` / `blue-500` | `--ring`                   | `focus-visible:ring-ring`                                              |
| `card`                   | Card, table, sidebar, and modal panel surfaces                     |               `#FFFFFF` | `--card`                   | `bg-card`                                                              |
| `card-foreground`        | Main text on cards                                                 | `#1E293B` / `slate-800` | `--card-foreground`        | `text-card-foreground`                                                 |
| `popover`                | Dropdown/popover/dialog inner surface                              |               `#FFFFFF` | `--popover`                | `bg-popover`                                                           |
| `popover-foreground`     | Text inside popovers/dialogs                                       | `#1E293B` / `slate-800` | `--popover-foreground`     | `text-popover-foreground`                                              |

Additional app tokens should be added for Lazuli-specific layout and status patterns:

| Semantic name               | Purpose                                    |            Approx. value | CSS variable                  | Tailwind usage                           |
| --------------------------- | ------------------------------------------ | -----------------------: | ----------------------------- | ---------------------------------------- |
| `topbar`                    | Dark global header                         |  `#0F172A` / `slate-900` | `--topbar`                    | `bg-topbar` or `bg-[hsl(var(--topbar))]` |
| `topbar-foreground`         | Text/icons on topbar                       |   `#D1D5DB` / `gray-300` | `--topbar-foreground`         | `text-topbar-foreground`                 |
| `sidebar`                   | Sidebar surface                            |                `#FFFFFF` | `--sidebar`                   | `bg-sidebar`                             |
| `sidebar-foreground`        | Inactive sidebar text                      |   `#4B5563` / `gray-600` | `--sidebar-foreground`        | `text-sidebar-foreground`                |
| `sidebar-active`            | Active sidebar item background             |                `#EFF6FF` | `--sidebar-active`            | `bg-sidebar-active`                      |
| `sidebar-active-foreground` | Active sidebar text/icon                   |                `#1D4ED8` | `--sidebar-active-foreground` | `text-sidebar-active-foreground`         |
| `kanban-column`             | Kanban column background                   |                `#F3F4F6` | `--kanban-column`             | `bg-kanban-column`                       |
| `surface-subtle`            | Modal footers, table toolbars, pale panels |                `#F9FAFB` | `--surface-subtle`            | `bg-surface-subtle`                      |
| `success`                   | Active project/status success              |  `#16A34A` / `green-600` | `--success`                   | `bg-success text-success-foreground`     |
| `success-muted`             | Success badge background                   |  `#DCFCE7` / `green-100` | `--success-muted`             | `bg-success-muted text-success`          |
| `warning`                   | Medium priority/warning state              | `#CA8A04` / `yellow-600` | `--warning`                   | `text-warning`                           |
| `warning-muted`             | Warning badge background                   |  `#FEFCE8` / `yellow-50` | `--warning-muted`             | `bg-warning-muted text-warning`          |
| `danger-muted`              | Bug/blocked badge background               |     `#FEF2F2` / `red-50` | `--danger-muted`              | `bg-danger-muted text-destructive`       |
| `urgent`                    | High priority and urgent delivery accents  | `#C2410C` / `orange-700` | `--urgent`                    | `text-urgent`                            |
| `urgent-muted`              | High priority badge background             |  `#FFF7ED` / `orange-50` | `--urgent-muted`              | `bg-urgent-muted text-urgent`            |
| `planning`                  | Planning Poker purple accent               | `#7E22CE` / `purple-700` | `--planning`                  | `text-planning`                          |
| `planning-muted`            | Planning Poker badge background            | `#F3E8FF` / `purple-100` | `--planning-muted`            | `bg-planning-muted text-planning`        |

---

## 3. Color System

### Core surfaces

Use a light SaaS surface model:

| Role             |     Value | Usage                                                  |
| ---------------- | --------: | ------------------------------------------------------ |
| `background`     | `#F9FAFB` | Main scrollable content area, general page background  |
| `muted`          | `#F8FAFC` | Modal activity pane, login background, subtle panels   |
| `surface-subtle` | `#F9FAFB` | Modal footers, table toolbars, comment composer footer |
| `card`           | `#FFFFFF` | Cards, tables, sidebar, modals, form panels            |
| `kanban-column`  | `#F3F4F6` | Kanban column containers                               |
| `topbar`         | `#0F172A` | Global top navigation bar                              |

### Brand and interaction colors

| Role                |     Value | Usage                                                                                           |
| ------------------- | --------: | ----------------------------------------------------------------------------------------------- |
| `primary`           | `#2563EB` | Primary buttons, active tabs, progress bars, active navigation border, selected estimate option |
| `primary-hover`     | `#1D4ED8` | Primary button hover                                                                            |
| `accent`            | `#EFF6FF` | Active sidebar item, low-priority badge, selected light states                                  |
| `accent-foreground` | `#1D4ED8` | Active sidebar text, blue badges, low priority text                                             |
| `ring`              | `#3B82F6` | Input focus ring, focus-visible states                                                          |

### Text colors

| Role                |     Value | Usage                                                   |
| ------------------- | --------: | ------------------------------------------------------- |
| `foreground`        | `#111827` | Default body text                                       |
| `heading`           | `#0F172A` | Page titles, major headings                             |
| `strong`            | `#1E293B` | Card titles, table row titles, modal section titles     |
| `muted-foreground`  | `#6B7280` | Subtitles, timestamps, secondary metadata               |
| `subtle-foreground` | `#9CA3AF` | Disabled text, inactive tabs, placeholder-like metadata |
| `topbar-foreground` | `#D1D5DB` | Topbar icons                                            |

### Semantic status colors

Normalize status colors across the app. The prototype has small inconsistencies between board, backlog, and tables; migration should preserve the overall appearance but use a single semantic mapping.

| Semantic role     |             Background | Foreground | Usage                                                |
| ----------------- | ---------------------: | ---------: | ---------------------------------------------------- |
| `status-active`   | `#DBEAFE` or `#EFF6FF` |  `#1D4ED8` | Sprint active, in-progress, selected nav-like states |
| `status-success`  |              `#DCFCE7` |  `#166534` | Active project, completed/successful status          |
| `status-neutral`  |              `#F3F4F6` |  `#374151` | Task type, closed sprint, inactive status            |
| `status-danger`   |              `#FEF2F2` |  `#B91C1C` | Bug, blocked, destructive indicators                 |
| `status-warning`  |              `#FEFCE8` |  `#A16207` | Medium priority, waiting states                      |
| `status-urgent`   |              `#FFF7ED` |  `#C2410C` | High priority, delivery in 24h                       |
| `status-planning` |              `#F3E8FF` |  `#7E22CE` | Planning Poker tag                                   |

### Component-specific color rules

Use these conventions:

* Primary buttons: `bg-primary text-primary-foreground hover:bg-primary/90`.
* Secondary buttons: `bg-card border border-input text-secondary-foreground hover:bg-secondary`.
* Active sidebar item: `bg-accent text-accent-foreground border-l-4 border-primary`.
* Topbar: `bg-topbar text-topbar-foreground`.
* Page canvas: `bg-background`.
* Tables/cards/modals: `bg-card text-card-foreground border-border`.
* Kanban columns: `bg-kanban-column border-border`.
* Comment/activity panel: `bg-muted`.
* Form controls: `bg-card border-input focus-visible:ring-ring`.
* Destructive text/icon actions: `text-destructive hover:bg-destructive/10`.
* Status and priority badges must use badge variants, not ad hoc color strings.

---

## 4. Typography System

### Font family

Use the default system sans-serif stack through Tailwind’s `font-sans`.

Recommended stack:

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

No custom font is required to match the prototype.

### Base text style

Default app text:

```txt
text-sm text-foreground antialiased
```

Use `text-sm` as the dominant UI size. Most navigation items, table cells, form controls, buttons, card metadata, and modal body text use 14px.

### Heading styles

| Style                | Usage                                       | Tailwind utilities                                   |
| -------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `heading-board`      | Board title, e.g. “Quadro da Sprint 5”      | `text-3xl font-bold tracking-tight text-slate-900`   |
| `heading-page`       | Standard page titles                        | `text-2xl font-bold tracking-tight text-slate-900`   |
| `heading-modal`      | Create/detail modal title                   | `text-xl font-bold text-slate-800`                   |
| `heading-section-lg` | Kanban column headings                      | `text-lg font-bold text-slate-800`                   |
| `heading-section`    | Modal section headings, table card headings | `text-sm font-bold text-slate-800`                   |
| `heading-card`       | Project card title                          | `text-lg font-bold text-slate-800`                   |
| `heading-task-card`  | Kanban card title                           | `text-sm font-semibold leading-tight text-slate-800` |

### Body text styles

| Style           | Usage                                   | Tailwind utilities                      |
| --------------- | --------------------------------------- | --------------------------------------- |
| `body`          | Default readable text                   | `text-sm leading-5 text-gray-600`       |
| `body-strong`   | Names, table titles, important metadata | `text-sm font-semibold text-slate-800`  |
| `body-relaxed`  | Descriptions in modals                  | `text-sm leading-relaxed text-gray-600` |
| `body-compact`  | Kanban/card compact text                | `text-sm leading-tight text-slate-800`  |
| `caption`       | Dates, timestamps, small metadata       | `text-xs text-gray-400`                 |
| `caption-muted` | IDs, table metadata                     | `text-xs text-gray-500`                 |

### Muted text style

Use for page subtitles, secondary metadata, timestamps, and inactive labels:

```txt
text-sm text-muted-foreground
```

For very small muted text:

```txt
text-xs text-muted-foreground
```

### Label style

Form labels:

```txt
text-sm font-semibold text-gray-700
```

Uppercase metadata labels in task detail modal:

```txt
text-xs font-semibold uppercase tracking-wider text-gray-500
```

### Button text style

Default button text:

```txt
text-sm font-medium
```

Compact badge-like buttons:

```txt
text-xs font-medium
```

Estimate voting buttons:

```txt
text-lg font-bold
```

### Monospace metadata

Task IDs use a compact monospace style:

```txt
font-mono text-xs tracking-tighter
```

Use this for identifiers such as `ALF-102`, table ID columns, and Kanban card ID pills.

---

## 5. Spacing System

Normalize spacing to Tailwind’s default scale. Avoid arbitrary pixel spacing unless the value is needed for a fixed layout such as sidebar width, topbar height, modal height, or Kanban column width.

| Pixel value | Tailwind token | Usage                                                                            |
| ----------: | -------------: | -------------------------------------------------------------------------------- |
|       `2px` |          `0.5` | Tiny badge vertical padding                                                      |
|       `4px` |            `1` | Icon button padding, small gaps                                                  |
|       `6px` |          `1.5` | Compact badge padding, small button vertical padding                             |
|       `8px` |            `2` | Form label gap, badge padding, compact control gaps                              |
|      `10px` |          `2.5` | Form input padding                                                               |
|      `12px` |            `3` | Kanban column inner padding, nav item horizontal padding, comment bubble padding |
|      `16px` |            `4` | Card padding, button horizontal padding, modal composer padding                  |
|      `20px` |            `5` | Estimate modal header/footer padding, form vertical rhythm                       |
|      `24px` |            `6` | Board page padding, dashboard card grid gap, modal body padding                  |
|      `32px` |            `8` | Standard page padding, login card padding, dashboard header spacing              |
|      `64px` |           `16` | Topbar height                                                                    |
|     `256px` |         `w-64` | Sidebar width                                                                    |
|     `320px` |         `w-80` | Kanban column width                                                              |

### Page padding

Use:

```txt
p-8
```

For standard centered pages:

```txt
p-8 max-w-5xl mx-auto
```

For board pages:

```txt
pt-6 px-6
```

Board intentionally uses more horizontal space and should not be centered.

### Section gaps

Use:

```txt
mb-6
gap-6
space-y-6
```

For tighter modal/form sections:

```txt
space-y-5
gap-4
```

### Card padding

Dashboard project cards:

```txt
p-6
```

Kanban cards:

```txt
p-4
```

Table containers:

```txt
p-2
```

Comment bubbles/checklist items:

```txt
p-3
```

### Form field gaps

Form vertical stack:

```txt
space-y-4
```

Create-card modal form:

```txt
space-y-5
```

Grid field rows:

```txt
grid grid-cols-2 gap-4
grid grid-cols-3 gap-4
```

### Button padding

Default page/action buttons:

```txt
px-4 py-2
```

Compact modal composer button:

```txt
px-4 py-1.5
```

Segmented control item:

```txt
px-3 py-1.5
```

Icon-only button:

```txt
p-1
```

Circular icon button:

```txt
h-8 w-8
```

### Navbar spacing

Sidebar logo/header:

```txt
p-4 mb-4
```

Sidebar nav group:

```txt
px-4 pb-4
space-y-1
```

Sidebar nav item:

```txt
px-3 py-2
```

Topbar:

```txt
h-16 px-6
```

Topbar right actions:

```txt
space-x-4
```

---

## 6. Radius System

Use a small, consistent radius scale. Preserve the prototype’s generally rounded but not overly soft SaaS look.

| Radius token  | Approx. value | Tailwind/shadcn usage     | Usage                                                                               |
| ------------- | ------------: | ------------------------- | ----------------------------------------------------------------------------------- |
| `radius-sm`   |         `4px` | `rounded-sm` or `rounded` | Logo square, segmented active item, compact login controls if preserving exact look |
| `radius-md`   |         `6px` | `rounded-md`              | Buttons, inputs, Kanban cards, badges with non-pill shape                           |
| `radius-lg`   |         `8px` | `rounded-lg`              | Dashboard cards, table containers, comment composer, checklist items                |
| `radius-xl`   |        `12px` | `rounded-xl`              | Dialog/modal panels                                                                 |
| `radius-full` |      `9999px` | `rounded-full`            | Avatars, status pills, story point bubbles, circular icon buttons                   |

Recommended CSS variables:

```css
--radius: 0.5rem;
--radius-sm: 0.25rem;
--radius-md: 0.375rem;
--radius-lg: 0.5rem;
--radius-xl: 0.75rem;
```

Component rules:

* shadcn `Button`, `Input`, `SelectTrigger`, and `Textarea`: `rounded-md`.
* shadcn `Card`: `rounded-lg`.
* shadcn `DialogContent`: `rounded-xl`.
* `Badge`: `rounded` for compact labels, `rounded-full` for status pills.
* `Avatar`: always `rounded-full`.

---

## 7. Shadow and Border System

### Borders

| Border token         | Value               | Usage                                                         |
| -------------------- | ------------------- | ------------------------------------------------------------- |
| `border-default`     | `1px solid #E5E7EB` | Cards, tables, sidebar, separators                            |
| `border-subtle`      | `1px solid #F3F4F6` | Modal sections, card internal dividers, dashboard card footer |
| `border-input`       | `1px solid #D1D5DB` | Inputs, textareas, selects                                    |
| `border-active`      | `4px solid #2563EB` | Active sidebar item left border                               |
| `border-focus`       | `#3B82F6`           | Form focus border/ring                                        |
| `border-avatar-dark` | `2px solid #334155` | Topbar avatar border                                          |

Default border utility:

```txt
border border-border
```

Subtle divider:

```txt
border-gray-100
```

Input border:

```txt
border-input
```

### Focus ring

Use shadcn-style focus states:

```txt
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

For compact form controls matching the prototype more closely:

```txt
focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring
```

Tabs and custom controls must not show browser-default black outlines. Use `focus-visible` styling.

### Shadows

| Shadow token        | Tailwind utility                    | Usage                                   |
| ------------------- | ----------------------------------- | --------------------------------------- |
| `shadow-subtle`     | `shadow-sm`                         | Cards, tables, buttons, comment bubbles |
| `shadow-card-hover` | `hover:shadow-md` or `hover:shadow` | Dashboard and Kanban card hover         |
| `shadow-elevated`   | `shadow-xl`                         | Create-card modal                       |
| `shadow-overlay`    | `shadow-2xl`                        | Detail and estimate modals              |
| `shadow-none`       | `shadow-none`                       | Topbar, flat sidebar items              |

Component rules:

* Cards and table panels use `shadow-sm`.
* Project cards hover to `shadow-md`.
* Kanban cards use `shadow-sm`, hover to `shadow`.
* Primary and secondary buttons use `shadow-sm` when they are page-level actions.
* Modal panels use `shadow-xl` or `shadow-2xl`.
* Topbar remains flat; do not add a strong shadow.

---

## 8. shadcn Component Mapping

### Button

Use for all clickable button primitives.

Variants needed:

| Variant       | Use                                                  | Styling notes                                                        |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `default`     | Primary actions: Save, Create, New Task, New Project | `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm`   |
| `secondary`   | Neutral controls                                     | `bg-secondary text-secondary-foreground hover:bg-secondary/80`       |
| `outline`     | Filter, Cancel, bordered actions                     | `bg-card border-input text-slate-700 hover:bg-secondary shadow-sm`   |
| `ghost`       | Sidebar inactive nav, icon actions, tab-like actions | `hover:bg-secondary`                                                 |
| `destructive` | Delete/logout destructive actions                    | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `dark`        | Login developer button                               | Custom app variant: `bg-slate-800 text-white hover:bg-slate-900`     |
| `nav`         | Sidebar item                                         | Custom app variant or app component wrapper                          |
| `segmented`   | Kanban/List toggle items                             | Prefer app-level `ViewToggle` using Button                           |

Sizes needed:

| Size      | Use                                                 |
| --------- | --------------------------------------------------- |
| `sm`      | Compact modal/composer buttons                      |
| `default` | Standard page actions                               |
| `icon`    | Icon-only buttons                                   |
| `full`    | Login full-width buttons, implemented with `w-full` |

Customize the default shadcn Button to keep the prototype’s `text-sm font-medium rounded-md` look. Avoid oversized button heights.

---

### Input

Use for text, email, password, date, and search fields.

When to use:

* Login email/password.
* Project search.
* Backlog search.
* Date field in create card modal.

Styling notes:

```txt
h-10 rounded-md border-input bg-card px-3 py-2 text-sm
focus-visible:ring-1 focus-visible:ring-ring
```

Search input should be wrapped in an app-specific `SearchField` with a left icon and `pl-10`.

Customize shadcn Input only lightly. Preserve compact form control height and blue focus.

---

### Textarea

Use for:

* Create-card description.
* Acceptance criteria.
* Comment composer.

Styling notes:

```txt
rounded-md border-input bg-card p-2.5 text-sm
focus-visible:ring-1 focus-visible:ring-ring
```

For create-card modal:

```txt
resize-none
```

For comment composer, use a composed app component rather than a plain textarea alone.

---

### Select

Use for:

* Priority.
* Type.
* Assignee.
* Estimate.

Variants:

* Default compact select.
* Form-grid select.

Styling notes:

```txt
h-10 rounded-md border-input bg-card text-sm
```

Customize shadcn Select trigger to match input sizing.

---

### Checkbox

Use for:

* Login “Manter conectado”.
* Subtask checklist items.

Styling notes:

```txt
h-4 w-4 rounded border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground
```

Checklist rows should be app-level components with Card-like styling.

---

### Radio Group

Use for mutually exclusive choices when needed. The current prototype uses custom voting buttons for estimate selection, not radios visually.

For Planning Poker / estimate selection, prefer an app-specific `EstimateOptionGrid` using `ToggleGroup` or `RadioGroup` internally, styled as large buttons:

```txt
h-14 rounded-lg text-lg font-bold border-2
selected: bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 shadow-md
```

---

### Card

Use for:

* Dashboard project cards.
* Table/list containers.
* Login card.
* Kanban cards, with app-specific wrappers.
* Comment bubbles only when useful; otherwise use simple bordered divs.

Variants needed:

| Variant       | Usage                                   | Styling                                                             |
| ------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `default`     | Standard white panel                    | `bg-card border border-border rounded-lg shadow-sm`                 |
| `interactive` | Dashboard project card                  | `hover:shadow-md hover:border-primary/40 cursor-pointer transition` |
| `kanban`      | Task cards                              | App-specific variant with compact padding and optional left accent  |
| `panel`       | Tables/backlog/history/admin containers | `rounded-lg shadow-sm overflow-hidden`                              |
| `login`       | Login card                              | `rounded-lg shadow-sm border-gray-100 p-8`                          |

shadcn Card can remain mostly default, but app components should define repeated card layouts.

---

### Dialog

Use for:

* Create card modal.
* Card detail modal.
* Estimate difficulty modal.

Variants needed:

| Variant   | Width/height             | Usage               |
| --------- | ------------------------ | ------------------- |
| `form`    | `max-w-2xl max-h-[90vh]` | Create card         |
| `detail`  | `max-w-5xl h-[85vh]`     | Card detail         |
| `compact` | `max-w-md`               | Estimate difficulty |

Styling notes:

* Overlay: `bg-slate-900/40` for detail, `bg-slate-900/50` for create, `bg-slate-900/60 backdrop-blur-sm` for estimate. During normalization, prefer `bg-slate-900/50`.
* Content: `bg-card rounded-xl shadow-2xl overflow-hidden`.
* Header/footer dividers: `border-border` or `border-gray-100`.
* Footer: `bg-surface-subtle`.

Customize shadcn DialogContent sizes by app-specific wrappers, not by editing every usage.

---

### Dropdown Menu

Use for:

* More actions on cards/tables.
* Column actions.
* User avatar menu if behavior is added later.

Styling notes:

```txt
bg-popover text-popover-foreground border-border rounded-md shadow-md
```

Do not introduce new dropdown behavior during visual migration unless it already exists.

---

### Badge

Use for all status, priority, type, and tag labels.

Variants needed:

| Variant         | Usage                          |
| --------------- | ------------------------------ |
| `default`       | Generic neutral badge          |
| `status-active` | Sprint active, in progress     |
| `success`       | Active project                 |
| `neutral`       | Task, closed sprint            |
| `danger`        | Bug, blocked                   |
| `warning`       | Medium priority                |
| `urgent`        | High priority, delivery in 24h |
| `info`          | Low priority                   |
| `planning`      | Planning Poker                 |
| `id`            | Task ID pill                   |

Sizes needed:

| Size   | Usage                |
| ------ | -------------------- |
| `xs`   | Kanban card badges   |
| `sm`   | Table/status badges  |
| `pill` | Rounded status pills |

Badge styling examples:

```txt
text-xs px-2 py-0.5 rounded font-medium
```

Status pill:

```txt
inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
```

ID badge:

```txt
font-mono tracking-tighter bg-gray-50 text-gray-500 border border-gray-100
```

Customize shadcn Badge variants. Do not duplicate badge color class strings across pages.

---

### Alert

Use for:

* Estimate modal warning message.
* Error or blocked reason if elevated beyond plain text.

Variants needed:

| Variant       | Usage                         | Styling                                          |
| ------------- | ----------------------------- | ------------------------------------------------ |
| `warning`     | Estimate hidden-votes warning | `bg-orange-50 border-orange-100 text-orange-800` |
| `destructive` | Error/destructive alert       | shadcn destructive                               |
| `info`        | Future informational notes    | light blue                                       |

Estimate warning should remain compact:

```txt
p-3 rounded-md text-xs
```

---

### Table

Use for:

* Backlog.
* Admin projects.
* Sprint history.

Styling notes:

* Header: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`.
* Rows: `hover:bg-secondary/50`.
* Cell padding: `px-6 py-4`.
* Header padding: `px-6 py-3`.
* Row dividers: `divide-y divide-gray-100` or `divide-y divide-border`.

Use shadcn Table primitives but wrap them in app-level `DataTablePanel`.

---

### Tabs

Use for:

* Card detail modal: Comentários / Subtarefas.
* Any future detail sections.

Styling notes:

Prototype uses underline tabs, not pill tabs.

Required custom variant:

```txt
border-b-2 border-transparent py-1 text-sm font-semibold text-gray-400
data-[state=active]:border-primary data-[state=active]:text-primary
```

Customize shadcn Tabs for this app or create `UnderlineTabs`.

---

### Separator

Use for:

* Modal section dividers.
* Sidebar header/bottom split.
* Card footer split.
* Table/card internal sections.

Styling notes:

```txt
bg-border
```

Subtle separators may use `bg-gray-100`.

---

### Sheet

Use for responsive sidebar/drawer if mobile navigation is implemented.

The current prototype hides the sidebar below `md`, and no mobile drawer is visible. If mobile navigation is required during migration, use shadcn Sheet but preserve the same Sidebar visual style.

Styling notes:

```txt
w-64 bg-sidebar border-r border-border
```

Do not invent new mobile navigation behavior unless requested.

---

### Form

Use shadcn Form with React Hook Form for structured forms once real validation is needed.

Use for:

* Login.
* Create card.
* Future project forms.

Styling notes:

* `FormLabel`: `text-sm font-semibold text-gray-700`.
* `FormControl`: compact `Input`, `Textarea`, `Select`.
* `FormMessage`: small destructive text.
* Field spacing: `space-y-1` inside field, `space-y-5` between fields.

During visual migration, do not change form behavior or validation logic unless explicitly required.

---

## 9. App-Specific Components

Create reusable app-level components outside `components/ui`, preferably in `src/components/app`.

### AppShell

Purpose:

* Owns the global app layout: sidebar, topbar, and main scrollable content.

Likely props:

```ts
type AppShellProps = {
  children: React.ReactNode;
  currentUser?: User;
  sidebar?: React.ReactNode;
  topbarActions?: React.ReactNode;
};
```

Visual rules:

* Root: `flex h-screen w-full overflow-hidden bg-background text-foreground`.
* Sidebar: fixed `w-64`, hidden below `md`.
* Main: `flex-1 flex flex-col h-screen overflow-hidden`.
* Topbar: `h-16 bg-topbar`.
* Content: `flex-1 overflow-auto bg-background`.

Composes:

* `Sidebar`
* `Topbar`
* shadcn `Avatar`
* shadcn `Button`

---

### Sidebar

Purpose:

* Primary project/app navigation.

Likely props:

```ts
type SidebarProps = {
  activeView: ViewType;
  activeProject?: Project | null;
  isAdmin?: boolean;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
};
```

Visual rules:

* `w-64 bg-sidebar border-r border-border`.
* Logo area: `p-4 border-b border-border flex items-center mb-4`.
* Nav item: icon + label, `text-sm font-medium`.
* Active item: `bg-accent text-accent-foreground border-l-4 border-primary`.
* Inactive item: `text-sidebar-foreground hover:bg-secondary hover:text-foreground`.
* Bottom section: `p-4 border-t border-border`.
* Logout: `text-destructive hover:bg-destructive/10`.

Composes:

* shadcn `Button` with app nav variant.
* Lucide icons.

---

### Topbar

Purpose:

* Dark global header with notification and avatar actions.

Likely props:

```ts
type TopbarProps = {
  currentUser?: User;
  showMobileBrand?: boolean;
  actions?: React.ReactNode;
};
```

Visual rules:

* `h-16 bg-topbar border-b border-border flex items-center justify-between px-6 text-white shrink-0`.
* Bell icon: `text-gray-300 hover:text-white`.
* Avatar: `h-8 w-8 rounded-full border-2 border-slate-700`.

Composes:

* shadcn `Button`
* shadcn `Avatar`
* optional `DropdownMenu`

---

### PageContainer

Purpose:

* Standard centered page layout for dashboard, backlog, admin, and sprint history.

Likely props:

```ts
type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "full";
};
```

Visual rules:

* Default: `p-8 max-w-5xl mx-auto h-full`.
* Full board-like pages should not use default centering.

Composes:

* Plain layout wrapper.

---

### BoardPageContainer

Purpose:

* Full-width board layout with horizontal scrolling.

Likely props:

```ts
type BoardPageContainerProps = {
  children: React.ReactNode;
};
```

Visual rules:

* `h-full flex flex-col pt-6 px-6 overflow-hidden`.

---

### PageHeader

Purpose:

* Reusable title/subtitle/action block.

Likely props:

```ts
type PageHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  size?: "default" | "board";
};
```

Visual rules:

* Standard: `flex justify-between items-start mb-6`.
* Dashboard may use `mb-8`.
* Board title: `text-3xl font-bold`.
* Standard title: `text-2xl font-bold`.
* Subtitle: `text-sm text-muted-foreground mt-1`.

Composes:

* shadcn `Badge`
* shadcn `Button`
* `SearchField`

---

### SectionHeader

Purpose:

* Column/table/modal subsection header.

Likely props:

```ts
type SectionHeaderProps = {
  title: string;
  actions?: React.ReactNode;
  count?: number;
};
```

Visual rules:

* Kanban column: `flex items-center justify-between mb-4`.
* Heading: `text-lg font-bold text-slate-800`.

---

### SearchField

Purpose:

* Standard search input with left icon.

Likely props:

```ts
type SearchFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};
```

Visual rules:

* Wrapper: `relative`.
* Icon: `absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`.
* Input: `pl-10`.

Composes:

* shadcn `Input`
* Lucide `Search`

---

### DataTablePanel

Purpose:

* Shared white table container for Backlog, Admin Projects, and Sprint History.

Likely props:

```ts
type DataTablePanelProps = {
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
};
```

Visual rules:

* `bg-card border border-border rounded-lg shadow-sm flex flex-col flex-1 overflow-hidden`.
* Toolbar: `p-4 border-b border-border bg-surface-subtle`.
* Footer: `bg-surface-subtle px-6 py-3 border-t border-border`.
* Table area: `overflow-x-auto flex-1`.

Composes:

* shadcn `Card`
* shadcn `Table`
* shadcn `Separator`

---

### ProjectCard

Purpose:

* Dashboard project card.

Likely props:

```ts
type ProjectCardProps = {
  project: Project;
  onClick?: () => void;
};
```

Visual rules:

* `bg-card border border-border rounded-lg p-6 hover:shadow-md hover:border-primary/40 transition cursor-pointer`.
* Icon square: `p-2 bg-accent text-primary rounded-md`.
* Footer: `mt-4 pt-4 border-t border-gray-100`.
* Status: success pill.

Composes:

* shadcn `Card`
* shadcn `Badge`

---

### KanbanColumn

Purpose:

* Fixed-width board column.

Likely props:

```ts
type KanbanColumnProps = {
  title: string;
  cards: TaskCard[];
  canCreate?: boolean;
  onCreate?: () => void;
  onCardClick?: (id: string) => void;
};
```

Visual rules:

* Wrapper: `w-80 flex flex-col shrink-0`.
* Header: `mb-4`.
* Body: `flex-1 bg-kanban-column rounded-lg p-3 overflow-y-auto space-y-3 border border-border`.

Composes:

* `KanbanTaskCard`
* shadcn `Button`
* Dropdown/Menu for future actions

---

### KanbanTaskCard

Purpose:

* Board task card.

Likely props:

```ts
type KanbanTaskCardProps = {
  card: TaskCard;
  assignee?: User;
  onClick?: () => void;
};
```

Visual rules:

* `bg-card p-4 rounded-md shadow-sm border-t border-r border-b border-border cursor-pointer hover:shadow hover:border-blue-300 transition group relative`.
* Optional semantic left border:

  * `border-l-4 border-l-orange-400` for delivery in 24h.
  * `border-l-4 border-l-purple-500` for Planning Poker.
  * `border-l-4 border-l-red-200` for blocked.
  * `border-l-4 border-l-transparent` default.
* Title: `text-sm font-semibold leading-tight text-slate-800 group-hover:text-primary`.
* Footer: ID badge, due date, avatar, story point bubble.
* New comments: red circular badge top-right.

Composes:

* shadcn `Card`
* shadcn `Badge`
* shadcn `Avatar`

---

### TaskIdBadge

Purpose:

* Standard display for task IDs.

Likely props:

```ts
type TaskIdBadgeProps = {
  id: string;
  size?: "sm" | "md";
};
```

Visual rules:

* `font-mono tracking-tighter bg-gray-50 text-gray-500 border border-gray-100 rounded`.
* Small: `text-xs px-1.5 py-0.5`.
* Modal: `text-xs px-2 py-1`.

Composes:

* shadcn `Badge`

---

### StatusBadge

Purpose:

* Unified badge for status values.

Likely props:

```ts
type StatusBadgeProps = {
  status: "A Fazer" | "Em Progresso" | "Revisão" | "Concluído" | "Ativo" | "Encerrada" | string;
  withDot?: boolean;
};
```

Visual rules:

* Pill shape for statuses.
* Active/progress uses blue.
* Active project uses green.
* Closed/neutral uses gray.
* Optional dot: `w-1.5 h-1.5 rounded-full`.

Composes:

* shadcn `Badge`

---

### PriorityBadge

Purpose:

* Unified priority badge.

Likely props:

```ts
type PriorityBadgeProps = {
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
};
```

Visual rules:

* `Baixa`: blue/info.
* `Média`: yellow/warning.
* `Alta` and `Urgente`: orange/urgent.
* Avoid backlog-specific red for `Alta` unless preserving a very specific screen is required.

Composes:

* shadcn `Badge`

---

### TypeBadge

Purpose:

* Task type badge.

Likely props:

```ts
type TypeBadgeProps = {
  type: "Task" | "Bug" | string;
};
```

Visual rules:

* `Task`: neutral gray.
* `Bug`: red/danger.

Composes:

* shadcn `Badge`

---

### WorkflowTagBadge

Purpose:

* Tags such as `Bloqueado`, `Planning Poker`, and `Entrega em 24h`.

Likely props:

```ts
type WorkflowTagBadgeProps = {
  tag: string;
};
```

Visual rules:

* `Bloqueado`: red.
* `Planning Poker`: purple.
* `Entrega em 24h`: orange.

Composes:

* shadcn `Badge`

---

### UserAvatar

Purpose:

* Standard avatar display.

Likely props:

```ts
type UserAvatarProps = {
  user?: User;
  size?: "xs" | "sm" | "md";
  bordered?: boolean;
};
```

Visual rules:

* `xs`: `h-6 w-6`.
* `sm`: `h-7 w-7`.
* `md`: `h-8 w-8`.
* Always `rounded-full`.
* Topbar uses dark border.

Composes:

* shadcn `Avatar`

---

### StoryPointBubble

Purpose:

* Circular story point indicator on Kanban cards and list rows.

Likely props:

```ts
type StoryPointBubbleProps = {
  points?: number | null;
  size?: "sm" | "md";
};
```

Visual rules:

* `bg-gray-100 rounded-full flex items-center justify-center font-semibold text-gray-600`.
* Small: `w-6 h-6 text-xs`.
* Medium: `w-7 h-7 text-xs`.

---

### ViewToggle

Purpose:

* Kanban/List segmented control.

Likely props:

```ts
type ViewToggleProps = {
  value: "kanban" | "list";
  onValueChange: (value: "kanban" | "list") => void;
};
```

Visual rules:

* Wrapper: `flex bg-gray-100 p-1 rounded-md`.
* Active item: `bg-card shadow-sm text-slate-800`.
* Inactive item: `text-gray-500 hover:text-slate-800`.
* Item: `flex items-center px-3 py-1.5 text-sm font-medium rounded-sm`.

Composes:

* shadcn `ToggleGroup` or `Button`

---

### EmptyState

Purpose:

* Empty tables, empty Kanban columns, no search results.

Likely props:

```ts
type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
};
```

Visual rules:

* Text-centered.
* Muted text.
* Compact spacing.
* Do not introduce illustration-heavy empty states.

Composes:

* shadcn `Button` optionally.

---

### LoadingState

Purpose:

* Loading placeholder for tables, cards, and pages.

Likely props:

```ts
type LoadingStateProps = {
  variant?: "page" | "table" | "cards";
};
```

Visual rules:

* Use muted skeletons.
* Keep layout dimensions stable.

Composes:

* shadcn `Skeleton`.

---

### ErrorState

Purpose:

* Error display for failed data loading or actions.

Likely props:

```ts
type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
};
```

Visual rules:

* Use destructive text sparingly.
* Prefer `Alert` with `destructive` variant.

Composes:

* shadcn `Alert`
* shadcn `Button`

---

### FormSection

Purpose:

* Groups related form fields in modals/pages.

Likely props:

```ts
type FormSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};
```

Visual rules:

* `space-y-4`.
* Optional section heading: `text-sm font-bold text-slate-800`.
* Optional separator when matching modal detail sections.

Composes:

* shadcn `Separator`
* shadcn `Form`

---

### CommentComposer

Purpose:

* Bottom composer in card detail modal.

Likely props:

```ts
type CommentComposerProps = {
  currentUser: User;
  placeholder?: string;
  submitLabel?: string;
  onSubmit?: (value: string) => void;
};
```

Visual rules:

* Outer: avatar + bordered input container.
* Container: `border border-input rounded-lg overflow-hidden bg-card focus-within:ring-1 focus-within:ring-ring focus-within:border-ring`.
* Textarea: `w-full p-3 resize-none outline-none text-sm min-h-[60px]`.
* Footer: `flex justify-between items-center bg-surface-subtle px-3 py-2 border-t border-border`.
* Submit: compact primary button.

Composes:

* shadcn `Textarea`
* shadcn `Button`
* shadcn `Avatar`

---

### ActivityItem

Purpose:

* Displays status changes and comments in the card detail modal.

Likely props:

```ts
type ActivityItemProps = {
  type: "status-change" | "comment";
  user?: User;
  timestamp: string;
  children: React.ReactNode;
};
```

Visual rules:

* Wrapper: `flex space-x-3`.
* Status icon: `w-6 h-6 rounded-full bg-gray-200 text-gray-500`.
* Comment avatar: `w-8 h-8 rounded-full shadow-sm`.
* Comment bubble: `bg-card p-3 rounded-lg border border-border text-sm text-gray-700 shadow-sm`.

Composes:

* shadcn `Avatar`
* shadcn `Badge`

---

### ChecklistItem

Purpose:

* Subtask checklist rows.

Likely props:

```ts
type ChecklistItemProps = {
  checked: boolean;
  label: string;
  highlighted?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};
```

Visual rules:

* `flex items-start space-x-3 p-3 bg-card border rounded-md shadow-sm cursor-pointer transition`.
* Default border: `border-border`.
* Highlighted current item: `border-blue-200 hover:bg-blue-50`.
* Checked label: `line-through text-gray-600`.

Composes:

* shadcn `Checkbox`

---

## 10. Tailwind/shadcn Implementation Plan

### `src/index.css` or `src/globals.css`

Use shadcn-compatible semantic variables. Prefer HSL variables if the project uses standard shadcn setup.

Recommended base:

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 210 20% 98%;              /* #F9FAFB */
    --foreground: 221 39% 11%;              /* #111827 / near slate-900 */

    --card: 0 0% 100%;                      /* #FFFFFF */
    --card-foreground: 215 28% 17%;         /* #1E293B */

    --popover: 0 0% 100%;
    --popover-foreground: 215 28% 17%;

    --primary: 221 83% 53%;                 /* #2563EB */
    --primary-foreground: 0 0% 100%;

    --secondary: 220 14% 96%;               /* #F3F4F6 */
    --secondary-foreground: 215 28% 17%;

    --muted: 210 40% 98%;                   /* #F8FAFC */
    --muted-foreground: 220 9% 46%;         /* #6B7280 */

    --accent: 214 100% 97%;                 /* #EFF6FF */
    --accent-foreground: 224 76% 48%;       /* #1D4ED8 */

    --destructive: 0 72% 51%;               /* #DC2626 */
    --destructive-foreground: 0 0% 100%;

    --border: 220 13% 91%;                  /* #E5E7EB */
    --input: 216 12% 84%;                   /* #D1D5DB */
    --ring: 217 91% 60%;                    /* #3B82F6 */

    --radius: 0.5rem;

    /* Lazuli app tokens */
    --topbar: 222 47% 11%;                  /* #0F172A */
    --topbar-foreground: 216 12% 84%;       /* #D1D5DB */

    --sidebar: 0 0% 100%;
    --sidebar-foreground: 215 16% 35%;      /* #4B5563 */
    --sidebar-active: 214 100% 97%;         /* #EFF6FF */
    --sidebar-active-foreground: 224 76% 48%;

    --kanban-column: 220 14% 96%;           /* #F3F4F6 */
    --surface-subtle: 210 20% 98%;          /* #F9FAFB */

    --success: 142 71% 45%;                 /* #22C55E / close */
    --success-foreground: 138 76% 20%;      /* #166534 */
    --success-muted: 138 76% 97%;           /* #F0FDF4 / close */

    --warning: 45 93% 35%;                  /* #A16207 */
    --warning-muted: 55 92% 95%;            /* #FEFCE8 */

    --urgent: 20 75% 40%;                   /* #C2410C */
    --urgent-muted: 33 100% 96%;            /* #FFF7ED */

    --danger-muted: 0 86% 97%;              /* #FEF2F2 */

    --planning: 272 72% 47%;                /* #7E22CE */
    --planning-muted: 270 100% 98%;         /* #FAF5FF / close */
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
```

If using Tailwind v4 with `@theme`, expose app tokens as utilities:

```css
@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --color-topbar: hsl(var(--topbar));
  --color-topbar-foreground: hsl(var(--topbar-foreground));
  --color-sidebar: hsl(var(--sidebar));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-active: hsl(var(--sidebar-active));
  --color-sidebar-active-foreground: hsl(var(--sidebar-active-foreground));
  --color-kanban-column: hsl(var(--kanban-column));
  --color-surface-subtle: hsl(var(--surface-subtle));

  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));
  --color-success-muted: hsl(var(--success-muted));
  --color-warning: hsl(var(--warning));
  --color-warning-muted: hsl(var(--warning-muted));
  --color-urgent: hsl(var(--urgent));
  --color-urgent-muted: hsl(var(--urgent-muted));
  --color-danger-muted: hsl(var(--danger-muted));
  --color-planning: hsl(var(--planning));
  --color-planning-muted: hsl(var(--planning-muted));

  --radius-sm: calc(var(--radius) - 0.25rem);
  --radius-md: calc(var(--radius) - 0.125rem);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 0.25rem);
}
```

### `tailwind.config.ts`, if applicable

If the project uses Tailwind v3 or a shadcn setup requiring config extension, add semantic colors:

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
        topbar: {
          DEFAULT: "hsl(var(--topbar))",
          foreground: "hsl(var(--topbar-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          active: "hsl(var(--sidebar-active))",
          "active-foreground": "hsl(var(--sidebar-active-foreground))",
        },
        "kanban-column": "hsl(var(--kanban-column))",
        "surface-subtle": "hsl(var(--surface-subtle))",
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          muted: "hsl(var(--warning-muted))",
        },
        urgent: {
          DEFAULT: "hsl(var(--urgent))",
          muted: "hsl(var(--urgent-muted))",
        },
        danger: {
          muted: "hsl(var(--danger-muted))",
        },
        planning: {
          DEFAULT: "hsl(var(--planning))",
          muted: "hsl(var(--planning-muted))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### `components.json`

Use shadcn defaults with TypeScript and Tailwind CSS.

Recommended setup:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

If using Tailwind v4 without `tailwind.config.ts`, keep the config path aligned with the actual project setup and keep CSS variables enabled.

### `src/lib/utils.ts`

Use the standard shadcn `cn` helper:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

All reusable components should use `cn` for conditional variants.

### `src/components/ui/*`

Install/customize these shadcn components first:

```txt
button
input
textarea
select
checkbox
radio-group
card
dialog
dropdown-menu
badge
alert
table
tabs
separator
sheet
form
avatar
skeleton
toggle-group
```

Customize only the variant definitions needed to match Lazuli. Avoid editing every component usage manually.

Priority customizations:

1. `button.tsx`

   * Add `dark` variant.
   * Ensure default size matches compact prototype.
   * Ensure `outline` has white background and subtle shadow.

2. `badge.tsx`

   * Add semantic variants: `success`, `neutral`, `danger`, `warning`, `urgent`, `info`, `planning`, `id`.
   * Add size variants if using CVA.

3. `tabs.tsx`

   * Add or create underline-style tab trigger.
   * Prevent browser-default focus outline from appearing.

4. `dialog.tsx`

   * Keep base shadcn behavior.
   * Use app-specific wrappers for dimensions.

5. `input.tsx`, `textarea.tsx`, `select.tsx`

   * Keep compact height and blue focus ring.

### `src/components/app/*`

Recommended structure:

```txt
src/components/app/
  layout/
    AppShell.tsx
    Sidebar.tsx
    Topbar.tsx
    PageContainer.tsx
    PageHeader.tsx
  navigation/
    SidebarNavItem.tsx
    ViewToggle.tsx
  data/
    DataTablePanel.tsx
    EmptyState.tsx
    LoadingState.tsx
    ErrorState.tsx
  projects/
    ProjectCard.tsx
  kanban/
    KanbanColumn.tsx
    KanbanTaskCard.tsx
    StoryPointBubble.tsx
  tasks/
    TaskIdBadge.tsx
    StatusBadge.tsx
    PriorityBadge.tsx
    TypeBadge.tsx
    WorkflowTagBadge.tsx
  activity/
    ActivityItem.tsx
    CommentComposer.tsx
    ChecklistItem.tsx
  forms/
    SearchField.tsx
    FormSection.tsx
```

### Example Tailwind usage

Primary button:

```tsx
<Button>Nova Task</Button>
```

Outline filter button:

```tsx
<Button variant="outline">
  <Filter className="mr-2 h-4 w-4" />
  Filtrar
</Button>
```

Page container:

```tsx
<PageContainer>
  <PageHeader
    title="Backlog de Tasks"
    subtitle="Gestão de tasks não atribuídas à sprint."
    actions={<Button>Nova Task</Button>}
  />
</PageContainer>
```

Kanban column container:

```tsx
<div className="w-80 shrink-0">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-bold text-slate-800">A Fazer</h2>
  </div>

  <div className="flex-1 rounded-lg border border-border bg-kanban-column p-3 space-y-3 overflow-y-auto">
    {/* cards */}
  </div>
</div>
```

Status badge:

```tsx
<StatusBadge status="Em Progresso" withDot />
```

Task ID badge:

```tsx
<TaskIdBadge id="ALF-102" />
```

---

## 11. Migration Rules

These rules are strict for coding agents and human developers.

1. Preserve visual appearance.

   * Do not redesign the interface.
   * Do not “modernize” spacing, colors, typography, cards, or navigation beyond normalization required for reuse.

2. Replace inline styles and duplicated utility strings with Tailwind classes and reusable components.

3. Prefer semantic tokens over hardcoded colors.

   * Use `bg-primary`, `text-muted-foreground`, `border-border`, `bg-card`, etc.
   * Avoid repeated raw classes like `bg-blue-600` unless inside a tokenized component variant.

4. Prefer shadcn components over custom primitive components.

   * Use shadcn `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Card`, `Dialog`, `Badge`, `Table`, `Tabs`, and `Form`.
   * Only create custom primitives when shadcn does not fit the prototype pattern.

5. Prefer component variants over duplicated Tailwind strings.

   * Badge colors must be variants.
   * Button styles must be variants.
   * Repeated cards and panels must be app components.

6. Keep pages thin.

   * Page files should compose app components.
   * Avoid embedding long repeated JSX structures directly in views.

7. Extract repeated UI into reusable components.

   * Extract sidebar items, badges, task cards, table panels, search fields, page headers, and modal sections.

8. Do not introduce new behavior.

   * Migration is visual/structural unless explicitly asked otherwise.
   * Do not add new menus, navigation flows, validations, filters, or state changes that are not already present.

9. Do not modify copy unless necessary.

   * Keep all Portuguese labels, titles, badges, placeholders, and button text as-is.

10. Normalize inconsistencies carefully.

* Priority colors may be normalized into a single semantic mapping.
* Radius, modal overlays, table headers, and button sizing may be normalized if the result still matches the screenshots.

11. Preserve layout constraints.

* Sidebar remains `w-64`.
* Topbar remains `h-16`.
* Kanban columns remain `w-80`.
* Board remains horizontally scrollable.
* Standard pages remain centered with `max-w-5xl`.

12. Preserve density.

* Do not increase font sizes, card padding, table row height, or gaps beyond the prototype’s scale.

13. Preserve icon style.

* Use Lucide icons.
* Keep common icon sizes: 16px, 18px, 20px, 24px depending context.

14. Preserve modal patterns.

* Create-card modal: medium form dialog.
* Card-detail modal: large two-column dialog.
* Estimate modal: compact voting dialog.
* Do not replace these with drawers or full pages.

15. Preserve responsive behavior.

* Sidebar hidden below `md`.
* Dashboard grid responsive.
* Card detail modal stacks below `md`.
* Tables use horizontal overflow.
* Board uses horizontal overflow.

---

## 12. Visual QA Checklist

Use this checklist to compare the refactored UI against the original screenshots.

### Global layout

* [ ] App shell uses white sidebar, dark navy topbar, and pale gray content canvas.
* [ ] Sidebar width is 256px.
* [ ] Topbar height is 64px.
* [ ] Main content scrolls independently from topbar/sidebar.
* [ ] Sidebar is hidden below the medium breakpoint.
* [ ] Topbar avatar and notification icon align to the right.

### Colors

* [ ] Main background matches the pale gray prototype.
* [ ] Cards, tables, modals, and sidebar are white.
* [ ] Topbar is dark navy.
* [ ] Primary actions use Lazuli blue.
* [ ] Active sidebar item uses pale blue background, blue text, and blue left border.
* [ ] Muted text appears gray, not black.
* [ ] Borders are light gray and subtle.
* [ ] Semantic badges match the prototype’s red/orange/yellow/blue/green/purple system.
* [ ] Destructive/logout actions use red.

### Typography

* [ ] Board title is larger than standard page titles.
* [ ] Standard page titles are bold and around 24px.
* [ ] Modal titles are around 20px.
* [ ] Kanban column titles are around 18px.
* [ ] Default UI text is around 14px.
* [ ] Badges, timestamps, and metadata are around 12px.
* [ ] Task IDs use monospace styling.
* [ ] Kanban card titles use tight line height.

### Spacing

* [ ] Standard pages use 32px padding.
* [ ] Board page uses 24px top/horizontal padding.
* [ ] Dashboard card grid gap is 24px.
* [ ] Kanban column gap is 24px.
* [ ] Kanban column inner padding is 12px.
* [ ] Kanban card padding is 16px.
* [ ] Modal body padding is 24px.
* [ ] Form field gaps are 16–20px.
* [ ] Table cells use approximately 24px horizontal and 16px vertical padding.

### Radius

* [ ] Buttons and inputs use small/medium radius.
* [ ] Kanban cards use medium radius.
* [ ] Dashboard cards and table panels use large radius.
* [ ] Modals use extra-large radius.
* [ ] Avatars, status pills, and story point bubbles are fully rounded.

### Shadows

* [ ] Cards and tables use subtle shadows.
* [ ] Dashboard project cards gain a stronger shadow on hover.
* [ ] Kanban cards gain a subtle stronger shadow on hover.
* [ ] Modals use large/elevated shadows.
* [ ] Topbar remains visually flat.

### Borders

* [ ] Sidebar has a right border.
* [ ] Sidebar header and bottom area have separators.
* [ ] Cards and table panels have 1px gray borders.
* [ ] Table rows have subtle dividers.
* [ ] Inputs have gray borders and blue focus state.
* [ ] Active sidebar item has a 4px blue left border.
* [ ] Special Kanban cards preserve colored left accents.
* [ ] Modal detail split has a vertical divider.

### Buttons and controls

* [ ] Primary buttons are blue with white text and subtle shadow.
* [ ] Primary button hover darkens.
* [ ] Secondary/outline buttons are white with gray border.
* [ ] Icon buttons use gray icons and subtle hover states.
* [ ] Segmented Kanban/List control has gray wrapper and white active segment.
* [ ] Disabled buttons appear lighter and non-interactive.
* [ ] Focus states use blue rings, not browser-default black outlines.

### Cards

* [ ] Dashboard project cards match white bordered cards with icon square and footer divider.
* [ ] Kanban cards show badges, title, task ID, due date, avatar, and story points.
* [ ] New comment indicator appears as a small red circle at top-right.
* [ ] Kanban card hover changes shadow/border and title color.
* [ ] Table/list panels remain white, bordered, rounded, and subtly shadowed.

### Tables and lists

* [ ] Table headers are uppercase, small, gray, and letter-spaced.
* [ ] Table rows have white background and pale hover state.
* [ ] ID columns use muted monospace text.
* [ ] Row titles use semibold slate text.
* [ ] Actions are right-aligned gray icons.
* [ ] Tables remain horizontally scrollable on smaller widths.
* [ ] Backlog footer matches pale gray footer with count and pagination controls.

### Modals

* [ ] Modal overlay uses dark slate tint.
* [ ] Modal panels are white, rounded-xl, and elevated.
* [ ] Create-card modal has header/body/footer structure.
* [ ] Create-card modal footer has pale gray background and right-aligned actions.
* [ ] Card-detail modal is split into two equal columns on desktop.
* [ ] Card-detail right panel uses pale slate background.
* [ ] Card-detail composer stays at the bottom of the modal.
* [ ] Detail modal tabs use blue underline active state.
* [ ] Estimate modal uses compact width, large voting buttons, warning alert, and disabled confirm state.

### Responsive behavior

* [ ] Sidebar hides below `md`.
* [ ] Dashboard cards move from one to two to three columns.
* [ ] Card-detail modal stacks vertically below `md`.
* [ ] Kanban board remains horizontally scrollable.
* [ ] Tables remain horizontally scrollable.
* [ ] Create-card modal body scrolls when viewport height is insufficient.
* [ ] Page headers do not break awkwardly at narrower widths.
