// @ts-nocheck
/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />

export async function analyzeWithGemini(
    crawlData: any,
    performanceMetrics: any,
    marketData: any,
    competitors: any,
    apiKey: string
) {
    console.log(`Performing deep AI synthesis with Gemini 2.5...`)

    const prompt = `
    You are a world-class strategic business consultant and website auditor. 
    Analyze the following data and provide a comprehensive market-ready report.

    WEBSITE CONTENT (Markdown):
    ${JSON.stringify(crawlData.slice(0, 5).map((p: any) => p.markdown))}
    
    PERFORMANCE METRICS:
    ${JSON.stringify(performanceMetrics)}

    MARKET DATA & TRENDS:
    ${JSON.stringify(marketData)}

    TOP COMPETITORS:
    ${JSON.stringify(competitors)}
    
    Provide the following sections in JSON format:
    1. executive_summary: A 2-3 sentence strategic overview.
    2. brand_voice_analysis: Assessment of tone, consistency, and professional positioning.
    3. cta_analysis: Critical evaluation of conversion paths.
    4. market_intelligence: {
        competitive_gap: "Specific things competitors are doing better (from the data).",
        winning_strategies: "What is working in this niche according to trends.",
        swot: {
            strengths: ["List 2-3"],
            weaknesses: ["List 2-3"],
            opportunities: ["List 2-3"],
            threats: ["List 2-3"]
        }
    }
    5. ux_friction_points: List of specific user experience issues.
    6. content_gaps: Array of objects with 'topic' (string) and 'advice' (string) identifying missing SEO opportunities.
    7. strategic_recommendations: Top 5 priority fixes as an array of objects with 'title' and 'description'.
  `

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        }
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Gemini API error: ${error.message || response.statusText}`)
    }

    const result = await response.json()
    let content = result.candidates[0].content.parts[0].text

    // Clean potential markdown artifacts
    content = content.replace(/^```json/, '').replace(/```$/, '').trim();

    try {
        return JSON.parse(content)
    } catch (e) {
        console.error("Failed to parse Gemini JSON, attempting recovery...", content);
        // Basic recovery: if it ends with a comma before closing brace, fix it
        const fixed = content.replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(fixed);
    }
}


export async function discoverNiche(crawlData: any, apiKey: string): Promise<string> {
    console.log(`Performing deep niche discovery with Gemini...`)

    const prompt = `
    Analyze this website's content and provide a highly specific research phrase for market analysis.
    Identify: 
    1. Primary service/product 
    2. Target audience 
    3. Geographic location (if local) 
    4. Brand positioning (e.g. Luxury vs Budget)

    RULES:
    - Output ONLY the 10-word research phrase. 
    - DO NOT include apologies, explanations, or meta-talk (e.g. "Based on the content...", "I cannot find...").
    - If the website is empty or unclear, output exactly: "General business and industry trends"
    - MAX 30 words.

    Example Output: "High-end residential plumbing services in Birmingham, UK for homeowners"

    CONTENT:
    ${JSON.stringify(crawlData.slice(0, 3).map((p: any) => p.markdown))}
  `

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            })
        }
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Gemini niche discovery failed: ${error.message || response.statusText}`)
    }

    const result = await response.json()
    const niche = result.candidates[0].content.parts[0].text.trim()

    // Safety truncation
    return niche.length > 0 ? niche.substring(0, 300) : "General business and industry trends";
}
