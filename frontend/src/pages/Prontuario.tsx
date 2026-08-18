import { Placeholder } from "./Placeholder";

export function Prontuario() {
  return (
    <Placeholder
      title="Prontuário"
      subtitle="Histórico clínico por paciente"
      description="Anotações de consulta, evolução clínica e histórico completo do paciente, integrados à agenda."
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      }
    />
  );
}
