import { FACE_MATCH_MAX_DISTANCE } from "@/lib/ponto/constants";

export function parseDescriptor(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== 128) return null;

  const descriptor: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) return null;
    descriptor.push(item);
  }

  return descriptor;
}

export function euclidean(left: number[], right: number[]): number {
  let sum = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export type FaceCandidate = {
  id: string;
  descriptor: number[];
};

export function bestFaceMatch(descriptor: number[], candidates: FaceCandidate[]) {
  let best: { id: string; distance: number } | null = null;
  let second = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate.descriptor.length !== descriptor.length) continue;
    const distance = euclidean(descriptor, candidate.descriptor);
    if (!best || distance < best.distance) {
      second = best?.distance ?? Number.POSITIVE_INFINITY;
      best = { id: candidate.id, distance };
    } else if (distance < second) {
      second = distance;
    }
  }

  if (!best || best.distance > FACE_MATCH_MAX_DISTANCE) return null;
  if (Number.isFinite(second) && second - best.distance < 0.08) return null;
  return best;
}
