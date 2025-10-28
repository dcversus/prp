# PRP-002: Landing Page - Developer Implementation Guide

**Quick Start for Developers**

This guide provides step-by-step instructions for implementing the landing page specified in PRP-002.

---

## Prerequisites

- Node.js 20+ installed
- Access to dcversus/prp GitHub repository
- Vercel account (free tier)
- Access to DNS settings for theedgestory.org domain
- Basic knowledge of: Next.js, React, TypeScript, Tailwind CSS

---

## Project Setup (Day 1)

### 1. Create New Next.js Project

```bash
# Navigate to a workspace directory (NOT inside prp CLI repo)
cd ~/projects

# Create new Next.js app
npx create-next-app@latest prp-landing-page

# Options during setup:
# ✅ TypeScript: Yes
# ✅ ESLint: Yes
# ✅ Tailwind CSS: Yes
# ✅ src/ directory: Yes
# ✅ App Router: Yes
# ❌ Import alias: No (or use default @/*)

cd prp-landing-page
```

### 2. Install Additional Dependencies

```bash
# UI components (shadcn/ui)
npx shadcn-ui@latest init

# Animation library
npm install framer-motion

# Icons
npm install lucide-react

# Code syntax highlighting
npm install prism-react-renderer

# Development tools
npm install -D prettier prettier-plugin-tailwindcss
```

### 3. Project Structure

