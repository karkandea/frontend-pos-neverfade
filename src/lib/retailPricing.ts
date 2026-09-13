import type { Product } from "../types/product";
import type { RetailCatalog } from "../types/retail";

export type CartPriceOption = {
  id: string;
  name: string;
  unitPrice: number;
};

function effectivePrices(product: Product) {
  const prices = product.retailPrices ?? [];
  const effective = new Map<string, (typeof prices)[number]>();
  for (const price of prices) {
    if (price.productVariantId && price.productVariantId !== product.productVariantId) continue;
    const current = effective.get(price.priceLevelId);
    const candidateSpecific = price.productVariantId === product.productVariantId;
    const currentSpecific = current?.productVariantId === product.productVariantId;
    if (!current || (candidateSpecific && !currentSpecific)) effective.set(price.priceLevelId, price);
  }
  return [...effective.values()];
}

export function resolveProductRetailPrice(product: Product, quantity: number, requestedPriceLevelId?: string | null) {
  const basePrice = product.retailBasePrice ?? product.hargaJual;
  const prices = effectivePrices(product);
  if (requestedPriceLevelId) {
    const selected = prices.find((price) => price.priceLevelId === requestedPriceLevelId);
    if (selected) return { unitPrice: selected.unitPrice, priceLevelId: selected.priceLevelId, priceLevelName: selected.priceLevelName };
  }
  const automatic = prices
    .filter((price) => price.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity || a.priceLevelSortOrder - b.priceLevelSortOrder)[0];
  return automatic
    ? { unitPrice: automatic.unitPrice, priceLevelId: automatic.priceLevelId, priceLevelName: automatic.priceLevelName }
    : { unitPrice: basePrice, priceLevelId: null, priceLevelName: "" };
}

export function getRetailPriceOptions(product: Product): CartPriceOption[] {
  return effectivePrices(product).sort((a, b) => a.priceLevelSortOrder - b.priceLevelSortOrder).map((price) => ({
    id: price.priceLevelId,
    name: price.priceLevelName,
    unitPrice: price.unitPrice,
  }));
}

export function flattenRetailCatalog(catalog: RetailCatalog): Product[] {
  return catalog.products.flatMap((product) => {
    const activeVariants = product.variants.filter((variant) => variant.active);
    if (activeVariants.length === 0) {
      const base: Product = {
        ...product,
        id: product.id,
        parentProductId: product.id,
        retailBasePrice: product.hargaJual,
        retailPrices: product.prices,
      };
      const price = resolveProductRetailPrice(base, 1);
      return [{ ...base, hargaJual: price.unitPrice }];
    }
    return activeVariants.map((variant) => {
      const base: Product = {
        id: `${product.id}:${variant.id}`,
        parentProductId: product.id,
        productVariantId: variant.id,
        variantLabel: variant.label,
        variantSku: variant.sku,
        retailBasePrice: variant.hargaJual ?? product.hargaJual,
        retailPrices: product.prices,
        kode: variant.sku,
        barcode: variant.barcode || product.barcode,
        nama: `${product.nama} · ${variant.label}`,
        kategori: product.kategori,
        hargaModal: variant.hargaModal ?? product.hargaModal,
        hargaJual: variant.hargaJual ?? product.hargaJual,
        stok: variant.stok,
        supplier: product.supplier,
        satuan: product.satuan,
        deskripsi: product.deskripsi,
        type: product.type,
        tracksStock: product.tracksStock,
        quantityPrecision: product.quantityPrecision,
      };
      const price = resolveProductRetailPrice(base, 1);
      return { ...base, hargaJual: price.unitPrice };
    });
  });
}
