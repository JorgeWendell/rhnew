"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createUserAction,
  deleteUserAction,
  getUsersAction,
  setUserActiveAction,
} from "@/actions/users";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const userSchema = z.object({
  name: z.string().min(3, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

type UserRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", isActive: true },
  });

  const { execute: load, isPending } = useAction(getUsersAction, {
    onSuccess: ({ data }) => {
      if (data?.success) setUsers(data.data);
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao carregar usuários"),
  });

  const { execute: createUser, isPending: saving } = useAction(createUserAction, {
    onSuccess: () => {
      toast.success("Usuário criado");
      setOpen(false);
      load({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao criar usuário"),
  });

  const { execute: setActive } = useAction(setUserActiveAction, {
    onSuccess: () => load({}),
    onError: ({ error }) => toast.error(error.serverError || "Erro ao atualizar usuário"),
  });

  const { execute: removeUser } = useAction(deleteUserAction, {
    onSuccess: () => {
      toast.success("Usuário excluído");
      load({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao excluir usuário"),
  });

  useEffect(() => {
    load({});
  }, [load]);

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Contas que acessam o painel administrativo."
        action={
          <Button
            onClick={() => {
              form.reset({ name: "", email: "", password: "", isActive: true });
              setOpen(true);
            }}
          >
            Novo usuário
          </Button>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={4}>Carregando usuários...</TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.isActive ? "Ativo" : "Inativo"}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActive({ id: user.id, isActive: !user.isActive })}
                  >
                    {user.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeUser({ id: user.id })}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => createUser(values))}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                    </FormControl>
                    <FormLabel>Usuário ativo</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  Criar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
