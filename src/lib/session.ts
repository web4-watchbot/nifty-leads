// Lightweight session utility — anonymous demo user persisted in localStorage on the client.
// The server uses a deterministic demo user (no auth setup required for the free version).

import { db } from "@/lib/db";

const DEMO_USER_EMAIL = "demo@niftytechfinds.com";

export async function getOrCreateDemoUser() {
  let user = await db.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        name: "Nifty Lead Finder User",
        plan: "free",
        settings: { create: {} },
      },
      include: { settings: true },
    });
  }
  return user;
}

export async function getDemoUserId(): Promise<string> {
  const user = await getOrCreateDemoUser();
  return user.id;
}
