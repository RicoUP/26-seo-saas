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

    const requestId = (body.request_id || "").trim();
    const keyword = (body.keyword || "").trim();

    if (!requestId || !keyword) {
        return new Response(JSON.stringify({ error: "Missing request_id or keyword" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const insforge = createClient({
        baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
        anonKey: Deno.env.get("ANON_KEY")!,
    });

    try {
        // Generate SEO blog post via OpenRouter
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": "https://up-agent.insforge.app",
                "X-Title": "SEO Tool Content Generator",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert SEO blog writer. Write a complete, original 2000+ word SEO blog post targeting the given keyword.

Return a JSON object with exactly these fields:
- title: SEO-optimized title under 60 characters
- meta_description: compelling meta description under 160 characters
- content_html: full blog post as clean HTML string with <h1>, <h2>, <p>, <ul>, <li> tags. Do NOT use markdown.
- word_count: integer word count

Make the content genuinely useful, well-structured, and designed to rank. Include a table of contents, key takeaways, and a conclusion.`,
                    },
                    {
                        role: "user",
                        content: `Write an SEO blog post targeting the keyword: "${keyword}"`,
                    },
                ],
                temperature: 0.6,
            }),
        });

        if (!openRouterRes.ok) {
            const err = await openRouterRes.text();
            await insforge.database.from("content_requests").update({ status: "draft" }).eq("id", requestId);
            return new Response(JSON.stringify({ error: "AI generation failed", detail: err }), {
                status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const chatData = await openRouterRes.json();
        const text = chatData.choices?.[0]?.message?.content || "{}";

        let result: any = {};
        try {
            const cleaned = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
            result = JSON.parse(cleaned);
        } catch (_e) {
            // Fallback: try to extract JSON from text
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                try { result = JSON.parse(match[0]); } catch (_e2) { }
            }
        }

        const title = result.title || `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} — Complete Guide`;
        const metaDescription = result.meta_description || "";
        const contentHtml = result.content_html || `<p>${text}</p>`;
        const wordCount = result.word_count || contentHtml.split(/\s+/).length;

        // Update the content request in DB
        const { error: updateError } = await insforge.database.from("content_requests").update({
            title,
            meta_description: metaDescription,
            content_html: contentHtml,
            word_count: wordCount,
            status: "ready",
            updated_at: new Date().toISOString(),
        }).eq("id", requestId);

        if (updateError) {
            console.error("DB update error:", updateError);
        }

        // If publish_method is wordpress, try to publish
        const { data: reqRow } = await insforge.database.from("content_requests")
            .select("*, websites( wp_url, wp_username, wp_app_password )")
            .eq("id", requestId)
            .single();

        if (reqRow && reqRow.publish_method === "wordpress" && reqRow.website_id) {
            const wp = (reqRow as any).websites;
            if (wp?.wp_url && wp?.wp_username && wp?.wp_app_password) {
                try {
                    await fetch(`${wp.wp_url}/wp/v2/posts`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: "Basic " + btoa(`${wp.wp_username}:${wp.wp_app_password}`),
                        },
                        body: JSON.stringify({
                            title,
                            content: contentHtml,
                            status: "publish",
                            excerpt: metaDescription,
                        }),
                    });
                    await insforge.database.from("content_requests").update({
                        status: "published",
                        publish_url: `${wp.wp_url?.replace(/\/wp-json$/, "")}/${title.toLowerCase().replace(/\s+/g, "-")}`,
                    }).eq("id", requestId);
                } catch (wpErr: any) {
                    console.error("WordPress publish error:", wpErr.message);
                }
            }
        }

        return new Response(JSON.stringify({ success: true, request_id: requestId, title, word_count: wordCount }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (err: any) {
        await insforge.database.from("content_requests").update({ status: "draft" }).eq("id", requestId);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
