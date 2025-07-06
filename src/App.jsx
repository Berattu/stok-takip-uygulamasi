import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, increment, addDoc, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
// import { Html5Qrcode } from 'html5-qrcode'; // Bu satır kaldırıldı. Kütüphane dinamik olarak yüklenecek.
import { LogIn, UserPlus, LogOut, ShoppingCart, Package, History, Loader2, Search, Edit, Trash2, AlertTriangle, PlusCircle, Building, LayoutDashboard, DollarSign, PackageSearch, TrendingUp, Camera, X, PlusSquare, BarChart3, Calendar, ArrowUp, ArrowDown, PieChart as PieIcon, MinusCircle, Clock, UserCheck } from 'lucide-react';

// --- Firebase Yapılandırması ---
// Kullanıcının sağladığı Firebase bilgileri doğrudan eklendi.
const firebaseConfig = {
  apiKey: "AIzaSyAb0VoKLRJKKgst9DVC_cb2ZU5wchfdTIM",
  authDomain: "stok-takip-uygulamam-5e4a5.firebaseapp.com",
  projectId: "stok-takip-uygulamam-5e4a5",
  storageBucket: "stok-takip-uygulamam-5e4a5.appspot.com",
  messagingSenderId: "393027640266",
  appId: "1:393027640266:web:020f72a9a23f3fd5fa4d33",
  measurementId: "G-SZ4DSQK66C"
};


// --- Firebase Başlatma ---
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// --- Yardımcı Fonksiyonlar ---
const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

// --- Ana Uygulama Bileşeni ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) { setLoading(false); return; }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
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

// --- Kimlik Doğrulama Sayfası ---
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

