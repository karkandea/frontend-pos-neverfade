/**
 * NEVERFADE POS — script.js v2.0.0 (API Edition)
 * Backend: Node.js + Express + SQLite
 * Auth: JWT Bearer token
 */
'use strict';

/* ═══════════════════════════════════════
   API CLIENT — Semua request ke backend
═══════════════════════════════════════ */
/* ═══════════════════════════════════════
   CONNECTION MODE — auto / online / offline
═══════════════════════════════════════ */
const ConnMode = {
  KEY: 'nfpos_conn_mode',
  get()    { return localStorage.getItem(this.KEY) || 'auto'; },
  set(m)   { localStorage.setItem(this.KEY, m); },
};

/* ═══════════════════════════════════════
   SYNC QUEUE — antrian perubahan offline
   yang menunggu dikirim ke server
═══════════════════════════════════════ */
const SyncQueue = {
  KEY: 'nfoff_sync_queue',
  list()      { try { return JSON.parse(localStorage.getItem(this.KEY))||[]; } catch { return []; } },
  save(q)     { localStorage.setItem(this.KEY, JSON.stringify(q)); },
  push(item)  { const q=this.list(); q.push({...item, ts:Date.now()}); this.save(q); },
  clear()     { localStorage.removeItem(this.KEY); },
  count()     { return this.list().length; },
};

const API = {
  BASE: (window.NF_API_URL || 'https://neverfade-api-production-f8ca.up.railway.app'),
  online: null, // null=belum dicek, true=server hidup, false=fallback offline
  _checking: false,

  _token() { return localStorage.getItem('nfpos_token'); },

  async ping(timeoutMs=4000){
    try {
      await Promise.race([
        fetch(this.BASE, { method:'GET' }),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), timeoutMs)),
      ]);
      return true;
    } catch { return false; }
  },

  async _req(method, path, body = null) {
    const mode = ConnMode.get();

    // Mode "Selalu Lokal" -> tidak pernah mencoba server
    if (mode === 'offline') {
      this.online = false;
      if (method !== 'GET' && !path.includes('/auth/login')) SyncQueue.push({method, path, body});
      return offlineHandle(method, path, body);
    }

    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const token = this._token();
    if (token && !token.startsWith('OFFLINE-')) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await Promise.race([
        fetch(`${this.BASE}${path}`, opts),
        new Promise((_, rej) => setTimeout(() => rej(new Error('NETWORK_TIMEOUT')), 4500)),
      ]);
    } catch (networkErr) {
      this.online = false;
      // Mode "Selalu Online" -> jangan fallback, tampilkan error asli
      if (mode === 'online') {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      // Mode "Otomatis" -> fallback ke lokal + catat ke antrian sync
      if (method !== 'GET' && !path.includes('/auth/login')) SyncQueue.push({method, path, body});
      return offlineHandle(method, path, body);
    }

    this.online = true;
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get(path)         { return this._req('GET',    path); },
  post(path, body)  { return this._req('POST',   path, body); },
  put(path, body)   { return this._req('PUT',    path, body); },
  delete(path)      { return this._req('DELETE', path); },
};

/* ═══════════════════════════════════════
   OFFLINE FALLBACK LAYER
   Jika backend tidak terjangkau, semua
   request otomatis dialihkan ke localStorage
═══════════════════════════════════════ */
const OfflineDB = {
  KEYS: {
    products:'nfoff_products', customers:'nfoff_customers',
    transactions:'nfoff_transactions', users:'nfoff_users',
    settings:'nfoff_settings', stock_history:'nfoff_stock_history',
    karyawan:'nfoff_karyawan', absensi:'nfoff_absensi', seeded:'nfoff_seeded',
  },
  load(k, fb=null){ try{ const r=localStorage.getItem(k); return r===null?fb:JSON.parse(r); }catch{ return fb; } },
  save(k, d){ try{ localStorage.setItem(k, JSON.stringify(d)); return true; }catch{ return false; } },
  genId(p){ return `${p}-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`; },
  genTrxNo(){
    const d=new Date(); const ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const trx=this.load(this.KEYS.transactions,[]);
    return `TRX-${ds}-${String(trx.length+1).padStart(4,'0')}`;
  },
};

function offlineSeed(){
  if (OfflineDB.load(OfflineDB.KEYS.seeded)) return;
  const now = new Date().toISOString();
  OfflineDB.save(OfflineDB.KEYS.users,[
    {id:'USR-001',nama:'Administrator',username:'owner',password:'owner123',role:'owner',active:true,createdAt:now},
    {id:'USR-002',nama:'Admin Toko',username:'admin',password:'admin123',role:'admin',active:true,createdAt:now},
    {id:'USR-003',nama:'Kasir Utama',username:'kasir',password:'kasir123',role:'kasir',active:true,createdAt:now},
  ]);
  OfflineDB.save(OfflineDB.KEYS.settings,{
    namaToko:'WARUNG LUMPIA BEEF', alamat:'Jl. Kuliner No. 1, Kota Anda',
    telepon:'081234567890', email:'info@lumpiabeef.id', website:'',
    headerStruk:'Terima kasih telah berkunjung!',
    footerStruk:'Barang yang sudah dibeli tidak dapat dikembalikan.',
    showTax:false, showPoint:true, defaultTax:0, minStok:5, poinRate:1,
  });
  OfflineDB.save(OfflineDB.KEYS.products,[
    {id:'PRD-001',kode:'LMB-001',barcode:'8001234000001',nama:'Lumpia Beef Original',kategori:'Lumpia',hargaModal:8000,hargaJual:15000,stok:50,supplier:'Dapur Sendiri',satuan:'pcs',deskripsi:'',createdAt:now},
    {id:'PRD-002',kode:'LMB-002',barcode:'8001234000002',nama:'Lumpia Beef Pedas',kategori:'Lumpia',hargaModal:8000,hargaJual:15000,stok:40,supplier:'Dapur Sendiri',satuan:'pcs',deskripsi:'',createdAt:now},
    {id:'PRD-003',kode:'LMU-001',barcode:'8001234000003',nama:'Lumpia Ubi Ungu',kategori:'Lumpia',hargaModal:6000,hargaJual:12000,stok:35,supplier:'Dapur Sendiri',satuan:'pcs',deskripsi:'',createdAt:now},
    {id:'PRD-004',kode:'BGR-001',barcode:'8001234000004',nama:'Burger Beef Klasik',kategori:'Burger',hargaModal:15000,hargaJual:28000,stok:25,supplier:'Dapur Sendiri',satuan:'pcs',deskripsi:'',createdAt:now},
    {id:'PRD-005',kode:'BGR-002',barcode:'8001234000005',nama:'Burger Beef Double',kategori:'Burger',hargaModal:22000,hargaJual:38000,stok:3,supplier:'Dapur Sendiri',satuan:'pcs',deskripsi:'',createdAt:now},
    {id:'PRD-006',kode:'BGR-003',barcode:'8001234000006',nama:'Burger Crispy Chicken',kategori:'Burger',hargaModal:13000,hargaJual:25000,stok:20,supplier:'Dapur Sendiri',satuan:'pcs',deskripsi:'',createdAt:now},
    {id:'PRD-007',kode:'PNM-001',barcode:'8001234000007',nama:'Paket Hemat 3 Lumpia',kategori:'Paket',hargaModal:20000,hargaJual:38000,stok:10,supplier:'Dapur Sendiri',satuan:'paket',deskripsi:'',createdAt:now},
    {id:'PRD-008',kode:'PNM-002',barcode:'8001234000008',nama:'Combo Burger + Lumpia',kategori:'Paket',hargaModal:25000,hargaJual:45000,stok:15,supplier:'Dapur Sendiri',satuan:'paket',deskripsi:'',createdAt:now},
    {id:'PRD-009',kode:'MNM-001',barcode:'8001234000009',nama:'Es Teh Manis',kategori:'Minuman',hargaModal:2000,hargaJual:5000,stok:60,supplier:'Dapur Sendiri',satuan:'cup',deskripsi:'',createdAt:now},
    {id:'PRD-010',kode:'MNM-002',barcode:'8001234000010',nama:'Es Jeruk Peras',kategori:'Minuman',hargaModal:3000,hargaJual:8000,stok:40,supplier:'Dapur Sendiri',satuan:'cup',deskripsi:'',createdAt:now},
  ]);
  OfflineDB.save(OfflineDB.KEYS.customers,[
    {id:'CST-001',nama:'Budi Santoso',hp:'08111234567',email:'budi@gmail.com',alamat:'Jl. Mawar No. 5',poin:150,totalTransaksi:3,createdAt:now},
    {id:'CST-002',nama:'Siti Rahma',hp:'08222345678',email:'siti@gmail.com',alamat:'Jl. Melati No. 12',poin:80,totalTransaksi:2,createdAt:now},
    {id:'CST-003',nama:'Ahmad Fauzi',hp:'08333456789',email:'',alamat:'Jl. Kenanga No. 3',poin:200,totalTransaksi:5,createdAt:now},
  ]);
  OfflineDB.save(OfflineDB.KEYS.transactions,[]);
  OfflineDB.save(OfflineDB.KEYS.stock_history,[]);
  OfflineDB.save(OfflineDB.KEYS.karyawan,[
    {id:'KRY-001',nama:'Dewi Safitri',jabatan:'Kasir',telepon:'081234567891',email:'dewi@email.com',gaji:2800000,tanggalMasuk:'2023-01-15',status:'aktif',catatan:''},
    {id:'KRY-002',nama:'Budi Santoso',jabatan:'Staff Gudang',telepon:'081234567892',email:'budi@email.com',gaji:2500000,tanggalMasuk:'2023-03-10',status:'aktif',catatan:''},
    {id:'KRY-003',nama:'Sari Indah',jabatan:'Kasir',telepon:'081234567893',email:'sari@email.com',gaji:2800000,tanggalMasuk:'2023-06-01',status:'aktif',catatan:''},
    {id:'KRY-004',nama:'Rizki Pratama',jabatan:'Supervisor',telepon:'081234567894',email:'rizki@email.com',gaji:4000000,tanggalMasuk:'2022-08-20',status:'aktif',catatan:''},
  ]);
  OfflineDB.save(OfflineDB.KEYS.absensi,[]);
  OfflineDB.save(OfflineDB.KEYS.seeded,true);
}

