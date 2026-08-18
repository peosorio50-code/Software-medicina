import { Layout } from "../components/Layout";
import { InvoicesManager } from "../components/InvoicesManager";

export function NFSe() {
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>NFSe</h1>
          <p>Notas fiscais de serviço emitidas pelo consultório.</p>
        </div>
      </div>
      <InvoicesManager title="Notas fiscais" />
    </Layout>
  );
}
