"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { HeartPulse, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/permissions";
import { getInitials } from "@/lib/utils";
import type { CompanyRole } from "@prisma/client";

export function UserMenu({
  userName,
  userEmail,
  userAvatarUrl,
  companyName,
  companyLogoUrl,
  role,
}: {
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  companyName: string;
  companyLogoUrl?: string | null;
  role: CompanyRole;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full ring-offset-2 transition-shadow hover:ring-2 hover:ring-ring">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userAvatarUrl ?? undefined} alt={userName} />
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          {companyLogoUrl ? (
            <Image
              src={companyLogoUrl}
              alt={companyName}
              width={32}
              height={32}
              className="rounded-md object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HeartPulse className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{companyName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-normal text-muted-foreground">{userEmail}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/settings">Configurações</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
