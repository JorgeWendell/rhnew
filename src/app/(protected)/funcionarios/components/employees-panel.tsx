"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getCompaniesAction } from "@/actions/companies";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  getEmployeesAction,
  updateEmployeeAction,
} from "@/actions/employees";
import { FaceCaptureDialog } from "@/components/face-capture-dialog";
import { cameraErrorMessage, requestUserCamera, stopStream } from "@/lib/face/browser";
import { NativeSelect } from "@/components/native-select";
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
import { formatDateBR } from "@/lib/ponto/time";

const employeeSchema = z.object({
  companyId: z.string().uuid("Selecione a empresa"),
  registration: z.string().min(1, "Informe o registro").max(30),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(150),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de admissão"),
  active: z.boolean(),
  faceDescriptor: z.array(z.number()).length(128).nullable(),
  facePhoto: z.string().max(200_000).nullable(),
  clearFace: z.boolean(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type Employee = {
  id: string;
  companyId: string;
  companyName: string;
  registration: string;
  name: string;
  admissionDate: string;
  active: boolean;
  facePhoto: string | null;
  hasFace: boolean;
};

type CompanyOption = { id: string; name: string; active: boolean };

const emptyValues: EmployeeFormValues = {
  companyId: "",
  registration: "",
  name: "",
  admissionDate: "",
  active: true,
  faceDescriptor: null,
  facePhoto: null,
  clearFace: false,
};

export function EmployeesPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [removing, setRemoving] = useState<Employee | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasStoredFace, setHasStoredFace] = useState(false);

  function releaseCamera() {
    stopStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    setCameraStream(null);
  }

  useEffect(() => {
    return () => stopStream(cameraStreamRef.current);
  }, []);

  async function openFaceCamera() {
    setOpeningCamera(true);
    releaseCamera();
    try {
      const stream = await requestUserCamera();
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setFaceOpen(true);
    } catch (error) {
      toast.error(cameraErrorMessage(error));
    } finally {
      setOpeningCamera(false);
    }
  }

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: emptyValues,
  });

  const { execute: loadEmployees, isPending } = useAction(getEmployeesAction, {
    onSuccess: ({ data }) => {
      if (data?.success) setEmployees(data.data);
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao carregar funcionários"),
  });

  const { execute: loadCompanies } = useAction(getCompaniesAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setCompanies(
          data.data.map((company) => ({
            id: company.id,
            name: company.name,
            active: company.active,
          })),
        );
      }
    },
  });

  const { execute: createEmployee, isPending: creating } = useAction(createEmployeeAction, {
    onSuccess: () => {
      toast.success("Funcionário cadastrado");
      setOpen(false);
      loadEmployees({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao cadastrar funcionário"),
  });

  const { execute: updateEmployee, isPending: updating } = useAction(updateEmployeeAction, {
    onSuccess: () => {
      toast.success("Funcionário atualizado");
      setOpen(false);
      loadEmployees({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao atualizar funcionário"),
  });

  const { execute: removeEmployee } = useAction(deleteEmployeeAction, {
    onSuccess: () => {
      toast.success("Funcionário excluído");
      setRemoving(null);
      loadEmployees({});
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao excluir funcionário"),
  });

  useEffect(() => {
    loadEmployees({});
    loadCompanies({});
  }, [loadEmployees, loadCompanies]);

  const filtered = employees.filter((employee) =>
    `${employee.name} ${employee.registration} ${employee.companyName}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const visible = filtered.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE);

  const openForm = (employee?: Employee) => {
    setEditing(employee ?? null);
    setPreview(employee?.facePhoto ?? null);
    setHasStoredFace(Boolean(employee?.hasFace));
    form.reset(
      employee
        ? {
            companyId: employee.companyId,
            registration: employee.registration,
            name: employee.name,
            admissionDate: employee.admissionDate,
            active: employee.active,
            faceDescriptor: null,
            facePhoto: null,
            clearFace: false,
          }
        : emptyValues,
    );
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Funcionários"
        description="Registro, nome, admissão e a facial usada para bater o ponto."
        action={<Button onClick={() => openForm()}>Novo funcionário</Button>}
      />
      <div className="mb-4">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome, registro ou empresa"
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registro</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Facial</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={6}>Carregando funcionários...</TableCell>
              </TableRow>
            )}
            {!isPending && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>Nenhum funcionário cadastrado.</TableCell>
              </TableRow>
            )}
            {visible.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.registration}</TableCell>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.companyName}</TableCell>
                <TableCell>{formatDateBR(employee.admissionDate)}</TableCell>
                <TableCell>
                  {employee.hasFace ? (
                    <span className="text-emerald-600">Cadastrada</span>
                  ) : (
                    <span className="text-amber-600">Pendente</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openForm(employee)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRemoving(employee)}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                const payload = {
                  ...values,
                  companyId: values.companyId,
                };
                if (editing) updateEmployee({ ...payload, id: editing.id });
                else createEmployee(payload);
              })}
            >
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <NativeSelect {...field}>
                        <option value="">Selecione</option>
                        {companies
                          .filter((company) => company.active || company.id === field.value)
                          .map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="registration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="admissionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admissão</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {preview ? (
                    // A foto vem da câmera local, em data URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Prévia da facial" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
                      Sem foto
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">Facial</p>
                    <p className="text-xs text-slate-500">
                      {hasStoredFace || preview ? "Pronta para o relógio de ponto." : "Ainda não capturada."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={openingCamera}
                    onClick={() => void openFaceCamera()}
                  >
                    {openingCamera ? "Abrindo câmera..." : "Capturar"}
                  </Button>
                </div>
                {hasStoredFace && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 text-red-600"
                    onClick={() => {
                      form.setValue("clearFace", true);
                      form.setValue("faceDescriptor", null);
                      form.setValue("facePhoto", null);
                      setPreview(null);
                      setHasStoredFace(false);
                    }}
                  >
                    Remover facial
                  </Button>
                )}
              </div>
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
                    <FormLabel>Funcionário ativo</FormLabel>
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

      <FaceCaptureDialog
        open={faceOpen}
        stream={cameraStream}
        onOpenChange={(value) => {
          setFaceOpen(value);
          if (!value) releaseCamera();
        }}
        onCapture={({ descriptor, photo }) => {
          form.setValue("faceDescriptor", descriptor);
          form.setValue("facePhoto", photo);
          form.setValue("clearFace", false);
          setPreview(photo);
          setHasStoredFace(true);
          toast.success("Facial capturada. Salve o funcionário para gravar.");
        }}
      />

      <AlertDialog open={!!removing} onOpenChange={(value) => !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name} e os pontos vinculados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && removeEmployee({ id: removing.id })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
