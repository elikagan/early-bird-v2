/**
 * Dev-only auth endpoint for the QA review tool.
 *
 * Lets the QA tool sign in as a test buyer, dealer, or admin with one click.
 * Seeds the test user on demand, creates a session, returns the session token.
 *
 * HARD-GATED to non-production. Returns 404 in production.
 */

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";
import { TEST_ADMIN_PHONE } from "@/lib/admin";

const TEST_BUYER_PHONE = "+15550000001";
const TEST_DEALER_PHONE = "+15550000002";

interface TestUserConfig {
  phone: string;
  first_name: string;
  last_name: string;
  display_name: string;
  is_dealer: number;
  business_name?: string;
  instagram_handle?: string;
}

const TEST_USERS: Record<string, TestUserConfig> = {
  buyer: {
    phone: TEST_BUYER_PHONE,
    first_name: "Test",
    last_name: "Buyer",
    display_name: "Test Buyer",
    is_dealer: 0,
  },
  dealer: {
    phone: TEST_DEALER_PHONE,
    first_name: "Test",
    last_name: "Dealer",
    display_name: "Test Dealer",
    is_dealer: 1,
    business_name: "Test Dealer Shop",
    instagram_handle: "testdealer",
  },
  admin: {
    phone: TEST_ADMIN_PHONE,
    first_name: "Test",
    last_name: "Admin",
    display_name: "Test Admin",
    is_dealer: 0,
  },
};

export async function POST(request: Request) {
  // HARD GATE — must be absolute. This endpoint must not exist in production.
  if (process.env.NODE_ENV === "production") {
    return error("Not found", 404);
  }

  const body = await request.json().catch(() => ({}));
  const role = body.role as keyof typeof TEST_USERS;
  const config = TEST_USERS[role];
  if (!config) {
    return error("Invalid role. Use buyer, dealer, or admin.", 400);
  }

  // Upsert user by phone
  let userId: string;
  const existing = await db.execute({
    sql: `SELECT id FROM users WHERE phone = ?`,
    args: [config.phone],
  });

  if (existing.rows.length === 0) {
    userId = newId();
    await db.execute({
      sql: `INSERT INTO users (id, phone, first_name, last_name, display_name, is_dealer)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        config.phone,
        config.first_name,
        config.last_name,
        config.display_name,
        config.is_dealer,
      ],
    });
  } else {
    userId = existing.rows[0].id as string;
    // Keep display/is_dealer in sync with the config so the seed stays predictable
    await db.execute({
      sql: `UPDATE users SET first_name = ?, last_name = ?, display_name = ?, is_dealer = ?
            WHERE id = ?`,
      args: [
        config.first_name,
        config.last_name,
        config.display_name,
        config.is_dealer,
        userId,
      ],
    });
  }

  // For dealer role, ensure a dealer record exists
  if (role === "dealer" && config.business_name) {
    const dealerExisting = await db.execute({
      sql: `SELECT id FROM dealers WHERE user_id = ?`,
      args: [userId],
    });

    if (dealerExisting.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO dealers (id, user_id, business_name, instagram_handle, verified)
              VALUES (?, ?, ?, ?, 1)`,
        args: [
          newId(),
          userId,
          config.business_name,
          config.instagram_handle || null,
        ],
      });
    }
  }

  // Create a fresh session (30-day expiry, same as real login)
  const sessionToken = nanoid(32);
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), userId, sessionToken, expiresAt],
  });

  return json({
    token: sessionToken,
    user: {
      id: userId,
      phone: config.phone,
      display_name: config.display_name,
      is_dealer: config.is_dealer,
      role,
    },
  });
}