function offlineHandle(method, fullPath, body){
  offlineSeed();
  const [path, qs] = fullPath.split('?');
  const q = new URLSearchParams(qs||'');
  const seg = path.split('/').filter(Boolean); // ['api','products','PRD-001']
  const r2 = seg[1], id = seg[2], r3 = seg[2];
  const session = Session.get();
  const now = new Date().toISOString();

  const ok = (data) => data;
  const err = (msg) => { const e=new Error(msg); throw e; };

  // AUTH
  if (r2==='auth' && id==='login' && method==='POST'){
    const users = OfflineDB.load(OfflineDB.KEYS.users,[]);
    const u = users.find(x=>x.username===body.username && x.password===body.password && x.active!==false);
    if(!u) err('Username atau password salah');
    const payload={id:u.id,nama:u.nama,username:u.username,role:u.role};
    return ok({ token:'OFFLINE-'+u.id, user:payload });
  }
  if (r2==='auth' && id==='me' && method==='GET'){
    if(!session) err('Unauthorized');
    return ok(session);
  }

  // SETTINGS
  if (r2==='settings' && method==='GET') return ok(OfflineDB.load(OfflineDB.KEYS.settings,{}));
  if (r2==='settings' && method==='PUT'){ OfflineDB.save(OfflineDB.KEYS.settings, body); return ok({ok:true}); }

  // PRODUCTS
  if (r2==='products' && !id && method==='GET'){
    let list = OfflineDB.load(OfflineDB.KEYS.products,[]);
    const s=q.get('search'), k=q.get('kategori');
    if(s){ const sl=s.toLowerCase(); list=list.filter(p=>p.nama.toLowerCase().includes(sl)||p.kode.toLowerCase().includes(sl)||(p.barcode||'').includes(sl)); }
    if(k) list=list.filter(p=>p.kategori===k);
    return ok(list);
  }
  if (r2==='products' && id && method==='GET'){
    const p=OfflineDB.load(OfflineDB.KEYS.products,[]).find(x=>x.id===id);
    if(!p) err('Produk tidak ditemukan'); return ok(p);
  }
  if (r2==='products' && !id && method==='POST'){
    const list=OfflineDB.load(OfflineDB.KEYS.products,[]);
    if(list.find(x=>x.kode===body.kode)) err(`Kode produk '${body.kode}' sudah digunakan`);
    const p={ id:OfflineDB.genId('PRD'), kode:body.kode, barcode:body.barcode||'', nama:body.nama, kategori:body.kategori||'', hargaModal:body.hargaModal||0, hargaJual:body.hargaJual||0, stok:body.stok||0, supplier:body.supplier||'', satuan:body.satuan||'pcs', deskripsi:body.deskripsi||'', createdAt:now };
    list.push(p); OfflineDB.save(OfflineDB.KEYS.products,list); return ok(p);
  }
  if (r2==='products' && id && method==='PUT'){
    const list=OfflineDB.load(OfflineDB.KEYS.products,[]); const i=list.findIndex(x=>x.id===id);
    if(i<0) err('Produk tidak ditemukan');
    list[i]={...list[i], kode:body.kode, barcode:body.barcode||'', nama:body.nama, kategori:body.kategori||'', hargaModal:body.hargaModal||0, hargaJual:body.hargaJual||0, stok:body.stok||0, supplier:body.supplier||'', satuan:body.satuan||'pcs', deskripsi:body.deskripsi||''};
    OfflineDB.save(OfflineDB.KEYS.products,list); return ok(list[i]);
  }
  if (r2==='products' && id && method==='DELETE'){
    OfflineDB.save(OfflineDB.KEYS.products, OfflineDB.load(OfflineDB.KEYS.products,[]).filter(x=>x.id!==id));
    return ok({ok:true});
  }

  // STOCK HISTORY
  if (r2==='stock-history' && method==='GET'){
    let list=OfflineDB.load(OfflineDB.KEYS.stock_history,[]);
    const pid=q.get('produkId'); if(pid) list=list.filter(h=>h.produkId===pid);
    return ok(list.slice().reverse());
  }
  if (r2==='stock-history' && method==='POST'){
    const products=OfflineDB.load(OfflineDB.KEYS.products,[]);
    const p=products.find(x=>x.id===body.produkId);
    if(!p) err('Produk tidak ditemukan');
    let jml, stokAkhir;
    if(body.tipe==='penyesuaian'){ stokAkhir=parseInt(body.stokFinal); jml=stokAkhir-p.stok; }
    else { jml=parseInt(body.jumlah); if(jml<=0) err('Jumlah harus lebih dari 0'); stokAkhir = body.tipe==='masuk'?p.stok+jml:p.stok-jml; }
    if(stokAkhir<0) err('Stok tidak boleh negatif');
    p.stok=stokAkhir;
    OfflineDB.save(OfflineDB.KEYS.products,products);
    const hist=OfflineDB.load(OfflineDB.KEYS.stock_history,[]);
    const rec={id:OfflineDB.genId('STK'),produkId:body.produkId,produkNama:p.nama,tipe:body.tipe,jumlah:jml,stokAkhir,keterangan:body.keterangan||'',tanggal:now,user:session?.nama||'User'};
    hist.push(rec); OfflineDB.save(OfflineDB.KEYS.stock_history,hist);
    return ok({id:rec.id, stokAkhir, jumlah:jml});
  }

  // CUSTOMERS
  if (r2==='customers' && !id && method==='GET'){
    let list=OfflineDB.load(OfflineDB.KEYS.customers,[]);
    const s=q.get('search');
    if(s){ const sl=s.toLowerCase(); list=list.filter(c=>c.nama.toLowerCase().includes(sl)||(c.hp||'').includes(sl)); }
    return ok(list);
  }
  if (r2==='customers' && id && method==='GET'){
    const c=OfflineDB.load(OfflineDB.KEYS.customers,[]).find(x=>x.id===id);
    if(!c) err('Pelanggan tidak ditemukan'); return ok(c);
  }
  if (r2==='customers' && !id && method==='POST'){
    if(!body.nama||!body.hp) err('Nama dan HP wajib diisi');
    const list=OfflineDB.load(OfflineDB.KEYS.customers,[]);
    const c={id:OfflineDB.genId('CST'), nama:body.nama, hp:body.hp, email:body.email||'', alamat:body.alamat||'', poin:body.poin||0, totalTransaksi:0, createdAt:now};
    list.push(c); OfflineDB.save(OfflineDB.KEYS.customers,list); return ok(c);
  }
  if (r2==='customers' && id && method==='PUT'){
    const list=OfflineDB.load(OfflineDB.KEYS.customers,[]); const i=list.findIndex(x=>x.id===id);
    if(i<0) err('Pelanggan tidak ditemukan');
    list[i]={...list[i],nama:body.nama,hp:body.hp,email:body.email||'',alamat:body.alamat||'',poin:body.poin||0};
    OfflineDB.save(OfflineDB.KEYS.customers,list); return ok(list[i]);
  }
  if (r2==='customers' && id && method==='DELETE'){
    OfflineDB.save(OfflineDB.KEYS.customers, OfflineDB.load(OfflineDB.KEYS.customers,[]).filter(x=>x.id!==id));
    return ok({ok:true});
  }

  // TRANSACTIONS
  if (r2==='transactions' && !id && method==='GET'){
    let list=OfflineDB.load(OfflineDB.KEYS.transactions,[]).slice().reverse();
    const s=q.get('search'), sd=q.get('startDate'), ed=q.get('endDate');
    if(s){ const sl=s.toLowerCase(); list=list.filter(t=>t.noTrx.toLowerCase().includes(sl)||(t.customerNama||'').toLowerCase().includes(sl)||t.kasir.toLowerCase().includes(sl)); }
    if(sd) list=list.filter(t=>t.tanggal.slice(0,10)>=sd);
    if(ed) list=list.filter(t=>t.tanggal.slice(0,10)<=ed);
    return ok(list);
  }
  if (r2==='transactions' && id && method==='GET'){
    const t=OfflineDB.load(OfflineDB.KEYS.transactions,[]).find(x=>x.id===id);
    if(!t) err('Transaksi tidak ditemukan'); return ok(t);
  }
  if (r2==='transactions' && !id && method==='POST'){
    if(!body.items?.length) err('Items tidak boleh kosong');
    const customers=OfflineDB.load(OfflineDB.KEYS.customers,[]);
    const customer = body.customerId ? customers.find(c=>c.id===body.customerId) : null;
    const trx = {
      id:OfflineDB.genId('TRX'), noTrx:OfflineDB.genTrxNo(), tanggal:now,
      kasir:session?.nama||'Kasir', kasirId:session?.id||'',
      customerId:body.customerId||'', customerNama:customer?.nama||'Umum',
      items:body.items, subtotal:body.subtotal||0, disc:body.disc||0, tax:body.tax||0,
      discAmt:body.discAmt||0, taxAmt:body.taxAmt||0, total:body.total,
      metodePembayaran:body.metodePembayaran||'tunai', dibayar:body.dibayar||body.total, kembalian:body.kembalian||0,
    };
    const trxList=OfflineDB.load(OfflineDB.KEYS.transactions,[]); trxList.push(trx); OfflineDB.save(OfflineDB.KEYS.transactions,trxList);
    // Kurangi stok
    const products=OfflineDB.load(OfflineDB.KEYS.products,[]);
    const hist=OfflineDB.load(OfflineDB.KEYS.stock_history,[]);
    body.items.forEach(item=>{
      const p=products.find(x=>x.id===item.id);
      if(p){ const newStok=Math.max(0,p.stok-item.qty); p.stok=newStok;
        hist.push({id:OfflineDB.genId('STK'),produkId:item.id,produkNama:item.nama,tipe:'transaksi',jumlah:item.qty,stokAkhir:newStok,keterangan:`Transaksi ${trx.noTrx}`,tanggal:now,user:session?.nama||'Kasir'});
      }
    });
    OfflineDB.save(OfflineDB.KEYS.products,products); OfflineDB.save(OfflineDB.KEYS.stock_history,hist);
    if(customer){
      const settings=OfflineDB.load(OfflineDB.KEYS.settings,{});
      const poin=Math.floor(body.total/1000)*(settings.poinRate||1);
      customer.poin=(customer.poin||0)+poin; customer.totalTransaksi=(customer.totalTransaksi||0)+1;
      OfflineDB.save(OfflineDB.KEYS.customers,customers);
    }
    return ok({id:trx.id, noTrx:trx.noTrx, total:trx.total});
  }

  // USERS
  if (r2==='users' && !id && method==='GET'){
    return ok(OfflineDB.load(OfflineDB.KEYS.users,[]).map(u=>({id:u.id,nama:u.nama,username:u.username,role:u.role,active:u.active,createdAt:u.createdAt})));
  }
  if (r2==='users' && !id && method==='POST'){
    const list=OfflineDB.load(OfflineDB.KEYS.users,[]);
    if(list.find(x=>x.username===body.username)) err('Username sudah digunakan');
    const u={id:OfflineDB.genId('USR'),nama:body.nama,username:body.username,password:body.password,role:body.role||'kasir',active:true,createdAt:now};
    list.push(u); OfflineDB.save(OfflineDB.KEYS.users,list);
    return ok({id:u.id,nama:u.nama,username:u.username,role:u.role});
  }
  if (r2==='users' && id && method==='PUT'){
    const list=OfflineDB.load(OfflineDB.KEYS.users,[]); const i=list.findIndex(x=>x.id===id);
    if(i<0) err('Pengguna tidak ditemukan');
    list[i]={...list[i],nama:body.nama,username:body.username,role:body.role,active:body.active, password: body.password||list[i].password};
    OfflineDB.save(OfflineDB.KEYS.users,list); return ok({ok:true});
  }
  if (r2==='users' && id && method==='DELETE'){
    if(session?.id===id) err('Tidak bisa menghapus akun sendiri');
    OfflineDB.save(OfflineDB.KEYS.users, OfflineDB.load(OfflineDB.KEYS.users,[]).filter(x=>x.id!==id));
    return ok({ok:true});
  }

  // KARYAWAN
  if (r2==='karyawan' && !id && method==='GET'){
    let list=OfflineDB.load(OfflineDB.KEYS.karyawan,[]);
    const s=q.get('search'), st=q.get('status');
    if(s){ const sl=s.toLowerCase(); list=list.filter(k=>k.nama.toLowerCase().includes(sl)||k.jabatan.toLowerCase().includes(sl)); }
    if(st) list=list.filter(k=>k.status===st);
    return ok(list);
  }
  if (r2==='karyawan' && !id && method==='POST'){
    if(!body.nama||!body.jabatan) err('Nama dan jabatan wajib diisi');
    const list=OfflineDB.load(OfflineDB.KEYS.karyawan,[]);
    const k={id:OfflineDB.genId('KRY'), nama:body.nama, jabatan:body.jabatan, telepon:body.telepon||'', email:body.email||'', gaji:body.gaji||0, tanggalMasuk:body.tanggalMasuk||'', status:body.status||'aktif', catatan:body.catatan||''};
    list.push(k); OfflineDB.save(OfflineDB.KEYS.karyawan,list); return ok(k);
  }
  if (r2==='karyawan' && id && method==='PUT'){
    const list=OfflineDB.load(OfflineDB.KEYS.karyawan,[]); const i=list.findIndex(x=>x.id===id);
    if(i<0) err('Karyawan tidak ditemukan');
    list[i]={...list[i],nama:body.nama,jabatan:body.jabatan,telepon:body.telepon||'',email:body.email||'',gaji:body.gaji||0,tanggalMasuk:body.tanggalMasuk||'',status:body.status||'aktif',catatan:body.catatan||''};
    OfflineDB.save(OfflineDB.KEYS.karyawan,list); return ok(list[i]);
  }
  if (r2==='karyawan' && id && method==='DELETE'){
    OfflineDB.save(OfflineDB.KEYS.karyawan, OfflineDB.load(OfflineDB.KEYS.karyawan,[]).filter(x=>x.id!==id));
    return ok({ok:true});
  }

  // ABSENSI
  if (r2==='absensi' && !id && method==='GET'){
    let list=OfflineDB.load(OfflineDB.KEYS.absensi,[]);
    const karyawan=OfflineDB.load(OfflineDB.KEYS.karyawan,[]);
    const kid=q.get('karyawanId'), tgl=q.get('tanggal'), sd=q.get('startDate'), ed=q.get('endDate');
    if(kid) list=list.filter(a=>a.karyawanId===kid);
    if(tgl) list=list.filter(a=>a.tanggal===tgl);
    if(sd) list=list.filter(a=>a.tanggal>=sd);
    if(ed) list=list.filter(a=>a.tanggal<=ed);
    list = list.map(a=>{ const k=karyawan.find(x=>x.id===a.karyawanId); return {...a, karyawanNama:k?.nama||'-', jabatan:k?.jabatan||'-'}; });
    return ok(list.slice().reverse());
  }
  if (r2==='absensi' && id==='checkin' && method==='POST'){
    const today=new Date().toISOString().slice(0,10);
    const nowT=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const list=OfflineDB.load(OfflineDB.KEYS.absensi,[]);
    let rec=list.find(a=>a.karyawanId===body.karyawanId && a.tanggal===today);
    if(!rec){ rec={id:OfflineDB.genId('ABS'),karyawanId:body.karyawanId,tanggal:today}; list.push(rec); }
    rec.checkIn=nowT; rec.fotoMasuk=body.foto||null;
    OfflineDB.save(OfflineDB.KEYS.absensi,list);
    return ok({ok:true,checkIn:nowT,fotoUrl:body.foto||null});
  }
  if (r2==='absensi' && id==='checkout' && method==='POST'){
    const today=new Date().toISOString().slice(0,10);
    const nowT=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const list=OfflineDB.load(OfflineDB.KEYS.absensi,[]);
    const rec=list.find(a=>a.karyawanId===body.karyawanId && a.tanggal===today);
    if(rec){ rec.checkOut=nowT; rec.fotoKeluar=body.foto||null; OfflineDB.save(OfflineDB.KEYS.absensi,list); }
    return ok({ok:true,checkOut:nowT,fotoUrl:body.foto||null});
  }

  // LAPORAN
  if (r2==='laporan' && id==='summary' && method==='GET'){
    const period=q.get('period')||'harian'; const n=new Date();
    let start;
    if(period==='harian') start=n.toISOString().slice(0,10);
    else if(period==='mingguan'){ const d=new Date(n); d.setDate(d.getDate()-6); start=d.toISOString().slice(0,10); }
    else if(period==='bulanan') start=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`;
    else start=`${n.getFullYear()}-01-01`;
    const trx=OfflineDB.load(OfflineDB.KEYS.transactions,[]).filter(t=>t.tanggal.slice(0,10)>=start);
    const omzet=trx.reduce((s,t)=>s+t.total,0);
    return ok({omzet, transaksi:trx.length, avg: trx.length?Math.round(omzet/trx.length):0, pelanggan:OfflineDB.load(OfflineDB.KEYS.customers,[]).length});
  }
  if (r2==='laporan' && id==='chart' && method==='GET'){
    const trx=OfflineDB.load(OfflineDB.KEYS.transactions,[]); const result=[];
    for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const ds=d.toISOString().slice(0,10);
      const total=trx.filter(t=>t.tanggal.slice(0,10)===ds).reduce((s,t)=>s+t.total,0);
      result.push({date:ds, label:d.toLocaleDateString('id-ID',{weekday:'short'}), total}); }
    return ok(result);
  }
  if (r2==='laporan' && id==='top-products' && method==='GET'){
    const period=q.get('period')||'bulanan'; const n=new Date();
    let start;
    if(period==='harian') start=n.toISOString().slice(0,10);
    else if(period==='mingguan'){ const d=new Date(n); d.setDate(d.getDate()-6); start=d.toISOString().slice(0,10); }
    else if(period==='bulanan') start=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`;
    else start=`${n.getFullYear()}-01-01`;
    const trx=OfflineDB.load(OfflineDB.KEYS.transactions,[]).filter(t=>t.tanggal.slice(0,10)>=start);
    const map={};
    trx.forEach(t=>(t.items||[]).forEach(it=>{ if(!map[it.id]) map[it.id]={nama:it.nama,qty:0,revenue:0}; map[it.id].qty+=it.qty; map[it.id].revenue+=it.subtotal||it.hargaJual*it.qty; }));
    return ok(Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,10));
  }

  err(`Offline route tidak ditemukan: ${method} ${path}`);
}


