# Audiobookshelf (ABS) API Authentication Documentation

**Last Updated:** April 27, 2026  
**ABS Version Tested:** (User's local instance)  
**Status:** Active - API Key + JWT Dual Auth

---

## Overview

Audiobookshelf supports two authentication methods:
1. **API Token** - Static token for simple access
2. **JWT Authentication** - Username/password login for user-scoped access (progress tracking)

---

## Authentication Methods

### 1. API Token (Primary for basic access)

**How to get:** ABS → Settings → Users → [User] → API Token

**Usage:**
```
GET /api/libraries?token=API_TOKEN
```

**Characteristics:**
- Long-lived (doesn't expire)
- Works for most read-only operations
- **Cannot access user-specific data** (progress, bookmarks, etc.)
- Returns 404 for endpoints requiring user scope

### 2. JWT Authentication (For progress tracking)

**Login Endpoint:**
```
POST /api/authorize
Content-Type: application/json

Body: {"username": "...", "password": "..."}

Response: {"user": {...}, "token": "JWT_TOKEN"}
```

**Using JWT:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Characteristics:**
- Session-based (expires after inactivity)
- Required for user-scoped endpoints
- Enables progress tracking
- Enables bookmark sync

---

## Endpoint-Specific Behavior

### Works with API Token

| Endpoint | Notes |
|----------|-------|
| `GET /api/libraries` | List all libraries |
| `GET /api/libraries/:id/items` | Get library items |
| `GET /api/items/:id` | Get item details (without progress) |
| `GET /api/items/:id/cover` | Cover images |

### Requires JWT Token

| Endpoint | Notes |
|----------|-------|
| `GET /api/me` | Current user info |
| `GET /api/me/progress` | User progress data |
| `GET /api/items/:id?include=progress` | Item with progress |
| `POST /api/session` | Start playback session |
| `PATCH /api/me/progress/:id` | Update progress |

---

## Current Implementation

### How Folio Handles Auth

1. **Configuration:**
   - User can provide: API token only, OR API token + username/password
   - Both stored in secure storage

2. **API Calls:**
   - Always includes `?token=API_TOKEN` as query param
   - If JWT available, also adds `Authorization: Bearer <jwt>` header
   - JWT takes precedence for user-scoped endpoints

3. **Progress Tracking:**
   - Only enabled if JWT credentials provided
   - Falls back to "no progress" if only API token available

---

## Dual Auth Pattern

Folio uses **both** auth methods when available:

```typescript
// Request includes both
GET /api/libraries?token=API_TOKEN
Authorization: Bearer JWT_TOKEN
```

**Why:** ABS endpoints vary in what they accept. Some need the query param, some need the header, some work with either.

---

## Testing/Verification

### Verify API Token Works

```bash
# List libraries
curl "http://YOUR_ABS:13378/api/libraries?token=YOUR_API_TOKEN"
```

### Verify JWT Login Works

```bash
# 1. Get JWT
curl -X POST http://YOUR_ABS:13378/api/authorize \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}'

# 2. Access user-scoped endpoint
curl http://YOUR_ABS:13378/api/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Verify Progress Endpoint (Requires JWT)

```bash
# This will 404 with API token only
curl "http://YOUR_ABS:13378/api/items/ITEM_ID?include=progress&token=API_TOKEN"

# This works with JWT
curl "http://YOUR_ABS:13378/api/items/ITEM_ID?include=progress" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Known Issues & Limitations

1. **Progress requires JWT** - API token alone won't sync progress
2. **JWT expires** - Need re-login after server restart/session timeout
3. **Cover uploads** - Require proxy for external URLs (ABS can't fetch external images)

---

## Changelog

| Date | Change | Commit |
|------|--------|--------|
| 2026-04-27 | Documented dual auth pattern | Initial |

---

## Related Files

- `services/audiobookshelfAPI.ts` - Main API client
- `config/credentials.ts` - Storage keys (abs section)
- `app/(tabs)/settings.tsx` - ABS config modal

---

## Key Differences from Kavita

| Aspect | Kavita | ABS |
|--------|--------|-----|
| Primary auth | JWT (v0.8+) | API Token |
| Login endpoint | `POST /api/Account/login` | `POST /api/authorize` |
| Image auth | `?apiKey=` param | `?token=` param |
| Progress tracking | Built-in to API key | Requires JWT |
| Token lifetime | JWT expires | API token is permanent |
