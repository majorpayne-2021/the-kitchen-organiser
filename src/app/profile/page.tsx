import Image from "next/image";
import { prisma } from "@/lib/db";
import { setCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import AvatarUpload from "@/components/AvatarUpload";

export default async function ProfilePage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, avatarFilename: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-warm-50">
      <h1 className="font-serif text-4xl font-semibold text-warm-800 mb-2">
        The Kitchen Organiser
      </h1>
      <p className="text-warm-600 mb-12">Who&apos;s cooking?</p>
      <div className="flex gap-8">
        {users.map((user) => (
          <div key={user.id} className="flex flex-col items-center gap-3">
            <form
              action={async () => {
                "use server";
                await setCurrentUserId(user.id);
                redirect("/");
              }}
            >
              <button
                type="submit"
                className="flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-28 h-28 rounded-full bg-accent flex items-center justify-center text-3xl font-semibold text-white overflow-hidden transition-transform group-hover:scale-105">
                  {user.avatarFilename ? (
                    <Image
                      src={`/avatars/${user.avatarFilename}`}
                      alt={user.name}
                      width={112}
                      height={112}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-warm-800 font-medium text-lg group-hover:text-accent transition-colors">
                  {user.name}
                </span>
              </button>
            </form>
            <AvatarUpload userId={user.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
