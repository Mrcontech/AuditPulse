// @ts-nocheck
/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crawlSite } from './firecrawl.ts'
import { getPageSpeedMetrics } from './pagespeed.ts'
import { getSerpData } from './serp.ts'
import { getMarketInsights, getCompetitors } from './tavily.ts'
import { analyzeWithGemini, discoverNiche } from './gemini.ts'
import { checkSecurity } from './security.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let currentAuditId: string | null = null;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Global audit timeout: 120s exceeded')), 120000)
    );

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json()
        const { url, auditId } = body.record?.message || body
        currentAuditId = auditId;
        const domain = new URL(url).hostname

        console.log(`[${auditId}] Starting audit for ${url}`)

        const runAuditTask = (async () => {
            // 1. Initial State
            await supabase.from('audits').update({
                status: 'crawling',
                progress: 10,
                progress_label: 'Initializing engine and starting crawl...'
            }).eq('id', auditId)

            // 2. Initial Data Collection (Crawl + Performance)
            console.log(`[${auditId}] Running crawl and metrics...`)
            const [crawlData, performance] = await Promise.all([
                (async () => {
                    const res = await crawlSite(url, Deno.env.get('FIRECRAWL_API_KEY') ?? '');
                    await supabase.from('audits').update({ progress: 25, progress_label: 'Site crawl complete. Analyzing content...' }).eq('id', auditId);
                    return res;
                })(),
                (async () => {
                    const res = await getPageSpeedMetrics(url, Deno.env.get('PAGESPEED_API_KEY') ?? '');
                    await supabase.from('audits').update({ progress: 35, progress_label: 'Performance metrics calculated.' }).eq('id', auditId);
                    return res;
                })(),
            ])

            // 3. Niche Discovery
            console.log(`[${auditId}] Performing niche discovery...`)
            await supabase.from('audits').update({ status: 'analyzing', progress: 45, progress_label: 'Discovering business niche and market context...' }).eq('id', auditId)
            const niche = await discoverNiche(crawlData, Deno.env.get('GEMINI_API_KEY') ?? '')

            // 4. Parallel Research
            console.log(`[${auditId}] Running research (SEO, Insights, Competitors)...`)
            await supabase.from('audits').update({ progress: 55, progress_label: 'Researching industry trends and competitors...' }).eq('id', auditId)
            const [seo, insights, competitors, security] = await Promise.all([
                getSerpData(domain, Deno.env.get('SERP_API_KEY') ?? ''),
                getMarketInsights(niche, Deno.env.get('TAVILY_API_KEY') ?? ''),
                getCompetitors(niche, Deno.env.get('TAVILY_API_KEY') ?? ''),
                checkSecurity(url, crawlData)
            ])

            await supabase.from('audits').update({ progress: 70, progress_label: 'Market research complete. Starting deep AI analysis...' }).eq('id', auditId)

            // 5. Deep AI Synthesis
            console.log(`[${auditId}] Finalizing synthesis...`)
            const aiAnalysis = await analyzeWithGemini(
                crawlData,
                performance,
                insights,
                competitors,
                Deno.env.get('GEMINI_API_KEY') ?? ''
            )

            await supabase.from('audits').update({ progress: 90, progress_label: 'Synthesis complete. Saving your strategic roadmap...' }).eq('id', auditId)

            // 6. Store Results
            const { error: resultError } = await supabase.from('audit_results').insert({
                audit_id: auditId,
                performance_score: performance.desktop.score,
                lcp_desktop: performance.desktop.lcp,
                cls_desktop: performance.desktop.cls,
                inp_desktop: performance.desktop.inp,
                lcp_mobile: performance.mobile.lcp,
                cls_mobile: performance.mobile.cls,
                inp_mobile: performance.mobile.inp,
                seo_score: 85,
                keywords: seo.organic_results,
                industry_trends: insights.sources,
                market_insights: insights.answer,
                competitor_analysis: competitors,
                competitive_gap: aiAnalysis.market_intelligence.competitive_gap,
                content_gaps: aiAnalysis.content_gaps,
                market_gap: aiAnalysis.market_intelligence.winning_strategies,
                swot_analysis: aiAnalysis.market_intelligence.swot,
                security_score: security.security_score,
                ssl_valid: security.ssl_valid,
                security_headers: security.security_headers,
                broken_links: security.broken_links,
                executive_summary: aiAnalysis.executive_summary,
                brand_voice_analysis: aiAnalysis.brand_voice_analysis,
                cta_analysis: aiAnalysis.cta_analysis,
                ux_friction_points: aiAnalysis.ux_friction_points,
                strategic_recommendations: aiAnalysis.strategic_recommendations,
                crawl_data: crawlData,
                pages_crawled: crawlData.length
            })

            if (resultError) throw resultError

            await supabase.from('audits').update({
                status: 'complete',
                progress: 100,
                progress_label: 'Audit completed successfully!',
                completed_at: new Date().toISOString()
            }).eq('id', auditId)

            console.log(`[${auditId}] Audit completed successfully`)
        })();

        // Race against 120s timeout
        await Promise.race([runAuditTask, timeoutPromise]);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (err: any) {
        console.error(`Audit failed: ${err.message}`)

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (currentAuditId) {
            await supabase.from('audits').update({
                status: 'failed',
                error_message: err.message,
                progress_label: 'Audit failed',
                progress: 0
            }).eq('id', currentAuditId)
        }

        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