function p2(n) { return String(n).padStart(2,'0'); }

/* ═══════════════════════════════════════
   SESSION — JWT token di localStorage
═══════════════════════════════════════ */
const Session = {
  get()      { try { return JSON.parse(localStorage.getItem('nfpos_session')); } catch { return null; } },
  set(u)     { localStorage.setItem('nfpos_session', JSON.stringify(u)); },
  setToken(t){ localStorage.setItem('nfpos_token', t); },
  clear()    { localStorage.removeItem('nfpos_token'); localStorage.removeItem('nfpos_session'); },
  isValid()  { return !!localStorage.getItem('nfpos_token'); },
};

/* ═══════════════════════════════════════
   CFG — Settings dari API (di-cache)
═══════════════════════════════════════ */
const Cfg = {
  _data: null,
  async load()      { this._data = await API.get('/api/settings'); return this._data; },
  get()             { return this._data || {}; },
  async save(data)  { await API.put('/api/settings', data); this._data = data; },
};


/* ═══════════════════ UTILS ═══════════════════ */
const U = {
  rp(n)   { return 'Rp ' + Math.round(n||0).toLocaleString('id-ID'); },
  dt(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) + ' ' +
           d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  },
  today() { return new Date().toISOString().slice(0,10); },
  esc(s)  { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  str(s)  { return String(s||'').trim(); },
  int(s)  { return parseInt(s)||0; },
  flt(s)  { return parseFloat(s)||0; },
};

/* ═══════════════════ TOAST ═══════════════════ */
const Toast = {
  show(msg, type='info', ms=3200) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<div class="toast-dot"></div><span class="toast-msg">${U.esc(msg)}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(()=>t.remove(), 300); }, ms);
  },
  ok(m)   { this.show(m,'success'); },
  err(m)  { this.show(m,'error'); },
  warn(m) { this.show(m,'warning'); },
  info(m) { this.show(m,'info'); },
};

/* ═══════════════════ MODAL ═══════════════════ */
const Modal = {
  open(id)  { const el=document.getElementById(id); if(el) el.classList.add('open'); },
  close(id) { const el=document.getElementById(id); if(el) el.classList.remove('open'); },
  confirm(title, msg, cb) {
    document.getElementById('confirm-title').textContent   = title;
    document.getElementById('confirm-message').textContent = msg;
    const oldBtn = document.getElementById('btn-confirm-ok');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.addEventListener('click', () => { Modal.close('modal-confirm'); cb(); });
    this.open('modal-confirm');
  }
};

/* ═══════════════════ ROUTER ═══════════════════ */
const Router = {
  current: '',
  titles: {
    dashboard:'Dashboard', kasir:'Kasir', produk:'Produk',
    inventaris:'Inventaris', pelanggan:'Pelanggan',
    transaksi:'Transaksi', laporan:'Laporan',
    pengguna:'Pengguna', pengaturan:'Pengaturan',
    karyawan:'Karyawan', absensi:'Absensi',
  },

  go(page) {
    const session = Session.get();
    if (!session) return;

    // Role guard
    if (['pengguna','pengaturan','karyawan','absensi'].includes(page) && session.role === 'kasir') {
      Toast.warn('Akses ditolak.'); return;
    }

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    // Show target section
    const sec = document.getElementById(`sec-${page}`);
    if (sec) sec.classList.add('active');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // Topbar title
    document.getElementById('topbar-title').textContent = this.titles[page] || page;

    this.current = page;
    this.loadSection(page);

    // Close mobile sidebar
    closeMobileSidebar();
  },

  loadSection(page) {
    const map = {
      dashboard:   () => Dashboard.load(),
      kasir:       () => POS.load(),
      produk:      () => Products.load(),
      inventaris:  () => Inventory.load(),
      pelanggan:   () => Customers.load(),
      transaksi:   () => Transactions.load(),
      laporan:     () => Reports.load(),
      pengguna:    () => Users.load(),
      pengaturan:  () => SettingsPage.load(),
      karyawan:    () => Employees.load(),
      absensi:     () => Attendance.load(),
    };
    if (map[page]) {
      const p = map[page]();
      if (p instanceof Promise) {
        p.then(()=>updateConnStatus()).catch(err => {
          updateConnStatus();
          console.error(`Error loading ${page}:`, err);
        });
      }
    }
  }
};

/* ═══════════════════ SIDEBAR MOBILE ═══════════════════ */
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebar-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

/* ═══════════════════ CLOCK ═══════════════════ */
function startClock() {
  function tick() {
    const now = new Date();
    const de  = document.getElementById('topbar-date');
    const te  = document.getElementById('topbar-time');
    if (de) de.textContent = now.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
    if (te) te.textContent = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  tick(); setInterval(tick, 1000);
}

/* ═══════════════════ MINI CHART ═══════════════════ */
const Chart = {
  draw(canvasId, labels, values) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || canvas.parentElement.offsetWidth || 500;
    const H = 200;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const PAD = { top:16, right:16, bottom:32, left:58 };
    const gW = W - PAD.left - PAD.right;
    const gH = H - PAD.top  - PAD.bottom;
    ctx.clearRect(0, 0, W, H);

    const maxVal = Math.max(...values, 1);
    const n = labels.length;
    const stepX = n > 1 ? gW / (n - 1) : gW;

    // Gridlines
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + gH - (gH / 4) * i;
      ctx.strokeStyle = '#2A2A2A'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
      const v = (maxVal / 4) * i;
      ctx.fillStyle = '#606060'; ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(v >= 1e6 ? (v/1e6).toFixed(1)+'jt' : v >= 1e3 ? (v/1e3).toFixed(0)+'k' : v.toFixed(0), PAD.left-4, y+4);
    }

    if (n < 2) return;

    // Area
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + gH);
    grad.addColorStop(0, 'rgba(240,240,240,0.10)');
    grad.addColorStop(1, 'rgba(240,240,240,0.00)');
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = PAD.left + i * stepX;
      const y = PAD.top  + gH - (v / maxVal) * gH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(PAD.left + (n-1)*stepX, PAD.top + gH);
    ctx.lineTo(PAD.left, PAD.top + gH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.strokeStyle = '#F0F0F0'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = PAD.left + i * stepX;
      const y = PAD.top  + gH - (v / maxVal) * gH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }); ctx.stroke();

    // Dots + x-labels
    values.forEach((v, i) => {
      const x = PAD.left + i * stepX;
      const y = PAD.top  + gH - (v / maxVal) * gH;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI*2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.fillStyle = '#606060'; ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(labels[i], x, H - 6);
    });
  }
};

