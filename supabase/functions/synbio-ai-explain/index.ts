import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, sequence, assemblyType, hostOrganism, gcContent, cai, constructScore, seqLength } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompts: Record<string, string> = {
      explain: `You are a synthetic biology expert. Analyze this DNA construct and explain it in clear scientific language.

Construct details:
- Length: ${seqLength} bp
- Assembly method: ${assemblyType}
- Host organism: ${hostOrganism}
- GC content: ${gcContent?.toFixed(1)}%
- CAI score: ${cai?.toFixed(3)}
- Design score: ${constructScore}/100
- First 200bp: ${sequence?.substring(0, 200)}

Provide:
1. What this construct likely encodes
2. Suitability for the chosen host organism
3. Assembly method compatibility assessment
4. Key observations about sequence quality
5. Recommended improvements

Be concise but scientifically rigorous.`,

      risks: `You are a synthetic biology expert. Identify cloning and assembly risks for this construct.

Details:
- Assembly: ${assemblyType}
- Host: ${hostOrganism}
- GC: ${gcContent?.toFixed(1)}%, CAI: ${cai?.toFixed(3)}
- Length: ${seqLength} bp
- Sequence (first 200bp): ${sequence?.substring(0, 200)}

Analyze risks:
1. Assembly failure points for ${assemblyType}
2. Expression issues in ${hostOrganism}
3. Sequence-level problems (repeats, secondary structures, rare codons)
4. Toxicity or metabolic burden concerns
5. Mitigation strategies for each risk

Rate overall cloning success likelihood (Low/Medium/High).`,

      expression: `You are a protein expression expert. Predict expression outcomes for this construct.

Details:
- Host: ${hostOrganism}
- CAI: ${cai?.toFixed(3)}, GC: ${gcContent?.toFixed(1)}%
- Length: ${seqLength} bp
- Score: ${constructScore}/100
- Sequence (first 200bp): ${sequence?.substring(0, 200)}

Predict:
1. Expected expression level (Low/Medium/High) with reasoning
2. Solubility prediction
3. Potential folding issues
4. Recommended expression conditions (temperature, inducer, media)
5. Purification strategy suggestions`,

      optimize: `You are a codon optimization expert. Provide optimization recommendations.

Details:
- Current CAI: ${cai?.toFixed(3)} for ${hostOrganism}
- GC content: ${gcContent?.toFixed(1)}%
- Assembly method: ${assemblyType}
- Length: ${seqLength} bp
- Sequence (first 200bp): ${sequence?.substring(0, 200)}

Recommend:
1. Codon optimization strategy for ${hostOrganism}
2. GC content adjustment suggestions
3. mRNA stability improvements
4. Translation initiation optimization
5. Specific codons to change and why
6. Expected improvement in expression level`,
    };

    const systemPrompt = prompts[mode] || prompts.explain;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this ${assemblyType} construct for ${hostOrganism}. Sequence length: ${seqLength}bp, GC: ${gcContent?.toFixed(1)}%, CAI: ${cai?.toFixed(3)}.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "No analysis generated.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("synbio-ai-explain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
