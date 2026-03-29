import { prisma } from "@/lib/db";
import ProfilePicker from "@/components/ProfilePicker";

export default async function ProfilePage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, avatarFilename: true },
    orderBy: { id: "asc" },
  });
  return <ProfilePicker users={users} />;
}
