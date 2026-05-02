import type { DemoStudent, Profile, Subscription } from "@/types"

type StudentAdminRow = Profile & {
  subscriptions: Subscription[]
  hasDeviceBinding: boolean
}

function planLabelToDemoType(planName: string | null | undefined): Exclude<
  DemoStudent["subscriptionType"],
  "pending"
> {
  const n = (planName ?? "").toLowerCase()
  if (
    n.includes("شهري") ||
    n.includes("monthly") ||
    n.includes("شهر") ||
    n.includes("30")
  ) {
    return "monthly"
  }
  if (
    n.includes("فصل") ||
    n.includes("ترم") ||
    n.includes("term") ||
    n.includes("semester")
  ) {
    return "term"
  }
  return "premium"
}

export function mapProfileRowToDemoStudent(r: StudentAdminRow): DemoStudent {
  const sub = r.subscriptions[0]
  const accessActive =
    !!sub && (sub.status === "active" || sub.status === "expiring_soon")

  const subscriptionType: DemoStudent["subscriptionType"] =
    accessActive ? planLabelToDemoType(sub.plan_name) : "pending"

  return {
    id: r.id,
    name: r.full_name,
    email: r.email,
    phone: r.phone,
    isActive: accessActive,
    subscriptionType,
    subscriptionEndDate: sub?.end_date ?? null,
    subscriptionRecordId: sub?.id ?? null,
    subscriptionPlanId: sub?.plan_id ?? null,
    subscriptionStartDate: sub?.start_date ?? null,
    subscriptionDbStatus: sub?.status ?? null,
    createdAt: r.created_at,
    hasDeviceBinding: r.hasDeviceBinding ?? false,
  }
}
