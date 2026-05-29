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

    const { website_id } = body;
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "").trim();

    if (!website_id) {
        return new Response(JSON.stringify({ error: "Missing website_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const insforge = createClient({
        baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
        anonKey: Deno.env.get("ANON_KEY")!,
    });

    if (userToken) {
        insforge.auth.setSession({ access_token: userToken, refresh_token: "" } as any);
    }

    const { data: { user } } = await insforge.auth.getUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Fetch website (RLS ensures user owns it)
    const { data: website, error } = await insforge.database
        .from("websites")
        .select("*")
        .eq("id", website_id)
        .eq("user_id", user.id)
        .single();

    if (error || !website) {
        return new Response(JSON.stringify({ error: "Website not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    if (!website.wp_url || !website.wp_username || !website.wp_app_password) {
        return new Response(JSON.stringify({
            connected: false,
            error: "Missing credentials",
        }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    try {
        const testRes = await fetch(`${website.wp_url}/wp/v2/users/me`, {
            headers: {
                Authorization: "Basic " + btoa(`${website.wp_username}:${website.wp_app_password}`),
            },
        });

        const connected = testRes.ok;

        if (!connected) {
            // Mark as paused if credentials are invalid
            await insforge.database.from("websites")
                .update({ status: "paused" })
                .eq("id", website_id);
        }

        return new Response(JSON.stringify({
            connected,
            status: connected ? "active" : "paused",
            domain: website.domain,
        }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ connected: false, error: err.message }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
