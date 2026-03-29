import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateMealPlan } from "@/actions/meal-plan-actions";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default async function EditMealPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const plan = await prisma.mealPlan.findUnique({ where: { id } });
  if (!plan) notFound();

  const updateWithId = updateMealPlan.bind(null, id);

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-6">Edit Meal Plan</h1>
      <div className="max-w-lg">
        <Card className="p-6">
          <form action={updateWithId} className="space-y-4">
            <Input
              name="name"
              label="Plan Name"
              defaultValue={plan.name}
              required
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-warm-800">Plan Type</label>
              <select
                name="planType"
                defaultValue={plan.planType}
                className="w-full px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="weekly">Weekly Meal Plan</option>
                <option value="event">Event Plan</option>
              </select>
            </div>

            <Input
              name="eventDate"
              label="Event Date (optional)"
              type="date"
              defaultValue={plan.eventDate || ""}
            />
            <Input
              name="eventTime"
              label="Event Time (optional)"
              type="time"
              defaultValue={plan.eventTime || ""}
            />

            <div className="flex gap-3">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
