const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  full: `You are a senior structural biologist. Analyze this protein sequence and provide:
1. **Predicted Function** — what this protein likely does
2. **Structural Features** — domains, motifs, secondary structure predictions
3. **Known Pathways** — biological pathways it may participate in
4. **Disease Associations** — known disease links
5. **Key Residues** — important functional residues or active sites
Be concise but thorough. Use scientific language appropriate for a researcher.`,

  function: `You are a protein function expert. Based on this sequence, predict:
1. **Primary Function** — molecular function and biological process
2. **Protein Family** — classify into known protein families
3. **Subcellular Localization** — where it likely resides
4. **Post-translational Modifications** — likely PTMs
Keep it brief and actionable.`,

  mutations: `You are a protein engineering expert. Based on this sequence:
1. **Stability Mutations** — suggest 3-5 mutations that could increase thermostability
2. **Activity Enhancement** — suggest mutations that might improve catalytic activity
3. **Solubility** — suggest mutations to improve expression/solubility
4. **Rationale** — explain the biophysical reasoning for each suggestion
Format as a table where possible.`,

  disease: `You are a medical geneticist. Based on this protein sequence:
1. **Known Disease Variants** — list known pathogenic mutations
2. **Cancer Relevance** — any oncogenic or tumor suppressor role
3. **Drug Targets** — is this a known or potential drug target?
4. **Clinical Significance** — relevant clinical associations
Be specific and cite known associations where possible.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { sequence, analysisType, jobName, plddtScore, plddtBindingDomain, resultMetrics } = body;

    if (!sequence || typeof sequence !== "string" || sequence.length < 10) {
      return new Response(JSON.stringify({ error: "Valid protein sequence required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const type = (analysisType as string) in PROMPTS ? (analysisType as string) : "full";
    const systemPrompt = PROMPTS[type];

    let userMessage = `Protein sequence (first 2000 residues):\n${sequence.slice(0, 2000)}`;
    if (jobName) userMessage += `\nProtein name/header: ${jobName}`;
    if (plddtScore != null) userMessage += `\npLDDT score: ${plddtScore}`;
    if (plddtBindingDomain != null) userMessage += `\npLDDT binding domain: ${plddtBindingDomain}`;
    if (resultMetrics) userMessage += `\nAdditional metrics: ${JSON.stringify(resultMetrics)}`;

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
    console.error("protein-ai-explain error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
