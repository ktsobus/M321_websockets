<template>
  <div class="app-wrapper">
    <Aurora
      :colorStops="auroraConfig.colorStops"
      :amplitude="auroraConfig.amplitude"
      :blend="auroraConfig.blend"
      :speed="auroraConfig.speed"
      :intensity="auroraConfig.intensity"
      class="aurora-background"
    />
    <div class="container">
      <h1>WebSocket Chat</h1>
      <h2>Status: {{ status }}</h2>

      <div v-if="!username" class="name-prompt">
        <input
          v-model="nameInput"
          @keyup.enter="setUsername"
          placeholder="Enter your name..."
          class="input"
        />
        <button @click="setUsername" class="button">Join Chat</button>
      </div>

      <div v-else>
        <div class="current-user">
          Chatting as: {{ username }}
        </div>

        <div class="chat-box" ref="chatBoxRef" @scroll="handleScroll">
          <div v-if="isLoadingMore" class="loading-indicator">Loading older messages...</div>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="{
              'system-message': msg.type === 'system',
              message: msg.type === 'message' && !msg.isOwn,
              'message-own': msg.type === 'message' && msg.isOwn,
            }"
          >
            <template v-if="msg.type === 'message' && msg.timestamp">
              <!-- Own messages: only timestamp -->
              <template v-if="msg.isOwn">
                <div class="message-header-own">
                  <span class="message-timestamp">{{ formatTimestamp(msg.timestamp) }}</span>
                </div>
                <div class="message-text">{{ msg.text }}</div>
              </template>
              <!-- Other messages: username and timestamp -->
              <template v-else>
                <div class="message-header">
                  <span class="message-username">{{ msg.username }}</span>
                  <span class="message-timestamp">{{ formatTimestamp(msg.timestamp) }}</span>
                </div>
                <div class="message-text">{{ msg.text }}</div>
              </template>
            </template>
            <template v-else>
              {{ msg.text }}
            </template>
          </div>

          <!-- New Message Notification Button -->
          <button
            v-if="newMessageCount > 0"
            class="new-message-button"
            @click="scrollToBottom(true); newMessageCount = 0"
          >
            {{ newMessageCount === 1 ? 'New message' : `${newMessageCount} new messages` }}
          </button>
        </div>

        <input
          v-model="input"
          @keyup.enter="sendMessage"
          placeholder="Type a message..."
          class="input"
        />
        <button @click="sendMessage" class="button">Send</button>
      </div>
    </div>

    <!-- Leave Button (Bottom Left) -->
    <button v-if="username" class="button-leave" @click="leaveChat">
      Leave
    </button>

    <!-- Theme Selector Button (Bottom Right) -->
    <button class="theme-indicator" @click="showThemeSelector = true">
      {{ currentTheme.displayName }}
    </button>

    <!-- Theme Selector Modal -->
    <div v-if="showThemeSelector" class="theme-modal-overlay" @click="showThemeSelector = false">
      <div class="theme-modal" @click.stop>
        <h3>Choose Theme</h3>
        <div class="theme-options">
          <button
            v-for="theme in Object.values(themes)"
            :key="theme.name"
            class="theme-option"
            :class="{ active: theme.name === currentThemeName }"
            @click="setTheme(theme.name)"
          >
            <div class="theme-preview" :style="{ backgroundColor: theme.colors.primary }"></div>
            <span>{{ theme.displayName }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Aurora from './components/Aurora.vue'
import { themes, defaultTheme, type Theme } from './themes'

interface Message {
  type: 'message' | 'system'
  text: string
  isOwn?: boolean
  id?: number
  timestamp?: number
  username?: string
}

const messages = ref<Message[]>([])
const input = ref('')
const username = ref('')
const nameInput = ref('')
var status = ref('Disconnected')
let ws: WebSocket

// Pagination state
const chatBoxRef = ref<HTMLDivElement | null>(null)
const isLoadingMore = ref(false)
const hasMoreMessages = ref(true)
const oldestMessageId = ref<number | null>(null)

// Auto-scroll and notification state
const isScrolledUp = ref(false)
const newMessageCount = ref(0)

// Theme management
const currentThemeName = ref(localStorage.getItem('theme') || defaultTheme)
const showThemeSelector = ref(false)

const currentTheme = computed(() => themes[currentThemeName.value])
const auroraConfig = computed(() => currentTheme.value.aurora)

function setTheme(themeName: string) {
  currentThemeName.value = themeName
  localStorage.setItem('theme', themeName)
  applyTheme(themes[themeName])
  showThemeSelector.value = false
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.colors.primary)
  root.style.setProperty('--color-primary-light', theme.colors.primaryLight)
  root.style.setProperty('--color-primary-dark', theme.colors.primaryDark)
  root.style.setProperty('--color-bg-dark', theme.colors.bgDark)
  root.style.setProperty('--color-bg-semi-transparent', theme.colors.bgSemiTransparent)
  root.style.setProperty('--color-bg-transparent', theme.colors.bgTransparent)
  root.style.setProperty('--color-text-primary', theme.colors.textPrimary)
  root.style.setProperty('--color-text-secondary', theme.colors.textSecondary)
  root.style.setProperty('--color-text-muted', theme.colors.textMuted)
  root.style.setProperty('--color-border-primary', theme.colors.borderPrimary)
  root.style.setProperty('--color-border-light', theme.colors.borderLight)
  root.style.setProperty('--color-message-other', theme.colors.messageOther)
  root.style.setProperty('--color-message-own', theme.colors.messageOwn)
  root.style.setProperty('--color-message-border', theme.colors.messageBorder)
  root.style.setProperty('--color-message-own-border', theme.colors.messageOwnBorder)
  root.style.setProperty('--color-button-bg', theme.colors.buttonBg)
  root.style.setProperty('--color-button-hover-bg', theme.colors.buttonHoverBg)
  root.style.setProperty('--color-button-border', theme.colors.buttonBorder)
  root.style.setProperty('--color-leave-bg', theme.colors.leaveBg)
  root.style.setProperty('--color-leave-hover-bg', theme.colors.leaveHoverBg)
  root.style.setProperty('--color-leave-border', theme.colors.leaveBorder)
  root.style.setProperty('--color-leave-hover-border', theme.colors.leaveHoverBorder)
  root.style.setProperty('--color-leave-text', theme.colors.leaveText)
  root.style.setProperty('--color-leave-hover-text', theme.colors.leaveHoverText)
}

