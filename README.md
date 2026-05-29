# Folio

A unified React PWA for your self-hosted media libraries:
- 📚 **Kavita** — Read ebooks, PDFs, and comics
- 🎧 **Audiobookshelf** — Listen to audiobooks and podcasts

## Features

- 📚 **Dual Server Support** — Connect to both Kavita and Audiobookshelf simultaneously
- 📖 **EPUB Reader** — epub.js-powered with themes, swipe navigation, and progress sync
- 📄 **PDF Reader** — PDF.js with smooth scrolling and inline rendering
- 🎧 **Audiobook Player** — Full-featured player with chapters, bookmarks, and playback speed
- 🔍 **Search** — Full-text search across both servers
- 📊 **Reading Progress** — Sync progress back to your servers in real-time
- 🔗 **Series Matching** — Link audiobooks to their ebook series for quick switching
- 🔐 **Secure Auth** — API keys stored in device's secure enclave
- 🐳 **Docker Deployment** — Single container with built-in proxy for CORS-free access

## Screenshots

The app uses a dark amber/gold theme designed for comfortable reading sessions.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- A running [Kavita](https://www.kavitareader.com/) server (optional)
- A running [Audiobookshelf](https://www.audiobookshelf.org/) server (optional)

---

## Setup (Docker - Recommended)

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/Folio.git
cd Folio
```

Create a `.env` file with your server URLs (optional - can also be configured in UI):

```bash
EXPO_PUBLIC_KAVITA_URL=http://your-kavita-ip:8050
EXPO_PUBLIC_ABS_URL=http://your-abs-ip:81
```

### 2. Start the app

```bash
docker-compose up -d --build
```

Access at `http://localhost:3000` (or your server IP)

### 3. Connect your servers

Open Settings and configure:

- **Kavita**: Server URL + API Key (from Kavita → User Settings → Security → API Key)
- **Audiobookshelf**: Server URL + API Token (from ABS Settings → Users → Your User → API Token)

---

## Development Setup

If you want to run outside Docker for development:

```bash
cd folio-reader
npm install
npx expo start
```

---

## Project Structure

```
Folio/
├── folio-reader/            # React Native / Expo app
│   ├── app/
│   │   ├── (tabs)/          # Main tabs: ebooks, audiobooks, search, settings
│   │   ├── series/[id].tsx  # Series detail page
│   │   ├── audiobook/[id].tsx # Audiobook player
│   │   └── reader/          # EPUB and PDF readers
│   ├── components/          # Reusable UI components
│   ├── constants/           # Theme, colors, typography
│   ├── contexts/            # Auth, Theme, Audio Player contexts
│   ├── services/            # API clients
│   │   ├── kavitaAPI.ts     # Kavita REST client
│   │   ├── audiobookshelfAPI.ts # ABS REST client
│   │   ├── LibraryProvider.ts     # Unified interface
│   │   └── LibraryFactory.ts      # Provider factory
│   ├── server.js            # Node.js proxy server (CORS handling)
│   ├── scripts/
│   │   └── deploy-webhook.js    # Auto-deploy webhook receiver
│   ├── Dockerfile           # Main app container
│   └── Dockerfile.deploy    # Deploy webhook container
├── docker-compose.yml       # Main app orchestration
├── docker-compose.deploy.yml # Deploy webhook orchestration
└── nginx.conf               # Nginx config (fallback)
```

---

## API Architecture

### Proxy Server

Folio includes a built-in Node.js proxy server (`server.js`) that handles CORS and authentication headers when communicating with your self-hosted servers. This eliminates the need to configure CORS on Kavita or ABS directly.

The proxy:
- Forwards all `/api/*` requests to your configured servers
- Adds proper CORS headers for browser access
- Handles authentication token injection
- Runs on port 3000 alongside the main app

### Auto-Deploy Webhook + Cloud Sync (Optional)

The deploy webhook server (`docker-compose.deploy.yml`) provides two features:

1. **Auto-Deploy** — Automatically redeploy the app when you push to GitHub
2. **Cloud Sync** — Sync profiles across all your devices (web, mobile, tablet)

#### Setup

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and set your secrets:**
   ```bash
   # This is the password for your cloud sync server
   DEPLOY_SECRET=your-secure-secret-here-change-me
   
   # Optional: Auto-discovery URL for mobile apps
   PUBLIC_SERVER_URL=http://YOUR_SERVER_IP:9000
   ```

3. **Create data directory:**
   ```bash
   mkdir -p /home/jewelshadow/Documents/Projects/Folio/data
   ```

4. **Start the webhook + sync server:**
   ```bash
   docker-compose -f docker-compose.deploy.yml up -d --build
   ```

**Security note:** The `.env` file is in `.gitignore` and will not be committed. Keep your secrets private!

#### Feature 1: Auto-Deploy Webhook

Add a GitHub webhook to enable auto-deployment:
- **URL**: `http://YOUR_SERVER_IP:9000/deploy`
- **Secret**: Same as `DEPLOY_SECRET`
- **Events**: Push to main branch

#### Feature 2: Profile Cloud Sync

Sync profiles (and their settings) across all devices:

1. Go to **Settings → Cloud Sync** in the app
2. Enter your server URL: `http://YOUR_SERVER_IP:9000`
3. Enter your API key (same as `DEPLOY_SECRET`)
4. Tap Save

**How it works:**
- Each device gets a unique ID automatically
- Profiles auto-upload when you make changes (create, edit, select)
- Profiles auto-download on app startup
- Last sync time shown in Settings
- Manual "Sync Now" button available

**Offline Support:**
The app functions fully when the sync server is unreachable. Changes are stored locally and will sync automatically when connection is restored. The app never blocks on sync operations — everything happens in the background.

### Kavita API

Uses the **Kavita Plugin API** for authentication.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/Plugin/authenticate` | Get JWT token from API key |
| `GET /api/Library` | List all libraries |
| `POST /api/Series/all` | Paginated series list |
| `GET /api/Series/{id}` | Series metadata |
| `GET /api/Series/volumes` | Volumes + chapters |
| `POST /api/Reader/progress` | Save reading progress |
| `GET /api/Reader/pdf` | Stream PDF file |
| `GET /api/Reader/epub` | Stream EPUB file |
| `GET /api/Search/search` | Full-text search |

### Audiobookshelf API

Uses Bearer token authentication with API tokens.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/libraries` | List all libraries |
| `GET /api/libraries/{id}/items` | Library items |
| `GET /api/items/{id}` | Item details |
| `GET /api/items/{id}/playback-session` | Start playback session |
| `POST /api/session/{id}/sync` | Sync progress |
| `GET /api/collections` | User collections |

---

## Troubleshooting

**"Could not reach server"**
- Check that the server URL is correct in Settings
- Ensure the built-in proxy is running (check `docker logs folio-reader`)
- Verify your server is accessible from the Docker host
- Try using IP address instead of hostname

**"Invalid API key / Token"**
- **Kavita**: User Settings → Security → API Key
- **Audiobookshelf**: Settings → Users → Your User → API Token

**CORS errors in browser**
- This should be handled by the built-in proxy automatically
- If you see CORS errors, the proxy may not be running. Check: `docker ps | grep folio`

**Audiobooks not loading**
- Verify ABS is running and the library scan is complete
- Check browser dev tools for API errors
- Ensure your ABS API token has proper permissions

**EPUB/PDF not loading**
- Check that the file format is supported by your Kavita server
- Verify the chapter/file ID is correct in the URL

---

## Tech Stack

- **React Native** + **Expo** (SDK 51)
- **Expo Router** (file-based navigation)
- **Node.js** proxy server (CORS handling)
- **epub.js** (EPUB rendering)
- **PDF.js** (PDF rendering)
- **react-native-track-player** (audio playback)
- **expo-secure-store** (secure credential storage)
- **Axios** (HTTP client)
- **TypeScript** throughout
- **Docker** + Docker Compose (deployment)

---

## Where to Buy DRM-Free Books

We recommend purchasing your books from these sources to support local bookshops while getting DRM-free files that work with your self-hosted libraries:

- **[Libro.fm](https://libro.fm)** — DRM-free audiobooks that support your local independent bookstore
- **[Bookshop.org](https://bookshop.org)** — DRM-free ebooks and physical books that benefit local bookshops

Both services provide files you can directly add to your Kavita and Audiobookshelf libraries.

---

## License

MIT — use freely for your personal self-hosted setup.
