import { InvoicesManager } from "../components/InvoicesManager";

export function NFSe() {
  return (
    <section>
      <div className="page-header">
        <div>
          <h1>NFSe</h1>
          <p>Notas fiscais de serviço emitidas pelo consultório.</p>
        </div>
      </div>
      <InvoicesManager title="Notas fiscais" />
    </section>
  );
}
