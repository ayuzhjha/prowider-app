/**
 * Core Lead Allocation Engine
 *
 * Business Rules:
 * - Exactly 3 providers must be assigned per lead
 * - Mandatory providers are always assigned first (if quota available)
 * - Remaining slots filled with fair round-robin from service pool
 * - Quota per provider: 10 leads/month
 * - Allocation state (round-robin index) persists in DB even after restart
 * - Safe under concurrent requests using atomic MongoDB operations
 */

import Provider from "./models/Provider";
import AllocationState from "./models/AllocationState";

const TOTAL_SLOTS = 3;

// Mandatory provider rules per service
export const MANDATORY_PROVIDERS: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
};

// Fair allocation pool per service (providers eligible for non-mandatory slots)
export const ALLOCATION_POOLS: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
};

/**
 * Atomically decrement a provider's quota.
 * Returns true if successful (quota was > 0), false if quota exhausted.
 */
async function tryDecrementQuota(providerId: number): Promise<boolean> {
  const result = await Provider.findOneAndUpdate(
    { providerId, monthlyQuota: { $gt: 0 } },
    { $inc: { monthlyQuota: -1, leadsReceived: 1 } },
    { new: true }
  );
  return result !== null;
}

/**
 * Atomically advance the round-robin index for a service.
 * Returns the index BEFORE incrementing (i.e., the one to use now).
 *
 * We use $inc so concurrent calls each get a unique slot even under load.
 * We take the returned nextIndex modulo pool.length to find the actual provider.
 */
async function advanceRoundRobin(serviceId: number): Promise<number> {
  const state = await AllocationState.findOneAndUpdate(
    { serviceId },
    { $inc: { nextIndex: 1 } },
    { new: false } // return doc BEFORE update (gives us the index to use)
  );
  if (!state) {
    throw new Error(`AllocationState not found for service ${serviceId}`);
  }
  return state.nextIndex;
}

/**
 * Pick the next fair provider from the pool that still has quota.
 * Tries up to pool.length candidates starting from the round-robin position.
 * Returns null if no eligible provider found.
 */
async function pickFairProvider(
  serviceId: number,
  exclude: number[]
): Promise<number | null> {
  const pool = ALLOCATION_POOLS[serviceId];
  if (!pool) return null;

  // Eligible = in pool, not already assigned, has quota
  // We need live quota data
  const eligibleProviders = await Provider.find({
    providerId: { $in: pool, $nin: exclude },
    monthlyQuota: { $gt: 0 },
  }).lean();

  if (eligibleProviders.length === 0) return null;

  // Get current round-robin index (advance atomically)
  const currentIndex = await advanceRoundRobin(serviceId);

  // Build ordered list starting from currentIndex position in the pool
  // Map pool position to eligible providers in round-robin order
  const eligibleIds = eligibleProviders.map((p) => p.providerId);

  // Sort pool in round-robin order starting from currentIndex
  const sortedPool = [...pool].filter((id) => eligibleIds.includes(id));
  const poolLength = sortedPool.length;
  if (poolLength === 0) return null;

  const startPos = currentIndex % poolLength;
  const orderedPool = [
    ...sortedPool.slice(startPos),
    ...sortedPool.slice(0, startPos),
  ];

  // Try each candidate in order until we successfully decrement quota
  for (const providerId of orderedPool) {
    const success = await tryDecrementQuota(providerId);
    if (success) {
      return providerId;
    }
  }

  return null;
}

/**
 * Main allocation function.
 * Assigns exactly 3 providers to a lead.
 * Returns array of assigned provider IDs.
 */
export async function allocateProviders(serviceId: number): Promise<number[]> {
  const assigned: number[] = [];
  const mandatoryList = MANDATORY_PROVIDERS[serviceId] || [];

  // Step 1: Assign mandatory providers (if they have quota)
  for (const providerId of mandatoryList) {
    if (assigned.length >= TOTAL_SLOTS) break;
    const success = await tryDecrementQuota(providerId);
    if (success) {
      assigned.push(providerId);
    }
  }

  // Step 2: Fill remaining slots with fair round-robin picks
  let attempts = 0;
  const maxAttempts = 20; // safety cap
  while (assigned.length < TOTAL_SLOTS && attempts < maxAttempts) {
    attempts++;
    const picked = await pickFairProvider(serviceId, assigned);
    if (picked === null) break; // no more eligible providers
    assigned.push(picked);
  }

  return assigned;
}
