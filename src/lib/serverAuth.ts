import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { verifyToken, JWTPayload } from '@/lib/auth';

/**
 * Server-Side Authentication Guard for Admin / Staff Routes.
 * Forces Vercel / Next.js to render dynamically on the server and check cookies.
 * Prevents pre-rendered HTML leakage in Incognito mode.
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

  return {
    props: {
      userSession: session,
    },
  };
}

/**
 * Server-Side Authentication Guard for Buyer Routes.
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

  return {
    props: {
      userSession: session,
    },
  };
}
