import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CREDIT_COST = 3;
const CHAT_CREDIT_COST = 2;

const TOOLS_BY_TYPE: Record<string, { name: string; description: string; parameters: Record<string, unknown> }> = {
  growth_prediction: {
    name: "growth_prediction",
    description: "Predict cell culture growth trajectory over next 72 hours",
    parameters: {
      type: "object",
      properties: {
        projected_confluence: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hours: { type: "number" },
              confluence_percent: { type: "number" },
              viability_percent: { type: "number" },
            },
            required: ["hours", "confluence_percent", "viability_percent"],
          },
        },
        recommended_passage_time_hours: { type: "number" },
        growth_phase: { type: "string", enum: ["lag", "exponential", "stationary", "decline"] },
        doubling_time_hours: { type: "number" },
        confidence: { type: "number" },
        summary: { type: "string" },
      },
      required: ["projected_confluence", "recommended_passage_time_hours", "growth_phase", "doubling_time_hours", "confidence", "summary"],
    },
  },
  contamination_risk: {
    name: "contamination_risk",
    description: "Assess contamination risk based on culture observations",
    parameters: {
      type: "object",
      properties: {
        risk_score: { type: "number", description: "0-100 risk score" },
        risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
        flagged_indicators: {
          type: "array",
          items: {
            type: "object",
            properties: {
              indicator: { type: "string" },
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              detail: { type: "string" },
            },
            required: ["indicator", "severity", "detail"],
          },
        },
        preventive_actions: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
      },
      required: ["risk_score", "risk_level", "flagged_indicators", "preventive_actions", "summary"],
    },
  },
  condition_optimization: {
    name: "condition_optimization",
    description: "Recommend optimal culture conditions",
    parameters: {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              parameter: { type: "string" },
              current_value: { type: "string" },
              recommended_value: { type: "string" },
              rationale: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["parameter", "current_value", "recommended_value", "rationale", "priority"],
          },
        },
        feeding_schedule: { type: "string" },
        passage_recommendation: { type: "string" },
        summary: { type: "string" },
      },
      required: ["recommendations", "feeding_schedule", "passage_recommendation", "summary"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const admin = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { cultureId, analysisType, chatMessages } = body;

    if (!cultureId) return json({ error: "cultureId is required" }, 400);

    // ─── Chat mode ───
    if (analysisType === "chat") {
      if (!chatMessages?.length) return json({ error: "chatMessages required for chat mode" }, 400);

      // Fetch culture & logs
      const { data: culture } = await admin.from("cell_cultures").select("*").eq("id", cultureId).eq("user_id", user.id).single();
      if (!culture) return json({ error: "Culture not found" }, 404);

      const { data: logs } = await admin.from("culture_logs").select("*").eq("culture_id", cultureId).order("logged_at", { ascending: true }).limit(50);

      // Check credits
      const { data: orgId } = await admin.rpc("user_org_id", { _user_id: user.id });
      if (!orgId) return json({ error: "No organization found" }, 403);
      const { data: creditRow } = await admin.from("org_credits").select("balance").eq("org_id", orgId).single();
      if (!creditRow || creditRow.balance < CHAT_CREDIT_COST) {
        return json({ error: "Insufficient credits", required: CHAT_CREDIT_COST, available: creditRow?.balance ?? 0 }, 402);
      }
      await admin.rpc("deduct_credits_for_job", { _org_id: orgId, _cost: CHAT_CREDIT_COST });

      const cultureInfo = `Cell Line: ${culture.cell_line}, Passage: ${culture.passage_number}, Medium: ${culture.medium}, Temp: ${culture.temperature}°C, CO2: ${culture.co2_percent}%, Status: ${culture.status}`;
      const logSummary = (logs || []).slice(-20).map((l: any) =>
        `[${l.logged_at}] Confluence: ${l.confluence_percent ?? "N/A"}%, Viability: ${l.viability_percent ?? "N/A"}%, pH: ${l.ph ?? "N/A"}`
      ).join("\n");

      const systemPrompt = `You are an expert cell biology AI assistant for the culture "${culture.name}".
Culture details: ${cultureInfo}
Recent observations:\n${logSummary || "No observations yet."}

Provide concise, actionable advice. Use markdown formatting. Be specific about this culture's conditions.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              ...chatMessages.map((m: any) => ({ role: m.role, content: m.content })),
            ],
          }),
        });

        if (!aiResponse.ok) {
          await admin.rpc("adjust_credits", { _org_id: orgId, _amount: CHAT_CREDIT_COST });
          if (aiResponse.status === 429) return json({ error: "AI rate limit exceeded" }, 429);
          return json({ error: "AI chat failed" }, 500);
        }

        const aiData = await aiResponse.json();
        const reply = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

        await admin.from("usage_logs").insert({
          org_id: orgId, user_id: user.id, credits_used: CHAT_CREDIT_COST,
          description: "CellCulture AI: chat",
        });

        return json({ reply, creditsCost: CHAT_CREDIT_COST });
      } catch (e) {
        await admin.rpc("adjust_credits", { _org_id: orgId, _amount: CHAT_CREDIT_COST });
        throw e;
      }
    }

    // ─── Analysis mode (existing) ───
    if (!["growth_prediction", "contamination_risk", "condition_optimization"].includes(analysisType)) {
      return json({ error: "Invalid analysisType" }, 400);
    }

    const { data: culture, error: cErr } = await admin.from("cell_cultures").select("*").eq("id", cultureId).eq("user_id", user.id).single();
    if (cErr || !culture) return json({ error: "Culture not found" }, 404);

    const { data: logs } = await admin.from("culture_logs").select("*").eq("culture_id", cultureId).order("logged_at", { ascending: true }).limit(100);

    const { data: orgId } = await admin.rpc("user_org_id", { _user_id: user.id });
    if (!orgId) return json({ error: "No organization found" }, 403);

    const { data: creditRow } = await admin.from("org_credits").select("balance").eq("org_id", orgId).single();
    if (!creditRow || creditRow.balance < CREDIT_COST) {
      return json({ error: "Insufficient credits", required: CREDIT_COST, available: creditRow?.balance ?? 0 }, 402);
    }

    const { error: deductErr } = await admin.rpc("deduct_credits_for_job", { _org_id: orgId, _cost: CREDIT_COST });
    if (deductErr) return json({ error: "Failed to deduct credits" }, 500);

    try {
      const cultureInfo = `Cell Line: ${culture.cell_line}, Passage: ${culture.passage_number}, Medium: ${culture.medium}, Temp: ${culture.temperature}°C, CO2: ${culture.co2_percent}%, Humidity: ${culture.humidity}%, Status: ${culture.status}, Seeding Density: ${culture.seeding_density}`;
      const logSummary = (logs || []).map((l: any) =>
        `[${l.logged_at}] Confluence: ${l.confluence_percent ?? "N/A"}%, Viability: ${l.viability_percent ?? "N/A"}%, Count: ${l.cell_count ?? "N/A"}, pH: ${l.ph ?? "N/A"}, Glucose: ${l.glucose_level ?? "N/A"}, Lactate: ${l.lactate_level ?? "N/A"}, Morphology: ${l.morphology_notes ?? "N/A"}`
      ).join("\n");

      const systemPrompt = `You are an expert cell biology AI assistant. Analyze cell culture data and provide scientifically accurate assessments. Use realistic values based on standard cell biology knowledge for the given cell line. If data is limited, make reasonable inferences based on the cell line characteristics and culture conditions.`;
      const userPrompt = `Culture: ${culture.name}\n${cultureInfo}\n\nObservation logs (${(logs || []).length} entries):\n${logSummary || "No observations logged yet."}\n\nPerform a ${analysisType.replace(/_/g, " ")} analysis.`;

      const tool = TOOLS_BY_TYPE[analysisType];
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.parameters } }],
          tool_choice: { type: "function", function: { name: tool.name } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        await admin.rpc("adjust_credits", { _org_id: orgId, _amount: CREDIT_COST });
        if (aiResponse.status === 429) return json({ error: "AI rate limit exceeded, please try again later" }, 429);
        if (aiResponse.status === 402) return json({ error: "AI credits exhausted" }, 402);
        return json({ error: "AI analysis failed" }, 500);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        await admin.rpc("adjust_credits", { _org_id: orgId, _amount: CREDIT_COST });
        return json({ error: "AI returned no structured result" }, 500);
      }

      const result = JSON.parse(toolCall.function.arguments);

      const { data: analysis, error: insertErr } = await admin.from("culture_ai_analyses").insert({
        culture_id: cultureId, user_id: user.id, analysis_type: analysisType,
        result, model_used: "google/gemini-3-flash-preview", credits_cost: CREDIT_COST,
      }).select().single();
      if (insertErr) console.error("Failed to store analysis:", insertErr);

      await admin.from("usage_logs").insert({
        org_id: orgId, user_id: user.id, credits_used: CREDIT_COST,
        description: `CellCulture AI: ${analysisType.replace(/_/g, " ")}`,
      });

      return json({
        success: true, analysisId: analysis?.id, analysisType, result,
        creditsCost: CREDIT_COST, remainingCredits: (creditRow.balance - CREDIT_COST),
      });
    } catch (processingError) {
      await admin.rpc("adjust_credits", { _org_id: orgId, _amount: CREDIT_COST });
      return json({ error: `Analysis failed: ${(processingError as Error).message}` }, 500);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