```
prp-landing-page/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (theme provider, fonts)
│   │   ├── page.tsx            # Home page (landing page)
│   │   ├── globals.css         # Global styles
│   │   └── api/                # API routes
│   │       ├── github-stats/route.ts
│   │       └── npm-stats/route.ts
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── sections/           # Landing page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── TemplateGallery.tsx
│   │   │   ├── LiveDemo.tsx
│   │   │   ├── GettingStarted.tsx
│   │   │   ├── Stats.tsx
│   │   │   ├── FAQ.tsx
│   │   │   └── Community.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── utils.ts            # Utility functions
│   │   └── constants.ts        # Constants (colors, text)
│   └── types/
│       └── index.ts            # TypeScript types
├── public/
│   ├── demos/                  # asciinema recordings
│   ├── images/                 # OG images, logos
│   └── fonts/                  # Custom fonts (if needed)
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Implementation Phases

### Phase 1: Layout & Hero (Days 1-2)

#### Step 1: Configure Theme

**tailwind.config.ts**:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // GitHub-inspired dark theme
        bg: {
          dark: '#0d1117',
          darker: '#010409',
          light: '#161b22',
          lighter: '#21262d',
        },
        primary: {
          DEFAULT: '#58a6ff',
          hover: '#79c0ff',
          dark: '#1f6feb',
        },
        accent: {
          green: '#3fb950',
          purple: '#bc8cff',
          orange: '#ff7b72',
          yellow: '#ffd700',
        },
        text: {
          primary: '#f0f6fc',
          secondary: '#8b949e',
          tertiary: '#6e7681',
        },
        border: {
          DEFAULT: '#30363d',
          muted: '#21262d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

#### Step 2: Create Header Component

**src/components/Header.tsx**:
```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { Menu, X, Github } from 'lucide-react'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-dark/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">PRP</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#templates" className="text-text-secondary hover:text-text-primary transition">
              Templates
            </Link>
            <Link href="#getting-started" className="text-text-secondary hover:text-text-primary transition">
              Getting Started
            </Link>
            <Link href="#faq" className="text-text-secondary hover:text-text-primary transition">
              FAQ
            </Link>
            <Link 
              href="https://github.com/dcversus/prp" 
              target="_blank"
              className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition"
            >
              <Github size={20} />
              <span>GitHub</span>
            </Link>
            <ThemeToggle />
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 space-y-4">
            {/* Add mobile nav links */}
          </nav>
        )}
      </div>
    </header>
  )
}
```

#### Step 3: Create Hero Section

**src/components/sections/Hero.tsx**:
```tsx
'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function Hero() {
  const [copied, setCopied] = useState(false)
  const command = 'npx @dcversus/prp'

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
            Bootstrap Beautiful Projects in Seconds
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-text-secondary mb-8">
            Multi-framework templates, beautiful terminal UI, and complete 
            open-source setup – all in one CLI. Stop configuring, start building.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <div className="flex items-center bg-bg-light border border-border rounded-lg px-4 py-3">
              <code className="text-primary font-mono">{command}</code>
              <button
                onClick={copyCommand}
                className="ml-4 p-2 hover:bg-bg-lighter rounded transition"
              >
                {copied ? <Check size={20} className="text-accent-green" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Secondary CTAs */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <a 
              href="https://github.com/dcversus/prp" 
              target="_blank"
              className="text-text-secondary hover:text-primary transition"
            >
              View on GitHub →
            </a>
            <span className="text-border">|</span>
            <a 
              href="#getting-started"
              className="text-text-secondary hover:text-primary transition"
            >
              Read Documentation →
            </a>
          </div>

          {/* Terminal Demo (placeholder for now) */}
          <div className="mt-16 bg-bg-darker border border-border rounded-lg p-8">
            <div className="aspect-video bg-bg-light rounded flex items-center justify-center">
              <p className="text-text-tertiary">Terminal animation will go here</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-accent-yellow">⭐</span>
              <span className="text-text-primary font-semibold">1.2K Stars</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-accent-purple">📦</span>
              <span className="text-text-primary font-semibold">12K/mo Downloads</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-accent-green">🏗️</span>
              <span className="text-text-primary font-semibold">5 Templates</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

#### Step 4: Wire Up Page

**src/app/page.tsx**:
```tsx
import { Header } from '@/components/Header'
import { Hero } from '@/components/sections/Hero'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        {/* Other sections will go here */}
      </main>
      <Footer />
    </>
  )
}
```

---

### Phase 2: Features & Templates (Days 3-4)

See PRP-002-Landing-Page.md Section 2.2 for feature copy and Section 2.3 for template details.

**Implementation pattern**:
```tsx
// src/components/sections/Features.tsx
export function Features() {
  const features = [
    {
      icon: '🎨',
      title: 'Beautiful Interactive CLI',
      description: 'React-based terminal UI powered by Ink...',
    },
    // ... more features
  ]

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need to Start Right
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="bg-bg-light border border-border rounded-lg p-6">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

### Phase 3: Integrations (Days 5-6)

#### GitHub Stats API Route

**src/app/api/github-stats/route.ts**:
```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.github.com/repos/dcversus/prp', {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!res.ok) {
      throw new Error('Failed to fetch GitHub stats')
    }

    const data = await res.json()

    return NextResponse.json({
      stars: data.stargazers_count,
      forks: data.forks_count,
      issues: data.open_issues_count,
      watchers: data.watchers_count,
    })
  } catch (error) {
    console.error('GitHub API error:', error)
    // Return fallback static numbers
    return NextResponse.json({
      stars: 1200,
      forks: 56,
      issues: 2,
      watchers: 100,
    })
  }
}
```

**Usage in component**:
```tsx
'use client'

import { useEffect, useState } from 'react'

export function Stats() {
  const [stats, setStats] = useState({ stars: 0, forks: 0 })

  useEffect(() => {
    fetch('/api/github-stats')
      .then(res => res.json())
      .then(setStats)
  }, [])

  return (
    <div>
      <span>⭐ {stats.stars.toLocaleString()} Stars</span>
    </div>
  )
}
```

---

### Phase 4: Terminal Demo (Days 7-8)

#### Record asciinema Demo

```bash
# Install asciinema
brew install asciinema  # macOS
# or: pip install asciinema

# Record demo
asciinema rec prp-demo.cast

# During recording:
# 1. Run: npx @dcversus/prp
# 2. Go through wizard: name, description, template, etc.
# 3. Let it generate project
# 4. Show success message
# 5. Exit (Ctrl+D)

