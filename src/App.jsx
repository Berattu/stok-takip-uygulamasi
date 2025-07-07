import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, increment, addDoc, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LogIn, UserPlus, LogOut, ShoppingCart, Package, History, Loader2, Search, Edit, Trash2, AlertTriangle, PlusCircle, Building, LayoutDashboard, DollarSign, PackageSearch, TrendingUp, Camera, X, PlusSquare, BarChart3, Calendar, ArrowUp, ArrowDown, PieChart as PieIcon, Clock, UserCheck, BookUser, CheckCircle, CreditCard, Moon, Sun, Palette } from 'lucide-react';

// --- Firebase Yapılandırması ---
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

// --- Tema Renk Paletleri ---
const themes = {
  teal: { 100: '#ccfbf1', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 900: '#134e4a' },
  blue: { 100: '#dbeafe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
  rose: { 100: '#ffe4e6', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337' },
  indigo: { 100: '#e0e7ff', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81' },
};

// --- Tema Yönetimi (Context) ---
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
    const [mode, setMode] = useState(() => localStorage.getItem('theme_mode') || 'light');
    const [color, setColor] = useState(() => localStorage.getItem('theme_color') || 'teal');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mode);
        localStorage.setItem('theme_mode', mode);
    }, [mode]);

    useEffect(() => {
        const root = window.document.documentElement;
        const selectedTheme = themes[color] || themes.teal;
        for (const [shade, hex] of Object.entries(selectedTheme)) {
            root.style.setProperty(`--color-primary-${shade}`, hex);
        }
        localStorage.setItem('theme_color', color);
    }, [color]);

    const toggleMode = () => setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');

    return (
        <ThemeContext.Provider value={{ mode, toggleMode, color, setColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

// --- Yardımcı Fonksiyonlar ---
const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

// --- Ana Uygulama Bileşeni ---
export default function App() {
    return (
        <ThemeProvider>
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    body { font-family: 'Inter', sans-serif; }
                    .fade-in {
                        animation: fadeInAnimation ease 0.5s;
                        animation-iteration-count: 1;
                        animation-fill-mode: forwards;
                    }
                    @keyframes fadeInAnimation {
                        0% { opacity: 0; transform: translateY(10px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                    /* Custom Scrollbar Styling */
                    ::-webkit-scrollbar { width: 8px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    .dark ::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
                    .dark ::-webkit-scrollbar-thumb:hover { background: #5a6a82; }
                    .light ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                    .light ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}
            </style>
            <MainApp />
        </ThemeProvider>
    );
}

const MainApp = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { mode } = useContext(ThemeContext);

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
            <Toaster richColors position="top-right" theme={mode} />
            <div className="fade-in">
                {user ? <StockApp user={user} /> : <AuthPage />}
            </div>
        </>
    );
};


// --- Kimlik Doğrulama Sayfası ---
const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
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
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4 transition-colors">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <Building className="mx-auto h-12 w-auto text-[--color-primary-600]" />
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">Stok Takip Sistemine Hoş Geldiniz</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Lütfen hesabınıza giriş yapın veya yeni bir hesap oluşturun.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg">
                    <form onSubmit={handleAuthAction} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-posta Adresi</label>
                            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                        </div>
                         <div>
                            <label htmlFor="password"  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Şifre</label>
                            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-[--color-primary-600] text-white font-bold py-2.5 px-4 rounded-lg hover:bg-[--color-primary-700] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
                            {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
                            <span>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
                        </button>
                    </form>
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
                        {isLogin ? "Hesabınız yok mu?" : "Zaten bir hesabınız var mı?"}
                        <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-[--color-primary-600] hover:text-[--color-primary-500] ml-1">
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
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-200 transition-colors">
            <div className="container mx-auto p-4 md:p-6 max-w-7xl">
                <Header userEmail={user.email} />
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <InstantSaleSection products={products} productsPath={productsPath} salesPath={salesPath} />
                        <AddProductSection onAdd={handleAddOrUpdateProduct} products={products} />
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-lg">
                        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                        <div className="fade-in">
                            {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} />}
                            {activeTab === 'statistics' && <StatisticsPage sales={sales} />}
                            {activeTab === 'stock' && <ProductList products={filteredProducts} loading={loading.products} onUpdate={handleAddOrUpdateProduct} onDelete={handleDeleteProduct} productsPath={productsPath} salesPath={salesPath} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
                            {activeTab === 'history' && <SalesHistory sales={sales} loading={loading.sales} />}
                            {activeTab === 'credit' && <CreditPage sales={sales} salesPath={salesPath} loading={loading.sales} />}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- Child Components ---
const ThemeSwitcher = () => {
    const { color, setColor } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
  
    const themeOptions = [
      { name: 'teal', bg: '#14b8a6' },
      { name: 'blue', bg: '#3b82f6' },
      { name: 'rose', bg: '#f43f5e' },
      { name: 'indigo', bg: '#6366f1' },
    ];
  
    return (
      <div className="relative">
        <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            title="Temayı Değiştir"
        >
          <Palette size={20} />
        </button>
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2">
            {themeOptions.map(option => (
              <button
                key={option.name}
                onClick={() => { setColor(option.name); setIsOpen(false); }}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === option.name ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-[--color-primary-500]' : ''}`}
                style={{ backgroundColor: option.bg }}
                title={option.name.charAt(0).toUpperCase() + option.name.slice(1)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

const Header = ({ userEmail }) => {
    const { mode, toggleMode } = useContext(ThemeContext);
    return (
        <header className="text-center mb-6 md:mb-8 relative">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Stok Takip Sistemi</h1>
            <div className="flex items-center justify-center gap-4 mt-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">Giriş yapıldı: <span className="font-medium text-slate-700 dark:text-slate-300">{userEmail}</span></p>
                <button onClick={() => signOut(auth)} className="text-sm text-[--color-primary-600] dark:text-[--color-primary-500] hover:text-[--color-primary-700] dark:hover:text-[--color-primary-400] font-semibold flex items-center gap-1.5">
                    <LogOut size={14} /> Çıkış Yap
                </button>
            </div>
            <div className="absolute top-0 right-0 flex items-center gap-2">
                <ThemeSwitcher />
                <button onClick={toggleMode} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" title="Gece/Gündüz Modu">
                    {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>
        </header>
    );
};

const InstantSaleSection = ({ products, productsPath, salesPath }) => {
    const [barcode, setBarcode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [modalType, setModalType] = useState(null);
    const inputRef = useRef(null);

    const processTransaction = useCallback(async (product, type, paymentMethod = null) => {
        if (!product) {
            toast.error("İşlem için ürün bulunamadı.");
            return;
        }
        if (product.stock <= 0) {
            toast.warning(`${product.name} için stok tükendi!`);
            return;
        }

        const productRef = doc(db, productsPath, product.id);
        const saleRef = doc(collection(db, salesPath));
        const batch = writeBatch(db);

        batch.update(productRef, { stock: increment(-1) });
        
        const saleData = {
            type,
            saleDate: serverTimestamp(),
            total: type === 'personnel' ? 0 : product.salePrice,
            items: [{ productId: product.id, name: product.name, quantity: 1, price: product.salePrice }]
        };

        if (type === 'sale') {
            saleData.paymentMethod = paymentMethod;
        } else if (type === 'credit') {
            saleData.status = 'unpaid';
        }

        batch.set(saleRef, saleData);

        await toast.promise(batch.commit(), {
            loading: 'İşlem yapılıyor...',
            success: `${product.name} işlemi başarılı!`,
            error: 'İşlem sırasında bir hata oluştu.'
        });
        
        setBarcode('');
        setModalType(null);
        if (inputRef.current) inputRef.current.focus();

    }, [productsPath, salesPath]);

    const handleCashSale = (e) => {
        e.preventDefault();
        if (!barcode) {
            toast.warning("Lütfen bir barkod okutun veya girin.");
            return;
        }
        const product = products.find(p => p.barcode === barcode);
        if (!product) {
            toast.error("Bu barkoda sahip ürün bulunamadı.");
            return;
        }
        processTransaction(product, 'sale', 'nakit');
    };

    const onScanSuccessForCash = (decodedText) => { 
        setShowScanner(false); 
        setBarcode(decodedText);
        setTimeout(() => {
            if (inputRef.current) {
                const form = inputRef.current.closest('form');
                if (form) form.requestSubmit();
            }
        }, 100);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg flex flex-col gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200"><ShoppingCart size={22} /> Hızlı İşlemler</h2>
            
            <form onSubmit={handleCashSale}>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-3">
                    <label htmlFor="barcode-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400">Nakit Satış (Barkod Okut/Gir + Enter)</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input ref={inputRef} autoFocus id="barcode-input" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Nakit satış için okutun..." className="block w-full border-0 bg-transparent p-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0 sm:text-sm"/>
                        <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-[--color-primary-600] dark:hover:text-[--color-primary-500]" title="Kamera ile Tara"> <Camera size={20} /> </button>
                    </div>
                </div>
            </form>
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-3">Veya Diğer İşlem Türünü Seçin:</p>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleCashSale} className="w-full bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                        <DollarSign size={18} /> Nakit Sat
                    </button>
                    <button onClick={() => setModalType('kart')} className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                        <CreditCard size={18} /> Kartla Sat
                    </button>
                    <button onClick={() => setModalType('veresiye')} className="w-full bg-red-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                        <BookUser size={18} /> Veresiye
                    </button>
                    <button onClick={() => setModalType('personel')} className="w-full bg-yellow-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2">
                        <UserCheck size={18} /> Personel
                    </button>
                </div>
            </div>
            {showScanner && <CameraScanner onScanSuccess={onScanSuccessForCash} onClose={() => setShowScanner(false)} />}
            
            {modalType && (
                <TransactionModal 
                    type={modalType}
                    onClose={() => setModalType(null)}
                    products={products}
                    processTransaction={processTransaction}
                />
            )}
        </div>
    );
};

const TransactionModal = ({ type, onClose, products, processTransaction }) => {
    const [barcode, setBarcode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const inputRef = useRef(null);

    const typeConfig = useMemo(() => ({
        kart: { title: 'Kartla Satış', icon: CreditCard, color: 'blue-600' },
        veresiye: { title: 'Veresiye Kaydı', icon: BookUser, color: 'red-600' },
        personel: { title: 'Personel Kullanımı', icon: UserCheck, color: 'yellow-500' }
    }), [])[type];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!barcode) {
            toast.warning("Lütfen bir barkod okutun veya girin.");
            return;
        }
        const product = products.find(p => p.barcode === barcode);
        if (!product) {
            toast.error("Bu barkoda sahip ürün bulunamadı.");
            setBarcode(''); 
            return;
        }

        if (type === 'kart') {
            processTransaction(product, 'sale', 'kart');
        } else if (type === 'veresiye') {
            processTransaction(product, 'credit');
        } else if (type === 'personel') {
            processTransaction(product, 'personnel');
        }
    };
    
    const onScanSuccess = (decodedText) => {
        setBarcode(decodedText);
        setShowScanner(false);
        setTimeout(() => {
            if (inputRef.current) {
                const form = inputRef.current.closest('form');
                if (form) form.requestSubmit();
            }
        }, 100);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className={`text-xl font-semibold mb-4 flex items-center gap-2 text-${typeConfig.color}`}>
                    <typeConfig.icon size={22} /> {typeConfig.title}
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-3">
                        <label htmlFor="modal-barcode-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400">Ürün Barkodu</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input 
                                ref={inputRef} 
                                autoFocus 
                                id="modal-barcode-input" 
                                type="text" 
                                value={barcode} 
                                onChange={(e) => setBarcode(e.target.value)} 
                                placeholder="Barkodu okutun veya girin..." 
                                className="block w-full border-0 bg-transparent p-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0 sm:text-sm"
                            />
                            <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-[--color-primary-600] dark:hover:text-[--color-primary-500]" title="Kamera ile Tara"> <Camera size={20} /> </button>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 font-semibold text-sm">İptal</button>
                        <button type="submit" className={`px-4 py-2 bg-${typeConfig.color} text-white rounded-lg hover:bg-opacity-90 font-semibold text-sm`}>İşlemi Tamamla</button>
                    </div>
                </form>
                {showScanner && <CameraScanner onScanSuccess={onScanSuccess} onClose={() => setShowScanner(false)} />}
            </div>
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

    return ( <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg"> <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200"><Package size={22} /> Ürün Yönetimi</h2> <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Ürün Adı" id="name" required>
            <input type="text" name="name" id="name" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Örn: Kutu Süt"/>
        </FormInput>
        <FormInput label="Barkod Numarası" id="barcode" required>
            <div className="flex items-center gap-2">
                <input type="text" name="barcode" id="barcode" value={product.barcode} onChange={(e) => setProduct({...product, barcode: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Okutun veya manuel girin"/>
                <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-[--color-primary-600] dark:hover:text-[--color-primary-500]" title="Kamera ile Tara">
                    <Camera size={20} />
                </button>
            </div>
        </FormInput>
        <FormInput label="Stok Adedi" id="stock" required><input type="number" name="stock" id="stock" value={product.stock} onChange={(e) => setProduct({...product, stock: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="0" min="0"/></FormInput>
        <div className="grid grid-cols-2 gap-4">
            <FormInput label="Alış Fiyatı (₺)" id="purchasePrice" required><input type="number" name="purchasePrice" id="purchasePrice" value={product.purchasePrice} onChange={(e) => setProduct({...product, purchasePrice: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="0.00" min="0" step="0.01"/></FormInput>
            <FormInput label="Satış Fiyatı (₺)" id="salePrice" required><input type="number" name="salePrice" id="salePrice" value={product.salePrice} onChange={(e) => setProduct({...product, salePrice: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="0.00" min="0" step="0.01"/></FormInput>
        </div>
        <FormInput label="Kategori" id="category"><input type="text" name="category" id="category" value={product.category} onChange={(e) => setProduct({...product, category: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Örn: İçecek"/></FormInput>
        <button type="submit" className="w-full bg-[--color-primary-600] text-white font-bold py-2.5 px-4 rounded-lg hover:bg-[--color-primary-700] transition-all duration-300 flex items-center justify-center gap-2"> <PlusCircle size={20} /> <span>Ürünü Ekle / Güncelle</span> </button>
    </form>
    {showScanner && <CameraScanner onScanSuccess={onBarcodeScan} onClose={() => setShowScanner(false)} />}
    </div> );
};

const Tabs = ({ activeTab, setActiveTab }) => { const tabData = [ { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }, { id: 'statistics', label: 'İstatistikler', icon: BarChart3 }, { id: 'stock', label: 'Stok Listesi', icon: Package }, { id: 'credit', label: 'Veresiye', icon: BookUser }, { id: 'history', label: 'Satış Geçmişi', icon: History } ]; return ( <div className="border-b border-slate-200 dark:border-slate-700 mb-4"> <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs"> {tabData.map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap py-2 px-2 sm:px-3 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id ? 'border-teal-500 text-teal-600 dark:text-teal-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}> <tab.icon size={16} /><span>{tab.label}</span> </button> ))} </nav> </div> ); };

const Dashboard = ({ products, sales }) => {
    const [timePeriod, setTimePeriod] = useState('daily');
    const periodLabels = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' };

    const { periodRevenue, periodCashRevenue, periodCardRevenue, totalStockValue, lowStockProducts } = useMemo(() => {
        const now = new Date();
        let startDate;

        switch (timePeriod) {
            case 'weekly':
                const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'daily':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
        }

        const periodSales = sales.filter(s => s.saleDate && s.saleDate.toDate() >= startDate && (s.type === 'sale' || (s.type === 'credit' && s.status === 'paid')));
        
        const periodRevenue = periodSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const periodCashRevenue = periodSales.filter(s => s.paymentMethod === 'nakit').reduce((sum, s) => sum + (s.total || 0), 0);
        const periodCardRevenue = periodSales.filter(s => s.paymentMethod === 'kart').reduce((sum, s) => sum + (s.total || 0), 0);
        
        const totalStockValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);
        const lowStockProducts = products.filter(p => p.stock <= 5).sort((a,b) => a.stock - b.stock);

        return { periodRevenue, periodCashRevenue, periodCardRevenue, totalStockValue, lowStockProducts };
    }, [products, sales, timePeriod]);

    return ( 
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Genel Bakış</h3>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                    {Object.keys(periodLabels).map(period => (
                        <button key={period} onClick={() => setTimePeriod(period)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timePeriod === period ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-500 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                            {periodLabels[period]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> 
                <StatCard title={`${periodLabels[timePeriod]} Toplam Ciro`} value={formatCurrency(periodRevenue)} icon={TrendingUp} />
                <StatCard title={`${periodLabels[timePeriod]} Nakit Ciro`} value={formatCurrency(periodCashRevenue)} icon={DollarSign} />
                <StatCard title={`${periodLabels[timePeriod]} Kart Ciro`} value={formatCurrency(periodCardRevenue)} icon={CreditCard} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200"><Package size={18}/> Toplam Stok Değeri</h3>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalStockValue)}</p>
                </div>
                 <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200"><PackageSearch size={18}/> Stoğu Azalan Ürünler</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center text-sm">
                                <span className="truncate text-slate-700 dark:text-slate-300">{p.name}</span>
                                <span className="font-bold text-red-600">{p.stock} adet</span>
                            </div>
                        )) : <p className="text-sm text-slate-500 dark:text-slate-400">Kritik stokta ürün yok.</p>}
                    </div>
                </div>
            </div>
        </div> 
    );
};

const StatisticsPage = ({ sales }) => {
    const [timePeriod, setTimePeriod] = useState('weekly');
    const { mode } = useContext(ThemeContext);

    const {
        currentPeriod,
        previousPeriod,
        revenueByProduct,
        personnelUsageData,
        paymentMethodData,
        busiestDays30d,
        busiestHours30d,
        topSellingProducts,
        topSellingByQuantity
    } = useMemo(() => {
        const now = new Date();
        let currentStart, currentEnd, previousStart, previousEnd;

        // Zaman periyodu seçimi
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

        // Filtreleme ve hesaplama yardımcıları
        const filterSalesByDate = (salesArray, start, end) => salesArray.filter(s => s.saleDate && s.saleDate.toDate() >= start && s.saleDate.toDate() < end);
        const salesToConsider = sales.filter(s => s.type === 'sale' || (s.type === 'credit' && s.status === 'paid'));
        const getSum = (filteredSales) => filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
        
        const currentSales = filterSalesByDate(salesToConsider, currentStart, currentEnd);
        const previousSales = filterSalesByDate(salesToConsider, previousStart, previousEnd);
        const currentPersonnelUsage = filterSalesByDate(sales.filter(s => s.type === 'personnel'), currentStart, currentEnd);

        // --- 30 GÜNLÜK ANALİZ ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const last30DaysSales = filterSalesByDate(salesToConsider, thirtyDaysAgo, now);

        const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
        const salesByDay30d = new Array(7).fill(0).map((_, i) => ({ name: dayNames[i], Ciro: 0 }));
        const salesByHour30d = new Array(24).fill(0).map((_, i) => ({ name: `${String(i).padStart(2, '0')}:00`, Ciro: 0 }));

        last30DaysSales.forEach(s => {
            const saleDate = s.saleDate.toDate();
            const dayIndex = saleDate.getDay() === 0 ? 6 : saleDate.getDay() - 1;
            if (salesByDay30d[dayIndex]) salesByDay30d[dayIndex].Ciro += s.total;
            if (salesByHour30d[saleDate.getHours()]) salesByHour30d[saleDate.getHours()].Ciro += s.total;
        });

        // --- MEVCUT PERİYOT ANALİZİ (CİRO VE ADET) ---
        const productRevenue = {};
        const productQuantities = {};
        const paymentMethods = { nakit: 0, kart: 0 };
        currentSales.forEach(s => {
            if (s.paymentMethod === 'nakit') paymentMethods.nakit += s.total;
            if (s.paymentMethod === 'kart') paymentMethods.kart += s.total;
            s.items.forEach(item => {
                productRevenue[item.name] = (productRevenue[item.name] || 0) + (item.price * item.quantity);
                productQuantities[item.name] = (productQuantities[item.name] || 0) + item.quantity;
            });
        });
        
        const sortedProducts = Object.entries(productRevenue).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const topSellingProducts = sortedProducts.slice(0, 5);
        
        const topSellingByQuantity = Object.entries(productQuantities)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity);

        const otherProductsValue = sortedProducts.slice(5).reduce((acc, p) => acc + p.value, 0);
        const revenueByProductData = [...topSellingProducts];
        if (otherProductsValue > 0) {
            revenueByProductData.push({ name: 'Diğer', value: otherProductsValue });
        }

        const usageByProduct = {};
        currentPersonnelUsage.forEach(sale => {
            sale.items.forEach(item => {
                usageByProduct[item.name] = (usageByProduct[item.name] || 0) + item.quantity;
            });
        });
        const personnelUsageData = Object.entries(usageByProduct).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);

        return {
            currentPeriod: { revenue: getSum(currentSales) },
            previousPeriod: { revenue: getSum(previousSales) },
            revenueByProduct: revenueByProductData,
            personnelUsageData,
            paymentMethodData: [ {name: 'Nakit', value: paymentMethods.nakit}, {name: 'Kart', value: paymentMethods.kart} ],
            busiestDays30d: salesByDay30d,
            busiestHours30d: salesByHour30d.filter(h => h.Ciro > 0),
            topSellingProducts: topSellingProducts,
            topSellingByQuantity: topSellingByQuantity
        };
    }, [sales, timePeriod]);
    
    const PIE_COLORS = ['#14b8a6', '#0ea5e9', '#f97316', '#ec4899', '#8b5cf6', '#a8a29e'];
    const periodLabels = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' };
    const tickColor = mode === 'dark' ? '#94a3b8' : '#64748b';
    const gridColor = mode === 'dark' ? '#334155' : '#e2e8f0';


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">İstatistikler</h3>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                    {Object.keys(periodLabels).map(period => (
                        <button key={period} onClick={() => setTimePeriod(period)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timePeriod === period ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-500 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                            {periodLabels[period]}
                        </button>
                    ))}
                </div>
            </div>
            
            <ComparisonCard title={`${periodLabels[timePeriod]} Ciro`} current={currentPeriod.revenue} previous={previousPeriod.revenue} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="En Yoğun Günler (Son 30 Gün)" icon={Calendar}>
                    <BarChart data={busiestDays30d} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: tickColor}} />
                        <YAxis tickFormatter={(value) => formatCurrency(value).replace('₺','')} tick={{fontSize: 10, fill: tickColor}}/>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: mode === 'dark' ? '#334155' : '#e2e8f0'
                            }}
                            formatter={(value) => [formatCurrency(value), 'Ciro']}
                        />
                        <Bar dataKey="Ciro" fill="#8b5cf6" />
                    </BarChart>
                </ChartContainer>

                 <ChartContainer title="En Yoğun Saatler (Son 30 Gün)" icon={Clock}>
                    <BarChart data={busiestHours30d} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: tickColor}} angle={-45} textAnchor="end" height={40} interval={0} />
                        <YAxis tickFormatter={(value) => formatCurrency(value).replace('₺','')} tick={{fontSize: 10, fill: tickColor}}/>
                        <Tooltip
                             contentStyle={{
                                backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: mode === 'dark' ? '#334155' : '#e2e8f0'
                            }}
                            formatter={(value) => [formatCurrency(value), 'Ciro']}
                        />
                        <Bar dataKey="Ciro" fill="#ec4899" />
                    </BarChart>
                </ChartContainer>
            </div>
            
            <ChartContainer title={`En Çok Satan Ürünler - Ciro (${periodLabels[timePeriod]})`} icon={TrendingUp}>
                {topSellingProducts.length > 0 ? (
                    <BarChart data={topSellingProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 12, width: 110, fill: tickColor}} interval={0} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: mode === 'dark' ? '#334155' : '#e2e8f0'
                            }}
                            formatter={(value) => [formatCurrency(value), 'Ciro']}
                        />
                        <Bar dataKey="value" name="Ciro" fill="#f97316" background={{ fill: mode === 'dark' ? '#334155' : '#eee' }} label={{ position: 'right', formatter: (value) => formatCurrency(value), fontSize: 11, fill: mode === 'dark' ? '#f1f5f9' : '#333' }} />
                    </BarChart>
                ) : (
                    <EmptyState icon={<PackageSearch size={30}/>} message="Bu periyotta gösterilecek ürün verisi yok." />
                )}
            </ChartContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="Ödeme Yöntemi Dağılımı" icon={CreditCard}>
                     <PieChart>
                        <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {paymentMethodData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6'][index % 2]} /> ))}
                        </Pie>
                        <Tooltip
                             contentStyle={{
                                backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: mode === 'dark' ? '#334155' : '#e2e8f0'
                            }}
                            formatter={(value) => formatCurrency(value)}
                        />
                        <Legend wrapperStyle={{color: tickColor}}/>
                    </PieChart>
                </ChartContainer>
                <ChartContainer title="Ürün Ciro Dağılımı" icon={PieIcon}>
                    <PieChart>
                        <Pie data={revenueByProduct} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                            {revenueByProduct.map((entry, index) => ( <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} /> ))}
                        </Pie>
                        <Tooltip
                             contentStyle={{
                                backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: mode === 'dark' ? '#334155' : '#e2e8f0'
                            }}
                            formatter={(value) => formatCurrency(value)}
                        />
                        <Legend wrapperStyle={{color: tickColor}}/>
                    </PieChart>
                </ChartContainer>
            </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200"><PackageSearch size={18}/> En Çok Satanlar - Adet ({periodLabels[timePeriod]})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {topSellingByQuantity.length > 0 ? topSellingByQuantity.map(item => (
                            <div key={item.name} className="flex justify-between items-center text-sm">
                                <span className="truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                                <span className="font-bold text-teal-600 dark:text-teal-400">{item.quantity} adet</span>
                            </div>
                        )) : <p className="text-sm text-slate-500 dark:text-slate-400">Bu dönemde satış verisi yok.</p>}
                    </div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200"><UserCheck size={18}/> Personel Kullanım Özeti ({periodLabels[timePeriod]})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {personnelUsageData.length > 0 ? personnelUsageData.map(item => (
                            <div key={item.name} className="flex justify-between items-center text-sm">
                                <span className="truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                                <span className="font-bold text-yellow-600 dark:text-yellow-400">{item.quantity} adet</span>
                            </div>
                        )) : <p className="text-sm text-slate-500 dark:text-slate-400">Bu dönemde personel kullanımı kaydedilmedi.</p>}
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

    const handleCreditSale = useCallback(async (product) => {
        const productRef = doc(db, productsPath, product.id);
        try {
            if (product.stock < 1) {
                toast.error(`Yetersiz stok!`);
                return;
            }
            const batch = writeBatch(db);
            batch.update(productRef, { stock: increment(-1) });
            const saleRef = doc(collection(db, salesPath));
            batch.set(saleRef, { 
                type: 'credit', 
                status: 'unpaid',
                saleDate: serverTimestamp(), 
                total: product.salePrice, 
                items: [{ productId: product.id, name: product.name, quantity: 1, price: product.salePrice }] 
            });
            await batch.commit();
            toast.success(`${product.name} veresiye olarak satıldı.`);
        } catch (error) { toast.error("Veresiye satışı sırasında bir hata oluştu."); }
    }, [productsPath, salesPath]);

    const handleSale = useCallback(async (product, paymentMethod) => {
        if (product.stock <= 0) {
            toast.warning(`${product.name} için stok tükendi!`);
            return;
        }
        const productRef = doc(db, productsPath, product.id);
        const saleRef = doc(collection(db, salesPath));
        const batch = writeBatch(db);
        batch.update(productRef, { stock: increment(-1) });
        const saleData = {
            type: 'sale',
            paymentMethod: paymentMethod,
            saleDate: serverTimestamp(),
            total: product.salePrice,
            items: [{ productId: product.id, name: product.name, quantity: 1, price: product.salePrice }]
        };
        batch.set(saleRef, saleData);
        await toast.promise(batch.commit(), {
            loading: 'Satış işleniyor...',
            success: `${product.name} satışı başarılı!`,
            error: 'Satış sırasında bir hata oluştu.'
        });
    }, [productsPath, salesPath]);

    if (loading) return <LoadingSpinner />;
    if (products.length === 0 && !searchTerm) return <EmptyState icon={<Package size={40}/>} message="Henüz ürün eklenmemiş." description="Başlamak için sol taraftaki 'Ürün Yönetimi' panelini kullanabilirsiniz." />;
    return ( <div className="space-y-3">
        <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} /> <input type="text" placeholder="Ürün adı veya barkod ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /> </div>
        {products.length === 0 && searchTerm && ( <EmptyState icon={<Search size={40}/>} message="Arama Sonucu Bulunamadı" description={`'${searchTerm}' için bir sonuç bulunamadı. Lütfen farklı bir anahtar kelime deneyin.`} /> )}
        <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2 pb-4"> {products.map(p => (
            <div key={p.id} className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center">{p.name} {p.stock <= 5 && <AlertTriangle size={14} className="ml-2 text-red-500"/>}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Barkod: {p.barcode} | Kategori: {p.category || 'Yok'}</p>
                        <p className="text-xs text-green-700 dark:text-green-500 font-medium">Satış: {formatCurrency(p.salePrice)}</p>
                    </div>
                    <div className="text-right mx-4 w-16 flex-shrink-0">
                        <p className={`font-bold text-lg ${p.stock > 10 ? 'text-green-600 dark:text-green-400' : p.stock > 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-500'}`}>{p.stock}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">adet</p>
                    </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-600 mt-2 pt-2 flex items-center justify-end space-x-1 flex-wrap">
                    <button onClick={() => handleSale(p, 'nakit')} className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md" title="Nakit Sat"><DollarSign size={16} /></button>
                    <button onClick={() => handleSale(p, 'kart')} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md" title="Kartla Sat"><CreditCard size={16} /></button>
                    <div className="border-l border-slate-300 dark:border-slate-600 h-6 mx-1"></div>
                    <button onClick={() => handleCreditSale(p)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md" title="Veresiye Sat"><BookUser size={16} /></button>
                    <button onClick={() => handlePersonnelUse(p, 1)} className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded-md" title="Personel Kullanımı"><UserCheck size={16} /></button>
                    <button onClick={() => setStockModalProduct(p)} className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-md" title="Stok Ekle"><PlusSquare size={16} /></button>
                    <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md" title="Düzenle"><Edit size={16} /></button>
                    <button onClick={() => toast(`"${p.name}" ürününü silmek istediğinize emin misiniz?`, { action: { label: 'Evet, Sil', onClick: () => onDelete(p.id, p.name) }, cancel: { label: 'İptal' } })} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md" title="Sil"><Trash2 size={16} /></button>
                </div>
            </div>
        ))} </div>
        {editingProduct && ( <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingProduct(null)}> <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Ürünü Düzenle</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-3">
                <FormInput label="Ürün Adı" id="edit-name"><input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></FormInput>
                <FormInput label="Stok Adedi" id="edit-stock"><input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></FormInput>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Alış Fiyatı (₺)" id="edit-purchasePrice"><input type="number" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></FormInput>
                    <FormInput label="Satış Fiyatı (₺)" id="edit-salePrice"><input type="number" value={editingProduct.salePrice} onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></FormInput>
                </div>
                <FormInput label="Kategori" id="edit-category"><input value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" /></FormInput>
                <div className="flex justify-end space-x-3 mt-2"> <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500">İptal</button> <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Kaydet</button> </div>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Stok Ekle: <span className="font-bold text-teal-600 dark:text-teal-500">{product.name}</span></h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Eklenecek Miktar" id="stock-amount">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="0"
                            min="1"
                            autoFocus
                            required
                        />
                    </FormInput>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 font-semibold text-sm">İptal</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm">Ekle</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CreditPage = ({ sales, salesPath, loading }) => {
    const unpaidCredits = useMemo(() => sales.filter(s => s.type === 'credit' && s.status === 'unpaid'), [sales]);

    const handleMarkAsPaid = useCallback(async (saleId) => {
        const saleRef = doc(db, salesPath, saleId);
        await toast.promise(
            updateDoc(saleRef, {
                status: 'paid',
                paymentMethod: 'nakit',
                paidDate: serverTimestamp()
            }),
            {
                loading: 'Ödeme kaydediliyor...',
                success: 'Ödeme başarıyla kaydedildi!',
                error: 'İşlem sırasında bir hata oluştu.'
            }
        );
    }, [salesPath]);

    if (loading) return <LoadingSpinner />;
    if (unpaidCredits.length === 0) return <EmptyState icon={<BookUser size={40}/>} message="Ödenmemiş veresiye kaydı bulunmuyor." />;
    
    return (
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2 pb-4">
            {unpaidCredits.map(s => (
                <div key={s.id} className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{s.items[0].name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{s.saleDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '...'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(s.total)}</p>
                            <button onClick={() => handleMarkAsPaid(s.id)} className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md" title="Ödeme Alındı Olarak İşaretle">
                                <CheckCircle size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


const SalesHistory = ({ sales, loading }) => {
    if (loading) return <LoadingSpinner />;
    if (!sales || sales.length === 0) return <EmptyState icon={<History size={40}/>} message="Henüz işlem yapılmamış." />;
    
    const getStatusBadge = (s) => {
        switch(s.type) {
            case 'sale': 
                const method = s.paymentMethod === 'kart' ? 'KART' : 'NAKİT';
                const color = s.paymentMethod === 'kart' ? 'bg-blue-600' : 'bg-green-600';
                return <span className={`text-xs font-semibold text-white ${color} px-2 py-0.5 rounded-full`}>SATIŞ ({method})</span>;
            case 'personnel': return <span className="text-xs font-semibold text-black bg-yellow-400 px-2 py-0.5 rounded-full">PERSONEL</span>;
            case 'credit': 
                return s.status === 'paid' 
                    ? <span className="text-xs font-semibold text-white bg-teal-600 px-2 py-0.5 rounded-full">ÖDENMİŞ VERESİYE</span>
                    : <span className="text-xs font-semibold text-white bg-red-600 px-2 py-0.5 rounded-full">ÖDENMEDİ</span>;
            default: return null;
        }
    };

    return (
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2 pb-4">
            {sales.map(s => (
                <div key={s.id} className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{s.saleDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '...'}</p>
                            {getStatusBadge(s)}
                        </div>
                        <p className="text-lg font-bold text-green-700 dark:text-green-400">{s.type !== 'personnel' ? formatCurrency(s.total) : ''}</p>
                    </div>
                    <div className="mt-2 border-t border-slate-200 dark:border-slate-600 pt-2 space-y-1">
                        {s.items && Array.isArray(s.items) ? (
                            s.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <p className="text-slate-700 dark:text-slate-300">
                                        <span className="font-medium">{item.quantity}x</span> {item.name}
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400">{s.type !== 'personnel' ? formatCurrency(item.price * item.quantity) : ''}</p>
                                </div>
                            ))
                        ) : null }
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
        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <div className="flex items-end justify-between mt-2">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(current)}</p>
                <div className={`flex items-center text-sm font-semibold ${isIncrease ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isIncrease ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    <span>{percentageChange.toFixed(1)}%</span>
                </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Önceki dönem: {formatCurrency(previous)}</p>
        </div>
    );
};

const ChartContainer = ({ title, icon: Icon, children }) => (
    <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg flex flex-col">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200"><Icon size={18}/> {title}</h3>
        <div className="flex-grow" style={{ width: '100%', height: 240 }}>
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
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}{required && <span className="text-red-500"> *</span>}
        </label>
        {children}
    </div>
);

const StatCard = ({ title, value, icon: Icon }) => ( <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg flex items-center gap-4"> <div className="bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 p-3 rounded-full"> <Icon size={24} /> </div> <div> <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p> <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</p> </div> </div> );
const LoadingSpinner = ({ fullPage = false, message = '' }) => ( <div className={`flex flex-col justify-center items-center ${fullPage ? 'h-screen bg-slate-100 dark:bg-slate-900' : 'h-full py-10'}`}> <Loader2 className="w-10 h-10 text-teal-600 dark:text-teal-500 animate-spin" /> {message && <p className="mt-4 text-slate-600 dark:text-slate-400">{message}</p>} </div> );
const EmptyState = ({ icon, message, description }) => ( <div className="text-center py-10 px-4 flex flex-col items-center justify-center h-full"> <div className="text-slate-400 dark:text-slate-500 mb-3">{icon}</div> <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">{message}</h3> {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>} </div> );
