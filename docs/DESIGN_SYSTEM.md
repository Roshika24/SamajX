# SamajX — Design System

Visual reference: the "Design Hub / Design Summit" editorial style — bold purple panels,
bright yellow diagonal swooshes, white floating cards, expressive serif headlines,
playful doodle elements, arch-shaped photo crops, pill buttons, countdown timers.

---

## 1. Design Tokens (CSS Custom Properties)

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-purple` | `#9B2CFA` | Primary brand, hero panels, headers |
| `--color-purple-light` | `#C77DFF` | Hover states, tints |
| `--color-purple-dark` | `#7B1FCC` | Active states, pressed |
| `--color-purple-bg` | `#F3E8FF` | Light purple backgrounds |
| `--color-yellow` | `#FFE600` | Accent highlights, swooshes, keyword emphasis |
| `--color-yellow-light` | `#FFF9CC` | Yellow tint backgrounds |
| `--color-cyan` | `#19C6F0` | Secondary accent, links, info badges |
| `--color-cyan-light` | `#D4F5FC` | Cyan tint backgrounds |
| `--color-pink` | `#FF7AC6` | Tertiary accent, celebration, badges |
| `--color-pink-light` | `#FFE0F0` | Pink tint backgrounds |
| `--color-ink` | `#14101F` | Primary text, dark buttons |
| `--color-ink-light` | `#4A4458` | Secondary text |
| `--color-ink-muted` | `#8E86A0` | Muted/placeholder text |
| `--color-white` | `#FFFFFF` | Card backgrounds, light text |
| `--color-gray-50` | `#FAFAFA` | Page background |
| `--color-gray-100` | `#F4F2F7` | Alternate section backgrounds |
| `--color-gray-200` | `#E8E5ED` | Borders, dividers |
| `--color-gray-300` | `#D0CDD7` | Disabled states |
| `--color-success` | `#22C55E` | Success states, completed |
| `--color-success-bg` | `#DCFCE7` | Success backgrounds |
| `--color-warning` | `#F59E0B` | Warning states |
| `--color-warning-bg` | `#FEF3C7` | Warning backgrounds |
| `--color-error` | `#EF4444` | Error states, destructive |
| `--color-error-bg` | `#FEE2E2` | Error backgrounds |

### WCAG AA Contrast Notes
- `--color-ink` on `--color-white`: 16.4:1 ✅
- `--color-white` on `--color-purple`: 4.6:1 ✅ (large text), use bold for body
- `--color-ink` on `--color-yellow`: 14.7:1 ✅
- `--color-ink` on `--color-gray-50`: 15.8:1 ✅
- `--color-purple` on `--color-white`: 4.6:1 ✅ (large text only — use for headings/links, not small body)
- For small text on purple backgrounds, always use white or yellow

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | `'Fraunces', 'DM Serif Display', Georgia, serif` | Display headlines, hero text |
| `--font-body` | `'Plus Jakarta Sans', 'Inter', system-ui, sans-serif` | Body text, UI elements |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', monospace` | Code, verification codes |

Google Fonts import:
```
Fraunces:wght@400;700;900
Plus Jakarta Sans:wght@400;500;600;700
```

| Token | Value |
|-------|-------|
| `--text-xs` | `0.75rem` (12px) |
| `--text-sm` | `0.875rem` (14px) |
| `--text-base` | `1rem` (16px) |
| `--text-lg` | `1.125rem` (18px) |
| `--text-xl` | `1.25rem` (20px) |
| `--text-2xl` | `1.5rem` (24px) |
| `--text-3xl` | `2rem` (32px) |
| `--text-4xl` | `2.5rem` (40px) |
| `--text-5xl` | `3.5rem` (56px) |
| `--line-tight` | `1.15` |
| `--line-normal` | `1.5` |
| `--line-relaxed` | `1.75` |
| `--weight-normal` | `400` |
| `--weight-medium` | `500` |
| `--weight-semibold` | `600` |
| `--weight-bold` | `700` |
| `--weight-black` | `900` |

### Spacing Scale

