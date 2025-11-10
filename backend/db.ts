import { Database } from "bun:sqlite";

// Create/open SQLite database
const db = new Database("chat.db");

// Create messages table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    image TEXT,
    imageType TEXT
  )
`);

// Migration: Add image and imageType columns if they don't exist
try {
  db.run("ALTER TABLE messages ADD COLUMN image TEXT");
  console.log("✅ Added 'image' column to messages table");
} catch (error: any) {
  // Column already exists, ignore duplicate column error
  if (!error.message.includes("duplicate column")) {
    throw error;
  }
}

try {
  db.run("ALTER TABLE messages ADD COLUMN imageType TEXT");
  console.log("✅ Added 'imageType' column to messages table");
} catch (error: any) {
  // Column already exists, ignore duplicate column error
  if (!error.message.includes("duplicate column")) {
    throw error;
  }
}

console.log("✅ Database initialized");

/**
 * Save a new message to the database
 * @param username - The user who sent the message
 * @param text - The message content
 * @param image - Optional base64 image data
 * @param imageType - Optional image MIME type
 */
export function saveMessage(
  username: string,
  text: string,
  image?: string,
  imageType?: string
): void {
  const timestamp = Date.now(); // Current time in milliseconds

  const stmt = db.prepare(
    "INSERT INTO messages (username, text, timestamp, image, imageType) VALUES (?, ?, ?, ?, ?)"
  );

  stmt.run(username, text, timestamp, image || null, imageType || null);
}

/**
 * Get the most recent messages from the database
 * @param limit - Maximum number of messages to retrieve
 * @returns Array of message objects
 */
export function getRecentMessages(limit: number = 100): Array<{
  id: number;
  username: string;
  text: string;
  timestamp: number;
  image: string | null;
  imageType: string | null;
}> {
  const stmt = db.prepare(
    "SELECT id, username, text, timestamp, image, imageType FROM messages ORDER BY timestamp DESC LIMIT ?"
  );

  const messages = stmt.all(limit) as Array<{
    id: number;
    username: string;
    text: string;
    timestamp: number;
    image: string | null;
    imageType: string | null;
  }>;

  // Reverse to get chronological order (oldest first)
  return messages.reverse();
}

/**
 * Get messages before a specific message ID (for pagination)
 * @param beforeId - Get messages with ID less than this
 * @param limit - Maximum number of messages to retrieve
 * @returns Object with messages array and hasMore flag
 */
export function getMessagesBeforeId(
  beforeId: number,
  limit: number = 50
): {
  messages: Array<{
    id: number;
    username: string;
    text: string;
    timestamp: number;
    image: string | null;
    imageType: string | null;
  }>;
  hasMore: boolean;
} {
  // Get the requested messages
  const stmt = db.prepare(
    "SELECT id, username, text, timestamp, image, imageType FROM messages WHERE id < ? ORDER BY id DESC LIMIT ?"
  );

  const messages = stmt.all(beforeId, limit) as Array<{
    id: number;
    username: string;
    text: string;
    timestamp: number;
    image: string | null;
    imageType: string | null;
  }>;

  // Check if there are more messages before the oldest one we just retrieved
  let hasMore = false;
  if (messages.length > 0) {
    const oldestId = messages[messages.length - 1].id;
    const checkStmt = db.prepare("SELECT COUNT(*) as count FROM messages WHERE id < ?");
    const result = checkStmt.get(oldestId) as { count: number };
    hasMore = result.count > 0;
  }

  // Reverse to get chronological order (oldest first)
  return {
    messages: messages.reverse(),
    hasMore,
  };
}

// Close database when process exits
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
