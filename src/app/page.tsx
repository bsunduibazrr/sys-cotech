"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Loader2,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Camera,
  Compass,
  MapPin,
  Music,
  Link as LinkIcon,
  X,
  Sparkles,
  Upload,
  Play,
  Pause,
  PenIcon,
} from "lucide-react";
import { supabase, Story } from "@/lib/supabase";
import StoryModal from "@/components/storyModal";

const PRESET_SONGS = [
  {
    title: "Lofi Chill Beat",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    title: "Acoustic Sunset",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    title: "Summer Vibes",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    title: "Midnight Drive",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
];

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);
  const [feedLiked, setFeedLiked] = useState(false);
  const [feedBookmarked, setFeedBookmarked] = useState(false);

  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [captionInput, setCaptionInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [musicInput, setMusicInput] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [previewingSongUrl, setPreviewingSongUrl] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const isStoryExpired = (story: Story) => {
    if (story.expires_at) {
      return new Date(story.expires_at).getTime() <= Date.now();
    }
    const diff = Date.now() - new Date(story.created_at).getTime();
    return diff > 24 * 60 * 60 * 1000;
  };

  const getValidStories = (list: Story[]) => {
    return list.filter((item) => !isStoryExpired(item));
  };

  useEffect(() => {
    try {
      localStorage.removeItem("stories_cache");
      const savedViewed = localStorage.getItem("viewed_stories");
      if (savedViewed) {
        setViewedStoryIds(JSON.parse(savedViewed));
      }
    } catch (e) {
      console.log(e);
    }

    async function loadData() {
      try {
        const { data, error } = await supabase
          .from("stories")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          const valid = getValidStories(data);
          setStories(valid);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const interval = setInterval(() => {
      setStories((prev) => getValidStories(prev));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("File read error"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Image load error"));
        img.onload = () => {
          const maxWidth = 1080;
          const maxHeight = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mimeType =
            file.type === "image/png" ? "image/png" : "image/jpeg";
          resolve(canvas.toDataURL(mimeType, 0.85));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    try {
      setUploading(true);
      const base64 = await convertFileToBase64(file);
      setPreviewImage(base64);
      setIsCreatorOpen(true);
    } catch (err) {
      console.log(err);
      alert("Failed to process image");
    } finally {
      setUploading(false);
    }
  };

  const closeCreator = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setPreviewingSongUrl(null);
    setIsCreatorOpen(false);
    setPreviewImage(null);
    setCaptionInput("");
    setLocationInput("");
    setMusicInput("");
    setMusicUrl("");
    setLinkInput("");
  };

  const togglePreviewSong = (url: string) => {
    if (previewingSongUrl === url) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingSongUrl(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play().catch(() => {});
      }
      setPreviewingSongUrl(url);
    }
  };

  const handleSelectPresetSong = (song: { title: string; url: string }) => {
    setMusicInput(song.title);
    setMusicUrl(song.url);
    togglePreviewSong(song.url);
  };

  const handleShareStory = async () => {
    if (!previewImage) {
      fileInputRef.current?.click();
      return;
    }

    try {
      setUploading(true);
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      let resolvedMusicUrl = musicUrl;
      if (!resolvedMusicUrl && musicInput.trim()) {
        const found = PRESET_SONGS.find((s) => s.title === musicInput.trim());
        resolvedMusicUrl = found ? found.url : PRESET_SONGS[0].url;
      }

      const payload: Record<string, string | null> = {
        image_data: previewImage,
      };

      if (captionInput.trim()) payload.caption = captionInput.trim();
      if (locationInput.trim()) payload.location = locationInput.trim();
      if (musicInput.trim()) payload.music_title = musicInput.trim();
      if (resolvedMusicUrl) payload.music_url = resolvedMusicUrl;
      if (linkInput.trim()) payload.link_url = linkInput.trim();
      payload.expires_at = expiresAt;

      let result = await supabase.from("stories").insert([payload]).select();

      if (result.error) {
        delete payload.music_url;
        const retry1 = await supabase
          .from("stories")
          .insert([payload])
          .select();

        if (retry1.error) {
          const fallback = await supabase
            .from("stories")
            .insert([{ image_data: previewImage }])
            .select();
          result = fallback;
        } else {
          result = retry1;
        }
      }

      if (result.data && result.data[0]) {
        const newStory = result.data[0] as Story;
        setStories((prev) => [newStory, ...prev]);
        closeCreator();
      }
    } catch (err) {
      console.log(err);
      alert("Failed to share story");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("stories").delete().eq("id", id);
      setStories((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.log(err);
    }
  };

  const markStoryAsViewed = (id: string) => {
    setViewedStoryIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem("viewed_stories", JSON.stringify(updated));
      } catch (e) {
        console.log(e);
      }
      return updated;
    });
  };

  const featuredStory = stories.length > 0 ? stories[0] : null;

  return (
    <div className="bg-zinc-100 dark:bg-zinc-950 flex justify-center py-0 sm:py-6">
      <audio ref={previewAudioRef} />

      <div className="w-full max-w-[480px] bg-white dark:bg-black h-[300px] sm:rounded-3xl sm:border border-zinc-200 dark:border-zinc-800/80 sm:shadow-xl flex flex-col overflow-hidden">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-50 font-serif italic">
              Stories
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreatorOpen(true)}
              className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-95 text-zinc-800 dark:text-zinc-200 cursor-pointer transition"
            >
              <img src={"wazari.png"} className="w-15 h-15" />
            </button>
          </div>
        </header>

        <div className="border-b border-zinc-100 dark:border-zinc-900/80 bg-white dark:bg-black px-3 py-3.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />

          <div className="flex items-center gap-3.5 overflow-x-auto scrollbar-none pb-0.5">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                onClick={() => setIsCreatorOpen(true)}
                className="relative cursor-pointer group active:scale-95 transition-transform"
              >
                <div className="w-[66px] h-[66px] rounded-full p-[2px] border-2 border-dashed border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 transition">
                  {uploading && !previewImage ? (
                    <Loader2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400 animate-spin" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition" />
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-500 border-2 border-white dark:border-black flex items-center justify-center shadow-xs">
                  <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
              </div>

              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 max-w-[68px] truncate">
                Your story
              </span>
            </div>

            {loading && stories.length === 0 && (
              <>
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="flex flex-col items-center gap-1.5 shrink-0"
                  >
                    <div className="w-[66px] h-[66px] rounded-full p-[2.5px] bg-zinc-200 dark:bg-zinc-800 shimmer-box flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-900" />
                    </div>
                    <div className="w-10 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full shimmer-box" />
                  </div>
                ))}
              </>
            )}

            {stories.map((story, index) => {
              const isViewed = viewedStoryIds.includes(story.id);

              return (
                <div
                  key={story.id}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                  onClick={() => setActiveStoryIndex(index)}
                >
                  <div
                    className={`rounded-full active:scale-95 group-hover:scale-105 transition-all duration-200 cursor-pointer ${
                      isViewed
                        ? "p-[2px] bg-zinc-300 dark:bg-zinc-700"
                        : "p-[2.5px] bg-red-500"
                    }`}
                  >
                    <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-white dark:bg-black overflow-hidden relative">
                      <img
                        src={story.image_data}
                        alt={`Story ${index + 1}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-medium max-w-[66px] truncate text-center ${
                      isViewed
                        ? "text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    story.{index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isCreatorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-4 select-none"
          onClick={closeCreator}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  New Story
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCreator}
                className="p-1 rounded-full text-red-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition"
              >
                <X className="w-5 h-5 " />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
              {previewImage ? (
                <div className="relative w-full aspect-[4/3] max-h-56 bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center">
                  <img
                    src={previewImage}
                    alt="Story preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium backdrop-blur-xs cursor-pointer transition active:scale-95"
                  >
                    Change photo
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-red-500 dark:border-red-500 hover:border-zinc-500 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-red-500 dark:text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Select photo for story
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs">
                  <PenIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <input
                    type="text"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    placeholder="Write a comment"
                    className="w-full bg-transparent py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Add location "
                    className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                  <div className="flex items-center gap-2 text-xs">
                    <Music className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <input
                      type="text"
                      value={musicInput}
                      onChange={(e) => {
                        setMusicInput(e.target.value);
                        setMusicUrl("");
                      }}
                      placeholder="Search song title..."
                      className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                    />
                    {musicInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setMusicInput("");
                          setMusicUrl("");
                          if (previewAudioRef.current) {
                            previewAudioRef.current.pause();
                          }
                          setPreviewingSongUrl(null);
                        }}
                        className="shrink-0 text-red-400 hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {musicUrl && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/15 border border-sky-400/30">
                      <Music className="w-3 h-3 text-red-500 animate-pulse shrink-0" />
                      <span className="text-[11px] text-red-700 dark:text-red-300 font-medium truncate flex-1">
                        {musicInput}
                      </span>
                      <span className="text-[10px] text-white shrink-0">
                        Playing
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 pt-0.5 max-h-28 overflow-y-auto">
                    {PRESET_SONGS.filter((s) =>
                      s.title.toLowerCase().includes(musicInput.toLowerCase()),
                    ).map((song) => {
                      const isSelected = musicUrl === song.url;
                      const isPlaying = previewingSongUrl === song.url;

                      return (
                        <button
                          key={song.title}
                          type="button"
                          onClick={() => handleSelectPresetSong(song)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer active:scale-[0.98] text-left ${
                            isSelected
                              ? "bg-red-500 text-white"
                              : "hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20" : "bg-zinc-300 dark:bg-zinc-600"}`}
                          >
                            {isPlaying ? (
                              <Pause className="w-2.5 h-2.5 fill-current" />
                            ) : (
                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            )}
                          </div>
                          <span className="truncate">{song.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
              <button
                type="button"
                onClick={closeCreator}
                className="flex-1 py-2.5 rounded-xl hover:scale-110 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShareStory}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:scale-110 text-xs font-semibold text-white shadow-md hover:opacity-95 cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{previewImage ? "Share Story" : "Choose Photo"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeStoryIndex !== null && stories.length > 0 && (
        <StoryModal
          stories={stories}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
          onDelete={handleDelete}
          onStoryView={markStoryAsViewed}
        />
      )}
    </div>
  );
}
