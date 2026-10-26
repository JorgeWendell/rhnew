import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

const handler = toNextJsHandler(auth);

export const { POST, GET } = handler;

export const runtime = "nodejs";