// Format timestamp: relative for recent (<24h), absolute for older
function formatTimestamp(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  // If less than 24 hours, show relative time
  if (hours < 24) {
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours === 1) return '1 hour ago'
    return `${hours} hours ago`
  }

  // Otherwise show absolute time
  const date = new Date(timestamp)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')

  return `${month} ${day}, ${hour}:${minute}`
}

// Check if chat box is scrolled to bottom (within 50px threshold)
function isAtBottom(): boolean {
  const chatBox = chatBoxRef.value
  if (!chatBox) return false

  const threshold = 50
  const position = chatBox.scrollTop + chatBox.clientHeight
  const bottom = chatBox.scrollHeight

  return position >= bottom - threshold
}

// Scroll chat box to bottom
function scrollToBottom(smooth: boolean = false) {
  const chatBox = chatBoxRef.value
  if (!chatBox) return

  if (smooth) {
    chatBox.scrollTo({
      top: chatBox.scrollHeight,
      behavior: 'smooth'
    })
  } else {
    chatBox.scrollTop = chatBox.scrollHeight
  }
}

onMounted(() => {
  applyTheme(currentTheme.value)
  connect()
})

function connect() {
  ws = new WebSocket('ws://localhost:9000')

  ws.onopen = () => {
    console.log('Connected to server')
    status.value = 'Connected'
  }
  ws.onmessage = async (event) => {
    const text = typeof event.data === 'string' ? event.data : await event.data.text()
    const data = JSON.parse(text)

    if (data.type === 'history') {
      // Load historical messages
      data.messages.forEach((msg: { id: number; username: string; text: string; timestamp: number }) => {
        messages.value.push({
          type: 'message',
          text: msg.text,
          isOwn: msg.username === username.value,
          id: msg.id,
          timestamp: msg.timestamp,
          username: msg.username,
        })
      })

      // Track oldest message ID for pagination
      if (data.messages.length > 0) {
        oldestMessageId.value = data.messages[0].id
      }

      // Scroll to bottom after initial history loads
      setTimeout(() => {
        scrollToBottom(false)
      }, 50)
    } else if (data.type === 'more_history') {
      // Handle pagination response
      const chatBox = chatBoxRef.value
      const oldScrollHeight = chatBox?.scrollHeight || 0

      // Prepend older messages to the beginning of the array
      const olderMessages = data.messages.map((msg: { id: number; username: string; text: string; timestamp: number }) => ({
        type: 'message' as const,
        text: msg.text,
        isOwn: msg.username === username.value,
        id: msg.id,
        timestamp: msg.timestamp,
        username: msg.username,
      }))

      messages.value = [...olderMessages, ...messages.value]

      // Update oldest message ID and hasMore flag
      if (data.messages.length > 0) {
        oldestMessageId.value = data.messages[0].id
      }
      hasMoreMessages.value = data.hasMore

      // Restore scroll position after prepending
      setTimeout(() => {
        if (chatBox) {
          const newScrollHeight = chatBox.scrollHeight
          chatBox.scrollTop = newScrollHeight - oldScrollHeight
        }
        isLoadingMore.value = false
      }, 10)
    } else if (data.type === 'join') {
      messages.value.push({
        type: 'system',
        text: `${data.username} joined the chat`,
      })
    } else if (data.type === 'leave') {
      messages.value.push({
        type: 'system',
        text: `${data.username} left the chat`,
      })
    } else if (data.type === 'message') {
      // Real-time message - add current timestamp
      const wasAtBottom = isAtBottom()

      messages.value.push({
        type: 'message',
        text: data.text,
        isOwn: data.username === username.value,
        timestamp: Date.now(),
        username: data.username,
      })

      // Auto-scroll if we were at bottom, otherwise increment counter
      if (wasAtBottom) {
        setTimeout(() => {
          scrollToBottom(false)
        }, 10)
      } else {
        // User is scrolled up, increment new message counter
        newMessageCount.value++
      }
    }
  }
  ws.onclose = () => {
    console.log('Disconnected. Reconnecting...')
    status.value = 'Disconnected'
    setTimeout(connect, 1000)
  }
}

