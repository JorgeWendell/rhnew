"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cameraErrorMessage,
  detectDescriptor,
  playStream,
  snapshot,
} from "@/lib/face/browser";

export function FaceCaptureDialog({
  open,
  stream,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  stream: MediaStream | null;
  onOpenChange: (open: boolean) => void;
  onCapture: (payload: { descriptor: number[]; photo: string }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const descriptorRef = useRef<number[] | null>(null);
  const [message, setMessage] = useState("Abrindo a câmera...");
  const [ready, setReady] = useState(false);

  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (!node || !stream) return;

    let cancelled = false;
    setReady(false);
    setMessage("Abrindo a câmera...");
    descriptorRef.current = null;

    void (async () => {
      try {
        await playStream(node, stream);
        if (cancelled || videoRef.current !== node) return;
        setMessage("Posicione o rosto dentro da marcação");
      } catch (error) {
        if (!cancelled) setMessage(cameraErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
      if (node.srcObject === stream) node.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let timer = 0;

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
        descriptorRef.current = descriptor;
        setReady(Boolean(descriptor));
        setMessage(descriptor ? "Rosto encontrado. Pode capturar." : "Nenhum rosto detectado");
      } catch {
        if (!cancelled) setMessage("Carregando o reconhecimento facial...");
      }
      timer = window.setTimeout(tick, 700);
    };

    timer = window.setTimeout(tick, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-none items-center justify-center rounded-none bg-slate-950/80 p-4 shadow-none ring-0 animate-none data-closed:animate-none data-open:animate-none sm:max-w-none"
        style={{ transform: "none", translate: "none", animation: "none" }}
      >
        <div className="w-full max-w-xl rounded-xl bg-white p-4 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Registrar facial</DialogTitle>
            <DialogDescription>
              Use um ambiente iluminado e olhe de frente para a câmera.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-4 overflow-hidden rounded-xl bg-slate-950">
            {open ? (
              <video
                ref={attachVideo}
                autoPlay
                muted
                playsInline
                className="aspect-[4/3] w-full bg-slate-950 object-cover"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-36 w-24 rounded-[999px] border-4 border-white/80 sm:h-56 sm:w-40" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">{message}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!ready}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
