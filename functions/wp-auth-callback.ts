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

    const { site_url, user_login, password, site_name, user_id } = body;
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "").trim();

    console.log("[wp-auth-callback] Received request", { site_url, user_login: !!user_login, password: !!password, hasToken: !!userToken, hasUserId: !!user_id });

    if (!site_url || !user_login || !password) {
        return new Response(JSON.stringify({ error: "Missing site_url, user_login, or password", message: "Missing site_url, user_login, or password" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const baseUrl = site_url.replace(/\/$/, "");
    const restUrl = baseUrl.includes("/wp-json") ? baseUrl : `${baseUrl}/wp-json`;

    // Step 1: Verify credentials immediately by testing a REST API call
    let verified = false;
    let wpVersion = "";
    let siteName = site_name || "";

    try {
        // Create a timeout controller for credential verification (Deno compatible)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const testRes = await fetch(`${restUrl}/wp/v2/users/me`, {
            headers: {
                Authorization: "Basic " + btoa(`${user_login}:${password}`),
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (testRes.ok) {
            verified = true;
            const userData = await testRes.json();
            // Extract site name from user data if available
            if (!siteName) {
                siteName = userData.name || "";
            }
        }
    } catch (_e) {
        // Verification failed
    }

    if (!verified) {
        return new Response(JSON.stringify({
            error: "Credential verification failed. The application password may be invalid or the WordPress REST API may be blocked by a security plugin.",
            message: "Credential verification failed. The application password may be invalid or the WordPress REST API may be blocked by a security plugin.",
        }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Step 2: Save to database (if user token is provided, we link to that user)
    const insforge = createClient({
        baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
        anonKey: Deno.env.get("ANON_KEY")!,
        edgeFunctionToken: userToken || undefined,
    });

    let currentUser = await insforge.auth.getCurrentUser();
    let user = currentUser?.data?.user;

    // Fallback: if auth token verification failed but user_id was passed in body (from frontend useAuth hook)
    if (!user && user_id) {
        console.log("[wp-auth-callback] Using user_id from body as fallback:", user_id);
        try {
            // Verify user_id is valid format (UUID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(user_id)) {
                user = { id: user_id } as any;
            }
        } catch (_e) {
            // Not a valid UUID, skip fallback
        }
    }

    if (!user) {
        return new Response(JSON.stringify({
            error: "Authentication required. Please log in to SEO Tool first.",
            message: "Authentication required. Please log in to SEO Tool first.",
        }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const domain = new URL(baseUrl).hostname;

    // Check if website already exists for this user
    const { data: existing } = await insforge.database
        .from("websites")
        .select("id")
        .eq("domain", domain)
        .eq("user_id", user.id)
        .single();

    let dbResult;
    if (existing) {
        dbResult = await insforge.database.from("websites").update({
            wp_url: restUrl,
            wp_username: user_login,
            wp_app_password: password,
            cms_type: "wordpress",
            status: "active",
            niche: siteName || null,
        }).eq("id", existing.id).select().single();
    } else {
        dbResult = await insforge.database.from("websites").insert([{
            user_id: user.id,
            domain: domain,
            niche: siteName || null,
            cms_type: "wordpress",
            wp_url: restUrl,
            wp_username: user_login,
            wp_app_password: password,
            status: "active",
        }]).select().single();
    }

    if (dbResult.error) {
        return new Response(JSON.stringify({ error: "Failed to save website", detail: dbResult.error }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({
        success: true,
        website: dbResult.data,
        message: `${domain} is now connected! You can publish content directly to WordPress.`,
    }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
}
