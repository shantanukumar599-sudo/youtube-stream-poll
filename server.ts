import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const liveChatIdCache: Record<string, { id: string, expires: number }> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Route to fetch YouTube comments or Live Chat
  app.get("/api/comments/:videoId", async (req, res) => {
    const { videoId } = req.params;
    const { pageToken } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ 
        ok: false,
        error: "Configuration Error",
        details: "YOUTUBE_API_KEY is not configured in environment variables.",
        reason: "missing_api_key"
      });
    }

    try {
      let liveChatId = null;
      let isLive = false;

      // Check cache first
      const cached = liveChatIdCache[videoId];
      if (cached && cached.expires > Date.now()) {
        liveChatId = cached.id;
        isLive = true;
      } else {
        // 1. Check video status to decide between Live Chat and Comments
        const videoResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos`,
          {
            params: {
              part: "liveStreamingDetails,snippet",
              id: videoId,
              key: apiKey,
            },
          }
        );

        const videoItem = videoResponse.data.items?.[0];
        if (!videoItem) {
          throw new Error("Video not found");
        }

        liveChatId = videoItem?.liveStreamingDetails?.activeLiveChatId;
        isLive = videoItem?.snippet?.liveBroadcastContent === "live";

        if (liveChatId && isLive) {
          // Cache for 5 minutes
          liveChatIdCache[videoId] = { id: liveChatId, expires: Date.now() + 5 * 60 * 1000 };
        }
      }

      if (liveChatId && isLive) {
        console.log(`Using Live Chat ID: ${liveChatId}`);
        // 2. Fetch live chat messages with nextPageToken support
        const chatParams: any = {
          liveChatId: liveChatId,
          part: "snippet,authorDetails",
          maxResults: 200,
          key: apiKey,
        };
        if (pageToken) chatParams.pageToken = pageToken;

        const chatResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/liveChat/messages`,
          { params: chatParams }
        );

        const chatMessages = chatResponse.data.items.map((item: any) => ({
          id: item.id,
          name: item.authorDetails.displayName,
          message: item.snippet.displayMessage,
          timestamp: new Date(item.snippet.publishedAt).getTime(),
        }));

        return res.json({
          messages: chatMessages,
          nextPageToken: chatResponse.data.nextPageToken,
          pollingInterval: chatResponse.data.pollingIntervalMillis || 2000,
          type: "liveChat"
        });
      } else {
        // 3. Fetch regular comment threads
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/commentThreads`,
          {
            params: {
              part: "snippet",
              videoId: videoId,
              maxResults: 100,
              order: "time",
              key: apiKey,
            },
          }
        );

        const comments = response.data.items.map((item: any) => ({
          id: item.id,
          name: item.snippet.topLevelComment.snippet.authorDisplayName,
          message: item.snippet.topLevelComment.snippet.textDisplay,
          timestamp: new Date(item.snippet.topLevelComment.snippet.publishedAt).getTime(),
        }));

        return res.json({
          messages: comments,
          type: "comments"
        });
      }
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      
      console.error(`YouTube API Error (${status}):`, JSON.stringify(errorData, null, 2) || error.message);
      
      let details = errorData?.error?.message || error.message;
      if (typeof details === 'string') {
        details = details.replace(/<[^>]*>?/gm, '');
      }

      let reason = errorData?.error?.errors?.[0]?.reason || "unknown";
      
      // Double check for quotaExceeded in message if reason is unknown
      if (reason === "unknown" && details.toLowerCase().includes("quota exceeded")) {
        reason = "quotaExceeded";
      }

      res.status(200).json({
        ok: false,
        error: "YouTube API Request Failed",
        status: status,
        details: details,
        reason: reason
      });
    }
  });

  // Fallback for unmatched API routes to prevent HTML response
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
