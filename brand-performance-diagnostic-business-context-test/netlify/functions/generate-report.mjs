function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}


function normaliseDomain(rawUrl) {
  const u = new URL(rawUrl);

  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("Website must use http or https.");
  }

  return u.hostname.replace(/^www\./i, "");
}


/*
  Final client-facing safeguard.

  The AI is allowed to use the client's website internally for research,
  but no citations, source links, URLs or reference markers should ever
  appear in the report seen by the client.
*/
function cleanClientFacingText(value) {
  if (typeof value !== "string") {
    return value;
  }

  let text = value;

  /*
    Markdown links:
    [Nuchido](https://nuchido.com/...)
    becomes:
    Nuchido
  */
  text = text.replace(
    /\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi,
    "$1"
  );

  /*
    OpenAI / citation-style markers.
  */
  text = text.replace(
    /cite[^]+/g,
    ""
  );

  /*
    Other bracketed citation markers occasionally produced
    by research tools.
  */
  text = text.replace(
    /【[^】]+】/g,
    ""
  );

  /*
    Bare URLs.
  */
  text = text.replace(
    /(?:https?:\/\/|www\.)[^\s)\]}]+/gi,
    ""
  );

  /*
    Explicit source or citation notes.
  */
  text = text.replace(
    /\((?:source|sources|citation|citations)\s*:[^)]+\)/gi,
    ""
  );

  text = text.replace(
    /(?:source|sources|citation|citations)\s*:\s*[^\n]+/gi,
    ""
  );

  /*
    Clean up spacing left behind after removals.
  */
  text = text
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}


function cleanReport(report) {
  const cleaned = {};

  for (const [key, value] of Object.entries(report || {})) {
    cleaned[key] = cleanClientFacingText(value);
  }

  return cleaned;
}


