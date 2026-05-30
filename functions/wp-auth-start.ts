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

    const { site_url } = body;
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "").trim();

    if (!site_url) {
        return new Response(JSON.stringify({ error: "Missing site_url" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Normalize URL
    const baseUrl = site_url.replace(/\/$/, "");
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://up-agent.vercel.app";

    // Step 1: Check if HTTPS
    if (!baseUrl.startsWith("https://")) {
        return new Response(JSON.stringify({
            error: "SSL (HTTPS) is required. WordPress blocks Application Passwords on non-secure sites. Please ensure your site has an active SSL certificate.",
        }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Step 2: Discover the authorization endpoint via the REST API
    let restApiUrl = `${baseUrl}/wp-json`;
    if (baseUrl.includes("/wp-json")) {
        restApiUrl = baseUrl;
    }

    let authUrl: string | null = null;

    try {
        // Create a timeout controller for discovery (Deno compatible)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const discoveryRes = await fetch(restApiUrl, {
            method: "GET",
            headers: { "Accept": "application/json" },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (discoveryRes.ok) {
            const apiData = await discoveryRes.json();
            authUrl = apiData?.authentication?.["application-passwords"]?.endpoints?.authorization || null;
        }
    } catch (_e) {
        // Discovery failed — fallback to default URL
    }

    // Fallback to default authorization URL if discovery failed
    if (!authUrl) {
        // Try to construct from the base URL
        const wpAdminUrl = baseUrl.includes("/wp-json")
            ? baseUrl.replace("/wp-json", "/wp-admin")
            : `${baseUrl}/wp-admin`;
        authUrl = `${wpAdminUrl}/authorize-application.php`;
    }

    // Step 3: Build the redirect URL with query parameters
    const callbackUrl = `${frontendUrl}/settings?wp_callback=1`;
    const rejectUrl = `${frontendUrl}/settings?wp_rejected=1`;

    const params = new URLSearchParams({
        app_name: "SEO Tool",
        success_url: callbackUrl,
        reject_url: rejectUrl,
    });

    // Optional: Add app_id for better key organization (UUID)
    // Using a static app identifier for SEO Tool
    params.append("app_id", "seo-tool-app-2026");

    const redirectUrl = `${authUrl}?${params.toString()}`;

    return new Response(JSON.stringify({
        redirect_url: redirectUrl,
        site_url: baseUrl,
    }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}
