import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import {
  deleteGiftHamper,
  addGiftItem,
  toggleGiftItem,
  addGiftItemNote,
  deleteGiftItem,
  updateGiftDate,
  deleteGiftPhoto,
} from "@/actions/gift-actions";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import GiftPhotoUpload from "@/components/GiftPhotoUpload";

export default async function GiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const hamper = await prisma.giftHamper.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!hamper) notFound();

  const checked = hamper.items.filter((i) => i.checked).length;
  const total = hamper.items.length;
  const deleteWithId = deleteGiftHamper.bind(null, id);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium">{hamper.title}</h1>
          {hamper.giftDate && (
            <p className="text-sm text-warm-600 mt-1">{hamper.giftDate}</p>
          )}
        </div>
        <div className="flex gap-3">
          <form action={deleteWithId}>
            <Button type="submit" variant="danger" size="sm">
              Delete Hamper
            </Button>
          </form>
        </div>
      </div>

      {/* Date update */}
      <Card className="p-4 mb-6">
        <form action={updateGiftDate} className="flex gap-3 items-end">
          <input type="hidden" name="hamperId" value={hamper.id} />
          <div className="flex-1">
            <Input
              name="giftDate"
              label="Gift Date"
              type="date"
              defaultValue={hamper.giftDate || ""}
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Update Date
          </Button>
        </form>
      </Card>

      {/* Progress */}
      {total > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex justify-between text-sm text-warm-600 mb-2">
            <span>
              {checked} of {total} items checked
            </span>
            <span>{Math.round((checked / total) * 100)}%</span>
          </div>
          <div className="w-full bg-warm-100 rounded-full h-3">
            <div
              className="bg-accent h-3 rounded-full transition-all"
              style={{ width: `${total > 0 ? (checked / total) * 100 : 0}%` }}
            />
          </div>
        </Card>
      )}

      {/* Item checklist */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">Items</h2>

        {hamper.items.length > 0 && (
          <div className="space-y-2 mb-4">
            {hamper.items.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start gap-3">
                  {/* Toggle checkbox */}
                  <form
                    action={async () => {
                      "use server";
                      await toggleGiftItem(item.id, hamper.id);
                    }}
                  >
                    <button
                      type="submit"
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        item.checked
                          ? "bg-accent border-accent text-white"
                          : "border-warm-300 hover:border-accent"
                      }`}
                    >
                      {item.checked && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </form>

                  <div className="flex-1">
                    <p
                      className={`text-warm-800 ${
                        item.checked ? "line-through opacity-60" : ""
                      }`}
                    >
                      {item.description}
                    </p>

                    {/* Note */}
                    {item.note && (
                      <p className="text-xs text-warm-600 mt-1">{item.note}</p>
                    )}

                    {/* Add/edit note form */}
                    <form action={addGiftItemNote} className="flex gap-1 mt-1">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="hamperId" value={hamper.id} />
                      <input
                        name="note"
                        type="text"
                        placeholder="Add note..."
                        defaultValue={item.note || ""}
                        className="flex-1 text-xs px-2 py-0.5 border border-warm-200 rounded bg-white text-warm-800 placeholder:text-warm-600"
                      />
                      <button
                        type="submit"
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        Save
                      </button>
                    </form>
                  </div>

                  {/* Delete */}
                  <form
                    action={async () => {
                      "use server";
                      await deleteGiftItem(item.id, hamper.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add item form */}
        <form action={addGiftItem} className="flex gap-2">
          <input type="hidden" name="hamperId" value={hamper.id} />
          <input
            name="description"
            type="text"
            placeholder="Add an item..."
            required
            className="flex-1 px-3 py-2 text-sm rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          <Button type="submit" size="sm">
            Add Item
          </Button>
        </form>
      </section>

      {/* Inspiration Photos */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-warm-800">
            Inspiration Photos
          </h2>
          <GiftPhotoUpload hamperId={hamper.id} />
        </div>
        {hamper.photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {hamper.photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square rounded-card overflow-hidden bg-warm-100">
                  <Image
                    src={`/photos/${photo.filename}`}
                    alt={photo.caption || "Gift photo"}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteGiftPhoto(photo.id, hamper.id);
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
    </div>
  );
}