/* ═══════════════════ DASHBOARD ═══════════════════ */
const Dashboard = {
  async load() {
    try {
      const [summary, chart, topProducts, transactions] = await Promise.all([
        API.get('/api/laporan/summary?period=harian'),
        API.get('/api/laporan/chart'),
        API.get('/api/laporan/top-products?period=bulanan'),
        API.get('/api/transactions'),
      ]);
      const products  = await API.get('/api/products');
      const customers = await API.get('/api/customers');
      const cfg       = Cfg.get();
      const today     = U.today();
      const thisMonth = today.slice(0,7);

      const todayTrx  = transactions.filter(t=>t.tanggal?.slice(0,10)===today);
      const monthTrx  = transactions.filter(t=>t.tanggal?.slice(0,7)===thisMonth);
      const totalStok = products.reduce((s,p)=>s+(p.stok||0),0);
      const lowStok   = products.filter(p=>p.stok<=(cfg.minStok||5));

      setText('stat-omzet-hari',  U.rp(summary.omzet));
      setText('stat-omzet-delta', `${summary.transaksi} transaksi hari ini`);
      setText('stat-omzet-bulan', U.rp(monthTrx.reduce((s,t)=>s+t.total,0)));
      setText('stat-trx-bulan',   `${monthTrx.length} transaksi bulan ini`);
      setText('stat-produk',      products.length);
      setText('stat-stok',        `${totalStok} unit tersedia`);
      setText('stat-transaksi',   transactions.length);
      setText('stat-trx-hari',    `${todayTrx.length} hari ini`);
      setText('stat-pelanggan',   customers.length);
      setText('stat-total-stok',  totalStok);
      setText('stat-stok-low',    `${lowStok.length} item stok rendah`);

      // Chart
      const days = chart.map(c=>c.label);
      const vals = chart.map(c=>c.total);
      setTimeout(()=>Chart.draw('sales-chart',days,vals),80);

      // Top products
      const tpEl = document.getElementById('top-products-list');
      tpEl.innerHTML = topProducts.length
        ? topProducts.slice(0,5).map((p,i)=>`<div class="top-list-item"><span class="top-list-rank">#${i+1}</span><span class="top-list-name">${U.esc(p.nama)}</span><span class="top-list-val">${p.qty} terjual</span></div>`).join('')
        : '<div class="empty-state-sm">Belum ada penjualan</div>';

      // Recent activity
      const acts = [...transactions].sort((a,b)=>new Date(b.tanggal)-new Date(a.tanggal)).slice(0,8);
      const raEl = document.getElementById('recent-activity-list');
      raEl.innerHTML = acts.length
        ? acts.map(t=>`<div class="activity-item"><div class="activity-dot sale"></div><div><div class="activity-text">Transaksi <strong>${U.esc(t.noTrx)}</strong> — ${U.rp(t.total)}</div><div class="activity-time">${U.dt(t.tanggal)}</div></div></div>`).join('')
        : '<div class="empty-state-sm">Belum ada aktivitas</div>';
    } catch(err) {
      Toast.err('Gagal memuat dashboard: ' + err.message);
    }
  }
};

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ═══════════════════ PRODUCTS ═══════════════════ */
const Products = {
  editId: null,
  _cache: [],

  async load() {
    try {
      this._cache = await API.get('/api/products');
    } catch(e) { Toast.err('Gagal memuat produk'); }
    this.renderTable();
    this.populateCatFilter();
  },

  getAll() { return this._cache; },

  renderTable() {
    const products = this.getAll();
    const search   = (document.getElementById('produk-search')?.value||'').toLowerCase();
    const catFilter= document.getElementById('produk-filter-cat')?.value||'';
    const cfg      = Cfg.get();
    const list = products.filter(p=>{
      const ms = !search || p.nama.toLowerCase().includes(search) || p.kode.toLowerCase().includes(search) || (p.barcode||'').includes(search);
      const mc = !catFilter || p.kategori===catFilter;
      return ms && mc;
    });
    const tbody = document.getElementById('produk-tbody');
    const empty = document.getElementById('produk-empty');
    if (!list.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    tbody.innerHTML = list.map(p=>{
      const sc = p.stok<=(cfg.minStok||5)?'low':'ok';
      return `<tr>
        <td class="td-code">${U.esc(p.kode)}</td>
        <td class="td-name">${U.esc(p.nama)}</td>
        <td><span class="badge badge-neutral">${U.esc(p.kategori)}</span></td>
        <td class="td-price">${U.rp(p.hargaModal)}</td>
        <td class="td-price">${U.rp(p.hargaJual)}</td>
        <td class="td-stock ${sc}">${p.stok} ${U.esc(p.satuan||'pcs')}</td>
        <td>${U.esc(p.supplier||'—')}</td>
        <td><div class="action-btns">
          <button class="btn-icon" onclick="Products.edit('${p.id}')" title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon danger" onclick="Products.delete('${p.id}')" title="Hapus"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div></td>
      </tr>`;
    }).join('');
  },

  populateCatFilter() {
    const cats = [...new Set(this.getAll().map(p=>p.kategori).filter(Boolean))].sort();
    const sel  = document.getElementById('produk-filter-cat');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Semua Kategori</option>' + cats.map(c=>`<option value="${U.esc(c)}" ${c===cur?'selected':''}>${U.esc(c)}</option>`).join('');
    const dl = document.getElementById('kategori-list');
    if (dl) dl.innerHTML = cats.map(c=>`<option value="${U.esc(c)}">`).join('');
  },

  openModal(id=null) {
    this.editId=id;
    document.getElementById('modal-produk-title').textContent = id?'Edit Produk':'Tambah Produk';
    const fields=['produk-id','p-kode','p-barcode','p-nama','p-kategori','p-supplier','p-harga-modal','p-harga-jual','p-stok','p-satuan','p-deskripsi'];
    if (id) {
      const p=this.getAll().find(x=>x.id===id); if(!p)return;
      const vals={
        'produk-id':p.id,'p-kode':p.kode,'p-barcode':p.barcode||'','p-nama':p.nama,
        'p-kategori':p.kategori,'p-supplier':p.supplier||'','p-harga-modal':p.hargaModal,
        'p-harga-jual':p.hargaJual,'p-stok':p.stok,'p-satuan':p.satuan||'','p-deskripsi':p.deskripsi||''
      };
      Object.entries(vals).forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.value=v;});
    } else {
      fields.forEach(f=>{const el=document.getElementById(f);if(el)el.value='';});
    }
    Modal.open('modal-produk');
  },

  async save() {
    const kode=U.str(document.getElementById('p-kode').value);
    const nama=U.str(document.getElementById('p-nama').value);
    const kat =U.str(document.getElementById('p-kategori').value);
    const hj  =U.flt(document.getElementById('p-harga-jual').value);
    if (!kode||!nama||!kat||!hj) { Toast.err('Isi semua field wajib (*)'); return; }
    const btn = document.getElementById('btn-save-produk');
    btn.disabled=true; btn.textContent='Menyimpan...';
    try {
      const data = {
        kode, nama, barcode:U.str(document.getElementById('p-barcode').value),
        kategori:kat, hargaModal:U.flt(document.getElementById('p-harga-modal').value),
        hargaJual:hj, stok:U.int(document.getElementById('p-stok').value),
        supplier:U.str(document.getElementById('p-supplier').value),
        satuan:U.str(document.getElementById('p-satuan').value)||'pcs',
        deskripsi:U.str(document.getElementById('p-deskripsi').value),
      };
      if (this.editId) await API.put(`/api/products/${this.editId}`, data);
      else await API.post('/api/products', data);
      Modal.close('modal-produk');
      await this.load();
      Toast.ok(this.editId?'Produk diperbarui':'Produk ditambahkan');
      this.editId=null;
    } catch(err) { Toast.err(err.message); }
    finally { btn.disabled=false; btn.textContent='Simpan'; }
  },

  edit(id) { this.openModal(id); },

  delete(id) {
    const p=this.getAll().find(x=>x.id===id); if(!p)return;
    Modal.confirm('Hapus Produk',`Hapus "${p.nama}"?`, async ()=>{
      try {
        await API.delete(`/api/products/${id}`);
        await this.load();
        Toast.ok('Produk dihapus');
      } catch(err){ Toast.err(err.message); }
    });
  }
};

/* ═══════════════════ INVENTORY ═══════════════════ */
const Inventory = {
  async load() { await Promise.all([this.renderStockTable(), this.renderHistory()]); },

  async renderStockTable() {
    const products=await API.get('/api/products');
    const cfg=Cfg.get();
    const tbody=document.getElementById('inventory-tbody');
    if(!products.length){tbody.innerHTML='<tr><td colspan="4" class="table-empty">Tidak ada produk</td></tr>';return;}
    tbody.innerHTML=products.map(p=>{
      const low=p.stok<=(cfg.minStok||5);
      return `<tr>
        <td class="td-name">${U.esc(p.nama)}</td>
        <td><span class="badge badge-neutral">${U.esc(p.kategori)}</span></td>
        <td class="td-stock ${low?'low':'ok'}">${p.stok} ${U.esc(p.satuan||'pcs')}</td>
        <td><span class="badge ${low?'badge-warn':'badge-success'}">${low?'Rendah':'Normal'}</span></td>
      </tr>`;
    }).join('');
  },

  async renderHistory() {
    const history=await API.get('/api/stock-history');
    const tbody=document.getElementById('stock-history-tbody');
    if(!history.length){tbody.innerHTML='<tr><td colspan="6" class="table-empty">Belum ada riwayat</td></tr>';return;}
    const typeLabel={masuk:'Stok Masuk',keluar:'Stok Keluar',penyesuaian:'Penyesuaian',transaksi:'Penjualan'};
    const typeClass={masuk:'badge-success',keluar:'badge-danger',penyesuaian:'badge-info',transaksi:'badge-warn'};
    tbody.innerHTML=history.map(h=>`
      <tr>
        <td>${U.dt(h.tanggal)}</td>
        <td class="td-name">${U.esc(h.produkNama)}</td>
        <td><span class="badge ${typeClass[h.tipe]||'badge-neutral'}">${typeLabel[h.tipe]||h.tipe}</span></td>
        <td>${(h.tipe==='keluar'||h.tipe==='transaksi')?'-':'+'}${Math.abs(h.jumlah)}</td>
        <td>${h.stokAkhir}</td>
        <td>${U.esc(h.keterangan||'—')}</td>
      </tr>
    `).join('');
  },

  async openModal(type) {
    document.getElementById('modal-stok-title').textContent =
      type==='masuk'?'Stok Masuk':type==='keluar'?'Stok Keluar':'Penyesuaian Stok';
    document.getElementById('stok-type').value = type;
    document.getElementById('stok-jumlah-group').style.display = type==='penyesuaian'?'none':'flex';
    document.getElementById('stok-final-group').style.display  = type==='penyesuaian'?'flex':'none';
    const products=await API.get('/api/products');
    const sel=document.getElementById('stok-produk');
    sel.innerHTML='<option value="">— Pilih Produk —</option>'+
      products.map(p=>`<option value="${p.id}">${U.esc(p.nama)} (Stok: ${p.stok})</option>`).join('');
    document.getElementById('stok-jumlah').value='';
    document.getElementById('stok-final').value='';
    document.getElementById('stok-keterangan').value='';
    Modal.open('modal-stok');
  },

  async save() {
    const type=document.getElementById('stok-type').value;
    const produkId=document.getElementById('stok-produk').value;
    if(!produkId){Toast.err('Pilih produk');return;}
    const btn=document.getElementById('btn-save-stok');
    btn.disabled=true; btn.textContent='Menyimpan...';
    try {
      await API.post('/api/stock-history',{
        produkId, tipe:type,
        jumlah:U.int(document.getElementById('stok-jumlah').value),
        stokFinal:U.int(document.getElementById('stok-final').value),
        keterangan:U.str(document.getElementById('stok-keterangan').value),
      });
      Modal.close('modal-stok');
      await this.load();
      Toast.ok('Stok berhasil diperbarui');
    } catch(err){ Toast.err(err.message); }
    finally { btn.disabled=false; btn.textContent='Simpan'; }
  }
};

