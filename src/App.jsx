import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, increment, addDoc, serverTimestamp, query, orderBy, writeBatch, where, getDocs } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
    Building, Package, Zap, BarChartHorizontal, FileOutput, CheckCircle, ChevronDown, 
    LogIn, UserPlus, LogOut, ShoppingCart, History, Loader2, Search, Edit, Trash2, 
    AlertTriangle, PlusCircle, LayoutDashboard, DollarSign, PackageSearch, TrendingUp, 
    Camera, X, PlusSquare, BarChart3, Calendar, ArrowUp, ArrowDown, PieChart as PieIcon, 
    Clock, UserCheck, BookUser, CreditCard, Download, Undo2, Settings, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyAb0VoKLRJKKgst9DVC_cb2ZU5wchfdTIM",
  authDomain: "stok-takip-uygulamam-5e4a5.firebaseapp.com",
  projectId: "stok-takip-uygulamam-5e4a5",
  storageBucket: "stok-takip-uygulamam-5e4a5.firebasestorage.app",
  messagingSenderId: "393027640266",
  appId: "1:393027640266:web:020f72a9a23f3fd5fa4d33",
  measurementId: "G-SZ4DSQK66C"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization failed:", e);
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        toast.error("Firebase yapılandırması eksik. Lütfen kod içerisindeki yerel geliştirme ayarlarını yapın.");
    }
}

// --- Helper Functions ---
const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

// --- Contexts ---
const AuthContext = createContext(null);
const ThemeContext = createContext();
const PageContext = createContext();

// --- Providers ---
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authIsReady, setAuthIsReady] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthIsReady(true);
        });

        const attemptInitialSignIn = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                try {
                    if (!auth.currentUser) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    }
                } catch (error) {
                    console.error("Custom token ile giriş başarısız:", error);
                    toast.error("Oturum doğrulanırken bir hata oluştu.");
                    setAuthIsReady(true);
                }
            } else {
                 setAuthIsReady(true);
            }
        };
        
        attemptInitialSignIn();

        return () => unsubscribe();
    }, []);

    const value = { user, authIsReady };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => useContext(AuthContext);

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');
    const [palette, setPalette] = useState('teal');

    const colorPalettes = useMemo(() => ({
        teal: { name: 'Yeşil', primary100: '#ccfbf1', primary500: '#14b8a6', primary600: '#0d9488', primary700: '#0f766e', darkPrimary100: '#115e59' },
        blue: { name: 'Mavi', primary100: '#dbeafe', primary500: '#3b82f6', primary600: '#2563eb', primary700: '#1d4ed8', darkPrimary100: '#1e3a8a' },
        rose: { name: 'Gül', primary100: '#ffe4e6', primary500: '#f43f5e', primary600: '#e11d48', primary700: '#be123c', darkPrimary100: '#881337' },
        indigo: { name: 'Çivit', primary100: '#e0e7ff', primary500: '#6366f1', primary600: '#4f46e5', primary700: '#4338ca', darkPrimary100: '#312e81' },
    }), []);

    const applyTheme = useCallback((t, p) => {
        if (!t || !p) return;
        document.documentElement.className = t;
        const selectedPalette = colorPalettes[p];
        if (!selectedPalette) return;
        const root = document.documentElement;
        root.style.setProperty('--primary-100', selectedPalette.primary100);
        root.style.setProperty('--primary-500', selectedPalette.primary500);
        root.style.setProperty('--primary-600', selectedPalette.primary600);
        root.style.setProperty('--primary-700', selectedPalette.primary700);
        root.style.setProperty('--dark-primary-100', selectedPalette.darkPrimary100);
    }, [colorPalettes]);

    useEffect(() => {
        const localTheme = localStorage.getItem('theme') || 'light';
        const localPalette = localStorage.getItem('palette') || 'teal';
        setTheme(localTheme);
        setPalette(localPalette);
        applyTheme(localTheme, localPalette);
    }, [applyTheme]);
    
    const persistSettings = useCallback((t, p) => {
        localStorage.setItem('theme', t);
        localStorage.setItem('palette', p);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, palette, setTheme, setPalette, applyTheme, persistSettings, colorPalettes }}>
            {children}
        </ThemeContext.Provider>
    );
};

const useTheme = () => useContext(ThemeContext);

const PageProvider = ({ children }) => {
    const [page, setPage] = useState('loading'); // loading, landing, login, app
    const value = { page, setPage };
    return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};

const usePage = () => useContext(PageContext);

// --- Main App Component ---
export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <PageProvider>
                    <Main />
                </PageProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

