import { getModelCatalog } from "@/lib/model-catalog";

export async function GET() {
  const catalog = await getModelCatalog();
  const models = catalog.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    vision: e.vision,
    tier: e.tier,
  }));
  return Response.json({ models });
}
