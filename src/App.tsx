/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Trophy, 
  Play, 
  Square, 
  RefreshCcw, 
  MessageSquare, 
  BarChart3, 
  Users, 
  CheckCircle2,
  AlertCircle,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---

interface Message {
  id: string;
  name: string;
  message: string;
  timestamp: number;
  isSimulated?: boolean;
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

// --- Components ---

function PollSystem({ messages, isFloating, onPollStateChange, quotaExceeded }: { messages: Message[], isFloating?: boolean, onPollStateChange: (active: boolean) => void, quotaExceeded?: boolean }) {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [pollActive, setPollActive] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [pollStartTime, setPollStartTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Start Poll
  const startPoll = () => {
    setResponses({});
    setCorrectAnswer(null);
    setPollStartTime(Date.now());
    setPollActive(true);
    onPollStateChange(true);
    setError(null);
  };

  // Automatically process messages in real-time
  useEffect(() => {
    if (pollActive) {
      const tempResponses: Record<string, string> = {};
      
      // Process messages from newest to oldest to ensure we get the first response per user
      // but since we want the *first* response in the poll, we should go from oldest to newest
      // and only count messages after pollStartTime
      [...messages].reverse().forEach((msg) => {
        if (msg.timestamp >= pollStartTime) {
          const answer = msg.message.trim().toUpperCase();
          const user = msg.name;

          if (["A", "B", "C", "D"].includes(answer)) {
            if (!tempResponses[user]) {
              tempResponses[user] = answer;
            }
          }
        }
      });

      setResponses(tempResponses);
    }
  }, [messages, pollActive, pollStartTime]);

  // End Poll
  const endPoll = () => {
    if (!correctAnswer) {
      setError("Please select the correct answer before ending.");
      return;
    }

    const updatedLeaderboard = { ...leaderboard };

    Object.entries(responses).forEach(([user, answer]) => {
      if (answer === correctAnswer) {
        updatedLeaderboard[user] = (updatedLeaderboard[user] || 0) + 1;
      }
    });

    setLeaderboard(updatedLeaderboard);
    setPollActive(false);
    onPollStateChange(false);
    setCurrentQuestion((prev) => prev + 1);
    setError(null);
  };

  const responseCounts = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    Object.values(responses).forEach((val: string) => {
      if (counts[val] !== undefined) counts[val]++;
    });
    return counts;
  }, [responses]);

  const totalResponses = Object.keys(responses).length;

  return (
    <div className={`hardware-panel flex flex-col h-full transition-all duration-300 ${isFloating ? "p-4 gap-4 bg-hardware-card/80 backdrop-blur-xl border-hardware-accent/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "p-6 gap-6"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${pollActive ? "bg-hardware-danger animate-pulse" : "bg-hardware-text-muted"}`} />
          <h2 className={`${isFloating ? "text-base" : "text-xl"} font-bold tracking-tight uppercase`}>POLL <span className="text-hardware-accent">#{currentQuestion}</span></h2>
        </div>
        {quotaExceeded && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-hardware-danger/20 border border-hardware-danger text-hardware-danger text-[8px] font-mono animate-pulse">
            <AlertCircle size={10} />
            QUOTA EXCEEDED: SIMULATOR ACTIVE
            <button 
              onClick={() => window.location.reload()} 
              className="ml-2 underline hover:text-white"
            >
              RETRY
            </button>
          </div>
        )}
        <div className="lcd-display flex items-center gap-2 scale-90 origin-right">
          <Users size={14} className="text-hardware-accent" />
          <span>{totalResponses}</span>
        </div>
      </div>