const Main = () => {
    const { user, authIsReady } = useAuth();
    const { page, setPage } = usePage();
    const { theme } = useTheme();

    useEffect(() => {
        if (authIsReady) {
            if (user) {
                setPage('app');
            } else {
                setPage('landing');
            }
        }
    }, [user, authIsReady, setPage]);

    const renderPage = () => {
        if (!authIsReady) {
            return <LoadingSpinner fullPage={true} message="Oturum durumu kontrol ediliyor..." />;
        }
        switch (page) {
            case 'app':
                return <StockApp />;
            case 'login':
                return <AuthPage />;
            case 'landing':
                return <LandingPage />;
            case 'loading':
            default:
                return <LoadingSpinner fullPage={true} />;
        }
    };

    return (
        <>
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    body { 
                        font-family: 'Inter', sans-serif; 
                        background-color: var(--bg-color);
                        color: var(--text-color);
                        transition: background-color 0.3s ease, color 0.3s ease;
                    }
                    :root {
                        --bg-color: #ffffff;
                        --surface-color: #f8fafc;
                        --surface-hover-color: #f1f5f9;
                        --border-color: #e2e8f0;
                        --text-color: #0f172a;
                        --text-muted-color: #64748b;
                    }
                    .dark {
                        --bg-color: #0f172a;
                        --surface-color: #1e293b;
                        --surface-hover-color: #334155;
                        --border-color: #334155;
                        --text-color: #e2e8f0;
                        --text-muted-color: #94a3b8;
                    }
                    .dark { --primary-100: var(--dark-primary-100); }
                    .recharts-tooltip-wrapper { outline: none !important; }
                    .recharts-default-tooltip {
                        background-color: var(--surface-color) !important;
                        border-color: var(--border-color) !important;
                        border-radius: 0.75rem !important;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                    }
                    .recharts-tooltip-label { color: var(--text-color) !important; }
                    ::-webkit-scrollbar { width: 8px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
                    ::-webkit-scrollbar-thumb:hover { background: #64748b; }
                `}
            </style>
            <Toaster richColors position="top-right" theme={theme} />
            <AnimatePresence mode="wait">
                <motion.div
                    key={page}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {renderPage()}
                </motion.div>
            </AnimatePresence>
        </>
    );
};

// --- Landing Page Component ---
const HowItWorksSection = () => {
    const steps = [
        { icon: <Package size={32} />, title: "1. Ürünlerini Ekle", description: "Stoktaki ürünlerinizi barkod, fiyat ve kategori bilgileriyle sisteme kaydedin." },
        { icon: <ShoppingCart size={32} />, title: "2. Satışını Yap", description: "Hızlı satış ekranından barkod okutarak veya ürün seçerek saniyeler içinde satışınızı tamamlayın." },
        { icon: <BarChart3 size={32} />, title: "3. Raporları İncele", description: "Ciro, kâr ve en çok satan ürünler gibi verilerle işletmenizin performansını anlık olarak takip edin." }
    ];
    return (
        <div className="bg-[var(--surface-color)] py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-[var(--primary-600)]">3 Basit Adım</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-color)] sm:text-4xl">Nasıl Çalışır?</p>
                </div>
                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                        {steps.map(step => (
                            <div key={step.title} className="flex flex-col items-center text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--primary-600)] text-white mb-6">
                                    {step.icon}
                                </div>
                                <dt className="text-xl font-semibold leading-7 text-[var(--text-color)]">{step.title}</dt>
                                <dd className="mt-2 text-base leading-7 text-[var(--text-muted-color)]">{step.description}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </div>
    );
};

const LandingPage = () => {
    const { setPage } = usePage();
    const features = [
        { icon: <Package size={24} />, title: "Kolay Stok Yönetimi", description: "Ürünlerinizi barkodlarıyla kolayca ekleyin, stok adetlerinizi anlık olarak takip edin." },
        { icon: <Zap size={24} />, title: "Hızlı Satış Ekranı", description: "Nakit, kart, veresiye gibi farklı ödeme türleriyle saniyeler içinde satış yapın." },
        { icon: <BarChartHorizontal size={24} />, title: "Detaylı Raporlama", description: "Satışlarınızı günlük, haftalık, aylık ve yıllık periyotlarda analiz edin." },
        { icon: <FileOutput size={24} />, title: "Veri Dışa Aktarma", description: "Stok ve satış verilerinizi CSV formatında indirerek muhasebe işlemlerinizi kolaylaştırın." }
    ];

    const faqs = [
        { q: "Uygulamayı kullanmak için herhangi bir ücret ödemem gerekiyor mu?", a: "Hayır, uygulamanın temel özellikleri tamamen ücretsizdir. Gelecekte eklenecek profesyonel özellikler için isteğe bağlı bir Premium paket sunulabilir." },
        { q: "Verilerim güvende mi?", a: "Evet, tüm verileriniz Google'ın güvenli bulut altyapısında (Firebase) saklanmaktadır. Verilerinize sadece siz erişebilirsiniz." },
        { q: "Uygulamayı birden fazla cihazda kullanabilir miyim?", a: "Evet, aynı hesap bilgileriyle giriş yaparak uygulamayı bilgisayar, tablet veya telefon gibi farklı cihazlardan kullanabilirsiniz. Verileriniz tüm cihazlarınızda senkronize olur." },
        { q: "Barkod okuyucu zorunlu mu?", a: "Hayır, zorunlu değil. Barkodları manuel olarak da girebilirsiniz. Ancak barkod okuyucu, işlemleri önemli ölçüde hızlandırır." }
    ];

    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="bg-[var(--bg-color)]">
            <header className="absolute inset-x-0 top-0 z-50">
                <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
                    <div className="flex lg:flex-1">
                        <button onClick={() => setPage('landing')} className="-m-1.5 p-1.5 flex items-center gap-2">
                            <Building className="h-8 w-auto text-[var(--primary-600)]" />
                            <span className="font-bold text-xl text-[var(--text-color)]">Stok Takip</span>
                        </button>
                    </div>
                    <div className="flex lg:flex-1 lg:justify-end">
                        <button onClick={() => setPage('login')} className="text-sm font-semibold leading-6 text-[var(--text-color)]">
                            Giriş Yap <span aria-hidden="true">&rarr;</span>
                        </button>
                    </div>
                </nav>
            </header>

            <main>
                <div className="relative isolate px-6 pt-14 lg:px-8">
                    <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#80ffdb] to-[var(--primary-600)] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}></div>
                    </div>
                    <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
                        <div className="text-center">
                            <h1 className="text-4xl font-bold tracking-tight text-[var(--text-color)] sm:text-6xl">İşletmeniz için Modern Stok Yönetimi</h1>
                            <p className="mt-6 text-lg leading-8 text-[var(--text-muted-color)]">Satışlarınızı hızlandırın, stoklarınızı kontrol altında tutun ve veriye dayalı kararlar alarak işletmenizi büyütün. Hepsi tek bir platformda.</p>
                            <div className="mt-10 flex items-center justify-center gap-x-6">
                                <button onClick={() => setPage('login')} className="rounded-md bg-[var(--primary-600)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-500)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-600)]">
                                    Hemen Başla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <HowItWorksSection />

                <div className="bg-[var(--surface-color)] py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-[var(--primary-600)]">Her Şey Kontrol Altında</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-color)] sm:text-4xl">İşletmenizi Büyütecek Özellikler</p>
                            <p className="mt-6 text-lg leading-8 text-[var(--text-muted-color)]">Karmaşık tablolara ve manuel takibe son. İhtiyacınız olan her şey, basit ve anlaşılır bir arayüzde.</p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                                {features.map((feature) => (
                                    <div key={feature.title} className="relative pl-16">
                                        <dt className="text-base font-semibold leading-7 text-[var(--text-color)]">
                                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-600)] text-white">
                                                {feature.icon}
                                            </div>
                                            {feature.title}
                                        </dt>
                                        <dd className="mt-2 text-base leading-7 text-[var(--text-muted-color)]">{feature.description}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--bg-color)] py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl sm:text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-color)] sm:text-4xl">Basit ve Şeffaf Fiyatlandırma</h2>
                            <p className="mt-6 text-lg leading-8 text-[var(--text-muted-color)]">İhtiyaçlarınıza en uygun paketi seçin. Gizli ücretler veya sürprizler yok.</p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-[var(--border-color)] sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                            <div className="p-8 sm:p-10 lg:flex-auto">
                                <h3 className="text-2xl font-bold tracking-tight text-[var(--text-color)]">Temel Paket</h3>
                                <p className="mt-6 text-base leading-7 text-[var(--text-muted-color)]">Küçük işletmeler ve yeni başlayanlar için temel stok takibi ve satış özellikleri.</p>
                                <div className="mt-10 flex items-center gap-x-4">
                                    <h4 className="flex-none text-sm font-semibold leading-6 text-[var(--primary-600)]">Neler Dahil?</h4>
                                    <div className="h-px flex-auto bg-[var(--border-color)]"></div>
                                </div>
                                <ul role="list" className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-[var(--text-muted-color)] sm:grid-cols-2 sm:gap-6">
                                    <li className="flex gap-x-3"><CheckCircle className="h-6 w-5 flex-none text-[var(--primary-600)]" />Sınırsız Ürün Ekleme</li>
                                    <li className="flex gap-x-3"><CheckCircle className="h-6 w-5 flex-none text-[var(--primary-600)]" />Hızlı Satış Ekranı</li>
                                    <li className="flex gap-x-3"><CheckCircle className="h-6 w-5 flex-none text-[var(--primary-600)]" />Günlük Raporlar</li>
                                    <li className="flex gap-x-3"><CheckCircle className="h-6 w-5 flex-none text-[var(--primary-600)]" />Veresiye Takibi</li>
                                </ul>
                            </div>
                            <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                                <div className="rounded-2xl bg-[var(--surface-color)] py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
                                    <div className="mx-auto max-w-xs px-8">
                                        <p className="text-base font-semibold text-[var(--text-muted-color)]">Tamamen Ücretsiz</p>
                                        <p className="mt-6 flex items-baseline justify-center gap-x-2">
                                            <span className="text-5xl font-bold tracking-tight text-[var(--text-color)]">₺0</span>
                                        </p>
                                        <button onClick={() => setPage('login')} className="mt-10 block w-full rounded-md bg-[var(--primary-600)] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-500)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-600)]">
                                            Hesap Oluştur
                                        </button>
                                        <p className="mt-6 text-xs leading-5 text-[var(--text-muted-color)]">Kredi kartı gerekmez. Hemen kullanmaya başlayın.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                 <div className="bg-[var(--surface-color)]">
                    <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
                        <div className="mx-auto max-w-4xl divide-y divide-[var(--border-color)]">
                            <h2 className="text-2xl font-bold leading-10 tracking-tight text-[var(--text-color)]">Sıkça Sorulan Sorular</h2>
                            <dl className="mt-10 space-y-6 divide-y divide-[var(--border-color)]">
                                {faqs.map((faq, index) => (
                                    <div key={faq.q} className="pt-6">
                                        <dt>
                                            <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-start justify-between text-left text-[var(--text-color)]">
                                                <span className="text-base font-semibold leading-7">{faq.q}</span>
                                                <span className="ml-6 flex h-7 items-center">
                                                    <ChevronDown className={`h-6 w-6 transform transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                                                </span>
                                            </button>
                                        </dt>
                                        {openFaq === index && (
                                            <dd className="mt-2 pr-12">
                                                <p className="text-base leading-7 text-[var(--text-muted-color)]">{faq.a}</p>
                                            </dd>
                                        )}
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-slate-800 text-white">
                <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 lg:px-8">
                    <p className="text-center text-xs leading-5 text-slate-400">&copy; 2024 Stok Takip Sistemi. Tüm hakları saklıdır.</p>
                </div>
            </footer>
        </div>
    );
};


// --- Authentication Page ---
const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const { setPage } = usePage();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        if (!email || !password) { 
            toast.warning("Lütfen e-posta ve şifre alanlarını doldurun."); 
            return; 
        }
        setIsSubmitting(true);
        try {
            const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);

            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success("Başarıyla giriş yapıldı!");
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                toast.success("Hesabınız başarıyla oluşturuldu! Giriş yapılıyor...");
            }
            // onAuthStateChanged will handle navigation to the 'app' page
        } catch (error) {
            const errorMessage = error.code.includes('auth/weak-password') ? 'Şifre en az 6 karakter olmalıdır.' : 'Giriş bilgileri hatalı veya kullanıcı bulunamadı.';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--surface-color)] flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                     <button onClick={() => setPage('landing')} className="text-sm font-semibold leading-6 text-[var(--text-muted-color)] mb-4 hover:text-[var(--text-color)]">
                        &larr; Ana Sayfa
                    </button>
                    <Building className="mx-auto h-12 w-auto text-[var(--primary-600)]" />
                    <h1 className="text-3xl font-bold text-[var(--text-color)] mt-4">Stok Takip Sistemine Hoş Geldiniz</h1>
                    <p className="text-[var(--text-muted-color)] mt-2">Lütfen hesabınıza giriş yapın veya yeni bir hesap oluşturun.</p>
                </div>
                <div className="bg-[var(--bg-color)] p-8 rounded-2xl shadow-lg border border-[var(--border-color)]">
                    <form onSubmit={handleAuthAction} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-muted-color)] mb-1">E-posta Adresi</label>
                                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" />
                            </div>
                             <div>
                                <label htmlFor="password"  className="block text-sm font-medium text-[var(--text-muted-color)] mb-1">Şifre</label>
                                <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" />
                            </div>
                        </div>
                        
                        <div className="flex items-center">
                            <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--primary-600)] focus:ring-[var(--primary-500)]" />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--text-muted-color)]">Beni Hatırla</label>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-[var(--primary-600)] text-white font-bold py-2.5 px-4 rounded-lg hover:bg-[var(--primary-700)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
                            <span>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
                        </button>
                    </form>
                    <p className="text-center text-sm text-[var(--text-muted-color)] mt-6">
                        {isLogin ? "Hesabınız yok mu?" : "Zaten bir hesabınız var mı?"}
                        <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-[var(--primary-600)] hover:text-[var(--primary-500)] ml-1">
                            {isLogin ? 'Kayıt Olun' : 'Giriş Yapın'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Main Stock Application Component ---
const StockApp = () => {
    const { user } = useAuth();

    if (!user) {
        return <LoadingSpinner fullPage={true} message="Kullanıcı doğrulanıyor..." />;
    }
    
    return <StockAppLayout user={user} />;
};

const StockAppLayout = ({ user }) => {
    const userId = user.uid;
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState({ products: true, sales: true, settings: true });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [settings, setSettings] = useState({ theme: 'light', palette: 'teal', criticalStockLevel: 5 });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const productsPath = useMemo(() => `artifacts/${appId}/users/${userId}/products`, [userId]);
    const salesPath = useMemo(() => `artifacts/${appId}/users/${userId}/sales`, [userId]);
    const settingsPath = useMemo(() => `artifacts/${appId}/users/${userId}/settings`, [userId]);

    useEffect(() => {
        if (!userId) return;
        
        const settingsRef = doc(db, settingsPath, 'appSettings');
        const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
            if(docSnap.exists()){
                setSettings(prev => ({...prev, ...docSnap.data()}));
            }
            setLoading(prev => ({ ...prev, settings: false }));
        }, (error) => {
            console.error("Error fetching settings:", error);
            setLoading(prev => ({ ...prev, settings: false }));
        });

        const productsQuery = query(collection(db, productsPath));
        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(prev => ({ ...prev, products: false }));
        }, (error) => {
            console.error("Error fetching products:", error);
            setLoading(prev => ({ ...prev, products: false }));
        });

        const salesQuery = query(collection(db, salesPath), orderBy('saleDate', 'desc'));
        const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(prev => ({ ...prev, sales: false }));
        }, (error) => {
            console.error("Error fetching sales:", error);
            setLoading(prev => ({ ...prev, sales: false }));
        });

        return () => { 
            unsubscribeSettings();
            unsubscribeProducts(); 
            unsubscribeSales(); 
        };
    }, [userId, productsPath, salesPath, settingsPath]);

    const handleUpdateSettings = async (newSettings) => {
        const settingsRef = doc(db, settingsPath, 'appSettings');
        await setDoc(settingsRef, newSettings, { merge: true });
        setSettings(newSettings);
        toast.success("Ayarlar kaydedildi!");
    };

    const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm))).sort((a, b) => a.name.localeCompare(b.name)), [products, searchTerm]);

    const handleAddOrUpdateProduct = useCallback(async (productData) => {
        const { barcode, name } = productData;
        const productRef = doc(db, productsPath, barcode);
        
        const dataToSave = {...productData};
        if(!dataToSave.criticalStockLevel) {
            dataToSave.criticalStockLevel = settings.criticalStockLevel || 5;
        }

        toast.promise(
            async () => {
                const docSnap = await getDoc(productRef);
                if (docSnap.exists()) {
                    await updateDoc(productRef, { ...dataToSave, lastUpdatedAt: serverTimestamp() });
                    return { message: "başarıyla güncellendi", name };
                } else {
                    await setDoc(productRef, { ...dataToSave, createdAt: serverTimestamp() });
                    return { message: "başarıyla eklendi", name };

                }
            },
            { loading: 'Ürün işleniyor...', success: (data) => `'${data.name}' ${data.message}.`, error: 'İşlem sırasında bir hata oluştu.' }
        );
    }, [productsPath, settings.criticalStockLevel]);

    const handleDeleteProduct = useCallback((id, name) => {
        const productRef = doc(db, productsPath, id);
        toast.promise(deleteDoc(productRef), { loading: `${name} siliniyor...`, success: `${name} başarıyla silindi.`, error: `Silme işlemi sırasında hata oluştu.` });
    }, [productsPath]);

    const handleCancelSale = useCallback(async (saleToCancel) => {
        if (!saleToCancel || !saleToCancel.items || saleToCancel.items.length === 0) {
            toast.error("İptal edilecek ürün bilgisi bulunamadı.");
            return;
        }

        if (saleToCancel.type === 'cancelled' || saleToCancel.type === 'personnel') {
            toast.warning("Bu işlem türü iptal edilemez.");
            return;
        }

        const batch = writeBatch(db);

        try {
            saleToCancel.items.forEach(item => {
                if (item.productId) {
                    const productRef = doc(db, productsPath, item.productId);
                    batch.update(productRef, { stock: increment(item.quantity) });
                }
            });

            const saleRef = doc(db, salesPath, saleToCancel.id);
            batch.update(saleRef, {
                type: 'cancelled',
                status: 'cancelled',
                cancelledAt: serverTimestamp()
            });

            await toast.promise(batch.commit(), {
                loading: 'Satış iptal ediliyor...',
                success: 'Satış başarıyla iptal edildi ve stoklar güncellendi.',
                error: 'İptal işlemi sırasında bir hata oluştu.'
            });

        } catch (error) {
            console.error("İptal hatası:", error);
            toast.error("İptal işlemi sırasında bir hata oluştu.");
        }
    }, [productsPath, salesPath]);

    if (loading.products || loading.sales || loading.settings) {
        return <LoadingSpinner fullPage={true} message="Veriler yükleniyor..." />;
    }

    return (
        <div className="bg-[var(--surface-color)] min-h-screen">
            <div className="container mx-auto p-4 md:p-6 max-w-7xl">
                <Header userEmail={user.email} />
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="lg:col-span-1 flex flex-col gap-6">
                         <InstantSaleSection products={products} productsPath={productsPath} salesPath={salesPath} />
                        <AddProductSection onAdd={handleAddOrUpdateProduct} products={products} settings={settings} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="lg:col-span-2 bg-[var(--bg-color)] p-4 sm:p-6 rounded-2xl shadow-lg border border-[var(--border-color)]">
                         <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} />}
                                {activeTab === 'statistics' && <StatisticsPage sales={sales} products={products} />}
                                {activeTab === 'stock' && <ProductList products={filteredProducts} loading={loading.products} onUpdate={handleAddOrUpdateProduct} onDelete={handleDeleteProduct} productsPath={productsPath} salesPath={salesPath} searchTerm={searchTerm} setSearchTerm={setSearchTerm} settings={settings}/>}
                                {activeTab === 'history' && <SalesHistory sales={sales} loading={loading.sales} onCancelSale={handleCancelSale} />}
                                {activeTab === 'credit' && <CreditPage sales={sales} salesPath={salesPath} loading={loading.sales} />}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </main>
            </div>
            
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="fixed top-6 right-6 bg-[var(--primary-600)] text-white p-3 rounded-full shadow-lg hover:bg-[var(--primary-700)] transition-transform hover:scale-110 z-40"
                aria-label="Ayarları Aç"
            >
                <Settings size={24} />
            </button>

            <AnimatePresence>
                {isSettingsOpen && <SettingsPanel currentSettings={settings} onSave={handleUpdateSettings} onClose={() => setIsSettingsOpen(false)} />}
            </AnimatePresence>
        </div>
    );
};


