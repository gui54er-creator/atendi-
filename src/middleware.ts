export { default } from "next-auth/middleware";

// A checagem de "empresa ativa" (multi-tenant) acontece no layout do grupo
// (app), pois exige consulta ao banco — middleware roda em Edge runtime e
// aqui cuida apenas de exigir usuário autenticado.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/agenda/:path*",
    "/financial/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
