# Task ID: phase8-whitelabel
# Agent: Main Architect
# Task: Phase 8 - White Label & Custom Domains (API + Dashboard Component)

## Work Log
- Read worklog.md to understand project context (Phases 1-4 complete, SmartTicketQR platform)
- Verified Prisma schema: Station model has branding fields (customDomain, brandLogo, brandColor, companyName, isWhiteLabel)
- Checked existing patterns: db import from @/lib/db, shadcn/ui components, framer-motion usage
- Created `src/app/api/stations/branding/route.ts`:
  - GET handler: takes `stationId` query param, returns station with 7 branding fields
  - PATCH handler: receives optional fields, updates Station record, returns updated station
  - Uses `db` from `@/lib/db`, proper error handling, French error messages
- Created `src/components/dashboard/WhiteLabelSection.tsx`:
  - Client component with `{ stationId }` prop
  - Draft-based state management (no useEffect+setState, avoids lint rule `react-hooks/set-state-in-effect`)
  - useQuery to fetch branding from `/api/stations/branding`
  - useMutation for PATCH save with toast notifications
  - 5 form cards: Custom Domain (with Globe icon + URL preview), Brand Name, Brand Color (native picker + hex input + swatch), Logo URL (with image preview), White Label Switch
  - DNS configuration info card (blue theme) with CNAME instructions
  - Live preview panel (expandable) simulating departure board header with brand colors
  - Dark theme throughout (bg-slate-900, text-white, border-slate-800)
  - All specified icons: Globe, Palette, ExternalLink, Info, Save, Loader2, Eye
  - shadcn/ui components: Card, Input, Label, Switch, Button, Separator
  - framer-motion animations on cards and preview
- Fixed lint error: removed useEffect+setState pattern, replaced with derived state from query
- Fixed lint warnings: removed unused eslint-disable directives
- Final lint: 0 errors, 0 warnings

## Files Created
1. `src/app/api/stations/branding/route.ts` — API route (GET + PATCH) for station branding
2. `src/components/dashboard/WhiteLabelSection.tsx` — White Label settings dashboard tab

## Stage Summary
- Phase 8 white label files complete and validated
- Draft-based state pattern avoids cascading render lint issues
- Zero lint errors
