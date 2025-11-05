<template>
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
      <div class="current-user">Chatting as: {{ username }}</div>

      <div class="chat-box">
        <div v-for="(msg, i) in messages" :key="i" :class="msg.type === 'system' ? 'system-message' : 'message'">
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Message {
  type: 'message' | 'system'
  text: string
}

const messages = ref<Message[]>([])
const input = ref('')
const username = ref('')
const nameInput = ref('')
var status = ref('Disconnected')
let ws: WebSocket

onMounted(() => {
  connect()
})

function connect(){
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
        text: `${data.username} joined the chat`
      })
    } else if (data.type === 'leave') {
      messages.value.push({
        type: 'system',
        text: `${data.username} left the chat`
      })
    } else if (data.type === 'message') {
      messages.value.push({
        type: 'message',
        text: `${data.username}: ${data.text}`
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
  ws.send(JSON.stringify({
    type: 'join',
    username: name
  }))
}

const sendMessage = () => {
  const text = input.value.trim()
  if (!text) return

  ws.send(JSON.stringify({
    type: 'message',
    username: username.value,
    text: text
  }))
  input.value = ''
}
</script>

<style scoped>
.container {
  max-width: 400px;
  margin: 40px auto;
  font-family: sans-serif;
  text-align: center;
}
.name-prompt {
  margin-top: 20px;
}
.current-user {
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}
.chat-box {
  border: 1px solid #ccc;
  border-radius: 6px;
  height: 250px;
  overflow-y: auto;
  margin-bottom: 10px;
  padding: 10px;
  text-align: left;
}
.input {
  width: 70%;
  padding: 8px;
}
.button {
  padding: 8px 12px;
  margin-left: 5px;
}
.message {
  margin-bottom: 4px;
}
.system-message {
  margin-bottom: 4px;
  color: #666;
  font-style: italic;
  text-align: center;
}
</style>
