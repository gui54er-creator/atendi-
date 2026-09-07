import "server-only";
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
// não sensíveis, vão para o prefixo "public/" do bucket, que é exposto via
// R2_PUBLIC_URL (domínio público do bucket ou domínio customizado).
//
// Tudo fica no mesmo bucket Cloudflare R2 (S3-compatível) em vez de disco
// local, para que o mesmo conteúdo esteja disponível de qualquer dispositivo.
const PRIVATE_PREFIX = "private";
const PUBLIC_PREFIX = "public";

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

/** Salva um arquivo privado no bucket, sob uma chave (nome) não previsível. */
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

  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: `${PRIVATE_PREFIX}/${storageKey}`,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return { storageKey };
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
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

export async function deletePrivateFile(storageKey: string): Promise<void> {
  await getClient()
    .send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: `${PRIVATE_PREFIX}/${storageKey}`,
      })
    )
    .catch(() => undefined);
}

/** Logos/avatares: ativos não sensíveis, expostos via URL pública do bucket. */
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
