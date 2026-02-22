# Real-time messaging (Socket.io) – frontend guide

The backend now uses **Socket.io** so new messages appear without reloading the page. When user A sends a message, user B (the receiver) gets it instantly if they have the chat open.

## Backend (already done)

- Socket.io runs on **the same port as your API** (e.g. `https://api.adwebtest.online`).
- On **POST /api/client/messages** or **POST /api/artist/messages**, after saving the message the server emits a **`new_message`** event to the receiver’s Socket.io room.
- Clients must connect with a **JWT** so the server can attach the socket to the correct user.

## Frontend: what to do

### 1. Install the client

```bash
npm install socket.io-client
```

### 2. Connect when the user is logged in

Connect to the **same host as your API** (same origin or your API base URL), and send the auth token:

```javascript
import { io } from 'socket.io-client';

// Use your API base URL (e.g. https://api.adwebtest.online)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.adwebtest.online';

const token = getAuthToken(); // from your auth state (localStorage, context, etc.)
const socket = io(API_BASE_URL, {
  auth: {
    token: token   // or "Bearer " + token
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Socket connected');
});
socket.on('connected', (data) => {
  console.log('Joined as user:', data.userId);
});
socket.on('connect_error', (err) => {
  console.error('Socket error:', err.message);
});
```

Important: use the **API base URL** (e.g. `https://api.adwebtest.online`), not a path like `/api`. Socket.io will use that host and its default path.

### 3. Listen for new messages

When the backend sends a message to this user, it emits **`new_message`**:

```javascript
socket.on('new_message', (payload) => {
  // payload: { _id, message, senderId, receiverId, appointmentId, isRead, readAt, createdAt, updatedAt }
  // Add this message to your chat UI for the matching conversation/appointment
  // So: if the user is viewing the chat for appointmentId === payload.appointmentId, append the message
  addMessageToChat(payload);
});
```

In your React (or other) app:

- Keep the socket instance in context or a global so the same connection is used on all pages.
- When the user opens a conversation (by appointment or by “with userId”), subscribe to `new_message` and, when `payload.appointmentId` (or sender/receiver) matches the current conversation, append the message to the list so the UI updates without reload.

### 4. Reconnect when token changes

When the user logs in or the token is refreshed, disconnect the old socket and create a new one with the new token:

```javascript
if (socket) socket.disconnect();
socket = io(API_BASE_URL, { auth: { token: newToken } });
// ... set up listeners again
```

### 5. Optional: join a “conversation” room

Right now the backend only uses a **user room** (`user:userId`), so every socket for that user receives every `new_message` for them. You can still filter on the frontend by `payload.appointmentId` or `payload.senderId` so only the active conversation updates. No need to join extra rooms unless you add them on the backend later.

## Summary

| Item        | Value                                                                 |
|------------|-----------------------------------------------------------------------|
| URL        | Same as API (e.g. `https://api.adwebtest.online`)                     |
| Auth       | `auth: { token: '<jwt>' }` or `token: 'Bearer <jwt>'`                 |
| Event      | `new_message`                                                         |
| Payload    | `{ _id, message, senderId, receiverId, appointmentId, isRead, readAt, createdAt, updatedAt }` |

After implementing this, new messages will show up in the receiver’s chat without reloading the page.