// --- Ana Stok Uygulaması Bileşeni ---
const StockApp = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState({ products: true, sales: true });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');

    const productsPath = `artifacts/${firebaseConfig.appId}/users/${user.uid}/products`;
    const salesPath = `artifacts/${firebaseConfig.appId}/users/${user.uid}/sales`;

    useEffect(() => {
        if (!user) return;
        const productsQuery = query(collection(db, productsPath));
        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(prev => ({ ...prev, products: false }));
        }, (error) => {
            console.error("Product listener error:", error);
            toast.error("Ürün verileri alınırken bir hata oluştu. İzinlerinizi kontrol edin.");
        });
        const salesQuery = query(collection(db, salesPath), orderBy('saleDate', 'desc'));
        const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(prev => ({ ...prev, sales: false }));
        }, (error) => {
            console.error("Sales listener error:", error);
            toast.error("Satış verileri alınırken bir hata oluştu. İzinlerinizi kontrol edin.");
        });
        return () => { unsubscribeProducts(); unsubscribeSales(); };
    }, [productsPath, salesPath, user]);

    const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm))).sort((a, b) => a.name.localeCompare(b.name)), [products, searchTerm]);

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
                        <InstantSaleSection products={products} productsPath={productsPath} salesPath={salesPath} />
                        <AddProductSection onAdd={handleAddOrUpdateProduct} products={products} />
                    </div>
                    <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
                        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                        {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} />}
                        {activeTab === 'statistics' && <StatisticsPage sales={sales} />}
                        {activeTab === 'stock' && <ProductList products={filteredProducts} loading={loading.products} onUpdate={handleAddOrUpdateProduct} onDelete={handleDeleteProduct} productsPath={productsPath} salesPath={salesPath} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
                        {activeTab === 'history' && <SalesHistory sales={sales} loading={loading.sales} />}
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- Child Components ---
const Header = ({ userEmail }) => ( <header className="text-center mb-6 md:mb-8"> <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Stok Takip Sistemi</h1> <div className="flex items-center justify-center gap-4 mt-3"> <p className="text-sm text-gray-500">Giriş yapıldı: <span className="font-medium text-gray-700">{userEmail}</span></p> <button onClick={() => signOut(auth)} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5"> <LogOut size={14} /> Çıkış Yap </button> </div> </header> );

const InstantSaleSection = ({ products, productsPath, salesPath }) => {
    const [barcode, setBarcode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const inputRef = useRef(null);

    const handleSellProduct = useCallback(async (scannedBarcode) => {
        if (!scannedBarcode) return;
        
        const product = products.find(p => p.barcode === scannedBarcode);
        if (!product) {
            toast.error("Ürün bulunamadı.");
            setBarcode('');
            return;
        }

        if (product.stock <= 0) {
            toast.warning(`${product.name} için stok tükendi!`);
            setBarcode('');
            return;
        }
        
        const productRef = doc(db, productsPath, product.id);
        const saleRef = doc(collection(db, salesPath));
        const batch = writeBatch(db);

        batch.update(productRef, { stock: increment(-1) });
        batch.set(saleRef, {
            type: 'sale',
            saleDate: serverTimestamp(),
            total: product.salePrice,
            items: [{ productId: product.id, name: product.name, quantity: 1, price: product.salePrice }]
        });

        await toast.promise(batch.commit(), {
            loading: 'Satış işleniyor...',
            success: `${product.name} satıldı!`,
            error: 'Satış sırasında bir hata oluştu.'
        });
        setBarcode('');
    }, [products, productsPath, salesPath]);

    const handleSubmit = (e) => { e.preventDefault(); handleSellProduct(barcode); if (inputRef.current) inputRef.current.focus(); };
    const onScanSuccess = (decodedText) => { setShowScanner(false); handleSellProduct(decodedText); };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><ShoppingCart size={22} /> Anında Satış</h2>
            <form onSubmit={handleSubmit}>
                <div className="rounded-lg bg-gray-50 p-3">
                    <label htmlFor="barcode-input" className="block text-xs font-medium text-gray-500">Ürün Barkodu</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input ref={inputRef} autoFocus id="barcode-input" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barkodu okutun veya girip Enter'a basın" className="block w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"/>
                        <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-gray-500 hover:text-indigo-600" title="Kamera ile Tara"> <Camera size={20} /> </button>
                    </div>
                </div>
            </form>
            {showScanner && <CameraScanner onScanSuccess={onScanSuccess} onClose={() => setShowScanner(false)} />}
        </div>
    );
};


const AddProductSection = ({ onAdd, products }) => {
    const [product, setProduct] = useState({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '' });
    const [showScanner, setShowScanner] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, barcode, stock, purchasePrice, salePrice } = product;
        if(!name || !barcode || !stock || !purchasePrice || !salePrice) { toast.warning("Lütfen yıldızlı alanları doldurun."); return; }
        const productData = { ...product, stock: parseInt(stock), purchasePrice: parseFloat(purchasePrice), salePrice: parseFloat(salePrice) };
        const existingProduct = products.find(p => p.id === barcode);
        if (existingProduct) {
            toast( `Bu barkod "${existingProduct.name}" ürününe ait. Bilgileri güncellemek ister misiniz?`, { action: { label: 'Güncelle', onClick: () => { onAdd(productData); resetForm(); }}, cancel: { label: 'İptal' } });
        } else {
            await onAdd(productData);
            resetForm();
        }
    };
    const resetForm = () => setProduct({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '' });
    
    const onBarcodeScan = (decodedText) => {
        setProduct(prev => ({ ...prev, barcode: decodedText }));
        setShowScanner(false);
    };

    const inputClass = "block w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm";

    return ( <div className="bg-white p-6 rounded-2xl shadow-sm"> <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Package size={22} /> Ürün Yönetimi</h2> <form onSubmit={handleSubmit} className="space-y-3">
        <FormInput label="Ürün Adı" id="name" required><input type="text" name="name" id="name" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} className={inputClass} placeholder="Örn: Kutu Süt"/></FormInput>
        <FormInput label="Barkod Numarası" id="barcode" required>
            <div className="flex items-center gap-2">
                <input type="text" name="barcode" id="barcode" value={product.barcode} onChange={(e) => setProduct({...product, barcode: e.target.value})} className={inputClass} placeholder="Okutun veya manuel girin"/>
                <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-gray-500 hover:text-indigo-600" title="Kamera ile Tara">
                    <Camera size={20} />
                </button>
            </div>
        </FormInput>
        <FormInput label="Stok Adedi" id="stock" required><input type="number" name="stock" id="stock" value={product.stock} onChange={(e) => setProduct({...product, stock: e.target.value})} className={inputClass} placeholder="0" min="0"/></FormInput>
        <div className="grid grid-cols-2 gap-3">
            <FormInput label="Alış Fiyatı (₺)" id="purchasePrice" required><input type="number" name="purchasePrice" id="purchasePrice" value={product.purchasePrice} onChange={(e) => setProduct({...product, purchasePrice: e.target.value})} className={inputClass} placeholder="0.00" min="0" step="0.01"/></FormInput>
            <FormInput label="Satış Fiyatı (₺)" id="salePrice" required><input type="number" name="salePrice" id="salePrice" value={product.salePrice} onChange={(e) => setProduct({...product, salePrice: e.target.value})} className={inputClass} placeholder="0.00" min="0" step="0.01"/></FormInput>
        </div>
        <FormInput label="Kategori" id="category"><input type="text" name="category" id="category" value={product.category} onChange={(e) => setProduct({...product, category: e.target.value})} className={inputClass} placeholder="Örn: İçecek"/></FormInput>
        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center gap-2"> <PlusCircle size={20} /> <span>Ürünü Ekle / Güncelle</span> </button>
    </form>
    {showScanner && <CameraScanner onScanSuccess={onBarcodeScan} onClose={() => setShowScanner(false)} />}
    </div> );
};

