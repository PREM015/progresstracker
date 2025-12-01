"use client";

import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UseAuthReturn {
  user: User | undefined;
  status: "authenticated" | "loading" | "unauthenticated";
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  const user = session?.user as User | undefined;

  const signOut = async () => {
    try {
      await nextAuthSignOut({ 
        redirect: false,
        callbackUrl: "/login"
      });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
      // Force redirect even if error occurs
      router.push("/login");
    }
  };

  return {
    user,
    status,
    isAuthenticated,
    isLoading,
    signOut,
  };
}