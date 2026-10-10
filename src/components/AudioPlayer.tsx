'use client';

import { useState, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ src, title = 'Nature Guide Narration' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error('Playback failed:', err);
          setHasError(true);
        });
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (isFinite(dur) && dur > 0) {
        setDuration(dur);
        setIsReady(true);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      audioRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadStart={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          setIsReady(false);
          setHasError(false);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
      />

      {/* Header with Title and Equalizer Animation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium tracking-wide uppercase text-neutral-400">
            {title}
          </span>
        </div>

        {/* Animated Sound Waveform Indicator */}
        <div className="flex items-center space-x-1 h-4">
          {[40, 80, 50, 90, 60, 30].map((heightPercent, idx) => (
            <span
              key={idx}
              className={`w-1 bg-emerald-500 rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-pulse' : 'opacity-40'
              }`}
              style={{
                height: isPlaying ? `${heightPercent}%` : '20%',
                animationDelay: `${idx * 120}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Scrubber Progress Slider */}
      <div className="space-y-1 mb-4">
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!isReady && duration === 0}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
            aria-label="Audio timeline progress"
          />
          <div
            className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-mono text-neutral-500">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : 'Ready'}</span>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
        <div className="flex items-center space-x-2">
          {/* Play / Pause Primary Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={hasError}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={handleRestart}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Restart from beginning"
            aria-label="Restart audio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-1">
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label="Toggle mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Download offline guide */}
          <a
            href={src}
            download="nature-quest-audio.mp3"
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Download audio guide for offline walk"
            aria-label="Download audio guide"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {hasError && (
        <p className="mt-2 text-xs text-rose-400 text-center">
          Audio playback error. Your browser may require interacting with the page first.
        </p>
      )}
    </div>
  );
}
