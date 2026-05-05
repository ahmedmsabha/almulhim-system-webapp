// SETUP REQUIRED:
// 1. في Supabase Dashboard → Edge Functions → send-push → Secrets
//    أضف: PUSH_INTERNAL_SECRET = <أي نص عشوائي طويل>
// 2. في Supabase SQL Editor شغّل:
//    ALTER DATABASE postgres
//      SET app.push_internal_secret = '<نفس القيمة>';
// 3. npx supabase functions deploy send-push --no-verify-jwt

import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

type PushPayload = {
  userIds: string[] | "all"
  title: string
  body: string
  url?: string
  icon?: string
}

type SubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  })
}

function isWebPushHttpError(err: unknown): err is { statusCode: number } {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
  )
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const token = (req.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim()
  const secret = Deno.env.get("PUSH_INTERNAL_SECRET") ?? ""
  if (!token || token !== secret) return unauthorized()

  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@example.com"
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!publicKey?.trim() || !privateKey?.trim() || !supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  webpush.setVapidDetails(subject, publicKey.trim(), privateKey.trim())

  let payload: PushPayload
  try {
    payload = (await req.json()) as PushPayload
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (
    typeof payload.title !== "string" ||
    typeof payload.body !== "string" ||
    (payload.userIds !== "all" && !Array.isArray(payload.userIds)) ||
    (Array.isArray(payload.userIds) &&
      payload.userIds.some((id) => typeof id !== "string"))
  ) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const subsResult =
    payload.userIds === "all" ?
      await supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth")
    : payload.userIds.length === 0 ?
      { data: [] as SubscriptionRow[], error: null }
    : await supabase
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .in("user_id", payload.userIds)

  const { data: rows, error: fetchErr } = subsResult

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const list = rows ?? []
  let sent = 0
  let failed = 0

  const pushBody = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/student",
    icon: payload.icon,
  })

  for (const row of list) {
    const pushSub = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    }

    try {
      await webpush.sendNotification(pushSub, pushBody)
      sent++
    } catch (e: unknown) {
      failed++
      const code = isWebPushHttpError(e) ? e.statusCode : undefined
      if (code === 410 || code === 404) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint)
      }
    }
  }

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
