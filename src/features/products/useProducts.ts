import { useEffect, useState } from "react";
import api from "../../lib/api";

export type Product = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  supplier?: string;
};

export function useProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get("/api/products");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return {
    items,
    loading,
    reload: load,
  };
}
