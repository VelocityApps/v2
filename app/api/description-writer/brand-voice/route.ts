import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * POST /api/description-writer/brand-voice
 * Analyses sample descriptions and extracts a brand voice profile.
 *
 * GET /api/description-writer/brand-voice
 * Returns the saved brand voice profile for the user.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('brand_voice_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ profile: profile ?? null });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: accessProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('has_description_writer')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!accessProfile?.has_description_writer) {
    return NextResponse.json({ error: 'AI Description Writer subscription required' }, { status: 403 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sampleDescriptions } = body;
  if (!Array.isArray(sampleDescriptions) || sampleDescriptions.length < 3) {
    return NextResponse.json({ error: 'Provide at least 3 sample descriptions' }, { status: 400 });
  }

  const samples = (sampleDescriptions as string[])
    .filter((d) => typeof d === 'string' && d.trim().length > 20)
    .slice(0, 10)
    .map((d, i) => `--- Sample ${i + 1} ---\n${d.replace(/<[^>]+>/g, ' ').trim()}`)
    .join('\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Analyse these product descriptions and extract a detailed brand voice profile.

${samples}

Return a JSON object with exactly these keys:
{
  "tone": ["adjective1", "adjective2", ...],          // 3-5 tone adjectives
  "sentence_structure": "short|long|mixed",
  "vocabulary_level": "simple|technical|mixed",
  "personality_traits": ["trait1", ...],               // 3-5 personality traits
  "phrases_to_use": ["phrase1", ...],                  // 5-8 example phrases that fit this voice
  "phrases_to_avoid": ["phrase1", ...],                // 5-8 clichés or off-brand phrases to avoid
  "example_sentences": ["sentence1", "sentence2", "sentence3"]  // 3 example sentences in this brand's voice
}

Return only valid JSON. No markdown, no explanation.`,
    }],
  });

  let voiceProfile: any;
  try {
    voiceProfile = JSON.parse((message.content[0] as Anthropic.TextBlock).text);
  } catch {
    return NextResponse.json({ error: 'Failed to parse brand voice profile. Please try again.' }, { status: 500 });
  }

  const { data: saved } = await supabaseAdmin
    .from('brand_voice_profiles')
    .upsert(
      {
        user_id: user.id,
        tone: voiceProfile.tone,
        sentence_structure: voiceProfile.sentence_structure,
        vocabulary_level: voiceProfile.vocabulary_level,
        personality_traits: voiceProfile.personality_traits,
        phrases_to_use: voiceProfile.phrases_to_use,
        phrases_to_avoid: voiceProfile.phrases_to_avoid,
        example_sentences: voiceProfile.example_sentences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  return NextResponse.json({ profile: saved });
}

/**
 * PUT /api/description-writer/brand-voice
 * Updates the saved brand voice profile (manual edits from the UI).
 */
export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: saved, error } = await supabaseAdmin
    .from('brand_voice_profiles')
    .upsert(
      { user_id: user.id, ...body, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  return NextResponse.json({ profile: saved });
}
