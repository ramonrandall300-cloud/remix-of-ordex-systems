import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { structureSummary } = await req.json();
    if (!structureSummary || typeof structureSummary !== "string") {
      return new Response(JSON.stringify({ error: "structureSummary is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a structural biologist AI assistant. Given PDB structure data, provide a concise scientific analysis. Return a JSON object with exactly these four keys:
- function_prediction: What biological function this protein likely performs based on fold, residues, and known motifs (2-4 sentences).
- binding_site_insights: Identify potential binding pockets, catalytic residues, or ligand-binding regions (2-4 sentences).
- stability_analysis: Assess structural stability from B-factors, chain count, secondary structure composition (2-4 sentences).
- drug_likeness_hints: Whether this structure has druggable pockets, known drug targets in similar folds, or therapeutic relevance (2-4 sentences).
Keep language accessible but scientifically accurate. Respond ONLY with the JSON object.`,
          },
          {
            role: "user",
            content: structureSummary,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_analysis",
              description: "Return structured analysis of a protein structure",
              parameters: {
                type: "object",
                properties: {
                  function_prediction: { type: "string" },
                  binding_site_insights: { type: "string" },
                  stability_analysis: { type: "string" },
                  drug_likeness_hints: { type: "string" },
                },
                required: ["function_prediction", "binding_site_insights", "stability_analysis", "drug_likeness_hints"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structure_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content directly
    const content = result.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({
          function_prediction: content,
          binding_site_insights: "See above.",
          stability_analysis: "See above.",
          drug_likeness_hints: "See above.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("Unexpected AI response format");
  } catch (e) {
    console.error("structure-explain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
