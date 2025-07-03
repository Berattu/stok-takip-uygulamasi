import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, increment, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Html5Qrcode } from 'html5-qrcode'; // Değiştirildi
import { LogIn, UserPlus, LogOut, ShoppingCart, Package, History, Loader2, Search, Edit, Trash2, AlertTriangle, PlusCircle, Building, LayoutDashboard, DollarSign, PackageSearch, TrendingUp, Camera, X, PlusSquare, BarChart3 } from 'lucide-react';

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
const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

// --- Main App Component ---
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

    const handleAddOrUpdateProduct = useCallback(async (productData) => {
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
    
    const handleUpdateStock = useCallback(async (productId, amount) => {
        if (!amount || isNaN(amount) || amount <= 0) {
            toast.error("Lütfen geçerli bir miktar girin.");
            return;
        }
        const productRef = doc(db, productsPath, productId);
        await updateDoc(productRef, { stock: increment(amount) });
        toast.success(`${amount} adet stok eklendi.`);
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
                        <AddProductSection onAdd={handleAddOrUpdateProduct} products={products} />
                    </div>
                    <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
                        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                        {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} />}
                        {activeTab === 'stock' && <ProductList products={filteredProducts} loading={loading.products} onUpdate={handleAddOrUpdateProduct} onDelete={handleDeleteProduct} onAddStock={handleUpdateStock} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
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
    const [showScanner, setShowScanner] = useState(false);
    const inputRef = useRef(null); 

    useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

    const handleSubmit = (e) => { e.preventDefault(); onSell(barcode); setBarcode(''); if (inputRef.current) inputRef.current.focus(); };

    const onScanSuccess = (decodedText) => {
        setShowScanner(false);
        onSell(decodedText);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ShoppingCart size={22} /> Hızlı Satış</h2>
            <form onSubmit={handleSubmit}>
                <div className="rounded-lg bg-gray-50 p-3 mb-3">
                    <label htmlFor="barcode-input" className="block text-xs font-medium text-gray-500">Ürün Barkodu</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input ref={inputRef} id="barcode-input" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barkodu okutun veya girin..." className="block w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"/>
                        <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-gray-500 hover:text-indigo-600" title="Kamera ile Tara">
                            <Camera size={20} />
                        </button>
                    </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <ShoppingCart size={18} />
                    Satış Yap
                </button>
            </form>
            {showScanner && <CameraScanner onScanSuccess={onScanSuccess} onClose={() => setShowScanner(false)} />}
        </div>
    );
};

const CameraScanner = ({ onScanSuccess, onClose }) => {
    useEffect(() => {
        const html5QrCode = new Html5Qrcode("barcode-scanner-container");
        let scannerIsRunning = false;

        const startScanner = async () => {
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    (decodedText, decodedResult) => {
                        if (scannerIsRunning) {
                            onScanSuccess(decodedText);
                        }
                    },
                    (errorMessage) => { /* ignore */ }
                );
                scannerIsRunning = true;
            } catch (err) {
                toast.error("Kamera başlatılamadı. Lütfen tarayıcı izinlerini kontrol edin.");
                onClose();
            }
        };

        startScanner();

        return () => {
            if (scannerIsRunning) {
                html5QrCode.stop().catch(err => console.error("Scanner stop failed", err));
            }
        };
    }, [onScanSuccess, onClose]);

    return (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
            <div id="barcode-scanner-container" className="w-full max-w-md bg-white rounded-lg overflow-hidden aspect-video"></div>
            <button onClick={onClose} className="mt-4 bg-white text-black px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                <X size={18} /> Kapat
            </button>
        </div>
    );
};

const FormInput = ({ label, id, required, children }) => (
    <div className="rounded-lg bg-gray-50 p-3">
        <label htmlFor={id} className="block text-xs font-medium text-gray-500">
            {label}{required && <span className="text-red-500"> *</span>}
        </label>
        <div className="mt-1">
            {children}
        </div>
    </div>
);

const AddProductSection = ({ onAdd, products }) => {
    const [product, setProduct] = useState({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, barcode, stock, purchasePrice, salePrice } = product;
        if(!name || !barcode || !stock || !purchasePrice || !salePrice) { toast.warning("Lütfen yıldızlı alanları doldurun."); return; }
        const productData = { ...product, stock: parseInt(stock), purchasePrice: parseFloat(purchasePrice), salePrice: parseFloat(salePrice) };
        const existingProduct = products.find(p => p.id === barcode);
        if (existingProduct) {
            toast( `Bu barkod "${existingProduct.name}" ürününe ait.`, { action: { label: 'Güncelle', onClick: () => { onAdd(productData); resetForm(); }}, cancel: { label: 'İptal' } });
        } else {
            await onAdd(productData);
            resetForm();
        }
    };
    const resetForm = () => setProduct({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '' });
    
    const inputClass = "block w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm";

    return ( <div className="bg-white p-6 rounded-2xl shadow-sm"> <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><PlusCircle size={22} /> Yeni Ürün Ekle</h2> <form onSubmit={handleSubmit} className="space-y-3">
        <FormInput label="Ürün Adı" id="name" required><input type="text" name="name" id="name" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} className={inputClass} placeholder="Örn: Kutu Süt"/></FormInput>
        <FormInput label="Barkod Numarası" id="barcode" required><input type="text" name="barcode" id="barcode" value={product.barcode} onChange={(e) => setProduct({...product, barcode: e.target.value})} className={inputClass} placeholder="Okutun veya manuel girin"/></FormInput>
        <FormInput label="Stok Adedi" id="stock" required><input type="number" name="stock" id="stock" value={product.stock} onChange={(e) => setProduct({...product, stock: e.target.value})} className={inputClass} placeholder="0" min="0"/></FormInput>
        <div className="grid grid-cols-2 gap-3">
            <FormInput label="Alış Fiyatı (₺)" id="purchasePrice" required><input type="number" name="purchasePrice" id="purchasePrice" value={product.purchasePrice} onChange={(e) => setProduct({...product, purchasePrice: e.target.value})} className={inputClass} placeholder="0.00" min="0" step="0.01"/></FormInput>
            <FormInput label="Satış Fiyatı (₺)" id="salePrice" required><input type="number" name="salePrice" id="salePrice" value={product.salePrice} onChange={(e) => setProduct({...product, salePrice: e.target.value})} className={inputClass} placeholder="0.00" min="0" step="0.01"/></FormInput>
        </div>
        <FormInput label="Kategori" id="category"><input type="text" name="category" id="category" value={product.category} onChange={(e) => setProduct({...product, category: e.target.value})} className={inputClass} placeholder="Örn: İçecek"/></FormInput>
        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center gap-2"> <PlusCircle size={20} /> <span>Ürünü Ekle</span> </button>
    </form> </div> );
};
const Tabs = ({ activeTab, setActiveTab }) => { const tabData = [ { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }, { id: 'stock', label: 'Stok Listesi', icon: Package }, { id: 'history', label: 'Satış Geçmişi', icon: History } ]; return ( <div className="border-b border-gray-200 mb-4"> <nav className="-mb-px flex space-x-6" aria-label="Tabs"> {tabData.map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> <tab.icon size={16} /><span>{tab.label}</span> </button> ))} </nav> </div> ); };

