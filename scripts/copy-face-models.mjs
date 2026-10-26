import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules/@vladmandic/face-api/model");
const destination = join(root, "public/models");

const files = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model.bin",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin",
];

mkdirSync(destination, { recursive: true });

for (const file of files) {
  cpSync(join(source, file), join(destination, file));
}

console.log(`Modelos faciais copiados para ${destination}`);
