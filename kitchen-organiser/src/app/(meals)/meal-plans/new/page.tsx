import { createMealPlan } from "@/actions/meal-plan-actions";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function NewMealPlanPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-6">New Meal Plan</h1>
      <div className="max-w-lg">
        <Card className="p-6">
          <form action={createMealPlan} className="space-y-4">
            <Input name="name" label="Plan Name" placeholder="e.g. Week of March 24" required />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-warm-800">Plan Type</label>
              <select
                name="planType"
                className="w-full px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="weekly">Weekly Meal Plan</option>
                <option value="event">Event Plan</option>
              </select>
            </div>

            <Input name="eventDate" label="Event Date (optional)" type="date" />
            <Input name="eventTime" label="Event Time (optional)" type="time" />

            <div className="flex gap-3">
              <Button type="submit">Create Plan</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
