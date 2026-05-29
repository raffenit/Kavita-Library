# Kavita API Authentication Documentation

**Last Updated:** April 27, 2026  
**Kavita Version Tested:** 0.8.9.1  
**Status:** Active - JWT Authentication Implemented

---

## Overview

Kavita v0.8+ deprecated API key authentication in favor of JWT-based authentication. This document describes how Folio interacts with Kavita APIs.

---

## Authentication Methods

### 1. JWT Authentication (Primary)

**Login Endpoint:**
```
POST /api/Account/login
Content-Type: application/json

Body: {"username": "...", "password": "..."}

Response: {"token": "JWT_TOKEN", "..."}
```

**Using JWT:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Status:** ✓ Working - Used for all API calls

### 2. API Key Authentication (Legacy)

**Deprecated:** The `/api/Plugin/authenticate` endpoint returns 404 in Kavita 0.8+

**Still Used For:**
- Image endpoints (`/api/image/*`) - query parameter only
- Some fallback scenarios

**Format:**
```
GET /api/endpoint?apiKey=YOUR_API_KEY
```

---

## Endpoint-Specific Behavior

### API Endpoints (JWT Works)

| Endpoint | Auth Method | Status |
|----------|-------------|--------|
| `POST /api/Account/login` | Username/password | ✓ Working |
| `GET /api/Library` | JWT header | ✓ Working |
| `GET /api/Library/all` | **Deprecated** - Returns 404 | ⚠️ Fallback to `/api/Series/all` |
| `GET /api/Series/all` | JWT header | ✓ Working |
| `POST /api/Upload/series` | JWT header | ✓ Working |
| `GET /api/Series/metadata` | JWT header | ✓ Working |
| `POST /api/Series/metadata/update` | JWT header | ✓ Working |

### Cover Upload API (`POST /api/Upload/series`)

**Endpoint:** `POST /api/Upload/series`  
**Authentication:** JWT Bearer token (Authorization header)  
**Content-Type:** `application/json`

**Request Body Structure:**
```json
{
  "id": 95,
  "url": "iVBORw0KGgoAAAANS...",
  "fromBase64": true
}
```

**Critical Requirements:**

1. **Parameter Name:** Must use `id`, NOT `seriesId` (returns 400 Bad Request otherwise)
2. **fromBase64 Flag:** Must be `true` when sending base64-encoded image data
3. **URL Field Format:** When `fromBase64: true`, the `url` field must contain **only** the raw base64 data
   - ✅ Correct: `"url": "iVBORw0KGgoAAAANS..."`
   - ❌ Incorrect: `"url": "data:image/png;base64,iVBORw0KGgoAAAANS..."`

**Example Flow:**
```typescript
// 1. Get base64 data URL from image picker (includes prefix)
const base64DataUrl = "data:image/png;base64,iVBORw0KGgoAAAANS...";

// 2. Strip the data URL prefix for Kavita
const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

// 3. Send upload request
await axios.post('/api/Upload/series', {
  id: seriesId,           // NOT seriesId
  url: base64Data,        // Raw base64 only, no prefix
  fromBase64: true        // Required flag
});
```

**Response:** `200 OK` with empty body `""` on success

**Note:** The upload returns 200 even if the cover processing fails. Check the series metadata afterward to confirm the cover was saved.

### Image Endpoints (Require apiKey Param)

| Endpoint | Auth Method | Status |
|----------|-------------|--------|
| `GET /api/image/series-cover` | `?apiKey=` query param | ✓ **Confirmed working** |
| `GET /api/image/library-cover` | `?apiKey=` query param | ✓ **Confirmed working** |
| `GET /api/image/volume-cover` | `?apiKey=` query param | ✓ **Confirmed working** |
| `GET /api/image/chapter-cover` | `?apiKey=` query param | ✓ **Confirmed working** |
| `GET /api/image/collection-cover` | `?apiKey=` query param | ✓ **Confirmed working** |

**Confirmed:** Direct browser access to `?seriesId=1&apiKey=KEY` returns PNG image ✓

**Note:** JWT tokens cannot be used for image endpoints because they require the `Authorization` header, which `<img>` tags cannot set. Image endpoints **only** accept `apiKey` query parameter.

---

## Current Implementation

### How Folio Handles Auth

1. **Login Flow:**
   - User provides username/password + optional API key
   - `kavitaAPI.login()` calls `/api/Account/login`
   - JWT token stored in memory

2. **API Calls:**
   - Request interceptor adds `Authorization: Bearer <jwt>` header
   - Falls back to `?apiKey=` param if no JWT

3. **Image URLs:**
   - Only use `?apiKey=` parameter (JWT doesn't work)
   - **Requires API key to be configured for cover images to load**

---

## Workarounds & Limitations

### Current Workaround

**To see cover images, users must:**
1. Enter username/password (for JWT API access)
2. ALSO enter API key (for image loading)

**Location:** Settings → Kavita Server → fill in both sections

### Known Issues

1. **Cover images fail without API key** - JWT can't be passed to image endpoints
2. **`/api/Library/all` 404** - Endpoint deprecated, fallback to `/api/Series/all`
3. **WebP uploads** - May not be supported by Kavita for series covers

---

## Future Improvements

### Image Proxy Solution

**Problem:** JWT can't be used in `<img>` tag URLs  
**Solution:** Proxy all images through Folio server

```
Current: <img src="http://kavita/api/image/series-cover?seriesId=1&apiKey=KEY">
Improved: <img src="/image-proxy?seriesId=1">
           → Server adds Authorization: Bearer <jwt>
           → Forwards to Kavita
           → Returns image
```

**Benefits:**
- No API key needed (JWT only)
- Better security (token not in URL)
- Consistent auth method

---

## Testing/Verification

### Verify JWT Auth Works

```bash
# 1. Get JWT token
curl -X POST http://YOUR_KAVITA_URL:8050/api/Account/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}'

# 2. Use JWT to call API
curl http://YOUR_KAVITA_URL:8050/api/Library \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Verify Image Endpoint Behavior

```bash
# Test WITHOUT auth (should fail/redirect)
curl -I http://YOUR_KAVITA_URL:8050/api/image/series-cover?seriesId=1

# Test WITH apiKey param
curl -I http://YOUR_KAVITA_URL:8050/api/image/series-cover?seriesId=1&apiKey=YOUR_KEY

# Test WITH JWT header (should work but not usable in browsers)
curl -I http://YOUR_KAVITA_URL:8050/api/image/series-cover?seriesId=1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Changelog

| Date | Change | Commit |
|------|--------|--------|
| 2026-04-27 | Initial JWT auth implementation | - |
| 2026-04-27 | Fixed cover URLs to use apiKey | - |
| 2026-04-27 | Fixed volumes array type checking | - |
| 2026-04-27 | **Confirmed:** Image endpoints work with `?apiKey=` param (direct browser test) | - |
| 2026-04-29 | **Fixed:** Series cover upload - use `id` param, `fromBase64: true`, and strip data URL prefix | - |

---

## Related Files

- `services/kavitaAPI.ts` - Main API client
- `config/credentials.ts` - Storage keys
- `app/(tabs)/settings.tsx` - UI for credentials
