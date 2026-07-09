import { Redirect, useLocation } from "wouter";
import { isAuthenticated } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps any route that requires authentication.
 * Unauthenticated users are redirected to /auth/login?next=<current-path>
 * so they land on the correct page after signing in.
 */
export default function ProtectedRoute({ children }: Props) {
  const [location] = useLocation();

  if (!isAuthenticated()) {
    const next = encodeURIComponent(location);
    return <Redirect to={`/auth/login?next=${next}`} />;
  }

  return <>{children}</>;
}
