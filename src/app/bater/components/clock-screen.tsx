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
import { PUNCH_TYPES, punchLabel, type PunchType } from "@/lib/ponto/constants";

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
  const [phase, setPhase] = useState<"scan" | "confirm" | "done">("scan");
  const [match, setMatch] = useState<Match | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
          setMessage("Posicione o rosto na marcação");
          timer = window.setTimeout(tick, 500);
          return;
        }

        const current = Date.now();
        if (current - lastRequest < 1200) {
          timer = window.setTimeout(tick, 400);
          return;
        }
        lastRequest = current;
        setMessage("Conferindo facial...");
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
          descriptorRef.current = descriptor;
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
      setResult(`${data.label} registrada às ${data.time}`);
      setPhase("done");
      navigator.vibrate?.(80);
      window.setTimeout(() => {
        setMatch(null);
        setResult(null);
        setPhase("scan");
        setMessage("Olhe para a câmera");
      }, 2500);
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-slate-950 px-4 py-6 text-white">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-blue-300">RH PONTO</p>
          <h1 className="text-2xl font-bold">Bater ponto</h1>
        </div>
        <p className="font-mono text-3xl">{clock}</p>
      </div>
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="aspect-[3/4] w-full -scale-x-100 object-cover sm:aspect-video" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-44 rounded-[999px] border-4 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-slate-300">{result || message}</p>

      {match && phase !== "scan" && (
        <section className="mt-4 rounded-2xl bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            {match.employee.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.employee.photo} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-800" />
            )}
            <div>
              <p className="text-lg font-semibold">{match.employee.name}</p>
              <p className="text-sm text-slate-400">
                {match.employee.companyName} · #{match.employee.registration}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
            {match.today.length === 0 && <p>Nenhuma marcação hoje.</p>}
            {match.today.map((item) => (
              <p key={`${item.type}-${item.time}`}>
                {item.label}: {item.time}
              </p>
            ))}
          </div>
          {match.suggested && (
            <Button
              className="mt-4 h-16 w-full bg-blue-600 text-lg text-white hover:bg-blue-500"
              disabled={saving}
              onClick={() => punch(match.suggested!)}
            >
              {punchLabel(match.suggested)}
            </Button>
          )}
          {!match.suggested && (
            <p className="mt-4 text-sm text-emerald-300">As quatro marcações de hoje já foram feitas. Escolha uma para registrar de novo.</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PUNCH_TYPES.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                className="h-12 border-slate-700 bg-transparent text-white hover:bg-slate-800"
                disabled={saving || type.value === match.suggested}
                onClick={() => punch(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full text-slate-300"
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
      <Link href="/login" className="mt-auto pt-6 text-center text-xs text-slate-500">
        Área administrativa
      </Link>
    </main>
  );
}
