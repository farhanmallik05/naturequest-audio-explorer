import { Agent } from '@mastra/core/agent';
import OpenAI from 'openai';
import {
  natureSearchTool,
  elevenLabsTtsTool,
  questMemoryTool,
  searchNatureSpots,
  synthesizeAudio,
  saveQuestMemory,
} from './tools';

export const GEMMA_SYSTEM_PROMPT = `You are an inspiring nature guide and mindful explorer for NatureQuest ("Touch Grass").
Your mission is to motivate the user to step away from digital screens and reconnect with the living world outside.
Craft an evocative, sensory-rich 3-sentence nature quest tailored to the specific spots and location provided.
Focus on tangible senses: the rustle of leaves, fresh air, grounding earth, or sunlight through trees.
Sentence 1: Invite the user to leave their screen and visit a named spot.
Sentence 2: Give an active mindful sensory observation to look for or touch.
Sentence 3: Offer an inspiring closing thought on how touching grass grounds our humanity.
Keep it strictly under 60 words.`;

/**
 * Mastra Agent Instance for NatureQuest
 * Configured with Gemma 2-9B open-weight model (via Groq OpenAI-compatible provider)
 * and tools for discovery, TTS voice narration, and MongoDB Atlas memory.
 */
export const natureGuideAgent = new Agent({
  id: 'nature-guide-agent',
  name: 'NatureQuest Mindful Guide Agent',
  instructions: GEMMA_SYSTEM_PROMPT,
  model: {
    providerId: 'groq',
    modelId: 'gemma2-9b-it',
    url: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || 'groq-key-placeholder',
  },
  tools: {
    natureSearchTool,
    elevenLabsTtsTool,
    questMemoryTool,
  },
});

export interface QuestAgentResult {
  location: string;
  spots: string[];
  narrative: string;
  audioUrl?: string;
  dbSuccess: boolean;
  model: string;
  source: string;
  questId?: string;
}

/**
 * Procedural Gemma-style nature quest generator used when no external API key is provided
 * to ensure 100% functionality out-of-the-box in local and offline environments.
 */
function generateProceduralQuest(location: string, spots: string[]): string {
  const primarySpot = spots[0] || `${location} Central Park`;
  const secondarySpot = spots[1] || `${location} Nature Trail`;

  const templates = [
    `Step away from your screen and journey toward ${primarySpot}, where open skies and rustling greenery await you. Pause near ${secondarySpot}, press your hands against the cool bark of an ancient tree, and take three deep breaths of unfiltered outdoor air. The digital world can wait; reconnecting with the earth beneath your feet brings peace that no screen can offer.`,
    `Set your devices aside and head into ${primarySpot} to feel the natural rhythm of the outdoors. Listen closely to the wind passing through the foliage at ${secondarySpot}, and let the scent of wet grass reset your wandering attention. Touching grass is a reminder that we belong to the living world, grounded, patient, and truly alive.`,
    `Close your tabs and venture out toward ${primarySpot} for a much-needed breath of stillness. Wander the pathways of ${secondarySpot}, notice the dappled sunlight filtering through branches, and let your eyes rest on the horizon. Out here in nature, every step grounds your mind and rekindles your spirit.`,
  ];

  const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return templates[hash % templates.length];
}

/**
 * Mastra Agent Orchestrator for NatureQuest
 * Coordinates:
 * 1. SerpApi Tool (Location spot discovery)
 * 2. Gemma Open-Weight AI (Narrative generation via Groq or fallback)
 * 3. ElevenLabs Tool (Audio guide synthesis)
 * 4. Atlas Memory Tool (Persistent quest history)
 */
export async function runNatureQuestWorkflow(location: string): Promise<QuestAgentResult> {
  // Step 1: Run SerpApi Discovery
  const searchResult = await searchNatureSpots(location);

  const spots = searchResult.spots;
  const spotsSummary = searchResult.summary;

  // Step 2: Open-Weight Model reasoning with Gemma (Groq / OpenAI compatible / procedural)
  let narrative = '';
  let modelUsed = 'Gemma-2-9B-IT (Local Procedural)';

  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const completion = await groq.chat.completions.create({
        model: 'gemma2-9b-it',
        messages: [
          { role: 'system', content: GEMMA_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Create a nature quest for these spots in ${location}: ${spotsSummary}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 180,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (responseText) {
        narrative = responseText;
        modelUsed = 'Gemma-2-9B-IT (via Groq Open-Weight)';
      }
    } catch (err) {
      console.warn('Groq Gemma generation failed, falling back:', err);
    }
  }

  // Fallback to OpenAI if Groq is not configured or failed
  if (!narrative && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      });

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: GEMMA_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Create a nature quest for these spots in ${location}: ${spotsSummary}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 180,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (responseText) {
        narrative = responseText;
        modelUsed = `${process.env.OPENAI_MODEL || 'gpt-4o-mini'} (OpenAI Engine)`;
      }
    } catch (err) {
      console.warn('OpenAI generation failed, falling back to procedural:', err);
    }
  }

  // Graceful offline fallback
  if (!narrative) {
    narrative = generateProceduralQuest(location, spots);
  }

  // Step 3: Run ElevenLabs Audio Synthesis
  const audioResult = await synthesizeAudio(narrative);

  // Step 4: Run Quest Memory (MongoDB Atlas)
  const memoryResult = await saveQuestMemory({
    location,
    narrative,
    spots,
    audioUrl: audioResult.audioUrl,
    model: modelUsed,
  });

  return {
    location,
    spots,
    narrative,
    audioUrl: audioResult.audioUrl,
    dbSuccess: memoryResult.saved,
    model: modelUsed,
    source: searchResult.source,
    questId: memoryResult.id,
  };
}
