# AuditPulse Product Requirements Document (PRD)

## Project Overview
AuditPulse is an AI-powered website audit platform that provides comprehensive insights into website performance, SEO, security, and market positioning.

## Core Features
1. **AI-Powered Website Audit**: Scans URLs to identify technical and content issues.
2. **Performance Analysis**: Integrates with Google PageSpeed Insights for mobile and desktop metrics.
3. **SEO & Market Research**: Uses SERP and Tavily APIs to analyze keywords, competitors, and industry trends.
4. **Security Check**: Perfroms SSL, header, and broken link analysis.
5. **PDF Export**: Generates professional PDF reports of audit results.
6. **Dashboard**: Manages multiple audits with real-time progress tracking.

## Technical Architecture
- **Frontend**: React + Vite + Tailwind CSS (Shadcn UI).
- **Backend**: Supabase Edge Functions (Deno).
- **Database**: Supabase (PostgreSQL) with Realtime capabilities.
- **External APIs**: Firecrawl, PageSpeed Insights, Gemini AI, Tavily, SERP API.

## API Endpoints (Backend)
- `run-audit`: Main orchestrator for the audit process.
- `create-checkout`: Handles Stripe checkout sessions.

## Authentication
- Users authenticate via Supabase Auth.
- Edge functions can be configured to verify JWTs or use Service Role keys for system-level operations.
