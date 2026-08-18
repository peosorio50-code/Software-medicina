import { Placeholder } from "./Placeholder";

export function Financeiro() {
  return (
    <Placeholder
      title="Financeiro"
      subtitle="Pagamentos, convênios e recibos"
      description="Faturamento por consulta, convênios aceitos e emissão de recibos direto pela agenda."
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      }
    />
  );
}
