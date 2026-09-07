import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Arquivos de pacientes (fotos/documentos) NUNCA são públicos — são servidos
// por uma rota autenticada que valida a empresa/paciente antes de devolver os
// bytes (ver /api/files/[id]). Logos e avatares, por serem ativos de marca
// não sensíveis, vão para o prefixo "public/" do bucket.
//
// Armazenamento em nuvem (Cloudflare R2) é usado quando as variáveis R2_*
// estão configuradas; caso contrário cai para disco local, apenas para não
// bloquear o build/deploy enquanto o R2 não é configurado. O fallback em
// disco NÃO funciona de forma confiável em produção na Netlify (funções
// serverless têm sistema de arquivos somente leitura fora de /tmp, e não
// compartilham nada entre invocações) — é só um modo degradado temporário.
// Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET_NAME e R2_PUBLIC_URL para reativar o armazenamento em nuvem.
const PRIVATE_PREFIX = "private";
const PUBLIC_PREFIX = "public";

const PRIVATE_ROOT = path.join(process.cwd(), "storage", "uploads");
const PUBLIC_ROOT = path.join(process.cwd(), "public", "uploads");

function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${getEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

function getBucket(): string {
  return getEnv("R2_BUCKET_NAME");
}

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

/** Salva um arquivo privado (R2 se configurado, senão disco local), sob uma chave não previsível. */
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
  const storageKey = [scopeDir, filename].join("/");

  if (isR2Configured()) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: `${PRIVATE_PREFIX}/${storageKey}`,
        Body: buffer,
        ContentType: mimeType,
      })
    );
  } else {
    const dir = path.join(PRIVATE_ROOT, scopeDir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
  }

  return { storageKey };
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
  if (isR2Configured()) {
    const response = await getClient().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: `${PRIVATE_PREFIX}/${storageKey}`,
      })
    );

    const body = response.Body;
    if (!body) throw new Error("Arquivo não encontrado no armazenamento.");

    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  const resolved = path.join(PRIVATE_ROOT, storageKey);
  if (!resolved.startsWith(PRIVATE_ROOT)) {
    throw new Error("Caminho de arquivo inválido.");
  }
  return readFile(resolved);
}

export async function deletePrivateFile(storageKey: string): Promise<void> {
  if (isR2Configured()) {
    await getClient()
      .send(
        new DeleteObjectCommand({
          Bucket: getBucket(),
          Key: `${PRIVATE_PREFIX}/${storageKey}`,
        })
      )
      .catch(() => undefined);
    return;
  }

  const resolved = path.join(PRIVATE_ROOT, storageKey);
  if (!resolved.startsWith(PRIVATE_ROOT)) return;
  await unlink(resolved).catch(() => undefined);
}

/** Logos/avatares: ativos não sensíveis (R2 se configurado, senão /public local). */
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

  if (isR2Configured()) {
    const key = `${PUBLIC_PREFIX}/${scopeDir}/${filename}`;
    await getClient().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const publicUrl = getEnv("R2_PUBLIC_URL").replace(/\/$/, "");
    return { url: `${publicUrl}/${key}` };
  }

  const dir = path.join(PUBLIC_ROOT, scopeDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${scopeDir}/${filename}` };
}
