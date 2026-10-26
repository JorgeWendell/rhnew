"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getEmployeesAction } from "@/actions/employees";
import { createPunchAction, deletePunchAction, getPunchesAction } from "@/actions/punches";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
import { PUNCH_TYPES, punchLabel, type PunchType } from "@/lib/ponto/constants";
import { formatDateTime, saoPauloParts, todayInSaoPaulo } from "@/lib/ponto/time";

const punchSchema = z.object({
  employeeId: z.string().uuid("Selecione o funcionário"),
  type: z.enum(["entry", "lunch_out", "lunch_in", "exit"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Informe a hora"),
});

type PunchFormValues = z.infer<typeof punchSchema>;

type Employee = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  registration: string;
};

type Punch = {
  id: string;
  employeeName: string;
  registration: string;
  companyName: string;
  type: PunchType;
  punchedAt: Date | string;
  source: "facial" | "manual";
  faceDistance: number | null;
};

export function PunchesPanel() {
  const today = todayInSaoPaulo();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [companyId, setCompanyId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [open, setOpen] = useState(false);

  const form = useForm<PunchFormValues>({
    resolver: zodResolver(punchSchema),
    defaultValues: {
      employeeId: "",
      type: "entry",
      date: today,
      time: saoPauloParts(new Date()).time,
    },
  });

  const { execute: loadEmployees } = useAction(getEmployeesAction, {
    onSuccess: ({ data }) => {
      if (data?.success) setEmployees(data.data);
    },
  });

  const { execute: loadPunches, isPending } = useAction(getPunchesAction, {
    onSuccess: ({ data }) => {
      if (data?.success) setPunches(data.data);
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao carregar pontos"),
  });

  const { execute: createPunch, isPending: saving } = useAction(createPunchAction, {
    onSuccess: () => {
      toast.success("Ponto registrado");
      setOpen(false);
      refresh();
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao registrar ponto"),
  });

  const { execute: removePunch } = useAction(deletePunchAction, {
    onSuccess: () => {
      toast.success("Ponto excluído");
      refresh();
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao excluir ponto"),
  });

  const refresh = () => {
    loadPunches({
      from,
      to,
      companyId: companyId || undefined,
      employeeId: employeeId || undefined,
    });
  };

  useEffect(() => {
    loadEmployees({});
  }, [loadEmployees]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, companyId, employeeId]);

  const companies = Array.from(
    new Map(employees.map((employee) => [employee.companyId, employee.companyName])).entries(),
  );
  const employeeOptions = employees.filter((employee) => !companyId || employee.companyId === companyId);

  return (
    <>
      <PageHeader
        title="Pontos"
        description="Consulte as marcações e registre um ponto manual quando precisar corrigir."
        action={
          <Button
            onClick={() => {
              form.reset({
                employeeId: employeeId || "",
                type: "entry",
                date: todayInSaoPaulo(),
                time: saoPauloParts(new Date()).time,
              });
              setOpen(true);
            }}
          >
            Registrar ponto
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <NativeSelect value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
          <option value="">Todas as empresas</option>
          {companies.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          <option value="">Todos os funcionários</option>
          {employeeOptions.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.registration} - {employee.name}
            </option>
          ))}
        </NativeSelect>
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Marcação</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={5}>Carregando pontos...</TableCell>
              </TableRow>
            )}
            {!isPending && punches.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Nenhum ponto neste período.</TableCell>
              </TableRow>
            )}
            {punches.map((punch) => (
              <TableRow key={punch.id}>
                <TableCell>{formatDateTime(new Date(punch.punchedAt))}</TableCell>
                <TableCell>
                  <span className="font-medium">{punch.employeeName}</span>
                  <span className="block text-xs text-slate-500">
                    {punch.companyName} · #{punch.registration}
                  </span>
                </TableCell>
                <TableCell>{punchLabel(punch.type)}</TableCell>
                <TableCell>
                  {punch.source === "facial" ? "Facial" : "Manual"}
                  {punch.faceDistance != null && (
                    <span className="block text-xs text-slate-500">
                      distância {punch.faceDistance.toFixed(2)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removePunch({ id: punch.id })}>
                    <Trash2 className="h-4 w-4 text-red-600" />
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
            <DialogTitle>Registrar ponto</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => createPunch(values))}>
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funcionário</FormLabel>
                    <FormControl>
                      <NativeSelect {...field}>
                        <option value="">Selecione</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.registration} - {employee.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marcação</FormLabel>
                    <FormControl>
                      <NativeSelect {...field}>
                        {PUNCH_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  Gravar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