// --- All Other Child Components ---

const Header = ({ userEmail }) => {
    const { setPage } = usePage();
    const handleLogout = () => {
        signOut(auth).then(() => {
            setPage('landing');
        });
    };
    return (
        <header className="text-center mb-6 md:mb-8 relative">
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-color)] tracking-tight">Stok Takip Sistemi</h1>
            <div className="flex items-center justify-center gap-4 mt-3">
                <p className="text-sm text-[var(--text-muted-color)]">Giriş yapıldı: <span className="font-medium text-[var(--text-color)]">{userEmail}</span></p>
                <button onClick={handleLogout} className="text-sm text-[var(--text-muted-color)] hover:text-[var(--primary-500)] font-semibold flex items-center gap-1.5 p-2 rounded-full hover:bg-[var(--surface-hover-color)] transition-colors">
                    <LogOut size={16} />
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
            items: [{ productId: product.id, name: product.name, quantity: 1, price: product.salePrice, purchasePrice: product.purchasePrice || 0 }]
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
        <div className="bg-[var(--bg-color)] p-6 rounded-2xl shadow-lg border border-[var(--border-color)] flex flex-col gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-[var(--text-color)]"><ShoppingCart size={22} /> Hızlı İşlemler</h2>
            
            <form onSubmit={handleCashSale}>
                <div className="rounded-lg bg-[var(--surface-color)] p-3 border border-[var(--border-color)]">
                    <label htmlFor="barcode-input" className="block text-xs font-medium text-[var(--text-muted-color)]">Nakit Satış (Barkod Okut/Gir + Enter)</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input ref={inputRef} autoFocus id="barcode-input" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Nakit satış için okutun..." className="block w-full border-0 bg-transparent p-0 text-[var(--text-color)] placeholder:text-[var(--text-muted-color)] focus:ring-0 sm:text-sm"/>
                        <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-[var(--text-muted-color)] hover:text-[var(--primary-600)]" title="Kamera ile Tara"> <Camera size={20} /> </button>
                    </div>
                </div>
            </form>
            
            <div className="border-t border-[var(--border-color)] pt-4">
                 <p className="text-center text-sm text-[var(--text-muted-color)] mb-3">Veya Diğer İşlem Türünü Seçin:</p>
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
                     <button onClick={() => setModalType('personnel')} className="w-full bg-yellow-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2">
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
        } else if (type === 'personnel') {
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
            <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-sm border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                <h3 className={`text-xl font-semibold mb-4 flex items-center gap-2 text-${typeConfig.color}`}>
                    <typeConfig.icon size={22} /> {typeConfig.title}
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="rounded-lg bg-[var(--surface-color)] p-3 border border-[var(--border-color)]">
                        <label htmlFor="modal-barcode-input" className="block text-xs font-medium text-[var(--text-muted-color)]">Ürün Barkodu</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input 
                                ref={inputRef} 
                                autoFocus 
                                 id="modal-barcode-input" 
                                type="text" 
                                value={barcode} 
                                 onChange={(e) => setBarcode(e.target.value)} 
                                placeholder="Barkodu okutun veya girin..." 
                                className="block w-full border-0 bg-transparent p-0 text-[var(--text-color)] placeholder:text-[var(--text-muted-color)] focus:ring-0 sm:text-sm"
                            />
                            <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-[var(--text-muted-color)] hover:text-[var(--primary-600)]" title="Kamera ile Tara"> <Camera size={20} /> </button>
                        </div>
                     </div>
                    <div className="flex justify-end space-x-3 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] font-semibold text-sm border border-[var(--border-color)]">İptal</button>
                         <button type="submit" className={`px-4 py-2 bg-${typeConfig.color} text-white rounded-lg hover:bg-opacity-90 font-semibold text-sm`}>İşlemi Tamamla</button>
                    </div>
                </form>
                {showScanner && <CameraScanner onScanSuccess={onScanSuccess} onClose={() => setShowScanner(false)} />}
            </div>
        </div>
    );
};

