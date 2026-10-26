"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createCompanyAction,
  deleteCompanyAction,
  getCompaniesAction,
  updateCompanyAction,
} from "@/actions/companies";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { TABLE_PAGE_SIZE, TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";

const companySchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(150),
  cnpj: z.string().max(18),
  contact: z.string().max(150),
  whatsapp: z.string().max(20),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]),
  active: z.boolean(),
  notes: z.string().max(2000),
});

type CompanyFormValues = z.infer<typeof companySchema>;

type Company = {
  id: string;
  name: string;
  cnpj: string | null;
  contact: string | null;
  whatsapp: string | null;
  email: string | null;
  active: boolean;
  notes: string | null;
};

const emptyValues: CompanyFormValues = {
  name: "",
  cnpj: "",
  contact: "",
  whatsapp: "",
  email: "",
  active: true,
  notes: "",
};

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function CompaniesPanel() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [removing, setRemoving] = useState<Company | null>(null);
  const [query, setQuery] = useState("");

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: emptyValues,
  });

  const { execute: load, isPending } = useAction(getCompaniesAction, {
    onSuccess: ({ data }) => {
      if (data?.success) setCompanies(data.data);
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao carregar empresas"),
  });

  const { execute: createCompany, isPending: creating } = useAction(createCompanyAction, {
    onSuccess: () => {
      toast.success("Empresa cadastrada");
      setOpen(false);
      load({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao cadastrar empresa"),
  });

  const { execute: updateCompany, isPending: updating } = useAction(updateCompanyAction, {
    onSuccess: () => {
      toast.success("Empresa atualizada");
      setOpen(false);
      load({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao atualizar empresa"),
  });

  const { execute: removeCompany } = useAction(deleteCompanyAction, {
    onSuccess: () => {
      toast.success("Empresa excluída");
      setRemoving(null);
      load({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao excluir empresa"),
  });

  useEffect(() => {
    load({});
  }, [load]);

  const filtered = companies.filter((company) =>
    `${company.name} ${company.cnpj ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const visible = filtered.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE);

  const openForm = (company?: Company) => {
    setEditing(company ?? null);
    form.reset(
      company
        ? {
            name: company.name,
            cnpj: company.cnpj ?? "",
            contact: company.contact ?? "",
            whatsapp: company.whatsapp ?? "",
            email: company.email ?? "",
            active: company.active,
            notes: company.notes ?? "",
          }
        : emptyValues,
    );
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Cadastre as empresas que vão usar o ponto."
        action={<Button onClick={() => openForm()}>Nova empresa</Button>}
      />
      <div className="mb-4">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome ou CNPJ"
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={5}>Carregando empresas...</TableCell>
              </TableRow>
            )}
            {!isPending && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Nenhuma empresa cadastrada.</TableCell>
              </TableRow>
            )}
            {visible.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.cnpj || "—"}</TableCell>
                <TableCell>{company.contact || company.email || "—"}</TableCell>
                <TableCell>{company.active ? "Ativa" : "Inativa"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openForm(company)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRemoving(company)}>
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination totalItems={filtered.length} currentPage={page} onPageChange={setPage} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                if (editing) createOrUpdate(values);
                else createCompany(values);

                function createOrUpdate(data: CompanyFormValues) {
                  if (!editing) return;
                  updateCompany({ ...data, id: editing.id });
                }
              })}
            >
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
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(event) => field.onChange(formatCnpj(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
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
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        className={cn(
                          "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel>Empresa ativa</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating || updating}>
                  {editing ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(value) => !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name} e os funcionários, pontos e feriados vinculados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && removeCompany({ id: removing.id })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
