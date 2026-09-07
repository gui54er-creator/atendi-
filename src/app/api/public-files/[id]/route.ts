import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serve logos/avatares gravados como FileBlob (fallback sem R2 configurado —
// ver lib/storage.ts). Sem autenticação de propósito: é o equivalente a uma
// URL pública de bucket, usada apenas para ativos de marca não sensíveis
// (nunca para arquivos de paciente, que ficam em /api/files/[id]).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const blob = await prisma.fileBlob.findUnique({
    where: { id: params.id },
    select: { data: true, mimeType: true },
  });

  if (!blob) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
