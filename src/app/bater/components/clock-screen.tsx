"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  cameraErrorMessage,
  detectDescriptor,
  startUserCamera,
  stopStream,
} from "@/lib/face/browser";
import { PUNCH_TYPES, duplicatePunchMessage, punchLabel, type PunchType } from "@/lib/ponto/constants";

type TodayPunch = { type: PunchType; label: string; time: string };

type Match = {
  employee: {
    id: string;
    name: string;
    registration: string;
    companyName: string;
    photo: string | null;
  };
  today: TodayPunch[];
  suggested: PunchType | null;
};

export function ClockScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const descriptorRef = useRef<number[] | null>(null);
  const [now, setNow] = useState(new Date());
  const [message, setMessage] = useState("Preparando a câmera...");
  const [phase, setPhase] = useState<"scan" | "confirm">("scan");
  const [match, setMatch] = useState<Match | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const blockedIdRef = useRef<string | null>(null);
  const faceGoneSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const video = videoRef.current;
        if (!video) return;
        streamRef.current = await startUserCamera(video);
        if (cancelled) stopStream(streamRef.current);
        else setMessage("Olhe para a câmera");
      } catch (error) {
        if (!cancelled) setMessage(cameraErrorMessage(error));
      }
    };
    void start();
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "scan") return;
    let cancelled = false;
    let timer = 0;
    let lastRequest = 0;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        timer = window.setTimeout(tick, 400);
        return;
      }

      try {
        const descriptor = await detectDescriptor(video);
        if (cancelled) return;
        if (!descriptor) {
          if (faceGoneSinceRef.current === null) faceGoneSinceRef.current = Date.now();
          if (blockedIdRef.current && Date.now() - faceGoneSinceRef.current > 800) {
            blockedIdRef.current = null;
          }
          if (blockedIdRef.current) setResult(null);
          setMessage(blockedIdRef.current ? "Ponto registrado. Próximo funcionário pode se aproximar." : "Posicione o rosto na marcação");
          timer = window.setTimeout(tick, 500);
          return;
        }
        faceGoneSinceRef.current = null;

        const current = Date.now();
        if (current - lastRequest < 1200) {
          timer = window.setTimeout(tick, 400);
          return;
        }
        lastRequest = current;
        if (!blockedIdRef.current) setMessage("Conferindo facial...");
        const response = await fetch("/api/ponto/identificar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptor }),
        });
        const data = (await response.json()) as {
          match: boolean;
          message?: string;
          employee?: Match["employee"];
          today?: TodayPunch[];
          suggested?: PunchType | null;
        };
        if (cancelled) return;
        if (data.match && data.employee) {
          if (data.employee.id === blockedIdRef.current) {
            setResult(null);
            setMessage("Ponto registrado. Afaste-se para o próximo funcionário.");
            timer = window.setTimeout(tick, 700);
            return;
          }
          blockedIdRef.current = null;
          descriptorRef.current = descriptor;
          setResult(null);
          setMatch({
            employee: data.employee,
            today: data.today ?? [],
            suggested: data.suggested ?? null,
          });
          setPhase("confirm");
          setMessage("Confirme a marcação");
          return;
        }
        setMessage(data.message || "Rosto não reconhecido");
      } catch {
        if (!cancelled) setMessage("Falha ao consultar o reconhecimento");
      }
      timer = window.setTimeout(tick, 500);
    };

    timer = window.setTimeout(tick, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase]);

  const punch = async (type: PunchType) => {
    if (!match || !descriptorRef.current) return;
    setSaving(true);
    try {
      const response = await fetch("/api/ponto/bater", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: match.employee.id,
          descriptor: descriptorRef.current,
          type,
        }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string; time?: string; label?: string };
      if (!response.ok || !data.success) {
        setMessage(data.message || "Não foi possível gravar o ponto");
        setSaving(false);
        return;
      }
      blockedIdRef.current = match.employee.id;
      faceGoneSinceRef.current = null;
      descriptorRef.current = null;
      setMatch(null);
      setPhase("scan");
      setResult(`${data.label} registrada às ${data.time}`);
      setMessage("Próximo funcionário pode se aproximar.");
      navigator.vibrate?.(80);
    } catch {
      setMessage("Não foi possível gravar o ponto");
    } finally {
      setSaving(false);
    }
  };

  const clock = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(now);

  const confirming = Boolean(match && phase !== "scan");

  return (
    <main className="fixed inset-0 mx-auto flex w-full max-w-lg flex-col overflow-hidden bg-slate-950 px-3 py-3 text-white sm:px-4">
      <div className="mb-2 flex shrink-0 items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-blue-300">RH PONTO</p>
          <h1 className="text-xl font-bold">Bater ponto</h1>
        </div>
        <p className="font-mono text-2xl">{clock}</p>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-28 rounded-[999px] border-4 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)] sm:h-64 sm:w-44" />
        </div>
      </div>
      <p className="mt-2 shrink-0 text-center text-sm text-slate-300">{result || message}</p>

      {confirming && match && (
        <section className="mt-2 shrink-0 rounded-2xl bg-slate-900 p-3">
          <div className="flex items-center gap-3">
            {match.employee.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.employee.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-slate-800" />
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{match.employee.name}</p>
              <p className="truncate text-xs text-slate-400">
                {match.employee.companyName} · #{match.employee.registration}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-slate-300">
            {match.today.length === 0 && <p>Nenhuma marcação hoje.</p>}
            {match.today.map((item) => (
              <p key={`${item.type}-${item.time}`}>
                {item.label}: {item.time}
              </p>
            ))}
          </div>
          {match.suggested && (
            <Button
              className="mt-2 h-12 w-full bg-blue-600 text-base text-white hover:bg-blue-500"
              disabled={saving}
              onClick={() => punch(match.suggested!)}
            >
              {punchLabel(match.suggested)}
            </Button>
          )}
          {!match.suggested && (
            <p className="mt-2 text-xs text-emerald-300">As quatro marcações de hoje já foram feitas.</p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PUNCH_TYPES.map((type) => {
              const used = match.today.some((item) => item.type === type.value);
              return (
                <Button
                  key={type.value}
                  variant="outline"
                  className="h-10 border-slate-700 bg-transparent text-sm text-white hover:bg-slate-800"
                  disabled={saving || used || type.value === match.suggested}
                  onClick={() => {
                    if (used) {
                      setMessage(duplicatePunchMessage(type.value));
                      return;
                    }
                    void punch(type.value);
                  }}
                >
                  {type.label}
                </Button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            className="mt-1 h-8 w-full text-slate-300"
            onClick={() => {
              setMatch(null);
              setPhase("scan");
              setMessage("Olhe para a câmera");
            }}
          >
            Não sou esta pessoa
          </Button>
        </section>
      )}
      {!confirming && (
        <Link href="/login" className="shrink-0 pt-3 text-center text-xs text-slate-500">
          Área administrativa
        </Link>
      )}
    </main>
  );
}
