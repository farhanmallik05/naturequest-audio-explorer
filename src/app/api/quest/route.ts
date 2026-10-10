import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { runNatureQuestWorkflow } from '@/lib/agent/nature-agent';
import { getRecentQuests, getQuestById } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

const LocationSchema = z.object({
  location: z
    .string()
    .min(2, 'Location must be at least 2 characters long')
    .max(100, 'Location must be under 100 characters')
    .transform((val) => val.trim()),
});

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'anonymous-client';
}

/**
 * GET /api/quest
 * Retrieves the latest nature quests from MongoDB Atlas persistent storage,
 * or streams clean binary MP3 audio when requested with `?id=<questId>&audio=1`.
 */
export async function GET(req: NextRequest) {
  try {
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(`get_${clientId}`, 45, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.resetInSeconds.toString(),
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          },
        }
      );
    }

    const url = new URL(req.url);
    const questId = url.searchParams.get('id');
    const wantAudio = url.searchParams.get('audio') === '1' || url.searchParams.get('audio') === 'true';

    // Clean audio playback and streaming endpoint
    if (questId && wantAudio) {
      const quest = await getQuestById(questId);
      if (!quest || !quest.audioUrl) {
        return NextResponse.json(
          { error: 'Audio recording not found for this quest.' },
          { status: 404 }
        );
      }

      if (quest.audioUrl.startsWith('data:audio')) {
        const base64Index = quest.audioUrl.indexOf('base64,');
        const base64Content =
          base64Index !== -1 ? quest.audioUrl.substring(base64Index + 7) : quest.audioUrl;
        const audioBuffer = Buffer.from(base64Content, 'base64');
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'public, max-age=86400, immutable',
            'Content-Disposition': 'inline; filename="nature-quest.mp3"',
          },
        });
      }

      if (quest.audioUrl.startsWith('http')) {
        return NextResponse.redirect(quest.audioUrl);
      }
    }

    const quests = await getRecentQuests(12);

    return NextResponse.json(
      {
        quests,
        count: quests.length,
        status: 'success',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve quest history';
    console.error('Failed to get quests:', message);
    return NextResponse.json(
      { error: 'Unable to load quest history at this time.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quest
 * Triggers the Mastra agent workflow:
 * 1. SerpApi discovery tool
 * 2. Open-Weight Gemma reasoning
 * 3. ElevenLabs audio synthesis tool
 * 4. MongoDB Atlas memory storage
 */
export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(`post_${clientId}`, 15, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many quest requests. Please wait ${rateLimit.resetInSeconds} seconds before exploring again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.resetInSeconds.toString(),
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          },
        }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload received.' },
        { status: 400 }
      );
    }

    const parseResult = LocationSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: issues }, { status: 400 });
    }

    const { location } = parseResult.data;

    // Run the full Mastra agent workflow
    const result = await runNatureQuestWorkflow(location);

    return NextResponse.json(
      {
        location: result.location,
        spots: result.spots,
        narrative: result.narrative,
        audioUrl: result.audioUrl,
        cleanAudioUrl:
          result.questId && result.audioUrl
            ? `/api/quest?id=${result.questId}&audio=1`
            : undefined,
        dbSuccess: result.dbSuccess,
        model: result.model,
        source: result.source,
        questId: result.questId,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown execution failure';
    console.error('Agent workflow encountered an error:', message);

    return NextResponse.json(
      {
        error: 'The nature guide agent encountered an unexpected issue. Please try again.',
      },
      { status: 500 }
    );
  }
}
