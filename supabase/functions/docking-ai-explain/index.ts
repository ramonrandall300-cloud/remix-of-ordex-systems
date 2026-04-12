const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { receptor, ligand, engine, bestScore, poses } = body;

    if (!receptor || !ligand) {
      return new Response(JSON.stringify({ error: "Receptor and ligand are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a senior computational chemist and drug discovery expert. Analyze this molecular docking result and provide:

1. **Binding Strength Interpretation** — Is this a strong, moderate, or weak binder? Compare to known drug-target affinities.
2. **Drug-Likeness Commentary** — Based on the ligand and binding profile, assess drug-like properties (Lipinski-like reasoning).
3. **Interaction Summary** — Summarize key protein-ligand interactions (H-bonds, hydrophobic contacts, π-stacking, salt bridges).
4. **Binding Pose Quality** — Assess the quality of binding poses (RMSD spread, score consistency).
5. **Confidence Estimate** — Rate your confidence in these results (high/medium/low) and explain why.
6. **Next Steps** — Suggest follow-up experiments or computational studies.

Be concise but thorough. Use scientific language appropriate for a medicinal chemist or structural biologist.`;

    let userMessage = `Docking Results:\n`;
    userMessage += `- Receptor: ${receptor}\n`;
    userMessage += `- Ligand: ${ligand}\n`;
    userMessage += `- Engine: ${engine || "Unknown"}\n`;
    if (bestScore != null) userMessage += `- Best binding score: ${bestScore} kcal/mol\n`;

    if (Array.isArray(poses) && poses.length > 0) {
      userMessage += `\nTop poses (${Math.min(poses.length, 10)} of ${poses.length}):\n`;
      poses.slice(0, 10).forEach((p: any, i: number) => {
        userMessage += `  Pose ${i + 1}: score=${p.score} kcal/mol, RMSD=${p.rmsd} Å`;
        if (p.interactions?.length) {
          userMessage += `, interactions: ${p.interactions.map((int: any) => `${int.type}(${int.residue}, ${int.distance_angstrom}Å)`).join(", ")}`;
        }
        userMessage += "\n";
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
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
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content || "No analysis generated";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("docking-ai-explain error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
