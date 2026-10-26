import { createSafeActionClient } from "next-safe-action";

import { getCurrentUser } from "@/lib/session";

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error("Action error:", error);
    if (error instanceof Error && error.message) return error.message;
    return "Erro ao executar a operação.";
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");
  return next({ ctx: { user } });
});
