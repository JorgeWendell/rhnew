"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createHolidayAction,
  deleteHolidayAction,
  getJourneyAction,
  importHolidaysAction,
  listCompaniesForSettingsAction,
  saveJourneyAction,
} from "@/actions/settings";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WEEKDAY_LABELS } from "@/lib/ponto/constants";
import { currentYearInSaoPaulo, formatDateBR, formatMinutes } from "@/lib/ponto/time";

type RuleDraft = {
  weekday: number;
  expected: string;
  firstOvertime: string;
};

type Holiday = { id: string; holidayDate: string; name: string };

const defaultRules = (): RuleDraft[] =>
  WEEKDAY_LABELS.map((_, weekday) => ({
    weekday,
    expected: weekday >= 1 && weekday <= 4 ? "09:00" : weekday === 5 ? "08:00" : "00:00",
    firstOvertime: weekday === 0 ? "00:00" : "01:00",
  }));

export function SchedulePanel() {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [companyId, setCompanyId] = useState("");
  const [tolerance, setTolerance] = useState(10);
  const [nightStart, setNightStart] = useState("22:00");
  const [nightEnd, setNightEnd] = useState("05:00");
  const [rules, setRules] = useState<RuleDraft[]>(defaultRules);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [year, setYear] = useState(currentYearInSaoPaulo());

  const { execute: loadCompanies } = useAction(listCompaniesForSettingsAction, {
    onSuccess: ({ data }) => {
      if (!data?.success) return;
      setCompanies(data.data);
      if (!companyId && data.data[0]) setCompanyId(data.data[0].id);
    },
  });

  const { execute: loadJourney } = useAction(getJourneyAction, {
    onSuccess: ({ data }) => {
      if (!data?.success) return;
      setTolerance(data.data.company.toleranceMinutes);
      setNightStart(data.data.company.nightStart);
      setNightEnd(data.data.company.nightEnd);
      setHolidays(data.data.holidays);
      setRules(
        WEEKDAY_LABELS.map((_, weekday) => {
          const rule = data.data.rules.find((item) => item.weekday === weekday);
          return {
            weekday,
            expected: formatMinutes(rule?.expectedMinutes ?? 0),
            firstOvertime: formatMinutes(rule?.firstOvertimeMinutes ?? 0),
          };
        }),
      );
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao carregar a jornada"),
  });

  const { execute: saveJourney, isPending } = useAction(saveJourneyAction, {
    onSuccess: () => toast.success("Jornada salva"),
    onError: ({ error }) => toast.error(error.serverError || "Erro ao salvar a jornada"),
  });

  const { execute: createHoliday } = useAction(createHolidayAction, {
    onSuccess: () => {
      setHolidayDate("");
      setHolidayName("");
      if (companyId) loadJourney({ companyId });
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao salvar feriado"),
  });

  const { execute: removeHoliday } = useAction(deleteHolidayAction, {
    onSuccess: () => companyId && loadJourney({ companyId }),
  });

  const { execute: importHolidays } = useAction(importHolidaysAction, {
    onSuccess: ({ data }) => {
      toast.success(`${data?.inserted ?? 0} feriados novos importados`);
      if (companyId) loadJourney({ companyId });
    },
    onError: ({ error }) => toast.error(error.serverError || "Erro ao importar feriados"),
  });

  useEffect(() => {
    loadCompanies({});
  }, [loadCompanies]);

  useEffect(() => {
    if (companyId) loadJourney({ companyId });
  }, [companyId, loadJourney]);

  return (
    <>
      <PageHeader
        title="Jornada e feriados"
        description="A carga padrão segue o exemplo: segunda a quinta 09:00, sexta 08:00, sábado e domingo sem carga. Tolerância de 10 minutos."
      />
      <div className="mb-4 max-w-sm">
        <NativeSelect value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
          <option value="">Selecione a empresa</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      {companyId && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                Tolerância (min)
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={tolerance}
                  onChange={(event) => setTolerance(Number(event.target.value))}
                  className="mt-1"
                />
              </label>
              <label className="text-sm">
                Início do adicional noturno
                <Input type="time" value={nightStart} onChange={(event) => setNightStart(event.target.value)} className="mt-1" />
              </label>
              <label className="text-sm">
                Fim do adicional noturno
                <Input type="time" value={nightEnd} onChange={(event) => setNightEnd(event.target.value)} className="mt-1" />
              </label>
            </div>
            <div className="mt-4 space-y-2">
              {rules.map((rule) => (
                <div key={rule.weekday} className="grid grid-cols-[1fr_120px_140px] items-center gap-3">
                  <span className="text-sm font-medium">{WEEKDAY_LABELS[rule.weekday]}</span>
                  <Input
                    type="time"
                    value={rule.expected}
                    aria-label={`Carga de ${WEEKDAY_LABELS[rule.weekday]}`}
                    onChange={(event) =>
                      setRules((current) =>
                        current.map((item) =>
                          item.weekday === rule.weekday ? { ...item, expected: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    type="time"
                    value={rule.firstOvertime}
                    aria-label={`Primeiras horas a 50% de ${WEEKDAY_LABELS[rule.weekday]}`}
                    onChange={(event) =>
                      setRules((current) =>
                        current.map((item) =>
                          item.weekday === rule.weekday
                            ? { ...item, firstOvertime: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              ))}
              <div className="grid grid-cols-[1fr_120px_140px] text-xs text-slate-500">
                <span />
                <span>Carga</span>
                <span>Primeiras horas a 50%</span>
              </div>
            </div>
            <Button
              className="mt-4"
              disabled={isPending}
              onClick={() =>
                saveJourney({
                  companyId,
                  toleranceMinutes: tolerance,
                  nightStart,
                  nightEnd,
                  rules,
                })
              }
            >
              Salvar jornada
            </Button>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold">Feriados</h3>
            <div className="mt-3 grid gap-2">
              <Input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} />
              <Input
                value={holidayName}
                placeholder="Nome do feriado"
                onChange={(event) => setHolidayName(event.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!holidayDate || holidayName.trim().length < 3) {
                    toast.error("Informe a data e o nome do feriado");
                    return;
                  }
                  createHoliday({ companyId, date: holidayDate, name: holidayName });
                }}
              >
                Adicionar feriado
              </Button>
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                type="number"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              />
              <Button variant="outline" onClick={() => importHolidays({ companyId, year })}>
                Importar nacionais
              </Button>
            </div>
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {holidays.length === 0 && <li className="py-3 text-sm text-slate-500">Nenhum feriado.</li>}
              {holidays.map((holiday) => (
                <li key={holiday.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {formatDateBR(holiday.holidayDate)} · {holiday.name}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeHoliday({ id: holiday.id })}>
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
