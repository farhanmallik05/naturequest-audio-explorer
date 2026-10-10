'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Leaf,
  Loader2,
  AlertCircle,
  MapPin,
  Sparkles,
  RefreshCw,
  Database,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { AudioPlayer } from '@/components/AudioPlayer';

interface QuestResponse {
  location: string;
  spots: string[];
  narrative: string;
  audioUrl?: string;
  dbSuccess?: boolean;
  model?: string;
  source?: string;
}

interface SavedQuest {
  _id?: string;
  location: string;
  spots: string[];
  narrative: string;
  audioUrl?: string;
  model?: string;
  createdAt: string | Date;
}

const QUICK_EXPLORE_LOCATIONS = [
  'Central Park, NYC',
  'Golden Gate Park, San Francisco',
  'Hyde Park, London',
  'Kyoto Arashiyama, Japan',
  'Lake Tahoe, California',
];

export default function Home() {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [quest, setQuest] = useState<QuestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedQuests, setSavedQuests] = useState<SavedQuest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Workflow steps display
  const workflowSteps = [
    'Scanning local trails & parks with SerpApi...',
    'Synthesizing mindful quest using Gemma Open-Weight AI...',
    'Generating calming voice companion via ElevenLabs...',
    'Saving quest journey to MongoDB Atlas...',
  ];

  // Fetch recent quests from MongoDB Atlas on mount
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/quest');
      if (res.ok) {
        const data = (await res.json()) as { quests?: SavedQuest[] };
        if (data.quests && Array.isArray(data.quests)) {
          setSavedQuests(data.quests);
        }
      }
    } catch (err) {
      console.warn('Could not load quest history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Fetch initial quests on mount without synchronous setState in effect
  useEffect(() => {
    let ignore = false;
    async function fetchInitialHistory() {
      try {
        const res = await fetch('/api/quest');
        if (res.ok && !ignore) {
          const data = (await res.json()) as { quests?: SavedQuest[] };
          if (data.quests && Array.isArray(data.quests)) {
            setSavedQuests(data.quests);
          }
        }
      } catch (err) {
        console.warn('Could not load quest history:', err);
      } finally {
        if (!ignore) {
          setLoadingHistory(false);
        }
      }
    }
    fetchInitialHistory();
    return () => {
      ignore = true;
    };
  }, []);

  // Handle workflow step animation
  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < workflowSteps.length - 1 ? prev + 1 : prev));
    }, 1600);

    return () => {
      clearInterval(interval);
    };
  }, [loading, workflowSteps.length]);

  const executeQuestGeneration = async (locToSearch: string) => {
    const trimmed = locToSearch.trim();
    if (!trimmed) return;

    setCurrentStep(0);
    setLoading(true);
    setErrorMessage(null);
    setQuest(null);

    try {
      const res = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: trimmed }),
      });

      const data = (await res.json()) as QuestResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      setQuest(data);
      // Refresh history so newly saved quest appears in MongoDB list
      loadHistory();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to generate nature quest. Please check your network and try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
      setCurrentStep(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuestGeneration(location);
  };

  const handleQuickSelect = (loc: string) => {
    setLocation(loc);
    executeQuestGeneration(loc);
  };

  const handleSelectSavedQuest = (saved: SavedQuest) => {
    setQuest({
      location: saved.location,
      spots: saved.spots,
      narrative: saved.narrative,
      audioUrl: saved.audioUrl,
      dbSuccess: true,
      model: saved.model || 'Saved Archive',
      source: 'MongoDB Atlas History',
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-emerald-500/30 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-neutral-950 to-neutral-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      <main className="relative max-w-4xl mx-auto px-5 py-16 md:py-24 flex flex-col items-center min-h-screen">
        {/* Challenge Badges */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-8"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Leaf className="w-3.5 h-3.5" />
            Hacktoberfest: Touch Grass Challenge
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Radio className="w-3.5 h-3.5" />
            Mastra Agent Orchestrator
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Gemma Open-Weight AI
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center space-y-4 max-w-2xl"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-neutral-100 via-neutral-200 to-neutral-500">
            Touch Grass.
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 leading-relaxed font-light">
            An open-source agentic guide that discovers real nature trails, writes poetic outdoor quests with Gemma, and voices them for your journey.
          </p>
        </motion.div>

        {/* Exploration Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          onSubmit={handleSubmit}
          className="mt-10 w-full max-w-lg relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 rounded-2xl blur-lg transition duration-500 group-hover:opacity-100 opacity-60 pointer-events-none" />
          <div className="relative flex items-center bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2 shadow-2xl backdrop-blur-xl focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <Compass className="w-5 h-5 text-emerald-400 ml-3 shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter a city, park, or neighborhood..."
              className="w-full bg-transparent border-none outline-none px-3.5 py-3 text-neutral-100 placeholder-neutral-500 text-base"
              disabled={loading}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 min-w-[110px] shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-neutral-950" />
              ) : (
                'Explore'
              )}
            </button>
          </div>
        </motion.form>

        {/* Quick Explore Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs text-neutral-500"
        >
          <span className="mr-1">Try:</span>
          {QUICK_EXPLORE_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleQuickSelect(loc)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-emerald-400 border border-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loc}
            </button>
          ))}
        </motion.div>

        {/* Agentic Workflow Live Progress Indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-10 w-full max-w-lg bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 backdrop-blur-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Mastra Agent Orchestrating
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  Step {currentStep + 1} of {workflowSteps.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {workflowSteps.map((step, idx) => {
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 text-sm transition-colors duration-300 ${
                        isCurrent
                          ? 'text-neutral-100 font-medium'
                          : isDone
                          ? 'text-neutral-500'
                          : 'text-neutral-600'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-neutral-700 shrink-0 inline-block" />
                      )}
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Feedback Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8 w-full max-w-lg bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-rose-200">Quest Generation Notice</p>
                  <p className="text-xs text-rose-300/80 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => executeQuestGeneration(location || 'Central Park')}
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Quest Result Display */}
        <AnimatePresence>
          {quest && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="mt-12 w-full max-w-2xl bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-teal-500/0" />

              {/* Location & Metadata Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800/80 text-emerald-400 border border-neutral-700">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  {quest.location}
                </span>

                {quest.model && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-neutral-400 bg-neutral-800/60 border border-neutral-800 font-mono">
                    {quest.model}
                  </span>
                )}

                {quest.dbSuccess && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-teal-400 bg-teal-950/40 border border-teal-800/40">
                    <Database className="w-3 h-3" />
                    Atlas Synced
                  </span>
                )}
              </div>

              {/* Discovered Spots List */}
              {quest.spots && quest.spots.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-xs text-neutral-500 font-mono">Trailheads:</span>
                  {quest.spots.map((spot, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700/60"
                    >
                      {spot}
                    </span>
                  ))}
                </div>
              )}

              {/* Poetic Narrative - safely rendered without unescaped JSX quotes */}
              <p className="text-xl sm:text-2xl text-neutral-200 leading-relaxed font-light italic px-2 sm:px-6">
                &ldquo;{quest.narrative}&rdquo;
              </p>

              {/* Audio Player Controller */}
              <div className="mt-8 w-full max-w-md mx-auto">
                {quest.audioUrl ? (
                  <AudioPlayer key={quest.audioUrl} src={quest.audioUrl} title={`Quest: ${quest.location}`} />
                ) : (
                  <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-neutral-500 text-xs text-center space-y-1">
                    <p className="font-medium text-neutral-400">Audio Synthesis in Standby</p>
                    <p>
                      Add <code className="text-emerald-400">ELEVENLABS_API_KEY</code> to enable full neural voice guides for hiking.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quest History / Saved Quests from MongoDB Atlas */}
        <section className="mt-20 w-full max-w-3xl">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-semibold tracking-tight text-neutral-200">
                Community Quest Vault
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                MongoDB Atlas
              </span>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 p-1.5 rounded-lg hover:bg-neutral-900 transition-colors"
              title="Refresh quest vault"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {savedQuests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedQuests.map((item, idx) => (
                <div
                  key={item._id || idx}
                  onClick={() => handleSelectSavedQuest(item)}
                  className="group bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800/80 hover:border-emerald-500/40 rounded-2xl p-5 transition-all cursor-pointer backdrop-blur-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      {item.location}
                    </span>
                    {item.audioUrl && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Audio Ready
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed italic">
                    &ldquo;{item.narrative}&rdquo;
                  </p>

                  <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                    <span>{item.model || 'Gemma'}</span>
                    <span className="text-emerald-500 group-hover:underline">Replay Quest &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          ) : loadingHistory ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-neutral-900/20 border border-neutral-900 text-neutral-500 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Accessing MongoDB community vault...</span>
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl bg-neutral-900/20 border border-neutral-900 text-neutral-500 text-sm space-y-1">
              <p>No logged adventures yet in this vault.</p>
              <p className="text-xs text-neutral-600">
                Generate your first quest above or configure <code className="text-neutral-400">MONGODB_URI</code> to persist across sessions!
              </p>
            </div>
          )}
        </section>

        {/* Footer with Sponsors & Open Source Attributions */}
        <footer className="mt-24 pt-8 border-t border-neutral-900 w-full text-center text-xs text-neutral-600 space-y-2">
          <p>
            NatureQuest Audio Explorer &bull; Built with{' '}
            <span className="text-neutral-400">Mastra</span>,{' '}
            <span className="text-neutral-400">Gemma Open-Weight AI</span>,{' '}
            <span className="text-neutral-400">ElevenLabs</span>,{' '}
            <span className="text-neutral-400">SerpApi</span>, &amp;{' '}
            <span className="text-neutral-400">MongoDB Atlas</span>.
          </p>
          <p className="text-[11px] text-neutral-700">
            Hacktoberfest Open-Source AI Challenge: Week 1 &bull; Touch Grass
          </p>
        </footer>
      </main>
    </div>
  );
}
