import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://127.0.0.1:4321",
    // The Chrome already installed on the machine, so no browser download is needed.
    channel: "chrome",
    locale: "en-US",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
  },
});