const AddProductSection = ({ onAdd, products, settings }) => {
    const [product, setProduct] = useState({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '', criticalStockLevel: '' });
    const [showScanner, setShowScanner] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, barcode, stock, purchasePrice, salePrice } = product;
        if(!name || !barcode || !stock || !purchasePrice || !salePrice) { toast.warning("Lütfen yıldızlı alanları doldurun."); return; }
        
        const productData = { 
            ...product, 
            stock: parseInt(stock), 
            purchasePrice: parseFloat(purchasePrice), 
            salePrice: parseFloat(salePrice),
            criticalStockLevel: parseInt(product.criticalStockLevel) || settings.criticalStockLevel || 5
        };

        const existingProduct = products.find(p => p.id === barcode);
        if (existingProduct) {
            toast( `Bu barkod "${existingProduct.name}" ürününe ait. Bilgileri güncellemek ister misiniz?`, { action: { label: 'Güncelle', onClick: () => { onAdd(productData); resetForm(); }}, cancel: { label: 'İptal' } });
        } else {
            await onAdd(productData);
            resetForm();
        }
    };

    const resetForm = () => setProduct({ name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '', criticalStockLevel: '' });

    const onBarcodeScan = (decodedText) => {
        setProduct(prev => ({ ...prev, barcode: decodedText }));
        setShowScanner(false);
    };

    return ( <div className="bg-[var(--bg-color)] p-6 rounded-2xl shadow-lg border border-[var(--border-color)]"> <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[var(--text-color)]"><Package size={22} /> Ürün Yönetimi</h2> <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Ürün Adı" id="name" required>
            <input type="text" name="name" id="name" value={product.name} onChange={(e) => setProduct({...product, name: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder="Örn: Kutu Süt"/>
        </FormInput>
        <FormInput label="Barkod Numarası" id="barcode" required>
             <div className="flex items-center gap-2">
                <input type="text" name="barcode" id="barcode" value={product.barcode} onChange={(e) => setProduct({...product, barcode: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder="Okutun veya manuel girin"/>
                <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-[var(--text-muted-color)] hover:text-[var(--primary-600)]" title="Kamera ile Tara">
                    <Camera size={20} />
                 </button>
            </div>
        </FormInput>
        <div className="grid grid-cols-2 gap-4">
            <FormInput label="Stok Adedi" id="stock" required><input type="number" name="stock" id="stock" value={product.stock} onChange={(e) => setProduct({...product, stock: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder="0" min="0"/></FormInput>
            <FormInput label="Kritik Stok" id="criticalStockLevel"><input type="number" name="criticalStockLevel" id="criticalStockLevel" value={product.criticalStockLevel} onChange={(e) => setProduct({...product, criticalStockLevel: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder={settings.criticalStockLevel || 5} min="0"/></FormInput>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormInput label="Alış Fiyatı (₺)" id="purchasePrice" required><input type="number" name="purchasePrice" id="purchasePrice" value={product.purchasePrice} onChange={(e) => setProduct({...product, purchasePrice: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder="0.00" min="0" step="0.01"/></FormInput>
            <FormInput label="Satış Fiyatı (₺)" id="salePrice" required><input type="number" name="salePrice" id="salePrice" value={product.salePrice} onChange={(e) => setProduct({...product, salePrice: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder="0.00" min="0" step="0.01"/></FormInput>
        </div>
        <FormInput label="Kategori" id="category"><input type="text" name="category" id="category" value={product.category} onChange={(e) => setProduct({...product, category: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder="Örn: İçecek"/></FormInput>
        <button type="submit" className="w-full bg-[var(--primary-600)] text-white font-bold py-2.5 px-4 rounded-lg hover:bg-[var(--primary-700)] transition-all duration-300 flex items-center justify-center gap-2"> <PlusCircle size={20} /> <span>Ürünü Ekle / Güncelle</span> </button>
    </form>
    {showScanner && <CameraScanner onScanSuccess={onBarcodeScan} onClose={() => setShowScanner(false)} />}
    </div> );
};

const Tabs = ({ activeTab, setActiveTab }) => { 
    const tabData = [ 
        { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }, 
        { id: 'statistics', label: 'İstatistikler', icon: BarChart3 }, 
        { id: 'stock', label: 'Stok Listesi', icon: Package }, 
        { id: 'credit', label: 'Veresiye', icon: BookUser }, 
        { id: 'history', label: 'Satış Geçmişi', icon: History }
    ]; 

    return ( 
        <div className="flex justify-between items-center border-b border-[var(--border-color)] mb-4"> 
            <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs"> 
                {tabData.map(tab => ( 
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap py-2 px-2 sm:px-3 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id ? 'border-[var(--primary-500)] text-[var(--primary-600)]' : 'border-transparent text-[var(--text-muted-color)] hover:text-[var(--text-color)] hover:border-slate-300'}`}> 
                        <tab.icon size={16} />
                        <span>{tab.label}</span> 
                    </button> 
                ))} 
             </nav>
        </div> 
    ); 
};

const Dashboard = ({ products, sales }) => {
    const [timePeriod, setTimePeriod] = useState('daily');
    const periodLabels = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' };

    const data = useMemo(() => {
        const now = new Date();
        let currentStart, currentEnd;

        switch (timePeriod) {
            case 'monthly':
                currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
                currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case 'yearly':
                currentStart = new Date(now.getFullYear(), 0, 1);
                currentEnd = new Date(now.getFullYear() + 1, 0, 1);
                break;
            case 'weekly':
                const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
                currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                currentEnd = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'daily':
            default:
                currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
        }
        currentStart.setHours(0,0,0,0);
        
        const validSales = sales.filter(s => s.saleDate && s.saleDate.toDate);
        
        const filterSalesByDate = (salesArray, start, end) => salesArray.filter(s => {
            const saleDate = s.saleDate.toDate();
            return saleDate >= start && saleDate < end;
        });

        const periodSalesData = filterSalesByDate(validSales, currentStart, currentEnd)
            .filter(s => s.type === 'sale' || (s.type === 'credit' && s.status === 'paid'));
        
        const periodRevenue = periodSalesData.reduce((sum, s) => sum + (s.total || 0), 0);
        const periodCash = periodSalesData.filter(s => s.paymentMethod === 'nakit').reduce((sum, s) => sum + (s.total || 0), 0);
        const periodCard = periodSalesData.filter(s => s.paymentMethod === 'kart').reduce((sum, s) => sum + (s.total || 0), 0);
        
        const periodProfit = periodSalesData.reduce((sum, s) => {
            const saleProfit = s.items.reduce((itemSum, item) => {
                const profitPerItem = (item.price - (item.purchasePrice || 0)) * item.quantity;
                return itemSum + profitPerItem;
            }, 0);
            return sum + saleProfit;
        }, 0);

        const paymentMethodData = [{name: 'Nakit', value: periodCash}, {name: 'Kart', value: periodCard}];

        const revenueByProduct = periodSalesData.reduce((acc, sale) => {
            sale.items.forEach(item => {
                acc[item.name] = (acc[item.name] || 0) + item.price * item.quantity;
            });
            return acc;
        }, {});
        const revenueByProductData = Object.entries(revenueByProduct).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        const topSellingByQuantity = periodSalesData.reduce((acc, sale) => {
            sale.items.forEach(item => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity;
            });
            return acc;
        }, {});
        const topSellingByQuantityData = Object.entries(topSellingByQuantity).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);

        const personnelUsageRaw = filterSalesByDate(validSales, currentStart, currentEnd).filter(s => s.type === 'personnel');
        const personnelUsageData = personnelUsageRaw.reduce((acc, sale) => {
             sale.items.forEach(item => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity;
            });
            return acc;
        }, {});
        const personnelUsageDataFormatted = Object.entries(personnelUsageData).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);

        return { periodRevenue, periodProfit, periodCash, periodCard, paymentMethodData, revenueByProduct: revenueByProductData, topSellingByQuantity: topSellingByQuantityData, personnelUsageData: personnelUsageDataFormatted };
    }, [sales, timePeriod]);

    return ( 
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-color)] p-1 border border-[var(--border-color)]">
                    {Object.keys(periodLabels).map(period => (
                        <button key={period} onClick={() => setTimePeriod(period)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timePeriod === period ? 'bg-[var(--bg-color)] text-[var(--primary-600)] shadow-sm' : 'text-[var(--text-muted-color)] hover:text-[var(--text-color)]'}`}>
                            {periodLabels[period]}
                        </button>
                    ))}
                </div>
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={timePeriod}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> 
                        <StatCard title={`${periodLabels[timePeriod]} Toplam Ciro`} value={formatCurrency(data.periodRevenue)} icon={TrendingUp} />
                        <StatCard title={`${periodLabels[timePeriod]} Toplam Kâr`} value={formatCurrency(data.periodProfit)} icon={DollarSign} color="green" />
                        <StatCard title="Nakit Kazanç" value={formatCurrency(data.periodCash)} icon={DollarSign} color="teal"/>
                        <StatCard title="Kart Kazanç" value={formatCurrency(data.periodCard)} icon={CreditCard} color="blue"/>
                    </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartContainer title={`Ödeme Yöntemi Dağılımı (${periodLabels[timePeriod]})`} icon={CreditCard}>
                             <CategoryPieChart data={data.paymentMethodData} />
                        </ChartContainer>
                        <ChartContainer title={`Ürün Ciro Dağılımı (${periodLabels[timePeriod]})`} icon={PieIcon}>
                            <CategoryPieChart data={data.revenueByProduct} />
                        </ChartContainer>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="font-semibold mb-3 flex items-center gap-2 text-[var(--text-color)]"><PackageSearch size={18}/> En Çok Satanlar - Adet ({periodLabels[timePeriod]})</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {data.topSellingByQuantity.length > 0 ? data.topSellingByQuantity.map(item => (
                                    <div key={item.name} className="flex justify-between items-center text-sm">
                                        <span className="truncate text-[var(--text-muted-color)]">{item.name}</span>
                                         <span className="font-bold text-[var(--primary-600)]">{item.quantity} adet</span>
                                    </div>
                                )) : <p className="text-sm text-[var(--text-muted-color)]">Bu periyotta satış verisi yok.</p>}
                            </div>
                         </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="font-semibold mb-3 flex items-center gap-2 text-[var(--text-color)]"><UserCheck size={18}/> Personel Kullanımı ({periodLabels[timePeriod]})</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {data.personnelUsageData.length > 0 ? data.personnelUsageData.map(item => (
                                    <div key={item.name} className="flex justify-between items-center text-sm">
                                        <span className="truncate text-[var(--text-muted-color)]">{item.name}</span>
                                         <span className="font-bold text-yellow-600">{item.quantity} adet</span>
                                    </div>
                                )) : <p className="text-sm text-[var(--text-muted-color)]">Bu periyotta personel kullanımı kaydedilmedi.</p>}
                            </div>
                         </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div> 
    );
};

const CategoryPieChart = ({ data }) => {
    const { palette, colorPalettes } = useTheme();
    const COLORS = {
        teal: ['#14b8a6', '#0ea5e9', '#f97316', '#ec4899', '#8b5cf6', '#a8a29e'],
        blue: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'],
        rose: ['#f43f5e', '#3b82f6', '#14b8a6', '#facc15', '#a78bfa', '#9ca3af'],
        indigo: ['#6366f1', '#22c55e', '#f97316', '#d946ef', '#0ea5e9', '#78716c'],
    };

    if (!data || data.length === 0 || data.every(item => item.value === 0)) {
        return <EmptyState icon={<PieIcon size={30}/>} message="Gösterilecek veri yok." />;
    }
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[palette][index % COLORS[palette].length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value), 'Ciro']}/>
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

const SettingsPanel = ({ currentSettings, onSave, onClose }) => {
    const { applyTheme, persistSettings, colorPalettes } = useTheme();
    const [tempSettings, setTempSettings] = useState(currentSettings);

    const originalSettings = useRef(currentSettings);

    useEffect(() => {
        // Apply temporary changes for live preview
        applyTheme(tempSettings.theme, tempSettings.palette);
    }, [tempSettings, applyTheme]);

    const handleClose = () => {
        // Revert to original settings if not saved
        applyTheme(originalSettings.current.theme, originalSettings.current.palette);
        onClose();
    };

    const handleSave = () => {
        persistSettings(tempSettings.theme, tempSettings.palette);
        onSave(tempSettings);
        onClose();
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={handleClose}
            />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-[var(--bg-color)] shadow-2xl z-50 flex flex-col"
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                    <h3 className="text-xl font-semibold text-[var(--text-color)]">Ayarlar</h3>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-[var(--surface-hover-color)]">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-grow p-6 space-y-8 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Tema</label>
                        <div className="flex gap-2">
                            <button onClick={() => setTempSettings(s => ({...s, theme: 'light'}))} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${tempSettings.theme === 'light' ? 'border-[var(--primary-500)] bg-[var(--surface-color)]' : 'border-[var(--border-color)]'}`}>
                                <Sun size={16} /> Açık
                            </button>
                            <button onClick={() => setTempSettings(s => ({...s, theme: 'dark'}))} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${tempSettings.theme === 'dark' ? 'border-[var(--primary-500)] bg-[var(--surface-color)]' : 'border-[var(--border-color)]'}`}>
                                <Moon size={16} /> Koyu
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Renk Paleti</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(colorPalettes).map(([key, value]) => (
                                <button key={key} onClick={() => setTempSettings(s => ({...s, palette: key}))} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${tempSettings.palette === key ? 'border-[var(--primary-500)]' : 'border-[var(--border-color)]'}`}>
                                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: value.primary500}}></div>
                                    {value.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="criticalStock" className="block text-sm font-medium text-[var(--text-color)] mb-1">Genel Kritik Stok Seviyesi</label>
                        <p className="text-xs text-[var(--text-muted-color)] mb-2">Yeni eklenen ürünler için varsayılan uyarı seviyesi.</p>
                        <input 
                            id="criticalStock" 
                            type="number" 
                            value={tempSettings.criticalStockLevel} 
                            onChange={(e) => setTempSettings(s => ({...s, criticalStockLevel: parseInt(e.target.value, 10) || 0}))}
                            className="w-full max-w-xs px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-color)]">
                    <button onClick={handleSave} className="w-full px-4 py-2.5 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] font-semibold text-sm">
                        Ayarları Kaydet
                    </button>
                </div>
            </motion.div>
        </>
    );
};

// --- STATISTICS PAGE ---
const StatisticsPage = ({ sales, products }) => {
    const [timePeriod, setTimePeriod] = useState('weekly');
    
    const {
        currentPeriod,
        previousPeriod,
        revenueByCategory,
        busiestDays,
        busiestHours,
        topSellingProducts,
    } = useMemo(() => {
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
        currentStart.setHours(0,0,0,0);
        previousStart.setHours(0,0,0,0);

        const validSales = sales.filter(s => s.saleDate && typeof s.saleDate.toDate === 'function');

        const filterSalesByDate = (salesArray, start, end) => salesArray.filter(s => {
            const saleDate = s.saleDate.toDate();
            return saleDate >= start && saleDate < end;
        });

        const salesToConsider = validSales.filter(s => s.type === 'sale' || (s.type === 'credit' && s.status === 'paid'));
        const getSum = (filteredSales) => filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
        
        const currentSales = filterSalesByDate(salesToConsider, currentStart, currentEnd);
        const previousSales = filterSalesByDate(salesToConsider, previousStart, previousEnd);

        const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
        const salesByDay = new Array(7).fill(0).map((_, i) => ({ name: dayNames[i], Ciro: 0 }));
        const salesByHour = new Array(24).fill(0).map((_, i) => ({ name: `${String(i).padStart(2, '0')}:00`, Ciro: 0 }));

        currentSales.forEach(s => {
            const saleDate = s.saleDate.toDate();
            const dayIndex = saleDate.getDay() === 0 ? 6 : saleDate.getDay() - 1;
            if (salesByDay[dayIndex]) salesByDay[dayIndex].Ciro += s.total;
            if (salesByHour[saleDate.getHours()]) salesByHour[saleDate.getHours()].Ciro += s.total;
        });

        const productRevenue = {};
        currentSales.forEach(s => {
            s.items.forEach(item => {
                productRevenue[item.name] = (productRevenue[item.name] || 0) + (item.price * item.quantity);
            });
        });
        
        const sortedProducts = Object.entries(productRevenue).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const topSellingProducts = sortedProducts.slice(0, 10);
        
        const revenueByCategory = currentSales.reduce((acc, sale) => {
            sale.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const category = product?.category || 'Diğer';
                acc[category] = (acc[category] || 0) + item.price * item.quantity;
            });
            return acc;
        }, {});
        const revenueByCategoryData = Object.entries(revenueByCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        return {
            currentPeriod: { revenue: getSum(currentSales) },
            previousPeriod: { revenue: getSum(previousSales) },
            revenueByCategory: revenueByCategoryData,
            busiestDays: salesByDay,
            busiestHours: salesByHour.filter(h => h.Ciro > 0),
            topSellingProducts: topSellingProducts,
        };
    }, [sales, products, timePeriod]);
    
    const periodLabels = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-color)]">İstatistikler</h3>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-color)] p-1 border border-[var(--border-color)]">
                    {Object.keys(periodLabels).map(period => (
                        <button key={period} onClick={() => setTimePeriod(period)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timePeriod === period ? 'bg-[var(--bg-color)] text-[var(--primary-600)] shadow-sm' : 'text-[var(--text-muted-color)] hover:text-[var(--text-color)]'}`}>
                            {periodLabels[period]}
                        </button>
                    ))}
                </div>
            </div>
            
            <ComparisonCard title={`${periodLabels[timePeriod]} Ciro`} current={currentPeriod.revenue} previous={previousPeriod.revenue} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="En Yoğun Günler" icon={Calendar}>
                    {busiestDays.some(d => d.Ciro > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={busiestDays} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--text-muted-color)'}} />
                                <YAxis tickFormatter={(value) => formatCurrency(value).replace('₺','')} tick={{fontSize: 10, fill: 'var(--text-muted-color)'}}/>
                                <Tooltip
                                    formatter={(value) => [formatCurrency(value), 'Ciro']}
                                    contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                                    labelStyle={{ color: 'var(--text-color)' }}
                                />
                                <Bar dataKey="Ciro" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState icon={<Calendar size={30}/>} message="Bu periyotta gün verisi yok." />
                    )}
                </ChartContainer>

                <ChartContainer title="En Yoğun Saatler" icon={Clock}>
                    {busiestHours.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={busiestHours} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: 'var(--text-muted-color)'}} angle={-45} textAnchor="end" height={40} interval="preserveStartEnd" />
                                <YAxis tickFormatter={(value) => formatCurrency(value).replace('₺','')} tick={{fontSize: 10, fill: 'var(--text-muted-color)'}}/>
                                <Tooltip
                                    formatter={(value) => [formatCurrency(value), 'Ciro']}
                                    contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                                    labelStyle={{ color: 'var(--text-color)' }}
                                />
                                <Bar dataKey="Ciro" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState icon={<Clock size={30}/>} message="Bu periyotta saat verisi yok." />
                    )}
                </ChartContainer>
            </div>
            
            <ChartContainer title={`En Çok Satan Ürünler - Ciro (${periodLabels[timePeriod]})`} icon={TrendingUp}>
                {topSellingProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topSellingProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 12, width: 110, fill: 'var(--text-muted-color)'}} interval={0} />
                            <Tooltip
                                formatter={(value) => [formatCurrency(value), 'Ciro']}
                                contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                                labelStyle={{ color: 'var(--text-color)' }}
                            />
                            <Bar dataKey="value" name="Ciro" fill="var(--primary-500)" radius={[0, 4, 4, 0]} background={{ fill: 'var(--surface-color)' }} label={{ position: 'right', formatter: (value) => formatCurrency(value), fontSize: 11, fill: 'var(--text-color)' }} />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                    <EmptyState icon={<PackageSearch size={30}/>} message="Bu periyotta gösterilecek ürün verisi yok." />
                )}
            </ChartContainer>

            <ChartContainer title="Kategori Performansı (Ciro)" icon={PieIcon}>
                <CategoryPieChart data={revenueByCategory} />
            </ChartContainer>
        </div>
    );
};


const ProductList = ({ products, loading, onUpdate, onDelete, productsPath, salesPath, searchTerm, setSearchTerm, settings }) => {
    const [editingProduct, setEditingProduct] = useState(null);
    const [stockModalProduct, setStockModalProduct] = useState(null);

    const handleUpdateSubmit = (e) => { 
        e.preventDefault(); 
        const productData = {
            ...editingProduct,
            criticalStockLevel: parseInt(editingProduct.criticalStockLevel) || settings.criticalStockLevel || 5
        };
        onUpdate(productData); 
        setEditingProduct(null); 
    };

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
                items: [{ productId: product.id, name: product.name, quantity: 1, price: product.salePrice, purchasePrice: product.purchasePrice || 0 }] 
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
            items: [{ productId: product.id, name: product.name, quantity: 1, price: product.salePrice, purchasePrice: product.purchasePrice || 0 }]
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
        <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-color)]" size={20} /> <input type="text" placeholder="Ürün adı veya barkod ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-10 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /> </div>
        {products.length === 0 && searchTerm && ( <EmptyState icon={<Search size={40}/>} message="Arama Sonucu Bulunamadı" description={`'${searchTerm}' için bir sonuç bulunamadı. Lütfen farklı bir anahtar kelime deneyin.`} /> )}
        <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2 pb-4"> {products.map(p => (
            <motion.div layout key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover-color)] transition-colors border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-color)] truncate flex items-center">{p.name} {p.stock <= (p.criticalStockLevel || settings.criticalStockLevel || 5) && <AlertTriangle size={14} className="ml-2 text-red-500"/>}</p>
                        <p className="text-xs text-[var(--text-muted-color)]">Barkod: {p.barcode} | Kategori: {p.category || 'Yok'}</p>
                        <p className="text-xs text-green-700 font-medium">Satış: {formatCurrency(p.salePrice)}</p>
                    </div>
                    <div className="text-right mx-4 w-16 flex-shrink-0">
                        <p className={`font-bold text-lg ${p.stock > 10 ? 'text-green-600' : p.stock > (p.criticalStockLevel || settings.criticalStockLevel || 5) ? 'text-yellow-600' : 'text-red-600'}`}>{p.stock}</p>
                        <p className="text-xs text-[var(--text-muted-color)]">adet</p>
                    </div>
                </div>
                <div className="border-t border-[var(--border-color)] mt-2 pt-2 flex items-center justify-end space-x-1 flex-wrap">
                     <button onClick={() => handleSale(p, 'nakit')} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md" title="Nakit Sat"><DollarSign size={16} /></button>
                    <button onClick={() => handleSale(p, 'kart')} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md" title="Kartla Sat"><CreditCard size={16} /></button>
                    <div className="border-l border-[var(--border-color)] h-6 mx-1"></div>
                    <button onClick={() => handleCreditSale(p)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md" title="Veresiye Sat"><BookUser size={16} /></button>
                    <button onClick={() => handlePersonnelUse(p, 1)} className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-md" title="Personel Kullanımı"><UserCheck size={16} /></button>
                    <button onClick={() => setStockModalProduct(p)} className="p-2 text-[var(--primary-600)] hover:bg-[var(--primary-100)] rounded-md" title="Stok Ekle"><PlusSquare size={16} /></button>
                    <button onClick={() => setEditingProduct(p)} className="p-2 text-[var(--text-muted-color)] hover:bg-[var(--surface-hover-color)] rounded-md" title="Düzenle"><Edit size={16} /></button>
                    <button onClick={() => toast(`"${p.name}" ürününü silmek istediğinize emin misiniz?`, { action: { label: 'Evet, Sil', onClick: () => onDelete(p.id, p.name) }, cancel: { label: 'İptal' } })} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md" title="Sil"><Trash2 size={16} /></button>
                </div>
            </motion.div>
        ))} </div>
        {editingProduct && ( <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingProduct(null)}> <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-[var(--text-color)]">Ürünü Düzenle</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-3">
                <FormInput label="Ürün Adı" id="edit-name"><input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Stok Adedi" id="edit-stock"><input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                    <FormInput label="Kritik Stok" id="edit-criticalStock"><input type="number" value={editingProduct.criticalStockLevel} onChange={e => setEditingProduct({...editingProduct, criticalStockLevel: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Alış Fiyatı (₺)" id="edit-purchasePrice"><input type="number" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                     <FormInput label="Satış Fiyatı (₺)" id="edit-salePrice"><input type="number" value={editingProduct.salePrice} onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                </div>
                <FormInput label="Kategori" id="edit-category"><input value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                <div className="flex justify-end space-x-3 mt-2"> <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] border border-[var(--border-color)]">İptal</button> <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Kaydet</button> </div>
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
            <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-sm border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-semibold mb-4 text-[var(--text-color)]">Stok Ekle: <span className="font-bold text-[var(--primary-600)]">{product.name}</span></h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <FormInput label="Eklenecek Miktar" id="stock-amount">
                        <input
                            type="number"
                            value={amount}
                             onChange={e => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]"
                            placeholder="0"
                             min="1"
                            autoFocus
                            required
                        />
                     </FormInput>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] font-semibold text-sm border border-[var(--border-color)]">İptal</button>
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
                <div key={s.id} className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <div className="flex justify-between items-center">
                        <div>
                             <p className="font-semibold text-red-800 dark:text-red-200">{s.items[0].name}</p>
                            <p className="text-xs text-red-600 dark:text-red-300">{s.saleDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '...'}</p>
                        </div>
                         <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-red-600 dark:text-red-300">{formatCurrency(s.total)}</p>
                            <button onClick={() => handleMarkAsPaid(s.id)} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md" title="Ödeme Alındı Olarak İşaretle">
                                 <CheckCircle size={20} />
                            </button>
                        </div>
                    </div>
                 </div>
            ))}
        </div>
    );
};

