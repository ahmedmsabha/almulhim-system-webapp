import { AdminMessagesClient } from "./admin-messages-client"
import { getConversationsForAdmin } from "@/lib/db/queries/messages"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"

export default async function MessagesPage() {
  const { profile } = await requireAdminLayoutContext()
  const conversations = await getConversationsForAdmin()

  return (
    <AdminMessagesClient
      adminId={profile.id}
      adminName={profile.full_name}
      initialConversations={conversations}
    />
  )
}
