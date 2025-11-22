# SAGAlyze Design Guidelines

## Design Approach
**Material Design System** adapted for medical/clinical applications. Prioritizes clarity, efficiency, and professional trust over visual flair. Reference: Healthcare dashboards like Epic MyChart, athenahealth, with modern touches from Linear's clean data presentation.

## Core Design Principles
1. **Clinical Clarity**: Information hierarchy supports rapid decision-making
2. **Professional Trust**: Conservative, clean aesthetic appropriate for medical context
3. **Data Density**: Efficient use of space for patient information and medical images
4. **Image-First**: Lesion images are primary content—give them prominence

---

## Typography System

**Font Family**: Roboto (via Google Fonts CDN)
- **Headings**: Roboto Medium (500)
  - H1: 2rem (32px) - Page titles
  - H2: 1.5rem (24px) - Section headers
  - H3: 1.25rem (20px) - Card headers, patient names
- **Body**: Roboto Regular (400)
  - Default: 1rem (16px) - Main content
  - Small: 0.875rem (14px) - Metadata, timestamps
  - Caption: 0.75rem (12px) - Labels, badges
- **Medical Data**: Roboto Mono Regular (400) at 0.875rem for patient IDs, confidence scores

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently
- Component padding: p-4 or p-6
- Section spacing: mb-8 or mb-12
- Card gaps: gap-4 or gap-6
- Page margins: p-6 on mobile, p-8 on desktop

**Grid Structure**:
- Dashboard: Sidebar (fixed 240px) + Main content (fluid)
- Patient cards: 2 columns on tablet (md:grid-cols-2), 3 on desktop (lg:grid-cols-3)
- Comparison view: 2-column equal split (grid-cols-2)
- Forms: Single column, max-w-2xl centered

---

## Navigation Architecture

**Side Navigation** (Desktop):
- Fixed left sidebar, 240px width, full height
- Logo at top with app name
- Icon + label navigation items vertically stacked (gap-2)
- Active state: subtle background fill
- Icons: Material Icons via CDN
- Bottom section: User profile, settings, logout

**Top Bar** (Mobile):
- Hamburger menu triggering drawer
- App logo centered
- Patient/context indicator on right

**Navigation Items**:
1. Dashboard (home icon)
2. New Case (add icon)
3. Capture Image (camera icon)
4. Analysis History (analytics icon)
5. Progress Tracker (trending_up icon)
6. Reports (description icon)
7. Patient Portal (person icon)

---

## Component Library

### Dashboard Cards
- White background (theme-aware), rounded-lg, shadow-sm
- Padding: p-6
- Header with icon, title (text-lg font-medium), and action button/menu
- Content area with clean data presentation
- Hover: subtle shadow-md transition

### Patient List Items
- Grid layout showing: Patient photo placeholder (40px circle), Name, ID, Last visit date, Status badge
- Click target: entire card with hover:bg-gray-50 transition
- Status badges: Small pill shape (px-3 py-1 rounded-full text-xs)

### Image Viewer Components
**Single Image Card**:
- Large square/rectangle container (min 400px desktop, full-width mobile)
- Border: border-2 border-gray-200
- Thumbnail strip below for multiple angles (if applicable)
- Metadata overlay: Semi-transparent bottom bar with date, location, zoom controls

**Before/After Comparison**:
- Two-column grid with equal widths (grid-cols-2 gap-4)
- Each image in rounded container with label above
- Synchronized zoom/pan controls
- Metrics panel below: Side-by-side statistics showing % change, size comparison

### Analysis Result Card
- Prominent diagnosis display (text-2xl font-medium) at top
- Confidence score: Large percentage (text-4xl) with circular progress indicator
- Classification breakdown: Horizontal bar chart showing all 4 categories (benign, malignant, rash, infection)
- Recommendation section: Border-l-4 with alert styling, text-base
- Action buttons: "Save to Report", "Request Second Opinion" (filled vs outlined)

### Progress Timeline
- Vertical timeline with dot markers
- Each entry: Date marker (left), Card with image thumbnail + brief diagnosis (right)
- Connecting line between dots
- Latest entry highlighted with primary accent

### Forms
- Label above input pattern (text-sm font-medium mb-2)
- Input fields: border rounded-md, px-4 py-3, focus:ring-2
- File upload: Dashed border drag-drop zone with icon + text
- Camera capture: Full-width button with camera icon, opens modal with live preview

### Reports Interface
- Header with patient info block (name, ID, date range)
- Sections divided by horizontal rules (my-8)
- Image grid showing lesion history
- Chart.js line graphs for trend visualization (max-w-3xl)
- Export button: Primary action, top-right, with PDF icon

### Patient Portal (OTP Login)
- Centered card layout (max-w-md mx-auto)
- Large OTP input (6-digit, individual boxes with gap-2)
- Limited view: Read-only cards showing their own progress
- No edit capabilities, simplified navigation

---

## Images

**Hero Image**: None - This is a clinical application dashboard, not a marketing site. Jump directly to functional interface.

**Medical Images**:
- Lesion photos: High-resolution, square aspect ratio preferred, displayed in cards with subtle shadows
- Placeholder: Gray background with medical cross icon when no image available
- Image quality indicator: Small badge showing resolution/quality status

**Icons**: Material Icons via CDN throughout
- Navigation icons: 24px
- Action buttons: 20px
- Status indicators: 16px

---

## Buttons & Interactive Elements

**Primary Actions**: Filled buttons (px-6 py-3 rounded-md, font-medium)
- Used for: "Analyze Lesion", "Save Report", "Generate PDF"

**Secondary Actions**: Outlined buttons (border-2, same padding)
- Used for: "Cancel", "View Details", "Compare"

**Text Buttons**: No background, underline on hover
- Used for: "Skip", "Learn More", tertiary actions

**Floating Action Button** (FAB):
- Fixed bottom-right on main screens
- "Add New Case" primary action (rounded-full, w-14 h-14, shadow-lg)

---

## Data Visualization

**Confidence Scores**: Circular progress rings (120px diameter) with percentage centered
**Trend Charts**: Line graphs via Chart.js, clean grid, single or dual-axis
**Comparison Metrics**: Large numbers (text-3xl) with small delta indicators (arrows + %)
**Status Indicators**: Color-coded dots (8px circle) with text label

---

## Responsive Behavior

**Breakpoints**:
- Mobile (<768px): Single column, bottom nav, stacked images
- Tablet (768-1024px): 2-column grids, side drawer nav
- Desktop (>1024px): Fixed sidebar, 3-column grids, side-by-side comparisons

**Mobile Optimizations**:
- Camera capture: Native camera input with live preview
- Image comparison: Swipeable carousel instead of side-by-side
- Navigation: Bottom tab bar with 5 primary items

---

## Theme Support

**Light Theme** (Default):
- Clean white backgrounds, gray-100 for secondary surfaces
- Text: gray-900 primary, gray-600 secondary

**Dark Theme**:
- Dark gray-900 backgrounds, gray-800 for cards
- Text: gray-100 primary, gray-400 secondary
- Same component structure, inverted colors

**Medical Accents** (consistent across themes):
- Primary: Teal-600 (trust, medical)
- Success: Green-600 (benign results)
- Warning: Amber-600 (caution)
- Error: Red-600 (malignant alerts)

---

## Animation Guidelines

**Minimal animations** - Medical context requires stability:
- Page transitions: Simple fade (200ms)
- Card hover: Shadow elevation only
- Loading states: Subtle spinner, no skeleton screens
- NO scroll-triggered animations or parallax effects