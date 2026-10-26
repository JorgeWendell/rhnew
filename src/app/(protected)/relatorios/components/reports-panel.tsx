"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getEmployeesAction } from "@/actions/employees";
import { getTimesheetAction, setDayMarkAction } from "@/actions/timesheet";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DayStatus } from "@/lib/ponto/constants";
import type { TimesheetResult } from "@/lib/ponto/get-timesheet";
import { formatDateBR, formatMinutes, monthStart, todayInSaoPaulo } from "@/lib/ponto/time";

type Employee = { id: string; companyId: string; companyName: string; name: string; registration: string };

function cell(minutes: number) {
  return minutes > 0 ? formatMinutes(minutes) : "—";
}

export function ReportsPanel() {
  const today = todayInSaoPaulo();
  const [companyId, setCompanyId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [notes, setNotes] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sheets, setSheets] = useState<TimesheetResult[]>([]);

  const { execute: loadEmployees } = useAction(getEmployeesAction, {
    onSuccess: ({ data }) => {
      if (data?.success) setEmployees(data.data);
    },
  });

  const { execute: loadSheet, isPending } = useAction(getTimesheetAction, {
    onSuccess: ({ data }) => {
      if (data?.success) setSheets(data.data);
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao montar o espelho"),
  });

  const { execute: saveMark } = useAction(setDayMarkAction, {
    onSuccess: () => search(),
    onError: ({ error }) => toast.error(error.serverError || "Erro ao ajustar o dia"),
  });

  useEffect(() => {
    loadEmployees({});
  }, [loadEmployees]);

  const companies = Array.from(
    new Map(employees.map((employee) => [employee.companyId, employee.companyName])).entries(),
  );
  const employeeOptions = employees.filter((employee) => employee.companyId === companyId);

  const search = () => {
    if (!companyId) {
      toast.error("Selecione a empresa");
      return;
    }
    loadSheet({
      companyId,
      employeeId: employeeId || undefined,
      from,
      to,
    });
  };

  const exportExcel = () => {
    if (!companyId) {
      toast.error("Selecione a empresa");
      return;
    }
    const params = new URLSearchParams({ companyId, from, to, notes });
    if (employeeId) params.set("employeeId", employeeId);
    window.location.href = `/api/relatorios/excel?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Espelho no padrão do cartão: quatro marcações, atrasos, horas extras e adicional noturno."
      />
      <div className="mb-4 grid gap-3 lg:grid-cols-6">
        <NativeSelect
          value={companyId}
          onChange={(event) => {
            setCompanyId(event.target.value);
            setEmployeeId("");
          }}
        >
          <option value="">Empresa</option>
          {companies.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          <option value="">Todos os ativos</option>
          {employeeOptions.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.registration} - {employee.name}
            </option>
          ))}
        </NativeSelect>
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <Button onClick={search} disabled={isPending}>
          {isPending ? "Calculando..." : "Gerar"}
        </Button>
        <Button variant="outline" onClick={exportExcel}>
          Exportar Excel
        </Button>
      </div>
      <Input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Observação que entra no rodapé do Excel"
        className="mb-4"
      />
      <p className="mb-4 text-sm text-slate-500">
        Atrasos e extras dentro da tolerância ficam zerados. A primeira faixa da jornada vai para 50% e o restante
        para 100%. Domingo e feriado mandam toda a extra para 100%. O adicional noturno soma o intervalo trabalhado
        dentro do horário configurado.
      </p>
      <div className="space-y-8">
        {sheets.map((sheet) => (
          <section key={sheet.employeeId} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{sheet.employeeName}</h3>
                <p className="text-sm text-slate-500">
                  {sheet.companyName} · Registro {sheet.registration} · Admissão {formatDateBR(sheet.admissionDate)} ·{" "}
                  {formatDateBR(sheet.from)} a {formatDateBR(sheet.to)}
                </p>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {sheet.schedule.map((rule) => (
                  <span key={rule.weekday} className="mr-3 inline-block">
                    {rule.label.slice(0, 3)} {formatMinutes(rule.expectedMinutes)}
                  </span>
                ))}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída almoço</TableHead>
                  <TableHead>Entrada almoço</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>H. diária</TableHead>
                  <TableHead>Atrasos</TableHead>
                  <TableHead>Abona</TableHead>
                  <TableHead>Extras</TableHead>
                  <TableHead>A.N.</TableHead>
                  <TableHead>50%</TableHead>
                  <TableHead>100%</TableHead>
                  <TableHead>Ajuste</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.days.map((day) => (
                  <TableRow key={day.date} className={day.holidayName || day.weekdayIndex === 0 ? "bg-slate-50 dark:bg-slate-800/60" : undefined}>
                    <TableCell>{formatDateBR(day.date)}</TableCell>
                    <TableCell>
                      {day.weekday}
                      {day.holidayName && <span className="block text-xs text-amber-600">{day.holidayName}</span>}
                      {day.status === "falta" && <span className="block text-xs text-red-600">Falta</span>}
                      {day.status === "suspensao" && <span className="block text-xs text-amber-700">Suspensão</span>}
                    </TableCell>
                    <TableCell>{day.entry ?? "—"}</TableCell>
                    <TableCell>{day.lunchOut ?? "—"}</TableCell>
                    <TableCell>{day.lunchIn ?? "—"}</TableCell>
                    <TableCell>{day.exit ?? "—"}</TableCell>
                    <TableCell>{cell(day.workedMinutes)}</TableCell>
                    <TableCell>{cell(day.delayMinutes)}</TableCell>
                    <TableCell>{day.abono ? "Sim" : "—"}</TableCell>
                    <TableCell>{cell(day.overtimeMinutes)}</TableCell>
                    <TableCell>{cell(day.nightMinutes)}</TableCell>
                    <TableCell>{cell(day.extra50Minutes)}</TableCell>
                    <TableCell>{cell(day.extra100Minutes)}</TableCell>
                    <TableCell>
                      <NativeSelect
                        value={day.status === "normal" && day.abono ? "abono" : day.status}
                        onChange={(event) => {
                          const value = event.target.value;
                          const status: DayStatus = value === "abono" ? "normal" : (value as DayStatus);
                          saveMark({
                            employeeId: sheet.employeeId,
                            date: day.date,
                            status,
                            abono: value === "abono",
                          });
                        }}
                      >
                        <option value="normal">Normal</option>
                        <option value="abono">Abonar atraso</option>
                        <option value="falta">Falta</option>
                        <option value="suspensao">Suspensão</option>
                      </NativeSelect>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Totais</TableCell>
                  <TableCell />
                  <TableCell colSpan={4}>
                    Faltas {sheet.totals.absences} · Suspensões {sheet.totals.suspensions}
                  </TableCell>
                  <TableCell>{formatMinutes(sheet.totals.workedMinutes)}</TableCell>
                  <TableCell>{formatMinutes(sheet.totals.delayMinutes)}</TableCell>
                  <TableCell />
                  <TableCell>{formatMinutes(sheet.totals.overtimeMinutes)}</TableCell>
                  <TableCell>{formatMinutes(sheet.totals.nightMinutes)}</TableCell>
                  <TableCell>{formatMinutes(sheet.totals.extra50Minutes)}</TableCell>
                  <TableCell>{formatMinutes(sheet.totals.extra100Minutes)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </section>
        ))}
      </div>
    </>
  );
}
