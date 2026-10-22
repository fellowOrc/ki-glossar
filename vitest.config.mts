import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests prüfen nur reine Logik (keine Datenbank, kein Netz). Sie bilden das
// Sicherheitsnetz für Refactorings: Was heute gilt, muss nach jedem Umbau
// weiterhin gelten.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
