"use client";

import React, { useEffect, useState, useRef } from "react";
import { Story } from "@/lib/supabase";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Heart,
  Send,
  MapPin,
  Music,
  ExternalLink,
  Volume2,
  VolumeX,
} from "lucide-react";

interface Props {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onStoryView: (id: string) => void;
}

export default function StoryModal({
  stories,
  initialIndex,
  onClose,
  onDelete,
  onStoryView,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentStory = stories[currentIndex];
  const hasMusic = !!(currentStory?.music_url || currentStory?.music_title);
  const storyDurationMs = hasMusic ? 8000 : 4000;

  useEffect(() => {
    if (currentStory) {
      onStoryView(currentStory.id);
    }
  }, [currentIndex, currentStory, onStoryView]);

  useEffect(() => {
    setImageLoaded(false);
    setProgress(0);
    setLiked(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!audioRef.current) return;

    const url = currentStory?.music_url || null;

    if (url) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      audioRef.current.muted = isMuted;

      if (!isPaused && !isDeleting) {
        audioRef.current.play().catch(() => {
          setIsMuted(true);
        });
      }
    } else {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentIndex, currentStory?.music_url]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = isMuted;
    if (!isMuted && !isPaused && !isDeleting && currentStory?.music_url) {
      audioRef.current.play().catch(() => {});
    }
  }, [isMuted]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPaused || isDeleting) {
      audioRef.current.pause();
    } else if (!isMuted && currentStory?.music_url) {
      audioRef.current.play().catch(() => {});
    }
  }, [isPaused, isDeleting]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  useEffect(() => {
    if (isPaused || isDeleting) return;

    const stepMs = 30;
    const increment = (stepMs / storyDurationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, isDeleting, stories.length, storyDurationMs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, stories.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null || touchStartY.current === null) return;

    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
      onClose();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentStory || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete(currentStory.id);
      if (stories.length <= 1) {
        onClose();
      } else if (currentIndex >= stories.length - 1) {
        setCurrentIndex(stories.length - 2);
        setProgress(0);
      } else {
        setProgress(0);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const getTimeString = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (!currentStory) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl select-none"
      onClick={onClose}
    >
      <audio ref={audioRef} loop />

      <div
        className="relative w-full h-full max-w-[420px] max-h-[840px] sm:rounded-3xl overflow-hidden bg-zinc-950 flex flex-col shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
      >
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1.5 p-3 pt-3.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          {stories.map((s, idx) => {
            let width = "0%";
            if (idx < currentIndex) width = "100%";
            if (idx === currentIndex) width = `${progress}%`;

            return (
              <div
                key={s.id}
                className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all ease-linear rounded-full"
                  style={{ width }}
                />
              </div>
            );
          })}
        </div>

        <div className="absolute top-6 left-0 right-0 z-20 flex items-start justify-between px-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full ring-2 ring-white/30 overflow-hidden bg-zinc-800 shrink-0 shadow-sm">
              <img
                src={currentStory.image_data}
                alt="Thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-semibold drop-shadow">
                <span>story.{currentIndex + 1}</span>
                <span className="text-white/60 font-normal">
                  {getTimeString(currentStory.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/80">
                {currentStory.location && (
                  <span className="flex items-center gap-0.5 bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded-full">
                    <MapPin className="w-2.5 h-2.5 text-rose-400" />
                    <span>{currentStory.location}</span>
                  </span>
                )}
                {currentStory.music_title && (
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10">
                    <Music className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
                    <span className="truncate max-w-[100px]">{currentStory.music_title}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentStory.music_url && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-2 rounded-full hover:bg-white/20 active:scale-90 text-white cursor-pointer transition"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white/70" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-300" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-full hover:bg-white/20 active:scale-90 text-white/80 hover:text-rose-400 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 active:scale-90 text-white cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-zinc-900 shimmer-box flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          )}

          <img
            key={currentStory.id}
            src={currentStory.image_data}
            alt="Story"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-contain pointer-events-none select-none transition-opacity duration-200 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />

          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-20 flex justify-center pointer-events-none">
              <div className="max-w-[85%] bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white text-xs font-medium text-center shadow-lg">
                {currentStory.caption}
              </div>
            </div>
          )}

          {currentStory.link_url && (
            <div className="absolute bottom-32 left-0 right-0 z-20 flex justify-center">
              <a
                href={
                  currentStory.link_url.startsWith("http")
                    ? currentStory.link_url
                    : `https://${currentStory.link_url}`
                }
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-[11px] font-medium shadow-md transition active:scale-95 cursor-pointer"
              >
                <span>Visit Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-3">
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              placeholder="Send message..."
              className="w-full h-11 px-4 rounded-full bg-white/15 text-white placeholder-white/60 text-xs border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/50 backdrop-blur-sm pr-10"
            />
            {replyText.trim() && (
              <button
                type="button"
                onClick={() => setReplyText("")}
                className="absolute right-3 p-1 text-white hover:text-white/80 active:scale-90 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLiked(!liked);
            }}
            className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 cursor-pointer text-white transition border border-white/20 backdrop-blur-sm"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                liked ? "fill-rose-500 text-rose-500" : "text-white"
              }`}
            />
          </button>
        </div>

        <div
          className="absolute inset-y-20 left-0 w-1/3 z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        />
        <div
          className="absolute inset-y-20 right-0 w-1/3 z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        />

        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white items-center justify-center cursor-pointer transition border border-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {currentIndex < stories.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white items-center justify-center cursor-pointer transition border border-white/10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
