import { WebSocketServer } from "ws";

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
      // Broadcast regular message to all clients
      const messageData = JSON.stringify(data);
      clients.forEach((username, client) => {
        if (client.readyState === 1) {
          client.send(messageData);
        }
      });
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
