import { prisma } from "@/lib/db";
import { addBraindump, deleteBraindump } from "@/actions/braindump-actions";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default async function BraindumpPage() {
  const entries = await prisma.braindump.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-6">Brain Dump</h1>

      {/* Add note form */}
      <Card className="p-4 mb-6">
        <form action={addBraindump} className="space-y-3">
          <textarea
            name="content"
            placeholder="What's on your mind? Jot it down..."
            required
            rows={3}
            className="w-full px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-y"
          />
          <Button type="submit">Add Note</Button>
        </form>
      </Card>

      {/* Notes list */}
      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              <p className="text-warm-800 whitespace-pre-wrap mb-2">{entry.content}</p>
              <div className="flex items-center justify-between text-xs text-warm-600">
                <span>
                  {entry.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {entry.createdAt.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await deleteBraindump(entry.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-warm-600 text-lg">
            Nothing here yet. Add your first note above!
          </p>
        </div>
      )}
    </div>
  );
}
