// Public OpenAPI document route — serves the repo's canonical spec
// (docs/api/openapi.yaml, embedded at build time by generate:openapi) so
// the Scalar reference at /docs/api and external consumers read one URL.
import { openApiYaml } from "@/generated/openapi";

// Static content — prerendered at build time.
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(openApiYaml, {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
    },
  });
}
