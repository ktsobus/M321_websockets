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
          <button @click="leaveChat" class="button-leave">Leave</button>
        </div>

        <div class="chat-box">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="{
              'system-message': msg.type === 'system',
              message: msg.type === 'message' && !msg.isOwn,
              'message-own': msg.type === 'message' && msg.isOwn,
            }"
          >
            {{ msg.text }}
          </div>
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
}

const messages = ref<Message[]>([])
const input = ref('')
const username = ref('')
const nameInput = ref('')
var status = ref('Disconnected')
let ws: WebSocket

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

    if (data.type === 'join') {
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
      messages.value.push({
        type: 'message',
        text: `${data.username}: ${data.text}`,
        isOwn: data.username === username.value,
      })
    }
  }
  ws.onclose = () => {
    console.log('Disconnected. Reconnecting...')
    status.value = 'Disconnected'
    setTimeout(connect, 1000)
  }
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
  max-width: 400px;
  margin: 40px auto;
  font-family: sans-serif;
  text-align: center;
  position: relative;
  z-index: 1;
}

h1 {
  color: var(--color-text-primary);
}

h2 {
  color: var(--color-text-secondary);
  font-size: 1.2rem;
}

.name-prompt {
  margin-top: 20px;
}

.current-user {
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--color-text-secondary);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.chat-box {
  background: var(--color-bg-semi-transparent);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  height: 250px;
  overflow-y: auto;
  margin-bottom: 10px;
  padding: 10px;
  text-align: left;
  backdrop-filter: blur(10px);
}

.input {
  width: 70%;
  padding: 8px;
  background: var(--color-bg-transparent);
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  color: var(--color-text-primary);
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
  cursor: pointer;
}

.button:hover {
  background: var(--color-button-hover-bg);
}

.button-leave {
  padding: 4px 8px;
  background: var(--color-leave-bg);
  border: 1px solid var(--color-leave-border);
  border-radius: 4px;
  color: var(--color-leave-text);
  cursor: pointer;
  font-size: 0.9rem;
}

.button-leave:hover {
  background: var(--color-leave-hover-bg);
  border-color: var(--color-leave-hover-border);
  color: var(--color-leave-hover-text);
}

.message {
  margin-bottom: 4px;
  color: var(--color-text-primary);
  background: var(--color-message-other);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid var(--color-message-border);
}

.message-own {
  margin-bottom: 4px;
  color: var(--color-text-primary);
  background: var(--color-message-own);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid var(--color-message-own-border);
}

.system-message {
  margin-bottom: 4px;
  color: var(--color-text-secondary);
  font-style: italic;
  text-align: center;
  opacity: 0.8;
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
