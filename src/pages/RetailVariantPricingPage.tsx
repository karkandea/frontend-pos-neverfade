import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import api from "../lib/api";
import type { PriceLevel, ProductPrice, ProductVariant, RetailCatalog } from "../types/retail";

type VariantForm = { sku:string; barcode:string; label:string; option1Name:string; option1Value:string; option2Name:string; option2Value:string; stok:number; hargaJual:number|string };
const emptyVariant: VariantForm = { sku:"", barcode:"", label:"", option1Name:"Size", option1Value:"", option2Name:"Color", option2Value:"", stok:0, hargaJual:"" };
const rupiah=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);

export default function RetailVariantPricingPage(){
  const [catalog,setCatalog]=useState<RetailCatalog>({priceLevels:[],products:[]});
  const [selectedId,setSelectedId]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [variant,setVariant]=useState<VariantForm>(emptyVariant);
  const [levelName,setLevelName]=useState("");
  const [levelCode,setLevelCode]=useState("");
  const [priceLevelId,setPriceLevelId]=useState("");
  const [priceVariantId,setPriceVariantId]=useState("");
  const [minQty,setMinQty]=useState(1);
  const [unitPrice,setUnitPrice]=useState(0);
  const product=useMemo(()=>catalog.products.find(x=>x.id===selectedId)??catalog.products[0],[catalog,selectedId]);

  async function reload(){
    try{
      setError("");
      const {data}=await api.get<RetailCatalog>("/api/retail/catalog");
      setCatalog(data);
      setSelectedId((current)=>current || data.products[0]?.id || "");
    }catch{
      setError("Data varian & harga gagal dimuat.");
    }
  }
  useEffect(()=>{
    let active=true;
    void (async()=>{
      try{
        const {data}=await api.get<RetailCatalog>("/api/retail/catalog");
        if(!active) return;
        setCatalog(data);
        setSelectedId(data.products[0]?.id || "");
      }catch{
        if(active) setError("Data varian & harga gagal dimuat.");
      }finally{
        if(active) setLoading(false);
      }
    })();
    return()=>{ active=false; };
  },[]);

  async function createVariant(){
    if(!product) return;
    await api.post("/api/retail/variants",{ productId:product.id, ...variant, hargaJual:variant.hargaJual===""?null:Number(variant.hargaJual), hargaModal:null, option3Name:"", option3Value:"" });
    setVariant(emptyVariant); await reload();
  }
  async function adjustStock(v:ProductVariant,delta:number){
    await api.post(`/api/retail/variants/${v.id}/stock`,{ tipe:delta>=0?"masuk":"keluar", jumlah:Math.abs(delta), stokFinal:null, keterangan:"Penyesuaian dari Varian & Harga" });
    await reload();
  }
  async function createLevel(){
    await api.post("/api/retail/price-levels",{code:levelCode,name:levelName,sortOrder:catalog.priceLevels.length+1});
    setLevelName(""); setLevelCode(""); await reload();
  }
  async function createPrice(){
    if(!product||!priceLevelId) return;
    await api.post("/api/retail/prices",{productId:product.id,productVariantId:priceVariantId||null,priceLevelId,minQuantity:minQty,unitPrice});
    await reload();
  }
  async function removePrice(p:ProductPrice){ if(confirm("Hapus aturan harga ini?")){ await api.delete(`/api/retail/prices/${p.id}`); await reload(); } }
  async function removeVariant(v:ProductVariant){ if(confirm(`Hapus varian ${v.label}? Stok harus 0.`)){ await api.delete(`/api/retail/variants/${v.id}`); await reload(); } }
  async function removeLevel(l:PriceLevel){ if(confirm(`Hapus level ${l.name}?`)){ await api.delete(`/api/retail/price-levels/${l.id}`); await reload(); } }

  return <AppShell><section className="content-section active">
    <div className="section-header"><div><h2>Varian & Harga</h2><p>Kelola size/color, SKU, barcode, stok varian, dan harga satuan/grosir/reseller.</p></div></div>
    {error&&<div role="alert" className="financial-validation-error">{error} <button className="btn-secondary" onClick={()=>void reload()}>Coba Lagi</button></div>}
    {loading?<p>Memuat...</p>:<>
      <div className="table-card" style={{padding:16,marginBottom:16}}><div className="form-group"><label htmlFor="retail-product-select">Produk</label><select id="retail-product-select" value={product?.id??""} onChange={e=>setSelectedId(e.target.value)}>{catalog.products.map(p=><option key={p.id} value={p.id}>{p.nama} · stok {p.stok}</option>)}</select></div></div>
      {product&&<>
        <div className="table-card" style={{padding:16,marginBottom:16}}><h3>Tambah Varian — {product.nama}</h3><div className="form-grid-2">
          <div className="form-group"><label>SKU</label><input value={variant.sku} onChange={e=>setVariant({...variant,sku:e.target.value})}/></div>
          <div className="form-group"><label>Barcode</label><input value={variant.barcode} onChange={e=>setVariant({...variant,barcode:e.target.value})}/></div>
          <div className="form-group"><label>Label</label><input placeholder="Black / M" value={variant.label} onChange={e=>setVariant({...variant,label:e.target.value})}/></div>
          <div className="form-group"><label>Stok awal</label><input type="number" min="0" value={variant.stok} onChange={e=>setVariant({...variant,stok:Number(e.target.value)})}/></div>
          <div className="form-group"><label>Size</label><input value={variant.option1Value} onChange={e=>setVariant({...variant,option1Value:e.target.value})}/></div>
          <div className="form-group"><label>Color</label><input value={variant.option2Value} onChange={e=>setVariant({...variant,option2Value:e.target.value})}/></div>
          <div className="form-group"><label>Harga variant (opsional)</label><input type="number" value={variant.hargaJual} onChange={e=>setVariant({...variant,hargaJual:e.target.value})}/></div>
        </div><button className="btn-primary" onClick={()=>void createVariant()}>Tambah Varian</button></div>
        <div className="table-card" style={{marginBottom:16}}><table className="data-table"><thead><tr><th>Varian</th><th>SKU</th><th>Barcode</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>{product.variants.map(v=><tr key={v.id}><td>{v.label}</td><td>{v.sku}</td><td>{v.barcode||"-"}</td><td>{rupiah(v.hargaJual??product.hargaJual)}</td><td>{v.stok}</td><td style={{display:"flex",gap:6}}><button className="btn-secondary" onClick={()=>void adjustStock(v,1)}>+ Stok</button><button className="btn-secondary" disabled={v.stok<=0} onClick={()=>void adjustStock(v,-1)}>- Stok</button><button className="btn-secondary" onClick={()=>void removeVariant(v)}>Hapus</button></td></tr>)}</tbody></table></div>
        <div className="table-card" style={{padding:16,marginBottom:16}}><h3>Level Harga</h3><div className="form-grid-2"><div className="form-group"><label>Nama</label><input placeholder="Grosir" value={levelName} onChange={e=>setLevelName(e.target.value)}/></div><div className="form-group"><label>Kode</label><input placeholder="grosir" value={levelCode} onChange={e=>setLevelCode(e.target.value)}/></div></div><button className="btn-primary" onClick={()=>void createLevel()}>Tambah Level</button><div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>{catalog.priceLevels.map(l=><button key={l.id} className="btn-secondary" onClick={()=>void removeLevel(l)}>{l.name} ×</button>)}</div></div>
        <div className="table-card" style={{padding:16}}><h3>Aturan Harga</h3><div className="form-grid-2"><div className="form-group"><label>Level</label><select value={priceLevelId} onChange={e=>setPriceLevelId(e.target.value)}><option value="">Pilih level</option>{catalog.priceLevels.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div><div className="form-group"><label>Varian (opsional)</label><select value={priceVariantId} onChange={e=>setPriceVariantId(e.target.value)}><option value="">Semua varian / produk</option>{product.variants.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></div><div className="form-group"><label>Minimum qty</label><input type="number" min="1" value={minQty} onChange={e=>setMinQty(Number(e.target.value))}/></div><div className="form-group"><label>Harga/unit</label><input type="number" min="0" value={unitPrice} onChange={e=>setUnitPrice(Number(e.target.value))}/></div></div><button className="btn-primary" onClick={()=>void createPrice()}>Simpan Aturan</button><table className="data-table" style={{marginTop:12}}><thead><tr><th>Level</th><th>Varian</th><th>Min Qty</th><th>Harga</th><th></th></tr></thead><tbody>{product.prices.map(p=><tr key={p.id}><td>{p.priceLevelName}</td><td>{product.variants.find(v=>v.id===p.productVariantId)?.label??"Semua"}</td><td>{p.minQuantity}</td><td>{rupiah(p.unitPrice)}</td><td><button className="btn-secondary" onClick={()=>void removePrice(p)}>Hapus</button></td></tr>)}</tbody></table></div>
      </>}
    </>}
  </section></AppShell>;
}
