import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, increment, addDoc, serverTimestamp, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogIn, UserPlus, LogOut, ShoppingCart, Package, History, Loader2, Search, Edit, Trash2, AlertTriangle, PlusCircle, Building, LayoutDashboard, DollarSign, PackageSearch, TrendingUp } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyAb0VoKLRJKKgst9DVC_cb2ZU5wchfdTIM",
  authDomain: "stok-takip-uygulamam-5e4a5.firebaseapp.com",
  projectId: "stok-takip-uygulamam-5e4a5",
  storageBucket: "stok-takip-uygulamam-5e4a5.firebasestorage.app",
  messagingSenderId: "393027640266",
  appId: "1:393027640266:web:020f72a9a23f3fd5fa4d33",
  measurementId: "G-SZ4DSQK66C"
};

// --- Firebase Initialization ---
let app, auth, db;
try {
    app = initializeApp(firebaseConfig); 
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// --- Helper Functions ---
const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
};

// --- Main App Component (Authentication Router) ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) { setLoading(false); return; };
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <LoadingSpinner fullPage={true} message="Uygulama Yükleniyor..." />;

    return (
        <>
            <Toaster richColors position="top-right" />
            {user ? <StockApp user={user} /> : <AuthPage />}
        </>
    );
}

// --- Authentication Page Component ---
const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

    const handleAuthAction = async (e) => {
        e.preventDefault();
        if (!email || !password) { toast.warning("Lütfen e-posta ve şifre alanlarını doldurun."); return; }
        setIsLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success("Başarıyla giriş yapıldı!");
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                toast.success("Hesabınız başarıyla oluşturuldu! Giriş yapılıyor...");
            }
        } catch (error) {
            const errorMessage = error.code.includes('auth/weak-password') ? 'Şifre en az 6 karakter olmalıdır.' : 'Giriş bilgileri hatalı veya kullanıcı bulunamadı.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <Building className="mx-auto h-12 w-auto text-indigo-600" />
                    <h1 className="text-3xl font-bold text-gray-900 mt-4">Stok Takip Sistemine Hoş Geldiniz</h1>
                    <p className="text-gray-500 mt-2">Lütfen hesabınıza giriş yapın veya yeni bir hesap oluşturun.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-md">
                    <form onSubmit={handleAuthAction} className="space-y-6">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-posta Adresi" required className={inputStyle} />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifre" required className={inputStyle} />
                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-indigo-400">
                            {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
                            <span>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
                        </button>
                    </form>
                    <p className="text-center text-sm text-gray-600 mt-6">
                        {isLogin ? "Hesabınız yok mu?" : "Zaten bir hesabınız var mı?"}
                        <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-indigo-600 hover:text-indigo-500 ml-1">
                            {isLogin ? 'Kayıt Olun' : 'Giriş Yapın'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Main Stock Application Component ---
const StockApp = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState({ products: true, sales: true });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');

    const productsPath = `artifacts/${firebaseConfig.appId}/users/${user.uid}/products`;
    const salesPath = `artifacts/${firebaseConfig.appId}/users/${user.uid}/sales`;

    useEffect(() => {
        if(!firebaseConfig.appId || !user) return;
        const productsQuery = query(collection(db, productsPath));
        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(prev => ({ ...prev, products: false }));
        });

        const salesQuery = query(collection(db, salesPath), orderBy('saleDate', 'desc'));
        const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(prev => ({ ...prev, sales: false }));
        });

        return () => { unsubscribeProducts(); unsubscribeSales(); };
    }, [productsPath, salesPath, user]);
    
    const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name)), [products, searchTerm]);

    const handleSellProduct = useCallback(async (barcode) => {
        if (!barcode) return;
        const productRef = doc(db, productsPath, barcode);
        try {
            const productSnap = await getDoc(productRef);
            if (!productSnap.exists()) { toast.error("Ürün bulunamadı."); return; }
            const productData = productSnap.data();
            if (productData.stock <= 0) { toast.warning(`${productData.name} için stok tükendi!`); return; }
            await updateDoc(productRef, { stock: increment(-1) });
            await addDoc(collection(db, salesPath), { productName: productData.name, barcode, saleDate: serverTimestamp(), salePrice: productData.salePrice || 0 });
            toast.success(`${productData.name} satıldı!`);
        } catch (error) { toast.error("Satış sırasında bir hata oluştu."); }
    }, [productsPath, salesPath]);

    const handleAddProduct = useCallback(async (productData) => {
        const { barcode, name } = productData;
        const productRef = doc(db, productsPath, barcode);
        toast.promise(
            async () => {
                const docSnap = await getDoc(productRef);
                if (docSnap.exists()) {
                    await updateDoc(productRef, { ...productData, lastUpdatedAt: serverTimestamp() });
                    return { message: "başarıyla güncellendi", name };
                } else {
                    await setDoc(productRef, { ...productData, createdAt: serverTimestamp() });
                    return { message: "başarıyla eklendi", name };
                }
            },
            { loading: 'Ürün işleniyor...', success: (data) => `'${data.name}' ${data.message}.`, error: 'İşlem sırasında bir hata oluştu.' }
        );
    }, [productsPath]);

    const handleUpdateProduct = useCallback(async (productData) => {
        const { id, name } = productData;
        const productRef = doc(db, productsPath, id);
        toast.promise(updateDoc(productRef, productData), { loading: 'Ürün güncelleniyor...', success: `'${name}' başarıyla güncellendi.`, error: 'Güncelleme sırasında hata oluştu.' });
    }, [productsPath]);
    
    const handleDeleteProduct = useCallback((id, name) => {
        const productRef = doc(db, productsPath, id);
        toast.promise(deleteDoc(productRef), { loading: `${name} siliniyor...`, success: `${name} başarıyla silindi.`, error: `Silme işlemi sırasında hata oluştu.` });
    }, [productsPath]);

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="container mx-auto p-4 md:p-6 max-w-7xl">
                <Header userEmail={user.email} />
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <SaleSection onSell={handleSellProduct} />
                        <AddProductSection onAdd={handleAddProduct} products={products} />
                    </div>
                    <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
                        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                        {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} />}
                        {activeTab === 'stock' && <ProductList products={filteredProducts} loading={loading.products} onUpdate={handleUpdateProduct} onDelete={handleDeleteProduct} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
                        {activeTab === 'history' && <SalesHistory sales={sales} loading={loading.sales} />}
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- Child Components ---
const Header = ({ userEmail }) => ( <header className="text-center mb-6 md:mb-8"> <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Stok Takip Sistemi</h1> <div className="flex items-center justify-center gap-4 mt-3"> <p className="text-sm text-gray-500">Giriş yapıldı: <span className="font-medium text-gray-700">{userEmail}</span></p> <button onClick={() => signOut(auth)} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5"> <LogOut size={14} /> Çıkış Yap </button> </div> </header> );

const SaleSection = ({ onSell }) => {
    const [barcode, setBarcode] = useState('');
    const inputRef = useRef(null); 

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSell(barcode);
        setBarcode('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ShoppingCart size={22} /> Hızlı Satış</h2>
            <form onSubmit={handleSubmit}>
                <label htmlFor="barcode-input" className="block text-sm font-medium text-gray-600 mb-1">Ürün Barkodu</label>
                <input
                    ref={inputRef}
                    id="barcode-input"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Barkodu okutun veya girin..."
                    className="input-style"
                />
                <button type="submit" className="hidden">Sat</button>
            </form>
        </div>
    );
};

const AddProductSection = ({ onAdd, products }) => {
    const [product, setProduct] = useState({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => setProduct({ ...product, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, barcode, stock, purchasePrice, salePrice } = product;
        if(!name || !barcode || !stock || !purchasePrice || !salePrice) { toast.warning("Lütfen yıldızlı alanları doldurun."); return; }
        setIsSubmitting(true);
        
        const productData = { ...product, stock: parseInt(stock), purchasePrice: parseFloat(purchasePrice), salePrice: parseFloat(salePrice) };
        const existingProduct = products.find(p => p.id === barcode);

        if (existingProduct) {
            toast( `Bu barkod "${existingProduct.name}" ürününe ait.`, { action: { label: 'Güncelle', onClick: () => { onAdd(productData); resetForm(); }}, cancel: { label: 'İptal' } });
        } else {
            await onAdd(productData);
            resetForm();
        }
        setIsSubmitting(false);
    };
    
    const resetForm = () => setProduct({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '' });

    return ( <div className="bg-white p-6 rounded-2xl shadow-sm"> <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><PlusCircle size={22} /> Yeni Ürün Ekle</h2> <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" value={product.name} onChange={handleChange} placeholder="Ürün Adı *" className="input-style" />
        <input name="barcode" value={product.barcode} onChange={handleChange} placeholder="Barkod Numarası *" className="input-style" />
        <input name="stock" type="number" value={product.stock} onChange={handleChange} placeholder="Stok Adedi *" min="0" className="input-style" />
        <div className="grid grid-cols-2 gap-4">
            <input name="purchasePrice" type="number" value={product.purchasePrice} onChange={handleChange} placeholder="Alış Fiyatı (₺) *" min="0" step="0.01" className="input-style" />
            <input name="salePrice" type="number" value={product.salePrice} onChange={handleChange} placeholder="Satış Fiyatı (₺) *" min="0" step="0.01" className="input-style" />
        </div>
        <input name="category" value={product.category} onChange={handleChange} placeholder="Kategori (örn: Gıda)" className="input-style" />
        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-indigo-400"> {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />} <span>{isSubmitting ? 'İşleniyor...' : 'Ürünü Ekle'}</span> </button>
    </form> </div> );
};
const Tabs = ({ activeTab, setActiveTab }) => {
    const tabData = [ { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }, { id: 'stock', label: 'Stok Listesi', icon: Package }, { id: 'history', label: 'Satış Geçmişi', icon: History } ];
    return ( <div className="border-b border-gray-200 mb-4"> <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabData.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <tab.icon size={16} /><span>{tab.label}</span>
            </button>
        ))}
    </nav> </div> );
};

// GÜNCELLENDİ: Ciro ve grafik hesaplama mantığı düzeltildi
const Dashboard = ({ products, sales }) => {
    const stats = useMemo(() => {
        const totalStockValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todaysSales = sales.filter(s => s.saleDate && s.saleDate.toDate() >= todayStart);
        const todaysRevenue = todaysSales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
        
        const lowStockProducts = products.filter(p => p.stock <= 5).sort((a,b) => a.stock - b.stock);

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0,0,0,0);
            return d;
        }).reverse();

        const weeklySalesData = last7Days.map(day => {
            const dayString = day.toLocaleDateString('tr-TR', { weekday: 'short' });
            
            const salesOnDay = sales.filter(s => {
                if (!s.saleDate) return false;
                // Orijinal veriyi bozmamak için yeni bir tarih nesnesi oluştur
                const saleDay = new Date(s.saleDate.toDate().getTime());
                saleDay.setHours(0,0,0,0);
                return saleDay.getTime() === day.getTime();
            });

            const total = salesOnDay.reduce((sum, s) => sum + (s.salePrice || 0), 0);
            return { name: dayString, Ciro: total };
        });

        return { totalStockValue, todaysRevenue, lowStockProducts, weeklySalesData };
    }, [products, sales]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Toplam Ürün Çeşidi" value={products.length} icon={Package} />
                <StatCard title="Toplam Stok Değeri" value={formatCurrency(stats.totalStockValue)} icon={DollarSign} />
                <StatCard title="Bugünkü Ciro" value={formatCurrency(stats.todaysRevenue)} icon={TrendingUp} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2"><PackageSearch size={18}/> Stoğu Azalan Ürünler</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {stats.lowStockProducts.length > 0 ? stats.lowStockProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center text-sm">
                                <span className="truncate">{p.name}</span>
                                <span className="font-bold text-red-600">{p.stock} adet</span>
                            </div>
                        )) : <p className="text-sm text-gray-500">Kritik stokta ürün yok.</p>}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Son 7 Günlük Satış Grafiği</h3>
                    <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.weeklySalesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} tickFormatter={(value) => `${value}₺`} />
                                <Tooltip contentStyle={{fontSize: '12px', padding: '4px 8px'}} formatter={(value) => [formatCurrency(value), 'Ciro']}/>
                                <Bar dataKey="Ciro" fill="#4f46e5" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full">
            <Icon size={24} />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);
