import CarDetails from "@/components/Dashboard/CarDetails";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Pass id to client component
  const { id } = await params;
  return <CarDetails vehicleId={id} />;
}
