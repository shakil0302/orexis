import { useLocalSearchParams } from "expo-router";
import { DishForm } from "../../screens/DishForm";

export default function EditDish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DishForm dishId={id} />;
}
