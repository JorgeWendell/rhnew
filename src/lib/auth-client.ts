import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.BETTER_AUTH_URL ||
      "http://localhost:3000"
    );
  }
  return process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
