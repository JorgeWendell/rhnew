"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cameraErrorMessage,
  detectDescriptor,
  snapshot,
  startUserCamera,
  stopStream,
} from "@/lib/face/browser";

export function FaceCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (payload: { descriptor: number[]; photo: string }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const descriptorRef = useRef<number[] | null>(null);
  const [message, setMessage] = useState("Abrindo a câmera...");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    descriptorRef.current = null;
    setReady(false);
    setMessage("Abrindo a câmera...");

    const start = async () => {
      try {
        const video = videoRef.current;
        if (!video) return;
        streamRef.current = await startUserCamera(video);
        if (cancelled) {
          stopStream(streamRef.current);
          return;
        }
        setMessage("Posicione o rosto dentro da marcação");
      } catch (error) {
        if (!cancelled) setMessage(cameraErrorMessage(error));
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer = 0;

    const tick = async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
        timer = window.setTimeout(tick, 500);
        return;
      }
      try {
        const descriptor = await detectDescriptor(videoRef.current);
        if (cancelled) return;
        descriptorRef.current = descriptor;
        setReady(Boolean(descriptor));
        setMessage(descriptor ? "Rosto encontrado. Pode capturar." : "Nenhum rosto detectado");
      } catch {
        if (!cancelled) setMessage("Não foi possível carregar o reconhecimento facial");
      }
      timer = window.setTimeout(tick, 700);
    };

    timer = window.setTimeout(tick, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar facial</DialogTitle>
          <DialogDescription>
            Use um ambiente iluminado e olhe de frente para a câmera.
          </DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-xl bg-slate-950">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full -scale-x-100 object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-40 rounded-[999px] border-4 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.45)]" />
          </div>
        </div>
        <p className="text-sm text-slate-500">{message}</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!ready || !descriptorRef.current}
            onClick={() => {
              const video = videoRef.current;
              const descriptor = descriptorRef.current;
              if (!video || !descriptor) return;
              onCapture({ descriptor, photo: snapshot(video) });
              onOpenChange(false);
            }}
          >
            Usar esta foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
