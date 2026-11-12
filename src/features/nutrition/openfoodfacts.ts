import type { Food } from "@/src/features/nutrition/foods";

/**
 * Open Food Facts: base abierta de productos envasados (licencia ODbL).
 * https://world.openfoodfacts.org
 *
 * Es la única parte de la app que usa la red, y solo si la persona enciende
 * "Búsqueda en línea" en Más. Lo único que se envía es el texto buscado o el
 * código de barras; nunca datos personales ni registros.
 */
const HOST = "https://world.openfoodfacts.org";
const SEARCH_HOST = "https://search.openfoodfacts.org";
const FIELDS = "code,product_name,product_name_es,brands,nutriments,serving_quantity";
export const OFF_ATTRIBUTION = "Datos de productos: © colaboradores de Open Food Facts (ODbL 1.0).";

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  /** Texto con comas en la ficha de producto; lista en el buscador. */
  brands?: string | string[];
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Un código de barras de producto: 8 a 14 dígitos (EAN-8, UPC-A, EAN-13, ITF-14). */
export const cleanBarcode = (text: string) => {
  const digits = text.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 14 ? digits : null;
};

/** Convierte un producto de Open Food Facts en un alimento. Sin nombre o sin datos nutricionales no sirve. */
export function foodFromOffProduct(product: OffProduct | null | undefined): Food | null {
  if (!product) return null;
  const name = (product.product_name_es || product.product_name || "").trim();
  const nutriments = product.nutriments ?? {};
  const value = (key: string) => {
    const number = Number(nutriments[key]);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };
  const proteinG = value("proteins_100g");
  const carbsG = value("carbohydrates_100g");
  const fatsG = value("fat_100g");
  const energyKj = value("energy_100g");
  const kcal =
    value("energy-kcal_100g") ??
    (energyKj === null ? null : energyKj / 4.184) ??
    (proteinG === null && carbsG === null && fatsG === null
      ? null
      : (proteinG ?? 0) * 4 + (carbsG ?? 0) * 4 + (fatsG ?? 0) * 9);
  if (!name || kcal === null || !product.code) return null;
  if ((proteinG ?? 0) + (carbsG ?? 0) + (fatsG ?? 0) > 101 || kcal > 950) return null;
  const serving = Number(product.serving_quantity);
  const brands = Array.isArray(product.brands) ? product.brands : (product.brands ?? "").split(",");
  const brand = (brands[0] ?? "").trim();
  return {
    id: `off:${product.code}`,
    source: "off",
    name,
    ...(brand ? { brand } : {}),
    barcode: product.code,
    servingG: Number.isFinite(serving) && serving > 0 && serving <= 2000 ? serving : 100,
    per100: {
      kcal: Math.round(kcal),
      proteinG: round1(proteinG ?? 0),
      carbsG: round1(carbsG ?? 0),
      fatsG: round1(fatsG ?? 0),
    },
  };
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Open Food Facts respondió ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Busca un producto por su código de barras. Devuelve null si no está en la base. */
export async function lookupBarcodeOnline(code: string): Promise<Food | null> {
  const data = (await getJson(`${HOST}/api/v2/product/${code}.json?fields=${FIELDS}`)) as {
    status?: number;
    product?: OffProduct;
  };
  return data.status === 1 ? foodFromOffProduct({ ...data.product, code: data.product?.code ?? code }) : null;
}

/** Busca productos por texto. Devuelve solo los que traen nombre y datos nutricionales. */
export async function searchOnline(query: string): Promise<Food[]> {
  const url = `${SEARCH_HOST}/search?q=${encodeURIComponent(query)}&page_size=24&fields=${FIELDS}`;
  const data = (await getJson(url)) as { hits?: OffProduct[] };
  const foods = (data.hits ?? []).flatMap((product) => {
    const food = foodFromOffProduct(product);
    return food ? [food] : [];
  });
  return [...new Map(foods.map((food) => [food.id, food])).values()];
}
