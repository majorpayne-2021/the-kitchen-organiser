import RecipeForm from "@/components/RecipeForm";

export default function NewRecipePage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-6">New Recipe</h1>
      <div className="max-w-2xl">
        <RecipeForm />
      </div>
    </div>
  );
}
