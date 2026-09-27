import { useLocalSearchParams } from "expo-router";
import { DishForm } from "../../screens/DishForm";

export default function NewDish() {
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  return <DishForm initialCategoryId={categoryId} />;
}
