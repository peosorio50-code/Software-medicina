import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Os testes tocam o mesmo banco; rodar em série evita disputa entre eles.
    fileParallelism: false,
    env: { TZ: "America/Sao_Paulo" },
    setupFiles: ["dotenv/config"],
  },
});