const Tabs = ({ activeTab, setActiveTab }) => { const tabData = [ { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }, { id: 'statistics', label: 'İstatistikler', icon: BarChart3 }, { id: 'stock', label: 'Stok Listesi', icon: Package }, { id: 'history', label: 'Satış Geçmişi', icon: History } ]; return ( <div className="border-b border-gray-200 mb-4"> <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs"> {tabData.map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-2 sm:px-3 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> <tab.icon size={16} /><span>{tab.label}</span> </button> ))} </nav> </div> ); };

const Dashboard = ({ products, sales }) => {
    const { totalStockValue, todaysRevenue, lowStockProducts, monthlyRevenueData } = useMemo(() => {
        const now = new Date();
        const totalStockValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todaysSales = sales.filter(s => s.saleDate && s.saleDate.toDate() >= todayStart && s.type === 'sale');
        const todaysRevenue = todaysSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const lowStockProducts = products.filter(p => p.stock <= 5).sort((a,b) => a.stock - b.stock);

        const monthlyRevenuesForSort = {};
        sales.filter(s => s.type === 'sale').forEach(s => {
            if (s.saleDate) {
                const saleDate = s.saleDate.toDate();
                const monthYearKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyRevenuesForSort[monthYearKey]) monthlyRevenuesForSort[monthYearKey] = 0;
                monthlyRevenuesForSort[monthYearKey] += s.total || 0;
            }
        });
        const sortedMonths = Object.keys(monthlyRevenuesForSort).sort().reverse();
        const monthlyRevenueData = sortedMonths.slice(0, 12).map(key => {
            const [year, month] = key.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
            return { name: monthName, revenue: monthlyRevenuesForSort[key] };
        });

        return { totalStockValue, todaysRevenue, lowStockProducts, monthlyRevenueData };
    }, [products, sales]);

    return ( <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> 
            <StatCard title="Bugünkü Ciro" value={formatCurrency(todaysRevenue)} icon={TrendingUp} />
            <StatCard title="Toplam Stok Değeri" value={formatCurrency(totalStockValue)} icon={DollarSign} />
            <StatCard title="Toplam Ürün Çeşidi" value={products.length} icon={Package} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg"> <h3 className="font-semibold mb-3 flex items-center gap-2"><PackageSearch size={18}/> Stoğu Azalan Ürünler</h3> <div className="space-y-2 max-h-60 overflow-y-auto"> {lowStockProducts.length > 0 ? lowStockProducts.map(p => ( <div key={p.id} className="flex justify-between items-center text-sm"> <span className="truncate">{p.name}</span> <span className="font-bold text-red-600">{p.stock} adet</span> </div> )) : <p className="text-sm text-gray-500">Kritik stokta ürün yok.</p>} </div> </div>
            <div className="bg-gray-50 p-4 rounded-lg"> <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar size={18}/> Geçmiş Aylık Cirolar</h3> <div className="space-y-2 max-h-60 overflow-y-auto"> {monthlyRevenueData.length > 0 ? monthlyRevenueData.map(month => ( <div key={month.name} className="flex justify-between items-center text-sm"> <span className="text-gray-600">{month.name}</span> <span className="font-bold text-green-700">{formatCurrency(month.revenue)}</span> </div> )) : <p className="text-sm text-gray-500">Geçmiş aylara ait satış verisi yok.</p>} </div> </div>
        </div>
    </div> );
};

const StatisticsPage = ({ sales }) => {
    const [timePeriod, setTimePeriod] = useState('weekly');

    const { currentPeriod, previousPeriod, busiestDays, busiestHours, revenueByProduct, topSellingProducts, personnelUsageData } = useMemo(() => {
        const now = new Date();
        let currentStart, currentEnd, previousStart, previousEnd;

        switch (timePeriod) {
            case 'daily':
                currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                previousEnd = currentStart;
                break;
            case 'monthly':
                currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
                currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEnd = currentStart;
                break;
            case 'yearly':
                currentStart = new Date(now.getFullYear(), 0, 1);
                currentEnd = new Date(now.getFullYear() + 1, 0, 1);
                previousStart = new Date(now.getFullYear() - 1, 0, 1);
                previousEnd = currentStart;
                break;
            case 'weekly':
            default:
                const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
                currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                currentEnd = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousEnd = currentStart;
                break;
        }

        const filterSalesByDate = (salesArray, start, end) => salesArray.filter(s => s.saleDate && s.saleDate.toDate() >= start && s.saleDate.toDate() < end);
        
        const currentSales = filterSalesByDate(sales.filter(s => s.type === 'sale'), currentStart, currentEnd);
        const previousSales = filterSalesByDate(sales.filter(s => s.type === 'sale'), previousStart, previousEnd);
        const currentPersonnelUsage = filterSalesByDate(sales.filter(s => s.type === 'personnel'), currentStart, currentEnd);

        const getSum = (filteredSales) => filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);

        const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
        const salesByDay = new Array(7).fill(0).map((_, i) => ({ name: dayNames[i], Ciro: 0 }));
        const salesByHour = new Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, Ciro: 0 }));
        const productRevenue = {};

        currentSales.forEach(s => {
            const saleDate = s.saleDate.toDate();
            salesByDay[saleDate.getDay()].Ciro += s.total;
            salesByHour[saleDate.getHours()].Ciro += s.total;

            s.items.forEach(item => {
                if (!productRevenue[item.name]) productRevenue[item.name] = 0;
                productRevenue[item.name] += item.price * item.quantity;
            });
        });
        
        const sortedProducts = Object.entries(productRevenue).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const top5Products = sortedProducts.slice(0, 5);
        const otherProductsValue = sortedProducts.slice(5).reduce((acc, p) => acc + p.value, 0);
        const revenueByProductData = [...top5Products];
        if (otherProductsValue > 0) {
            revenueByProductData.push({ name: 'Diğer', value: otherProductsValue });
        }

        const usageByProduct = {};
        currentPersonnelUsage.forEach(sale => {
            sale.items.forEach(item => {
                if (!usageByProduct[item.name]) usageByProduct[item.name] = 0;
                usageByProduct[item.name] += item.quantity;
            });
        });
        const personnelUsageData = Object.entries(usageByProduct).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);

        return {
            currentPeriod: { revenue: getSum(currentSales) },
            previousPeriod: { revenue: getSum(previousSales) },
            busiestDays: salesByDay,
            busiestHours: salesByHour.filter(h => h.Ciro > 0),
            revenueByProduct: revenueByProductData,
            topSellingProducts: top5Products,
            personnelUsageData
        };
    }, [sales, timePeriod]);
    
    const PIE_COLORS = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#a8a29e'];
    const periodLabels = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">İstatistikler</h3>
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
                    {Object.keys(periodLabels).map(period => (
                        <button key={period} onClick={() => setTimePeriod(period)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timePeriod === period ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                            {periodLabels[period]}
                        </button>
                    ))}
                </div>
            </div>
            
            <ComparisonCard title={`${periodLabels[timePeriod]} Ciro`} current={currentPeriod.revenue} previous={previousPeriod.revenue} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="En Yoğun Günler" icon={Calendar}>
                    <BarChart data={busiestDays} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={formatCurrency} />
                        <Tooltip contentStyle={{fontSize: '12px', padding: '4px 8px'}} formatter={(value) => [formatCurrency(value), 'Ciro']}/>
                        <Bar dataKey="Ciro" fill="#10b981" />
                    </BarChart>
                </ChartContainer>
                <ChartContainer title="En Yoğun Saatler" icon={Clock}>
                     <BarChart data={busiestHours} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={12} tickFormatter={formatCurrency} />
                        <Tooltip contentStyle={{fontSize: '12px', padding: '4px 8px'}} formatter={(value) => [formatCurrency(value), 'Ciro']}/>
                        <Bar dataKey="Ciro" fill="#3b82f6" />
                    </BarChart>
                </ChartContainer>
                <ChartContainer title="Ürün Ciro Dağılımı" icon={PieIcon}>
                    <PieChart>
                        <Pie data={revenueByProduct} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                            {revenueByProduct.map((entry, index) => ( <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} /> ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend iconSize={10} />
                    </PieChart>
                </ChartContainer>
                <ChartContainer title="En Çok Satan Ürünler" icon={TrendingUp}>
                    <BarChart data={topSellingProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}}/>
                        <Tooltip formatter={(value) => [formatCurrency(value), 'Ciro']}/>
                        <Bar dataKey="value" fill="#f97316" background={{ fill: '#eee' }} label={{ position: 'right', formatter: (value) => formatCurrency(value), fontSize: 10 }} />
                    </BarChart>
                </ChartContainer>
                <div className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
                    <h3 className="font-semibold mb-3 flex items-center gap-2"><UserCheck size={18}/> Personel Kullanım Özeti ({periodLabels[timePeriod]})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {personnelUsageData.length > 0 ? personnelUsageData.map(item => (
                            <div key={item.name} className="flex justify-between items-center text-sm">
                                <span className="truncate">{item.name}</span>
                                <span className="font-bold text-yellow-600">{item.quantity} adet</span>
                            </div>
                        )) : <p className="text-sm text-gray-500">Bu dönemde personel kullanımı kaydedilmedi.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductList = ({ products, loading, onUpdate, onDelete, productsPath, salesPath, searchTerm, setSearchTerm }) => {
    const [editingProduct, setEditingProduct] = useState(null);
    const [stockModalProduct, setStockModalProduct] = useState(null);
    const handleUpdateSubmit = (e) => { e.preventDefault(); onUpdate(editingProduct); setEditingProduct(null); };
    
    const handleAddStock = useCallback(async (productId, amount) => {
        if (!amount || isNaN(amount) || amount <= 0) {
            toast.error("Lütfen geçerli bir miktar girin.");
            return;
        }
        const productRef = doc(db, productsPath, productId);
        await updateDoc(productRef, { stock: increment(amount) });
        toast.success(`${amount} adet stok eklendi.`);
    }, [productsPath]);

    const handlePersonnelUse = useCallback(async (product, amount) => {
        const productRef = doc(db, productsPath, product.id);
        try {
            if (product.stock < amount) {
                toast.error(`Yetersiz stok! Sadece ${product.stock} adet mevcut.`);
                return;
            }
            const batch = writeBatch(db);
            batch.update(productRef, { stock: increment(-amount) });
            const saleRef = doc(collection(db, salesPath));
            batch.set(saleRef, { type: 'personnel', saleDate: serverTimestamp(), total: 0, items: [{ productId: product.id, name: product.name, quantity: amount, price: 0 }] });
            await batch.commit();
            toast.info(`${amount} adet ${product.name}, personel kullanımı olarak düşüldü.`);
        } catch (error) { toast.error("İşlem sırasında bir hata oluştu."); }
    }, [productsPath, salesPath]);

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
                    <button onClick={() => handlePersonnelUse(p, 1)} className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-md" title="Personel Kullanımı (1 Adet Düş)"><UserCheck size={16} /></button>
                    <button onClick={() => setStockModalProduct(p)} className="p-2 text-green-600 hover:bg-green-100 rounded-md" title="Stok Ekle"><PlusSquare size={16} /></button>
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
        {stockModalProduct && <AddStockModal product={stockModalProduct} onClose={() => setStockModalProduct(null)} onAddStock={handleAddStock} />}
    </div> );
};

const AddStockModal = ({ product, onClose, onAddStock }) => {
    const [amount, setAmount] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const stockToAdd = parseInt(amount);
        if (stockToAdd > 0) {
            onAddStock(product.id, stockToAdd);
            onClose();
        } else {
            toast.error("Lütfen geçerli bir miktar girin.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-semibold mb-4">Stok Ekle: <span className="font-bold text-indigo-600">{product.name}</span></h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Eklenecek Miktar" id="stock-amount">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="block w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                            placeholder="0"
                            min="1"
                            autoFocus
                            required
                        />
                    </FormInput>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold text-sm">İptal</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm">Ekle</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SalesHistory = ({ sales, loading }) => {
    if (loading) return <LoadingSpinner />;
    if (!sales || sales.length === 0) return <EmptyState icon={<History size={40}/>} message="Henüz işlem yapılmamış." />;
    return (
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2">
            {sales.map(s => (
                <div key={s.id} className="p-3 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500">{s.saleDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '...'}</p>
                            <span className={`text-xs font-semibold text-white px-2 py-0.5 rounded-full ${s.type === 'sale' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                                {s.type === 'sale' ? 'SATIŞ' : 'PERSONEL KULLANIMI'}
                            </span>
                        </div>
                        <p className="text-lg font-bold text-green-700">{s.type === 'sale' ? formatCurrency(s.total) : ''}</p>
                    </div>
                    <div className="mt-2 border-t pt-2 space-y-1">
                        {s.items && Array.isArray(s.items) ? (
                            s.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <p className="text-gray-700">
                                        <span className="font-medium">{item.quantity}x</span> {item.name}
                                    </p>
                                    <p className="text-gray-500">{s.type === 'sale' ? formatCurrency(item.price * item.quantity) : ''}</p>
                                </div>
                            ))
                        ) : (
                            // Eski veri yapısı için fallback
                            <div className="flex justify-between items-center text-sm">
                                <p className="text-gray-700">
                                    <span className="font-medium">{s.quantity || 1}x</span> {s.productName}
                                </p>
                                <p className="text-gray-500">{s.type === 'sale' ? formatCurrency(s.salePrice) : ''}</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ComparisonCard = ({ title, current, previous }) => {
    const percentageChange = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
    const isIncrease = percentageChange >= 0;

    return (
        <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <div className="flex items-end justify-between mt-2">
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(current)}</p>
                <div className={`flex items-center text-sm font-semibold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncrease ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    <span>{percentageChange.toFixed(1)}%</span>
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Önceki dönem: {formatCurrency(previous)}</p>
        </div>
    );
};

const ChartContainer = ({ title, icon: Icon, children }) => (
    <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Icon size={18}/> {title}</h3>
        <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>{children}</ResponsiveContainer>
        </div>
    </div>
);

const CameraScanner = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        const scriptId = 'html5-qrcode-script';

        const initializeScanner = () => {
            if (!window.Html5Qrcode) {
                toast.error("Barkod okuyucu kütüphanesi yüklenemedi.");
                onClose();
                return;
            }
            if (scannerRef.current) return;
            
            const scanner = new window.Html5Qrcode("barcode-scanner-container");
            scannerRef.current = scanner;
            let isScanning = true;

            scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText, decodedResult) => {
                    if (isScanning) {
                        isScanning = false;
                        onScanSuccess(decodedText);
                    }
                },
                (errorMessage) => { /* ignore */ }
            ).catch(err => {
                toast.error("Kamera başlatılamadı. Lütfen tarayıcı izinlerini kontrol edin.");
                onClose();
            });
        };

        if (typeof window.Html5Qrcode !== 'undefined') {
            initializeScanner();
        } else if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
            script.async = true;
            script.onload = initializeScanner;
            script.onerror = () => {
                toast.error("Barkod okuyucu betiği yüklenemedi.");
                onClose();
            };
            document.body.appendChild(script);
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => {
                    console.error("Tarayıcı durdurulurken hata oluştu, yoksayılıyor.", err);
                });
                scannerRef.current = null;
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

const StatCard = ({ title, value, icon: Icon }) => ( <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4"> <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full"> <Icon size={24} /> </div> <div> <p className="text-sm text-gray-500">{title}</p> <p className="text-2xl font-bold text-gray-800">{value}</p> </div> </div> );
const LoadingSpinner = ({ fullPage = false, message = '' }) => ( <div className={`flex flex-col justify-center items-center ${fullPage ? 'h-screen' : 'h-full py-10'}`}> <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /> {message && <p className="mt-4 text-gray-600">{message}</p>} </div> );
const EmptyState = ({ icon, message, description }) => ( <div className="text-center py-10 px-4"> <div className="text-gray-400 mb-3">{icon}</div> <h3 className="font-semibold text-lg text-gray-700">{message}</h3> <p className="text-sm text-gray-500 mt-1">{description}</p> </div> );