# Convert to SVG (optional)
npm install -g svg-term-cli
svg-term --cast prp-demo.cast --out prp-demo.svg --window
```

#### Embed in Page

**Option A: asciinema-player**:
```tsx
'use client'

import { useEffect, useRef } from 'react'

export function LiveDemo() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Dynamically load asciinema-player
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/asciinema-player@3.7.0/dist/bundle/asciinema-player.min.js'
    document.body.appendChild(script)

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/asciinema-player@3.7.0/dist/bundle/asciinema-player.min.css'
    document.head.appendChild(link)

    script.onload = () => {
      if (ref.current) {
        // @ts-ignore
        AsciinemaPlayer.create('/demos/prp-demo.cast', ref.current, {
          autoPlay: true,
          loop: true,
          poster: 'npt:0:03',
        })
      }
    }
  }, [])

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          See PRP in Action
        </h2>
        <div className="max-w-4xl mx-auto">
          <div ref={ref} className="rounded-lg overflow-hidden"></div>
        </div>
      </div>
    </section>
  )
}
```

**Option B: Embedded SVG**:
```tsx
export function LiveDemo() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          See PRP in Action
        </h2>
        <div className="max-w-4xl mx-auto">
          <img 
            src="/demos/prp-demo.svg" 
            alt="PRP CLI Demo"
            className="w-full rounded-lg"
          />
        </div>
      </div>
    </section>
  )
}
```

---

### Phase 5: SEO & Meta Tags (Day 9)

**src/app/layout.tsx**:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PRP - Modern Project Bootstrap CLI | Multi-Framework Scaffolding Tool',
  description: 'Bootstrap beautiful projects in seconds with PRP. Multi-framework templates (React, FastAPI, NestJS), beautiful CLI, and complete open-source setup.',
  keywords: ['project scaffolding', 'CLI tool', 'react template', 'fastapi template', 'nestjs', 'typescript', 'yeoman alternative'],
  authors: [{ name: 'dcversus' }],
  openGraph: {
    type: 'website',
    url: 'https://prp.theedgestory.org',
    title: 'PRP - Modern Project Bootstrap CLI',
    description: 'Bootstrap beautiful projects in seconds. Multi-framework templates, beautiful terminal UI, and complete open-source setup.',
    images: [
      {
        url: 'https://prp.theedgestory.org/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PRP CLI Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRP - Modern Project Bootstrap CLI',
    description: 'Bootstrap beautiful projects in seconds.',
    images: ['https://prp.theedgestory.org/twitter-image.png'],
    creator: '@dcversus',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

---

### Phase 6: Deployment (Day 10)

#### 1. Create Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to GitHub repo? Yes
# - Project name: prp-landing-page
# - Framework: Next.js
# - Build command: (default)
# - Output directory: (default)
```

#### 2. Configure Custom Domain

In Vercel Dashboard:
1. Go to Project Settings → Domains
2. Add domain: `prp.theedgestory.org`
3. Follow DNS instructions

**DNS Configuration** (at domain registrar):
```
Type: CNAME
Name: prp
Value: cname.vercel-dns.com
TTL: 300
```

#### 3. Environment Variables

In Vercel Dashboard → Settings → Environment Variables:
```
GITHUB_TOKEN=your_github_token_here  (optional, for higher API rate limits)
```

#### 4. Set Up Automatic Deployments

In GitHub repo:
1. Settings → Webhooks (should be auto-configured by Vercel)
2. Every push to `main` will deploy to production
3. Every PR will get a preview deployment

---

## Testing Checklist