const SalesHistory = ({ sales, loading, onCancelSale }) => {
    if (loading) return <LoadingSpinner />;
    if (!sales || sales.length === 0) return <EmptyState icon={<History size={40}/>} message="Henüz işlem yapılmamış." />;
    
    const handleCancelClick = (sale) => {
        onCancelSale(sale);
    };

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
            case 'cancelled':
                return <span className="text-xs font-semibold text-white bg-slate-500 px-2 py-0.5 rounded-full">İPTAL EDİLDİ</span>;
            default: return null;
        }
    };

    return (
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2 pb-4">
            {sales.map(s => (
                <motion.div layout key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)]">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-[var(--text-muted-color)]">{s.saleDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '...'}</p>
                            {getStatusBadge(s)}
                        </div>
                        <div className="flex items-center gap-2">
                             <p className={`text-lg font-bold ${s.type === 'cancelled' ? 'text-slate-500 line-through' : 'text-green-700'}`}>
                                {s.type !== 'personnel' ? formatCurrency(s.total) : ''}
                            </p>
                            {(s.type === 'sale' || s.type === 'credit') && s.status !== 'cancelled' && (
                                 <button 
                                    onClick={() => handleCancelClick(s)} 
                                    className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md" 
                                    title="İşlemi İptal Et">
                                    <Undo2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="mt-2 border-t border-[var(--border-color)] pt-2 space-y-1">
                        {s.items && Array.isArray(s.items) ? (
                            s.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <p className="text-[var(--text-color)]">
                                        <span className="font-medium">{item.quantity}x</span> {item.name}
                                    </p>
                                    <p className={`text-[var(--text-muted-color)] ${s.type === 'cancelled' ? 'line-through' : ''}`}>
                                        {s.type !== 'personnel' ? formatCurrency(item.price * item.quantity) : ''}
                                    </p>
                                </div>
                            ))
                        ) : null }
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

const ComparisonCard = ({ title, current, previous }) => {
    const percentageChange = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
    const isIncrease = percentageChange >= 0;

    return (
        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-muted-color)] font-medium">{title}</p>
            <div className="flex items-end justify-between mt-2">
                <p className="text-2xl font-bold text-[var(--text-color)]">{formatCurrency(current)}</p>
                <div className={`flex items-center text-sm font-semibold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                     {isIncrease ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    <span>{percentageChange.toFixed(1)}%</span>
                </div>
            </div>
            <p className="text-xs text-[var(--text-muted-color)]/70 mt-1">Önceki dönem: {formatCurrency(previous)}</p>
        </div>
    );
};

const ChartContainer = ({ title, icon: Icon, children }) => (
    <div className="bg-[var(--surface-color)] p-4 rounded-lg flex flex-col border border-[var(--border-color)] h-[300px]">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-[var(--text-color)]"><Icon size={18}/> {title}</h3>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

const CameraScanner = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const scannerId = "barcode-scanner-container";

    useEffect(() => {
        const scriptId = 'html5-qrcode-script';
        
        const cleanupScanner = () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => {
                    console.error("Tarayıcı durdurulurken hata oluştu, yoksayılıyor.", err);
                });
                scannerRef.current = null;
            }
        };

        const initializeScanner = () => {
            if (!window.Html5Qrcode) {
                toast.error("Barkod okuyucu kütüphanesi yüklenemedi.");
                onClose();
                return;
            }
            if (!document.getElementById(scannerId)) return;
            
            cleanupScanner(); // Ensure no previous scanner is running

            const scanner = new window.Html5Qrcode(scannerId);
            scannerRef.current = scanner;
            let isScanning = true;

            scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText, decodedResult) => {
                    if (isScanning) {
                        isScanning = false;
                        onScanSuccess(decodedText);
                        cleanupScanner();
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
        } else {
             initializeScanner();
        }

        return () => {
            cleanupScanner();
        };
    }, [onScanSuccess, onClose]);

    return (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
            <div id={scannerId} className="w-full max-w-md bg-white rounded-lg overflow-hidden aspect-video"></div>
            <button onClick={onClose} className="mt-4 bg-white text-black px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                <X size={18} /> Kapat
            </button>
        </div>
     );
};

const FormInput = ({ label, id, required, children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-[var(--text-muted-color)] mb-1">
            {label}{required && <span className="text-red-500"> *</span>}
        </label>
        {children}
    </div>
);

const StatCard = ({ title, value, icon: Icon, color = "teal" }) => {
    const colors = {
        teal: "bg-[var(--primary-100)] text-[var(--primary-600)]",
        green: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
    }
    return ( 
        <div className="bg-[var(--surface-color)] p-4 rounded-lg flex items-center gap-4 border border-[var(--border-color)]"> 
            <div className={`p-3 rounded-full ${colors[color]}`}> 
                <Icon size={24} /> 
            </div> 
            <div> 
                <p className="text-sm text-[var(--text-muted-color)]">{title}</p> 
                <p className="text-2xl font-bold text-[var(--text-color)]">{value}</p> 
            </div> 
        </div> 
    );
}
const LoadingSpinner = ({ fullPage = false, message = '' }) => ( <div className={`flex flex-col justify-center items-center ${fullPage ? 'h-screen bg-[var(--surface-color)]' : 'h-full py-10'}`}> <Loader2 className="w-10 h-10 text-[var(--primary-600)] animate-spin" /> {message && <p className="mt-4 text-[var(--text-muted-color)]">{message}</p>} </div> );
const EmptyState = ({ icon, message, description }) => ( <div className="text-center py-10 px-4 flex flex-col items-center justify-center h-full"> <div className="text-[var(--text-muted-color)] mb-3">{icon}</div> <h3 className="font-semibold text-lg text-[var(--text-color)]">{message}</h3> {description && <p className="text-sm text-[var(--text-muted-color)] mt-1">{description}</p>} </div> );
