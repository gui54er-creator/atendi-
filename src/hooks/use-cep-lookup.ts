import { useState } from "react";
import { lookupCep, type CepResult } from "@/lib/cep";

export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function search(cep: string): Promise<CepResult | null> {
    setLoading(true);
    setNotFound(false);
    try {
      const result = await lookupCep(cep);
      if (!result) setNotFound(true);
      return result;
    } finally {
      setLoading(false);
    }
  }

  return { search, loading, notFound };
}
