import "dotenv/config";
import http from "http";
import express from "express";
import { securityMiddleware } from "./arcjet.js";
import { attachWebSocketServer } from "./ws/server.js";
import { matchRouter } from "./routes/matches.route.js";
import { commentaryRouter } from "./routes/commentary.route.js";

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

// app.use(securityMiddleware());

app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log("host", HOST);
  console.log(`Server running at ${baseUrl}`);
  console.log(
    `WebSocket server running at ${baseUrl.replace("http", "ws")}/ws`,
  );
});
