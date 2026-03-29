import Link from "next/link";
import { prisma } from "@/lib/db";
import Card from "@/components/ui/Card";

export default async function EventPlansPage() {
  const events = await prisma.mealPlan.findMany({
    where: { planType: "event" },
    include: { items: true, invitees: true },
    orderBy: { eventDate: "asc" },
  });

  const today = new Date().toISOString().split("T")[0];
  const upcoming = events.filter((e) => !e.eventDate || e.eventDate >= today);
  const past = events.filter((e) => e.eventDate && e.eventDate < today);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-medium">Events</h1>
        <Link
          href="/meal-plans/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-card hover:bg-accent-hover transition-colors"
        >
          + New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-warm-600 text-lg mb-4">No events yet</p>
          <Link
            href="/meal-plans/new"
            className="text-accent font-medium hover:text-accent-hover"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">
                Upcoming
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((event) => (
                  <Link key={event.id} href={`/event-plans/${event.id}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-serif text-lg font-semibold text-warm-800 mb-1">
                        {event.name}
                      </h3>
                      {event.eventDate && (
                        <p className="text-sm text-warm-600">
                          {event.eventDate}
                          {event.eventTime ? ` at ${event.eventTime}` : ""}
                        </p>
                      )}
                      <p className="text-xs text-warm-600 mt-1">
                        {event.items.length} menu item{event.items.length !== 1 ? "s" : ""} &middot;{" "}
                        {event.invitees.length} guest{event.invitees.length !== 1 ? "s" : ""}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">
                Past Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map((event) => (
                  <Link key={event.id} href={`/event-plans/${event.id}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow opacity-75">
                      <h3 className="font-serif text-lg font-semibold text-warm-800 mb-1">
                        {event.name}
                      </h3>
                      {event.eventDate && (
                        <p className="text-sm text-warm-600">{event.eventDate}</p>
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
