/** Minimal typings for Supabase Edge (Deno) APIs used in this repo's functions. */
declare namespace Deno {
  namespace env {
    export function get(key: string): string | undefined
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void
}
