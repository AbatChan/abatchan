# abatchan Roadmap

Last updated: July 24, 2026

## Current Position

**Public brand:** `abatchan`  
**Legal entity:** `ABATCHAN LTD`  
**Primary domain:** `abatchan.com`  
**Canonical public URL:** `https://abatchan.com`  
**Redirect:** `www.abatchan.com` should redirect to the canonical domain.

## Brand System

### Complete

- [x] Brand name and public styling: `abatchan`
- [x] Brand positioning: connected digital systems
- [x] Core line: "If it plugs in, I build it."
- [x] Core palette: `#0D0D0D`, `#F5F5F3`, and `#6366F1`
- [x] Logo system and initial social assets
- [x] Logo motion direction
- [x] Brand guide: `../ABATCHAN_BRAND_GUIDE.txt`

### Still active

- [ ] Consolidate final SVG, PNG, favicon, and app-icon export pack
- [ ] Create a concise media kit and press kit
- [ ] Create reusable social templates

## Technical Foundation

### Complete

- [x] Domain purchased: `abatchan.com`
- [x] WHOIS privacy and auto-renew enabled
- [x] GitHub repository connected to Vercel
- [x] Production hosting connected
- [x] Automatic production deployments from `main`
- [x] HTTPS / SSL provisioned by Vercel
- [x] Domain DNS connected and propagated

### Important distinction

GitHub push -> Vercel deployment is **continuous deployment**. It becomes a
full CI/CD pipeline only when automated code-quality checks and tests are
enforced before production merges.

### Next technical tasks

- [ ] Confirm `abatchan.com` is canonical and `www` redirects to it
- [ ] Add `.env*` ignore rules before any secrets are introduced
- [ ] Enable GitHub branch protection for `main`
- [ ] Enable two-factor authentication on Namecheap, GitHub, and Vercel
- [ ] Add automated checks: HTML validation / linting, build checks, and later tests
- [ ] Add Vercel Web Analytics and Speed Insights
- [ ] Add a custom 404 page

## Website

### Now shipping

- [x] Replace the static coming-soon page with the official brand landing site
- [x] Responsive visual system and accessible navigation
- [x] Contact entry point
- [x] Brand, systems, identity, and colour sections

### Next build increment

- [ ] Move the static site to Next.js App Router when content needs routing,
  CMS integration, metadata automation, or richer case-study pages
- [ ] Add a projects index and individual case-study pages
- [ ] Add an about page with real founder / studio context
- [ ] Add products pages for AI.EXE, Estimatio AI, and future products
- [ ] Add a contact form with spam protection and a delivery destination
- [ ] Add favicon, web manifest, Open Graph image, sitemap, and robots.txt
- [ ] Add light mode only as a complete theme, not a one-off colour inversion

### Recommended production stack for the next increment

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion, used with restraint
- Vercel Analytics and Speed Insights

## Portfolio and Content

### Showcase queue

- [ ] AI.EXE
- [ ] Estimatio AI
- [ ] Smart Digital Dashboard
- [ ] WordPress plugins
- [ ] Client projects with permission to publish
- [ ] Open source and experiments

### Content queue

- [ ] Publish a clear About page
- [ ] Document the first flagship project as a case study
- [ ] Publish the first engineering / systems article
- [ ] Create a launch post for the completed identity

## Business Operations

- [ ] Set up `hello@abatchan.com`
- [ ] Configure SPF, DKIM, and DMARC once email is chosen
- [ ] Create a business contact path and response process
- [ ] Prepare a media kit, proposal template, and case-study template

## Longer-Term Product Ecosystem

- AI.EXE
- Estimatio AI
- Smart Dashboard
- Developer tools and plugins
- Templates and APIs
- Documentation and developer portal
- Future SaaS products

## Progress View

| Area | Status |
| --- | --- |
| Brand foundation | Complete |
| Domain and hosting | Complete |
| Production deployment | Complete |
| Launch site | Active |
| Portfolio | Planned |
| Products | Active / planned |
| Growth systems | Planned |

Do not use a fixed percentage. The work has separate streams that will advance
at different speeds. This status table remains useful as the brand grows.