// Handle scroll to detect when user scrolls to top or reaches bottom
function handleScroll() {
  const chatBox = chatBoxRef.value
  if (!chatBox) return

  // Check if user scrolled back to bottom
  if (isAtBottom()) {
    isScrolledUp.value = false
    newMessageCount.value = 0 // Reset counter when at bottom
  } else {
    isScrolledUp.value = true
  }

  // If scrolled near the top (within 50px) and not already loading
  if (chatBox.scrollTop < 50 && !isLoadingMore.value && hasMoreMessages.value) {
    loadMoreMessages()
  }
}

// Load older messages
function loadMoreMessages() {
  if (!oldestMessageId.value || isLoadingMore.value || !hasMoreMessages.value) return

  isLoadingMore.value = true

  // Request older messages
  ws.send(
    JSON.stringify({
      type: 'load_more',
      beforeId: oldestMessageId.value,
    }),
  )

  // The response will be handled in onmessage ('more_history' type)
  // Scroll position will be restored there
}

const setUsername = () => {
  const name = nameInput.value.trim()
  if (!name) return
  username.value = name

  // Send join message to server
  ws.send(
    JSON.stringify({
      type: 'join',
      username: name,
    }),
  )
}

const sendMessage = () => {
  const text = input.value.trim()
  if (!text) return

  ws.send(
    JSON.stringify({
      type: 'message',
      username: username.value,
      text: text,
    }),
  )
  input.value = ''
}

const leaveChat = () => {
  // Close the WebSocket connection (will trigger leave message on server)
  ws.close()

  // Reset state
  username.value = ''
  nameInput.value = ''
  messages.value = []
  input.value = ''
}
</script>

<style scoped>
.app-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.aurora-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.container {
  max-width: 800px;
  width: 90%;
  margin: 40px auto;
  font-family: var(--font-body);
  text-align: center;
  position: relative;
  z-index: 1;
}

h1 {
  color: var(--color-text-primary);
  font-family: var(--font-title);
}

h2 {
  color: var(--color-text-secondary);
  font-size: 1.2rem;
  font-family: var(--font-title);
  font-weight: 100;
}

h3 {
  font-family: var(--font-title);
  font-weight: 100;
}

.name-prompt {
  margin-top: 20px;
}

.current-user {
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  text-align: center;
}

