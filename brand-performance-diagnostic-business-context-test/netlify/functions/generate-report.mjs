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


function cleanClientFacingText(value) {
  if (typeof value !== "string") {
    return value;
  }

  let text = value;

  text = text.replace(
    /\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi,
    "$1"
  );

  text = text.replace(
    /cite[^]+/g,
    ""
  );

  text = text.replace(
    /【[^】]+】/g,
    ""
  );

  text = text.replace(
    /(?:https?:\/\/|www\.)[^\s)\]}]+/gi,
    ""
  );

  text = text.replace(
    /\((?:source|sources|citation|citations)\s*:[^)]+\)/gi,
    ""
  );

  text = text.replace(
    /(?:source|sources|citation|citations)\s*:\s*[^\n]+/gi,
    ""
  );

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


function threeHoursFromNow() {
  return new Date(
    Date.now() + (3 * 60 * 60 * 1000)
  ).toISOString();
}


async function saveDraftToSupabase({
  client,
  diagnostic,
  report
}) {

  const supabaseUrl =
    Netlify.env.get("SUPABASE_URL");

  const supabaseSecret =
    Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");


  if (!supabaseUrl || !supabaseSecret) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }


  const scheduledSendAt =
    threeHoursFromNow();


  const dimensions =
    diagnostic.dimensions || {};


  const draft = {

    client_name:
      client.contact_name || null,

    client_position:
      client.position || null,

    client_email:
      client.email || null,

    client_mobile:
      client.mobile || null,

    company_name:
      client.company,

    website:
      client.website,

    overall_score:
      diagnostic.overall_score,

    strategic_score:
      dimensions["Strategic Fitness"] ?? 0,

    consumer_score:
      dimensions["Consumer Intelligence"] ?? 0,

    market_score:
      dimensions["Market Influence"] ?? 0,

    growth_score:
      dimensions["Growth Engine"] ?? 0,

    commercial_score:
      dimensions["Commercial Endurance"] ?? 0,

    answers:
      diagnostic.answers,

    report_json:
      report,

    status:
      "draft",

    scheduled_send_at:
      scheduledSendAt
  };


  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/diagnostic_reports`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "apikey":
            supabaseSecret,

          "Prefer":
            "return=representation"
        },

        body:
          JSON.stringify(draft)
      }
    );


  const data =
    await response.json()
      .catch(() => null);


  if (!response.ok) {

    const message =
      data?.message ||
      data?.error ||
      `Supabase save failed with status ${response.status}.`;

    throw new Error(message);
  }


  const saved =
    Array.isArray(data)
      ? data[0]
      : data;


  if (!saved?.id) {
    throw new Error(
      "Supabase did not return a report ID."
    );
  }


  return {
    id: saved.id,
    scheduled_send_at:
      saved.scheduled_send_at ||
      scheduledSendAt
  };
}




// Process a finished background response using the existing report parsing and draft save.
async function finishReport(data, client, diagnostic) {
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


    report =
      cleanReport(report);


    /*
      Save the completed AI report as a draft
      for internal review before client delivery.
    */
    const savedDraft =
      await saveDraftToSupabase({
        client,
        diagnostic,
        report
      });


    return jsonResponse(200, {

      report,

      report_id:
        savedDraft.id,

      scheduled_send_at:
        savedDraft.scheduled_send_at
    });
}

export default async (req) => {

  if (req.method !== "POST") {

    return jsonResponse(405, {
      error: "Method not allowed."
    });
  }


  const apiKey =
    Netlify.env.get("OPENAI_API_KEY");


  if (!apiKey) {

    return jsonResponse(500, {
      error:
        "OPENAI_API_KEY has not been added to the Netlify site yet."
    });
  }


  try {

    const body =
      await req.json();


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
        error:
          "Missing client or diagnostic data."
      });
    }


    if (body?.action === "poll") {
      const id = String(body.response_id || "");
      if (!/^resp_[a-zA-Z0-9_-]{6,150}$/.test(id)) {
        return jsonResponse(400, {error: "Invalid report job ID."});
      }

      const result = await fetch(
        `https://api.openai.com/v1/responses/${encodeURIComponent(id)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const data = await result.json().catch(() => null);
      if (!result.ok) {
        return jsonResponse(result.status, {
          error: data?.error?.message || "Unable to check report progress."
        });
      }
      if (data.status === "failed" || data.status === "cancelled" || data.status === "incomplete") {
        return jsonResponse(502, {
          error: data?.error?.message || "Report generation did not finish. Please try again."
        });
      }
      if (data.status !== "completed") {
        return jsonResponse(202, {status: "processing", response_id: id});
      }
      return await finishReport(data, client, diagnostic);
    }

    const domain =
      normaliseDomain(
        client.website
      );


    const prompt = `
You are a senior growth strategist at The Creative Lab, specialising in health, wellness, nutrition and longevity brands.

Your job is to turn diagnostic scores and responses into a personalised, commercially insightful report that helps a founder or marketing leader understand their business more clearly and see what deserves attention next.

Write like an experienced strategist having a thoughtful, direct conversation with a capable business leader.

Be commercially sharp, confident, curious and constructive.

Sound authoritative because the thinking is good, not because the language sounds corporate.


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

Use web search to review the company's own website and establish only the public business context clearly supported there.

This may include:

- what the company offers
- its stated audience
- its positioning
- its products or services
- its offer structure
- its business model where evident
- relevant proof points or claims

Then interpret the diagnostic specifically for this company.

The score engine has already calculated the scores and overall diagnosis.

Do not recalculate, override or challenge them.



WEBSITE RESEARCH IS INTERNAL ONLY

Use the company's website to understand the business, but never expose the research process in the client-facing report.

The report must NEVER contain:

- URLs
- hyperlinks
- citations
- citation markers
- footnotes
- source references
- domain names
- markdown links
- page titles
- phrases such as "according to your website"
- phrases such as "the website states"
- phrases such as "our research found"
- phrases such as "verified on your website"

Absorb verified business context naturally into the interpretation.



WRITING STYLE

Write as though you are talking to a smart, ambitious founder or marketing leader, not presenting to a board.

The tone should be:

- conversational, but not casual
- insightful, but not academic
- confident, but not arrogant
- positive where justified, but not relentlessly upbeat
- practical, but not simplistic
- commercially focused, without sounding like a management consultant

Use clear, natural conversational English.

Prefer short, direct sentences and familiar words.

Translate abstract marketing concepts into recognisable business situations.

Use specific examples relevant to the brand, its products, customers and business model where the evidence supports them.

Avoid jargon, buzzwords, generic consultancy language and unnecessarily complicated phrasing.

Do not use expressions such as:

- "insight-fed playbooks"
- "activate the growth ecosystem"
- "codify the brand narrative"
- "unlock synergies"
- "optimise the demand architecture"

Do not narrate the analytical process.

Avoid repetitive phrases such as:

- "your responses indicate"
- "your responses suggest"
- "the diagnostic suggests"
- "the data suggests"
- "this implies"
- "this indicates"
- "based on the evidence"
- "you appear to"

Prefer direct observations such as:

- "You have good clarity around..."
- "The weaker area is..."
- "There is a clear gap between..."
- "The opportunity is..."
- "The tension is between..."

Do not force website facts into every paragraph.

Use them only where they sharpen the insight.


THE CREATIVE LAB VOICE — MIKE'S FOUNDER-TO-FOUNDER TONE

This voice is a core part of the product, not a light garnish. Write like a smart, experienced Creative Lab strategist talking directly to a founder they like and respect over coffee. The conversation should feel warm, natural, commercially switched-on, slightly cheeky and occasionally playful. The client is in capable hands, but this is not a formal consultancy report wearing a conversational disguise.

Sound like a real person with experience and a point of view. Speak directly to "you". Use contractions, ordinary British English and a natural conversational rhythm. Mix crisp observations with slightly longer thoughts where that sounds human. The tone can have energy, warmth, a raised eyebrow or gentle irony; it must never feel flat, stiff, corporate or scripted.

The test: would a bright, commercially minded founder enjoy discussing this observation with us, even if it's a little uncomfortable? Would it make them think or see their business differently? If the prose merely sounds professional, it is not yet in the right voice.

CONVERSATION, PERSONALITY AND A SMILE IN THE MIND

Give the writing the confidence and character of someone who has seen this kind of challenge before. A natural, lightly mischievous aside, a revealing comparison, a gently awkward question or a wry observation can make the insight stick. These are legitimate tools of the voice, not things to suppress.

The humour should emerge from something true about THIS business. It may be playful or gently provocative, but it should never be a punchline bolted on to an otherwise ordinary paragraph. Be willing to nudge the reader: an occasional "Here's the slightly awkward question..." or "The temptation is to..." can work when the finding earns it. Don't use either as a fixed catchphrase.

Aim for several moments of personality across the whole report where the evidence and tone permit, rather than confining all the warmth to a single opening line. Not every paragraph needs a wink. Some reports, especially where performance is very weak, should be quieter and more sympathetic. The voice remains human even when the humour falls away.

Challenge constructively. Show the founder that we're on their side. An uncomfortable observation should feel like an intelligent conversation with someone who wants them to succeed, never a dressing-down. Keep the analysis commercially sharp; warmth must not dilute the point.

PLAIN SPEAKING — NO CONSULTANCY COSTUME

Use language people actually say aloud. Be specific. Choose a concrete point about the business over an abstract label. Don't show off with strategy terminology, and don't manufacture clever phrases to replace it.

Avoid expressions such as "codify", "growth thesis", "growth levers", "influence engine", "commercial design", "compounding model", "agentic consumer intel", "category asset", "fully weaponised", "the scalable edge", "offer ladder" and "systemise". Normal business words such as positioning, revenue, customers, profit and retention are fine when they clarify rather than obscure.

For example, "work out which enquiries turn into the right clients" is more natural than "optimise acquisition-channel attribution". These examples guide the register; do not recycle them as stock lines.

Don't rely on the same mechanical metaphor, joke structure or three-part rhetorical rhythm throughout. Avoid overworked agency phrases and generic compliments. Each report should feel freshly observed, not assembled from favourite one-liners.

THE BRIEF MUST FIT THE SPACE

Maintain the established report structure and all section word limits. The five area commentaries have a hard ceiling of 77 words each, not a target. Headlines stay within 14 words. Do not add extra sections, explanations or mini-consultancy plans to accommodate the personality. Let a well-chosen phrase do the work of a paragraph.

Keep the five commentaries similar in visual weight without padding. Avoid repeating the same theme in score meaning, what stands out, the five areas and the recommendations. Vary the function of each section: make a point, deepen it where useful, and move forward.

EVIDENCE IS THE FOUNDATION OF THE CHALLENGE

The diagnostic answers reveal the respondent's level of confidence, not independently proven commercial results. Low confidence in retention is not proof of churn. Low confidence in demand generation is not proof that enquiries depend on referrals. Do not invent facts about the client's pipeline, team, revenue, pricing, audience, marketing channels or customer behaviour.

Separate what the answers show from what might reasonably be investigated. Publicly stated company offers and positioning are context, not evidence that the company delivers them effectively. Where the finding is uncertain, write a pointed but fair question or a possible risk, not a confident declaration. Do not turn hedging into lifeless prose: be clear about what IS known.

TONE SHOULD FOLLOW THE SCORE

High scores: be genuinely appreciative of the success, then look for the next worthwhile question rather than inventing a defect.
Balanced scores: notice the trade-offs and ask the gently awkward question that helps the founder prioritise.
Low scores: be direct, respectful and constructive; the personality can live in a precise, humane observation without joking about weakness.

FINAL EDIT, SILENTLY

Read the finished report aloud in your head as if Michael were talking to a founder. Does it sound warm, slightly cheeky, occasionally playful, natural, sharp and worth listening to? Has the copy developed a recognisable personality throughout, rather than a stray clever line? Is every claim supported, each section concise, and the advice proportionate? Fix any flat, bureaucratic, over-clever, repetitive or unsupported line before returning the JSON.


COMMERCIAL IMPLICATIONS

Go beyond simply describing the scores.

Where the evidence supports it, explain why a finding matters commercially.

This may relate to:

- growth
- customer acquisition
- brand preference
- retention
- profitability
- scalability
- decision-making

However, never invent a commercial consequence.

If the evidence only reveals a gap or tension, describe that gap or tension and stop there.

Do not turn correlation into causation.



CORE INTERPRETATION RULE

Do not write generic commentary based only on a dimension score.

For each area consider:

- all four answers
- the strongest answer
- the weakest answer
- tensions or contradictions between them
- relevant verified business context
- the commercial implication where genuinely supported

Every area commentary must contain at least one observation that could only have come from this client's answers or business context.

Two businesses with the same score should be capable of receiving materially different commentary.



REPORT STRUCTURE


score_meaning

Maximum 90 words.

Interpret the overall score and broad performance picture.

Explain what the combination of strengths and weaknesses says about the business.

Do not simply translate the score into a generic label.


stands_out

Maximum 85 words.

Identify the most interesting or revealing pattern across the diagnostic.

Aim for the reaction:

"That's interesting. I hadn't quite looked at the business that way."

Do not repeat score_meaning.



THE FIVE AREAS

For each area return:

1. A short human headline.
2. One concise paragraph.

The headline should be memorable and revealing, not cute or advertising copy.

Keep the five commentaries broadly similar in visual weight and length. Up to 77 words each is a ceiling, not a target. Do not pad a shorter insight to match the others. Prefer one compact paragraph per area.

Do not create visible labels such as "What we're seeing" or "Why it matters".

Do not include a mini action plan under every dimension.

Save the strongest recommendations for WHERE TO FOCUS NEXT.


strategic_headline

Maximum 14 words.

strategic_commentary

Maximum 77 words.


consumer_headline

Maximum 14 words.

consumer_commentary

Maximum 77 words.


market_headline

Maximum 14 words.

market_commentary

Maximum 77 words.


growth_headline

Maximum 14 words.

growth_commentary

Maximum 77 words.


commercial_headline

Maximum 14 words.

commercial_commentary

Maximum 77 words.



WHERE TO FOCUS NEXT

This should be the strongest part of the report.

Do not simply repeat the five areas.

Synthesize the entire diagnostic.

Identify the single most important opportunity or sequence of opportunities.

Explain why it deserves priority.

The reader should finish with a clearer sense of direction.


focus_next_intro

Maximum 90 words.

Explain the central opportunity and why it matters.

Then use The Creative Lab's Now / Next / Nurture framework.


now

Maximum 65 words.

The immediate priority.

What should the business investigate, clarify or fix first?

Give clear direction without turning it into a free consultancy plan.


next

Maximum 65 words.

What should the business test, build or change once the first issue is better understood?


nurture

Maximum 65 words.

What should the business develop, improve or scale over time?


NOW / NEXT / NURTURE PRINCIPLE

The sequence must feel connected.

NOW should create the understanding needed for NEXT.

NEXT should create the learning or capability needed for NURTURE.

Do not produce three unrelated recommendations.

Make the direction feel clear, proportionate and achievable.

Do not manufacture optimism.



DIAGNOSTIC PRECEDENCE

When interpreting the overall pattern, use this order:

1. Major imbalance between areas.
2. Systemic weakness if four or five dimensions are below 50.
3. Strong foundations but weak conversion or Growth Engine.
4. Strong commercial engine but weak strategic or brand foundations.
5. Relatively flat profile — describe the overall level rather than inventing a dramatic weakness.



EVIDENCE DISCIPLINE

Do not extend a diagnostic observation into a commercial consequence unless that consequence is directly supported by the answers or verified business context.

Avoid unsupported claims such as:

- "this will cap growth"
- "this will weaken pricing power"
- "this puts retention at risk"
- "this makes acquisition inefficient"
- "this creates reliance on direct selling"

unless directly evidenced.

Do not make unsupported assumptions about:

- sales behaviour
- pricing
- retention
- acquisition
- pipeline
- customer loyalty
- internal capability
- market position
- competitor behaviour
- commercial model

If something is plausible but not evidenced, do not state it as fact.



FINAL RULES

- Make the report specific to this business.
- Use the relationship between the 20 answers, five scores and verified business context.
- Do not simply repeat scores in prose.
- Do not exaggerate weaknesses.
- Do not manufacture problems.
- Do not repeat the same insight across sections.
- Once the insight has landed, stop.
- Be direct and constructive.
- Keep enough depth back for a follow-up conversation.
- Avoid generic encouragement.
- Avoid obvious AI phrasing.
- Avoid neat rhetorical formulas.
- Avoid excessive three-part constructions.
- Avoid unnecessary colons and semicolons.
- Prefer plain English.
- Never include citations, links or source references in any JSON value.

Return ONLY valid JSON matching the requested schema.
`.trim();



    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              model:
                Netlify.env.get("OPENAI_MODEL") ||
                "gpt-5.1",

              tools: [
                {
                  type:
                    "web_search",

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
                  type:
                    "json_schema",

                  name:
                    "brand_performance_report",

                  strict:
                    true,

                  schema: {
                    type:
                      "object",

                    additionalProperties:
                      false,

                    properties: {

                      score_meaning: {
                        type: "string"
                      },

                      stands_out: {
                        type: "string"
                      },

                      strategic_headline: {
                        type: "string"
                      },

                      strategic_commentary: {
                        type: "string"
                      },

                      consumer_headline: {
                        type: "string"
                      },

                      consumer_commentary: {
                        type: "string"
                      },

                      market_headline: {
                        type: "string"
                      },

                      market_commentary: {
                        type: "string"
                      },

                      growth_headline: {
                        type: "string"
                      },

                      growth_commentary: {
                        type: "string"
                      },

                      commercial_headline: {
                        type: "string"
                      },

                      commercial_commentary: {
                        type: "string"
                      },

                      focus_next_intro: {
                        type: "string"
                      },

                      now: {
                        type: "string"
                      },

                      next: {
                        type: "string"
                      },

                      nurture: {
                        type: "string"
                      }

                    },

                    required: [
                      "score_meaning",
                      "stands_out",
                      "strategic_headline",
                      "strategic_commentary",
                      "consumer_headline",
                      "consumer_commentary",
                      "market_headline",
                      "market_commentary",
                      "growth_headline",
                      "growth_commentary",
                      "commercial_headline",
                      "commercial_commentary",
                      "focus_next_intro",
                      "now",
                      "next",
                      "nurture"
                    ]
                  }
                }
              },

              background: true,

              input:
                prompt
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


    // Background generation returns quickly; the browser polls for completion.
    if (!data?.id) {
      return jsonResponse(502, {error: "OpenAI did not return a report job ID."});
    }
    return jsonResponse(202, {status: "processing", response_id: data.id});


  } catch (err) {

    return jsonResponse(500, {
      error:
        err?.message ||
        "Unexpected error."
    });
  }
};
