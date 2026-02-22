# Copy this entire prompt and paste it into Frontend Cursor

---

Implement real-time chat so that when someone sends a message, the other person sees it **without reloading the page**. The backend is already set up with Socket.io; the frontend needs to connect and listen.

## What the backend does (no frontend changes to API)

- The Glamhub API runs **Socket.io on the same URL as the REST API** (e.g. `https://api.adwebtest.online`). There is no separate socket URL.
- When a user sends a message via **POST /api/client/messages** or **POST /api/artist/messages**, the server saves it and then **emits a Socket.io event `new_message`** to the receiver. So the receiver gets the message in real time if they are connected.
- The socket server expects the client to connect with **JWT authentication** (the same token used for API requests), so it can associate the socket with the logged-in user.

## What you need to implement on the frontend

1. **Install Socket.io client**
   - Run: `npm install socket.io-client`

2. **Connect to the socket when the user is logged in**
   - Use the **same base URL as your API** (e.g. `https://api.adwebtest.online` or your `NEXT_PUBLIC_API_URL` / `VITE_API_URL`). Do **not** use a path like `/api` or `/socket`—just the origin (protocol + host + port if needed).
   - Pass the user’s **JWT** in the connection options so the backend can authenticate the socket:
     - `io(API_BASE_URL, { auth: { token: userToken } })`  
     - Token can be with or without `"Bearer "` prefix; the backend accepts both.
   - Store the socket instance in **React Context** (or similar) so the same connection is used across the app (e.g. one socket per logged-in user). Connect after login; disconnect on logout.

3. **Listen for new messages**
   - Subscribe to the **`new_message`** event on the socket.
   - The payload is an object with: `_id`, `message`, `senderId`, `receiverId`, `appointmentId`, `isRead`, `readAt`, `createdAt`, `updatedAt`.
   - When you receive `new_message`, add this message to your chat UI **only if it belongs to the conversation the user is currently viewing** (e.g. match `payload.appointmentId` to the current conversation, or match sender/receiver). Then update state so the new message appears in the list without a page reload.

4. **Reconnect when token changes**
   - When the user logs in or the token is refreshed, disconnect the previous socket (if any) and create a new connection with the new token. Re-attach the `new_message` listener on the new socket.

5. **Error handling**
   - Listen for `connect_error` and optionally show a subtle message or retry. If the socket is disconnected, the existing REST API still works; only real-time updates will be missing until reconnected.

## Summary for Cursor

- **Yes, you need to implement something on the frontend:** connect to Socket.io using the API base URL and the user’s JWT, keep the socket in context, and listen for the **`new_message`** event. When `new_message` is received, append that message to the current conversation’s message list if it matches the open chat, so new messages appear without reload.
- **Backend is ready:** same URL as API, event name `new_message`, auth via `auth.token` (JWT). No new REST endpoints are required for real-time; only the socket connection and the `new_message` listener are needed on the frontend.

Use the same API base URL that the rest of the app uses (e.g. from env like `NEXT_PUBLIC_API_URL` or `VITE_API_URL`). After this is implemented, when a client messages an artist (or the other way around), the recipient will see the new message automatically without refreshing the page.
