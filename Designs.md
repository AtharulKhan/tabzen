# TabZen Design System

## Overview
A modern, minimalist design system for TabZen - a productivity-focused Chrome extension that transforms the new tab experience with customizable widgets and beautiful aesthetics.

## Brand Identity

### Primary Focus
- **Productivity**: Efficient workflows and quick access to essential tools
- **Minimalism**: Clean, uncluttered interface that reduces cognitive load
- **Customization**: Personalized experiences that adapt to individual needs
- **Performance**: Lightning-fast interactions and smooth animations
- **Accessibility**: Inclusive design that works for everyone

### Brand Colors

#### Primary Palette
- **Primary Blue**: `hsl(217, 91%, 60%)` - Focus, productivity, trust
- **Secondary Purple**: `hsl(271, 81%, 56%)` - Creativity, innovation, premium
- **Accent Coral**: `hsl(11, 100%, 65%)` - Energy, attention, action

#### Supporting Colors
- **Success Green**: `hsl(142, 76%, 36%)` - Completed tasks, positive feedback
- **Warning Amber**: `hsl(45, 100%, 51%)` - Important notifications
- **Error Red**: `hsl(0, 84%, 60%)` - Errors, deletions, alerts
- **Info Blue**: `hsl(201, 90%, 50%)` - Information, tips, guidance

#### Neutral Grays
- **Background**: `hsl(0, 0%, 98%)` - Light mode base
- **Surface**: `hsl(0, 0%, 100%)` - Widget backgrounds
- **Border**: `hsl(0, 0%, 90%)` - Subtle separations
- **Muted**: `hsl(0, 0%, 60%)` - Secondary text
- **Foreground**: `hsl(0, 0%, 10%)` - Primary text

#### Dark Mode
- **Background Dark**: `hsl(0, 0%, 8%)` - Dark mode base
- **Surface Dark**: `hsl(0, 0%, 12%)` - Widget backgrounds
- **Border Dark**: `hsl(0, 0%, 20%)` - Subtle separations
- **Muted Dark**: `hsl(0, 0%, 40%)` - Secondary text
- **Foreground Dark**: `hsl(0, 0%, 95%)` - Primary text

### Typography

#### Font Family
- **Primary**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono (for code/notes)
- **Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

#### Hierarchy
- **Display**: `32px/40px`, Font Weight `700` - Main dashboard title
- **Heading 1**: `24px/32px`, Font Weight `600` - Widget titles
- **Heading 2**: `20px/28px`, Font Weight `600` - Section headers
- **Body Large**: `16px/24px`, Font Weight `400` - Primary content
- **Body Regular**: `14px/20px`, Font Weight `400` - Standard text
- **Body Small**: `12px/16px`, Font Weight `400` - Captions, labels
- **Micro**: `10px/12px`, Font Weight `500` - Tiny labels

## Layout & Spacing

#### Container
- **Max Width**: `1400px` - Dashboard container
- **Widget Gap**: `16px` - Space between widgets
- **Padding**: `16px` (mobile), `24px` (tablet), `32px` (desktop)

#### Grid System
- **Columns**: 12-column grid
- **Breakpoints**:
  - Mobile: < 640px (1-2 columns)
  - Tablet: 640px - 1024px (2-4 columns)
  - Desktop: > 1024px (4-6 columns)

#### Spacing Scale
- **2xs**: `2px`
- **xs**: `4px`
- **sm**: `8px`
- **md**: `16px`
- **lg**: `24px`
- **xl**: `32px`
- **2xl**: `48px`
- **3xl**: `64px`

## Components

### Widgets

#### Base Widget Container
- **Background**: Surface color with 0.8 opacity
- **Border**: 1px solid Border color
- **Border Radius**: `12px`
- **Padding**: `16px`
- **Backdrop Filter**: `blur(10px)` - Glassmorphism effect
- **Shadow**: `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- **Hover**: Transform scale(1.02), enhanced shadow

#### Widget Header
- **Layout**: Flex row with space-between
- **Title**: Heading 2 style
- **Actions**: Icon buttons (16px)
- **Margin Bottom**: `12px`

### Buttons

#### Primary Button
- **Background**: Primary color
- **Text**: White
- **Padding**: `8px 16px`
- **Border Radius**: `8px`
- **Font Weight**: `500`
- **Hover**: Brightness 110%, transform translateY(-1px)
- **Active**: Brightness 90%, transform translateY(0)

#### Secondary Button
- **Background**: Transparent
- **Border**: 1px solid Border color
- **Text**: Foreground color
- **Hover**: Background Muted/10%

#### Icon Button
- **Size**: `32px x 32px`
- **Border Radius**: `8px`
- **Background**: Transparent
- **Hover**: Background Muted/10%
- **Icon Size**: `16px`

### Form Elements

#### Input Field
- **Height**: `36px`
- **Padding**: `8px 12px`
- **Border**: 1px solid Border color
- **Border Radius**: `8px`
- **Background**: Surface color
- **Focus**: Border Primary color, outline 2px Primary/20%

#### Textarea
- **Padding**: `8px 12px`
- **Min Height**: `80px`
- **Resize**: Vertical only
- **Other**: Same as Input Field

#### Checkbox
- **Size**: `16px x 16px`
- **Border Radius**: `4px`
- **Checked**: Primary color background, white checkmark

### Cards

#### Quick Link Card
- **Size**: `80px x 80px`
- **Border Radius**: `12px`
- **Display**: Flex column center
- **Icon**: `32px` favicon
- **Label**: Body Small, truncate
- **Hover**: Transform scale(1.05)

#### Todo Item
- **Layout**: Flex row with checkbox
- **Padding**: `8px`
- **Border Bottom**: 1px solid Border color
- **Completed**: Text strike-through, opacity 0.6

## Gradients, Shadows & Animations

### Gradients
- **Hero Gradient**: `linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(271, 81%, 56%) 100%)`
- **Subtle Background**: `radial-gradient(circle at top right, hsl(217, 91%, 60%, 0.1), transparent)`
- **Glass Overlay**: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`

