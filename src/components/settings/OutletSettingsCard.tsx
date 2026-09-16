import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import {
  resolveActiveOutlet,
  setActiveOutletId,
  type Outlet,
} from "../../lib/outlet";

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Terjadi kesalahan pada outlet.";
  }

  const apiError = error as {
    message?: string;
    response?: { data?: { message?: string; title?: string } };
  };

  return (
    apiError.response?.data?.message ??
    apiError.response?.data?.title ??
    apiError.message ??
    "Terjadi kesalahan pada outlet."
  );
}

export default function OutletSettingsCard() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Outlet[]>("/api/outlets");
      setOutlets(response.data);
      const selected = resolveActiveOutlet(response.data);
      if (selected) {
        setActiveOutletId(selected.id);
      }
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createOutlet() {
    if (!name.trim() || !code.trim()) {
      setError("Nama dan kode outlet wajib diisi.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api.post("/api/outlets", {
        name: name.trim(),
        code: code.trim(),
        address: address.trim(),
        phone: phone.trim(),
        isDefault: outlets.length === 0,
      });
      setName("");
      setCode("");
      setAddress("");
      setPhone("");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(outlet: Outlet) {
    setBusy(true);
    setError("");
    try {
      await api.put(`/api/outlets/${outlet.id}`, {
        code: outlet.code,
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        isDefault: true,
        active: true,
      });
      setActiveOutletId(outlet.id);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-panel">
      <div className="card-header">
        <h3>Outlet</h3>
      </div>

      <div className="settings-form">
        <p style={{ marginTop: 0 }}>
          Setiap outlet punya transaksi dan nomor WhatsApp struk sendiri.
        </p>

        {loading ? (
          <p>Memuat outlet...</p>
        ) : (
          <>
            <div style={{ display: "grid", gap: 8 }}>
              {outlets.map((outlet) => (
                <div
                  key={outlet.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <strong>{outlet.name}</strong>
                    <div style={{ fontSize: 12 }}>
                      {outlet.code}
                      {outlet.isDefault ? " · Default" : ""}
                    </div>
                    {outlet.address ? (
                      <div style={{ fontSize: 12 }}>{outlet.address}</div>
                    ) : null}
                  </div>

                  {!outlet.isDefault ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => void makeDefault(outlet)}
                    >
                      Jadikan Default
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
              <strong>Tambah Outlet</strong>
            </div>

            <div className="form-group">
              <label>Nama Outlet</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Ubud"
              />
            </div>

            <div className="form-group">
              <label>Kode Outlet</label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="UBUD"
              />
            </div>

            <div className="form-group">
              <label>Alamat</label>
              <textarea
                rows={2}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Alamat outlet"
              />
            </div>

            <div className="form-group">
              <label>No. Telepon Outlet</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>

            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void createOutlet()}
            >
              {busy ? "Memproses..." : "Tambah Outlet"}
            </button>
          </>
        )}

        {error ? (
          <p style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>
        ) : null}
      </div>
    </div>
  );
}
