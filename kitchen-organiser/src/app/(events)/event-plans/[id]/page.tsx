import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { deleteMealPlan, addMealPlanItem, deleteMealPlanItem } from "@/actions/meal-plan-actions";
import {
  addInvitee,
  updateInvitee,
  deleteInvitee,
  addEventNote,
  deleteEventNote,
  deleteEventPhoto,
} from "@/actions/event-actions";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EventPhotoUpload from "@/components/EventPhotoUpload";

const EVENT_CATEGORIES = ["Savoury", "Salads & Sides", "Sweet", "Drinks"];

const RSVP_COLORS: Record<string, string> = {
  attending: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const event = await prisma.mealPlan.findUnique({
    where: { id },
    include: {
      items: {
        include: { recipe: true },
        orderBy: { sortOrder: "asc" },
      },
      invitees: { orderBy: { createdAt: "asc" } },
      eventNotes: { orderBy: { createdAt: "desc" } },
      eventPhotos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!event || event.planType !== "event") notFound();

  const recipes = await prisma.recipe.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const deleteWithId = deleteMealPlan.bind(null, id);

  // RSVP stats
  const totalGuests = event.invitees.length;
  const attending = event.invitees.filter((i) => i.rsvp === "attending").length;
  const declined = event.invitees.filter((i) => i.rsvp === "declined").length;
  const pending = event.invitees.filter((i) => i.rsvp === "pending").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium">{event.name}</h1>
          <div className="flex gap-3 text-sm text-warm-600 mt-1">
            {event.eventDate && <span>{event.eventDate}</span>}
            {event.eventTime && <span>at {event.eventTime}</span>}
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/meal-plans/${id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          <form action={deleteWithId}>
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        </div>
      </div>

      {/* Menu */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">Menu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EVENT_CATEGORIES.map((category) => {
            const categoryItems = event.items.filter((item) => item.slotLabel === category);
            return (
              <Card key={category} className="p-4">
                <h3 className="font-serif text-base font-semibold text-warm-800 mb-2">
                  {category}
                </h3>
                <div className="space-y-1 mb-3">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">
                        {item.recipe ? (
                          <Link
                            href={`/recipes/${item.recipe.id}`}
                            className="text-accent hover:text-accent-hover"
                          >
                            {item.recipe.title}
                          </Link>
                        ) : (
                          <span className="text-warm-800">{item.freeText}</span>
                        )}
                      </span>
                      <form
                        action={async () => {
                          "use server";
                          await deleteMealPlanItem(item.id, event.id);
                        }}
                      >
                        <button type="submit" className="text-red-400 hover:text-red-600 text-xs">
                          x
                        </button>
                      </form>
                    </div>
                  ))}
                  {categoryItems.length === 0 && (
                    <p className="text-xs text-warm-600 italic">No items</p>
                  )}
                </div>
                <form action={addMealPlanItem} className="flex gap-2">
                  <input type="hidden" name="mealPlanId" value={event.id} />
                  <input type="hidden" name="slotLabel" value={category} />
                  <select
                    name="recipeId"
                    className="flex-1 text-xs px-2 py-1 border border-warm-200 rounded-card bg-white text-warm-800"
                  >
                    <option value="">-- Free text --</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                  <input
                    name="freeText"
                    type="text"
                    placeholder="Or type..."
                    className="flex-1 text-xs px-2 py-1 border border-warm-200 rounded-card bg-white text-warm-800 placeholder:text-warm-600"
                  />
                  <Button type="submit" size="sm" className="text-xs">
                    Add
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Guest List */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">Guest List</h2>

        {/* RSVP Stats */}
        {totalGuests > 0 && (
          <div className="flex gap-4 mb-4 text-sm">
            <span className="text-warm-600">Total: {totalGuests}</span>
            <span className="text-green-700">Attending: {attending}</span>
            <span className="text-red-700">Declined: {declined}</span>
            <span className="text-yellow-700">Pending: {pending}</span>
          </div>
        )}

        {/* Guest table */}
        {event.invitees.length > 0 && (
          <Card className="overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm-50 border-b border-warm-200">
                  <th className="text-left p-3 font-medium text-warm-600">Name</th>
                  <th className="text-left p-3 font-medium text-warm-600">RSVP</th>
                  <th className="text-left p-3 font-medium text-warm-600">Dietary Notes</th>
                  <th className="text-right p-3 font-medium text-warm-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {event.invitees.map((invitee) => (
                  <tr key={invitee.id} className="border-b border-warm-100">
                    <td className="p-3 text-warm-800">{invitee.name}</td>
                    <td className="p-3">
                      <form action={updateInvitee} className="flex gap-1 items-center">
                        <input type="hidden" name="inviteeId" value={invitee.id} />
                        <input type="hidden" name="dietary" value={invitee.dietary || ""} />
                        <select
                          name="rsvp"
                          defaultValue={invitee.rsvp}
                          className="text-xs px-2 py-1 border border-warm-200 rounded bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="attending">Attending</option>
                          <option value="declined">Declined</option>
                        </select>
                        <button
                          type="submit"
                          className="text-xs text-accent hover:text-accent-hover"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="p-3">
                      <form action={updateInvitee} className="flex gap-1 items-center">
                        <input type="hidden" name="inviteeId" value={invitee.id} />
                        <input type="hidden" name="rsvp" value={invitee.rsvp} />
                        <input
                          name="dietary"
                          type="text"
                          defaultValue={invitee.dietary || ""}
                          placeholder="e.g. vegetarian"
                          className="text-xs px-2 py-1 border border-warm-200 rounded bg-white text-warm-800 placeholder:text-warm-600 w-full"
                        />
                        <button
                          type="submit"
                          className="text-xs text-accent hover:text-accent-hover"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="p-3 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteInvitee(invitee.id, event.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Add guest form */}
        <form action={addInvitee} className="flex gap-2 items-end">
          <input type="hidden" name="mealPlanId" value={event.id} />
          <input
            name="name"
            type="text"
            placeholder="Guest name"
            required
            className="flex-1 px-3 py-2 text-sm rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          <Button type="submit" size="sm">
            Add Guest
          </Button>
        </form>
      </section>

      {/* Event Photos */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-warm-800">Photos</h2>
          <EventPhotoUpload mealPlanId={event.id} />
        </div>
        {event.eventPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {event.eventPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square rounded-card overflow-hidden bg-warm-100">
                  <Image
                    src={`/photos/${photo.filename}`}
                    alt={photo.caption || "Event photo"}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteEventPhoto(photo.id, event.id);
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    type="submit"
                    className="bg-red-500 text-white text-xs px-2 py-0.5 rounded"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-600">No photos yet</p>
        )}
      </section>

      {/* Event Notes */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">Notes</h2>

        {event.eventNotes.length > 0 && (
          <div className="space-y-3 mb-4">
            {event.eventNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-card border border-warm-200 p-4">
                <p className="text-warm-800 mb-2">{note.content}</p>
                <div className="flex items-center gap-3 text-xs text-warm-600">
                  <span>
                    {note.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await deleteEventNote(note.id, event.id);
                    }}
                  >
                    <button type="submit" className="text-red-600 hover:text-red-700">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        <form action={addEventNote} className="flex gap-2">
          <input type="hidden" name="mealPlanId" value={event.id} />
          <input
            name="content"
            type="text"
            placeholder="Add a note..."
            required
            className="flex-1 px-3 py-2 text-sm rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          <Button type="submit" size="sm">
            Add Note
          </Button>
        </form>
      </section>
    </div>
  );
}