const Dashboard = ({ products, sales }) => {
    const [timeRange, setTimeRange] = useState('weekly');
    const [selectedProduct, setSelectedProduct] = useState('');

    const { totalStockValue, todaysRevenue, lowStockProducts, chartData, productChartData, totalUnitsSold } = useMemo(() => {
        const calculateGroupedSales = (salesToFilter, groupBy) => {
            const grouped = {};
            salesToFilter.forEach(s => {
                const saleDate = s.saleDate.toDate();
                let key;
                if (groupBy === 'hour') key = `${saleDate.getHours()}:00`;
                else if (groupBy === 'day') key = saleDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
                else if (groupBy === 'month') key = saleDate.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
                if (!grouped[key]) grouped[key] = { Ciro: 0, Adet: 0 };
                grouped[key].Ciro += s.salePrice || 0;
                grouped[key].Adet += 1;
            });
            return Object.keys(grouped).map(key => ({ name: key, ...grouped[key] }));
        };

        const now = new Date();
        let startDate;
        let groupBy;

        switch (timeRange) {
            case 'daily': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); groupBy = 'hour'; break;
            case 'weekly': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); groupBy = 'day'; break;
            case 'monthly': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); groupBy = 'day'; break;
            case 'yearly': startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1); groupBy = 'month'; break;
            default: groupBy = 'month';
        }

        const generalSalesToFilter = sales.filter(s => s.saleDate && (timeRange === 'all' || s.saleDate.toDate() >= startDate));
        const chartData = calculateGroupedSales(generalSalesToFilter, groupBy);

        let productChartData = [];
        let totalUnitsSold = 0;
        if (selectedProduct) {
            const productSales = sales.filter(s => s.barcode === selectedProduct);
            totalUnitsSold = productSales.length;
            const productSalesToFilter = productSales.filter(s => s.saleDate && (timeRange === 'all' || s.saleDate.toDate() >= startDate));
            productChartData = calculateGroupedSales(productSalesToFilter, groupBy);
        }

        const totalStockValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todaysSales = sales.filter(s => s.saleDate && s.saleDate.toDate() >= todayStart);
        const todaysRevenue = todaysSales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
        const lowStockProducts = products.filter(p => p.stock <= 5).sort((a,b) => a.stock - b.stock);

        return { totalStockValue, todaysRevenue, lowStockProducts, chartData, productChartData, totalUnitsSold };
    }, [products, sales, timeRange, selectedProduct]);

    const timeRanges = [ { key: 'daily', label: 'Gün' }, { key: 'weekly', label: 'Hafta' }, { key: 'monthly', label: 'Ay' }, { key: 'yearly', label: 'Yıl' }, { key: 'all', label: 'Tümü' } ];

    return ( <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <StatCard title="Toplam Ürün Çeşidi" value={products.length} icon={Package} /> <StatCard title="Toplam Stok Değeri" value={formatCurrency(totalStockValue)} icon={DollarSign} /> <StatCard title="Bugünkü Ciro" value={formatCurrency(todaysRevenue)} icon={TrendingUp} /> </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h3 className="font-semibold">Genel Satış Grafiği (Ciro)</h3>
                <div className="flex items-center rounded-lg bg-gray-200 p-0.5"> {timeRanges.map(range => ( <button key={range.key} onClick={() => setTimeRange(range.key)} className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${timeRange === range.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-black'}`}> {range.label} </button> ))} </div>
            </div>
            <div style={{ width: '100%', height: 200 }}> <ResponsiveContainer> <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" fontSize={12} /> <YAxis fontSize={12} tickFormatter={(value) => formatCurrency(value)} /> <Tooltip contentStyle={{fontSize: '12px', padding: '4px 8px'}} formatter={(value) => [formatCurrency(value), 'Ciro']}/> <Bar dataKey="Ciro" fill="#4f46e5" /> </BarChart> </ResponsiveContainer> </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h3 className="font-semibold">Ürün Performansı (Satış Adedi)</h3>
                <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    <option value="">Bir ürün seçin...</option>
                    {products.map(p => <option key={p.id} value={p.barcode}>{p.name}</option>)}
                </select>
            </div>
            {selectedProduct && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2" style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer> <BarChart data={productChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" fontSize={12} /> <YAxis fontSize={12} allowDecimals={false} /> <Tooltip contentStyle={{fontSize: '12px', padding: '4px 8px'}} formatter={(value) => [value, 'Adet']}/> <Bar dataKey="Adet" fill="#10b981" /> </BarChart> </ResponsiveContainer>
                    </div>
                    <StatCard title="Toplam Satış" value={`${totalUnitsSold} adet`} icon={BarChart3} />
                </div>
            )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg"> <h3 className="font-semibold mb-3 flex items-center gap-2"><PackageSearch size={18}/> Stoğu Azalan Ürünler</h3> <div className="space-y-2 max-h-60 overflow-y-auto"> {lowStockProducts.length > 0 ? lowStockProducts.map(p => ( <div key={p.id} className="flex justify-between items-center text-sm"> <span className="truncate">{p.name}</span> <span className="font-bold text-red-600">{p.stock} adet</span> </div> )) : <p className="text-sm text-gray-500">Kritik stokta ürün yok.</p>} </div> </div>
    </div> );
};

const StatCard = ({ title, value, icon: Icon }) => ( <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4"> <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full"> <Icon size={24} /> </div> <div> <p className="text-sm text-gray-500">{title}</p> <p className="text-2xl font-bold text-gray-800">{value}</p> </div> </div> );

const ProductList = ({ products, loading, onUpdate, onDelete, onAddStock, searchTerm, setSearchTerm }) => {
    const [editingProduct, setEditingProduct] = useState(null);
    const handleUpdateSubmit = (e) => { e.preventDefault(); onUpdate(editingProduct); setEditingProduct(null); };
    
    if (loading) return <LoadingSpinner />;
    if (products.length === 0 && !searchTerm) return <EmptyState icon={<Package size={40}/>} message="Henüz ürün eklenmemiş." />;
    return ( <div className="space-y-3">
        <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /> <input type="text" placeholder="Ürün adı veya barkod ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-style pl-10" /> </div>
        {products.length === 0 && searchTerm && ( <EmptyState icon={<Search size={40}/>} message="Arama Sonucu Bulunamadı" /> )}
        <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2"> {products.map(p => (
            <div key={p.id} className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                <div className="flex-1 min-w-0"> <p className="font-semibold text-gray-800 truncate flex items-center">{p.name} {p.stock <= 5 && <AlertTriangle size={14} className="ml-2 text-red-500"/>}</p> <p className="text-xs text-gray-500">Barkod: {p.barcode} | Kategori: {p.category || 'Yok'}</p> <p className="text-xs text-green-700 font-medium">Satış: {formatCurrency(p.salePrice)}</p> </div>
                <div className="text-right mx-4 w-16"> <p className={`font-bold text-lg ${p.stock > 10 ? 'text-green-600' : p.stock > 5 ? 'text-yellow-600' : 'text-red-600'}`}>{p.stock}</p> <p className="text-xs text-gray-500">adet</p> </div>
                <div className="flex space-x-1">
                    <button onClick={() => {
                        toast.prompt('Ne kadar stok eklenecek?', {
                            placeholder: 'Örn: 12',
                            onAccept: (value) => {
                                const amount = parseInt(value);
                                if (amount > 0) { onAddStock(p.id, amount); } else { toast.error("Lütfen geçerli bir miktar girin."); }
                            },
                        });
                    }} className="p-2 text-green-600 hover:bg-green-100 rounded-md" title="Stok Ekle"><PlusSquare size={16} /></button>
                    <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md" title="Düzenle"><Edit size={16} /></button>
                    <button onClick={() => toast(`"${p.name}" ürününü silmek istediğinize emin misiniz?`, { action: { label: 'Evet, Sil', onClick: () => onDelete(p.id, p.name) }, cancel: { label: 'İptal' } })} className="p-2 text-red-600 hover:bg-red-100 rounded-md" title="Sil"><Trash2 size={16} /></button>
                </div>
            </div>
        ))} </div>
        {editingProduct && ( <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingProduct(null)}> <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Ürünü Düzenle</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-3">
                <FormInput label="Ürün Adı" id="edit-name"><input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="input-style-inner" /></FormInput>
                <FormInput label="Stok Adedi" id="edit-stock"><input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="input-style-inner" /></FormInput>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Alış Fiyatı (₺)" id="edit-purchasePrice"><input type="number" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value)})} className="input-style-inner" /></FormInput>
                    <FormInput label="Satış Fiyatı (₺)" id="edit-salePrice"><input type="number" value={editingProduct.salePrice} onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})} className="input-style-inner" /></FormInput>
                </div>
                <FormInput label="Kategori" id="edit-category"><input value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="input-style-inner" /></FormInput>
                <div className="flex justify-end space-x-3 mt-2"> <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">İptal</button> <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Kaydet</button> </div>
            </form>
        </div> </div> )}
    </div> );
};
const SalesHistory = ({ sales, loading }) => { if (loading) return <LoadingSpinner />; if (sales.length === 0) return <EmptyState icon={<History size={40}/>} message="Henüz satış yapılmamış." />; return ( <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2"> {sales.map(s => ( <div key={s.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50"> <div> <p className="font-semibold">{s.productName}</p> <p className="text-xs text-gray-500">Barkod: {s.barcode}</p> </div> <p className="text-sm text-green-700 font-medium">{formatCurrency(s.salePrice)}</p> <p className="text-sm text-gray-500">{s.saleDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '...'}</p> </div> ))} </div> ); };
const LoadingSpinner = ({ fullPage = false, message = '' }) => ( <div className={`flex flex-col justify-center items-center ${fullPage ? 'h-screen' : 'h-full py-10'}`}> <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /> {message && <p className="mt-4 text-gray-600">{message}</p>} </div> );
const EmptyState = ({ icon, message, description }) => ( <div className="text-center py-10 px-4"> <div className="text-gray-400 mb-3">{icon}</div> <h3 className="font-semibold text-lg text-gray-700">{message}</h3> <p className="text-sm text-gray-500 mt-1">{description}</p> </div> );
