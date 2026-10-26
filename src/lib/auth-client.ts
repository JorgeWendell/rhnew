import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  if (typeof window === "undefined") {
    return process.env.BETTER_AUTH_URL || "http://localhost:3000";
  }
  return window.location.origin;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
