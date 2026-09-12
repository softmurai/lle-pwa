declare global {
  namespace Cloudflare {
    interface Env {
      IMPORT_CSV_URL: string;
      IMPORT_SECRET: string;
    }
  }
}

export {};