      {/* Options Selection */}
      <div className={isFloating ? "space-y-2" : "space-y-3"}>
        {!isFloating && <label className="text-[10px] font-mono text-hardware-text-muted uppercase tracking-widest">Select Correct Key</label>}
        <div className="grid grid-cols-4 gap-2">
          {["A", "B", "C", "D"].map((opt) => (
            <button
              key={opt}
              onClick={() => setCorrectAnswer(opt)}
              className={`hardware-btn rounded-lg border-2 flex flex-col items-center justify-center gap-1 font-mono font-bold
                ${isFloating ? "h-12 text-base" : "h-16 text-lg"}
                ${correctAnswer === opt 
                  ? "bg-hardware-success/20 border-hardware-success text-hardware-success glow-success" 
                  : "bg-hardware-bg border-hardware-border text-hardware-text-muted hover:border-hardware-accent/50 hover:text-white"
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-2">
        {!pollActive ? (
          <button
            onClick={startPoll}
            className={`hardware-btn w-full bg-hardware-accent hover:bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 glow-accent ${isFloating ? "p-2 text-xs" : "p-3"}`}
          >
            <Play size={isFloating ? 14 : 18} fill="currentColor" />
            START POLL
          </button>
        ) : (
          <button
            onClick={endPoll}
            className={`hardware-btn w-full bg-hardware-danger hover:bg-red-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 ${isFloating ? "p-2 text-xs" : "p-3"}`}
          >
            <Square size={isFloating ? 14 : 18} fill="currentColor" />
            END POLL SESSION
          </button>
        )}
      </div>

      {/* Live Stats */}
      <div className="flex-1 space-y-3">
        <div className="space-y-3">
          {Object.entries(responseCounts).map(([key, count]: [string, number]) => {
            const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={correctAnswer === key ? "text-hardware-success font-bold" : "text-white"}>
                    {key} {correctAnswer === key && "✓"}
                  </span>
                  <span className="text-hardware-text-muted">{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-black rounded-full overflow-hidden border border-hardware-border/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={`h-full ${correctAnswer === key ? "bg-hardware-success" : "bg-hardware-accent"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Mini (Hidden in Floating Mode if too small) */}
      {!isFloating && (
        <div className="pt-4 border-t border-hardware-border">
          <h3 className="text-xs font-mono text-hardware-text-muted uppercase tracking-widest flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-hardware-warning" />
            Top Performers
          </h3>
          <div className="space-y-2">
            {Object.entries(leaderboard).length === 0 ? (
              <div className="text-[10px] text-hardware-text-muted italic text-center py-2">No data recorded yet</div>
            ) : (
              Object.entries(leaderboard)
                .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                .slice(0, 3)
                .map(([user, score], i) => (
                  <div key={user} className="flex items-center justify-between bg-black/20 p-2 rounded border border-hardware-border/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-hardware-text-muted">0{i + 1}</span>
                      <span className="text-xs font-medium">{user}</span>
                    </div>
                    <span className="text-xs font-mono text-hardware-accent font-bold">{score} PTS</span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatSimulator({ onNewMessage, autoSimulate, setAutoSimulate }: { onNewMessage: (msg: Message) => void, autoSimulate: boolean, setAutoSimulate: (val: boolean) => void }) {
  const names = [
    "TechGuru99", "GamingPro_YT", "StudyWithMe_Live", "Rahul_Vlogs", "Priya_Official", 
    "CryptoKing", "MusicLover_01", "FitnessFreak", "Chef_Special", "TravelBug",
    "CodeMaster", "DailyNews_Live", "MovieBuff", "ArtisticSoul", "GadgetReviewer"
  ];
  const options = ["A", "B", "C", "D", "A", "B", "C", "D", "What?", "Hello!"];

  const sendRandomMessage = () => {
    const nameIndex = Math.floor(Math.random() * names.length);
    const optionIndex = Math.floor(Math.random() * options.length);
    const name = names[nameIndex];
    const message = options[optionIndex];
    onNewMessage({
      id: Math.random().toString(36).substring(2, 11),
      name,
      message,
      timestamp: Date.now(),
      isSimulated: true
    });
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (autoSimulate) {
      interval = setInterval(sendRandomMessage, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoSimulate]);

  return (
    <div className="hardware-panel p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-hardware-text-muted uppercase tracking-widest flex items-center gap-2">
          <Zap size={14} className="text-hardware-warning" />
          Chat Simulator
        </h3>
        <button 
          onClick={() => setAutoSimulate(!autoSimulate)}
          className={`text-[10px] font-mono px-2 py-1 rounded border ${autoSimulate ? "bg-hardware-success/20 border-hardware-success text-hardware-success" : "bg-hardware-bg border-hardware-border text-hardware-text-muted"}`}
        >
          {autoSimulate ? "AUTO: ON" : "AUTO: OFF"}
        </button>
      </div>
      <button 
        onClick={sendRandomMessage}
        className="hardware-btn bg-hardware-bg border border-hardware-border hover:border-hardware-accent p-2 rounded text-xs font-medium flex items-center justify-center gap-2"
      >
        <MessageSquare size={14} />
        INJECT RANDOM MESSAGE
      </button>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isFloating, setIsFloating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const nextPageTokenRef = useRef<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState(2000);
  const pollingIntervalRef = useRef(2000);
  const [isPaused, setIsPaused] = useState(false);
  const [quotaSaver, setQuotaSaver] = useState(true);
  const [isPollRunning, setIsPollRunning] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Sync refs with state
  useEffect(() => {
    pollingIntervalRef.current = pollingInterval;
  }, [pollingInterval]);

  const addMessage = (msg: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === msg.id)) return prev;
      return [msg, ...prev].slice(0, 50);
    });
  };

  const extractVideoId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url;
  };

  const videoId = useMemo(() => extractVideoId(youtubeUrl), [youtubeUrl]);

  // Fetch YouTube comments periodically
  useEffect(() => {
    if (!videoId || videoId.length !== 11 || isPaused || quotaExceeded) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchComments = async () => {
      // Don't fetch if tab is hidden to save quota
      if (document.visibilityState === "hidden") {
        timeoutId = setTimeout(fetchComments, 10000);
        return;
      }

      setIsFetching(true);
      try {
        const url = `/api/comments/${videoId}${nextPageTokenRef.current ? `?pageToken=${nextPageTokenRef.current}` : ""}`;
        const response = await fetch(url);
        
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Non-JSON response received:", text.substring(0, 100));
          throw new Error(`Server returned non-JSON response (${response.status}). Please check if the server is running correctly.`);
        }

        const data = await response.json();
        
        if (!response.ok || data.ok === false) {
          if (data.reason === "quotaExceeded") {
            setQuotaExceeded(true);
            setAutoSimulate(true);
            setApiError(null); 
            return;
          }
          
          let errorMessage = data.details || data.error || "Failed to fetch comments";
          const reason = data.reason ? ` (Reason: ${data.reason})` : "";
          const status = data.status ? ` [Status: ${data.status}]` : "";
          
          if (data.reason === "commentsDisabled") {
            errorMessage = "This YouTube video has comments disabled. Please use a video with public comments enabled.";
          } else if (data.reason === "rateLimitExceeded") {
            errorMessage = "Polling too fast. Adjusting to YouTube's recommended speed...";
            const newInterval = Math.min(pollingIntervalRef.current + 3000, 15000);
            setPollingInterval(newInterval);
          }
          
          throw new Error(`${errorMessage}${reason}${status}`);
        }

        if (data.messages && Array.isArray(data.messages)) {
          data.messages.forEach((comment: Message) => addMessage(comment));
          setApiError(null);
          
          // Update nextPageToken for live chat to get only new messages next time
          if (data.type === "liveChat") {
            if (data.nextPageToken) {
              nextPageTokenRef.current = data.nextPageToken;
            }
            
            // Respect YouTube's recommended polling interval, but also consider poll state
            const recommended = data.pollingInterval || 2000;
            if (isPollRunning) {
              setPollingInterval(recommended);
            } else {
              // AGGRESSIVE QUOTA SAVING: Poll very slowly when no poll is active
              // 60 seconds if Quota Saver is ON, otherwise 20 seconds
              setPollingInterval(quotaSaver ? 60000 : 20000);
            }
          } else {
            // For regular comments, poll much slower to save quota
            setPollingInterval(isPollRunning ? 10000 : 60000);
          }
        } else if (Array.isArray(data)) {
          // Fallback for old API format
          data.forEach((comment: Message) => addMessage(comment));
          setApiError(null);
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setApiError(err.message);
      } finally {
        setIsFetching(false);
        // Schedule next fetch based on dynamic interval
        if (!isPaused && !quotaExceeded) {
          timeoutId = setTimeout(fetchComments, pollingIntervalRef.current);
        }
      }
    };

    fetchComments();

    // Listen for visibility changes to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // We don't call fetchComments() here because it's already in a timeout loop
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      nextPageTokenRef.current = null; // Reset token when videoId changes
    };
  }, [videoId, isPaused, isPollRunning, quotaExceeded, quotaSaver]);

  return (
    <div className={`min-h-screen transition-all duration-500 ${isFloating ? "p-0 bg-transparent" : "p-4 md:p-8 bg-hardware-bg"}`}>
      {!isFloating && (
        <header className="w-full flex flex-col items-center gap-2 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-hardware-accent/10 border border-hardware-accent/20 text-hardware-accent text-[10px] font-mono uppercase tracking-[0.2em]"
          >
            <Zap size={12} />
            Professional Broadcast Tools
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-center">
            STREAMPOLL <span className="text-hardware-accent">PRO</span>
          </h1>
          
          <div className="mt-6 w-full max-w-xl hardware-panel p-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-3 px-3">
                <MessageSquare size={18} className="text-hardware-accent" />
                <input 
                  type="text" 
                  placeholder="Enter YouTube Video URL or ID..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full font-mono"
                />
              </div>
              <button 
                onClick={() => setIsFloating(true)}
                className="hardware-btn bg-hardware-accent px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
              >
                <Zap size={14} />
                GO FLOATING
              </button>
            </div>
            {apiError && !quotaExceeded && (
              <div className="px-3 py-1 text-[10px] text-hardware-danger font-mono flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <AlertCircle size={10} />
                  {apiError}
                </div>
              </div>
            )}
            {quotaExceeded && (
              <div className="px-3 py-2 text-[10px] bg-hardware-warning/10 border border-hardware-warning/20 rounded font-mono flex flex-col gap-1">
                <div className="flex items-center gap-2 text-hardware-warning">
                  <Zap size={12} className="animate-pulse" />
                  <span>YOUTUBE QUOTA EXCEEDED: EMERGENCY SIMULATOR ACTIVE</span>
                </div>
                <p className="text-hardware-text-muted mt-1 leading-relaxed text-[9px]">
                  Daily API limit reached. The app is now generating simulated messages based on your poll options so you can continue testing.
                </p>
              </div>
            )}
          </div>
        </header>
      )}

      <main className={`mx-auto transition-all duration-500 ${isFloating ? "fixed bottom-4 right-4 w-[380px] z-50" : "max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"}`}>
        {isFloating && (
          <div className="absolute -top-10 right-0 flex gap-2">
            <button 
              onClick={() => setIsFloating(false)}
              className="bg-hardware-card border border-hardware-border p-2 rounded-full text-white hover:bg-hardware-accent transition-colors"
              title="Exit Floating Mode"
            >
              <RefreshCcw size={16} />
            </button>
          </div>
        )}

        {/* Left Column: Chat Feed (Hidden in Floating Mode) */}
        {!isFloating && (
          <div className="lg:col-span-4 space-y-6 h-full">
            <div className="hardware-panel flex flex-col h-[500px]">
              <div className="p-4 border-b border-hardware-border flex items-center justify-between">
                <h3 className="text-xs font-mono text-hardware-text-muted uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={14} />
                  Live Chat Feed
                </h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setQuotaSaver(!quotaSaver)}
                    className={`text-[8px] font-mono px-2 py-1 rounded border transition-colors ${quotaSaver ? "bg-hardware-success/10 border-hardware-success/30 text-hardware-success" : "bg-hardware-bg border-hardware-border text-hardware-text-muted"}`}
                    title="Saves API quota by polling slower when idle"
                  >
                    QUOTA SAVER: {quotaSaver ? "ON" : "OFF"}
                  </button>
                  <button 
                    onClick={() => setIsPaused(!isPaused)}
                    className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${isPaused ? "bg-hardware-warning/20 border-hardware-warning text-hardware-warning" : "bg-hardware-bg border-hardware-border text-hardware-text-muted hover:border-hardware-accent"}`}
                  >
                    {isPaused ? "RESUME" : "PAUSE"}
                  </button>
                  <div className="flex items-center gap-2">
                    {(isFetching || autoSimulate) && (
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${autoSimulate ? "bg-hardware-warning" : "bg-hardware-accent"}`} />
                    )}
                    <span className={`text-[10px] font-mono ${apiError ? "text-hardware-danger" : "text-hardware-success"}`}>
                      {quotaExceeded ? "QUOTA EXCEEDED" : (videoId && videoId.length === 11 ? `YOUTUBE: ${videoId}` : "SIMULATOR")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2"
                    >
                      <span className="text-hardware-accent font-bold shrink-0">
                        {msg.name}:
                        {msg.isSimulated && <span className="ml-1 text-[8px] opacity-50 font-normal">[SIM]</span>}
                      </span>
                      <span className="text-hardware-text-muted break-all" dangerouslySetInnerHTML={{ __html: msg.message }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-hardware-text-muted gap-2 opacity-50">
                    <MessageSquare size={32} strokeWidth={1} />
                    <p>Waiting for messages...</p>
                  </div>
                )}
              </div>
            </div>
            
            <ChatSimulator 
              onNewMessage={addMessage} 
              autoSimulate={autoSimulate} 
              setAutoSimulate={setAutoSimulate} 
            />
          </div>
        )}

        <div className={`${isFloating ? "w-full" : "lg:col-span-8"} h-full`}>
          <PollSystem 
            messages={messages} 
            isFloating={isFloating} 
            onPollStateChange={setIsPollRunning}
            quotaExceeded={quotaExceeded}
          />
        </div>
      </main>

      {!isFloating && (
        <footer className="w-full mt-12 pt-8 border-t border-hardware-border/30 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-hardware-text-muted uppercase tracking-widest max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <span>SYSTEM STATUS: {quotaExceeded ? "QUOTA EXCEEDED (LIMIT REACHED)" : "OPTIMAL"}</span>
            <span className={`w-1 h-1 rounded-full ${quotaExceeded ? "bg-hardware-danger" : "bg-hardware-success"}`} />
            <span>SOURCE: {quotaExceeded ? "EMERGENCY SIMULATOR" : (videoId ? "YOUTUBE LIVE API" : "INTERNAL SIMULATOR")}</span>
          </div>
          <div>© 2026 STREAMPOLL TECHNOLOGIES INC.</div>
        </footer>
      )}
    </div>
  );
}

