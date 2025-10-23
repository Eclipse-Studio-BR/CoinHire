import { useQuery } from "@tanstack/react-query";
import type { PublicUser } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<PublicUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<PublicUser | null>({ on401: "returnNull" }),
    retry: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}
