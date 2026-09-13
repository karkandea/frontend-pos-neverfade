import type { ProductPrice } from "./retail";

export type Product = {
  id: string;
  parentProductId?: string;
  productVariantId?: string;
  variantLabel?: string;
  variantSku?: string;
  retailBasePrice?: number;
  retailPrices?: ProductPrice[];
  kode: string;
  barcode: string;
  nama: string;
  kategori: string;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  supplier: string;
  satuan: string;
  deskripsi: string;
  type: "goods" | "service";
  tracksStock: boolean;
  quantityPrecision: number;
};
