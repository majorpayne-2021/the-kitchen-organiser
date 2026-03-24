import Link from "next/link";
import { prisma } from "@/lib/db";
import { createGiftHamper } from "@/actions/gift-actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default async function GiftsPage() {
  const hampers = await prisma.giftHamper.findMany({
    include: { items: true },
    orderBy: { giftDate: "asc" },
  });

  const today = new Date().toISOString().split("T")[0];
  const upcoming = hampers.filter((h) => !h.giftDate || h.giftDate >= today);
  const past = hampers.filter((h) => h.giftDate && h.giftDate < today);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-medium">Gift Hampers</h1>
      </div>

      {/* Inline create form */}
      <Card className="p-4 mb-6">
        <form action={createGiftHamper} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Input name="title" label="New Hamper" placeholder="e.g. Birthday Gift" required />
          </div>
          <div>
            <Input name="giftDate" label="Date" type="date" />
          </div>
          <Button type="submit" size="md">
            Create
          </Button>
        </form>
      </Card>

      {hampers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-warm-600 text-lg">No gift hampers yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">Upcoming</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((hamper) => {
                  const checked = hamper.items.filter((i) => i.checked).length;
                  const total = hamper.items.length;
                  return (
                    <Link key={hamper.id} href={`/gifts/${hamper.id}`}>
                      <Card className="p-4 hover:shadow-md transition-shadow">
                        <h3 className="font-serif text-lg font-semibold text-warm-800 mb-1">
                          {hamper.title}
                        </h3>
                        {hamper.giftDate && (
                          <p className="text-sm text-warm-600 mb-2">{hamper.giftDate}</p>
                        )}
                        {total > 0 && (
                          <div>
                            <div className="flex justify-between text-xs text-warm-600 mb-1">
                              <span>
                                {checked} of {total} items
                              </span>
                              <span>{Math.round((checked / total) * 100)}%</span>
                            </div>
                            <div className="w-full bg-warm-100 rounded-full h-2">
                              <div
                                className="bg-accent h-2 rounded-full transition-all"
                                style={{ width: `${(checked / total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">Past</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map((hamper) => (
                  <Link key={hamper.id} href={`/gifts/${hamper.id}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow opacity-75">
                      <h3 className="font-serif text-lg font-semibold text-warm-800 mb-1">
                        {hamper.title}
                      </h3>
                      {hamper.giftDate && (
                        <p className="text-sm text-warm-600">{hamper.giftDate}</p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
