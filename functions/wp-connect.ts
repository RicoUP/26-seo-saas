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

    const { site_url, secret, site_name, wp_version } = body;
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "").trim();

    if (!site_url || !secret) {
        return new Response(JSON.stringify({ error: "Missing site_url or secret" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Normalize URL to rest_url (wp-json)
    const baseUrl = site_url.replace(/\/$/, "");
    const restUrl = baseUrl.includes("/wp-json") ? baseUrl : `${baseUrl}/wp-json`;

    try {
        // Step 1: Ask WordPress plugin to create an application password
        const connectRes = await fetch(`${restUrl}/rankai/v1/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret, saas_url: Deno.env.get("FRONTEND_URL") || "https://up-agent.vercel.app" }),
        });

        if (!connectRes.ok) {
            const errText = await connectRes.text();
            return new Response(JSON.stringify({
                error: "WordPress connection failed. Make sure the RankAI Connector plugin is installed and activated.",
                detail: errText,
                wp_status: connectRes.status,
            }), {
                status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const wpData = await connectRes.json();
        const { wp_url, username, app_password } = wpData;

        if (!wp_url || !username || !app_password) {
            return new Response(JSON.stringify({ error: "Invalid response from WordPress plugin" }), {
                status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Step 2: Verify credentials by testing a REST API call
        const testRes = await fetch(`${wp_url}/wp/v2/users/me`, {
            headers: {
                Authorization: "Basic " + btoa(`${username}:${app_password}`),
            },
        });

        if (!testRes.ok) {
            return new Response(JSON.stringify({
                error: "Connection succeeded but credential test failed. Please try again.",
                detail: await testRes.text(),
            }), {
                status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Step 3: Save to database (if user token is provided, we link to that user)
        // For edge functions invoked with anon key + user JWT, we create an insforge client
        const insforge = createClient({
            baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
            anonKey: Deno.env.get("ANON_KEY")!,
        });

        if (userToken) {
            insforge.auth.setSession({ access_token: userToken, refresh_token: "" } as any);
        }

        const { data: { user } } = await insforge.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: "Authentication required. Please log in to RankAI first." }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const domain = new URL(site_url).hostname;
        const { data: existing } = await insforge.database
            .from("websites")
            .select("id")
            .eq("domain", domain)
            .eq("user_id", user.id)
            .single();

        let dbResult;
        if (existing) {
            dbResult = await insforge.database.from("websites").update({
                wp_url: wp_url,
                wp_username: username,
                wp_app_password: app_password,
                cms_type: "wordpress",
                status: "active",
                niche: site_name || null,
            }).eq("id", existing.id).select().single();
        } else {
            dbResult = await insforge.database.from("websites").insert([{
                user_id: user.id,
                domain: domain,
                niche: site_name || null,
                cms_type: "wordpress",
                wp_url: wp_url,
                wp_username: username,
                wp_app_password: app_password,
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

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