| Token | Value |
|-------|-------|
| `--space-1` | `0.25rem` (4px) |
| `--space-2` | `0.5rem` (8px) |
| `--space-3` | `0.75rem` (12px) |
| `--space-4` | `1rem` (16px) |
| `--space-5` | `1.25rem` (20px) |
| `--space-6` | `1.5rem` (24px) |
| `--space-8` | `2rem` (32px) |
| `--space-10` | `2.5rem` (40px) |
| `--space-12` | `3rem` (48px) |
| `--space-16` | `4rem` (64px) |
| `--space-20` | `5rem` (80px) |
| `--space-24` | `6rem` (96px) |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `0.375rem` (6px) | Small inputs, chips |
| `--radius-md` | `0.75rem` (12px) | Cards, containers |
| `--radius-lg` | `1rem` (16px) | Larger cards, panels |
| `--radius-xl` | `1.5rem` (24px) | Hero cards, modal |
| `--radius-full` | `9999px` | Pill buttons, avatars, badges |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(20,16,31,0.08)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(20,16,31,0.1)` | Cards |
| `--shadow-lg` | `0 8px 24px rgba(20,16,31,0.12)` | Modals, dropdowns |
| `--shadow-xl` | `0 16px 48px rgba(20,16,31,0.16)` | Hero cards, floating elements |
| `--shadow-glow-purple` | `0 0 24px rgba(155,44,250,0.3)` | Purple glow effect |
| `--shadow-glow-yellow` | `0 0 24px rgba(255,230,0,0.3)` | Yellow glow effect |

### Transitions

| Token | Value |
|-------|-------|
| `--transition-fast` | `150ms ease` |
| `--transition-base` | `250ms ease` |
| `--transition-slow` | `400ms ease` |

All animations respect `prefers-reduced-motion: reduce` — disable transforms and use opacity-only fallbacks.

### Breakpoints

| Name | Value | Usage |
|------|-------|-------|
| `--bp-sm` | `480px` | Small phones |
| `--bp-md` | `768px` | Tablets |
| `--bp-lg` | `1024px` | Laptops |
| `--bp-xl` | `1280px` | Desktops |

Mobile-first: write base styles for mobile, use `@media (min-width: ...)` to enhance.

---

## 2. Base Components

### Button
- **Variants**: `primary` (ink bg, white text), `secondary` (white bg, ink border), `accent` (cyan bg, ink text), `ghost` (transparent), `danger` (error bg)
- **Sizes**: `sm`, `md`, `lg`
- **Shape**: pill (`border-radius: var(--radius-full)`)
- **States**: default, hover (slight lift + shadow), active (scale 0.97), disabled (gray, no pointer), loading (spinner)
- **Icons**: optional leading/trailing icon slot

### Card
- White background, `--radius-lg`, `--shadow-md`
- **Variants**: `default`, `elevated` (xl shadow), `outlined` (border, no shadow), `hero` (purple bg, white text, diagonal yellow swoosh via CSS pseudo-element)
- **Padding**: `--space-6`

### Chip
- Pill shape, small, used for categories/tags/specialities
- **Variants**: `default` (gray bg), `purple`, `cyan`, `pink`, `yellow`, `success`, `warning`, `error`
- **Sizes**: `sm`, `md`

### Badge
- Small indicator, pill shape, font-size `--text-xs`
- **Variants**: `beginner` (cyan), `intermediate` (yellow with ink text), `advanced` (purple), `status` (colored dot + text)

### Modal
- Centered overlay with backdrop blur
- White card, `--radius-xl`, `--shadow-xl`
- Close button top-right
- Smooth enter/exit animation (scale + opacity)

### Timer (Countdown)
- Large monospace digits in boxes (days : hours : mins : secs)
- Per the reference image: each digit in a rounded square, colon between
- Purple or ink text on white, or white text on purple variant
- Pulses gently when under 1 hour remaining
- Used on application windows and the leader dashboard

### ProgressBar
- Rounded bar with fill animation
- Color variants: purple (default), cyan, success, yellow
- Optional percentage label
- **XP variant**: shows current/next level with thresholds marked

### EmptyState
- Centered illustration (doodle SVG), headline, description, optional CTA button
- Friendly, encouraging microcopy
- Examples: "No problems yet — go report one!", "Your team's journey starts here"

### StatusIndicator
- Small colored dot + text label
- Colors map to problem/project/application statuses

### Avatar
- Circle or arch-shaped image crop
- **AvatarCluster**: overlapping stack of 3–5 avatars with +N overflow
- Colored background placeholder with initials when no image

### Input / TextArea / Select
- Clean bordered inputs with rounded corners (`--radius-sm`)
- Focus ring in purple
- Error state with red border and message below
- Label above, always visible (no floating labels)

### FileUpload
- Drag-and-drop zone with dashed border
- Preview thumbnails for images
- Progress bar for uploads

### MapPicker
- Leaflet map component for placing a pin
- Crosshair cursor, click to place marker
- Shows lat/lng below the map
- Search box overlay for location lookup (via Nominatim, free)

### Navbar
- Sticky top, white bg, shadow on scroll
- Logo left, nav links center (desktop), avatar/menu right
- Mobile: hamburger → slide-out drawer
- Role-based nav items

### Sidebar
- Desktop: fixed left sidebar for admin/leader dashboards
- Collapsible, icon-only mode
- Active item highlighted with purple accent

### Toast
- Non-blocking notification pop-up
- Bottom-right, auto-dismiss (5s), manual close
- Variants: success, error, info, warning

---

## 3. Doodle / Decorative Elements

Reusable SVGs:
- **Star** — 4-point and 6-point doodle stars (yellow, scattered on hero sections)
- **Sparkle burst** — small + shapes cluster (used near badges, celebrations)
- **Squiggle** — wavy decorative line (yellow or cyan, used as section dividers)
- **Swoosh** — diagonal band (yellow on purple, used on hero cards and panels)
- **Confetti pieces** — small shapes for CSS animation (triggered by canvas-confetti JS for real celebrations, CSS for static decoration)
- **Arrow doodle** — hand-drawn style arrow for "how it works" sections

All decorative SVGs are `aria-hidden="true"` and use `currentColor` for easy theming.

---

## 4. Page Inventory by Role

### Public Pages (no auth)
| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero section, how it works, stats, CTA |
| Login | `/login` | Email + password form |
| Register | `/register` | Tabbed: citizen / university / company |
| Leader Register | `/register/leader` | Promo code + credentials |
| Verify Certificate | `/verify/:code` | Public certificate details |
| Problem Detail (public) | `/problems/:id` | View problem (limited actions) |

### Citizen Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/citizen` | My reports, recent problems nearby, notifications |
| Problem Feed | `/citizen/problems` | List + map view, filters (status, domain, location) |
| Report Form | `/citizen/report` | Multi-step: details → category → map pin → photos → review |
| Problem Detail | `/citizen/problems/:id` | Upvote, comment, confirm fix, view progress |
| My Reports | `/citizen/reports` | List of own reports with status |
| Settings | `/citizen/settings` | Profile, email preferences |

