import { wsArcjet } from "../arcjet.js";
import { WebSocket, WebSocketServer } from "ws";
import { startScoreSimulation } from "../utils/score-simulator.js";

// So every match has its own list of subscribers.
const matchSubscribers = new Map();

function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

// global events
// Match broadcast Step 1: Broadcast to all clients
function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

// targeted events
// Match commentary Step 2: Broadcast commentary to match subscribers
function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function handleMessage(socket, data) {
  let message;
  try {
    message = JSON.parse(data.toString());
    console.log("parsed message:", message);
  } catch {
    sendJson(socket, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  function broadcastMatchUpdated(match) {
    broadcastToAll(wss, {
      type: "match_updated",
      data: match,
    });
  }

  // upgrade connection to websocket
  server.on("upgrade", async (req, socket, head) => {
    console.log("Upgrade Hit");
    console.log("🔥 UPGRADE REQUEST:", req.url);
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname !== "/ws") {
      return;
    }

    // if (wsArcjet) {
    //   try {
    //     const decision = await wsArcjet.protect(req);

    //     if (decision.isDenied()) {
    //       if (decision.reason.isRateLimit()) {
    //         socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
    //       } else {
    //         socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    //       }
    //       socket.destroy();
    //       return;
    //     }
    //   } catch (e) {
    //     console.error("WS upgrade protection error", e);
    //     socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    //     socket.destroy();
    //     return;
    //   }
    // }

    // security checks, routing, Arcjet protection
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (socket, req) => {
    // client response to server
    console.log("✅ CLIENT CONNECTED");
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    // guarantees unique values and no duplicate subscriptions
    socket.subscriptions = new Set();

    sendJson(socket, { type: "welcome" });
    console.log("WebSocket connection established");

    socket.on("message", (data) => {
      console.log("data", data);
      handleMessage(socket, data);
    });
    console.log("WebSocket message received");

    socket.on("error", () => {
      socket.terminate();
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  console.log("wss", wss.clients);

  wss.on("close", () => clearInterval(interval));

  // Match broadcast Step 2: Broadcast match created
  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  // Match commentary Step 3: Broadcast commentary to match subscribers
  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  startScoreSimulation(broadcastMatchUpdated);

  return { broadcastMatchCreated, broadcastCommentary, broadcastMatchUpdated };
}
