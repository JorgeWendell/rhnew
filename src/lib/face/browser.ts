"use client";

let loading: Promise<typeof import("@vladmandic/face-api")> | null = null;

export function loadFaceApi() {
  if (!loading) {
    loading = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      return faceapi;
    })().catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }

  return loading;
}

export async function detectDescriptor(video: HTMLVideoElement) {
  const faceapi = await loadFaceApi();
  const detection = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }),
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return Array.from(detection.descriptor);
}

export async function startUserCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function cameraErrorMessage(error: unknown) {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "A câmera do Chrome só abre em HTTPS ou em localhost. No celular, acesse o endereço HTTPS do servidor.";
  }
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Permissão da câmera negada. Autorize o acesso nas configurações do navegador.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "Nenhuma câmera foi encontrada neste dispositivo.";
  }
  return "Não foi possível abrir a câmera.";
}

export function snapshot(video: HTMLVideoElement) {
  const width = 240;
  const height = Math.max(1, Math.round((video.videoHeight || 180) * (width / (video.videoWidth || 240))));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context?.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.72);
}
