import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are an email drafting assistant for an S&OP (Sales & Operations Planning) data program tracker.
Given a comment from an issue tracker and its context, write a polished, professional email that communicates the same information clearly and concisely.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "subject": "A clear, professional email subject line",
  "body": "The full email body text"
}

Rules:
- Subject should be concise (under 80 chars) and include the issue/object context
- Body should be professional but not overly formal — clear, direct, and actionable
- Rewrite the comment into proper sentences and paragraphs — don't just copy it
- Include relevant issue context (object, type, stage, status) naturally in the email, not as a raw list
- If the comment mentions action items or decisions, highlight them clearly
- End with a clear ask or next step if appropriate
- Keep the tone collaborative and constructive
- Do NOT add a greeting (Hi/Dear) or sign-off (Regards/Thanks) — the user will add their own
- Keep it concise — no more than 2-3 short paragraphs`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { comment, context } = await req.json()
    if (!comment || !context) {
      return new Response(JSON.stringify({ error: 'comment and context are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `${PROMPT}

ISSUE CONTEXT:
- Issue Title: ${context.issueTitle}
- Object: ${context.objectName}
- Type: ${context.issueType}
- Lifecycle Stage: ${context.lifecycleStage}
- Status: ${context.status}
${context.ownerAlias ? `- Owner: ${context.ownerAlias}` : ''}

COMMENT (by ${context.commentAuthor}):
${comment}`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return new Response(JSON.stringify({ error: 'Gemini API error', details: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      return new Response(JSON.stringify({ error: 'No response from Gemini' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
