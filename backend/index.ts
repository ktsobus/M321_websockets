import { WebSocketServer } from "ws";
import { saveMessage, getRecentMessages, getMessagesBeforeId } from "./db";

const wss = new WebSocketServer({ port: 9000 });
console.log("✅ WebSocket server running on ws://localhost:9000");

const clients = new Map(); // Map to store ws -> username

wss.on("connection", (ws) => {
  console.log("New client connected");
  clients.set(ws, null); // Initially no username

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === 'join') {
      // Store username for this client
      clients.set(ws, data.username);
      console.log(`${data.username} joined the chat`);

      // Send message history to the joining client
      const recentMessages = getRecentMessages(100);
      const historyMsg = JSON.stringify({
        type: 'history',
        messages: recentMessages
      });
      ws.send(historyMsg);

      // Broadcast join message to all clients
      const joinMsg = JSON.stringify({
        type: 'join',
        username: data.username
      });

      clients.forEach((username, client) => {
        if (client.readyState === 1) {
          client.send(joinMsg);
        }
      });
    } else if (data.type === 'message') {
      // Save message to database
      saveMessage(data.username, data.text);

      // Broadcast regular message to all clients
      const messageData = JSON.stringify(data);
      clients.forEach((username, client) => {
        if (client.readyState === 1) {
          client.send(messageData);
        }
      });
    } else if (data.type === 'image') {
      // Validate image size (5MB limit)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      const base64Length = data.image ? data.image.length : 0;

      if (base64Length > MAX_SIZE) {
        console.log(`Image rejected: too large (${base64Length} bytes)`);
        return; // Reject oversized images
      }

      // Validate image type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.imageType)) {
        console.log(`Image rejected: invalid type (${data.imageType})`);
        return;
      }

      // Save image message to database
      saveMessage(data.username, data.text || '', data.image, data.imageType);

      // Broadcast image message to all clients
      const imageData = JSON.stringify(data);
      clients.forEach((username, client) => {
        if (client.readyState === 1) {
          client.send(imageData);
        }
      });
    } else if (data.type === 'load_more') {
      // Handle pagination request
      const beforeId = data.beforeId;
      const result = getMessagesBeforeId(beforeId, 50);

      const response = JSON.stringify({
        type: 'more_history',
        messages: result.messages,
        hasMore: result.hasMore
      });

      ws.send(response);
    }
  });

  ws.on("close", () => {
    const username = clients.get(ws);
    if (username) {
      console.log(`${username} left the chat`);

      // Broadcast leave message to remaining clients
      const leaveMsg = JSON.stringify({
        type: 'leave',
        username: username
      });

      clients.forEach((name, client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(leaveMsg);
        }
      });
    }
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

});
