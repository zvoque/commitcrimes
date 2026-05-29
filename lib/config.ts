// Clerk is optional. Client components can only see the publishable key; server
// code (middleware, route handlers calling auth()) also needs the secret key.
// Centralized so the two checks stay consistent across the app.
//
// Note: with the publishable key set but no secret, sign-in UI renders while
// server auth()/API routes are disabled — set BOTH or NEITHER in a deploy.
export const clerkClientEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const clerkServerEnabled =
  clerkClientEnabled && !!process.env.CLERK_SECRET_KEY;
