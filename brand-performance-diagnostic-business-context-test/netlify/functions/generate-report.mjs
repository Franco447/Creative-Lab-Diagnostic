function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normaliseDomain(rawUrl) {
  const u = new URL(rawUrl);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Website must use http or https.");
  return u.hostname.replace(/^www\./i, "");
}

export default async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed." });

  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse(500, {
      error: "OPENAI_API_KEY has not been added to the Netlify site yet."
    });
  }

  try {
    const body = await req.json();
    const { client, diagnostic } = body || {};
    if (!client?.company || !client?.website || !diagnostic?.answers) {
      return jsonResponse(400, { error: "Missing client or diagnostic data." });
    }

    const domain = normaliseDomain(client.website);

    const prompt = `
You are producing a client-facing Brand Performance Diagnostic for The Creative Lab.

CLIENT
Company: ${client.company}
Website: ${client.website}
Contact: ${client.contact_name || ""}
Role: ${client.position || ""}

DIAGNOSTIC
Overall score: ${diagnostic.overall_score}/100
Strongest dimension: ${diagnostic.strongest_dimension}
Weakest dimension: ${diagnostic.weakest_dimension}
Largest gap: ${diagnostic.largest_gap} points
Pattern: ${diagnostic.pattern}

Dimension scores:
${Object.entries(diagnostic.dimensions || {}).map(([k,v]) => `- ${k}: ${v}/100`).join("\n")}

Individual answers:
${diagnostic.answers.map(a => `- ${a.dimension} | ${a.question} | ${a.score}/9 | weighting ${a.weighting}`).join("\n")}

TASK
Use web search to review the company's own website and understand only the public business context that can be supported by that website: what it offers, category, audience, positioning, commercial model where evident, and relevant proof points or claims.

Then interpret the diagnostic specifically for this company.

The score engine has already calculated the diagnosis using weighted question scoring. Do not recalculate scores. Use the weightings only as context for how much emphasis each question carries.

WRITE A CONCISE CLIENT EMAIL REPORT.

Target length: 320–420 words total.

Use exactly these headings:
WHAT YOUR SCORE MEANS
WHAT STANDS OUT
THE FIVE AREAS
WHERE TO FOCUS NEXT

Under THE FIVE AREAS, include each of these five subheadings exactly once:
Strategic Fitness
Consumer Intelligence
Market Influence
Growth Engine
Commercial Endurance

For each area, write only 1–2 concise sentences. The purpose is to give useful high-level interpretation, not the full consultancy answer.

Rules:
- Reference the overall score naturally.
- Make the interpretation specific to this business, not generic.
- Use the relationship between the 20 answers, five scores and verified website context.
- Explain meaningful tensions between answers where they help the client understand the result.
- The five-area breakdown should interpret, not simply restate scores.
- Keep enough depth back for a follow-up meeting.
- Distinguish evidence from inference.
- Do not invent facts, market conditions, competitors, customer behaviour, subscription economics or business-model details that are not supported by the website or diagnostic.
- Do not simply repeat all scores in prose.
- Be commercially intelligent, direct and constructive.
- Avoid consultancy jargon, generic encouragement, inflated language and obvious AI phrasing.
- No markdown tables.
- Do not include a greeting, sign-off or subject line.
`.trim();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: Netlify.env.get("OPENAI_MODEL") || "gpt-5.1",
        tools: [{
          type: "web_search",
          filters: { allowed_domains: [domain] },
          search_context_size: "medium"
        }],
        input: prompt,
        max_output_tokens: 850
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || "OpenAI request failed.";
      return jsonResponse(response.status, { error: msg });
    }

    const report =
      data.output_text ||
      (data.output || [])
        .flatMap(item => item.content || [])
        .filter(c => c.type === "output_text")
        .map(c => c.text || "")
        .join("\n")
        .trim();

    if (!report) return jsonResponse(502, { error: "No report text was returned." });

    return jsonResponse(200, { report });
  } catch (err) {
    return jsonResponse(500, { error: err?.message || "Unexpected error." });
  }
};