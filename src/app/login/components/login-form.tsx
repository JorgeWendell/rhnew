"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ canSignUp }: { canSignUp: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const result = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      form.setError("root", { message: result.error.message || "Não foi possível entrar" });
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 text-white shadow-xl">
      <h2 className="text-2xl font-bold">Acesse sua conta</h2>
      <p className="mt-2 text-sm text-slate-300">Entre para administrar empresas, funcionários e pontos.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="nome@empresa.com.br" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root && (
            <p className="text-sm text-red-400">{form.formState.errors.root.message}</p>
          )}
          <Button type="submit" className="h-10 w-full bg-blue-600 text-white hover:bg-blue-500" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Form>
      {canSignUp && (
        <p className="mt-6 text-sm text-slate-300">
          Primeiro acesso?{" "}
          <Link href="/cadastro" className="font-medium text-blue-300 hover:text-white">
            Criar administrador
          </Link>
        </p>
      )}
    </div>
  );
}
