import { createClient } from "npm:@insforge/sdk@latest";

export default async function (req: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (_e) {
    // ignore parse errors
  }

  const task: string = body.task || "What can you help me with?";

  // Verify OpenRouter key is available
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Call OpenRouter LLM
  const openRouterRes = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://up-agent.insforge.app",
        "X-Title": "Up-Agent",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful research assistant running as an InsForge agent. Be concise and actionable.",
          },
          {
            role: "user",
            content: task,
          },
        ],
      }),
    }
  );

  if (!openRouterRes.ok) {
    const errText = await openRouterRes.text();
    return new Response(
      JSON.stringify({
        error: "LLM call failed",
        status: openRouterRes.status,
        detail: errText,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const chatData = await openRouterRes.json();
  const result: string =
    chatData.choices?.[0]?.message?.content || "No response";

  // Optionally persist result to database if agent_runs table exists
  try {
    const insforge = createClient({
      baseUrl: Deno.env.get("INSFORGE_BASE_URL")!,
      anonKey: Deno.env.get("ANON_KEY")!,
    });
    await insforge.database
      .from("agent_runs")
      .insert([{ task, result, status: "completed" }]);
  } catch (_e) {
    // silently skip if table doesn't exist
  }

  return new Response(
    JSON.stringify({
      task,
      result,
      model: "openai/gpt-4o-mini",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
