import "server-only";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

// Arquivos de pacientes (fotos/documentos) NUNCA são públicos — são servidos
// por uma rota autenticada que valida a empresa/paciente antes de devolver os
// bytes (ver /api/files/[id]). Logos e avatares, por serem ativos de marca
// não sensíveis, vão para /api/public-files/[id] (sem autenticação, mas com
// id não previsível — mesmo padrão de uma URL pública de bucket).
//
// Armazenamento em nuvem (Cloudflare R2) é usado quando as variáveis R2_*
// estão configuradas. Caso contrário, os bytes vão para a tabela FileBlob no
// próprio Postgres (Neon) — isso é o que garante sincronização entre
// dispositivos mesmo sem R2, já que a Netlify roda funções serverless com
// sistema de arquivos efêmero (gravar em disco local não persiste nem é
// compartilhado entre invocações). Guardar arquivos pequenos (fotos/PDFs,
// limitados por MAX_UPLOAD_SIZE_MB) como bytea é uma solução adequada para o
// volume de uma clínica/consultório; configure R2_ACCOUNT_ID,
// R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME e R2_PUBLIC_URL para
// migrar o armazenamento para um object storage dedicado quando fizer sentido.
const PRIVATE_PREFIX = "private";
const PUBLIC_PREFIX = "public";
const DB_KEY_PREFIX = "db:";

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

/** Salva um arquivo privado (R2 se configurado, senão FileBlob no Postgres), sob uma chave não previsível. */
export async function savePrivateFile(
  buffer: Buffer,
  mimeType: string,
  scopeDir: string
): Promise<{ storageKey: string }> {
  assertSafeMime(mimeType, ALLOWED_FILE_MIME_TYPES);
  if (buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Arquivo excede o tamanho máximo permitido.");
  }

  if (isR2Configured()) {
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

  const blob = await prisma.fileBlob.create({
    data: { mimeType, data: buffer },
    select: { id: true },
  });
  return { storageKey: `${DB_KEY_PREFIX}${blob.id}` };
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith(DB_KEY_PREFIX)) {
    const blob = await prisma.fileBlob.findUnique({
      where: { id: storageKey.slice(DB_KEY_PREFIX.length) },
      select: { data: true },
    });
    if (!blob) throw new Error("Arquivo não encontrado no armazenamento.");
    return Buffer.from(blob.data);
  }

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
  if (storageKey.startsWith(DB_KEY_PREFIX)) {
    await prisma.fileBlob
      .delete({ where: { id: storageKey.slice(DB_KEY_PREFIX.length) } })
      .catch(() => undefined);
    return;
  }

  await getClient()
    .send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: `${PRIVATE_PREFIX}/${storageKey}`,
      })
    )
    .catch(() => undefined);
}

/** Logos/avatares: ativos não sensíveis (R2 se configurado, senão FileBlob servido por /api/public-files/[id]). */
export async function savePublicImage(
  buffer: Buffer,
  mimeType: string,
  scopeDir: string
): Promise<{ url: string }> {
  assertSafeMime(mimeType, ALLOWED_IMAGE_MIME_TYPES);
  if (buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Arquivo excede o tamanho máximo permitido.");
  }

  if (isR2Configured()) {
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

  const blob = await prisma.fileBlob.create({
    data: { mimeType, data: buffer },
    select: { id: true },
  });
  return { url: `/api/public-files/${blob.id}` };
}
