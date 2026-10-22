import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isServiceCall, safeEqual } from "./serviceAuth.ts";

function req(headers: Record<string, string>) {
    return new Request("https://x.supabase.co/functions/v1/f", { method: "POST", headers });
}

function setEnv(service?: string, cron?: string) {
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    Deno.env.delete("EVA_CRON_SECRET");
    if (service) Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", service);
    if (cron) Deno.env.set("EVA_CRON_SECRET", cron);
}

Deno.test("safeEqual: iguais, diferentes e tamanhos diferentes", () => {
    assertEquals(safeEqual("abc", "abc"), true);
    assertEquals(safeEqual("abc", "abd"), false);
    assertEquals(safeEqual("abc", "abcd"), false);
    assertEquals(safeEqual("", ""), true);
});

Deno.test("service_role no Bearer passa", () => {
    setEnv("svc-key", "cron-1");
    assertEquals(isServiceCall(req({ Authorization: "Bearer svc-key" })), true);
});

Deno.test("cron secret passa mesmo com anon key no Bearer", () => {
    setEnv("svc-key", "cron-1");
    assertEquals(isServiceCall(req({ Authorization: "Bearer anon-key", "x-cron-secret": "cron-1" })), true);
});

Deno.test("anon key, JWT de usuário ou nada não passam", () => {
    setEnv("svc-key", "cron-1");
    assertEquals(isServiceCall(req({ Authorization: "Bearer anon-key" })), false);
    assertEquals(isServiceCall(req({ Authorization: "Bearer eyJ.user.jwt" })), false);
    assertEquals(isServiceCall(req({ "x-cron-secret": "errado" })), false);
    assertEquals(isServiceCall(req({})), false);
});

Deno.test("segredo ausente no ambiente nunca casa com header vazio", () => {
    setEnv(undefined, undefined);
    assertEquals(isServiceCall(req({ Authorization: "Bearer ", "x-cron-secret": "" })), false);
});
