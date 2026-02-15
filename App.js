import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  User, Sun, Moon, BookOpen, Users, Dumbbell, Coffee, 
  Download, LogOut, Eye, Camera, Trash2, ChevronLeft, 
  Check, X, Heart, Smile, Lock
} from 'lucide-react';

// --- FIREBASE CONFIG ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCI-ubQQ3uam05HDU_PLMubVprVK6HnK2A",
  authDomain: "smantidproject.firebaseapp.com",
  projectId: "smantidproject",
  storageBucket: "smantidproject.firebasestorage.app",
  messagingSenderId: "112355701967",
  appId: "1:112355701967:web:ef59002f4da9e1921d33ba",
  measurementId: "G-Z5WMDT29KR"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'jurnal-7-kebiasaan';

// --- KOMPONEN INPUT STABIL (DILUAR APP) ---
const CustomInput = ({ label, type = "text", value, onChange, placeholder, ...props }) => (
  <div className="mb-5">
    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-lg p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700 shadow-sm"
      placeholder={placeholder}
      {...props}
    />
  </div>
);

const App = () => {
  // --- STATES ---
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [submissions, setSubmissions] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().substr(0, 10));
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialForm = {
    nama: '', noAbsen: '', kelas: 'X A', agama: 'Islam', tanggal: new Date().toISOString().substr(0, 10),
    bangunPagi: { sahur: '', subuh: '', bangun: '', foto: null },
    beribadah: { sholat: [], taraweh: false, ibadahLain: '' },
    makanSehat: { nasi: false, sayur: false, lauk: false, buah: false, susu: false, foto: null },
    gemarBelajar: { tadarusSurat: '', tadarusAyat: '', literasi: '', foto: null },
    bermasyarakat: '',
    berolahraga: { jenis: '', foto: null },
    tidurCepat: ''
  };
  const [form, setForm] = useState(initialForm);

  // --- AUTHENTICATION (RULE 3) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- DATA FETCHING (RULE 1 & 2) ---
  useEffect(() => {
    if (!user) return;

    // Menggunakan path sesuai RULE 1
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'jurnal');
    
    // onSnapshot dengan error callback sesuai persyaratan
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort manual di memory sesuai RULE 2
      const sorted = data.sort((a, b) => {
        if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
        if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
        return parseInt(a.noAbsen) - parseInt(b.noAbsen);
      });
      setSubmissions(sorted);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // --- HANDLERS ---
  const handleNested = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleFile = (section, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800000) { // Limit ~800kb for Firestore doc size safety
        alert("Ukuran foto terlalu besar. Silakan gunakan foto yang lebih kecil.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => handleNested(section, 'foto', reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitToFirebase = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'jurnal');
      await addDoc(colRef, {
        ...form,
        createdAt: new Date().toISOString(),
        userId: user.uid
      });
      setShowSuccess(true);
      setForm(initialForm);
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Gagal mengirim jurnal. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!user) return;
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini secara permanen dari database?")) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'jurnal', id);
        await deleteDoc(docRef);
        if (selectedEntry?.id === id) setSelectedEntry(null);
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  // --- HELPERS ---
  const kelasOptions = useMemo(() => {
    const res = [];
    ['X', 'XI', 'XII'].forEach(tk => {
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(kls => res.push(`${tk} ${kls}`));
    });
    return res;
  }, []);

  const displayData = useMemo(() => {
    return submissions.filter(s => {
      const matchKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
      const matchDate = !filterDate || s.tanggal === filterDate;
      return matchKelas && matchDate;
    });
  }, [submissions, filterKelas, filterDate]);

  const downloadReport = (entry) => {
    const html = `
      <html>
        <head>
          <title>Jurnal ${entry.nama}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .card { border: 2px solid #f1f5f9; border-radius: 15px; padding: 20px; margin-bottom: 20px; }
            .label { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; }
            h2 { color: #4f46e5; margin-top: 0; }
            img { max-width: 300px; border-radius: 10px; margin-top: 10px; border: 4px solid #f8fafc; }
          </style>
        </head>
        <body>
          <h2>Jurnal 7 Kebiasaan: ${entry.nama}</h2>
          <p>Kelas: ${entry.kelas} | No Absen: ${entry.noAbsen} | Tanggal: ${entry.tanggal}</p>
          <hr/>
          <div class="card"><div class="label">1. Bangun Pagi</div>${entry.agama === 'Islam' ? `Sahur: ${entry.bangunPagi.sahur || '-'}, Subuh: ${entry.bangunPagi.subuh || '-'}` : `Bangun: ${entry.bangunPagi.bangun || '-'}`} ${entry.bangunPagi.foto ? `<br/><img src="${entry.bangunPagi.foto}">` : ''}</div>
          <div class="card"><div class="label">2. Beribadah</div>${entry.agama === 'Islam' ? `Sholat: ${entry.beribadah.sholat.join(', ') || '-'}, Taraweh: ${entry.beribadah.taraweh ? 'Ya' : 'Tidak'}` : `Ibadah: ${entry.beribadah.ibadahLain || '-'}`}</div>
          <div class="card"><div class="label">3. Makan Sehat</div>Menu: ${Object.keys(entry.makanSehat).filter(k => k !== 'foto' && entry.makanSehat[k]).join(', ') || '-'} ${entry.makanSehat.foto ? `<br/><img src="${entry.makanSehat.foto}">` : ''}</div>
          <div class="card"><div class="label">4. Gemar Belajar</div>${entry.agama === 'Islam' ? `Tadarus: ${entry.gemarBelajar.tadarusSurat} (${entry.gemarBelajar.tadarusAyat})` : ''}<br/>Literasi: ${entry.gemarBelajar.literasi} ${entry.gemarBelajar.foto ? `<br/><img src="${entry.gemarBelajar.foto}">` : ''}</div>
          <div class="card"><div class="label">5. Bermasyarakat</div>${entry.bermasyarakat || '-'}</div>
          <div class="card"><div class="label">6. Berolahraga</div>Jenis: ${entry.berolahraga.jenis || '-'} ${entry.berolahraga.foto ? `<br/><img src="${entry.berolahraga.foto}">` : ''}</div>
          <div class="card"><div class="label">7. Tidur Cepat</div>Jam Tidur: ${entry.tidurCepat || '-'}</div>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jurnal_${entry.nama}_${entry.tanggal}.html`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      
      {/* HOME VIEW */}
      {view === 'home' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-[35px] flex items-center justify-center shadow-2xl mb-8 animate-bounce">
            <Smile className="text-white" size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-indigo-900 mb-2">Jurnal Hebat</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-12">Simpan Kebiasaan Baikmu di Cloud</p>
          <div className="w-full max-w-xs space-y-4">
            <button onClick={() => setView('form')} className="w-full bg-indigo-600 text-white font-black text-lg py-6 rounded-3xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all uppercase italic">Mulai Isi Jurnal</button>
            <button onClick={() => setView('login')} className="w-full bg-white text-slate-500 font-black text-sm py-5 rounded-3xl border-2 border-slate-100 flex items-center justify-center gap-3 uppercase italic transition-colors hover:bg-slate-50"><Lock size={18} /> Login Fasilitator</button>
          </div>
        </div>
      )}

      {/* FORM VIEW */}
      {view === 'form' && (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <header className="flex items-center gap-4 mb-8 pt-4">
            <button onClick={() => setView('home')} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-black italic uppercase">Formulir Jurnal</h2>
          </header>

          <form onSubmit={submitToFirebase} className="space-y-6">
            <Section icon={<User />} title="Identitas" color="bg-indigo-600">
              <CustomInput label="Nama Lengkap" value={form.nama} onChange={(v) => setForm(f=>({...f, nama:v}))} placeholder="Nama Anda..." required />
              <div className="grid grid-cols-2 gap-4">
                <CustomInput label="No Absen" type="number" value={form.noAbsen} onChange={(v) => setForm(f=>({...f, noAbsen:v}))} placeholder="00" required />
                <div className="mb-5">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kelas</label>
                  <select value={form.kelas} onChange={(e) => setForm(f=>({...f, kelas:e.target.value}))} className="w-full text-lg p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-semibold">
                    {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="mb-5">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Agama</label>
                  <select value={form.agama} onChange={(e) => setForm(f=>({...f, agama:e.target.value}))} className="w-full text-lg p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-semibold">
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katholik">Katholik</option>
                  </select>
                </div>
                <CustomInput label="Tanggal" type="date" value={form.tanggal} onChange={(v) => setForm(f=>({...f, tanggal:v}))} required />
              </div>
            </Section>

            {/* 1. Bangun Pagi */}
            <Section icon={<Sun />} title="1. Bangun Pagi" color="bg-orange-500">
              <div className="grid grid-cols-2 gap-4">
                {form.agama === 'Islam' ? (
                  <>
                    <CustomInput label="Jam Sahur" type="time" value={form.bangunPagi.sahur} onChange={(v) => handleNested('bangunPagi', 'sahur', v)} />
                    <CustomInput label="Sholat Subuh" type="time" value={form.bangunPagi.subuh} onChange={(v) => handleNested('bangunPagi', 'subuh', v)} />
                  </>
                ) : (
                  <div className="col-span-2">
                    <CustomInput label="Jam Bangun" type="time" value={form.bangunPagi.bangun} onChange={(v) => handleNested('bangunPagi', 'bangun', v)} />
                  </div>
                )}
              </div>
              <PhotoUpload label="Foto Bukti Bangun" photo={form.bangunPagi.foto} onUpload={(e) => handleFile('bangunPagi', e)} />
            </Section>

            {/* 2. Beribadah */}
            <Section icon={<Heart />} title="2. Beribadah" color="bg-rose-500">
              {form.agama === 'Islam' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map(s => (
                    <button 
                      key={s} type="button" 
                      onClick={() => {
                        const current = form.beribadah.sholat;
                        handleNested('beribadah', 'sholat', current.includes(s) ? current.filter(x => x !== s) : [...current, s]);
                      }}
                      className={`p-4 rounded-xl font-black text-[10px] uppercase flex items-center justify-between transition-all ${form.beribadah.sholat.includes(s) ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                    >
                      {s} {form.beribadah.sholat.includes(s) && <Check size={14} />}
                    </button>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => handleNested('beribadah', 'taraweh', !form.beribadah.taraweh)}
                    className={`p-4 rounded-xl font-black text-[10px] uppercase flex items-center justify-between transition-all ${form.beribadah.taraweh ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                  >
                    Taraweh {form.beribadah.taraweh && <Check size={14} />}
                  </button>
                </div>
              ) : (
                <textarea 
                  value={form.beribadah.ibadahLain} 
                  onChange={(e) => handleNested('beribadah', 'ibadahLain', e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-24 font-semibold"
                  placeholder="Kegiatan ibadah hari ini..."
                />
              )}
            </Section>

            {/* 3. Makan Sehat */}
            <Section icon={<Coffee />} title="3. Makan Sehat" color="bg-emerald-500">
              <div className="flex flex-wrap gap-2 mb-4">
                {['nasi', 'sayur', 'lauk', 'buah', 'susu'].map(item => (
                  <button 
                    key={item} type="button" 
                    onClick={() => handleNested('makanSehat', item, !form.makanSehat[item])}
                    className={`px-5 py-3 rounded-full font-black uppercase text-[10px] border-2 transition-all ${form.makanSehat[item] ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <PhotoUpload label="Foto Menu Makan" photo={form.makanSehat.foto} onUpload={(e) => handleFile('makanSehat', e)} />
            </Section>

            {/* 4. Gemar Belajar */}
            <Section icon={<BookOpen />} title="4. Gemar Belajar" color="bg-amber-500">
              {form.agama === 'Islam' && (
                <div className="grid grid-cols-2 gap-4">
                  <CustomInput label="Tadarus Surat" value={form.gemarBelajar.tadarusSurat} onChange={(v) => handleNested('gemarBelajar', 'tadarusSurat', v)} placeholder="Al-Baqarah" />
                  <CustomInput label="Ayat" value={form.gemarBelajar.tadarusAyat} onChange={(v) => handleNested('gemarBelajar', 'tadarusAyat', v)} placeholder="1-5" />
                </div>
              )}
              <textarea 
                value={form.gemarBelajar.literasi} 
                onChange={(e) => handleNested('gemarBelajar', 'literasi', e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-24 font-semibold mb-4"
                placeholder="Deskripsi tugas literasi/numerasi..."
              />
              <PhotoUpload label="Foto Bukti Belajar" photo={form.gemarBelajar.foto} onUpload={(e) => handleFile('gemarBelajar', e)} />
            </Section>

            {/* 5-7 */}
            <Section icon={<Users />} title="5. Bermasyarakat" color="bg-sky-500">
              <textarea value={form.bermasyarakat} onChange={(e) => setForm(f=>({...f, bermasyarakat:e.target.value}))} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-24 font-semibold" placeholder="Kegiatan sosial..." />
            </Section>
            
            <Section icon={<Dumbbell />} title="6. Berolahraga" color="bg-violet-500">
              <CustomInput label="Jenis Olahraga" value={form.berolahraga.jenis} onChange={(v) => handleNested('berolahraga', 'jenis', v)} placeholder="Lari, Senam..." />
              <PhotoUpload label="Foto Olahraga" photo={form.berolahraga.foto} onUpload={(e) => handleFile('berolahraga', e)} />
            </Section>

            <Section icon={<Moon />} title="7. Tidur Cepat" color="bg-slate-800">
              <CustomInput label="Jam Tidur Malam" type="time" value={form.tidurCepat} onChange={(v) => setForm(f=>({...f, tidurCepat:v}))} />
            </Section>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white font-black text-xl py-7 rounded-[35px] shadow-2xl uppercase italic transition-all ${isSubmitting ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
            >
              {isSubmitting ? 'Mengirim...' : 'Simpan Jurnal'}
            </button>
          </form>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div className="max-w-6xl mx-auto p-4 md:p-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Rekap Database</h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{displayData.length} Laporan Tersimpan</p>
            </div>
            <button onClick={() => setView('home')} className="self-start flex items-center gap-2 text-red-500 font-bold uppercase text-xs italic px-5 py-3 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </header>

          <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Filter Tanggal</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Filter Kelas</label>
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="Semua">Semua Kelas</option>
                {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="p-6">Siswa</th>
                    <th className="p-6">Kelas & Absen</th>
                    <th className="p-6">Tanggal</th>
                    <th className="p-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayData.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-black text-slate-800 uppercase italic">{s.nama}</td>
                      <td className="p-6">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase">{s.kelas}</span>
                        <span className="ml-2 font-bold text-slate-400 text-xs">#{s.noAbsen}</span>
                      </td>
                      <td className="p-6 font-bold text-slate-400 text-xs">{s.tanggal}</td>
                      <td className="p-6">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setSelectedEntry(s)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Eye size={18} /></button>
                          <button onClick={() => downloadReport(s)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Download size={18} /></button>
                          <button onClick={() => deleteEntry(s.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayData.length === 0 && (
                    <tr><td colSpan="4" className="p-20 text-center font-black text-slate-200 uppercase italic tracking-widest">Database Kosong / Tidak Ada Data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN VIEW */}
      {view === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
          <div className="bg-white p-10 rounded-[45px] max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-center font-black uppercase italic text-2xl mb-8 tracking-tighter">Login Fasilitator</h2>
            <div className="space-y-4">
              <CustomInput label="Username" placeholder="admin" />
              <CustomInput label="Password" type="password" placeholder="••••••••" />
              <button onClick={() => setView('dashboard')} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl uppercase italic shadow-xl mt-4 active:scale-95">Masuk Dashboard</button>
              <button onClick={() => setView('home')} className="w-full text-slate-400 font-bold mt-4 text-[10px] uppercase tracking-widest text-center">Kembali</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[45px] shadow-2xl overflow-hidden flex flex-col">
            <header className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1 text-indigo-900">{selectedEntry.nama}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedEntry.kelas} • No.{selectedEntry.noAbsen} • {selectedEntry.tanggal}</p>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-4 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={24} /></button>
            </header>
            
            <div className="p-8 overflow-y-auto space-y-6 bg-slate-50/30">
              <DetailBox title="1. Bangun Pagi" color="border-orange-400">
                <p className="font-bold text-lg">{selectedEntry.agama === 'Islam' ? `Sahur: ${selectedEntry.bangunPagi.sahur || '-'} | Subuh: ${selectedEntry.bangunPagi.subuh || '-'}` : `Bangun: ${selectedEntry.bangunPagi.bangun || '-'}`}</p>
                {selectedEntry.bangunPagi.foto && <img src={selectedEntry.bangunPagi.foto} className="w-48 h-48 object-cover rounded-3xl mt-4 border-4 border-white shadow-md" />}
              </DetailBox>

              <DetailBox title="2. Beribadah" color="border-rose-400">
                <p className="font-bold text-lg">{selectedEntry.agama === 'Islam' ? `Sholat: ${selectedEntry.beribadah.sholat.join(', ') || '-'} ${selectedEntry.beribadah.taraweh ? '(+ Taraweh)' : ''}` : `Ibadah: ${selectedEntry.beribadah.ibadahLain || '-'}`}</p>
              </DetailBox>

              <DetailBox title="3. Makan Sehat" color="border-emerald-400">
                <p className="font-bold text-lg mb-3">Menu: {Object.keys(selectedEntry.makanSehat).filter(k => k !== 'foto' && selectedEntry.makanSehat[k]).join(', ') || '-'}</p>
                {selectedEntry.makanSehat.foto && <img src={selectedEntry.makanSehat.foto} className="w-48 h-48 object-cover rounded-3xl border-4 border-white shadow-md" />}
              </DetailBox>

              <DetailBox title="4. Gemar Belajar" color="border-amber-400">
                {selectedEntry.agama === 'Islam' && <p className="font-black text-indigo-600 text-[10px] mb-2 uppercase">Tadarus: {selectedEntry.gemarBelajar.tadarusSurat} ({selectedEntry.gemarBelajar.tadarusAyat})</p>}
                <p className="font-bold text-slate-600 italic">"{selectedEntry.gemarBelajar.literasi || '-'}"</p>
                {selectedEntry.gemarBelajar.foto && <img src={selectedEntry.gemarBelajar.foto} className="w-48 h-48 object-cover rounded-3xl mt-4 border-4 border-white shadow-md" />}
              </DetailBox>

              <DetailBox title="5. Bermasyarakat" color="border-sky-400">
                <p className="font-bold text-lg">"{selectedEntry.bermasyarakat || '-'}"</p>
              </DetailBox>

              <DetailBox title="6. Berolahraga" color="border-violet-400">
                <p className="font-bold text-lg mb-3">Jenis: {selectedEntry.berolahraga.jenis || '-'}</p>
                {selectedEntry.berolahraga.foto && <img src={selectedEntry.berolahraga.foto} className="w-48 h-48 object-cover rounded-3xl border-4 border-white shadow-md" />}
              </DetailBox>

              <DetailBox title="7. Tidur Cepat" color="border-slate-800">
                <p className="font-bold text-lg">Jam Tidur: {selectedEntry.tidurCepat || '-'}</p>
              </DetailBox>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white rounded-[50px] p-12 text-center max-w-sm w-full shadow-2xl animate-in zoom-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40} strokeWidth={3} /></div>
            <h2 className="text-2xl font-black mb-2 uppercase italic">Berhasil Disimpan!</h2>
            <p className="text-slate-400 font-bold mb-10 text-[10px] uppercase tracking-widest leading-loose px-4">Jurnal Anda telah aman di database cloud kami.</p>
            <button onClick={() => { setShowSuccess(false); setView('home'); }} className="w-full bg-emerald-500 text-white font-black py-5 rounded-[25px] shadow-xl uppercase italic active:scale-95 transition-all">Selesai</button>
          </div>
        </div>
      )}

    </div>
  );
};

// --- SUB-COMPONENTS ---
const Section = ({ icon, title, color, children }) => (
  <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-100">
    <div className="flex items-center gap-3 mb-6">
      <div className={`p-3 ${color} text-white rounded-2xl shadow-lg shadow-indigo-100`}>{icon}</div>
      <h3 className="font-black uppercase italic text-sm tracking-tight text-slate-800">{title}</h3>
    </div>
    {children}
  </div>
);

const DetailBox = ({ title, color, children }) => (
  <div className={`bg-white p-6 rounded-[32px] border-l-[8px] ${color} shadow-sm border border-slate-100`}>
    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 opacity-60">{title}</h4>
    <div>{children}</div>
  </div>
);

const PhotoUpload = ({ label, photo, onUpload }) => (
  <div className="mt-4">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{label}</label>
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center justify-center gap-3 bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all flex-1 min-w-[200px]">
        <Camera className="text-slate-400" size={20} />
        <span className="font-bold text-slate-400 text-sm">Upload Foto</span>
        <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
      </label>
      {photo && (
        <div className="relative">
          <img src={photo} className="w-24 h-24 object-cover rounded-2xl border-2 border-white shadow-md" alt="Preview" />
          <div className="absolute -top-1 -right-1 bg-indigo-500 text-white p-1 rounded-full shadow-lg"><Check size={12} strokeWidth={3} /></div>
        </div>
      )}
    </div>
  </div>
);

export default App;