### Manual Testing
- [ ] All links work (no 404s)
- [ ] Copy buttons copy to clipboard
- [ ] Dark/light mode toggle works
- [ ] Mobile menu opens/closes
- [ ] Terminal animation plays
- [ ] GitHub/npm stats load (or fallback works)
- [ ] FAQ accordions expand/collapse
- [ ] Smooth scroll navigation works
- [ ] Forms submit correctly (if any)

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Performance Testing
- [ ] Run Lighthouse audit (target: >90 all categories)
- [ ] Check First Contentful Paint (<1.5s)
- [ ] Check Largest Contentful Paint (<2.5s)
- [ ] Check Time to Interactive (<3.5s)
- [ ] Optimize images (WebP, lazy loading)
- [ ] Optimize fonts (font-display: swap)

### Accessibility Testing
- [ ] Run axe DevTools scan (0 critical issues)
- [ ] Keyboard navigation works (tab through all elements)
- [ ] Focus indicators visible
- [ ] Screen reader test (NVDA or VoiceOver)
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Alt text on all images

### SEO Testing
- [ ] Test meta tags with https://metatags.io/
- [ ] Test Twitter Card with https://cards-dev.twitter.com/validator
- [ ] Test Facebook OG with https://developers.facebook.com/tools/debug/
- [ ] Submit sitemap to Google Search Console
- [ ] Verify robots.txt is correct
- [ ] Check structured data with Google Rich Results Test

---

## Launch Checklist

### Pre-Launch
- [ ] Final QA pass on production URL
- [ ] SSL certificate active (HTTPS)
- [ ] Custom domain working (prp.theedgestory.org)
- [ ] Analytics installed and tracking
- [ ] 404 page exists and looks good
- [ ] Meta tags correct (use debugger tools)
- [ ] OG images rendering correctly on social
- [ ] All content proofread (no typos)

### Launch Day
- [ ] Announce on Twitter/X (thread with screenshots)
- [ ] Post to Reddit (r/programming, r/node, r/javascript, r/webdev)
- [ ] Submit to Hacker News ("Show HN: PRP - Modern Project Bootstrap CLI")
- [ ] Post to Dev.to (article with tutorial)
- [ ] Submit to Product Hunt
- [ ] Share in Discord/Slack communities
- [ ] Email newsletter (if list exists)

### Post-Launch
- [ ] Monitor analytics (traffic sources, bounce rate)
- [ ] Respond to comments on social media
- [ ] Fix any reported bugs quickly
- [ ] Collect feedback for v2 improvements
- [ ] Update content based on user questions
- [ ] Add user testimonials as they come in

---

## Troubleshooting

### Common Issues

**Issue**: Build fails on Vercel
- Check `next.config.js` syntax
- Ensure all dependencies in `package.json`
- Check Node.js version (should be 20+)
- Review build logs for specific errors

**Issue**: Custom domain not working
- Wait 24-48 hours for DNS propagation
- Verify CNAME record is correct
- Check Vercel dashboard for SSL status
- Try accessing via `https://` explicitly

**Issue**: Images not loading
- Check `next.config.js` has `images.domains` configured
- Ensure images are in `public/` directory
- Use Next.js `<Image>` component for optimization
- Check browser console for 404 errors

**Issue**: GitHub API rate limited
- Add `GITHUB_TOKEN` environment variable
- Increase cache time (`revalidate: 600` = 10 min)
- Implement better fallback logic

**Issue**: Lighthouse scores low
- Optimize images (use WebP, `next/image`)
- Defer non-critical JavaScript
- Remove unused CSS
- Add `loading="lazy"` to images below fold
- Preload critical fonts

---

## Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/
- asciinema: https://asciinema.org/

### Tools
- Vercel: https://vercel.com
- Lighthouse: Chrome DevTools
- axe DevTools: Browser extension
- Plausible Analytics: https://plausible.io/

### Design Inspiration
- Full PRP-002 spec: `PRP-002-Landing-Page.md`
- Mockup: `research/landing-page-mockup.txt`
- Color palette: Section 4.1 in spec
- Typography: Section 4.2 in spec

---

**Questions?**
- Refer to full PRP-002 document for detailed specifications
- Check `/PRPs/research/` directory for mockups and diagrams
- Open GitHub issue for clarification

**Good luck with implementation!** 🚀