const ProductList = ({ products, loading, onUpdate, onDelete, searchTerm, setSearchTerm }) => {
    const [editingProduct, setEditingProduct] = useState(null);
    const handleUpdateSubmit = (e) => { e.preventDefault(); onUpdate(editingProduct); setEditingProduct(null); };

    if (loading) return <LoadingSpinner />;
    if (products.length === 0 && !searchTerm) return <EmptyState icon={<Package size={40}/>} message="Henüz ürün eklenmemiş." />;

    return ( <div className="space-y-3">
        <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /> <input type="text" placeholder="Ürün adı veya barkod ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-style pl-10" /> </div>
        {products.length === 0 && searchTerm && ( <EmptyState icon={<Search size={40}/>} message="Arama Sonucu Bulunamadı" /> )}
        <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2"> {products.map(p => (
            <div key={p.id} className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate flex items-center">{p.name} {p.stock <= 5 && <AlertTriangle size={14} className="ml-2 text-red-500"/>}</p>
                    <p className="text-xs text-gray-500">Barkod: {p.barcode} | Kategori: {p.category || 'Yok'}</p>
                    <p className="text-xs text-green-700 font-medium">Satış: {formatCurrency(p.salePrice)}</p>
                </div>
                <div className="text-right mx-4 w-16"> <p className={`font-bold text-lg ${p.stock > 10 ? 'text-green-600' : p.stock > 5 ? 'text-yellow-600' : 'text-red-600'}`}>{p.stock}</p> <p className="text-xs text-gray-500">adet</p> </div>
                <div className="flex space-x-1"> <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"><Edit size={16} /></button> <button onClick={() => toast(`"${p.name}" ürününü silmek istediğinize emin misiniz?`, { action: { label: 'Evet, Sil', onClick: () => onDelete(p.id, p.name) }, cancel: { label: 'İptal' } })} className="p-2 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button> </div>
            </div>
        ))} </div>
        {editingProduct && ( <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingProduct(null)}> <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Ürünü Düzenle</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Ürün Adı" className="input-style" />
                <input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} placeholder="Stok" className="input-style" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value)})} placeholder="Alış Fiyatı (₺)" className="input-style" />
                    <input type="number" value={editingProduct.salePrice} onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})} placeholder="Satış Fiyatı (₺)" className="input-style" />
                </div>
                <input value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} placeholder="Kategori" className="input-style" />
                <div className="flex justify-end space-x-3 mt-2"> <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">İptal</button> <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Kaydet</button> </div>
            </form>
        </div> </div> )}
    </div> );
};
const SalesHistory = ({ sales, loading }) => { if (loading) return <LoadingSpinner />; if (sales.length === 0) return <EmptyState icon={<History size={40}/>} message="Henüz satış yapılmamış." />; return ( <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2"> {sales.map(s => ( <div key={s.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50"> <div> <p className="font-semibold">{s.productName}</p> <p className="text-xs text-gray-500">Barkod: {s.barcode}</p> </div> <p className="text-sm text-green-700 font-medium">{formatCurrency(s.salePrice)}</p> <p className="text-sm text-gray-500">{s.saleDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '...'}</p> </div> ))} </div> ); };
const LoadingSpinner = ({ fullPage = false, message = '' }) => ( <div className={`flex flex-col justify-center items-center ${fullPage ? 'h-screen' : 'h-full py-10'}`}> <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /> {message && <p className="mt-4 text-gray-600">{message}</p>} </div> );
const EmptyState = ({ icon, message, description }) => ( <div className="text-center py-10 px-4"> <div className="text-gray-400 mb-3">{icon}</div> <h3 className="font-semibold text-lg text-gray-700">{message}</h3> <p className="text-sm text-gray-500 mt-1">{description}</p> </div> );
