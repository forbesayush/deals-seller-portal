import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { verifyToken, JWTPayload } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';

/**
 * Checks if a token has been server-side blacklisted (e.g. after explicit logout).
 */
async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const db = await connectDB();
    const entry = await db.collection('token_blacklist').findOne({ token });
    return !!entry;
  } catch {
    return false; // Fail open — never block legitimate users due to DB issues
  }
}

/**
 * Server-Side Authentication Guard for Admin / Staff Routes.
 * Forces Vercel / Next.js to render dynamically on the server and check cookies.
 * Prevents pre-rendered HTML leakage in Incognito mode.
 * Also validates against the server-side token blacklist (logout invalidation).
 */
export async function requireServerAdmin(
  context: GetServerSidePropsContext,
  allowedRoles: string[] = ['admin', 'super_admin', 'manager', 'auditor']
): Promise<GetServerSidePropsResult<Record<string, unknown>>> {
  const { req, resolvedUrl } = context;

  // Retrieve token from cookies or authorization header
  const cookies = req.cookies || {};
  const token = cookies.ds_token || cookies.ds_jwt_token || cookies.token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const activeToken = token || bearerToken;

  if (!activeToken) {
    return {
      redirect: {
        destination: `/login?returnUrl=${encodeURIComponent(resolvedUrl || '/admin/dashboard')}`,
        permanent: false,
      },
    };
  }

  const session: JWTPayload | null = verifyToken(activeToken);

  if (!session || !allowedRoles.includes(session.role)) {
    return {
      redirect: {
        destination: `/login?returnUrl=${encodeURIComponent(resolvedUrl || '/admin/dashboard')}`,
        permanent: false,
      },
    };
  }

  // Check server-side token blacklist (ensures manual logout truly invalidates the session)
  const blacklisted = await isTokenBlacklisted(activeToken);
  if (blacklisted) {
    return {
      redirect: {
        destination: `/login?returnUrl=${encodeURIComponent(resolvedUrl || '/admin/dashboard')}&loggedOut=1`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      userSession: session,
    },
  };
}

/**
 * Server-Side Authentication Guard for Buyer Routes.
 * Also validates against the server-side token blacklist.
 */
export async function requireServerBuyer(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Record<string, unknown>>> {
  const { req, resolvedUrl } = context;

  const cookies = req.cookies || {};
  const token = cookies.ds_token || cookies.ds_jwt_token || cookies.token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const activeToken = token || bearerToken;

  if (!activeToken) {
    return {
      redirect: {
        destination: `/login?returnUrl=${encodeURIComponent(resolvedUrl || '/buyer/dashboard')}`,
        permanent: false,
      },
    };
  }

  const session: JWTPayload | null = verifyToken(activeToken);

  if (!session) {
    return {
      redirect: {
        destination: `/login?returnUrl=${encodeURIComponent(resolvedUrl || '/buyer/dashboard')}`,
        permanent: false,
      },
    };
  }

  // Check server-side token blacklist
  const blacklisted = await isTokenBlacklisted(activeToken);
  if (blacklisted) {
    return {
      redirect: {
        destination: `/login?returnUrl=${encodeURIComponent(resolvedUrl || '/buyer/dashboard')}&loggedOut=1`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      userSession: session,
    },
  };
}
