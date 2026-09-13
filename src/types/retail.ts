export type ProductVariant = {
  id:string; productId:string; sku:string; barcode:string; label:string;
  option1Name:string; option1Value:string; option2Name:string; option2Value:string;
  option3Name:string; option3Value:string; hargaModal:number|null; hargaJual:number|null;
  stok:number; active:boolean;
};

export type PriceLevel = { id:string; code:string; name:string; sortOrder:number; active:boolean };

export type ProductPrice = {
  id:string; productId:string; productVariantId:string|null; priceLevelId:string;
  priceLevelCode:string; priceLevelName:string; priceLevelSortOrder:number;
  minQuantity:number; unitPrice:number;
};

export type RetailCatalogProduct = {
  id:string; kode:string; barcode:string; nama:string; kategori:string;
  hargaModal:number; hargaJual:number; stok:number; supplier:string; satuan:string;
  deskripsi:string; type:"goods"|"service"; tracksStock:boolean; quantityPrecision:number;
  variants:ProductVariant[]; prices:ProductPrice[];
};

export type RetailCatalog = { priceLevels:PriceLevel[]; products:RetailCatalogProduct[] };
export type RetailPriceResolution = { unitPrice:number; priceLevelId:string|null; priceLevelName:string };

export function resolveRetailPrice(product:RetailCatalogProduct, variantId:string|null, quantity:number, requestedPriceLevelId?:string|null):RetailPriceResolution {
  const variant=product.variants.find(entry=>entry.id===variantId);
  const basePrice=variant?.hargaJual ?? product.hargaJual;
  const candidates=product.prices.filter(price=>!price.productVariantId || price.productVariantId===variantId);
  const effective=new Map<string,ProductPrice>();
  for(const candidate of candidates){
    const current=effective.get(candidate.priceLevelId);
    const candidateSpecific=candidate.productVariantId===variantId;
    const currentSpecific=current?.productVariantId===variantId;
    if(!current || (candidateSpecific && !currentSpecific)) effective.set(candidate.priceLevelId,candidate);
  }
  if(requestedPriceLevelId){
    const selected=effective.get(requestedPriceLevelId);
    return selected ? {unitPrice:selected.unitPrice,priceLevelId:selected.priceLevelId,priceLevelName:selected.priceLevelName} : {unitPrice:basePrice,priceLevelId:null,priceLevelName:""};
  }
  const automatic=[...effective.values()].filter(price=>price.minQuantity<=quantity).sort((a,b)=>b.minQuantity-a.minQuantity || a.priceLevelSortOrder-b.priceLevelSortOrder)[0];
  return automatic ? {unitPrice:automatic.unitPrice,priceLevelId:automatic.priceLevelId,priceLevelName:automatic.priceLevelName} : {unitPrice:basePrice,priceLevelId:null,priceLevelName:""};
}