### Leader Pages (THE FUN ONES)
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/leader` | Team hero card (avatar cluster, level badge, XP bar), active projects summary, countdown timers for open windows, certificate wall preview, badge shelf, "how to level up" tips |
| Team Management | `/leader/team` | Team name, members list, add/edit/remove members |
| Member Detail | `/leader/team/members/:id` | Member card, speciality chips, evidence list, score |
| Add Evidence | `/leader/team/members/:id/evidence` | Evidence form (type, title, link, faculty name) |
| Problem Browser | `/leader/problems` | Problems routed to my university, with countdown timers on open windows |
| Problem Detail | `/leader/problems/:id` | Full problem view + "Apply" CTA with countdown |
| Apply | `/leader/problems/:id/apply` | Application form (approach, timeline, skills, budget, solution type, mentor) |
| My Applications | `/leader/applications` | List with statuses, score breakdowns after ranking |
| Project Detail | `/leader/projects/:id` | Journey map, milestones, submit final report, sponsorship info |
| Post Milestone | `/leader/projects/:id/milestones/new` | Milestone form |
| Certificate Wall | `/leader/certificates` | Grid of earned certificates with download |
| Settings | `/leader/settings` | Profile |

#### Leader Dashboard — Detailed UX Spec
- **Hero Card**: Purple gradient background, yellow swoosh, team avatar cluster, team name in display serif, level badge (Beginner/Intermediate/Advanced) as a chip, XP progress bar toward next level threshold.
- **Active Projects**: Card per project with journey map thumbnail, progress percentage, next milestone hint.
- **Open Windows**: Live countdown timers (days:hrs:mins:secs) for problems they can apply to. Pulse animation when < 1 hour.
- **Badge Shelf**: Horizontal scrolling row of earned badges — "First Application", "First Completed Project", domain badges, etc. Empty slots show locked badges with "how to unlock" tooltip.
- **Certificate Wall**: Mini-cards of earned certificates, click to view/download. Confetti on first certificate.
- **Level Up Tips**: For Beginner teams, a friendly callout: "Add more evidence to level up! Here's how..." with links to evidence form.
- **Empty States**: Illustrated, encouraging. "Your journey begins! Create your team to get started." with a doodle illustration.

### University Admin Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/university` | Stats, pending actions count, quick links |
| Leader Queue | `/admin/university/leaders` | Approve/reject pending leaders |
| Teams | `/admin/university/teams` | Browse teams, view levels |
| Evidence Queue | `/admin/university/evidence` | Verify/reject member evidence |
| Problems | `/admin/university/problems` | Problems routed to this university |
| Classify Problem | `/admin/university/problems/:id/classify` | Set domain, difficulty, solution types |
| Applications | `/admin/university/applications` | Rate proposals, approve/reject selected |
| Projects | `/admin/university/projects` | Monitor active projects, sign off completion |
| Promo Code | `/admin/university/promo-code` | View, regenerate, revoke |
| Departments | `/admin/university/departments` | Manage departments |
| Settings | `/admin/university/settings` | University profile |

