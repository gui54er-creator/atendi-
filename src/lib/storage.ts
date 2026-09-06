import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Arquivos de pacientes (fotos/documentos) NUNCA ficam em /public — são
// servidos por uma rota autenticada que valida a empresa/paciente antes de
// devolver os bytes (ver /api/files/[id]). Logos e avatares, por serem
// ativos de marca não sensíveis, ficam em /public/uploads.
const PRIVATE_ROOT = path.join(process.cwd(), "storage", "uploads");
const PUBLIC_ROOT = path.join(process.cwd(), "public", "uploads");

export const ALLOWED_FILE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const MAX_UPLOAD_SIZE_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function assertSafeMime(mimeType: string, allowed: readonly string[]) {
  if (!allowed.includes(mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${mimeType}`);
  }
}

/** Salva um arquivo fora de /public, sob uma chave (nome) não previsível. */
export async function savePrivateFile(
  buffer: Buffer,
  mimeType: string,
  scopeDir: string
): Promise<{ storageKey: string }> {
  assertSafeMime(mimeType, ALLOWED_FILE_MIME_TYPES);
  if (buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Arquivo excede o tamanho máximo permitido.");
  }

  const ext = EXTENSION_BY_MIME[mimeType] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(PRIVATE_ROOT, scopeDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return { storageKey: path.posix.join(scopeDir, filename) };
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
  const resolved = path.join(PRIVATE_ROOT, storageKey);
  if (!resolved.startsWith(PRIVATE_ROOT)) {
    throw new Error("Caminho de arquivo inválido.");
  }
  return readFile(resolved);
}

export async function deletePrivateFile(storageKey: string): Promise<void> {
  const resolved = path.join(PRIVATE_ROOT, storageKey);
  if (!resolved.startsWith(PRIVATE_ROOT)) return;
  await unlink(resolved).catch(() => undefined);
}

/** Logos/avatares: ativos não sensíveis, servidos diretamente via /public. */
export async function savePublicImage(
  buffer: Buffer,
  mimeType: string,
  scopeDir: string
): Promise<{ url: string }> {
  assertSafeMime(mimeType, ALLOWED_IMAGE_MIME_TYPES);
  if (buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Arquivo excede o tamanho máximo permitido.");
  }

  const ext = EXTENSION_BY_MIME[mimeType] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(PUBLIC_ROOT, scopeDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${scopeDir}/${filename}` };
}
