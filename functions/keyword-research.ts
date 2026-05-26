import { createClient } from "npm:@insforge/sdk@latest";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function (req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    let body: any = {};
    try { body = await req.json(); } catch (_e) { }

    const seedKeyword = (body.seed_keyword || "").trim().toLowerCase();
    if (!seedKeyword) {
        return new Response(JSON.stringify({ error: "Missing seed_keyword" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    try {
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": "https://up-agent.insforge.app",
                "X-Title": "RankAI Keyword Research",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert SEO keyword researcher. Given a seed keyword, return a JSON array of 8-12 related keyword opportunities. For each:
- keyword: the exact search phrase (lowercase)
- difficulty: estimated SEO difficulty 1-100 (higher = harder for small sites)
- search_volume: estimated monthly searches (realistic numbers, 100-50,000)
- intent: one of [informational, transactional, navigational, commercial]

Return ONLY valid JSON array with NO markdown or explanation.`,
                    },
                    {
                        role: "user",
                        content: `Find keyword opportunities for: "${seedKeyword}"`,
                    },
                ],
                temperature: 0.3,
            }),
        });

        if (!openRouterRes.ok) {
            const err = await openRouterRes.text();
            return new Response(JSON.stringify({ error: "AI failed", detail: err }), {
                status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const chatData = await openRouterRes.json();
        const text = chatData.choices?.[0]?.message?.content || "[]";

        // Extract JSON from possible markdown wrapping
        let keywords: any[] = [];
        try {
            const cleaned = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
            keywords = JSON.parse(cleaned);
            if (!Array.isArray(keywords)) keywords = [];
        } catch (_e) {
            // Fallback: try to find array in text
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
                try { keywords = JSON.parse(match[0]); } catch (_e2) { }
            }
        }

        return new Response(JSON.stringify({ keywords }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