### Company Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/company` | My sponsorships summary, stats |
| Project Gallery | `/company/projects` | Browse approved projects, filter by domain/difficulty/location |
| Project Detail | `/company/projects/:id` | View project, team, problem, sponsor CTA |
| My Sponsorships | `/company/sponsorships` | List with lifecycle status |
| Settings | `/company/settings` | Company profile |

### Platform Admin Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/platform` | System-wide stats, pending counts |
| University Queue | `/admin/platform/universities` | Verify universities |
| Company Queue | `/admin/platform/companies` | Verify companies |
| Moderation Queue | `/admin/platform/moderation` | Flagged reports/comments, approve/dismiss |
| Unrouted Problems | `/admin/platform/unrouted` | Problems that couldn't be routed |
| All Problems | `/admin/platform/problems` | Browse/search all problems, split reports |
| Users | `/admin/platform/users` | User management |
| Audit Log | `/admin/platform/audit` | Searchable audit trail |

---

## 5. Celebration Animations (Leader UX)

Triggered via `canvas-confetti`:
1. **Team Selected**: Full-screen confetti burst (purple + yellow + cyan pieces) when the leader views a "selected" notification or the application status changes.
2. **Milestone Posted**: Small confetti pop from the "Post" button area.
3. **Certificate Issued**: Gold confetti shower + a "Congratulations!" modal with the certificate preview.
4. **Level Up**: Star burst animation when team level changes (Beginner → Intermediate, etc.).

CSS-only fallback for `prefers-reduced-motion`: replace confetti with a gentle fade-in checkmark/star icon.

---

## 6. Responsive Strategy

- **Mobile first**: base styles = mobile (< 480px)
- **480px+**: Wider cards, 2-column grids where appropriate
- **768px+**: Sidebar appears (collapsible), 2–3 column grids, map view beside list
- **1024px+**: Full sidebar, 3-column grids, larger hero sections
- **1280px+**: Max-width container (1200px), centered

Navigation:
- Mobile: bottom tab bar (citizen) or hamburger + drawer (other roles)
- Tablet+: top navbar + sidebar (admin/leader)

---

## 7. Accessibility Checklist

- [ ] All text meets WCAG AA contrast (4.5:1 normal, 3:1 large)
- [ ] All interactive elements are keyboard accessible (tab, enter, escape)
- [ ] Focus rings visible and high-contrast
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-live` regions for toast notifications and countdown timers
- [ ] `role="status"` on status indicators
- [ ] `alt` text on all meaningful images
- [ ] `aria-hidden="true"` on decorative SVGs
- [ ] `prefers-reduced-motion` respected: disable transforms, use opacity
- [ ] Skip-to-content link
- [ ] Form labels always visible (no placeholder-only labels)
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Modal focus trap
- [ ] Semantic HTML: `<main>`, `<nav>`, `<header>`, `<section>`, `<article>`
