# Prowider — Mini Lead Distribution System

A full-stack lead generation and distribution platform built with **Next.js 14**, **MongoDB**, and **Server-Sent Events**.

## Live Demo

[LIVE DEMO](https://prowider-app.vercel.app/)

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/ayuzhjha/prowider-app
cd prowider-app
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your MongoDB URI:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prowider?retryWrites=true&w=majority
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Seed the Database

Option A — via API (UI):
1. Start the dev server: `npm run dev`
2. Open `/test-tools` in your browser
3. Click **"Seed Database"**

Option B — via script:
```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview |
| `/request-service` | Customer enquiry form |
| `/dashboard` | Provider dashboard (live updates) |
| `/test-tools` | Webhook simulation & testing panel |

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB (via Mongoose)
- **Real-time**: Server-Sent Events (SSE)
- **Validation**: Zod
- **Styling**: Vanilla CSS

### Database Collections

| Collection | Purpose |
|------------|---------|
| `services` | 3 service types |
| `providers` | 8 providers with quota tracking |
| `leads` | Customer enquiries + assigned providers |
| `allocation_state` | Persistent round-robin index per service |
| `webhook_events` | Processed event IDs for idempotency |

---

## Allocation Algorithm

### Mandatory Rules

| Service | Always Assigned |
|---------|----------------|
| Service 1 | Provider 1 |
| Service 2 | Provider 5 |
| Service 3 | Provider 1 + Provider 4 |

### Fair Distribution Pools

| Service | Round-Robin Pool |
|---------|-----------------|
| Service 1 | Providers 2, 3, 4 |
| Service 2 | Providers 6, 7, 8 |
| Service 3 | Providers 2, 3, 5, 6, 7, 8 |

### Steps (per new lead):

1. **Mandatory assignment**: Providers in the mandatory list are assigned first, using atomic quota decrement (`findOneAndUpdate` with `{monthlyQuota: {$gt: 0}}`)
2. **Fair distribution**: Remaining slots (to reach 3 total) are filled using **persistent round-robin**:
   - `AllocationState` stores `nextIndex` per service in MongoDB
   - Each lead atomically increments `nextIndex` via `$inc`
   - The lead picks providers starting from `nextIndex % eligiblePool.length`
   - Providers at quota are skipped
3. **Exactly 3 providers** are always attempted (fewer if quota exhausted across the board)

---

## Concurrency Handling

### Problem
Multiple leads submitted simultaneously could:
- Over-assign the same provider slot
- Corrupt the round-robin counter
- Exceed the monthly quota

### Solution

**Quota decrement (atomic)**:
```js
Provider.findOneAndUpdate(
  { providerId, monthlyQuota: { $gt: 0 } },  // only succeed if quota > 0
  { $inc: { monthlyQuota: -1, leadsReceived: 1 } }
)
```
If two requests race, only one can win each slot. The other gets `null` and moves to the next provider.

**Round-robin advance (atomic)**:
```js
AllocationState.findOneAndUpdate(
  { serviceId },
  { $inc: { nextIndex: 1 } },
  { new: false }  // return BEFORE update — gives unique index to each request
)
```
Each concurrent request gets a **unique, monotonically increasing index**, ensuring distinct rotation positions.

---

## Webhook Idempotency

**Endpoint**: `POST /api/webhook/reset-quota`

**Mechanism**:
1. Caller provides a unique `eventId` in the request body
2. The endpoint attempts to insert a record into `webhook_events` with that `eventId`
3. `webhook_events` has a **unique index on `eventId`**
4. If the `eventId` was already processed, MongoDB throws `E11000` (duplicate key)
5. The handler catches this and returns `{alreadyProcessed: true}` **without** resetting quotas

This guarantees **at-most-once** processing regardless of how many times the webhook is called.

---

## Real-Time Dashboard

Uses **Server-Sent Events (SSE)**:
1. Dashboard connects to `GET /api/sse/dashboard` on page load
2. A module-level `Set<SSEClient>` stores all active connections
3. When `POST /api/leads` completes allocation, it calls `broadcastDashboardUpdate()`
4. All connected clients receive the event and immediately re-fetch provider data
5. Affected provider cards highlight with a brief animation
6. Heartbeat every 15 seconds prevents proxy timeouts
7. Auto-reconnects on disconnect (3-second retry)

---

## Duplicate Lead Prevention

**Database-level enforcement**:
```js
LeadSchema.index({ phone: 1, serviceId: 1 }, { unique: true });
```

The API catches MongoDB `E11000` errors and returns HTTP 409 with a user-friendly message. Frontend validation is also present but secondary.

---

## Testing Scenarios

### Test 1: Duplicate Lead
1. Submit a lead with phone `9999999999` for Service 1
2. Try to submit again with the same phone + service → expect 409 error
3. Submit with Service 2 → should succeed ✓

### Test 2: Mandatory Provider Assignment
1. Submit lead for Service 1 → Provider 1 must appear in assigned list
2. Submit lead for Service 2 → Provider 5 must appear
3. Submit lead for Service 3 → Provider 1 AND Provider 4 must appear

### Test 3: Fair Distribution
1. Submit 6+ leads for Service 1
2. Providers 2, 3, 4 should each receive roughly equal non-mandatory slots

### Test 4: Concurrent Load
1. Go to `/test-tools`
2. Click "Generate 10 Leads Concurrently"
3. Check dashboard: no provider should exceed their monthly quota

### Test 5: Webhook Idempotency
1. Click "Reset Provider Quota" (generates a new eventId)
2. Click "Call Webhook 5× Same ID"
3. Result should show: `actuallyProcessed: 1, skippedAsDuplicate: 4`

### Test 6: Real-Time Update
1. Open `/dashboard` in one browser tab
2. Open `/request-service` in another tab
3. Submit a new lead in the second tab
4. Dashboard updates automatically within ~1 second ✓