### Shadows & Effects
- **Small Shadow**: `0 1px 3px 0 rgb(0 0 0 / 0.1)`
- **Medium Shadow**: `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- **Large Shadow**: `0 10px 15px -3px rgb(0 0 0 / 0.1)`
- **Glow Effect**: `0 0 20px hsl(217, 91%, 60%, 0.3)`
- **Glass Border**: `1px solid rgba(255, 255, 255, 0.18)`

### Animations

#### Micro-interactions
- **Hover Lift**: `transform: translateY(-2px)` with 200ms ease
- **Click Press**: `transform: scale(0.98)` with 100ms ease
- **Fade In**: `opacity 0→1` with 300ms ease
- **Slide In**: `transform: translateY(10px)→0` with 300ms ease-out

#### Widget Animations
- **Widget Add**: Fade in + scale from 0.95→1
- **Widget Remove**: Fade out + scale to 0.95
- **Drag Start**: Scale 1.05 + shadow increase
- **Drag End**: Spring animation to position

#### Page Transitions
- **Initial Load**: Staggered fade in for widgets
- **Theme Switch**: Smooth color transition 400ms
- **Layout Change**: Grid animation with 300ms ease

### Special Effects

#### Glassmorphism
```css
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.18);
```

#### Neumorphism (Optional)
```css
background: #f0f0f0;
box-shadow: 5px 5px 10px #d0d0d0, -5px -5px 10px #ffffff;
```

## Widget-Specific Designs

### Quick Links Widget
- Grid layout: 3x3 or 4x4
- Gap: 12px between links
- Add button: Dashed border style

### Todo List Widget
- Max height: 400px with scroll
- Completed items: Move to bottom
- Add task: Prominent input at top

### Notes Widget
- Min height: 200px
- Monospace font for better readability
- Word count in bottom right

### Weather Widget
- Large temperature display
- Weather icon: 48px
- Location text: Body Small

### Quotes Widget
- Quote text: Body Large, italic
- Author: Body Small, right-aligned
- Refresh button: Top right corner

## Accessibility

### Color Contrast
- **Normal Text**: Minimum 4.5:1 ratio
- **Large Text**: Minimum 3:1 ratio
- **Interactive**: Minimum 3:1 ratio
- **Focus Indicators**: 3px outline with high contrast

### Keyboard Navigation
- **Tab Order**: Logical flow through widgets
- **Focus Visible**: Clear focus indicators
- **Shortcuts**: Documented keyboard shortcuts
- **Skip Links**: Hidden skip navigation

### Screen Readers
- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Descriptive labels for icons
- **Live Regions**: For dynamic updates
- **Alt Text**: For all images

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Implementation Guidelines

### CSS Architecture
- **Methodology**: CSS Modules with BEM naming
- **Variables**: CSS Custom Properties for theming
- **Organization**: Component-based structure
- **Performance**: Critical CSS inline, rest lazy-loaded

### Component Structure
```css
/* Widget Component Example */
.widget {
  /* Layout */
  position: relative;
  display: flex;
  flex-direction: column;
  
  /* Appearance */
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  
  /* Effects */
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
  
  /* Animation */
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.widget:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-lg);
}

.widget__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.widget__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--foreground);
}

.widget__content {
  flex: 1;
  overflow: auto;
}
```

### Theme Implementation
```javascript
// Theme colors as CSS variables
const themes = {
  light: {
    '--background': 'hsl(0, 0%, 98%)',
    '--surface': 'hsl(0, 0%, 100%)',
    '--border': 'hsl(0, 0%, 90%)',
    '--foreground': 'hsl(0, 0%, 10%)',
    '--primary': 'hsl(217, 91%, 60%)',
  },
  dark: {
    '--background': 'hsl(0, 0%, 8%)',
    '--surface': 'hsl(0, 0%, 12%)',
    '--border': 'hsl(0, 0%, 20%)',
    '--foreground': 'hsl(0, 0%, 95%)',
    '--primary': 'hsl(217, 91%, 60%)',
  }
};
```

## Best Practices

### Performance
- Use CSS transforms for animations
- Implement virtual scrolling for long lists
- Lazy load widget content
- Minimize repaints and reflows

### Responsive Design
- Mobile-first approach
- Flexible grid system
- Touch-friendly targets (44px minimum)
- Adaptive widget layouts

### Consistency
- Consistent spacing system
- Unified color palette
- Standard animation timings
- Predictable interactions

This design system ensures TabZen delivers a beautiful, functional, and accessible experience across all devices and user preferences.