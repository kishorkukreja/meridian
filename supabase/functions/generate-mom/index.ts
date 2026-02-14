import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FULL_MOM_PROMPT = `You are a meeting minutes generator. Analyze the following meeting transcript and produce structured minutes of meeting (MoM).

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "tldr": "1-2 sentence summary of the meeting",
  "discussion_points": ["point 1", "point 2", "point 3"],
  "next_steps": [
    {"action": "description of action", "owner": "person responsible", "due_date": "YYYY-MM-DD"}
  ],
  "action_log": "YYYY-MM-DD | Action 1\\nYYYY-MM-DD | Action 2",
  "quote": "A short witty or inspiring quote relevant to the meeting topic"
}

Rules:
- tldr: concise 1-2 sentence summary capturing the key outcome
- discussion_points: 3-4 high-level topics discussed (not granular details)
- next_steps: extract concrete action items with owner and realistic due dates
- action_log: pre-formatted string, one line per action, format "YYYY-MM-DD | Action description"
- quote: a short, witty, or inspiring quote (real or original) that relates to the meeting's theme or key topics. Keep it to 1-2 sentences with attribution. Make it fun and memorable.
- If owner or due_date cannot be determined, use "TBD"
- Dates in action_log should match the next_steps due dates`

const AI_CONVERSATION_PROMPT = `You are an issue extraction assistant. Analyze this conversation between a user and an AI assistant. The user was brainstorming, planning, or troubleshooting work items. Extract a structured summary focused on actionable outcomes.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "tldr": "2-3 sentence summary of what was discussed and decided",
  "discussion_points": ["topic 1", "topic 2", "topic 3"],
  "next_steps": [
    {"action": "specific actionable task", "owner": "TBD", "due_date": "TBD"}
  ],
  "quote": "A short witty or inspiring quote relevant to the conversation topic"
}

Rules:
- tldr: 2-3 sentences summarizing the conversation's purpose, key decisions, and outcomes
- discussion_points: 4-8 topics/themes covered in the conversation
- next_steps: extract EVERY actionable item, task, to-do, or follow-up mentioned. Be aggressive — if something sounds like work that needs doing, include it. Set owner and due_date to "TBD" unless explicitly stated.
- quote: a short, witty, or inspiring quote (real or original) that relates to the conversation's theme. Keep it to 1-2 sentences with attribution. Make it fun and memorable.
- Focus on concrete deliverables, not abstract discussion topics`

const QUICK_SUMMARY_PROMPT = `You are a meeting summary assistant. Someone missed this meeting and needs a quick catch-up. Analyze the transcript and provide a concise summary with key takeaways and action items.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "tldr": "2-3 sentence summary covering what was discussed and any key decisions made",
  "discussion_points": ["key point 1", "key point 2", "key point 3", "key point 4"],
  "next_steps": [
    {"action": "description of action item", "owner": "person responsible", "due_date": "YYYY-MM-DD"}
  ],
  "quote": "A short witty or inspiring quote relevant to the meeting topic"
}

Rules:
- tldr: 2-3 sentences that give someone who missed the meeting a clear picture of what happened and what was decided
- discussion_points: 4-6 high-level bullet points covering the main topics, decisions, and any concerns raised
- next_steps: extract ALL action items mentioned, with owner and due date. If owner or due_date cannot be determined, use "TBD"
- quote: a short, witty, or inspiring quote (real or original) that relates to the meeting's theme. Keep it to 1-2 sentences with attribution. Make it fun and memorable.
- Focus on "what do I need to know" and "what do I need to do" — skip pleasantries and filler`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate auth
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

    const { transcript, mode = 'full_mom' } = await req.json()
    if (!transcript || typeof transcript !== 'string') {
      return new Response(JSON.stringify({ error: 'transcript is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Auto-select model based on transcript length
    const model = transcript.length < 8000 ? 'gemini-2.5-flash' : 'gemini-2.5-pro'

    const basePrompt = mode === 'ai_conversation' ? AI_CONVERSATION_PROMPT : mode === 'quick_summary' ? QUICK_SUMMARY_PROMPT : FULL_MOM_PROMPT
    const prompt = `${basePrompt}\n\nTRANSCRIPT:\n${transcript}`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 4096,
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

    // Parse the JSON response, stripping potential markdown code fences
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const mom = JSON.parse(cleaned)

    return new Response(JSON.stringify({ ...mom, model_used: model }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
