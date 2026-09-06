import { onlyDigits } from "@/lib/utils";

export interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

/**
 * Busca endereço a partir de um CEP usando a API pública ViaCEP.
 * Retorna null se o CEP for inválido/não encontrado — o formulário deve
 * permanecer editável manualmente nesse caso (nunca bloquear o cadastro).
 */
export async function lookupCep(cep: string): Promise<CepResult | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;

    return {
      cep: data.cep ?? digits,
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