export default async (req) => {

  if (req.method !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed."
    });
  }


  const apiKey = Netlify.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return jsonResponse(500, {
      error: "OPENAI_API_KEY has not been added to the Netlify site yet."
    });
  }


  try {

    const body = await req.json();

    const {
      client,
      diagnostic
    } = body || {};


    if (
      !client?.company ||
      !client?.website ||
      !diagnostic?.answers
    ) {
      return jsonResponse(400, {
        error: "Missing client or diagnostic data."
      });
    }


    const domain =
      normaliseDomain(client.website);


    const prompt = `
You are producing a concise, client-facing Brand Performance Diagnostic for The Creative Lab.


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

${Object.entries(diagnostic.dimensions || {})
  .map(([k, v]) => `- ${k}: ${v}/100`)
  .join("\n")}


Individual answers:

${diagnostic.answers
  .map(
    a =>
      `- ${a.dimension} | ${a.question} | ${a.score}/9`
  )
  .join("\n")}



TASK

Use web search to review the company's own website and establish only the public business context that is clearly supported there.

This may include:

- what the company offers
- its stated audience
- its positioning
- its offer structure
- its business model where evident
- relevant proof points or claims

Then interpret the diagnostic specifically for this company.

The score engine has already calculated the scores and overall diagnosis.

Do not recalculate, override or challenge them.



IMPORTANT — WEBSITE RESEARCH IS INTERNAL ONLY

Use the company's website to improve your understanding of the business, but do not expose the research process in the report.

The client-facing report must NEVER contain:

- URLs
- links
- hyperlinks
- citations
- citation markers
- footnotes
- source names
- source references
- markdown links
- page titles
- domain names
- phrases such as "according to the website"
- phrases such as "the website states"
- phrases such as "the site says"
- phrases such as "our research found"
- phrases such as "verified on your website"

Do not cite or attribute website evidence.

Instead, absorb verified business context into the interpretation naturally.

The report should sound as though an experienced strategist has reviewed the business and the diagnostic together, not as though a researcher is documenting sources.



WRITING STYLE

Write naturally, clearly and commercially.

The tone should feel like an experienced brand strategist speaking directly to a client.

Do not sound like:

- a research report
- an automated scoring tool
- an AI analysis
- consultancy boilerplate
- a summary of evidence

Avoid repeatedly using phrases such as:

- "your responses indicate"
- "your responses suggest"
- "the diagnostic suggests"
- "this implies"
- "this indicates"
- "against this backdrop"
- "based on the evidence"
- "commercially grounded"
- "the data suggests"
- "you appear to"

Use these constructions only where genuinely necessary.

Prefer direct observations such as:

"You have good clarity around..."
"The weaker area is..."
"There is a clear gap between..."
"Your positioning is..."
"The opportunity is to..."
"The tension is between..."

Do not force a website fact into every sentence.

Website context should sharpen the diagnosis, not make the writing heavier.

If the diagnostic answers already provide enough evidence for a useful observation, write the observation simply.

Avoid long sentences that attempt to combine:

website fact + diagnostic answer + implication + recommendation

into one sentence.

Keep sentences clean and readable.



CORE INTERPRETATION RULE

Do not write generic commentary based only on a dimension score.

For each of the five areas, consider:

- all four individual responses in that area
- the strongest response in that area
- the weakest response in that area
- any tension or contradiction between the responses
- relevant verified website context
- the likely implication of that pattern, only where directly supported by the diagnostic or verified website evidence

Every area commentary must contain at least one observation that could only have come from this client's individual responses or verified business context.

Two clients with the same area score should be capable of receiving materially different commentary.

Prefer describing the tension revealed by the responses over naming or labelling the pattern.

Do not invent diagnostic labels such as:

- "brand-light"
- "performance-led"
- "strategy-light"
- or similar shorthand labels unless those exact terms are explicitly evidenced.



CONTENT REQUIREMENTS


score_meaning:

Maximum 70 words.

Interpret the overall score and broad performance picture.

Do not simply translate the number into a generic label.

Do not invent a narrative beyond the evidence.

Keep this section clear and human.

It should explain the overall picture without sounding like a scoring algorithm.



stands_out:

Maximum 55 words.

Identify the single most important pattern across the five areas.

Prioritise a genuine imbalance, contradiction or constraint over generic strengths and weaknesses.

Do not list several observations.

Choose the one that matters most.



strategic_commentary:

Maximum 45 words.

Interpret Strategic Fitness using the four individual answers and relevant verified website context.

Write naturally.

Do not narrate how you reached the observation.



consumer_commentary:

Maximum 45 words.

Interpret Consumer Intelligence using the four individual answers and relevant verified website context.

Write naturally.

Do not narrate how you reached the observation.



market_commentary:

Maximum 45 words.

Interpret Market Influence using the four individual answers and relevant verified website context.

Write naturally.

Do not narrate how you reached the observation.



growth_commentary:

Maximum 45 words.

Interpret Growth Engine using the four individual answers and relevant verified website context.

Write naturally.

Do not narrate how you reached the observation.



commercial_commentary:

Maximum 45 words.

Interpret Commercial Endurance using the four individual answers and relevant verified website context.

Write naturally.

Do not narrate how you reached the observation.



focus_next:

Maximum 70 words.

Write this as one short, coherent paragraph.

Do NOT use:

- numbered lists
- bullet points
- "1."
- "2."
- "3."
- labels such as "Priority 1"
- mini consultancy plans

Identify the most useful high-level direction for the business.

Where more than one issue matters, connect them naturally in prose.

Keep enough back for a follow-up conversation.



DIAGNOSTIC PRECEDENCE

When interpreting the overall pattern, use this order:

1. Major imbalance between areas.
2. Systemic weakness if four or five dimensions are below 50.
3. Strong foundations but weak conversion or Growth Engine.
4. Strong commercial engine but weak strategic or brand foundations.
5. Relatively flat profile — describe the overall level rather than inventing a dramatic weakness.



EVIDENCE DISCIPLINE

Do not extend a diagnostic observation into a commercial consequence unless that consequence is directly supported by the answers or verified website evidence.

Avoid speculative claims such as:

- "this will..."
- "this means..."
- "this puts X at risk..."
- "this makes it harder to..."
- "this will cap growth..."
- "this will weaken pricing power..."
- "this creates reliance on direct selling..."
- or similar causal claims unless directly evidenced.

Do not make unsupported assumptions about:

- sales behaviour
- pricing
- retention
- acquisition
- pipeline
- customer loyalty
- commercial model
- internal capability
- market position
- competitor behaviour

If the evidence only supports a tension or gap, describe the tension or gap and stop there.



RULES

- Make the interpretation specific to this business, not generic.
- Use the relationship between the 20 answers, the five scores and verified website context.
- Distinguish evidence from inference internally, but do not narrate that distinction to the client.
- Do not invent facts, market conditions, competitors, customer behaviour, subscription economics, acquisition costs, retention performance, internal capability or business-model details that are not supported by the website or diagnostic.
- If something is plausible but not evidenced, do not state it as fact.
- Do not simply repeat scores in prose.
- Do not exaggerate weaknesses.
- Do not manufacture a problem where the scores do not support one.
- Do not explain the same point twice.
- Once the insight has landed, stop.
- Be commercially intelligent, direct and constructive.
- Keep the report useful but deliberately high level.
- Avoid consultancy jargon.
- Avoid generic encouragement.
- Avoid inflated language.
- Avoid obvious AI phrasing.
- Avoid neat rhetorical formulas and unnecessary three-part constructions.
- Avoid excessive use of colons and semicolons.
- Prefer plain English.
- Do not include any citations, links, source references or URLs anywhere in the JSON values.

Return ONLY valid JSON matching the requested schema.
`.trim();



    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            model:
              Netlify.env.get("OPENAI_MODEL") ||
              "gpt-5.1",

            tools: [
              {
                type: "web_search",

                filters: {
                  allowed_domains: [
                    domain
                  ]
                },

                search_context_size:
                  "medium"
              }
            ],

            text: {
              format: {
                type: "json_schema",
                name:
                  "brand_performance_report",
                strict: true,

                schema: {
                  type: "object",

                  additionalProperties:
                    false,

                  properties: {

                    score_meaning: {
                      type: "string"
                    },

                    stands_out: {
                      type: "string"
                    },

                    strategic_commentary: {
                      type: "string"
                    },

                    consumer_commentary: {
                      type: "string"
                    },

                    market_commentary: {
                      type: "string"
                    },

                    growth_commentary: {
                      type: "string"
                    },

                    commercial_commentary: {
                      type: "string"
                    },

                    focus_next: {
                      type: "string"
                    }

                  },

                  required: [
                    "score_meaning",
                    "stands_out",
                    "strategic_commentary",
                    "consumer_commentary",
                    "market_commentary",
                    "growth_commentary",
                    "commercial_commentary",
                    "focus_next"
                  ]
                }
              }
            },

            input: prompt
          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      const msg =
        data?.error?.message ||
        "OpenAI request failed.";

      return jsonResponse(
        response.status,
        {
          error: msg
        }
      );
    }


    const outputText =
      data.output_text ||
      (data.output || [])
        .flatMap(
          item =>
            item.content || []
        )
        .filter(
          c =>
            c.type === "output_text"
        )
        .map(
          c =>
            c.text || ""
        )
        .join("\n")
        .trim();


    if (!outputText) {
      return jsonResponse(502, {
        error:
          "No report data was returned."
      });
    }


    let report;

    try {

      report =
        JSON.parse(outputText);

    } catch {

      return jsonResponse(502, {
        error:
          "The report data could not be parsed."
      });
    }


    /*
      Belt-and-braces safeguard:
      even if the model ignores the prompt and inserts a citation
      or URL, remove it before the report reaches index.html.
    */
    report =
      cleanReport(report);


    return jsonResponse(200, {
      report
    });


  } catch (err) {

    return jsonResponse(500, {
      error:
        err?.message ||
        "Unexpected error."
    });

  }
};
