import { HeartPulse } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-indigo-800 p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <HeartPulse className="h-5 w-5" />
          </span>
          Atendi+
        </div>
        <div className="relative space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Gestão completa de atendimentos, em um só lugar.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Pacientes, prontuários, agenda e financeiro organizados com a
            simplicidade que sua rotina precisa.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Atendi+. Todos os direitos reservados.
        </p>
      </div>
      <div className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