/* ═══════════════════ CUSTOMERS ═══════════════════ */
const Customers = {
  editId: null,
  _cache: [],

  async load() {
    try { this._cache = await API.get('/api/customers'); } catch(e){ Toast.err('Gagal memuat pelanggan'); }
    this.renderTable();
  },
  getAll() { return this._cache; },

  renderTable() {
    const customers=this.getAll();
    const search=(document.getElementById('pelanggan-search')?.value||'').toLowerCase();
    const list=customers.filter(c=>!search||c.nama.toLowerCase().includes(search)||(c.hp||'').includes(search));
    const tbody=document.getElementById('pelanggan-tbody');
    const empty=document.getElementById('pelanggan-empty');
    if(!list.length){tbody.innerHTML='';empty.classList.remove('hidden');return;}
    empty.classList.add('hidden');
    tbody.innerHTML=list.map(c=>`
      <tr>
        <td class="td-name">${U.esc(c.nama)}</td>
        <td>${U.esc(c.hp||'—')}</td>
        <td>${U.esc(c.email||'—')}</td>
        <td>${U.esc(c.alamat||'—')}</td>
        <td><span class="badge badge-info">${c.poin||0} poin</span></td>
        <td>${c.totalTransaksi||0}x</td>
        <td><div class="action-btns">
          <button class="btn-icon" onclick="Customers.edit('${c.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon danger" onclick="Customers.delete('${c.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div></td>
      </tr>
    `).join('');
  },

  openModal(id=null) {
    this.editId=id;
    document.getElementById('modal-pelanggan-title').textContent=id?'Edit Pelanggan':'Tambah Pelanggan';
    if(id){
      const c=this.getAll().find(x=>x.id===id);if(!c)return;
      document.getElementById('pelanggan-id').value=c.id;
      document.getElementById('c-nama').value=c.nama;
      document.getElementById('c-hp').value=c.hp||'';
      document.getElementById('c-email').value=c.email||'';
      document.getElementById('c-alamat').value=c.alamat||'';
      document.getElementById('c-poin').value=c.poin||0;
    } else {
      ['pelanggan-id','c-nama','c-hp','c-email','c-alamat'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
      document.getElementById('c-poin').value=0;
    }
    Modal.open('modal-pelanggan');
  },

  async save() {
    const nama=U.str(document.getElementById('c-nama').value);
    const hp=U.str(document.getElementById('c-hp').value);
    if(!nama||!hp){Toast.err('Nama dan No. HP wajib diisi');return;}
    const btn=document.getElementById('btn-save-pelanggan');
    btn.disabled=true;
    try {
      const data={nama,hp,email:U.str(document.getElementById('c-email').value),alamat:U.str(document.getElementById('c-alamat').value),poin:U.int(document.getElementById('c-poin').value)};
      if(this.editId) await API.put(`/api/customers/${this.editId}`,data);
      else await API.post('/api/customers',data);
      Modal.close('modal-pelanggan');
      await this.load();
      Toast.ok(this.editId?'Pelanggan diperbarui':'Pelanggan ditambahkan');
      this.editId=null;
    } catch(err){ Toast.err(err.message); }
    finally{ btn.disabled=false; }
  },

  edit(id){this.openModal(id);},
  delete(id){
    const c=this.getAll().find(x=>x.id===id);if(!c)return;
    Modal.confirm('Hapus Pelanggan',`Hapus "${c.nama}"?`, async ()=>{
      try{ await API.delete(`/api/customers/${id}`); await this.load(); Toast.ok('Pelanggan dihapus'); }
      catch(err){ Toast.err(err.message); }
    });
  }
};


/* ═══════════════════ POS / KASIR ═══════════════════ */
const POS = {
  cart: [],
  payMethod: 'tunai',
  _products: [],

  async load() {
    await this.buildCategoryFilters();
    this.renderProducts();
    this.renderCart();
    await this.populateCustomers();
    const cfg=Cfg.get();
    const taxEl=document.getElementById('cart-tax');
    if(taxEl && !taxEl._manuallySet) taxEl.value=cfg.defaultTax||0;
  },

  async populateCustomers(){
    try {
      const customers=await API.get('/api/customers');
      const sel=document.getElementById('cart-customer');
      if(!sel)return;
      sel.innerHTML='<option value="">— Pilih Pelanggan (Opsional) —</option>'+
        customers.map(c=>`<option value="${c.id}">${U.esc(c.nama)} (${U.esc(c.hp||'')})</option>`).join('');
    } catch(e){}
  },

  async buildCategoryFilters(){
    const products = await API.get('/api/products');
    this._products = products;
    const cats=[...new Set(products.map(p=>p.kategori).filter(Boolean))].sort();
    const bar=document.getElementById('pos-filter-bar');
    bar.innerHTML=`<button class="filter-chip active" data-cat="all">Semua</button>`+
      cats.map(c=>`<button class="filter-chip" data-cat="${U.esc(c)}">${U.esc(c)}</button>`).join('');
    bar.querySelectorAll('.filter-chip').forEach(btn=>{
      btn.addEventListener('click',()=>{
        bar.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this.renderProducts();
      });
    });
  },

  async load(){
    await this.buildCategoryFilters();
    this.renderProducts();
    this.renderCart();
    await this.populateCustomers();
    const cfg=Cfg.get();
    const taxEl=document.getElementById('cart-tax');
    if(taxEl && !taxEl._manuallySet) taxEl.value=cfg.defaultTax||0;
  },

  renderProducts(){
    const products = this._products || [];
    const search=(document.getElementById('pos-search')?.value||'').toLowerCase();
    const activeChip=document.querySelector('#pos-filter-bar .filter-chip.active');
    const cat=activeChip?.dataset.cat||'all';
    const list=products.filter(p=>{
      const ms=!search||p.nama.toLowerCase().includes(search)||(p.barcode||'').includes(search)||p.kode.toLowerCase().includes(search);
      const mc=cat==='all'||p.kategori===cat;
      return ms&&mc;
    });
    const grid=document.getElementById('pos-products-grid');
    if(!list.length){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:40px;font-size:13px">Produk tidak ditemukan</div>';return;}
    grid.innerHTML=list.map(p=>`
      <div class="pos-product-card ${p.stok===0?'out-of-stock':''}" onclick="POS.addToCart('${p.id}')">
        <div class="pos-product-name">${U.esc(p.nama)}</div>
        <div class="pos-product-cat">${U.esc(p.kategori)}</div>
        <div class="pos-product-price">${U.rp(p.hargaJual)}</div>
        <div class="pos-product-stock ${p.stok<=(Cfg.get().minStok||5)?'low':''}">${p.stok===0?'Habis':'Stok: '+p.stok}</div>
      </div>
    `).join('');
  },

  addToCart(productId){
    const products = this._products || [];
    const p=products.find(x=>x.id===productId);
    if(!p||p.stok===0){Toast.warn('Stok habis');return;}
    const ex=this.cart.find(x=>x.id===productId);
    if(ex){
      if(ex.qty>=p.stok){Toast.warn(`Stok tersedia hanya ${p.stok}`);return;}
      ex.qty++;
    } else {
      this.cart.push({id:p.id,nama:p.nama,hargaJual:p.hargaJual,hargaModal:p.hargaModal,stok:p.stok,qty:1});
    }
    this.renderCart();
  },

  removeFromCart(productId){
    this.cart=this.cart.filter(x=>x.id!==productId);
    this.renderCart();
  },

  changeQty(productId,delta){
    const item=this.cart.find(x=>x.id===productId);if(!item)return;
    const nq=item.qty+delta;
    if(nq<=0){this.removeFromCart(productId);return;}
    if(nq>item.stok){Toast.warn(`Stok tersedia hanya ${item.stok}`);return;}
    item.qty=nq;
    this.renderCart();
  },

  renderCart(){
    const cartEl=document.getElementById('cart-items');
    const badge=document.getElementById('cart-badge');
    const countEl=document.getElementById('cart-count');
    const total=this.cart.reduce((s,i)=>s+i.qty,0);

    if(badge){badge.textContent=total;badge.style.display=total>0?'block':'none';}
    if(countEl)countEl.textContent=`${total} item`;

    if(!this.cart.length){
      cartEl.innerHTML='<div class="cart-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><p>Keranjang kosong</p></div>';
    } else {
      cartEl.innerHTML=this.cart.map(item=>`
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${U.esc(item.nama)}</div>
            <div class="cart-item-price">${U.rp(item.hargaJual)} / pcs</div>
            <div class="cart-item-controls">
              <button class="qty-btn" onclick="POS.changeQty('${item.id}',-1)">−</button>
              <span class="qty-display">${item.qty}</span>
              <button class="qty-btn" onclick="POS.changeQty('${item.id}',1)">+</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <button class="btn-remove-item" onclick="POS.removeFromCart('${item.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="cart-item-total">${U.rp(item.hargaJual*item.qty)}</div>
          </div>
        </div>
      `).join('');
    }
    this.updateTotals();
  },

  calcTotals(){
    const subtotal=this.cart.reduce((s,i)=>s+(i.hargaJual*i.qty),0);
    const disc=U.flt(document.getElementById('cart-discount')?.value)/100;
    const tax =U.flt(document.getElementById('cart-tax')?.value)/100;
    const discAmt=(subtotal*disc);
    const taxAmt =((subtotal-discAmt)*tax);
    const total  =subtotal-discAmt+taxAmt;
    return {subtotal,disc,tax,discAmt,taxAmt,total};
  },

  updateTotals(){
    const {subtotal,total}=this.calcTotals();
    setText('cart-subtotal',U.rp(subtotal));
    setText('cart-total',U.rp(total));
    this.updateChange();
  },

  updateChange(){
    const {total}=this.calcTotals();
    const received=U.flt(document.getElementById('cash-received')?.value);
    const change=received-total;
    const el=document.getElementById('cart-change');
    if(el){el.textContent=U.rp(Math.max(0,change));el.style.color=change<0?'var(--danger)':'var(--success)';}
  },

  async checkout(){
    if(!this.cart.length){Toast.warn('Keranjang kosong');return;}
    const session=Session.get();
    const {subtotal,disc,tax,discAmt,taxAmt,total}=this.calcTotals();
    const discPct=U.flt(document.getElementById('cart-discount')?.value);
    const taxPct =U.flt(document.getElementById('cart-tax')?.value);
    const received=this.payMethod==='tunai'?U.flt(document.getElementById('cash-received')?.value):total;
    const change=received-total;
    if(this.payMethod==='tunai'&&received<total){Toast.err('Uang kurang dari total');return;}

    const customerId=document.getElementById('cart-customer')?.value||'';
    const btn=document.getElementById('btn-checkout');
    btn.disabled=true; btn.textContent='Memproses...';
    try {
      const result = await API.post('/api/transactions',{
        customerId,
        items:this.cart.map(i=>({id:i.id,nama:i.nama,hargaJual:i.hargaJual,qty:i.qty,subtotal:i.hargaJual*i.qty})),
        subtotal,disc:discPct,tax:taxPct,discAmt,taxAmt,total,
        metodePembayaran:this.payMethod,
        dibayar:received,kembalian:Math.max(0,change),
      });
      // Clear cart
      this.cart=[];
      document.getElementById('cash-received').value='';
      document.getElementById('cart-customer').value='';
      document.getElementById('cart-discount').value=0;
      this.renderCart();
      // Refresh product stock
      await this.buildCategoryFilters();
      this.renderProducts();
      Toast.ok(`Transaksi ${result.noTrx} berhasil!`);
      // Show struk
      const trxDetail = await API.get(`/api/transactions/${result.id}`);
      this.showStruk(trxDetail);
    } catch(err){ Toast.err(err.message); }
    finally { btn.disabled=false; btn.textContent='Proses Transaksi'; }
  },

  populateCustomers(){ /* handled in load() */ },

  showStruk(trx){
    const html=Receipt.gen(trx,Cfg.get());
    document.getElementById('struk-content').innerHTML=html;
    Modal.open('modal-struk');
  },

  clearCart(){
    if(!this.cart.length)return;
    Modal.confirm('Kosongkan Keranjang','Hapus semua item?',()=>{this.cart=[];this.renderCart();});
  }
};

/* ═══════════════════ RECEIPT ═══════════════════ */
const Receipt = {
  gen(trx,cfg){
    const lines=trx.items.map(i=>`
      <div class="struk-item">
        <div class="struk-item-name">${U.esc(i.nama)}</div>
        <div class="struk-item-sub"><span>${i.qty} x ${U.rp(i.hargaJual)}</span><span>${U.rp(i.qty*i.hargaJual)}</span></div>
      </div>`).join('');
    return `
      <div class="struk-container">
        <div class="struk-header">
          <div class="struk-store-name">${U.esc(cfg.namaToko||'TOKO')}</div>
          <div class="struk-store-addr">${U.esc(cfg.alamat||'')}</div>
          <div class="struk-store-addr">${U.esc(cfg.telepon||'')}</div>
        </div>
        ${cfg.headerStruk?`<div style="text-align:center;font-size:10px;color:#555;margin-bottom:6px">${U.esc(cfg.headerStruk)}</div>`:''}
        <hr class="struk-divider"/>
        <div class="struk-info">
          <div class="struk-info-row"><span>No.</span><span>${U.esc(trx.noTrx)}</span></div>
          <div class="struk-info-row"><span>Tanggal</span><span>${U.dt(trx.tanggal)}</span></div>
          <div class="struk-info-row"><span>Kasir</span><span>${U.esc(trx.kasir)}</span></div>
          <div class="struk-info-row"><span>Pelanggan</span><span>${U.esc(trx.customerNama||'Umum')}</span></div>
        </div>
        <hr class="struk-divider"/>
        <div class="struk-items">${lines}</div>
        <hr class="struk-divider"/>
        <div class="struk-totals">
          <div class="struk-total-row"><span>Subtotal</span><span>${U.rp(trx.subtotal)}</span></div>
          ${trx.discAmt>0?`<div class="struk-total-row"><span>Diskon (${trx.disc}%)</span><span>- ${U.rp(trx.discAmt)}</span></div>`:''}
          ${trx.taxAmt>0?`<div class="struk-total-row"><span>Pajak (${trx.tax}%)</span><span>${U.rp(trx.taxAmt)}</span></div>`:''}
          <div class="struk-total-row struk-total-final"><span>TOTAL</span><span>${U.rp(trx.total)}</span></div>
          <div class="struk-total-row"><span>${trx.metodePembayaran.toUpperCase()}</span><span>${U.rp(trx.dibayar)}</span></div>
          ${trx.kembalian>0?`<div class="struk-total-row"><span>Kembalian</span><span>${U.rp(trx.kembalian)}</span></div>`:''}
        </div>
        <hr class="struk-divider"/>
        <div class="struk-footer">
          ${cfg.footerStruk?`<p>${U.esc(cfg.footerStruk)}</p>`:''}
          <p>Powered by NEVERFADE POS</p>
        </div>
      </div>`;
  },
  print(html){
    const pa=document.getElementById('print-area');
    pa.innerHTML=html;
    window.print();
  }
};

/* ═══════════════════ TRANSACTIONS ═══════════════════ */
const Transactions = {
  currentTrx: null,

  async load(){
    try {
      const all = await API.get('/api/transactions');
      this._cache = all;
      this.renderTable(all);
    } catch(e){ Toast.err('Gagal memuat transaksi'); }
  },

  renderTable(all){
    all = all || this._cache || [];
    const search=(document.getElementById('trx-search')?.value||'').toLowerCase();
    const start=document.getElementById('trx-filter-start')?.value;
    const end  =document.getElementById('trx-filter-end')?.value;
    let list=all.filter(t=>{
      const ms=!search||t.noTrx.toLowerCase().includes(search)||(t.customerNama||'').toLowerCase().includes(search);
      const td=t.tanggal?.slice(0,10);
      return ms&&(!start||td>=start)&&(!end||td<=end);
    });

    const tbody=document.getElementById('transaksi-tbody');
    const empty=document.getElementById('transaksi-empty');
    if(!list.length){tbody.innerHTML='';empty.classList.remove('hidden');return;}
    empty.classList.add('hidden');
    const mLabel={tunai:'Tunai',transfer:'Transfer',qris:'QRIS'};
    tbody.innerHTML=list.map(t=>`
      <tr>
        <td class="td-code">${U.esc(t.noTrx)}</td>
        <td>${U.dt(t.tanggal)}</td>
        <td>${U.esc(t.kasir)}</td>
        <td>${U.esc(t.customerNama||'Umum')}</td>
        <td>${(t.items||[]).length} item</td>
        <td class="td-price">${U.rp(t.total)}</td>
        <td><span class="badge badge-neutral">${mLabel[t.metodePembayaran]||t.metodePembayaran}</span></td>
        <td><div class="action-btns">
          <button class="btn-icon" onclick="Transactions.view('${t.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div></td>
      </tr>
    `).join('');
  },

  async view(id){
    try {
      const t = await API.get(`/api/transactions/${id}`);
      this.currentTrx = t;
      document.getElementById('transaksi-detail-body').innerHTML=`
        <div class="form-grid-2" style="margin-bottom:16px">
          <div><div class="stat-label">No. Transaksi</div><div style="font-weight:600;margin-top:3px">${U.esc(t.noTrx)}</div></div>
          <div><div class="stat-label">Tanggal</div><div style="margin-top:3px">${U.dt(t.tanggal)}</div></div>
          <div><div class="stat-label">Kasir</div><div style="margin-top:3px">${U.esc(t.kasir)}</div></div>
          <div><div class="stat-label">Pelanggan</div><div style="margin-top:3px">${U.esc(t.customerNama||'Umum')}</div></div>
          <div><div class="stat-label">Metode</div><div style="margin-top:3px">${U.esc((t.metodePembayaran||'').toUpperCase())}</div></div>
          <div><div class="stat-label">Total</div><div class="td-price" style="margin-top:3px;font-size:18px;font-family:var(--font-head)">${U.rp(t.total)}</div></div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
            <tbody>${(t.items||[]).map(i=>`<tr><td class="td-name">${U.esc(i.nama)}</td><td>${i.qty}</td><td class="td-price">${U.rp(i.hargaJual)}</td><td class="td-price">${U.rp(i.qty*i.hargaJual)}</td></tr>`).join('')}</tbody>
          </table>
        </div>`;
      Modal.open('modal-transaksi-detail');
    } catch(e){ Toast.err('Gagal memuat detail transaksi'); }
  }
};

/* ═══════════════════ REPORTS ═══════════════════ */
const Reports = {
  period: 'harian',

  async load(){ await this.render(); },

  async render(){
    try {
      const [summary, chart, topProds, customers] = await Promise.all([
        API.get(`/api/laporan/summary?period=${this.period}`),
        API.get('/api/laporan/chart'),
        API.get(`/api/laporan/top-products?period=${this.period}`),
        API.get('/api/customers'),
      ]);
      setText('lap-omzet',   U.rp(summary.omzet));
      setText('lap-trx',     summary.transaksi);
      setText('lap-avg',     U.rp(summary.avg));
      setText('lap-pelanggan', customers.length);
      const labels = chart.map(c=>c.label);
      const vals   = chart.map(c=>c.total);
      setTimeout(()=>Chart.draw('laporan-chart',labels,vals),80);
      document.getElementById('lap-top-products').innerHTML = topProds.length
        ? topProds.slice(0,5).map((p,i)=>`<div class="top-list-item"><span class="top-list-rank">#${i+1}</span><span class="top-list-name">${U.esc(p.nama)}</span><span class="top-list-val">${p.qty}x · ${U.rp(p.revenue)}</span></div>`).join('')
        : '<div class="empty-state-sm">Tidak ada data</div>';
    } catch(e){ Toast.err('Gagal memuat laporan'); }
  },

  async exportCSV(){
    try {
      const all = await API.get('/api/transactions');
      const rows=[['No Transaksi','Tanggal','Kasir','Pelanggan','Total','Metode'],
        ...all.map(t=>[t.noTrx,U.dt(t.tanggal),t.kasir,t.customerNama||'Umum',t.total,t.metodePembayaran])];
      const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
      const a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
      a.download=`NEVERFADE-Laporan-${U.today()}.csv`;
      a.click();
      Toast.ok('CSV berhasil diunduh');
    } catch(e){ Toast.err('Gagal export CSV'); }
  },

  async exportPDF(){
    try {
      const [all, cfg] = await Promise.all([API.get('/api/transactions'), API.get('/api/settings')]);
      const totalOmzet=all.reduce((s,t)=>s+t.total,0);
      document.getElementById('print-area').innerHTML=`
        <div style="font-family:sans-serif;padding:24px;max-width:800px;margin:0 auto">
          <h1 style="font-size:22px;margin-bottom:4px">${U.esc(cfg.namaToko||'NEVERFADE POS')}</h1>
          <p style="color:#555;margin-bottom:20px">Laporan · Dicetak: ${U.dt(new Date().toISOString())}</p>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#f5f5f5">${['No. Transaksi','Tanggal','Kasir','Pelanggan','Total','Metode'].map(h=>`<th style="border:1px solid #ddd;padding:8px;text-align:left">${h}</th>`).join('')}</tr></thead>
            <tbody>${all.map(t=>`<tr><td style="border:1px solid #ddd;padding:6px">${U.esc(t.noTrx)}</td><td style="border:1px solid #ddd;padding:6px">${U.dt(t.tanggal)}</td><td style="border:1px solid #ddd;padding:6px">${U.esc(t.kasir)}</td><td style="border:1px solid #ddd;padding:6px">${U.esc(t.customerNama||'Umum')}</td><td style="border:1px solid #ddd;padding:6px;text-align:right">${U.rp(t.total)}</td><td style="border:1px solid #ddd;padding:6px">${U.esc(t.metodePembayaran)}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td colspan="4" style="border:1px solid #ddd;padding:8px;font-weight:700">TOTAL</td><td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:700">${U.rp(totalOmzet)}</td><td style="border:1px solid #ddd;padding:8px"></td></tr></tfoot>
          </table>
        </div>`;
      window.print();
    } catch(e){ Toast.err('Gagal export PDF'); }
  }
};

/* ═══════════════════ USERS ═══════════════════ */
const Users = {
  editId: null,
  _cache: [],

  async load(){
    try { this._cache = await API.get('/api/users'); } catch(e){ Toast.err('Gagal memuat pengguna'); }
    this.renderTable();
  },
  getAll(){ return this._cache; },

  renderTable(){
    const users=this.getAll();
    const session=Session.get();
    const rLabel={owner:'Owner',admin:'Admin',kasir:'Kasir'};
    const rBadge={owner:'badge-info',admin:'badge-warn',kasir:'badge-neutral'};
    document.getElementById('pengguna-tbody').innerHTML=users.map(u=>`
      <tr>
        <td class="td-name">${U.esc(u.nama)}</td>
        <td class="td-code">@${U.esc(u.username)}</td>
        <td><span class="badge ${rBadge[u.role]||'badge-neutral'}">${rLabel[u.role]||u.role}</span></td>
        <td><span class="badge ${u.active?'badge-success':'badge-danger'}">${u.active?'Aktif':'Nonaktif'}</span></td>
        <td><div class="action-btns">
          <button class="btn-icon" onclick="Users.edit('${u.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          ${u.id!==session?.id?`<button class="btn-icon danger" onclick="Users.delete('${u.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`:''}
        </div></td>
      </tr>
    `).join('');
  },

  openModal(id=null){
    this.editId=id;
    document.getElementById('modal-user-title').textContent=id?'Edit Pengguna':'Tambah Pengguna';
    if(id){
      const u=this.getAll().find(x=>x.id===id);if(!u)return;
      document.getElementById('user-edit-id').value=u.id;
      document.getElementById('u-nama').value=u.nama;
      document.getElementById('u-username').value=u.username;
      document.getElementById('u-password').value='';
      document.getElementById('u-role').value=u.role;
    } else {
      ['user-edit-id','u-nama','u-username','u-password'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
      document.getElementById('u-role').value='kasir';
    }
    Modal.open('modal-user');
  },

  async save(){
    const nama=U.str(document.getElementById('u-nama').value);
    const username=U.str(document.getElementById('u-username').value);
    const password=document.getElementById('u-password').value;
    const role=document.getElementById('u-role').value;
    if(!nama||!username){Toast.err('Nama dan username wajib');return;}
    if(!this.editId&&!password){Toast.err('Password wajib untuk pengguna baru');return;}
    const btn=document.getElementById('btn-save-user');
    btn.disabled=true;
    try {
      if(this.editId) await API.put(`/api/users/${this.editId}`,{nama,username,password,role,active:true});
      else await API.post('/api/users',{nama,username,password,role});
      Modal.close('modal-user');
      await this.load();
      Toast.ok(this.editId?'Pengguna diperbarui':'Pengguna ditambahkan');
      this.editId=null;
    } catch(err){ Toast.err(err.message); }
    finally{ btn.disabled=false; }
  },

  edit(id){this.openModal(id);},
  delete(id){
    const u=this.getAll().find(x=>x.id===id);if(!u)return;
    Modal.confirm('Hapus Pengguna',`Hapus "${u.nama}"?`, async ()=>{
      try{ await API.delete(`/api/users/${id}`); await this.load(); Toast.ok('Pengguna dihapus'); }
      catch(err){ Toast.err(err.message); }
    });
  }
};

/* ═══════════════════ SETTINGS PAGE ═══════════════════ */
const SettingsPage = {
  async load(){
    const s = await Cfg.load();
    const map={'set-nama-toko':'namaToko','set-alamat':'alamat','set-telepon':'telepon','set-email':'email','set-header-struk':'headerStruk','set-footer-struk':'footerStruk','set-default-tax':'defaultTax','set-min-stok':'minStok','set-poin-rate':'poinRate'};
    Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=s[key]??'';});

    // Set radio sesuai mode tersimpan
    const mode = ConnMode.get();
    const radio = document.getElementById(`conn-mode-${mode}`);
    if(radio) radio.checked = true;
    document.querySelectorAll('input[name="conn-mode"]').forEach(r=>{
      r.onchange = ()=>{
        ConnMode.set(r.value);
        Toast.ok(`Mode koneksi diubah ke: ${r.value==='auto'?'Otomatis':r.value==='online'?'Selalu Online':'Selalu Lokal'}`);
        updateConnStatus();
      };
    });

    const syncBtn = document.getElementById('btn-sync-now');
    if(syncBtn) syncBtn.onclick = ()=>SyncEngine.syncNow(false);

    updateSyncBox();
  },
  async save(){
    const g=id=>document.getElementById(id)?.value?.trim()||'';
    try {
      await Cfg.save({
        namaToko:g('set-nama-toko'),alamat:g('set-alamat'),telepon:g('set-telepon'),email:g('set-email'),
        headerStruk:g('set-header-struk'),footerStruk:g('set-footer-struk'),
        showTax:false,showPoint:true,
        defaultTax:U.flt(g('set-default-tax')),
        minStok:U.int(g('set-min-stok')),
        poinRate:U.flt(g('set-poin-rate')),
      });
      Toast.ok('Pengaturan disimpan');
    } catch(err){ Toast.err(err.message); }
  }
};

/* ═══════════════════ AUTH ═══════════════════ */

// Seed offline users jika belum ada
async function doLogin(){
  const username=U.str(document.getElementById('login-username').value);
  const password=document.getElementById('login-password').value;
  const errorEl=document.getElementById('login-error');
  const btn=document.getElementById('btn-login');
  if(!username||!password){errorEl.textContent='Masukkan username dan password';errorEl.classList.remove('hidden');return;}
  errorEl.classList.add('hidden');
  btn.textContent='Memproses...'; btn.disabled=true;
  try {
    const res = await API.post('/api/auth/login',{username,password});
    Session.setToken(res.token);
    Session.set(res.user);
    await showApp(res.user);
  } catch(err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.textContent='Masuk'; btn.disabled=false;
  }
}

async function showApp(user){
  // Load settings first
  try { await Cfg.load(); } catch(e){ console.warn('Settings load failed',e); }

  document.getElementById('page-login').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  setText('user-name',user.nama);
  setText('user-role',{owner:'Owner',admin:'Admin',kasir:'Kasir'}[user.role]||user.role);
  setText('user-avatar',user.nama.charAt(0).toUpperCase());
  setText('sidebar-avatar',user.nama.charAt(0).toUpperCase());
  setText('sidebar-user-name',user.nama);
  setText('sidebar-user-role',{owner:'Owner',admin:'Admin',kasir:'Kasir'}[user.role]||user.role);
  const isAdmin=user.role==='owner'||user.role==='admin';
  document.querySelectorAll('.nav-admin-only,.nav-admin-section').forEach(el=>el.style.display=isAdmin?'':'none');
  updateConnStatus();
  Router.go('dashboard');
  Chatbot.init();
  SyncEngine.start();
}

function updateConnStatus(){
  const isOnline = API.online === true;
  const badge = document.getElementById('conn-status-badge');
  const ver   = document.getElementById('sidebar-version');
  if(badge) badge.innerHTML = isOnline ? '● Online' : '● Offline Mode';
  if(badge) badge.style.color = isOnline ? '#16a34a' : '#ea580c';
  if(ver)   ver.textContent = isOnline ? 'v1.0.0 · Online (Server)' : 'v1.0.0 · Offline (Lokal)';
  updateSyncBox();
}

function updateSyncBox(){
  const txt = document.getElementById('sync-status-text');
  const pend = document.getElementById('sync-pending-text');
  if(!txt) return; // halaman pengaturan belum dirender
  const n = SyncQueue.count();
  const isOnline = API.online === true;
  txt.textContent = isOnline ? '● Terhubung ke server' : '● Mode lokal — data tersimpan di perangkat ini';
  txt.style.color = isOnline ? '#16a34a' : '#ea580c';
  pend.textContent = n>0 ? `${n} perubahan menunggu disinkronkan ke server` : '';
}

/* ═══════════════════════════════════════
   SYNC ENGINE — kirim antrian offline ke server
   begitu koneksi/backend kembali tersedia
═══════════════════════════════════════ */
const SyncEngine = {
  syncing: false,

  async syncNow(silent=false){
    if(this.syncing) return;
    const queue = SyncQueue.list();
    if(!queue.length){ if(!silent) Toast.info('Tidak ada data yang perlu disinkron.'); return; }

    const alive = await API.ping(4000);
    if(!alive){ if(!silent) Toast.warn('Server masih tidak dapat dijangkau.'); return; }

    this.syncing = true;
    let success=0, failed=0;
    const remaining = [];

    for(const item of queue){
      try {
        const opts = { method:item.method, headers:{'Content-Type':'application/json'} };
        const token = API._token();
        if(token && !token.startsWith('OFFLINE-')) opts.headers['Authorization']=`Bearer ${token}`;
        if(item.body) opts.body=JSON.stringify(item.body);
        const res = await fetch(`${API.BASE}${item.path}`, opts);
        if(res.ok) success++; else { failed++; remaining.push(item); }
      } catch { failed++; remaining.push(item); }
    }

    SyncQueue.save(remaining);
    this.syncing = false;

    if(success>0) Toast.ok(`${success} data berhasil disinkron ke server.`);
    if(failed>0)  Toast.warn(`${failed} data gagal disinkron, akan dicoba lagi nanti.`);
    updateSyncBox();
  },

  start(){
    // Cek koneksi setiap 20 detik; jika online & ada antrian, auto-sync
    setInterval(async ()=>{
      if(ConnMode.get()==='offline') return; // mode manual, jangan auto-sync
      if(SyncQueue.count()===0) return;
      const alive = await API.ping(3000);
      if(alive){ API.online=true; updateConnStatus(); await this.syncNow(true); }
    }, 20000);
  }
};

/* ═══════════════════ INIT ═══════════════════ */
document.addEventListener('DOMContentLoaded', async ()=>{

  // Check existing session / token
  if(Session.isValid()){
    const session=Session.get();
    if(session){
      // Verify token still valid
      try {
        const me = await API.get('/api/auth/me');
        await showApp(me);
      } catch {
        Session.clear();
      }
    }
  }

  // LOGIN
  document.getElementById('btn-login').addEventListener('click',doLogin);
  document.getElementById('login-password').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  document.getElementById('login-username').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('login-password').focus();});
  document.getElementById('toggle-pw').addEventListener('click',()=>{
    const pw=document.getElementById('login-password');pw.type=pw.type==='password'?'text':'password';
  });

  // LOGOUT
  document.getElementById('btn-logout').addEventListener('click',()=>{
    Modal.confirm('Keluar','Yakin ingin keluar?',()=>{
      Session.clear();
      document.getElementById('page-app').classList.remove('active');
      document.getElementById('page-login').classList.add('active');
      document.getElementById('login-username').value='';
      document.getElementById('login-password').value='';
    });
  });

  // SIDEBAR TOGGLE
  document.getElementById('sidebar-toggle').addEventListener('click',()=>{
    const sb=document.getElementById('sidebar');
    if(window.innerWidth<=768){ openMobileSidebar(); }
    else { sb.classList.toggle('collapsed'); }
  });
  document.getElementById('sidebar-close').addEventListener('click',closeMobileSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click',closeMobileSidebar);

  // NAV ITEMS
  document.querySelectorAll('.nav-item[data-page]').forEach(item=>{
    item.addEventListener('click',()=>Router.go(item.dataset.page));
  });

  // MODAL CLOSE (data-close)
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click',()=>Modal.close(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay=>{
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('open');});
  });

  // PRODUK
  document.getElementById('btn-add-produk').addEventListener('click',()=>Products.openModal());
  document.getElementById('btn-save-produk').addEventListener('click',()=>Products.save());
  document.getElementById('produk-search').addEventListener('input',()=>Products.renderTable());
  document.getElementById('produk-filter-cat').addEventListener('change',()=>Products.renderTable());

  // INVENTARIS
  document.getElementById('btn-stok-masuk').addEventListener('click',()=>Inventory.openModal('masuk'));
  document.getElementById('btn-stok-keluar').addEventListener('click',()=>Inventory.openModal('keluar'));
  document.getElementById('btn-stok-adjust').addEventListener('click',()=>Inventory.openModal('penyesuaian'));
  document.getElementById('btn-save-stok').addEventListener('click',()=>Inventory.save());

  // PELANGGAN
  document.getElementById('btn-add-pelanggan').addEventListener('click',()=>Customers.openModal());
  document.getElementById('btn-save-pelanggan').addEventListener('click',()=>Customers.save());
  document.getElementById('pelanggan-search').addEventListener('input',()=>Customers.renderTable());

  // POS
  document.getElementById('pos-search').addEventListener('input',()=>POS.renderProducts());
  document.getElementById('btn-clear-cart').addEventListener('click',()=>POS.clearCart());
  document.getElementById('btn-checkout').addEventListener('click',()=>POS.checkout());
  document.getElementById('cart-discount').addEventListener('input',()=>POS.updateTotals());
  document.getElementById('cart-tax').addEventListener('input',()=>POS.updateTotals());
  document.getElementById('cash-received').addEventListener('input',()=>POS.updateChange());

  document.querySelectorAll('.pay-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.pay-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      POS.payMethod=btn.dataset.method;
      document.getElementById('cash-input-wrap').style.display=btn.dataset.method==='tunai'?'flex':'none';
    });
  });

  // TRANSAKSI
  document.getElementById('trx-search').addEventListener('input',()=>Transactions.renderTable());
  document.getElementById('trx-filter-start').addEventListener('change',()=>Transactions.renderTable());
  document.getElementById('trx-filter-end').addEventListener('change',()=>Transactions.renderTable());
  document.getElementById('btn-print-trx').addEventListener('click',()=>{
    if(Transactions.currentTrx)Receipt.print(Receipt.gen(Transactions.currentTrx,Cfg.get()));
  });

  // LAPORAN
  document.querySelectorAll('.period-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      Reports.period=btn.dataset.period;
      Reports.render();
    });
  });
  document.getElementById('btn-export-pdf').addEventListener('click',()=>Reports.exportPDF());
  document.getElementById('btn-export-excel').addEventListener('click',()=>Reports.exportCSV());

  // PENGGUNA
  document.getElementById('btn-add-user').addEventListener('click',()=>Users.openModal());
  document.getElementById('btn-save-user').addEventListener('click',()=>Users.save());

  // PENGATURAN
  document.getElementById('btn-save-settings').addEventListener('click',()=>SettingsPage.save());

  // STRUK PRINT
  document.getElementById('btn-print-struk').addEventListener('click',()=>{
    const html=document.getElementById('struk-content').innerHTML;
    Receipt.print(html);
  });

  // CLOCK
  startClock();

  // Resize handler
  window.addEventListener('resize',()=>{
    if(window.innerWidth>768)closeMobileSidebar();
  });
});

/* ═══════════════════════════════════════════
   EMPLOYEES MODULE
═══════════════════════════════════════════ */
const Employees = {
  _cache: [],

  async load() {
    try { this._cache = await API.get('/api/karyawan'); } catch(e){ Toast.err('Gagal memuat karyawan'); }
    this.updateStats();
    this.renderTable();
    document.getElementById('btn-add-karyawan').onclick = () => this.openModal();
    document.getElementById('btn-save-karyawan').onclick = () => this.save();
    const s = document.getElementById('karyawan-search');
    if(s) s.addEventListener('input', () => this.renderTable());
  },

  updateStats() {
    const list = this._cache;
    const aktif = list.filter(k => k.status === 'aktif');
    document.getElementById('stat-total-karyawan').textContent = list.length;
    document.getElementById('stat-aktif-karyawan').textContent = aktif.length;
    document.getElementById('stat-total-gaji').textContent = U.rp(aktif.reduce((s,k)=>s+(k.gaji||0),0));
  },

  renderTable() {
    const list = this._cache;
    const q = (document.getElementById('karyawan-search')?.value||'').toLowerCase();
    const filtered = q ? list.filter(k=>k.nama.toLowerCase().includes(q)||k.jabatan.toLowerCase().includes(q)) : list;
    const tbody = document.getElementById('karyawan-tbody');
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-3)">Belum ada data karyawan</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(k => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="emp-avatar">${k.nama.charAt(0).toUpperCase()}</div>
            <div><div style="font-weight:600;font-size:13px">${k.nama}</div><div style="font-size:11px;color:var(--text-3)">${k.jabatan}</div></div>
          </div>
        </td>
        <td>${k.telepon||'-'}</td>
        <td>${U.rp(k.gaji||0)}</td>
        <td>${k.tanggalMasuk ? new Date(k.tanggalMasuk).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '-'}</td>
        <td><span class="badge ${k.status==='aktif'?'badge-green':'badge-red'}">${k.status}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" onclick="Employees.openModal('${k.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
            <button class="btn-icon btn-icon-danger" onclick="Employees.delete('${k.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </td>
      </tr>`).join('');
  },

  openModal(id = null) {
    const k = id ? this._cache.find(x=>x.id===id) : null;
    document.getElementById('karyawan-id').value = id||'';
    document.getElementById('karyawan-modal-title').textContent = k ? 'Edit Karyawan' : 'Tambah Karyawan';
    document.getElementById('k-nama').value        = k?.nama||'';
    document.getElementById('k-jabatan').value     = k?.jabatan||'';
    document.getElementById('k-telepon').value     = k?.telepon||'';
    document.getElementById('k-email').value       = k?.email||'';
    document.getElementById('k-gaji').value        = k?.gaji||'';
    document.getElementById('k-tanggal-masuk').value = k?.tanggalMasuk||'';
    document.getElementById('k-status').value      = k?.status||'aktif';
    document.getElementById('k-catatan').value     = k?.catatan||'';
    Modal.open('modal-karyawan');
  },

  async save() {
    const nama    = document.getElementById('k-nama').value.trim();
    const jabatan = document.getElementById('k-jabatan').value.trim();
    if (!nama||!jabatan) { Toast.warn('Nama dan jabatan wajib diisi.'); return; }
    const id  = document.getElementById('karyawan-id').value;
    const btn = document.getElementById('btn-save-karyawan');
    btn.disabled = true;
    try {
      const data = {
        nama, jabatan,
        telepon:      document.getElementById('k-telepon').value.trim(),
        email:        document.getElementById('k-email').value.trim(),
        gaji:         parseFloat(document.getElementById('k-gaji').value)||0,
        tanggalMasuk: document.getElementById('k-tanggal-masuk').value,
        status:       document.getElementById('k-status').value,
        catatan:      document.getElementById('k-catatan').value.trim(),
      };
      if (id) await API.put(`/api/karyawan/${id}`, data);
      else    await API.post('/api/karyawan', data);
      Modal.close('modal-karyawan');
      await this.load();
      Toast.ok(id ? 'Data karyawan diperbarui.' : 'Karyawan berhasil ditambahkan.');
    } catch(err) { Toast.err(err.message); }
    finally { btn.disabled = false; }
  },

  delete(id) {
    Modal.confirm('Hapus Karyawan','Hapus data karyawan ini secara permanen?', async () => {
      try {
        await API.delete(`/api/karyawan/${id}`);
        await this.load();
        Toast.ok('Karyawan dihapus.');
      } catch(err) { Toast.err(err.message); }
    });
  }
};

const Attendance = {
  stream: null, currentId: null, currentType: null, capturedPhoto: null,

  async load() {
    const today = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const el = document.getElementById('absensi-today-date');
    if (el) el.textContent = today;
    await Promise.all([this.renderToday(), this.renderHistory()]);

    document.getElementById('btn-capture').onclick    = () => this.capture();
    document.getElementById('btn-retake').onclick     = () => this.retake();
    document.getElementById('btn-save-absensi').onclick = () => this.saveRecord();
    document.querySelectorAll('[data-close="modal-absensi"]').forEach(btn => {
      btn.onclick = () => { this.stopCamera(); Modal.close('modal-absensi'); };
    });
    const expBtn = document.getElementById('btn-export-absensi');
    if (expBtn) expBtn.onclick = () => this.exportCSV();
  },

  async renderToday() {
    try {
      const [karyawan, records] = await Promise.all([
        API.get('/api/karyawan'),
        API.get(`/api/absensi?tanggal=${new Date().toISOString().slice(0,10)}`),
      ]);
      const container = document.getElementById('absensi-today-list');
      if (!karyawan.length) {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px">Belum ada karyawan.</div>';
        return;
      }
      container.innerHTML = karyawan.map(k => {
        const rec  = records.find(r=>r.karyawanId===k.id);
        const cin  = rec?.checkIn;
        const cout = rec?.checkOut;
        return `
        <div class="absensi-row">
          <div class="absensi-row-left">
            <div class="emp-avatar">${k.nama.charAt(0).toUpperCase()}</div>
            <div><div class="absensi-nama">${k.nama}</div><div class="absensi-jabatan">${k.jabatan}</div></div>
          </div>
          <div class="absensi-row-right">
            ${cin  ? `<span class="absensi-badge in">⬤ Masuk ${cin}</span>` : ''}
            ${cout ? `<span class="absensi-badge out">⬤ Pulang ${cout}</span>` : ''}
            ${!cin  ? `<button class="btn-primary btn-sm" onclick="Attendance.openCamera('${k.id}','masuk')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Check In</button>` : ''}
            ${cin && !cout ? `<button class="btn-secondary btn-sm" onclick="Attendance.openCamera('${k.id}','keluar')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Check Out</button>` : ''}
            ${cin && cout ? '<span class="badge badge-green">✓ Selesai</span>' : ''}
          </div>
        </div>`;
      }).join('');
    } catch(e){ console.error(e); }
  },

  async renderHistory() {
    try {
      const records = await API.get('/api/absensi');
      const tbody   = document.getElementById('absensi-history-tbody');
      if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-3)">Belum ada riwayat absensi</td></tr>';
        return;
      }
      tbody.innerHTML = records.slice(0,50).map(a => {
        const dur = (a.checkIn && a.checkOut) ? this.calcDur(a.checkIn, a.checkOut) : '-';
        return `<tr>
          <td>${new Date(a.tanggal).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</td>
          <td>${a.karyawanNama||'-'}</td>
          <td>${a.jabatan||'-'}</td>
          <td>${a.checkIn||'-'}</td>
          <td>${a.checkOut||'-'}</td>
          <td>${dur}</td>
          <td style="display:flex;gap:4px">
            ${a.fotoMasuk  ? `<img src="${a.fotoMasuk}"  onclick="Attendance.viewPhoto('${a.fotoMasuk}')"  class="absensi-thumb" title="Foto masuk">` : ''}
            ${a.fotoKeluar ? `<img src="${a.fotoKeluar}" onclick="Attendance.viewPhoto('${a.fotoKeluar}')" class="absensi-thumb" title="Foto keluar">` : (a.fotoMasuk ? '' : '-')}
          </td>
        </tr>`;
      }).join('');
    } catch(e){ console.error(e); }
  },

  calcDur(ci, co) {
    try {
      const [h1,m1]=ci.split(':').map(Number), [h2,m2]=co.split(':').map(Number);
      const d = (h2*60+m2)-(h1*60+m1);
      return d<0 ? '-' : `${Math.floor(d/60)}j ${d%60}m`;
    } catch { return '-'; }
  },

  openCamera(karyawanId, type) {
    this.currentId = karyawanId; this.currentType = type; this.capturedPhoto = null;
    const k = (Employees._cache||[]).find(x=>x.id===karyawanId);
    document.getElementById('camera-modal-title').textContent = (type==='masuk'?'Check In':'Check Out') + ' — ' + (k?.nama||'');
    document.getElementById('camera-video').style.display    = 'block';
    document.getElementById('camera-preview').style.display  = 'none';
    document.getElementById('btn-capture').style.display     = 'flex';
    document.getElementById('btn-retake').style.display      = 'none';
    document.getElementById('btn-save-absensi').style.display = 'none';
    Modal.open('modal-absensi');
    this.startCamera();
  },

  startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      document.getElementById('camera-video').style.display = 'none';
      document.getElementById('btn-save-absensi').style.display = 'flex';
      document.getElementById('btn-save-absensi').textContent = 'Absen (Tanpa Foto)';
      return;
    }
    navigator.mediaDevices.getUserMedia({ video:{facingMode:'user'}, audio:false })
      .then(s => { this.stream=s; const v=document.getElementById('camera-video'); v.srcObject=s; v.play(); })
      .catch(() => {
        document.getElementById('camera-video').style.display = 'none';
        document.getElementById('btn-save-absensi').style.display = 'flex';
        document.getElementById('btn-save-absensi').textContent = 'Absen (Tanpa Foto)';
        Toast.warn('Kamera tidak tersedia.');
      });
  },

  capture() {
    const v=document.getElementById('camera-video');
    const c=document.createElement('canvas');
    c.width=Math.min(v.videoWidth||320,480);
    c.height=Math.round(c.width*(v.videoHeight||240)/(v.videoWidth||320));
    c.getContext('2d').drawImage(v,0,0,c.width,c.height);
    this.capturedPhoto=c.toDataURL('image/jpeg',0.6);
    document.getElementById('camera-preview').src=this.capturedPhoto;
    document.getElementById('camera-preview').style.display='block';
    document.getElementById('camera-video').style.display='none';
    document.getElementById('btn-capture').style.display='none';
    document.getElementById('btn-retake').style.display='inline-flex';
    document.getElementById('btn-save-absensi').style.display='inline-flex';
    this.stopCamera();
  },

  retake() {
    this.capturedPhoto=null;
    document.getElementById('camera-preview').style.display='none';
    document.getElementById('camera-video').style.display='block';
    document.getElementById('btn-capture').style.display='flex';
    document.getElementById('btn-retake').style.display='none';
    document.getElementById('btn-save-absensi').style.display='none';
    this.startCamera();
  },

  stopCamera() {
    if (this.stream) { this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; }
  },

  async saveRecord() {
    const btn=document.getElementById('btn-save-absensi');
    btn.disabled=true;
    try {
      const endpoint = this.currentType==='masuk' ? '/api/absensi/checkin' : '/api/absensi/checkout';
      await API.post(endpoint, { karyawanId:this.currentId, foto:this.capturedPhoto||null });
      this.stopCamera();
      Modal.close('modal-absensi');
      this.capturedPhoto=null;
      await this.load();
      Toast.ok(`${this.currentType==='masuk'?'Check In':'Check Out'} berhasil dicatat.`);
    } catch(err) { Toast.err(err.message); }
    finally { btn.disabled=false; }
  },

  viewPhoto(src) {
    document.getElementById('photo-view-img').src = src;
    Modal.open('modal-photo');
  },

  async exportCSV() {
    try {
      const records = await API.get('/api/absensi');
      const rows = [['Tanggal','Nama','Jabatan','Check In','Check Out','Durasi'],
        ...records.map(a=>[a.tanggal, a.karyawanNama||'-', a.jabatan||'-', a.checkIn||'-', a.checkOut||'-', this.calcDur(a.checkIn,a.checkOut)])];
      const csv = rows.map(r=>r.join(',')).join('\n');
      const a   = document.createElement('a');
      a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download= `absensi_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    } catch(e){ Toast.err('Gagal export'); }
  }
};

const Chatbot = {
  open: false,
  msgs: [],

  init() {
    document.getElementById('chatbot-fab').onclick      = () => this.toggle();
    document.getElementById('chatbot-close-btn').onclick = () => this.close();
    document.getElementById('chatbot-send-btn').onclick  = () => this.send();
    document.getElementById('chatbot-input').addEventListener('keydown', e => {
      if (e.key==='Enter') this.send();
    });
  },

  toggle() {
    this.open = !this.open;
    const panel = document.getElementById('chatbot-panel');
    panel.classList.toggle('active', this.open);
    if (this.open && this.msgs.length===0) {
      const cfg = Cfg.get();
      const h   = new Date().getHours();
      const gr  = h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
      this.push('bot', `${gr}! 👋 Saya asisten virtual <strong>${cfg.namaToko||'toko kami'}</strong>.\n\nSaya bisa membantu:\n• Info produk & harga\n• Stok tersedia\n• Info & kontak toko\n\nKetik <strong>bantuan</strong> untuk lihat semua perintah.`);
    }
  },

  close() {
    this.open = false;
    document.getElementById('chatbot-panel').classList.remove('active');
  },

  push(from, text) {
    const time = new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    this.msgs.push({from,text,time});
    this.render();
  },

  render() {
    const el = document.getElementById('chatbot-messages');
    el.innerHTML = this.msgs.map(m=>`
      <div class="cmsg cmsg-${m.from}">
        ${m.from==='bot'?'<div class="cbot-av">AI</div>':''}
        <div class="cbubble">
          ${m.text.replace(/\n/g,'<br>')}
          <span class="ctime">${m.time}</span>
        </div>
      </div>`).join('');
    el.scrollTop = el.scrollHeight;
  },

  send() {
    const inp  = document.getElementById('chatbot-input');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    this.push('user', text);
    const ty = document.getElementById('chatbot-typing');
    ty.style.display = 'flex';
    setTimeout(()=>{
      ty.style.display = 'none';
      this.push('bot', this.reply(text.toLowerCase()));
    }, 500 + Math.random()*500);
  },

  reply(t) {
    const cfg      = Cfg.get();
    const products = Products._cache || [];
    const toko     = cfg.namaToko||'toko kami';

    // cek produk spesifik
    const found = products.find(p=>t.includes(p.nama.toLowerCase())||t.includes(p.kode.toLowerCase()));
    if (found) return `Produk <strong>${found.nama}</strong>\n💰 Harga: ${U.rp(found.hargaJual)}\n📦 Stok: ${found.stok} ${found.satuan||'pcs'}\n🏷️ Kategori: ${found.kategori||'-'}`;

    if (/bantuan|help|bisa apa/.test(t)) return `Yang bisa saya bantu:\n\n🛒 <strong>produk</strong> — lihat semua produk\n💰 <strong>harga [nama]</strong> — cek harga\n📦 <strong>stok</strong> — cek stok rendah\n📍 <strong>alamat</strong> — lokasi toko\n📞 <strong>kontak</strong> — hubungi kami\n⏰ <strong>jam buka</strong> — operasional`;

    if (/produk|menu|barang|jual|ada apa|tersedia/.test(t)) {
      const avail = products.filter(p=>p.stok>0).slice(0,8);
      return avail.length ? `Produk tersedia di <strong>${toko}</strong>:\n${avail.map(p=>`• ${p.nama} — ${U.rp(p.hargaJual)}`).join('\n')}\n\nKetik nama produk untuk detail.` : 'Maaf, saat ini semua produk sedang habis.';
    }

    if (/harga|berapa|price/.test(t)) return `Ketik nama produk yang ingin dicek harganya.\nContoh: <strong>"harga lumpia"</strong>`;

    if (/stok|stock|habis|sisa/.test(t)) {
      const low = products.filter(p=>p.stok<=(cfg.minStok||5));
      return low.length ? `⚠️ Stok hampir habis:\n${low.map(p=>`• ${p.nama}: ${p.stok} ${p.satuan||'pcs'}`).join('\n')}` : '✅ Semua stok masih aman.';
    }

    if (/alamat|lokasi|dimana/.test(t)) return `📍 <strong>${toko}</strong>\n${cfg.alamat||'Informasi alamat belum diisi.'}\n📞 ${cfg.telepon||'-'}`;

    if (/telepon|kontak|hubungi|wa|whatsapp/.test(t)) return `📞 ${cfg.telepon||'Belum tersedia'}\n📧 ${cfg.email||'Belum tersedia'}`;

    if (/jam|buka|tutup|operasional/.test(t)) return `⏰ <strong>Jam Operasional</strong>\nSenin – Sabtu: 08.00 – 21.00\nMinggu: 09.00 – 18.00`;

    if (/promo|diskon|sale|murah/.test(t)) return `Untuk info promo terbaru, tanyakan langsung ke kasir atau hubungi ${cfg.telepon||'kami'} ya! 🎉`;

    if (/beli|pesan|order/.test(t)) return `Untuk melakukan pembelian, silakan datang langsung ke <strong>${toko}</strong> atau hubungi kami di ${cfg.telepon||'-'}. Kasir kami siap membantu! 😊`;

    if (/halo|hai|hello|hi|selamat/.test(t)) {
      const h=new Date().getHours();
      return `${h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam'}! Ada yang bisa saya bantu? 😊`;
    }

    if (/terima kasih|makasih|thanks/.test(t)) return 'Sama-sama! Senang bisa membantu. 😊 Ada lagi yang ingin ditanyakan?';

    const def = [
      `Maaf, saya kurang memahami pertanyaannya. Coba ketik <strong>bantuan</strong> untuk melihat apa yang bisa saya bantu.`,
      `Hmm, belum bisa menjawab itu. Coba tanya soal produk, harga, atau info toko ya!`,
      `Untuk pertanyaan lebih lanjut, hubungi kami di ${cfg.telepon||'nomor toko'}. Ada yang lain?`,
    ];
    return def[Math.floor(Math.random()*def.length)];
  }
};