.chat-box {
  background: var(--color-bg-semi-transparent);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  height: 60vh;
  overflow-y: auto;
  margin-bottom: 10px;
  padding: 10px;
  text-align: left;
  backdrop-filter: blur(10px);
  position: relative;
  scrollbar-width: thin; /* Firefox - thin scrollbar */
  scrollbar-color: var(--color-primary) transparent; /* Firefox - thumb and track colors */
}

/* Custom scrollbar for Chrome, Safari and Opera */
.chat-box::-webkit-scrollbar {
  width: 6px;
}

.chat-box::-webkit-scrollbar-track {
  background: transparent;
}

.chat-box::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 3px;
  opacity: 0.7;
}

.chat-box::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-light);
}

.input {
  width: calc(100% - 90px);
  padding: 8px;
  background: var(--color-bg-transparent);
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  outline: none;
}

.input::placeholder {
  color: var(--color-text-muted);
}

.input:focus {
  border-color: var(--color-primary);
}

.button {
  padding: 8px 12px;
  margin-left: 5px;
  background: var(--color-button-bg);
  border: 1px solid var(--color-button-border);
  border-radius: 4px;
  color: var(--color-button-border);
  font-family: var(--font-body);
  cursor: pointer;
}

.button:hover {
  background: var(--color-button-hover-bg);
}

.button-leave {
  position: fixed;
  bottom: 16px;
  left: 16px;
  padding: 6px 12px;
  background: var(--color-leave-bg);
  border: 1px solid var(--color-leave-border);
  border-radius: 4px;
  color: var(--color-leave-text);
  font-family: var(--font-body);
  cursor: pointer;
  font-size: 0.85rem;
  z-index: 100;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.button-leave:hover {
  background: var(--color-leave-hover-bg);
  border-color: var(--color-leave-hover-border);
  color: var(--color-leave-hover-text);
}

.message {
  margin-bottom: 8px;
  color: var(--color-text-primary);
  background: var(--color-message-other);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--color-message-border);
  font-family: var(--font-body);
  max-width: 70%;
  margin-right: auto;
}

.message-own {
  margin-bottom: 8px;
  color: var(--color-text-primary);
  background: var(--color-message-own);
  padding: 8px 12px;
  border-radius: 4px;
  border-right: 3px solid var(--color-message-own-border);
  border-left: none;
  font-family: var(--font-body);
  max-width: 70%;
  margin-left: auto;
  text-align: right;
}

.system-message {
  margin-bottom: 4px;
  color: var(--color-text-secondary);
  font-style: italic;
  text-align: center;
  opacity: 0.8;
  font-family: var(--font-body);
}

.loading-indicator {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  padding: 8px;
  font-style: italic;
  opacity: 0.7;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.message-header-own {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 2px;
}

.message-username {
  font-weight: bold;
  font-size: 0.9rem;
}

.message-timestamp {
  font-size: 0.75rem;
  opacity: 0.7;
}

.message-username::after {
  content: '•';
  margin-left: 8px;
  opacity: 0.5;
}

.message-text {
  font-size: 0.95rem;
}

.new-message-button {
  position: sticky;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: var(--color-bg-semi-transparent);
  border: 1px solid var(--color-border-primary);
  border-radius: 20px;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  z-index: 10;
  margin-top: auto;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.new-message-button:hover {
  background: var(--color-button-bg);
  border-color: var(--color-primary);
  transform: translateX(-50%) scale(1.05);
}

/* Theme Indicator Button */
.theme-indicator {
  position: fixed;
  bottom: 16px;
  right: 16px;
  padding: 6px 12px;
  background: var(--color-bg-semi-transparent);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  z-index: 100;
  transition: all 0.2s;
}

.theme-indicator:hover {
  background: var(--color-button-bg);
  border-color: var(--color-primary);
}

/* Theme Modal */
.theme-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.theme-modal {
  background: var(--color-bg-semi-transparent);
  border: 1px solid var(--color-border-primary);
  border-radius: 12px;
  padding: 24px;
  min-width: 300px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.theme-modal h3 {
  margin: 0 0 20px 0;
  color: var(--color-text-primary);
  font-size: 1.3rem;
  text-align: center;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-transparent);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.theme-option:hover {
  background: var(--color-button-bg);
  border-color: var(--color-primary);
}

.theme-option.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.theme-preview {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}
</style>
