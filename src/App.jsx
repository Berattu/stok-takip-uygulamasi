import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext, Component } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, increment, addDoc, serverTimestamp, query, orderBy, writeBatch, where, getDocs, runTransaction } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
    Building, Package, Zap, BarChartHorizontal, FileOutput, CheckCircle, ChevronDown, 
    LogIn, UserPlus, LogOut, ShoppingCart, ShoppingBag, History, Loader2, Search, Edit, Trash2, 
    AlertTriangle, PlusCircle, LayoutDashboard, DollarSign, PackageSearch, TrendingUp, 
    Camera, X, PlusSquare, BarChart3, Calendar, ArrowUp, ArrowDown, PieChart as PieIcon, 
    Clock, UserCheck, BookUser, CreditCard, Download, Undo2, Settings, Sun, Moon,
    Users, FileText, StickyNote, TrendingDown, ArrowRightLeft, Percent, Tag, MinusCircle, Folder, ClipboardCheck, Wallet, Receipt, Star, Gift, Crown, Award, Target, Save, RefreshCw, Database, Shield, Bell, Palette, Building2, MapPin, Phone, Mail, Globe, CreditCard as CardIcon, Upload, HardDrive, UserCog, Key, Eye, EyeOff, Trash, AlertCircle, CheckCircle2, GripVertical, User, PackageX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import new components
import Sidebar from './components/Layout/Sidebar';
import SalesScreenComponent from './components/Sales/SalesScreen';
import DashboardComponent from './components/Dashboard/Dashboard';
import StockManagementComponent from './components/Inventory/StockManagement';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config
    ? JSON.parse(__firebase_config) 
    : {
        apiKey: "AIzaSyAb0VoKLRJKKgst9DVC_cb2ZU5wchfdTIM",
        authDomain: "stok-takip-uygulamam-5e4a5.firebaseapp.com",
        projectId: "stok-takip-uygulamam-5e4a5",
        storageBucket: "stok-takip-uygulamam-5e4a5.appspot.com",
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
    // Firebase initialized successfully
} catch (e) {
    console.error("Firebase initialization failed:", e);
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        toast.error("Firebase yapılandırması eksik. Lütfen kod içerisindeki yerel geliştirme ayarlarını yapın.");
    }
}

// --- Virtual Scrolling Hook ---
const useVirtualScrolling = (items, itemHeight = 100, containerHeight = 400) => {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef(null);

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    return {
        containerRef,
        visibleItems,
        totalHeight,
        offsetY,
        handleScroll
    };
};

// --- Memoized Components for Performance ---
const MemoizedProductCard = React.memo(({ product, onEdit, onDelete, onStockUpdate, onPriceUpdate, formatCurrency, calculateDiscountedPrice }) => {
    return (
        <div className={`p-4 border rounded-lg ${product.stock === 0 ? 'bg-red-100' : product.stock <= (product.criticalStock || 0) ? 'bg-red-50' : 'bg-[var(--bg-color)]'}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[var(--primary-100)] rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-[var(--primary-600)]" />
                </div>
                <div className="flex-1">
                    <h3 className={`font-medium ${product.stock === 0 || product.stock <= (product.criticalStock || 0) ? 'text-gray-800' : 'text-[var(--text-color)]'}`}>
                        {product.name}
                    </h3>
                    <p className="text-sm text-[var(--text-muted-color)]">
                        Stok: {product.stock || 0} | Kategori: {product.category || 'Genel'}
                    </p>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-muted-color)]">Satış Fiyatı:</span>
                    <span className="font-medium text-[var(--text-color)]">
                        {formatCurrency(calculateDiscountedPrice(product))}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onEdit(product)}
                        className="px-3 py-2 text-xs bg-[var(--primary-100)] text-[var(--primary-700)] rounded hover:bg-[var(--primary-200)] transition-colors"
                    >
                        Düzenle
                    </button>
                    <button
                        onClick={() => onStockUpdate(product)}
                        className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                        Stok Ekle
                    </button>
                    <button
                        onClick={() => onPriceUpdate(product)}
                        className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                        Fiyat Değiştir
                    </button>
                    <button
                        onClick={() => onDelete(product.id)}
                        className="px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                        Sil
                    </button>
                </div>
            </div>
        </div>
    );
});

// --- Keyboard Shortcuts Hook ---
const useKeyboardShortcuts = (setPage) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + tuş kombinasyonları
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        setPage('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        setPage('inventory');
                        break;
                    case '3':
                        e.preventDefault();
                        setPage('sales');
                        break;
                    case '4':
                        e.preventDefault();
                        setPage('reports');
                        break;
                    case 'n':
                        e.preventDefault();
                        // Yeni ürün ekleme modal'ını aç
                        break;
                    case 's':
                        e.preventDefault();
                        // Arama yapma
                        break;
                    case 'f':
                        e.preventDefault();
                        // Filtreleme
                        break;
                }
            }
            
            // Tek tuş kısayolları
            switch (e.key) {
                case 'Escape':
                    // Modal'ları kapat
                    break;
                case 'F1':
                    e.preventDefault();
                    // Yardım
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [setPage]);
};

// --- Skeleton Loader Component ---
const SkeletonLoader = ({ type = 'card', count = 1 }) => {
    const renderSkeleton = () => {
        switch (type) {
            case 'card':
                return (
                    <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-300 rounded"></div>
                            <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                        </div>
                    </div>
                );
            case 'list':
                return (
                    <div className="flex items-center gap-4 p-4 border border-[var(--border-color)] rounded-lg animate-pulse">
                        <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                        <div className="flex-1">
                            <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-300 rounded"></div>
                    </div>
                );
            case 'table':
                return (
                    <div className="animate-pulse">
                        <div className="h-12 bg-gray-300 rounded mb-4"></div>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-16 bg-gray-300 rounded mb-2"></div>
                        ))}
                    </div>
                );
            default:
                return <div className="h-4 bg-gray-300 rounded animate-pulse"></div>;
        }
    };

    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i}>{renderSkeleton()}</div>
            ))}
        </div>
    );
};

// --- Error Boundary ---
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--surface-color)] flex items-center justify-center p-4">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-[var(--text-color)] mb-2">
                            Bir Hata Oluştu
                        </h2>
                        <p className="text-[var(--text-muted-color)] mb-4">
                            Uygulamada beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                        >
                            Sayfayı Yenile
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// --- Helper Functions ---
const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

const calculateDiscountedPrice = (product, categoryDiscounts = []) => {
    if (!product || !product.salePrice) return { finalPrice: 0, discountApplied: 0, originalPrice: 0, appliedRule: null };
    
    const originalPrice = product.salePrice;
    let discount = null;
    let appliedRule = null;

    if (product.discountValue > 0) {
        discount = { value: product.discountValue, type: product.discountType };
        appliedRule = 'product';
    } 
    else if (product.category) {
        const categoryDiscount = categoryDiscounts.find(d => d.id.toLowerCase() === product.category.toLowerCase());
        if (categoryDiscount && categoryDiscount.discountValue > 0) {
            discount = { value: categoryDiscount.discountValue, type: categoryDiscount.discountType };
            appliedRule = 'category';
        }
    }

    if (!discount) {
        return { finalPrice: originalPrice, discountApplied: 0, originalPrice: originalPrice, appliedRule: null };
    }

    let finalPrice;
    let discountApplied = 0;

    if (discount.type === 'percentage') {
        const discountAmount = (originalPrice * parseFloat(discount.value)) / 100;
        finalPrice = originalPrice - discountAmount;
        discountApplied = discountAmount;
    } else { 
        finalPrice = originalPrice - parseFloat(discount.value);
        discountApplied = parseFloat(discount.value);
    }
    
    finalPrice = Math.max(0, finalPrice);

    return { finalPrice, discountApplied, originalPrice, appliedRule };
};

// CSV export helpers
const convertToCSV = (headers, rows) => {
    const escapeCell = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value).replace(/"/g, '""');
        return /[",\n]/.test(str) ? `"${str}"` : str;
    };
    const headerLine = headers.map(h => escapeCell(h.label)).join(',');
    const dataLines = rows.map(row => headers.map(h => escapeCell(typeof h.value === 'function' ? h.value(row) : row[h.value])).join(','));
    return [headerLine, ...dataLines].join('\n');
};

const downloadCSV = (filename, headers, rows) => {
    try {
        const csv = convertToCSV(headers, rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('CSV indirilmeye hazır.');
    } catch (e) {
        console.error('CSV export error:', e);
        toast.error('CSV oluşturulurken bir hata oluştu.');
    }
};

// Print helpers for purchase receipts
const generatePurchaseReceiptHTML = (purchase) => {
    const safe = (v) => (v === null || v === undefined) ? '' : String(v);
    const dateStr = purchase.purchaseDate && purchase.purchaseDate.toDate ? purchase.purchaseDate.toDate().toLocaleString('tr-TR') : '';
    const supplier = safe(purchase.supplier);
    const invoice = safe(purchase.invoiceNumber);
    const notes = safe(purchase.notes);
    const items = Array.isArray(purchase.items) && purchase.items.length > 0
        ? purchase.items
        : [{
            barcode: safe(purchase.barcode),
            name: safe(purchase.productName),
            quantity: Number(purchase.quantity || 0),
            purchasePrice: Number(purchase.purchasePrice || 0),
            lineTotal: Number(purchase.totalCost || 0)
        }];
    const subTotal = Number(purchase.subTotal ?? items.reduce((s,i)=> s + (i.lineTotal ?? (i.quantity * i.purchasePrice)), 0));
    const vatRate = Number(purchase.vatRate || 0);
    const vatAmount = Number(purchase.vatAmount ?? (subTotal * vatRate / 100));
    const totalCost = Number(purchase.totalCost ?? (subTotal + vatAmount));

    const rowsHtml = items.map((it, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${safe(it.barcode)}</td>
            <td>${safe(it.name)}</td>
            <td class="right">${Number(it.quantity || 0)}</td>
            <td class="right">${formatCurrency(Number(it.purchasePrice || 0))}</td>
            <td class="right">${formatCurrency(Number(it.lineTotal ?? (Number(it.quantity||0) * Number(it.purchasePrice||0))))}</td>
        </tr>
    `).join('');

    return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Satın Alma Fişi</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Arial, sans-serif; padding: 24px; color: #0f172a; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  .muted { color: #64748b; font-size: 12px; }
  .section { margin-top: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
  th { background: #f8fafc; text-align: left; }
  .right { text-align: right; }
  .totals { margin-top: 12px; width: 100%; }
  .totals td { border: none; padding: 4px 0; }
  .totals .label { color: #64748b; }
  .totals .value { text-align: right; font-weight: 600; }
  @media print { button { display: none; } body { padding: 0; } }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .brand { font-weight: 800; color: #0ea5e9; }
  .notes { margin-top: 8px; font-size: 12px; color: #334155; }
  .actions { margin-top: 16px; }
  .btn { padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; cursor: pointer; }
  .btn:hover { background: #f1f5f9; }
  .foot { margin-top: 24px; font-size: 11px; color: #94a3b8; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
  .title { font-weight: 600; margin-bottom: 4px; }
  .kv { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
  .kv .k { color: #64748b; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${(purchase.companyName || 'Stok Takip')}</div>
      <h1>Satın Alma Fişi</h1>
      <div class="muted">Tarih: <span class="mono">${dateStr}</span></div>
    </div>
    <div class="grid2" style="min-width:280px;">
      <div class="box">
        <div class="title">Tedarikçi</div>
        <div class="kv"><span class="k">Ad</span><span>${supplier || '-'}</span></div>
        <div class="kv"><span class="k">Fatura No</span><span class="mono">${invoice || '-'}</span></div>
      </div>
      <div class="box">
        <div class="title">Özet</div>
        <div class="kv"><span class="k">Ara Toplam</span><span class="value">${formatCurrency(subTotal)}</span></div>
        <div class="kv"><span class="k">KDV (${vatRate}%)</span><span class="value">${formatCurrency(vatAmount)}</span></div>
        <div class="kv"><span class="k">Genel Toplam</span><span class="value">${formatCurrency(totalCost)}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Barkod</th>
          <th>Ürün</th>
          <th class="right">Miktar</th>
          <th class="right">Birim Alış</th>
          <th class="right">Tutar</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>

  ${notes ? `<div class="notes"><strong>Not:</strong> ${notes}</div>` : ''}

  <div class="actions">
    <button class="btn" onclick="window.print()">Yazdır</button>
  </div>

  <div class="foot">Bu fiş Stok Takip Sistemi tarafından oluşturulmuştur.</div>
</body>
</html>`;
};

const printPurchaseReceipt = (purchase) => {
    try {
        const html = generatePurchaseReceiptHTML({ ...purchase, companyName: (purchase.companyName || window?.__company_name || '') });
        const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
        if (!win) {
            toast.error('Yazdırma penceresi engellendi. Lütfen açılır pencere iznini verin.');
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        // Some browsers auto block; user can press the print button in the page
    } catch (e) {
        console.error('Print error:', e);
        toast.error('Fiş oluşturulurken bir hata oluştu.');
    }
};


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
            // Auth state changed
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
        const root = document.documentElement;
        
        // Set theme data attribute
        root.setAttribute('data-theme', t);
        
        // Set palette data attribute
        root.setAttribute('data-palette', p);
        
        // Update body class for theme
        document.body.className = t === 'dark' ? 'dark' : 'light';
    }, []);

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
        <ErrorBoundary>
            <AuthProvider>
                <ThemeProvider>
                    <LanguageProvider>
                        <NotificationProvider>
                            <PageProvider>
                                <Main />
                            </PageProvider>
                        </NotificationProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </AuthProvider>
        </ErrorBoundary>
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

            <main className="relative">
                {/* Hero Section */}
                <div className="relative isolate px-6 pt-20 lg:px-8 overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 -z-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                    </div>
                    
                    <div className="mx-auto max-w-7xl py-32 sm:py-48 lg:py-56">
                        <div className="text-center">
                            {/* Logo ve Başlık */}
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <div className="relative">
                                    <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                                        <Building className="h-12 w-12 text-white" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                                </div>
                                <div className="text-left">
                                    <h1 className="text-5xl font-black text-white mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent sm:text-7xl">
                                        StokMaster Pro
                                    </h1>
                                    <p className="text-blue-200 text-xl font-medium">Profesyonel Stok Yönetim Sistemi</p>
                                </div>
                            </div>
                            
                            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6">
                                İşletmeniz için Modern
                                <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    Stok Yönetimi
                                </span>
                            </h2>
                            
                            <p className="mt-6 text-xl leading-8 text-blue-100 max-w-3xl mx-auto">
                                Satışlarınızı hızlandırın, stoklarınızı kontrol altında tutun ve veriye dayalı kararlar alarak işletmenizi büyütün. 
                                <span className="block mt-2 font-semibold text-white">Hepsi tek bir platformda.</span>
                            </p>
                            
                            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button 
                                    onClick={() => setPage('login')} 
                                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/25"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Hemen Başla
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </button>
                                
                                <button 
                                    onClick={() => setPage('login')} 
                                    className="px-8 py-4 border-2 border-white/30 text-white font-semibold text-lg rounded-2xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                                >
                                    Demo İzle
                                </button>
                            </div>
                            
                            {/* İstatistikler */}
                            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">500+</div>
                                    <div className="text-blue-200 text-sm">Aktif İşletme</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">99.9%</div>
                                    <div className="text-blue-200 text-sm">Uptime</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">24/7</div>
                                    <div className="text-blue-200 text-sm">Destek</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <HowItWorksSection />

                {/* Features Section */}
                <div className="bg-gradient-to-b from-gray-900 to-gray-800 py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-blue-400">Her Şey Kontrol Altında</h2>
                            <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">İşletmenizi Büyütecek Özellikler</p>
                            <p className="mt-6 text-lg leading-8 text-gray-300">Karmaşık tablolara ve manuel takibe son. İhtiyacınız olan her şey, basit ve anlaşılır bir arayüzde.</p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-6xl">
                            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                {features.map((feature, index) => (
                                    <div key={feature.title} className="group relative bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white group-hover:scale-110 transition-transform duration-300">
                                                {feature.icon}
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                                        </div>
                                        <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                                        <div className="absolute top-4 right-4 text-2xl font-bold text-white/20">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
        console.log("Authentication attempt:", { email, isLogin, rememberMe });
        
        try {
            const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);
            console.log("Persistence set successfully");

            if (isLogin) {
                console.log("Attempting sign in...");
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log("Sign in successful:", userCredential.user);
                toast.success("Başarıyla giriş yapıldı!");
            } else {
                console.log("Attempting sign up...");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log("Sign up successful:", userCredential.user);
                toast.success("Hesabınız başarıyla oluşturuldu! Giriş yapılıyor...");
            }
            // onAuthStateChanged will handle navigation to the 'app' page
        } catch (error) {
            console.error("Authentication error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            
            let errorMessage = 'Giriş bilgileri hatalı veya kullanıcı bulunamadı.';
            
            if (error.code === 'auth/weak-password') {
                errorMessage = 'Şifre en az 6 karakter olmalıdır.';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Bu e-posta adresi zaten kullanılıyor.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Şifre hatalı.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Geçersiz e-posta adresi.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
            }
            
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Test Firebase connection
    const testFirebaseConnection = async () => {
        try {
            // Testing Firebase connection...
            
            // Test Firestore connection
            const testDoc = doc(db, 'test', 'connection');
            await setDoc(testDoc, { test: true, timestamp: serverTimestamp() });
            // Firestore connection test successful
            
            // Test Auth
            // Current auth user and auth ready status checked
            
            toast.success("Firebase bağlantısı başarılı!");
        } catch (error) {
            console.error("Firebase connection test failed:", error);
            toast.error("Firebase bağlantı hatası: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="max-w-6xl w-full mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center gap-6 mb-8">
                        <div className="relative">
                            <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                                <Building className="h-16 w-16 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                        <div className="text-left">
                            <h1 className="text-6xl font-black text-white mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                                StokMaster Pro
                            </h1>
                            <p className="text-blue-200 text-xl font-medium">Profesyonel Stok Yönetim Sistemi</p>
                        </div>
                    </div>
                    <p className="text-blue-100 text-xl max-w-3xl mx-auto leading-relaxed">
                        Modern, hızlı ve kullanıcı dostu stok takip sistemi ile işletmenizi dijitalleştirin
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Package className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Stok Yönetimi</h3>
                        <p className="text-blue-100 text-sm leading-relaxed">Ürünlerinizi kolayca ekleyin, düzenleyin ve stok durumlarını takip edin</p>
                    </div>
                    <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <ShoppingCart className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Satış İşlemleri</h3>
                        <p className="text-blue-100 text-sm leading-relaxed">Hızlı satış, sepet modu ve çoklu ödeme yöntemleri</p>
                    </div>
                    <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <BarChart3 className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Raporlama</h3>
                        <p className="text-blue-100 text-sm leading-relaxed">Detaylı analizler ve gerçek zamanlı istatistikler</p>
                    </div>
                </div>

                {/* Login Form */}
                <div className="max-w-lg mx-auto">
                    <div className="text-center mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => setPage('welcome')} className="text-sm font-semibold leading-6 text-blue-200 hover:text-white transition-colors">
                                &larr; Ana Sayfa
                            </button>
                            <button 
                                onClick={testFirebaseConnection}
                                className="text-xs px-3 py-1 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                            >
                                Firebase Test
                            </button>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Giriş Yapın</h2>
                        <p className="text-blue-200">Hesabınıza giriş yapın veya yeni bir hesap oluşturun</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-white/20">
                        <form onSubmit={handleAuthAction} className="space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-white mb-3">E-posta Adresi</label>
                                    <input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        autoComplete="email" 
                                        required 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        className="w-full px-5 py-4 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 bg-white/10 text-white placeholder-blue-200 backdrop-blur-sm" 
                                        placeholder="ornek@email.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-white mb-3">Şifre</label>
                                    <input 
                                        id="password" 
                                        name="password" 
                                        type="password" 
                                        autoComplete="current-password" 
                                        required 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        className="w-full px-5 py-4 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 bg-white/10 text-white placeholder-blue-200 backdrop-blur-sm" 
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input 
                                        id="remember-me" 
                                        name="remember-me" 
                                        type="checkbox" 
                                        checked={rememberMe} 
                                        onChange={(e) => setRememberMe(e.target.checked)} 
                                        className="h-4 w-4 rounded border-white/30 text-blue-500 focus:ring-blue-400 bg-white/10" 
                                    />
                                    <label htmlFor="remember-me" className="ml-3 block text-sm text-white">Beni Hatırla</label>
                                </div>
                                <button type="button" className="text-sm text-blue-200 hover:text-white transition-colors">
                                    Şifremi Unuttum
                                </button>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl hover:shadow-blue-500/25 transform hover:scale-[1.02]"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
                                <span className="text-lg">{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
                            </button>
                        </form>
                        
                        <div className="mt-8 pt-6 border-t border-white/20">
                            <p className="text-center text-sm text-blue-200">
                                {isLogin ? "Hesabınız yok mu?" : "Zaten bir hesabınız var mı?"}
                                <button 
                                    onClick={() => setIsLogin(!isLogin)} 
                                    className="font-semibold text-white hover:text-blue-200 ml-2 transition-colors"
                                >
                                    {isLogin ? 'Kayıt Olun' : 'Giriş Yapın'}
                                </button>
                            </p>
                        </div>
                    </div>
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

const SidebarWrapper = ({ activePage, setActivePage, user, isSidebarOpen, setIsSidebarOpen, settings }) => {
    const { setPage } = usePage();

    const handleLogout = () => signOut(auth).then(() => setPage('landing'));

    return (
        <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            user={user}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            onLogout={handleLogout}
            settings={settings}
        />
    );
};

const TopBar = ({ user, settings, onUpdateSettings }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const { notifications, isEnabled, requestPermission, sendNotification, markAsRead, clearAll } = useNotifications();
    const { language, setLanguage, t } = useLanguage();
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    return (
        <header className="flex-shrink-0 h-16 bg-[var(--bg-color)] border-b border-[var(--border-color)] flex items-center justify-between px-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--text-color)]">{settings.companyName || t('app.company')}</h1>
            </div>
            <div className="flex items-center gap-4">
                {/* Notification Button */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className="relative p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors"
                        title="Bildirimler"
                    >
                        <Bell className="w-5 h-5 text-[var(--text-color)]" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    
                    {/* Notification Dropdown */}
                    {isNotificationOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg shadow-lg z-50">
                            <div className="p-4 border-b border-[var(--border-color)]">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-[var(--text-color)]">Bildirimler</h3>
                                    <div className="flex gap-2">
                                        {!isEnabled && (
                                            <button
                                                onClick={requestPermission}
                                                className="px-2 py-1 text-xs bg-[var(--primary-600)] text-white rounded hover:bg-[var(--primary-700)]"
                                            >
                                                Etkinleştir
                                            </button>
                                        )}
                                        {notifications.length > 0 && (
                                            <button
                                                onClick={clearAll}
                                                className="px-2 py-1 text-xs bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-color)] rounded hover:bg-[var(--surface-hover-color)]"
                                            >
                                                Temizle
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-[var(--text-muted-color)]">
                                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>Henüz bildirim yok</p>
                                    </div>
                                ) : (
                                    notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            onClick={() => markAsRead(notification.id)}
                                            className={`p-3 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--surface-hover-color)] ${
                                                !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            }`}
                                        >
                                            <p className="text-sm font-medium text-[var(--text-color)]">
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted-color)]">
                                                {notification.timestamp.toLocaleTimeString('tr-TR')}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Language Selector */}
                <div className="relative">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="px-3 py-1 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                    >
                        <option value="tr">🇹🇷 TR</option>
                        <option value="en">🇺🇸 EN</option>
                    </select>
                </div>
                
                <div className="text-right">
                    <p className="text-sm font-medium text-[var(--text-color)]">{user.email}</p>
                    <p className="text-xs text-[var(--text-muted-color)]">Admin</p>
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-[var(--surface-color)]">
                    <Settings />
                </button>
            </div>
            <AnimatePresence>
                {isSettingsOpen && <SettingsPanel currentSettings={settings} onSave={onUpdateSettings} onClose={() => setIsSettingsOpen(false)} />}
            </AnimatePresence>
        </header>
    );
};

const StockAppLayout = ({ user }) => {
    const { applyTheme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const userId = user.uid;
    const [activePage, setActivePage] = useState('salesScreen');
    
    // Keyboard shortcuts
    useKeyboardShortcuts(setActivePage);
    
    // All data states
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [payments, setPayments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [cashDrawer, setCashDrawer] = useState({ sessions: [], activeSession: null });
    const [stockCounts, setStockCounts] = useState([]);
    const [categoryDiscounts, setCategoryDiscounts] = useState([]);
    const [customerPoints, setCustomerPoints] = useState([]);
    const [notes, setNotes] = useState([]);
    const [settings, setSettings] = useState({ 
        theme: 'light', 
        palette: 'teal', 
        criticalStockLevel: 5, 
        costMethod: 'last', 
        defaultMarkupPercent: 0, 
        autoUpdateSalePrice: false,
        companyName: 'İşletmem',
        companyLogoUrl: '',
        companyAddress: '',
        companyTaxNumber: '',
        enabledSections: {
            main: true,
            inventory: true,
            purchasing: true,
            finance: true,
            customers: true,
            reports: true,
            tools: true
        },
        enabledFeatures: {
            // Ana İşlemler
            'salesScreen': true,
            'quickSale': true,
            'dashboard': true,
            // Stok Yönetimi
            'stock': true,
            'stockCount': true,
            'lowStock': true,
            'categories': true,
            // Satın Alma
            'purchases': true,
            'suppliers': true,
            'purchaseOrders': true,
            // Finans
            'cashDrawer': true,
            'expenses': true,
            'credit': true,
            'payments': true,
            // Müşteriler
            'customers': true,
            // Raporlar
            'statistics': true,
            'history': true,
            'reports': true,
            'analytics': true,
            // Araçlar
            'discounts': true,
            'settings': true, // Bu asla kapatılamaz
            'backup': true,
            'notes': true
        },
        sidebarOrder: [
            'main', 'inventory', 'purchasing', 'finance', 'customers', 'reports', 'tools'
        ]
    });
    
    const [loading, setLoading] = useState({
        // Ana veriler - hemen yükle
        products: true, 
        sales: true, 
        categories: true,
        notes: true,
        settings: true,
        // İkincil veriler - lazy loading
        purchases: false, 
        suppliers: false,
        expenses: false, 
        expenseCategories: false,
        stockCounts: false, 
        payments: false, 
        customers: false,
        categoryDiscounts: false,
        cashDrawer: true
    });

    // All paths
    const paths = useMemo(() => ({
        products: `artifacts/${appId}/users/${userId}/products`,
        sales: `artifacts/${appId}/users/${userId}/sales`,
        purchases: `artifacts/${appId}/users/${userId}/purchases`,
        purchaseOrders: `artifacts/${appId}/users/${userId}/purchase_orders`,
        payments: `artifacts/${appId}/users/${userId}/payments`,
        customers: `artifacts/${appId}/users/${userId}/customers`,
        suppliers: `artifacts/${appId}/users/${userId}/suppliers`,
        categories: `artifacts/${appId}/users/${userId}/categories`,
        stockCounts: `artifacts/${appId}/users/${userId}/stock_counts`,
        expenses: `artifacts/${appId}/users/${userId}/expenses`,
        expenseCategories: `artifacts/${appId}/users/${userId}/expense_categories`,
        cashDrawerSessions: `artifacts/${appId}/users/${userId}/cash_drawer_sessions`,
        categoryDiscounts: `artifacts/${appId}/users/${userId}/categoryDiscounts`,
        customerPoints: `artifacts/${appId}/users/${userId}/customer_points`,
        notes: `artifacts/${appId}/users/${userId}/notes`,
        settings: `artifacts/${appId}/users/${userId}/settings`,
    }), [userId]);

    // Firestore listeners
    useEffect(() => {
        if (!userId) return;
        const unsubscribers = [];
        const createListener = (path, setter, stateKey, orderField = null, orderDirection = 'desc') => {
            const collRef = orderField ? query(collection(db, path), orderBy(orderField, orderDirection)) : collection(db, path);
            const unsubscribe = onSnapshot(collRef, (snapshot) => {
                setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(prev => ({ ...prev, [stateKey]: false }));
            }, (error) => {
                console.error(`Error fetching ${stateKey}:`, error);
                setLoading(prev => ({ ...prev, [stateKey]: false }));
            });
            unsubscribers.push(unsubscribe);
        };

        // Ana veriler - sık kullanılan
        createListener(paths.products, setProducts, 'products', 'name', 'asc');
        createListener(paths.sales, setSales, 'sales', 'saleDate');
        createListener(paths.categories, setCategories, 'categories', 'name', 'asc');
        createListener(paths.notes, setNotes, 'notes', 'createdAt', 'desc');
        
        // İkincil veriler - daha az sık kullanılan (lazy loading için)
        const secondaryData = [
            { path: paths.purchases, setter: setPurchases, key: 'purchases', order: 'purchaseDate' },
            { path: paths.suppliers, setter: setSuppliers, key: 'suppliers', order: 'name', direction: 'asc' },
            { path: paths.expenses, setter: setExpenses, key: 'expenses', order: 'date' },
            { path: paths.purchaseOrders, setter: setPurchaseOrders, key: 'purchaseOrders', order: 'createdAt' },
            { path: paths.payments, setter: setPayments, key: 'payments', order: 'date' },
            { path: paths.customers, setter: setCustomers, key: 'customers', order: 'name', direction: 'asc' },
            { path: paths.expenseCategories, setter: setExpenseCategories, key: 'expenseCategories', order: 'name', direction: 'asc' },
            { path: paths.categoryDiscounts, setter: setCategoryDiscounts, key: 'categoryDiscounts' },
            { path: paths.customerPoints, setter: setCustomerPoints, key: 'customerPoints', order: 'totalPoints', direction: 'desc' },
            { path: paths.stockCounts, setter: setStockCounts, key: 'stockCounts', order: 'startTime', direction: 'desc' }
        ];

        // İkincil verileri sadece ihtiyaç duyulduğunda yükle
        const loadSecondaryData = () => {
            secondaryData.forEach(({ path, setter, key, order, direction = 'desc' }) => {
                createListener(path, setter, key, order, direction);
            });
        };

        // İlk yüklemede sadece ana verileri yükle
        // İkincil veriler sayfa değişimlerinde yüklenecek

        const unsubSettings = onSnapshot(doc(db, paths.settings, 'appSettings'), (docSnap) => {
            if(docSnap.exists()) {
                const newSettings = {...docSnap.data()};
                setSettings(prev => ({...prev, ...newSettings}));
                
                // Apply theme from settings
                if (newSettings.theme && newSettings.palette) {
                    applyTheme(newSettings.theme, newSettings.palette);
                }
            }
            setLoading(prev => ({ ...prev, settings: false }));
        });
        unsubscribers.push(unsubSettings);

        const q = query(collection(db, paths.cashDrawerSessions), orderBy('startTime', 'desc'));
        const unsubCashDrawer = onSnapshot(q, (snapshot) => {
            const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const activeSession = sessions.find(s => !s.endTime) || null;
            setCashDrawer({ sessions, activeSession });
            setLoading(prev => ({ ...prev, cashDrawer: false }));
        });
        unsubscribers.push(unsubCashDrawer);

        return () => unsubscribers.forEach(unsub => unsub());
    }, [userId, paths]);

    const handleUpdateSettings = async (newSettings) => {
        await setDoc(doc(db, paths.settings, 'appSettings'), newSettings, { merge: true });
        toast.success("Ayarlar kaydedildi!");
    };


    const handleCancelSale = useCallback(async (saleToCancel) => {
        if (!saleToCancel || !saleToCancel.items || saleToCancel.items.length === 0) {
            toast.error("İptal edilecek ürün bilgisi bulunamadı.");
            return;
        }

        if (saleToCancel.type === 'cancelled') {
            toast.warning("Bu işlem zaten iptal edilmiş.");
            return;
        }

        const batch = writeBatch(db);

        try {
            saleToCancel.items.forEach(item => {
                if (item.productId) {
                    const productRef = doc(db, paths.products, item.productId);
                    batch.update(productRef, { stock: increment(item.quantity) });
                }
            });

            const saleRef = doc(db, paths.sales, saleToCancel.id);
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
    }, [paths.products, paths.sales]);
    // Sepet state'i
    const [cart, setCart] = useState([]);

    // Sepet fonksiyonları
    const handleAddToCart = useCallback((product) => {
        if (product.stock <= 0) {
            toast.warning(`${product.name} için stok tükendi!`);
            return;
        }
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    toast.warning(`Maksimum stok adedine ulaşıldı: ${product.stock}`);
                    return prevCart;
                }
                return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            } else {
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
        toast.success(`${product.name} sepete eklendi.`);
    }, []);

    const handleUpdateCartQuantity = (productId, newQuantity) => {
        setCart(prevCart => {
            const productInCart = prevCart.find(item => item.id === productId);
            const productInStock = products.find(p => p.id === productId);
            if (newQuantity > productInStock.stock) {
                toast.warning(`Maksimum stok adedine ulaşıldı: ${productInStock.stock}`);
                return prevCart;
            }
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== productId);
            }
            return prevCart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item);
        });
    };

    const handleRemoveFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    };

    const handleClearCart = () => {
        setCart([]);
    };

    const handleFinalizeSale = async (paymentMethod, transactionDiscount, customerInfo = null) => {
        if (cart.length === 0) {
            toast.warning("Sepetiniz boş.");
            return;
        }

        const batch = writeBatch(db);
        const saleRef = doc(collection(db, paths.sales));

        let total = 0;
        const itemsForSale = cart.map(item => {
            const { finalPrice, discountApplied, originalPrice, appliedRule } = calculateDiscountedPrice(item, categoryDiscounts);
            total += finalPrice * item.quantity;
            
            // Stok güncelleme
            const productRef = doc(db, paths.products, item.id);
            batch.update(productRef, { stock: increment(-item.quantity) });

            return {
                productId: item.id,
                name: item.name,
                quantity: item.quantity,
                price: finalPrice,
                originalPrice: originalPrice,
                purchasePrice: item.purchasePrice || 0,
                discountApplied: discountApplied * item.quantity,
                discountRule: appliedRule
            };
        });

        const finalTotal = Math.max(0, total - transactionDiscount);

        const saleData = {
            type: paymentMethod === 'credit' ? 'credit' : paymentMethod === 'personnel' ? 'personnel' : 'sale',
            status: paymentMethod === 'credit' ? 'unpaid' : 'completed',
            paymentMethod: paymentMethod === 'credit' || paymentMethod === 'personnel' ? null : (paymentMethod === 'card' ? 'kart' : paymentMethod === 'cash' ? 'nakit' : paymentMethod),
            saleDate: serverTimestamp(),
            total: paymentMethod === 'personnel' ? 0 : finalTotal,
            subTotal: total,
            transactionDiscount: transactionDiscount,
            items: itemsForSale,
            // Customer info (optional)
            customerName: customerInfo?.name || null,
            customerPhone: customerInfo?.phone || null,
            customerEmail: customerInfo?.email || null
        };

        batch.set(saleRef, saleData);

        await toast.promise(batch.commit(), {
            loading: 'Satış tamamlanıyor...',
            success: 'Satış başarıyla tamamlandı!',
            error: 'Satış sırasında bir hata oluştu.'
        });

        // Send notification for successful sale
        const { sendNotification } = useNotifications();
        sendNotification(`Satış Tamamlandı - ${formatCurrency(finalTotal)}`, {
            body: `${cart.length} ürün satıldı`,
            tag: 'sale-completed'
        });

        handleClearCart();
    };

    // Ürün yönetimi fonksiyonları
    const handleAddOrUpdateProduct = useCallback(async (productData) => {
        const { barcode, name } = productData;
        const productRef = doc(db, paths.products, barcode);
        
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
    }, [paths.products, settings.criticalStockLevel]);

    const handleDeleteProduct = useCallback((id, name) => {
        const productRef = doc(db, paths.products, id);
        toast.promise(deleteDoc(productRef), { loading: `${name} siliniyor...`, success: `${name} başarıyla silindi.`, error: `Silme işlemi sırasında hata oluştu.` });
    }, [paths.products]);

    // Instant sale (Quick Sale) handler
    const handleInstantSale = useCallback(async (product, method = 'cash') => {
        try {
            if (!product || product.stock <= 0) {
                toast.warning('Stok yetersiz veya ürün bulunamadı.');
                return;
            }
            const { finalPrice, discountApplied, originalPrice, appliedRule } = calculateDiscountedPrice(product, categoryDiscounts);
            const saleRef = doc(collection(db, paths.sales));
            const productRef = doc(db, paths.products, product.id);
            const batch = writeBatch(db);
            batch.update(productRef, { stock: increment(-1) });
            batch.set(saleRef, {
                type: method === 'credit' ? 'credit' : method === 'personnel' ? 'personnel' : 'sale',
                status: method === 'credit' ? 'unpaid' : 'completed',
                paymentMethod: method === 'credit' || method === 'personnel' ? null : (method === 'card' ? 'kart' : method === 'cash' ? 'nakit' : method),
                saleDate: serverTimestamp(),
                total: method === 'personnel' ? 0 : finalPrice,
                subTotal: finalPrice,
                transactionDiscount: 0,
                items: [{
                    productId: product.id,
                    name: product.name,
                    quantity: 1,
                    price: finalPrice,
                    originalPrice: originalPrice,
                    purchasePrice: product.purchasePrice || 0,
                    discountApplied,
                    discountRule: appliedRule
                }]
            });
            const labels = { cash: 'Nakit', card: 'Kart', credit: 'Veresiye', personnel: 'Personel' };
            await toast.promise(batch.commit(), { 
                loading: 'Satış işleniyor...', 
                success: `${product.name} satıldı (${labels[method] || method})`, 
                error: 'Satış sırasında hata' 
            });
        } catch (e) {
            console.error(e);
            toast.error('Satış tamamlanamadı');
        }
    }, [paths.sales, paths.products, categoryDiscounts, calculateDiscountedPrice]);

    const renderActivePage = () => {

        switch (activePage) {
            case 'salesScreen': return <SalesScreenComponent {...{
                products, 
                categoryDiscounts, 
                paths,
                onAddToCart: handleAddToCart,
                onUpdateCartQuantity: handleUpdateCartQuantity,
                onRemoveFromCart: handleRemoveFromCart,
                onClearCart: handleClearCart,
                onFinalizeSale: handleFinalizeSale,
                onInstantSale: handleInstantSale,
                quickMode: activePage === 'quickSale',
                cart,
                formatCurrency,
                calculateDiscountedPrice,
                paymentMethod: 'cash' // Default payment method for sepet mode
            }} />;
            case 'quickSale': return <SalesScreenComponent {...{
                products,
                categoryDiscounts,
                paths,
                onAddToCart: handleAddToCart,
                onUpdateCartQuantity: handleUpdateCartQuantity,
                onRemoveFromCart: handleRemoveFromCart,
                onClearCart: handleClearCart,
                onFinalizeSale: handleFinalizeSale,
                onInstantSale: handleInstantSale,
                quickMode: true,
                cart,
                formatCurrency,
                calculateDiscountedPrice,
                paymentMethod: 'cash' // Default payment method for quick sale
            }} />;
            case 'dashboard': 
                if (loading.products || loading.sales) {
                    return (
                        <div className="p-6">
                            <div className="mb-6">
                                <SkeletonLoader type="card" count={1} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <SkeletonLoader type="card" count={3} />
                            </div>
                        </div>
                    );
                }
                return <DashboardComponent {...{products, sales, onNavigate: setActivePage}} />;
            case 'statistics': return <StatisticsPage {...{sales, products}} />;
            case 'stock': return <StockManagementComponent {...{
                products, 
                categoryDiscounts, 
                paths, 
                settings,
                onAddOrUpdateProduct: handleAddOrUpdateProduct,
                onDeleteProduct: handleDeleteProduct,
                formatCurrency,
                calculateDiscountedPrice
            }} />;
            case 'purchases': return (
                <PurchasesPage
                    {...{
                        products,
                        purchases,
                        suppliers,
                        productsPath: paths.products,
                        purchasesPath: paths.purchases,
                        suppliersPath: paths.suppliers,
                        settings
                    }}
                />
            );
            case 'suppliers': return (
                <SuppliersPage
                    {...{
                        suppliers,
                        suppliersPath: paths.suppliers,
                        purchases
                    }}
                />
            );
            case 'discounts': return (
                <DiscountsPage
                    {...{
                        products,
                        categoryDiscounts,
                        categoryDiscountsPath: paths.categoryDiscounts,
                        onUpdateProduct: handleAddOrUpdateProduct
                    }}
                />
            );
            case 'categories': return (
                <CategoriesPage
                    {...{
                        categories,
                        categoriesPath: paths.categories,
                        products,
                        onUpdateProduct: handleAddOrUpdateProduct,
                        formatCurrency
                    }}
                />
            );
            case 'credit': return <CreditPage {...{sales, salesPath: paths.sales}} />;
            case 'history': return <SalesHistory {...{sales, onCancelSale: handleCancelSale}} />;
            case 'expenses': return (
                <ExpensesPage
                    {...{
                        expenses,
                        expenseCategories,
                        expensesPath: paths.expenses,
                        expenseCategoriesPath: paths.expenseCategories
                    }}
                />
            );
            case 'cashDrawer': return (
                <CashDrawerPage
                    {...{
                        cashDrawer,
                        cashDrawerPath: paths.cashDrawerSessions
                    }}
                />
            );
            case 'reports': return (
                <ReportsPage
                    {...{
                        sales,
                        purchases,
                        products,
                        expenses,
                        payments,
                        customers
                    }}
                />
            );
            case 'stockCount': return (
                <StockCountPage
                    {...{
                        products,
                        stockCounts,
                        stockCountsPath: paths.stockCounts,
                        productsPath: paths.products
                    }}
                />
            );
            case 'lowStock': return (
                <LowStockPage
                    {...{
                        products,
                        defaultCriticalLevel: settings.criticalStockLevel || 5,
                        onUpdateProduct: handleAddOrUpdateProduct
                    }}
                />
            );
            case 'purchaseOrders': return (
                <PurchaseOrdersPage
                    {...{
                        suppliers,
                        products,
                        purchaseOrders,
                        purchaseOrdersPath: paths.purchaseOrders,
                        productsPath: paths.products
                    }}
                />
            );
            case 'payments': return (
                <PaymentsPage
                    {...{
                        payments,
                        paymentsPath: paths.payments
                    }}
                />
            );
            case 'customers': return (
                <CustomersPage
                    {...{
                        customers,
                        customersPath: paths.customers,
                        sales
                    }}
                />
            );
            case 'analytics': return (
                <AnalyticsPage
                    {...{
                        sales,
                        purchases,
                        products,
                        expenses,
                        payments,
                        customers
                    }}
                />
            );
            case 'settings': return (
                <SettingsPage
                    {...{
                        settings,
                        setSettings,
                        settingsPath: paths.settings
                    }}
                />
            );
            case 'backup': return (
                <BackupPage
                    {...{
                        products,
                        sales,
                        purchases,
                        suppliers,
                        customers,
                        categories,
                        expenses,
                        payments,
                        customerPoints
                    }}
                />
            );
            case 'notes': return (
                <NotesPage
                    {...{
                        notes,
                        notesPath: paths.notes
                    }}
                />
            );
            default: return <div className="p-4">Sayfa bulunamadı.</div>;
        }
    };
    
    if (Object.values(loading).some(Boolean)) {
        return <LoadingSpinner fullPage={true} message="Veriler yükleniyor..." />;
    }

    return (
        <div className="flex h-screen bg-[var(--bg-color)]">
            <SidebarWrapper activePage={activePage} setActivePage={setActivePage} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} settings={settings} />
            <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
                <TopBar user={user} settings={settings} onUpdateSettings={handleUpdateSettings} />
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--surface-color)]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activePage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderActivePage()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};


// --- All Other Child Components ---
// Kategoriler Sayfası
const CategoriesPage = ({ categories, categoriesPath, products, onUpdateProduct, formatCurrency }) => {
    const [form, setForm] = useState({ id: '', name: '', color: '#0ea5a5', parentId: '', isActive: true });
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bulkUpdateModal, setBulkUpdateModal] = useState({ show: false, category: null });

    // Kategorileri ürün sayılarıyla birlikte hesapla
    const categoriesWithStats = useMemo(() => {
        const categoryStats = {};
        (products || []).forEach(product => {
            const category = product.category || 'Kategorisiz';
            if (!categoryStats[category]) {
                categoryStats[category] = {
                    name: category,
                    productCount: 0,
                    totalValue: 0,
                    lowStockCount: 0,
                    outOfStockCount: 0
                };
            }
            categoryStats[category].productCount++;
            categoryStats[category].totalValue += (product.stock || 0) * (product.salePrice || 0);
            if ((product.stock || 0) <= 0) categoryStats[category].outOfStockCount++;
            else if ((product.stock || 0) <= (product.criticalStockLevel || 5)) categoryStats[category].lowStockCount++;
        });
        return Object.values(categoryStats);
    }, [products]);

    const list = useMemo(() => categoriesWithStats.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase())), [categoriesWithStats, search]);

    const saveCategory = async (e) => {
        e.preventDefault();
        const name = (form.name || '').trim();
        if (!name) { toast.warning('Kategori adı zorunludur.'); return; }
        const id = editingId || name;
        const ref = doc(db, categoriesPath, id);
        const data = { name, color: form.color || '#0ea5a5', parentId: form.parentId || null, isActive: !!form.isActive, updatedAt: serverTimestamp() };
        await toast.promise(setDoc(ref, data, { merge: true }), { loading: 'Kaydediliyor...', success: 'Kategori kaydedildi.', error: 'Kayıt sırasında hata oluştu.' });
        setForm({ id: '', name: '', color: '#0ea5a5', parentId: '', isActive: true });
        setEditingId(null);
    };

    const editCategory = (cat) => {
        setEditingId(cat.id || cat.name);
        setForm({ id: cat.id || cat.name, name: cat.name || '', color: cat.color || '#0ea5a5', parentId: cat.parentId || '', isActive: cat.isActive !== false });
    };

    const deleteCategory = async (id) => {
        const ref = doc(db, categoriesPath, id);
        await toast.promise(deleteDoc(ref), { loading: 'Siliniyor...', success: 'Kategori silindi.', error: 'Silme sırasında hata.' });
        if (editingId === id) { setEditingId(null); setForm({ id: '', name: '', color: '#0ea5a5', parentId: '', isActive: true }); }
    };

    const getCategoryProducts = (categoryName) => {
        return (products || []).filter(p => (p.category || 'Kategorisiz') === categoryName);
    };

    const handleBulkPriceUpdate = async (categoryName, updateType, value) => {
        const categoryProducts = getCategoryProducts(categoryName);
        if (categoryProducts.length === 0) {
            toast.warning('Bu kategoride ürün bulunamadı.');
            return;
        }

        try {
            const batch = writeBatch(db);
            const updates = [];

            categoryProducts.forEach(product => {
                const currentPrice = product.salePrice || 0;
                let newPrice = currentPrice;

                if (updateType === 'percentage') {
                    newPrice = currentPrice * (1 + (value / 100));
                } else if (updateType === 'fixed') {
                    newPrice = currentPrice + value;
                } else if (updateType === 'set') {
                    newPrice = value;
                }

                newPrice = Math.max(0, newPrice); // Fiyat negatif olamaz

                if (newPrice !== currentPrice) {
                    const productRef = doc(db, 'artifacts', 'default-app-id', 'users', 'default-user', 'products', product.id);
                    batch.update(productRef, { 
                        salePrice: newPrice,
                        updatedAt: serverTimestamp()
                    });
                    updates.push({ id: product.id, name: product.name, oldPrice: currentPrice, newPrice });
                }
            });

            if (updates.length > 0) {
                await batch.commit();
                toast.success(`${updates.length} ürünün fiyatı güncellendi.`);
                setBulkUpdateModal({ show: false, category: null });
            } else {
                toast.info('Güncellenecek ürün bulunamadı.');
            }
        } catch (error) {
            console.error('Bulk price update error:', error);
            toast.error('Fiyat güncelleme sırasında hata oluştu.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-color)]">Kategoriler</h1>
                    <p className="text-[var(--text-muted-color)]">Ürün kategorilerini yönetin ve toplu işlemler yapın</p>
                </div>
            </div>

            {/* Kategori İstatistikleri */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Toplam Kategori</p>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{categoriesWithStats.length}</p>
                        </div>
                        <Folder className="w-8 h-8 text-[var(--primary-600)]" />
                    </div>
                </div>
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Toplam Ürün</p>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{products?.length || 0}</p>
                        </div>
                        <Package className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Kritik Stok</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {categoriesWithStats.reduce((sum, cat) => sum + cat.lowStockCount, 0)}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                </div>
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Stok Tükendi</p>
                            <p className="text-2xl font-bold text-red-600">
                                {categoriesWithStats.reduce((sum, cat) => sum + cat.outOfStockCount, 0)}
                            </p>
                        </div>
                        <PackageX className="w-8 h-8 text-red-600" />
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Kategori Ekleme Formu */}
                <div className="lg:col-span-1">
                    <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-4">Kategori Ekle/Düzenle</h3>
                        <form onSubmit={saveCategory} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Kategori Adı</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                                    placeholder="Kategori adını girin"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Renk</label>
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="w-full h-10 border border-[var(--border-color)] rounded-lg"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                    className="rounded"
                                />
                                <label htmlFor="isActive" className="text-sm text-[var(--text-color)]">Aktif</label>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]">
                                    {editingId ? 'Güncelle' : 'Kaydet'}
                                </button>
                                {editingId && (
                                    <button type="button" onClick={() => { setEditingId(null); setForm({ id: '', name: '', color: '#0ea5a5', parentId: '', isActive: true }); }} className="px-4 py-2 border border-[var(--border-color)] rounded-lg">
                                        İptal
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Kategoriler Listesi */}
                <div className="lg:col-span-2">
                    <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Kategoriler</h3>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] w-64"
                                placeholder="Kategori ara..."
                            />
                        </div>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {list.length === 0 ? (
                                <div className="text-center py-8 text-[var(--text-muted-color)]">
                                    <Folder size={40} className="mx-auto mb-2 opacity-50" />
                                    <p>Kategori bulunamadı</p>
                                </div>
                            ) : list.map(category => (
                                <div key={category.name} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] hover:shadow-sm transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color || '#0ea5a5' }} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-[var(--text-color)]">{category.name}</h4>
                                                    <span className="text-xs bg-[var(--primary-100)] text-[var(--primary-600)] px-2 py-1 rounded">
                                                        {category.productCount} ürün
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-[var(--text-muted-color)] mt-1">
                                                    <span>Değer: {formatCurrency(category.totalValue)}</span>
                                                    {category.lowStockCount > 0 && (
                                                        <span className="text-orange-600">Kritik: {category.lowStockCount}</span>
                                                    )}
                                                    {category.outOfStockCount > 0 && (
                                                        <span className="text-red-600">Tükendi: {category.outOfStockCount}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                                                className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                            >
                                                {selectedCategory === category.name ? 'Gizle' : 'Ürünleri Gör'}
                                            </button>
                                            <button
                                                onClick={() => setBulkUpdateModal({ show: true, category: category.name })}
                                                className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                            >
                                                Toplu Fiyat
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Kategori Ürünleri */}
                                    {selectedCategory === category.name && (
                                        <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {getCategoryProducts(category.name).map(product => (
                                                    <div key={product.id} className="flex items-center justify-between p-2 bg-[var(--bg-color)] rounded text-sm">
                                                        <div className="flex-1">
                                                            <span className="font-medium">{product.name}</span>
                                                            <span className="text-[var(--text-muted-color)] ml-2">
                                                                Stok: {product.stock || 0}
                                                            </span>
                                                        </div>
                                                        <span className="font-semibold text-[var(--primary-600)]">
                                                            {formatCurrency(product.salePrice || 0)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Toplu Fiyat Güncelleme Modal */}
            {bulkUpdateModal.show && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-12" onClick={() => setBulkUpdateModal({ show: false, category: null })}>
                    <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Toplu Fiyat Güncelleme</h3>
                        <p className="text-sm text-[var(--text-muted-color)] mb-4">
                            <strong>{bulkUpdateModal.category}</strong> kategorisindeki ürünlerin fiyatlarını güncelleyin
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Güncelleme Türü</label>
                                <select
                                    id="updateType"
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                                >
                                    <option value="percentage">Yüzde Artır/Azalt</option>
                                    <option value="fixed">Sabit Miktar Ekle/Çıkar</option>
                                    <option value="set">Yeni Fiyat Belirle</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Değer</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    id="updateValue"
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                                    placeholder="Değer girin"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setBulkUpdateModal({ show: false, category: null })}
                                className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--surface-color)] transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => {
                                    const updateType = document.getElementById('updateType').value;
                                    const value = parseFloat(document.getElementById('updateValue').value);
                                    if (isNaN(value)) {
                                        toast.warning('Geçerli bir değer girin.');
                                        return;
                                    }
                                    handleBulkPriceUpdate(bulkUpdateModal.category, updateType, value);
                                }}
                                className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                            >
                                Güncelle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Stok Sayım Sayfası
const StockCountPage = ({ products, stockCounts, stockCountsPath, productsPath }) => {
    const [activeSession, setActiveSession] = useState(null);
    const [barcode, setBarcode] = useState('');
    const [note, setNote] = useState('');
    const [countType, setCountType] = useState('full'); // full, category, specific
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all'); // all, open, closed
    const inputRef = useRef(null);

    useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [activeSession]);

    const startSession = async () => {
        const ref = doc(collection(db, stockCountsPath));
        const data = { 
            status: 'open', 
            startTime: serverTimestamp(), 
            note: (note || '').trim(),
            countType,
            selectedCategory: countType === 'category' ? selectedCategory : null,
            selectedProducts: countType === 'specific' ? selectedProducts : null
        };
        await toast.promise(setDoc(ref, data), { 
            loading: 'Oturum başlatılıyor...', 
            success: 'Stok sayımı başladı.', 
            error: 'Oturum başlatılamadı.' 
        });
        setActiveSession({ id: ref.id, items: {}, status: 'open', countType });
    };

    const endSession = async (applyAdjustments) => {
        if (!activeSession) return;
        const ref = doc(db, stockCountsPath, activeSession.id);
        const closeData = { 
            status: 'closed', 
            endTime: serverTimestamp(), 
            applyAdjustments: !!applyAdjustments,
            totalItems: Object.keys(activeSession.items || {}).length,
            totalVariance: Object.values(activeSession.items || {}).reduce((sum, item) => 
                sum + ((item.countedQty || 0) - (item.systemQty || 0)), 0
            )
        };
        
        const batch = writeBatch(db);
        batch.set(ref, closeData, { merge: true });
        
        if (applyAdjustments) {
            Object.entries(activeSession.items || {}).forEach(([productId, item]) => {
                const variance = (item.countedQty || 0) - (item.systemQty || 0);
                if (variance !== 0) {
                    const pRef = doc(db, productsPath, productId);
                    batch.update(pRef, { 
                        stock: increment(variance),
                        lastCountDate: serverTimestamp(),
                        lastCountVariance: variance
                    });
                }
            });
        }
        
        await toast.promise(batch.commit(), { 
            loading: 'Kapatılıyor...', 
            success: 'Stok sayımı kapatıldı.', 
            error: 'Kapatma sırasında hata.' 
        });
        setActiveSession(null);
        setNote('');
    };

    const addScan = (code) => {
        const product = (products || []).find(p => p.barcode === code || p.id === code);
        if (!product) { 
            toast.warning('Ürün bulunamadı.'); 
            return; 
        }
        
        // Check if product should be counted based on count type
        if (countType === 'category' && selectedCategory && product.category !== selectedCategory) {
            toast.warning('Bu ürün seçilen kategoriye ait değil.');
            return;
        }
        
        if (countType === 'specific' && !selectedProducts.includes(product.id)) {
            toast.warning('Bu ürün sayım listesinde değil.');
            return;
        }
        
        setActiveSession(s => {
            const current = s?.items || {};
            const sysQty = product.stock || 0;
            const prev = current[product.id] || { 
                productId: product.id, 
                name: product.name, 
                barcode: product.barcode,
                category: product.category,
                systemQty: sysQty, 
                countedQty: 0,
                lastCounted: null
            };
            const next = { 
                ...prev, 
                countedQty: (prev.countedQty || 0) + 1,
                lastCounted: serverTimestamp()
            };
            const items = { ...current, [product.id]: next };
            return { ...s, items };
        });
    };

    const saveSnapshot = async () => {
        if (!activeSession) return;
        const ref = doc(db, stockCountsPath, activeSession.id);
        const itemsArray = Object.values(activeSession.items || {});
        await toast.promise(setDoc(ref, { 
            items: itemsArray, 
            savedAt: serverTimestamp(),
            progress: {
                totalProducts: countType === 'full' ? products.length : 
                             countType === 'category' ? products.filter(p => p.category === selectedCategory).length :
                             selectedProducts.length,
                countedProducts: itemsArray.length,
                percentage: Math.round((itemsArray.length / (countType === 'full' ? products.length : 
                             countType === 'category' ? products.filter(p => p.category === selectedCategory).length :
                             selectedProducts.length)) * 100)
            }
        }, { merge: true }), { 
            loading: 'Kaydediliyor...', 
            success: 'Ara kayıt alındı.', 
            error: 'Kayıt hatası.' 
        });
    };

    const updateCount = (productId, qty) => {
        setActiveSession(s => {
            const current = s?.items || {};
            const it = current[productId];
            if (!it) return s;
            const items = { 
                ...current, 
                [productId]: { 
                    ...it, 
                    countedQty: Math.max(0, qty || 0),
                    lastCounted: serverTimestamp()
                } 
            };
            return { ...s, items };
        });
    };

    const removeItem = (productId) => {
        setActiveSession(s => {
            const current = s?.items || {};
            const { [productId]: removed, ...rest } = current;
            return { ...s, items: rest };
        });
    };

    const openExisting = async (session) => {
        const loaded = { 
            id: session.id, 
            status: session.status, 
            items: {},
            countType: session.countType || 'full'
        };
        if (Array.isArray(session.items)) {
            session.items.forEach(it => { 
                if (it.productId) loaded.items[it.productId] = it; 
            });
        }
        setActiveSession(loaded);
        setCountType(session.countType || 'full');
    };

    const getSessionStats = () => {
        const itemsArray = Object.values(activeSession?.items || {});
        const totalVariance = itemsArray.reduce((sum, item) => 
            sum + ((item.countedQty || 0) - (item.systemQty || 0)), 0
        );
        const positiveVariance = itemsArray.filter(item => 
            (item.countedQty || 0) > (item.systemQty || 0)
        ).length;
        const negativeVariance = itemsArray.filter(item => 
            (item.countedQty || 0) < (item.systemQty || 0)
        ).length;
        
        return {
            totalItems: itemsArray.length,
            totalVariance,
            positiveVariance,
            negativeVariance,
            zeroVariance: itemsArray.length - positiveVariance - negativeVariance
        };
    };

    const filteredSessions = useMemo(() => {
        return (stockCounts || []).filter(session => {
            if (filterStatus === 'all') return true;
            return session.status === filterStatus;
        });
    }, [stockCounts, filterStatus]);

    const filteredProducts = useMemo(() => {
        return (products || []).filter(product => {
            if (countType === 'category' && selectedCategory) {
                return product.category === selectedCategory;
            }
            if (countType === 'specific') {
                return selectedProducts.includes(product.id);
            }
            return (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (product.barcode || '').includes(searchTerm);
        });
    }, [products, countType, selectedCategory, selectedProducts, searchTerm]);

    const uniqueCategories = useMemo(() => {
        return [...new Set((products || []).map(p => p.category).filter(Boolean))];
    }, [products]);

    const list = filteredSessions;
    const itemsArray = Object.values(activeSession?.items || {});
    const stats = getSessionStats();

    return (
        <div className="space-y-4">
            {!activeSession ? (
                <div className="space-y-4">
                    {/* Session Configuration */}
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg border border-[var(--border-color)]">
                        <h3 className="font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5" />
                            Yeni Stok Sayımı
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Sayım Türü</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setCountType('full')}
                                        className={`p-3 rounded-lg border-2 transition-colors ${
                                            countType === 'full' 
                                                ? 'border-[var(--primary-600)] bg-[var(--primary-100)]' 
                                                : 'border-[var(--border-color)] hover:border-[var(--primary-300)]'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <Package className="w-6 h-6 mx-auto mb-2 text-[var(--primary-600)]" />
                                            <div className="font-medium text-[var(--text-color)]">Tam Sayım</div>
                                            <div className="text-xs text-[var(--text-muted-color)]">Tüm ürünler</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setCountType('category')}
                                        className={`p-3 rounded-lg border-2 transition-colors ${
                                            countType === 'category' 
                                                ? 'border-[var(--primary-600)] bg-[var(--primary-100)]' 
                                                : 'border-[var(--border-color)] hover:border-[var(--primary-300)]'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <Folder className="w-6 h-6 mx-auto mb-2 text-[var(--primary-600)]" />
                                            <div className="font-medium text-[var(--text-color)]">Kategori Sayımı</div>
                                            <div className="text-xs text-[var(--text-muted-color)]">Belirli kategori</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setCountType('specific')}
                                        className={`p-3 rounded-lg border-2 transition-colors ${
                                            countType === 'specific' 
                                                ? 'border-[var(--primary-600)] bg-[var(--primary-100)]' 
                                                : 'border-[var(--border-color)] hover:border-[var(--primary-300)]'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <Target className="w-6 h-6 mx-auto mb-2 text-[var(--primary-600)]" />
                                            <div className="font-medium text-[var(--text-color)]">Seçili Ürünler</div>
                                            <div className="text-xs text-[var(--text-muted-color)]">Manuel seçim</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {countType === 'category' && (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Kategori Seçin</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    >
                                        <option value="">Kategori seçin</option>
                                        {uniqueCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {countType === 'specific' && (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Ürün Seçin</label>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Ürün ara..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        />
                                        <div className="max-h-40 overflow-y-auto border border-[var(--border-color)] rounded-lg">
                                            {filteredProducts.map(product => (
                                                <div key={product.id} className="flex items-center gap-2 p-2 hover:bg-[var(--surface-hover-color)]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.includes(product.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedProducts([...selectedProducts, product.id]);
                                                            } else {
                                                                setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-[var(--primary-600)]"
                                                    />
                                                    <span className="text-sm text-[var(--text-color)]">{product.name}</span>
                                                    <span className="text-xs text-[var(--text-muted-color)]">({product.barcode})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Not (opsiyonel)</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    rows="2"
                                    placeholder="Sayım hakkında notlar..."
                                />
                            </div>

                            <button 
                                onClick={startSession}
                                disabled={countType === 'category' && !selectedCategory || countType === 'specific' && selectedProducts.length === 0}
                                className="w-full bg-[var(--primary-600)] text-white font-bold py-3 px-4 rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Stok Sayımını Başlat
                            </button>
                        </div>
                    </div>

                    {/* Previous Sessions */}
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-[var(--text-color)]">Önceki Oturumlar</h3>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-color)] text-[var(--text-color)] text-sm"
                            >
                                <option value="all">Tümü</option>
                                <option value="open">Açık</option>
                                <option value="closed">Kapalı</option>
                            </select>
                        </div>
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            {list.length === 0 ? (
                                <EmptyState icon={<ClipboardCheck size={40}/>} message="Oturum yok" description="Yeni bir stok sayımı başlatın." />
                            ) : list.map(s => (
                                <div key={s.id} className="p-4 rounded-lg bg-[var(--bg-color)] border border-[var(--border-color)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-color)]">
                                                #{s.id.slice(0,8)} • {s.status === 'open' ? 'Açık' : 'Kapalı'}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted-color)]">
                                                {s.startTime && s.startTime.toDate ? s.startTime.toDate().toLocaleString('tr-TR') : ''}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {s.status !== 'closed' && (
                                                <button 
                                                    onClick={() => openExisting(s)} 
                                                    className="px-3 py-1.5 text-sm bg-[var(--primary-600)] text-white rounded hover:bg-[var(--primary-700)]"
                                                >
                                                    Devam Et
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {s.note && (
                                        <p className="text-xs text-[var(--text-muted-color)] mb-2">{s.note}</p>
                                    )}
                                    <div className="flex gap-4 text-xs text-[var(--text-muted-color)]">
                                        <span>Ürün: {s.totalItems || 0}</span>
                                        <span>Fark: {s.totalVariance || 0}</span>
                                        <span>Tür: {s.countType === 'full' ? 'Tam' : s.countType === 'category' ? 'Kategori' : 'Seçili'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Session Header */}
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-[var(--text-color)]">
                                Stok Sayımı - #{activeSession.id?.slice(0,8)}
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowScanner(!showScanner)}
                                    className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-color)] rounded hover:bg-[var(--surface-hover-color)]"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={saveSnapshot} 
                                    className="px-3 py-2 bg-[var(--info-color)] text-white rounded hover:bg-blue-600"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                            <div className="text-center p-3 bg-[var(--bg-color)] rounded-lg">
                                <div className="text-lg font-bold text-[var(--text-color)]">{stats.totalItems}</div>
                                <div className="text-xs text-[var(--text-muted-color)]">Sayılan</div>
                            </div>
                            <div className="text-center p-3 bg-[var(--bg-color)] rounded-lg">
                                <div className="text-lg font-bold text-[var(--success-color)]">{stats.positiveVariance}</div>
                                <div className="text-xs text-[var(--text-muted-color)]">Fazla</div>
                            </div>
                            <div className="text-center p-3 bg-[var(--bg-color)] rounded-lg">
                                <div className="text-lg font-bold text-[var(--error-color)]">{stats.negativeVariance}</div>
                                <div className="text-xs text-[var(--text-muted-color)]">Eksik</div>
                            </div>
                            <div className="text-center p-3 bg-[var(--bg-color)] rounded-lg">
                                <div className="text-lg font-bold text-[var(--text-color)]">{stats.zeroVariance}</div>
                                <div className="text-xs text-[var(--text-muted-color)]">Doğru</div>
                            </div>
                            <div className="text-center p-3 bg-[var(--bg-color)] rounded-lg">
                                <div className="text-lg font-bold text-[var(--text-color)]">{stats.totalVariance}</div>
                                <div className="text-xs text-[var(--text-muted-color)]">Toplam Fark</div>
                            </div>
                        </div>

                        {/* Barcode Input */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div className="md:col-span-2">
                                <label className="block text-xs text-[var(--text-muted-color)] mb-1">Barkod Tara / Yaz</label>
                                <input 
                                    ref={inputRef} 
                                    value={barcode} 
                                    onChange={e => setBarcode(e.target.value)} 
                                    onKeyDown={e => { 
                                        if (e.key === 'Enter') { 
                                            e.preventDefault(); 
                                            if (barcode.trim()) { 
                                                addScan(barcode.trim()); 
                                                setBarcode(''); 
                                            } 
                                        } 
                                    }} 
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                                    placeholder="Barkod girin veya tarayın" 
                                />
                            </div>
                            <button 
                                onClick={() => { if (barcode.trim()) { addScan(barcode.trim()); setBarcode(''); } }} 
                                className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]"
                            >
                                Ekle
                            </button>
                            <button 
                                onClick={() => setActiveSession(null)}
                                className="bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-color)] font-semibold py-2 px-4 rounded-lg hover:bg-[var(--surface-hover-color)]"
                            >
                                İptal
                            </button>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-[var(--text-color)]">Sayılan Ürünler</h4>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => endSession(false)} 
                                    className="px-4 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-color)] rounded hover:bg-[var(--surface-hover-color)]"
                                >
                                    Kapat (Uygulama)
                                </button>
                                <button 
                                    onClick={() => endSession(true)} 
                                    className="px-4 py-2 bg-[var(--success-color)] text-white rounded hover:bg-green-600"
                                >
                                    Kapat ve Stokları Güncelle
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[55vh] overflow-y-auto space-y-2">
                            {itemsArray.length === 0 ? (
                                <EmptyState icon={<Package size={40}/>} message="Ürün yok" description="Barkod tarayın veya ürün ekleyin." />
                            ) : itemsArray.map(it => {
                                const variance = (it.countedQty || 0) - (it.systemQty || 0);
                                return (
                                    <div key={it.productId} className="p-4 rounded-lg bg-[var(--bg-color)] border border-[var(--border-color)]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-[var(--text-color)]">{it.name}</p>
                                                <p className="text-xs text-[var(--text-muted-color)]">
                                                    Barkod: {it.barcode} • Kategori: {it.category}
                                                </p>
                                                <div className="flex gap-4 mt-1">
                                                    <span className="text-xs text-[var(--text-muted-color)]">
                                                        Sistem: <span className="font-medium">{it.systemQty || 0}</span>
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted-color)]">
                                                        Sayılan: <span className="font-medium">{it.countedQty || 0}</span>
                                                    </span>
                                                    <span className={`text-xs font-medium ${
                                                        variance > 0 ? 'text-[var(--success-color)]' : 
                                                        variance < 0 ? 'text-[var(--error-color)]' : 
                                                        'text-[var(--text-color)]'
                                                    }`}>
                                                        Fark: {variance > 0 ? '+' : ''}{variance}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    value={it.countedQty || 0} 
                                                    onChange={e => updateCount(it.productId, parseInt(e.target.value) || 0)} 
                                                    className="w-20 px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-color)] text-[var(--text-color)] text-center" 
                                                />
                                                <button
                                                    onClick={() => removeItem(it.productId)}
                                                    className="p-1 text-[var(--error-color)] hover:bg-red-100 rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Kritik Stok Sayfası
const LowStockPage = ({ products, defaultCriticalLevel = 5, onUpdateProduct }) => {
    const [threshold, setThreshold] = useState(defaultCriticalLevel || 5);
    const [search, setSearch] = useState('');
    const [onlyZero, setOnlyZero] = useState(false);

    const lowList = useMemo(() => {
        const q = threshold || 0;
        return (products || [])
            .filter(p => {
                const lvl = p.criticalStockLevel ?? defaultCriticalLevel ?? 5;
                const isLow = (p.stock || 0) <= lvl && (p.stock || 0) <= q;
                const nameMatch = (p.name || '').toLowerCase().includes(search.toLowerCase());
                const zeroCheck = !onlyZero || (p.stock || 0) === 0;
                return isLow && nameMatch && zeroCheck;
            })
            .sort((a,b) => (a.stock||0) - (b.stock||0));
    }, [products, threshold, search, onlyZero, defaultCriticalLevel]);

    const bulkSetCritical = async (value) => {
        const newValue = Math.max(0, parseInt(value) || 0);
        const toUpdate = lowList.slice(0, 50); // limit for safety
        await Promise.all(toUpdate.map(p => onUpdateProduct({ ...p, criticalStockLevel: newValue })));
        toast.success('Kritik stok seviyesi güncellendi.');
    };

    const exportCSV = () => {
        const headers = [
            { label: 'Barkod', value: (p) => p.barcode || p.id },
            { label: 'Ürün', value: 'name' },
            { label: 'Stok', value: (p) => p.stock || 0 },
            { label: 'Kritik Seviye', value: (p) => p.criticalStockLevel ?? defaultCriticalLevel ?? 5 }
        ];
        downloadCSV(`kritik_stok_${new Date().toISOString().slice(0,10)}.csv`, headers, lowList);
    };

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Kritik Stok</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Eşik</label>
                        <input type="number" min="0" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Ürün Ara</label>
                        <input value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[var(--text-color)]">
                        <input type="checkbox" checked={onlyZero} onChange={e => setOnlyZero(e.target.checked)} />
                        Sadece stoğu 0 olanlar
                    </label>
                    <button onClick={exportCSV} className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]">CSV İndir</button>
                    <button onClick={() => bulkSetCritical(threshold)} className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]">Liste için kritik seviyeyi eşik yap</button>
                </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {lowList.length === 0 ? (
                    <EmptyState icon={<AlertTriangle size={40}/>} message="Kritik stokta ürün yok" description="Eşiği değiştirin veya kategori/ürün bazlı kontrol edin." />
                ) : lowList.map(p => (
                    <div key={p.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[var(--text-color)]">{p.name}</p>
                            <p className="text-xs text-[var(--text-muted-color)]">Stok: {p.stock || 0} • Kritik: {p.criticalStockLevel ?? defaultCriticalLevel ?? 5}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onUpdateProduct({ ...p, criticalStockLevel: Math.max(0, (p.criticalStockLevel ?? defaultCriticalLevel ?? 5) + 1) })} className="px-2 py-1 text-xs bg-[var(--surface-color)] border border-[var(--border-color)] rounded">Kritik +1</button>
                            <button onClick={() => onUpdateProduct({ ...p, criticalStockLevel: Math.max(0, (p.criticalStockLevel ?? defaultCriticalLevel ?? 5) - 1) })} className="px-2 py-1 text-xs bg-[var(--surface-color)] border border-[var(--border-color)] rounded">Kritik -1</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Satın Alma Siparişleri
const PurchaseOrdersPage = ({ suppliers, products, purchaseOrders, purchaseOrdersPath, productsPath }) => {
    const [form, setForm] = useState({ supplierId: '', notes: '' });
    const [items, setItems] = useState([]); // {productId, name, qty, price}
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const addItem = (product) => {
        setItems(prev => {
            const exists = prev.find(i => i.productId === product.id);
            if (exists) return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { productId: product.id, name: product.name, qty: 1, price: product.purchasePrice || 0 }];
        });
    };

    const removeItem = (id) => setItems(prev => prev.filter(i => i.productId !== id));
    const updateItem = (id, key, value) => setItems(prev => prev.map(i => i.productId === id ? { ...i, [key]: value } : i));

    const createOrder = async () => {
        const supplierId = (form.supplierId || '').trim();
        if (!supplierId) { toast.warning('Tedarikçi seçiniz.'); return; }
        if (items.length === 0) { toast.warning('En az bir ürün ekleyin.'); return; }
        const ref = doc(collection(db, purchaseOrdersPath));
        const data = {
            supplierId,
            status: 'draft',
            notes: (form.notes || '').trim(),
            createdAt: serverTimestamp(),
            items: items.map(i => ({ productId: i.productId, qty: i.qty, price: i.price }))
        };
        await toast.promise(setDoc(ref, data), { loading: 'Sipariş oluşturuluyor...', success: 'Sipariş oluşturuldu.', error: 'Sipariş oluşturma hatası.' });
        setForm({ supplierId: '', notes: '' });
        setItems([]);
    };

    const markSent = async (order) => {
        await toast.promise(setDoc(doc(db, purchaseOrdersPath, order.id), { status: 'sent', sentAt: serverTimestamp() }, { merge: true }), { loading: 'Gönderiliyor...', success: 'Sipariş gönderildi.', error: 'Hata.' });
    };

    const receiveOrder = async (order) => {
        const batch = writeBatch(db);
        order.items.forEach(i => {
            const pRef = doc(db, productsPath, i.productId);
            batch.update(pRef, { stock: increment(i.qty) });
        });
        batch.set(doc(db, purchaseOrdersPath, order.id), { status: 'received', receivedAt: serverTimestamp() }, { merge: true });
        await toast.promise(batch.commit(), { loading: 'Teslim alınıyor...', success: 'Sipariş teslim alındı ve stok güncellendi.', error: 'Teslim alma hatası.' });
    };

    const filteredProducts = useMemo(() => (products || []).filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase())), [products, search]);
    const orders = purchaseOrders || [];

    const total = items.reduce((s, i) => s + (i.qty * i.price), 0);

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Yeni Sipariş</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Tedarikçi</label>
                        <select value={form.supplierId} onChange={e => setForm(f => ({...f, supplierId: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]">
                            <option value="">Seçiniz</option>
                            {(suppliers || []).map(s => (
                                <option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Ürün Ara</label>
                        <input value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <button onClick={createOrder} className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]">Siparişi Oluştur</button>
                </div>
                <div className="mt-4 grid md:grid-cols-3 gap-3 max-h-[35vh] overflow-y-auto">
                    <div className="md:col-span-2 space-y-2">
                        {items.length === 0 ? (
                            <EmptyState icon={<ShoppingBag size={40}/>} message="Ürün ekleyin" description="Aramadan seçerek listeye ekleyin." />
                        ) : items.map(i => (
                            <div key={i.productId} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-color)]">{i.name}</p>
                                    <p className="text-xs text-[var(--text-muted-color)]">Miktar: {i.qty} • Fiyat: {formatCurrency(i.price)} • Tutar: {formatCurrency(i.qty * i.price)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="1" value={i.qty} onChange={e => updateItem(i.productId, 'qty', parseInt(e.target.value) || 1)} className="w-20 px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-color)] text-[var(--text-color)]" />
                                    <input type="number" step="0.01" min="0" value={i.price} onChange={e => updateItem(i.productId, 'price', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-color)] text-[var(--text-color)]" />
                                    <button onClick={() => removeItem(i.productId)} className="text-red-600 hover:bg-red-100 px-2 py-1 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)]">
                            <p className="text-sm text-[var(--text-muted-color)]">Ara Toplam</p>
                            <p className="text-lg font-bold text-[var(--text-color)]">{formatCurrency(total)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] max-h-[28vh] overflow-y-auto">
                            <p className="text-xs text-[var(--text-muted-color)] mb-2">Arama Sonuçları</p>
                            {filteredProducts.map(p => (
                                <button key={p.id} onClick={() => addItem(p)} className="w-full text-left p-2 rounded hover:bg-[var(--surface-hover-color)] flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-color)]">{p.name}</span>
                                    <span className="text-xs text-[var(--text-muted-color)]">Stok: {p.stock || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Siparişler</h3>
                <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                    {(orders || []).length === 0 ? (
                        <EmptyState icon={<FileText size={40}/>} message="Sipariş yok" description="Yeni sipariş oluşturun." />
                    ) : orders.map(o => (
                        <div key={o.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)]">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-color)]">#{o.id.slice(0,6)} • {o.status || 'draft'}</p>
                                    <p className="text-xs text-[var(--text-muted-color)]">Tedarikçi: {o.supplierId || '-'} • Kalem: {Array.isArray(o.items) ? o.items.length : 0}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {o.status === 'draft' && <button onClick={() => markSent(o)} className="px-3 py-1.5 text-sm bg-[var(--surface-color)] border border-[var(--border-color)] rounded">Gönderildi</button>}
                                    {o.status !== 'received' && <button onClick={() => receiveOrder(o)} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded">Teslim Al</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Kasa Yönetimi
const CashDrawerPage = ({ cashDrawer, cashDrawerPath }) => {
    const active = cashDrawer?.activeSession;
    const sessions = cashDrawer?.sessions || [];
    const [openingAmount, setOpeningAmount] = useState(0);
    const [opNote, setOpNote] = useState('');
    const [txnAmount, setTxnAmount] = useState(0);
    const [txnNote, setTxnNote] = useState('');

    const openDrawer = async () => {
        if (active) { toast.warning('Zaten açık bir kasa var.'); return; }
        const ref = doc(collection(db, cashDrawerPath));
        const data = { startTime: serverTimestamp(), openingAmount: Number(openingAmount) || 0, note: (opNote || '').trim() };
        await toast.promise(setDoc(ref, data), { loading: 'Kasa açılıyor...', success: 'Kasa açıldı.', error: 'Kasa açılamadı.' });
    };

    const addTxn = async (type) => {
        if (!active) { toast.warning('Önce kasa açın.'); return; }
        const txRef = doc(collection(db, `${cashDrawerPath}/${active.id}/transactions`));
        const data = { type, amount: Math.max(0, Number(txnAmount) || 0), note: (txnNote || '').trim(), time: serverTimestamp() };
        await toast.promise(setDoc(txRef, data), { loading: 'İşlem ekleniyor...', success: 'İşlem eklendi.', error: 'İşlem hatası.' });
        setTxnAmount(0); setTxnNote('');
    };

    const closeDrawer = async () => {
        if (!active) return;
        await toast.promise(setDoc(doc(db, cashDrawerPath, active.id), { endTime: serverTimestamp() }, { merge: true }), { loading: 'Kasa kapatılıyor...', success: 'Kasa kapatıldı.', error: 'Kapatma hatası.' });
    };

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Kasa</h3>
                {!active ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div>
                            <label className="block text-xs text-[var(--text-muted-color)] mb-1">Açılış Tutarı</label>
                            <input type="number" step="0.01" value={openingAmount} onChange={e => setOpeningAmount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-[var(--text-muted-color)] mb-1">Not (opsiyonel)</label>
                            <input value={opNote} onChange={e => setOpNote(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                        </div>
                        <button onClick={openDrawer} className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]">Kasa Aç</button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-[var(--text-color)] text-sm">Açılış: {formatCurrency(active.openingAmount || 0)} • Başlangıç: {active.startTime?.toDate ? active.startTime.toDate().toLocaleString('tr-TR') : ''}</div>
                            <button onClick={closeDrawer} className="px-3 py-2 bg-red-600 text-white rounded">Kasa Kapat</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                            <div>
                                <label className="block text-xs text-[var(--text-muted-color)] mb-1">Tutar</label>
                                <input type="number" step="0.01" value={txnAmount} onChange={e => setTxnAmount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-[var(--text-muted-color)] mb-1">Not</label>
                                <input value={txnNote} onChange={e => setTxnNote(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                            </div>
                            <button onClick={() => addTxn('in')} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Kasa Girişi</button>
                            <button onClick={() => addTxn('out')} className="bg-amber-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-700">Kasa Çıkışı</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Kasa Oturumları</h3>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {sessions.length === 0 ? (
                        <EmptyState icon={<Wallet size={40}/>} message="Kasa oturumu yok" description="Yeni bir oturum başlatın." />
                    ) : sessions.map(s => (
                        <div key={s.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-color)]">#{s.id.slice(0,6)} • {s.endTime ? 'Kapalı' : 'Açık'}</p>
                                <p className="text-xs text-[var(--text-muted-color)]">Başlangıç: {s.startTime?.toDate ? s.startTime.toDate().toLocaleString('tr-TR') : ''} {s.endTime ? `• Bitiş: ${s.endTime.toDate().toLocaleString('tr-TR')}` : ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Giderler
// Ödemeler
const PaymentsPage = ({ payments, paymentsPath }) => {
    const [form, setForm] = useState({ direction: 'in', method: 'cash', amount: 0, note: '', refType: 'sale', refId: '' });
    const [range, setRange] = useState({ from: '', to: '' });

    const savePayment = async (e) => {
        e.preventDefault();
        const data = {
            direction: form.direction,
            method: form.method,
            amount: Math.max(0, Number(form.amount) || 0),
            note: (form.note || '').trim(),
            refType: form.refType || null,
            refId: form.refId || null,
            date: serverTimestamp(),
            createdAt: serverTimestamp()
        };
        await toast.promise(addDoc(collection(db, paymentsPath), data), { loading: 'Kaydediliyor...', success: 'Ödeme kaydedildi.', error: 'Kayıt hatası.' });
        setForm({ direction: 'in', method: 'cash', amount: 0, note: '', refType: 'sale', refId: '' });
    };

    const filtered = useMemo(() => {
        const list = payments || [];
        const from = range.from ? new Date(range.from) : null;
        const to = range.to ? new Date(range.to) : null;
        return list.filter(p => {
            const d = p.date?.toDate ? p.date.toDate() : (p.date ? new Date(p.date) : null);
            if (!d) return true;
            if (from && d < from) return false;
            if (to) {
                const toEnd = new Date(to); toEnd.setHours(23,59,59,999);
                if (d > toEnd) return false;
            }
            return true;
        }).sort((a,b) => {
            const da = a.date?.toDate ? a.date.toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
            const db = b.date?.toDate ? b.date.toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
            return db - da;
        });
    }, [payments, range]);

    const totalIn = filtered.filter(p => p.direction === 'in').reduce((s, p) => s + (p.amount || 0), 0);
    const totalOut = filtered.filter(p => p.direction === 'out').reduce((s, p) => s + (p.amount || 0), 0);

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Ödeme Ekle</h3>
                <form onSubmit={savePayment} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Yön</label>
                        <select value={form.direction} onChange={e => setForm(f => ({...f, direction: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]">
                            <option value="in">Gelen</option>
                            <option value="out">Giden</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Yöntem</label>
                        <select value={form.method} onChange={e => setForm(f => ({...f, method: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]">
                            <option value="cash">Nakit</option>
                            <option value="card">Kart</option>
                            <option value="transfer">Havale</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Tutar</label>
                        <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({...f, amount: parseFloat(e.target.value) || 0}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Not</label>
                        <input value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <button type="submit" className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]">Kaydet</button>
                </form>
            </div>

            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[var(--text-color)]">Ödemeler</h3>
                    <div className="flex items-center gap-2">
                        <input type="date" value={range.from} onChange={e => setRange(r => ({...r, from: e.target.value}))} className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm" />
                        <input type="date" value={range.to} onChange={e => setRange(r => ({...r, to: e.target.value}))} className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm" />
                        <div className="px-3 py-2 bg-green-100 text-green-800 rounded text-sm">Gelen: {formatCurrency(totalIn)}</div>
                        <div className="px-3 py-2 bg-red-100 text-red-800 rounded text-sm">Giden: {formatCurrency(totalOut)}</div>
                        <div className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded text-sm">Net: {formatCurrency(totalIn - totalOut)}</div>
                    </div>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <EmptyState icon={<CreditCard size={40}/>} message="Ödeme yok" description="Yeni bir ödeme ekleyin." />
                    ) : filtered.map(p => (
                        <div key={p.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-color)]">{p.direction === 'in' ? 'Gelen' : 'Giden'} • {p.method} • {formatCurrency(p.amount || 0)}</p>
                                <p className="text-xs text-[var(--text-muted-color)]">{(p.date?.toDate ? p.date.toDate() : (p.date ? new Date(p.date) : null))?.toLocaleDateString('tr-TR') || ''}</p>
                                {p.note && <p className="text-xs text-[var(--text-muted-color)]">{p.note}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Analitik
const AnalyticsPage = ({ sales, purchases, products, expenses, payments, customers }) => {
    const [timeRange, setTimeRange] = useState('7d');
    const [selectedMetric, setSelectedMetric] = useState('revenue');

    const getTimeRangeData = (data, dateField = 'date') => {
        if (!data) return [];
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
            case '1d':
                startDate.setDate(now.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }
        
        return data.filter(item => {
            const itemDate = item[dateField]?.toDate ? item[dateField].toDate() : 
                           (item[dateField] ? new Date(item[dateField]) : null);
            if (!itemDate) return false;
            return itemDate >= startDate && itemDate <= now;
        });
    };

    const salesData = getTimeRangeData(sales, 'saleDate');
    const purchasesData = getTimeRangeData(purchases, 'purchaseDate');
    const expensesData = getTimeRangeData(expenses, 'date');
    const paymentsData = getTimeRangeData(payments, 'date');

    // Günlük satış trendi
    const dailySalesTrend = useMemo(() => {
        const trend = {};
        salesData.forEach(sale => {
            const date = sale.saleDate?.toDate ? sale.saleDate.toDate() : new Date(sale.saleDate);
            const dateKey = date.toISOString().split('T')[0];
            if (!trend[dateKey]) {
                trend[dateKey] = { date: dateKey, revenue: 0, transactions: 0 };
            }
            trend[dateKey].revenue += sale.totalAmount || 0;
            trend[dateKey].transactions += 1;
        });
        return Object.values(trend).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [salesData]);

    // Kategori bazında satış analizi
    const categoryAnalysis = useMemo(() => {
        const categories = {};
        salesData.forEach(sale => {
            sale.items?.forEach(item => {
                const category = item.category || 'Kategori Yok';
                if (!categories[category]) {
                    categories[category] = { name: category, revenue: 0, quantity: 0, transactions: 0 };
                }
                categories[category].revenue += (item.price || 0) * (item.quantity || 0);
                categories[category].quantity += item.quantity || 0;
                categories[category].transactions += 1;
            });
        });
        return Object.values(categories).sort((a, b) => b.revenue - a.revenue);
    }, [salesData]);

    // Müşteri analizi
    const customerAnalysis = useMemo(() => {
        const customerStats = {};
        salesData.forEach(sale => {
            const customerId = sale.customerId || 'anonymous';
            if (!customerStats[customerId]) {
                customerStats[customerId] = {
                    id: customerId,
                    name: sale.customerName || 'Anonim',
                    revenue: 0,
                    transactions: 0,
                    lastPurchase: sale.saleDate
                };
            }
            customerStats[customerId].revenue += sale.totalAmount || 0;
            customerStats[customerId].transactions += 1;
            if (sale.saleDate > customerStats[customerId].lastPurchase) {
                customerStats[customerId].lastPurchase = sale.saleDate;
            }
        });
        return Object.values(customerStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }, [salesData]);

    // KPI hesaplamaları
    const kpis = useMemo(() => {
        const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const totalPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
        const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const totalTransactions = salesData.length;
        const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        const grossProfit = totalRevenue - totalPurchases;
        const netProfit = grossProfit - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // Önceki dönem karşılaştırması
        const previousPeriod = timeRange === '7d' ? '1d' : timeRange === '30d' ? '7d' : '30d';
        const prevSalesData = getTimeRangeData(sales, 'saleDate');
        const prevRevenue = prevSalesData.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalPurchases,
            totalExpenses,
            totalTransactions,
            avgTransactionValue,
            grossProfit,
            netProfit,
            profitMargin,
            revenueGrowth
        };
    }, [salesData, purchasesData, expensesData, timeRange]);

    // Stok durumu analizi
    const stockAnalysis = useMemo(() => {
        const lowStock = products?.filter(p => (p.stock || 0) <= (p.criticalStock || 5)) || [];
        const outOfStock = products?.filter(p => (p.stock || 0) <= 0) || [];
        const totalStockValue = products?.reduce((sum, p) => sum + ((p.stock || 0) * (p.salePrice || 0)), 0) || 0;
        const totalProducts = products?.length || 0;

        return {
            lowStock: lowStock.length,
            outOfStock: outOfStock.length,
            totalStockValue,
            totalProducts,
            stockTurnover: totalStockValue > 0 ? kpis.totalRevenue / totalStockValue : 0
        };
    }, [products, kpis.totalRevenue]);

    return (
        <div className="space-y-6">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[var(--text-color)]">Analitik Dashboard</h2>
                    <div className="flex items-center gap-2">
                        <select 
                            value={timeRange} 
                            onChange={e => setTimeRange(e.target.value)}
                            className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm"
                        >
                            <option value="1d">Son 1 Gün</option>
                            <option value="7d">Son 7 Gün</option>
                            <option value="30d">Son 30 Gün</option>
                            <option value="90d">Son 90 Gün</option>
                            <option value="1y">Son 1 Yıl</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Toplam Gelir</p>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{formatCurrency(kpis.totalRevenue)}</p>
                            <p className={`text-xs ${kpis.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {kpis.revenueGrowth >= 0 ? '↗' : '↘'} %{Math.abs(kpis.revenueGrowth).toFixed(1)}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Toplam İşlem</p>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{kpis.totalTransactions}</p>
                            <p className="text-xs text-[var(--text-muted-color)]">
                                Ort: {formatCurrency(kpis.avgTransactionValue)}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <ShoppingCart className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Net Kâr</p>
                            <p className={`text-2xl font-bold ${kpis.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(kpis.netProfit)}
                            </p>
                            <p className="text-xs text-[var(--text-muted-color)]">
                                %{kpis.profitMargin.toFixed(1)} marj
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-muted-color)]">Stok Değeri</p>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{formatCurrency(stockAnalysis.totalStockValue)}</p>
                            <p className="text-xs text-[var(--text-muted-color)]">
                                {stockAnalysis.totalProducts} ürün
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full">
                            <Package className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grafik ve Analizler */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Günlük Satış Trendi */}
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <h3 className="font-semibold mb-4 text-[var(--text-color)]">Günlük Satış Trendi</h3>
                    <div className="space-y-2">
                        {dailySalesTrend.length === 0 ? (
                            <p className="text-[var(--text-muted-color)] text-center py-8">Veri yok</p>
                        ) : (
                            dailySalesTrend.map((day, index) => (
                                <div key={day.date} className="flex items-center justify-between p-2 rounded bg-[var(--bg-color)]">
                                    <span className="text-sm text-[var(--text-color)]">
                                        {new Date(day.date).toLocaleDateString('tr-TR')}
                                    </span>
                                    <div className="text-right">
                                        <span className="font-medium text-[var(--text-color)]">{formatCurrency(day.revenue)}</span>
                                        <span className="text-xs text-[var(--text-muted-color)] ml-2">({day.transactions} işlem)</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Kategori Analizi */}
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <h3 className="font-semibold mb-4 text-[var(--text-color)]">Kategori Performansı</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categoryAnalysis.length === 0 ? (
                            <p className="text-[var(--text-muted-color)] text-center py-8">Veri yok</p>
                        ) : (
                            categoryAnalysis.map((category, index) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded bg-[var(--bg-color)]">
                                    <div>
                                        <span className="font-medium text-[var(--text-color)]">{category.name}</span>
                                        <span className="text-xs text-[var(--text-muted-color)] ml-2">({category.quantity} adet)</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium text-[var(--text-color)]">{formatCurrency(category.revenue)}</span>
                                        <span className="text-xs text-[var(--text-muted-color)] ml-2">({category.transactions} işlem)</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Müşteri Analizi ve Stok Uyarıları */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* En Değerli Müşteriler */}
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <h3 className="font-semibold mb-4 text-[var(--text-color)]">En Değerli Müşteriler</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {customerAnalysis.length === 0 ? (
                            <p className="text-[var(--text-muted-color)] text-center py-8">Veri yok</p>
                        ) : (
                            customerAnalysis.map((customer, index) => (
                                <div key={customer.id} className="flex items-center justify-between p-2 rounded bg-[var(--bg-color)]">
                                    <div>
                                        <span className="font-medium text-[var(--text-color)]">{customer.name}</span>
                                        <span className="text-xs text-[var(--text-muted-color)] ml-2">({customer.transactions} işlem)</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium text-[var(--text-color)]">{formatCurrency(customer.revenue)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Stok Uyarıları */}
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <h3 className="font-semibold mb-4 text-[var(--text-color)]">Stok Durumu</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded bg-red-100">
                                <p className="text-2xl font-bold text-red-600">{stockAnalysis.outOfStock}</p>
                                <p className="text-sm text-red-600">Tükendi</p>
                            </div>
                            <div className="text-center p-3 rounded bg-yellow-100">
                                <p className="text-2xl font-bold text-yellow-600">{stockAnalysis.lowStock}</p>
                                <p className="text-sm text-yellow-600">Az Stok</p>
                            </div>
                        </div>
                        <div className="text-center p-3 rounded bg-blue-100">
                            <p className="text-lg font-bold text-blue-600">{stockAnalysis.stockTurnover.toFixed(1)}x</p>
                            <p className="text-sm text-blue-600">Stok Devir Hızı</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Raporlar
const ReportsPage = ({ sales, purchases, products, expenses, payments, customers }) => {
    const [activeTab, setActiveTab] = useState('sales');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [selectedCategory, setSelectedCategory] = useState('');

    const getDateFilteredData = (data, dateField = 'date') => {
        if (!data) return [];
        const from = dateRange.from ? new Date(dateRange.from) : null;
        const to = dateRange.to ? new Date(dateRange.to) : null;
        
        return data.filter(item => {
            const itemDate = item[dateField]?.toDate ? item[dateField].toDate() : 
                           (item[dateField] ? new Date(item[dateField]) : null);
            if (!itemDate) return true;
            if (from && itemDate < from) return false;
            if (to) {
                const toEnd = new Date(to);
                toEnd.setHours(23, 59, 59, 999);
                if (itemDate > toEnd) return false;
            }
            return true;
        });
    };

    const salesData = getDateFilteredData(sales, 'saleDate');
    const purchasesData = getDateFilteredData(purchases, 'purchaseDate');
    const expensesData = getDateFilteredData(expenses, 'date');
    const paymentsData = getDateFilteredData(payments, 'date');

    // Satış Raporu
    const salesReport = useMemo(() => {
        const totalSales = salesData.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const totalItems = salesData.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
        const paymentMethods = salesData.reduce((acc, sale) => {
            const method = sale.paymentMethod || 'unknown';
            acc[method] = (acc[method] || 0) + (sale.totalAmount || 0);
            return acc;
        }, {});
        
        const topProducts = salesData.reduce((acc, sale) => {
            sale.items?.forEach(item => {
                const productId = item.productId;
                if (!acc[productId]) {
                    acc[productId] = { name: item.name, quantity: 0, revenue: 0 };
                }
                acc[productId].quantity += item.quantity || 0;
                acc[productId].revenue += (item.price || 0) * (item.quantity || 0);
            });
            return acc;
        }, {});

        return {
            totalSales,
            totalItems,
            totalTransactions: salesData.length,
            paymentMethods,
            topProducts: Object.values(topProducts).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
        };
    }, [salesData]);

    // Satın Alma Raporu
    const purchasesReport = useMemo(() => {
        const totalPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
        const totalItems = purchasesData.reduce((sum, purchase) => sum + (purchase.items?.length || 0), 0);
        
        const suppliers = purchasesData.reduce((acc, purchase) => {
            const supplierId = purchase.supplierId;
            if (!acc[supplierId]) {
                acc[supplierId] = { name: purchase.supplierName || 'Bilinmeyen', amount: 0, count: 0 };
            }
            acc[supplierId].amount += purchase.totalAmount || 0;
            acc[supplierId].count += 1;
            return acc;
        }, {});

        return {
            totalPurchases,
            totalItems,
            totalTransactions: purchasesData.length,
            suppliers: Object.values(suppliers).sort((a, b) => b.amount - a.amount)
        };
    }, [purchasesData]);

    // Kâr/Zarar Raporu
    const profitLossReport = useMemo(() => {
        const totalRevenue = salesReport.totalSales;
        const totalPurchases = purchasesReport.totalPurchases;
        const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const totalPaymentsIn = paymentsData.filter(p => p.direction === 'in').reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalPaymentsOut = paymentsData.filter(p => p.direction === 'out').reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const grossProfit = totalRevenue - totalPurchases;
        const netProfit = grossProfit - totalExpenses;
        const netCashFlow = totalPaymentsIn - totalPaymentsOut;

        return {
            totalRevenue,
            totalPurchases,
            totalExpenses,
            grossProfit,
            netProfit,
            totalPaymentsIn,
            totalPaymentsOut,
            netCashFlow
        };
    }, [salesReport, purchasesReport, expensesData, paymentsData]);

    const exportToCSV = (data, filename) => {
        const csv = convertToCSV(data);
        downloadCSV(csv, filename);
    };

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[var(--text-color)]">Raporlar</h2>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            value={dateRange.from} 
                            onChange={e => setDateRange(r => ({...r, from: e.target.value}))}
                            className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm"
                            placeholder="Başlangıç"
                        />
                        <input 
                            type="date" 
                            value={dateRange.to} 
                            onChange={e => setDateRange(r => ({...r, to: e.target.value}))}
                            className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm"
                            placeholder="Bitiş"
                        />
                    </div>
                </div>
                
                <div className="flex space-x-1 bg-[var(--bg-color)] p-1 rounded-lg">
                    {[
                        { id: 'sales', label: 'Satış Raporu', icon: <TrendingUp size={16} /> },
                        { id: 'purchases', label: 'Satın Alma Raporu', icon: <ShoppingCart size={16} /> },
                        { id: 'profit', label: 'Kâr/Zarar', icon: <DollarSign size={16} /> },
                        { id: 'inventory', label: 'Stok Raporu', icon: <Package size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-[var(--primary-600)] text-white'
                                    : 'text-[var(--text-muted-color)] hover:text-[var(--text-color)] hover:bg-[var(--surface-color)]'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'sales' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Toplam Satış</h3>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{formatCurrency(salesReport.totalSales)}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Toplam İşlem</h3>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{salesReport.totalTransactions}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Satılan Ürün</h3>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{salesReport.totalItems}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Ortalama Sepet</h3>
                            <p className="text-2xl font-bold text-[var(--text-color)]">
                                {salesReport.totalTransactions > 0 ? formatCurrency(salesReport.totalSales / salesReport.totalTransactions) : '0 ₺'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="font-semibold mb-3 text-[var(--text-color)]">Ödeme Yöntemleri</h3>
                            <div className="space-y-2">
                                {Object.entries(salesReport.paymentMethods).map(([method, amount]) => (
                                    <div key={method} className="flex justify-between">
                                        <span className="text-[var(--text-color)]">{method}</span>
                                        <span className="font-medium text-[var(--text-color)]">{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="font-semibold mb-3 text-[var(--text-color)]">En Çok Satılan Ürünler</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {salesReport.topProducts.map((product, index) => (
                                    <div key={index} className="flex justify-between">
                                        <span className="text-[var(--text-color)] truncate">{product.name}</span>
                                        <div className="text-right">
                                            <div className="font-medium text-[var(--text-color)]">{formatCurrency(product.revenue)}</div>
                                            <div className="text-xs text-[var(--text-muted-color)]">{product.quantity} adet</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={() => exportToCSV(salesData, `satis-raporu-${new Date().toISOString().split('T')[0]}.csv`)}
                            className="bg-[var(--primary-600)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-700)]"
                        >
                            CSV İndir
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'purchases' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Toplam Satın Alma</h3>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{formatCurrency(purchasesReport.totalPurchases)}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Toplam İşlem</h3>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{purchasesReport.totalTransactions}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Satın Alınan Ürün</h3>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{purchasesReport.totalItems}</p>
                        </div>
                    </div>

                    <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                        <h3 className="font-semibold mb-3 text-[var(--text-color)]">Tedarikçiler</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {purchasesReport.suppliers.map((supplier, index) => (
                                <div key={index} className="flex justify-between">
                                    <span className="text-[var(--text-color)]">{supplier.name}</span>
                                    <div className="text-right">
                                        <div className="font-medium text-[var(--text-color)]">{formatCurrency(supplier.amount)}</div>
                                        <div className="text-xs text-[var(--text-muted-color)]">{supplier.count} işlem</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={() => exportToCSV(purchasesData, `satin-alma-raporu-${new Date().toISOString().split('T')[0]}.csv`)}
                            className="bg-[var(--primary-600)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-700)]"
                        >
                            CSV İndir
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'profit' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Toplam Gelir</h3>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(profitLossReport.totalRevenue)}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Toplam Gider</h3>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(profitLossReport.totalPurchases + profitLossReport.totalExpenses)}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Brüt Kâr</h3>
                            <p className={`text-2xl font-bold ${profitLossReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(profitLossReport.grossProfit)}
                            </p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="text-sm font-medium text-[var(--text-muted-color)]">Net Kâr</h3>
                            <p className={`text-2xl font-bold ${profitLossReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(profitLossReport.netProfit)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="font-semibold mb-3 text-[var(--text-color)]">Gelir Detayı</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-color)]">Satış Geliri</span>
                                    <span className="font-medium text-green-600">{formatCurrency(profitLossReport.totalRevenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-color)]">Diğer Gelirler</span>
                                    <span className="font-medium text-green-600">{formatCurrency(profitLossReport.totalPaymentsIn)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="font-semibold text-[var(--text-color)]">Toplam Gelir</span>
                                    <span className="font-bold text-green-600">{formatCurrency(profitLossReport.totalRevenue + profitLossReport.totalPaymentsIn)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                            <h3 className="font-semibold mb-3 text-[var(--text-color)]">Gider Detayı</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-color)]">Satın Almalar</span>
                                    <span className="font-medium text-red-600">{formatCurrency(profitLossReport.totalPurchases)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-color)]">İşletme Giderleri</span>
                                    <span className="font-medium text-red-600">{formatCurrency(profitLossReport.totalExpenses)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-color)]">Diğer Giderler</span>
                                    <span className="font-medium text-red-600">{formatCurrency(profitLossReport.totalPaymentsOut)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="font-semibold text-[var(--text-color)]">Toplam Gider</span>
                                    <span className="font-bold text-red-600">{formatCurrency(profitLossReport.totalPurchases + profitLossReport.totalExpenses + profitLossReport.totalPaymentsOut)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="space-y-4">
                    <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                        <h3 className="font-semibold mb-3 text-[var(--text-color)]">Stok Durumu</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {products?.map(product => (
                                <div key={product.id} className="flex justify-between items-center p-2 rounded border border-[var(--border-color)]">
                                    <div>
                                        <span className="font-medium text-[var(--text-color)]">{product.name}</span>
                                        <span className="text-sm text-[var(--text-muted-color)] ml-2">({product.category || 'Kategori yok'})</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-[var(--text-color)]">{product.stock || 0} adet</div>
                                        <div className="text-sm text-[var(--text-muted-color)]">{formatCurrency(product.salePrice || 0)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={() => exportToCSV(products, `stok-raporu-${new Date().toISOString().split('T')[0]}.csv`)}
                            className="bg-[var(--primary-600)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-700)]"
                        >
                            CSV İndir
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Müşteriler
const CustomersPage = ({ customers, customersPath, sales }) => {
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
    const [search, setSearch] = useState('');

    const saveCustomer = async (e) => {
        e.preventDefault();
        const data = {
            name: (form.name || '').trim(),
            phone: (form.phone || '').trim(),
            email: (form.email || '').trim(),
            address: (form.address || '').trim(),
            notes: (form.notes || '').trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        await toast.promise(addDoc(collection(db, customersPath), data), { loading: 'Kaydediliyor...', success: 'Müşteri kaydedildi.', error: 'Kayıt hatası.' });
        setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    };

    const filtered = useMemo(() => {
        const list = customers || [];
        const q = (search || '').toLowerCase();
        return list.filter(c => 
            !q || 
            (c.name || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q)
        );
    }, [customers, search]);

    const getCustomerStats = (customerId) => {
        const customerSales = (sales || []).filter(s => s.customerId === customerId);
        const totalSpent = customerSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const lastSale = customerSales.sort((a, b) => {
            const da = a.saleDate?.toDate ? a.saleDate.toDate().getTime() : (a.saleDate ? new Date(a.saleDate).getTime() : 0);
            const db = b.saleDate?.toDate ? b.saleDate.toDate().getTime() : (b.saleDate ? new Date(b.saleDate).getTime() : 0);
            return db - da;
        })[0];
        return { totalSpent, lastSale, saleCount: customerSales.length };
    };

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Müşteri Ekle</h3>
                <form onSubmit={saveCustomer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Ad Soyad *</label>
                        <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Telefon</label>
                        <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">E-posta</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Adres</label>
                        <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Notlar</label>
                        <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]">Kaydet</button>
                    </div>
                </form>
            </div>

            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[var(--text-color)]">Müşteriler</h3>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..." className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm" />
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <EmptyState icon={<Users size={40}/>} message="Müşteri yok" description="Yeni bir müşteri ekleyin." />
                    ) : filtered.map(c => {
                        const stats = getCustomerStats(c.id);
                        return (
                            <div key={c.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)]">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold text-[var(--text-color)]">{c.name}</p>
                                        {c.phone && <p className="text-sm text-[var(--text-muted-color)]">📞 {c.phone}</p>}
                                        {c.email && <p className="text-sm text-[var(--text-muted-color)]">✉️ {c.email}</p>}
                                        {c.address && <p className="text-sm text-[var(--text-muted-color)]">📍 {c.address}</p>}
                                        {c.notes && <p className="text-sm text-[var(--text-muted-color)]">📝 {c.notes}</p>}
                                    </div>
                                    <div className="text-right text-sm">
                                        <p className="text-[var(--text-color)]">Toplam: {formatCurrency(stats.totalSpent)}</p>
                                        <p className="text-[var(--text-muted-color)]">Satış: {stats.saleCount}</p>
                                        {stats.lastSale && (
                                            <p className="text-[var(--text-muted-color)]">Son: {(stats.lastSale.saleDate?.toDate ? stats.lastSale.saleDate.toDate() : (stats.lastSale.saleDate ? new Date(stats.lastSale.saleDate) : null))?.toLocaleDateString('tr-TR') || ''}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Giderler
const ExpensesPage = ({ expenses, expenseCategories, expensesPath, expenseCategoriesPath }) => {
    const [form, setForm] = useState({ date: '', categoryId: '', amount: 0, note: '' });
    const [catName, setCatName] = useState('');
    const [range, setRange] = useState({ from: '', to: '' });

    const saveExpense = async (e) => {
        e.preventDefault();
        const data = {
            date: form.date ? new Date(form.date) : serverTimestamp(),
            categoryId: form.categoryId || null,
            amount: Math.max(0, Number(form.amount) || 0),
            note: (form.note || '').trim(),
            createdAt: serverTimestamp()
        };
        await toast.promise(addDoc(collection(db, expensesPath), data), { loading: 'Kaydediliyor...', success: 'Gider kaydedildi.', error: 'Kayıt hatası.' });
        setForm({ date: '', categoryId: '', amount: 0, note: '' });
    };

    const saveCategory = async () => {
        const name = (catName || '').trim();
        if (!name) return;
        await toast.promise(setDoc(doc(db, expenseCategoriesPath, name), { name }, { merge: true }), { loading: 'Kategori ekleniyor...', success: 'Kategori kaydedildi.', error: 'Kategori hatası.' });
        setCatName('');
    };

    const filtered = useMemo(() => {
        const list = expenses || [];
        const from = range.from ? new Date(range.from) : null;
        const to = range.to ? new Date(range.to) : null;
        return list.filter(e => {
            const d = e.date?.toDate ? e.date.toDate() : (e.date ? new Date(e.date) : null);
            if (!d) return true;
            if (from && d < from) return false;
            if (to) {
                const toEnd = new Date(to); toEnd.setHours(23,59,59,999);
                if (d > toEnd) return false;
            }
            return true;
        }).sort((a,b) => {
            const da = a.date?.toDate ? a.date.toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
            const db = b.date?.toDate ? b.date.toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
            return db - da;
        });
    }, [expenses, range]);

    const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Gider Ekle</h3>
                <form onSubmit={saveExpense} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Tarih</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Kategori</label>
                        <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]">
                            <option value="">Seçiniz</option>
                            {(expenseCategories || []).map(c => (
                                <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Tutar</label>
                        <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({...f, amount: parseFloat(e.target.value) || 0}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Not</label>
                        <input value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <button type="submit" className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]">Kaydet</button>
                </form>
            </div>

            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)]">Kategoriler</h3>
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Yeni Kategori</label>
                        <input value={catName} onChange={e => setCatName(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <button type="button" onClick={saveCategory} className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg">Ekle</button>
                </div>
            </div>

            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[var(--text-color)]">Giderler</h3>
                    <div className="flex items-center gap-2">
                        <input type="date" value={range.from} onChange={e => setRange(r => ({...r, from: e.target.value}))} className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm" />
                        <input type="date" value={range.to} onChange={e => setRange(r => ({...r, to: e.target.value}))} className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm" />
                        <div className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-sm">Toplam: {formatCurrency(total)}</div>
                    </div>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <EmptyState icon={<Receipt size={40}/>} message="Gider yok" description="Yeni bir gider ekleyin." />
                    ) : filtered.map(e => (
                        <div key={e.id} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-color)]">{formatCurrency(e.amount || 0)}</p>
                                <p className="text-xs text-[var(--text-muted-color)]">{e.categoryId || '-'} • {(e.date?.toDate ? e.date.toDate() : (e.date ? new Date(e.date) : null))?.toLocaleDateString('tr-TR') || ''}</p>
                                {e.note && <p className="text-xs text-[var(--text-muted-color)]">{e.note}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
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

// YENİ: Satış ve Ürün Yönetimi Sütununu Yöneten Bileşen
const SaleAndProductSection = (props) => {
    const { activeSaleView, setActiveSaleView, products, onAddToCart, productsPath, salesPath, categoryDiscounts } = props;
    const [barcode, setBarcode] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeSaleView]);

    const processTransaction = useCallback(async (product, type, paymentMethod = null, transactionDiscount = 0) => {
        if (!product) {
            toast.error("İşlem için ürün bulunamadı.");
            return;
        }
        if (product.stock <= 0) {
            toast.warning(`${product.name} için stok tükendi!`);
            return;
        }

        const { finalPrice, discountApplied, originalPrice, appliedRule } = calculateDiscountedPrice(product, categoryDiscounts);
        const finalTotal = Math.max(0, finalPrice - transactionDiscount);

        const productRef = doc(db, productsPath, product.id);
        const saleRef = doc(collection(db, salesPath));
        const batch = writeBatch(db);

        batch.update(productRef, { stock: increment(-1) });
        
        const saleData = {
            type,
            saleDate: serverTimestamp(),
            total: type === 'personnel' ? 0 : finalTotal,
            subTotal: finalPrice,
            transactionDiscount,
            items: [{ 
                productId: product.id, name: product.name, quantity: 1, price: finalPrice,
                originalPrice: originalPrice, purchasePrice: product.purchasePrice || 0,
                discountApplied: discountApplied, discountRule: appliedRule
            }]
        };

        if (type === 'sale') saleData.paymentMethod = paymentMethod === 'card' ? 'kart' : paymentMethod === 'cash' ? 'nakit' : paymentMethod;
        if (type === 'credit') saleData.status = 'unpaid';

        batch.set(saleRef, saleData);

        await toast.promise(batch.commit(), {
            loading: 'İşlem yapılıyor...',
            success: `${product.name} işlemi başarılı!`,
            error: 'İşlem sırasında bir hata oluştu.'
        });

        return true; // Indicate success
    }, [productsPath, salesPath, categoryDiscounts]);

    const handleBarcodeSubmit = (e) => {
        e.preventDefault();
        if (!barcode) return;
        
        const product = products.find(p => p.barcode === barcode);
        if (!product) {
            toast.error("Bu barkoda sahip ürün bulunamadı.");
            setBarcode('');
            return;
        }

        if (activeSaleView === 'sepet') {
            onAddToCart(product);
        } else {
            // Hızlı satışta seçili ödeme yöntemini kullan
            const currentPaymentMethod = props.paymentMethod || 'cash';
            processTransaction(product, 'sale', currentPaymentMethod, 0);
        }
        setBarcode('');
    };

    return (
        <div className="bg-[var(--bg-color)] p-6 rounded-2xl shadow-lg border border-[var(--border-color)] flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-color)] p-1 border border-[var(--border-color)]">
                <button onClick={() => setActiveSaleView('hizli')} className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${activeSaleView === 'hizli' ? 'bg-[var(--bg-color)] text-[var(--primary-600)] shadow-sm' : 'text-[var(--text-muted-color)] hover:text-[var(--text-color)]'}`}>
                    <Zap size={16}/> Hızlı Satış
                </button>
                <button onClick={() => setActiveSaleView('sepet')} className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${activeSaleView === 'sepet' ? 'bg-[var(--bg-color)] text-[var(--primary-600)] shadow-sm' : 'text-[var(--text-muted-color)] hover:text-[var(--text-color)]'}`}>
                    <ShoppingCart size={16}/> Sepet ({props.cart.length})
                </button>
            </div>
            
            <BarcodeScannerInput 
                barcode={barcode} 
                setBarcode={setBarcode} 
                handleBarcodeSubmit={handleBarcodeSubmit} 
                inputRef={inputRef}
                activeSaleView={activeSaleView}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSaleView}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeSaleView === 'hizli' ? (
                        <InstantSaleSection {...props} processTransaction={processTransaction} handleBarcodeSubmit={handleBarcodeSubmit} paymentMethod={props.paymentMethod} />
                    ) : (
                        <ShoppingCartSection {...props} />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const BarcodeScannerInput = ({ barcode, setBarcode, handleBarcodeSubmit, inputRef, activeSaleView }) => {
    const [showScanner, setShowScanner] = useState(false);

    const onScanSuccess = (decodedText) => { 
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
        <form onSubmit={handleBarcodeSubmit}>
            <div className="rounded-lg bg-[var(--surface-color)] p-3 border border-[var(--border-color)]">
                <label htmlFor="barcode-input" className="block text-xs font-medium text-[var(--text-muted-color)]">
                    {activeSaleView === 'sepet' ? 'Sepete Ekle (Barkod Okut/Gir + Enter)' : 'Nakit Satış (Barkod Okut/Gir + Enter)'}
                </label>
                <div className="flex items-center gap-2 mt-1">
                    <input ref={inputRef} autoFocus id="barcode-input" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barkod okutun..." className="block w-full border-0 bg-transparent p-0 text-[var(--text-color)] placeholder:text-[var(--text-muted-color)] focus:ring-0 sm:text-sm"/>
                    <button type="button" onClick={() => setShowScanner(true)} className="p-2 text-[var(--text-muted-color)] hover:text-[var(--primary-600)]" title="Kamera ile Tara"> <Camera size={20} /> </button>
                </div>
            </div>
            {showScanner && <CameraScanner onScanSuccess={onScanSuccess} onClose={() => setShowScanner(false)} />}
        </form>
    );
};


const InstantSaleSection = ({ products, processTransaction, handleBarcodeSubmit, paymentMethod }) => {
    const [modalType, setModalType] = useState(null);
    const [transactionDiscount, setTransactionDiscount] = useState(0);
    
    return (
        <div className="flex flex-col gap-4">
            <div className="border-t border-[var(--border-color)] pt-4">
                 <p className="text-center text-sm text-[var(--text-muted-color)] mb-3">İşlem Türleri</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleBarcodeSubmit} className="w-full bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                        <DollarSign size={18} /> {paymentMethod === 'cash' ? 'Nakit Sat' : paymentMethod === 'card' ? 'Kartla Sat' : paymentMethod === 'credit' ? 'Veresiye Sat' : 'Personel Sat'}
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
                <div className="mt-3">
                    <FormInput label="Anlık İndirim (₺)" id="transaction-discount">
                        <input type="number" value={transactionDiscount} onChange={e => setTransactionDiscount(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" placeholder="0.00"/>
                    </FormInput>
                </div>
            </div>
            {modalType && (
                <TransactionModal 
                    type={modalType}
                    onClose={() => setModalType(null)}
                    products={products}
                    processTransaction={processTransaction}
                    transactionDiscount={transactionDiscount}
                />
            )}
        </div>
    );
};

// YENİ: Sepet Bileşeni
const ShoppingCartSection = ({ cart, onUpdateCartQuantity, onRemoveFromCart, onClearCart, onFinalizeSale, categoryDiscounts }) => {
    const [transactionDiscount, setTransactionDiscount] = useState(0);

    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const { finalPrice } = calculateDiscountedPrice(item, categoryDiscounts);
            return total + (finalPrice * item.quantity);
        }, 0);
    }, [cart, categoryDiscounts]);

    const cartTotal = Math.max(0, cartSubtotal - transactionDiscount);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-[var(--text-color)]"><ShoppingCart size={22} /> Satış Sepeti</h2>
                {cart.length > 0 && (
                    <button onClick={onClearCart} className="text-sm font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
                        <Trash2 size={14}/> Temizle
                    </button>
                )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {cart.length === 0 ? (
                    <p className="text-center text-sm text-[var(--text-muted-color)] py-4">Sepetiniz boş.</p>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex items-center gap-2 bg-[var(--surface-color)] p-2 rounded-lg">
                            <div className="flex-grow">
                                <p className="font-semibold text-sm truncate">{item.name}</p>
                                <p className="text-xs text-[var(--text-muted-color)]">{formatCurrency(calculateDiscountedPrice(item, categoryDiscounts).finalPrice)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => onUpdateCartQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full hover:bg-[var(--surface-hover-color)]"><MinusCircle size={16}/></button>
                                <input 
                                    type="number" 
                                    value={item.quantity} 
                                    onChange={(e) => onUpdateCartQuantity(item.id, parseInt(e.target.value) || 1)}
                                    className="w-10 text-center bg-transparent border-x-0 border-t-0 border-b border-[var(--border-color)] focus:ring-0 focus:border-[var(--primary-500)] text-sm"
                                />
                                <button onClick={() => onUpdateCartQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full hover:bg-[var(--surface-hover-color)]"><PlusCircle size={16}/></button>
                            </div>
                            <button onClick={() => onRemoveFromCart(item.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><X size={16}/></button>
                        </div>
                    ))
                )}
            </div>

            {cart.length > 0 && (
                <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-[var(--text-muted-color)]">Ara Toplam:</span>
                        <span className="font-semibold">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-[var(--text-muted-color)]">Kasa İndirimi (₺):</span>
                        <input 
                            type="number" 
                            value={transactionDiscount || ''} 
                            onChange={e => setTransactionDiscount(parseFloat(e.target.value) || 0)}
                            className="w-20 text-right bg-transparent border-x-0 border-t-0 border-b border-[var(--border-color)] focus:ring-0 focus:border-[var(--primary-500)] text-sm font-semibold text-red-500"
                            placeholder="0"
                        />
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>TOPLAM:</span>
                        <span>{formatCurrency(cartTotal)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={() => onFinalizeSale('nakit', transactionDiscount)} className="w-full bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                            <DollarSign size={18} /> Nakit Öde
                        </button>
                        <button onClick={() => onFinalizeSale('kart', transactionDiscount)} className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            <CreditCard size={18} /> Kartla Öde
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const TransactionModal = ({ type, onClose, products, processTransaction, transactionDiscount }) => {
    const [barcode, setBarcode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const inputRef = useRef(null);

    const typeConfig = useMemo(() => ({
        kart: { title: 'Kartla Satış', icon: CreditCard, color: 'blue-600', saleType: 'sale', paymentMethod: 'kart' },
        veresiye: { title: 'Veresiye Kaydı', icon: BookUser, color: 'red-600', saleType: 'credit', paymentMethod: null },
        personnel: { title: 'Personel Kullanımı', icon: UserCheck, color: 'yellow-500', saleType: 'personnel', paymentMethod: null }
    }), [])[type];

    const handleSubmit = async (e) => {
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

        const success = await processTransaction(product, typeConfig.saleType, typeConfig.paymentMethod, transactionDiscount);
        if(success) {
            onClose();
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-12" onClick={onClose}>
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
    const initialProductState = { name: '', barcode: '', stock: '', purchasePrice: '', salePrice: '', category: '', criticalStockLevel: '' };
    const [product, setProduct] = useState(initialProductState);
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
            criticalStockLevel: parseInt(product.criticalStockLevel) || settings.criticalStockLevel || 5,
            discountValue: 0, 
            discountType: 'fixed'
        };

        const existingProduct = products.find(p => p.id === barcode);
        if (existingProduct) {
            toast( `Bu barkod "${existingProduct.name}" ürününe ait. Bilgileri güncellemek ister misiniz?`, { action: { label: 'Güncelle', onClick: () => { onAdd(productData); resetForm(); }}, cancel: { label: 'İptal' } });
        } else {
            await onAdd(productData);
            resetForm();
        }
    };

    const resetForm = () => setProduct(initialProductState);

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
        { id: 'discounts', label: 'İndirimler', icon: Percent },
        { id: 'purchases', label: 'Satın Alma', icon: FileText },
        { id: 'suppliers', label: 'Tedarikçiler', icon: Users },
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

// YENİ: İndirimler Sayfası
const DiscountsPage = ({ products, categoryDiscounts, categoryDiscountsPath, onUpdateProduct }) => {
    const [newCategoryDiscount, setNewCategoryDiscount] = useState({ name: '', discountValue: '', discountType: 'percentage' });

    const uniqueCategories = useMemo(() => {
        const categories = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(categories);
    }, [products]);

    const handleSaveCategoryDiscount = async (e) => {
        e.preventDefault();
        const { name, discountValue, discountType } = newCategoryDiscount;
        if (!name || !discountValue) {
            toast.warning("Lütfen kategori adı ve indirim değeri girin.");
            return;
        }
        const discountRef = doc(db, categoryDiscountsPath, name);
        const dataToSave = {
            discountValue: parseFloat(discountValue),
            discountType: discountType
        };
        await toast.promise(setDoc(discountRef, dataToSave), {
            loading: 'Kategori indirimi kaydediliyor...',
            success: `"${name}" kategorisi için indirim kaydedildi.`,
            error: 'İşlem sırasında bir hata oluştu.'
        });
        setNewCategoryDiscount({ name: '', discountValue: '', discountType: 'percentage' });
    };

    const handleDeleteCategoryDiscount = async (categoryName) => {
        const discountRef = doc(db, categoryDiscountsPath, categoryName);
        await toast.promise(deleteDoc(discountRef), {
            loading: 'İndirim siliniyor...',
            success: `"${categoryName}" kategorisinin indirimi kaldırıldı.`,
            error: 'İşlem sırasında bir hata oluştu.'
        });
    };
    
    const handleProductDiscountChange = async (product, field, value) => {
        const updatedProduct = {
            ...product,
            [field]: value
        };
        
        try {
            await onUpdateProduct(updatedProduct);
            toast.success(`${product.name} indirimi güncellendi.`);
        } catch (error) {
            toast.error('İndirim güncellenirken hata oluştu.');
        }
    };

    return (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-4">
            {/* Kategori İndirimleri */}
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-[var(--text-color)]"><Tag size={18}/> Kategori İndirimleri</h3>
                <form onSubmit={handleSaveCategoryDiscount} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
                    <div>
                        <label className="text-xs text-[var(--text-muted-color)]">Kategori</label>
                        <select value={newCategoryDiscount.name} onChange={e => setNewCategoryDiscount({...newCategoryDiscount, name: e.target.value})} className="w-full mt-1 px-3 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)] text-sm">
                            <option value="">Seçiniz...</option>
                            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted-color)]">İndirim Değeri</label>
                        <input type="number" placeholder="10" value={newCategoryDiscount.discountValue} onChange={e => setNewCategoryDiscount({...newCategoryDiscount, discountValue: e.target.value})} className="w-full mt-1 px-3 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)] text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted-color)]">Tipi</label>
                        <select value={newCategoryDiscount.discountType} onChange={e => setNewCategoryDiscount({...newCategoryDiscount, discountType: e.target.value})} className="w-full mt-1 px-3 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)] text-sm">
                            <option value="percentage">% Yüzde</option>
                            <option value="fixed">₺ Sabit Tutar</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)] transition-colors text-sm">Kaydet</button>
                </form>
                <div className="space-y-2">
                    {categoryDiscounts.map(d => (
                        <div key={d.id} className="flex justify-between items-center p-2 bg-[var(--bg-color)] rounded-md">
                            <p className="text-sm font-medium">{d.id}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[var(--primary-600)]">{d.discountValue}{d.discountType === 'percentage' ? '%' : '₺'}</span>
                                <button onClick={() => handleDeleteCategoryDiscount(d.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ürün Bazlı İndirimler */}
            <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-[var(--text-color)]"><PackageSearch size={18}/> Ürün Bazlı İndirimler</h3>
                <div className="space-y-2">
                    {products.map(p => (
                        <div key={p.id} className="grid grid-cols-5 gap-2 items-center p-2 bg-[var(--surface-color)] rounded-lg border border-[var(--border-color)]">
                            <p className="col-span-2 text-sm font-medium truncate" title={p.name}>{p.name}</p>
                            <input 
                                type="number" 
                                placeholder="Değer"
                                value={p.discountValue || ''}
                                onChange={e => handleProductDiscountChange(p, 'discountValue', e.target.value)}
                                className="w-full px-2 py-1 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)] text-sm"
                            />
                            <select 
                                value={p.discountType || 'fixed'}
                                onChange={e => handleProductDiscountChange(p, 'discountType', e.target.value)}
                                className="w-full px-2 py-1 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)] text-sm"
                            >
                                <option value="fixed">₺</option>
                                <option value="percentage">%</option>
                            </select>
                            <button 
                                onClick={() => handleProductDiscountChange(p, 'discountValue', 0)}
                                className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full justify-self-center"
                                title="İndirimi Sıfırla"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
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

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Maliyet Yöntemi</label>
                        <p className="text-xs text-[var(--text-muted-color)] mb-2">Ürün maliyetini nasıl güncelleyelim?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setTempSettings(s => ({...s, costMethod: 'last'}))} className={`px-3 py-1.5 rounded-lg border ${tempSettings.costMethod === 'last' ? 'border-[var(--primary-500)] text-[var(--primary-600)]' : 'border-[var(--border-color)] text-[var(--text-muted-color)]'}`}>Son Alış</button>
                            <button onClick={() => setTempSettings(s => ({...s, costMethod: 'weighted'}))} className={`px-3 py-1.5 rounded-lg border ${tempSettings.costMethod === 'weighted' ? 'border-[var(--primary-500)] text-[var(--primary-600)]' : 'border-[var(--border-color)] text-[var(--text-muted-color)]'}`}>Ağırlıklı Ortalama</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Otomatik Satış Fiyatı</label>
                        <p className="text-xs text-[var(--text-muted-color)] mb-2">Yeni maliyete göre satış fiyatını öner veya otomatik güncelle.</p>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-[var(--text-muted-color)]">Varsayılan Kâr Marjı (%)</label>
                            <input type="number" step="0.1" min="0" value={tempSettings.defaultMarkupPercent || 0} onChange={(e) => setTempSettings(s => ({...s, defaultMarkupPercent: parseFloat(e.target.value || '0')}))} className="w-24 px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!tempSettings.autoUpdateSalePrice} onChange={(e) => setTempSettings(s => ({...s, autoUpdateSalePrice: e.target.checked}))} />
                                Satış fiyatını otomatik güncelle
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Firma Bilgileri (Fiş)</label>
                        <div className="grid grid-cols-1 gap-3">
                            <input value={tempSettings.companyName || ''} onChange={(e) => setTempSettings(s => ({...s, companyName: e.target.value}))} placeholder="Firma Adı" className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                            <input value={tempSettings.companyLogoUrl || ''} onChange={(e) => setTempSettings(s => ({...s, companyLogoUrl: e.target.value}))} placeholder="Logo URL (opsiyonel)" className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                            <input value={tempSettings.companyAddress || ''} onChange={(e) => setTempSettings(s => ({...s, companyAddress: e.target.value}))} placeholder="Adres (opsiyonel)" className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                            <input value={tempSettings.companyTaxNumber || ''} onChange={(e) => setTempSettings(s => ({...s, companyTaxNumber: e.target.value}))} placeholder="Vergi No (opsiyonel)" className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                        </div>
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


const ProductList = ({ products, loading, onUpdate, onDelete, productsPath, salesPath, searchTerm, setSearchTerm, settings, categoryDiscounts }) => {
    const [editingProduct, setEditingProduct] = useState(null);
    const [stockModalProduct, setStockModalProduct] = useState(null);
    const [priceUpdateProduct, setPriceUpdateProduct] = useState(null);

    const handleUpdateSubmit = (e) => { 
        e.preventDefault(); 
        const productData = {
            ...editingProduct,
            criticalStockLevel: parseInt(editingProduct.criticalStockLevel) || settings.criticalStockLevel || 5,
            // discountValue: parseFloat(editingProduct.discountValue) || 0,
            // discountType: editingProduct.discountType || 'fixed'
        };
        onUpdate(productData); 
        setEditingProduct(null); 
    };

    const handlePriceUpdate = async (product, newPrice) => {
        const productRef = doc(db, productsPath, product.id);
        await toast.promise(updateDoc(productRef, { salePrice: newPrice }), {
            loading: 'Fiyat güncelleniyor...',
            success: `${product.name} fiyatı ${formatCurrency(newPrice)} olarak güncellendi.`,
            error: 'Fiyat güncellenirken bir hata oluştu.'
        });
        setPriceUpdateProduct(null);
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
            batch.set(saleRef, { type: 'personnel', saleDate: serverTimestamp(), total: 0, items: [{ productId: product.id, name: product.name, quantity: amount, price: 0, originalPrice: 0, discountApplied: 0 }] });
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
            const { finalPrice, discountApplied, originalPrice, appliedRule } = calculateDiscountedPrice(product, categoryDiscounts);
            const batch = writeBatch(db);
            batch.update(productRef, { stock: increment(-1) });
            const saleRef = doc(collection(db, salesPath));
            batch.set(saleRef, { 
                type: 'credit', 
                status: 'unpaid',
                saleDate: serverTimestamp(), 
                total: finalPrice, 
                items: [{ 
                    productId: product.id, 
                    name: product.name, 
                    quantity: 1, 
                    price: finalPrice, 
                    originalPrice: originalPrice,
                    purchasePrice: product.purchasePrice || 0,
                    discountApplied: discountApplied,
                    discountRule: appliedRule
                }] 
            });
            await batch.commit();
            toast.success(`${product.name} veresiye olarak satıldı.`);
        } catch (error) { toast.error("Veresiye satışı sırasında bir hata oluştu."); }
    }, [productsPath, salesPath, categoryDiscounts]);

    const handleSale = useCallback(async (product, paymentMethod) => {
        if (product.stock <= 0) {
            toast.warning(`${product.name} için stok tükendi!`);
            return;
        }
        const { finalPrice, discountApplied, originalPrice, appliedRule } = calculateDiscountedPrice(product, categoryDiscounts);
        const productRef = doc(db, productsPath, product.id);
        const saleRef = doc(collection(db, salesPath));
        const batch = writeBatch(db);
        batch.update(productRef, { stock: increment(-1) });
        const saleData = {
            type: 'sale',
            paymentMethod: paymentMethod === 'card' ? 'kart' : paymentMethod === 'cash' ? 'nakit' : paymentMethod,
            saleDate: serverTimestamp(),
            total: finalPrice,
            items: [{ 
                productId: product.id, 
                name: product.name, 
                quantity: 1, 
                price: finalPrice, 
                originalPrice: originalPrice,
                purchasePrice: product.purchasePrice || 0,
                discountApplied: discountApplied,
                discountRule: appliedRule
            }]
        };
         batch.set(saleRef, saleData);
        await toast.promise(batch.commit(), {
            loading: 'Satış işleniyor...',
            success: `${product.name} satışı başarılı!`,
            error: 'Satış sırasında bir hata oluştu.'
        });
    }, [productsPath, salesPath, categoryDiscounts]);

    const ProductPrice = ({product}) => {
        const { finalPrice, discountApplied, originalPrice, appliedRule } = calculateDiscountedPrice(product, categoryDiscounts);
        if (discountApplied > 0) {
            return (
                <div className="flex items-center gap-2">
                    <p className="text-xs text-red-500 line-through">{formatCurrency(originalPrice)}</p>
                    <p className="text-sm text-green-700 font-medium">{formatCurrency(finalPrice)}</p>
                    {appliedRule === 'category' && <Tag size={12} className="text-blue-500" title="Kategori İndirimi" />}
                </div>
            )
        }
        return <p className="text-sm text-green-700 font-medium">{formatCurrency(originalPrice)}</p>
    }

    if (loading) return <LoadingSpinner />;
    if (products.length === 0 && !searchTerm) return <EmptyState icon={<Package size={40}/>} message="Henüz ürün eklenmemiş." description="Başlamak için sol taraftaki 'Ürün Yönetimi' panelini kullanabilirsiniz." />;
    
    const handleExportProducts = () => {
        const headers = [
            { label: 'Barkod', value: 'barcode' },
            { label: 'Ürün Adı', value: 'name' },
            { label: 'Kategori', value: row => row.category || '' },
            { label: 'Stok', value: 'stock' },
            { label: 'Kritik Stok', value: row => row.criticalStockLevel ?? '' },
            { label: 'Alış Fiyatı', value: row => row.purchasePrice ?? '' },
            { label: 'Satış Fiyatı', value: row => row.salePrice ?? '' }
        ];
        downloadCSV(`urunler_${new Date().toISOString().slice(0,10)}.csv`, headers, products);
    };

    return ( <div className="space-y-3">
        <div className="flex items-center gap-2">
            <div className="relative flex-1"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-color)]" size={20} /> <input type="text" placeholder="Ürün adı veya barkod ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-10 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /> </div>
            <button onClick={handleExportProducts} className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-color)] hover:bg-[var(--surface-hover-color)] flex items-center gap-1 text-sm">
                <Download size={16}/> CSV İndir
            </button>
        </div>
        {products.length === 0 && searchTerm && ( <EmptyState icon={<Search size={40}/>} message="Arama Sonucu Bulunamadı" description={`'${searchTerm}' için bir sonuç bulunamadı. Lütfen farklı bir anahtar kelime deneyin.`} /> )}
        <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2 pb-4"> {products.map(p => (
            <motion.div layout key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover-color)] transition-colors border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-color)] truncate flex items-center">{p.name} {p.stock <= (p.criticalStockLevel || settings.criticalStockLevel || 5) && <AlertTriangle size={14} className="ml-2 text-red-500"/>}</p>
                        <p className="text-xs text-[var(--text-muted-color)]">Barkod: {p.barcode} | Kategori: {p.category || 'Yok'}</p>
                        <ProductPrice product={p} />
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
                    <button onClick={() => setPriceUpdateProduct(p)} className="p-2 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-md" title="Fiyat Güncelle"><TrendingUp size={16} /></button>
                    <button onClick={() => setEditingProduct(p)} className="p-2 text-[var(--text-muted-color)] hover:bg-[var(--surface-hover-color)] rounded-md" title="Düzenle"><Edit size={16} /></button>
                    <button onClick={() => toast(`"${p.name}" ürününü silmek istediğinize emin misiniz?`, { action: { label: 'Evet, Sil', onClick: () => onDelete(p.id, p.name) }, cancel: { label: 'İptal' } })} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md" title="Sil"><Trash2 size={16} /></button>
                </div>
            </motion.div>
        ))} </div>
        {editingProduct && ( <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingProduct(null)}> <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-[var(--text-color)]">Ürünü Düzenle</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-3">
                <FormInput label="Ürün Adı" id="edit-name"><input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Stok Adedi" id="edit-stock"><input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                    <FormInput label="Kritik Stok" id="edit-criticalStock"><input type="number" value={editingProduct.criticalStockLevel} onChange={e => setEditingProduct({...editingProduct, criticalStockLevel: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Alış Fiyatı (₺)" id="edit-purchasePrice"><input type="number" step="0.01" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                     <FormInput label="Satış Fiyatı (₺)" id="edit-salePrice"><input type="number" step="0.01" value={editingProduct.salePrice} onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                </div>
                <FormInput label="Kategori" id="edit-category"><input value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" /></FormInput>
                <div className="flex justify-end space-x-3 mt-2"> <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] border border-[var(--border-color)]">İptal</button> <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Kaydet</button> </div>
            </form>
        </div> </div> )}
        {stockModalProduct && <AddStockModal product={stockModalProduct} onClose={() => setStockModalProduct(null)} onAddStock={handleAddStock} />}
        {priceUpdateProduct && <PriceUpdateModal product={priceUpdateProduct} onClose={() => setPriceUpdateProduct(null)} onPriceUpdate={handlePriceUpdate} />}
    </div> );
};

const PriceUpdateModal = ({ product, onClose, onPriceUpdate }) => {
    const [newPrice, setNewPrice] = useState(product.salePrice || '');
    const [increaseType, setIncreaseType] = useState('fixed');
    const [increaseValue, setIncreaseValue] = useState('');

    const calculateNewPrice = () => {
        const basePrice = parseFloat(product.salePrice);
        const value = parseFloat(increaseValue);
        if (isNaN(basePrice) || isNaN(value)) return;

        if (increaseType === 'percentage') {
            setNewPrice((basePrice * (1 + value / 100)).toFixed(2));
        } else {
            setNewPrice((basePrice + value).toFixed(2));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalPrice = parseFloat(newPrice);
        if (isNaN(finalPrice) || finalPrice < 0) {
            toast.error("Lütfen geçerli bir fiyat girin.");
            return;
        }
        onPriceUpdate(product, finalPrice);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-12" onClick={onClose}>
            <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-semibold mb-4 text-[var(--text-color)]">Fiyat Güncelle: <span className="font-bold text-[var(--primary-600)]">{product.name}</span></h3>
                <p className="text-sm text-[var(--text-muted-color)] mb-4">Mevcut Satış Fiyatı: {formatCurrency(product.salePrice)}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-3 bg-[var(--surface-color)] rounded-lg border border-[var(--border-color)]">
                        <p className="text-sm font-medium text-[var(--text-color)] mb-2">Hızlı Fiyat Artışı (Zam)</p>
                        <div className="grid grid-cols-3 gap-2">
                            <input type="number" placeholder="Değer" value={increaseValue} onChange={e => setIncreaseValue(e.target.value)} className="col-span-2 w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)] text-sm" />
                            <select value={increaseType} onChange={e => setIncreaseType(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)] text-sm">
                                <option value="fixed">₺</option>
                                <option value="percentage">%</option>
                            </select>
                        </div>
                        <button type="button" onClick={calculateNewPrice} className="w-full mt-2 text-sm text-center py-1.5 bg-[var(--primary-100)] text-[var(--primary-700)] rounded-md hover:bg-opacity-80">Hesapla ve Uygula</button>
                    </div>
                    <FormInput label="Yeni Satış Fiyatı (₺)" id="new-price" required>
                        <input type="number" step="0.01" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)} autoFocus className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] transition bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </FormInput>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] font-semibold text-sm border border-[var(--border-color)]">İptal</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm">Fiyatı Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
    );
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

const CreditPage = ({ sales, salesPath, loading, categoryDiscounts }) => {
    const [selectedCredit, setSelectedCredit] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('nakit');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('unpaid'); // unpaid, paid, all
    const [sortBy, setSortBy] = useState('date'); // date, amount, customer
    const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Filter and sort credits
    const filteredCredits = useMemo(() => {
        let filtered = sales.filter(s => s.type === 'credit');
        
        // Filter by status
        if (filterStatus === 'unpaid') {
            filtered = filtered.filter(s => s.status === 'unpaid');
        } else if (filterStatus === 'paid') {
            filtered = filtered.filter(s => s.status === 'paid');
        }
        
        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(s => 
                s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.customerPhone?.includes(searchTerm) ||
                s.items?.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        // Sort
        filtered.sort((a, b) => {
            let aValue, bValue;
            switch (sortBy) {
                case 'amount':
                    aValue = a.total || 0;
                    bValue = b.total || 0;
                    break;
                case 'customer':
                    aValue = a.customerName || '';
                    bValue = b.customerName || '';
                    break;
                case 'date':
                default:
                    aValue = a.saleDate?.toDate?.() || new Date(0);
                    bValue = b.saleDate?.toDate?.() || new Date(0);
                    break;
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        return filtered;
    }, [sales, filterStatus, searchTerm, sortBy, sortOrder]);

    const unpaidCredits = useMemo(() => 
        filteredCredits.filter(s => s.status === 'unpaid'), 
        [filteredCredits]
    );

    const paidCredits = useMemo(() => 
        filteredCredits.filter(s => s.status === 'paid'), 
        [filteredCredits]
    );

    const totalUnpaidAmount = useMemo(() => 
        unpaidCredits.reduce((sum, credit) => sum + (credit.total || 0), 0),
        [unpaidCredits]
    );

    const totalPaidAmount = useMemo(() => 
        paidCredits.reduce((sum, credit) => sum + (credit.total || 0), 0),
        [paidCredits]
    );

    const handleMarkAsPaid = useCallback(async (saleId, amount = null, method = 'nakit') => {
        const saleRef = doc(db, salesPath, saleId);
        const updateData = {
                status: 'paid',
            paymentMethod: method,
            paidDate: serverTimestamp(),
            paidAmount: amount || null
        };
        
        await toast.promise(
            updateDoc(saleRef, updateData),
            {
                loading: 'Ödeme kaydediliyor...',
                success: 'Ödeme başarıyla kaydedildi!',
                error: 'İşlem sırasında bir hata oluştu.'
            }
        );
        
        setShowPaymentModal(false);
        setSelectedCredit(null);
        setPaymentAmount('');
    }, [salesPath]);

    const handlePartialPayment = useCallback(async () => {
        if (!selectedCredit || !paymentAmount) return;
        
        const amount = parseFloat(paymentAmount);
        if (amount <= 0 || amount > selectedCredit.total) {
            toast.error('Geçersiz ödeme tutarı');
            return;
        }
        
        // For now, we'll mark as fully paid. In a real system, you'd track partial payments
        await handleMarkAsPaid(selectedCredit.id, amount, paymentMethod);
    }, [selectedCredit, paymentAmount, paymentMethod, handleMarkAsPaid]);

    const getDaysOverdue = (saleDate) => {
        if (!saleDate?.toDate) return 0;
        const days = Math.floor((new Date() - saleDate.toDate()) / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    };

    const getOverdueStatus = (days) => {
        if (days === 0) return { text: 'Bugün', color: 'text-blue-600' };
        if (days <= 7) return { text: `${days} gün`, color: 'text-yellow-600' };
        if (days <= 30) return { text: `${days} gün`, color: 'text-orange-600' };
        return { text: `${days} gün`, color: 'text-red-600' };
    };

    if (loading) return <LoadingSpinner />;
    
    return (
        <div className="space-y-4">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted-color)]">Toplam Veresiye</p>
                            <p className="text-2xl font-bold text-[var(--text-color)]">{filteredCredits.length}</p>
                        </div>
                        <BookUser className="w-8 h-8 text-[var(--primary-600)]" />
                    </div>
                </div>
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted-color)]">Ödenmemiş</p>
                            <p className="text-2xl font-bold text-[var(--error-color)]">{formatCurrency(totalUnpaidAmount)}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-[var(--error-color)]" />
                    </div>
                </div>
                <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted-color)]">Ödenmiş</p>
                            <p className="text-2xl font-bold text-[var(--success-color)]">{formatCurrency(totalPaidAmount)}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-[var(--success-color)]" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Durum</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                        >
                            <option value="unpaid">Ödenmemiş</option>
                            <option value="paid">Ödenmiş</option>
                            <option value="all">Tümü</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Sıralama</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                        >
                            <option value="date">Tarih</option>
                            <option value="amount">Tutar</option>
                            <option value="customer">Müşteri</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Sıra</label>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                        >
                            <option value="desc">Azalan</option>
                            <option value="asc">Artan</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Arama</label>
                        <input
                            type="text"
                            placeholder="Müşteri, telefon, ürün ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                        />
                    </div>
                </div>
            </div>

            {/* Credits List */}
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--text-color)] mb-4">
                    Veresiye Kayıtları ({filteredCredits.length})
                </h3>
                
                {filteredCredits.length === 0 ? (
                    <EmptyState 
                        icon={<BookUser size={40}/>} 
                        message="Veresiye kaydı bulunmuyor" 
                        description="Arama kriterlerinizi değiştirin." 
                    />
                ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {filteredCredits.map(credit => {
                            const daysOverdue = getDaysOverdue(credit.saleDate);
                            const overdueStatus = getOverdueStatus(daysOverdue);
                            
                            return (
                                <div 
                                    key={credit.id} 
                                    onClick={() => {
                                        setSelectedCredit(credit);
                                        if (credit.status === 'unpaid') {
                                            setShowPaymentModal(true);
                                        }
                                    }}
                                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                                        credit.status === 'unpaid' 
                                            ? 'bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/30'
                                            : 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:hover:bg-green-100/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-[var(--text-color)]">
                                                    {credit.customerName || 'Müşteri Bilgisi Yok'}
                                                </p>
                                                {credit.status === 'unpaid' && (
                                                    <span className={`text-xs font-medium ${overdueStatus.color}`}>
                                                        {overdueStatus.text}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[var(--text-muted-color)] mb-1">
                                                {credit.customerPhone || 'Telefon yok'} • 
                                                {credit.saleDate?.toDate ? credit.saleDate.toDate().toLocaleString('tr-TR') : 'Tarih yok'}
                                            </p>
                                            <div className="flex gap-4 text-xs text-[var(--text-muted-color)]">
                                                <span>Ürün: {credit.items?.length || 0}</span>
                                                <span>Müşteri: {credit.customerName || 'Bilinmiyor'}</span>
                                                {credit.status === 'paid' && (
                                                    <span>Ödeme: {credit.paymentMethod || 'Nakit'}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${
                                                    credit.status === 'unpaid' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                    {formatCurrency(credit.total || 0)}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted-color)]">
                                                    {credit.status === 'unpaid' ? 'Ödenmemiş' : 'Ödenmiş'}
                                                </p>
                                            </div>
                                            {credit.status === 'unpaid' && (
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setSelectedCredit(credit);
                                                        setShowPaymentModal(true);
                                                    }} 
                                                    className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md" 
                                                    title="Ödeme Al"
                                                >
                                 <CheckCircle size={20} />
                            </button>
                                            )}
                        </div>
                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedCredit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-12" onClick={() => setShowPaymentModal(false)}>
                    <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-[var(--text-color)]">Ödeme Al</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-md hover:bg-[var(--surface-hover-color)]">
                                <X size={18}/>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-[var(--surface-color)] p-3 rounded-lg">
                                <p className="text-sm text-[var(--text-muted-color)]">Müşteri</p>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={selectedCredit.customerName || ''}
                                        onChange={async (e) => {
                                            const newName = e.target.value;
                                            setSelectedCredit(prev => ({ ...prev, customerName: newName }));
                                            try {
                                                await updateDoc(doc(db, salesPath, selectedCredit.id), { customerName: newName });
                                            } catch (err) {
                                                console.error('Müşteri adı güncellenemedi', err);
                                                toast.error('Müşteri adı güncellenemedi');
                                            }
                                        }}
                                        placeholder="Müşteri Adı"
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                                    />
                                    <input
                                        type="text"
                                        value={selectedCredit.customerPhone || ''}
                                        onChange={async (e) => {
                                            const newPhone = e.target.value;
                                            setSelectedCredit(prev => ({ ...prev, customerPhone: newPhone }));
                                            try {
                                                await updateDoc(doc(db, salesPath, selectedCredit.id), { customerPhone: newPhone });
                                            } catch (err) {
                                                console.error('Telefon güncellenemedi', err);
                                                toast.error('Telefon güncellenemedi');
                                            }
                                        }}
                                        placeholder="Telefon"
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-[var(--surface-color)] p-3 rounded-lg">
                                <p className="text-sm text-[var(--text-muted-color)]">Borç Tutarı</p>
                                <p className="text-xl font-bold text-red-600">
                                    {formatCurrency(selectedCredit.total || 0)}
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Ödeme Tutarı</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder={formatCurrency(selectedCredit.total || 0)}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Ödeme Yöntemi</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]"
                                >
                                    <option value="nakit">Nakit</option>
                                    <option value="kart">Kart</option>
                                    <option value="havale">Havale</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                onClick={() => setShowPaymentModal(false)} 
                                className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] border border-[var(--border-color)]"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={() => handleMarkAsPaid(selectedCredit.id, parseFloat(paymentAmount) || selectedCredit.total, paymentMethod)} 
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Ödeme Al
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credit Detail Modal */}
            {selectedCredit && !showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-12" onClick={() => setSelectedCredit(null)}>
                    <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-[var(--text-color)]">Veresiye Detayı</h3>
                            <button onClick={() => setSelectedCredit(null)} className="p-2 rounded-md hover:bg-[var(--surface-hover-color)]">
                                <X size={18}/>
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-[var(--text-muted-color)]">Tarih</p>
                                    <p className="font-medium text-[var(--text-color)]">
                                        {selectedCredit.saleDate?.toDate ? selectedCredit.saleDate.toDate().toLocaleString('tr-TR') : 'Tarih yok'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-muted-color)]">Durum</p>
                                    <p className={`font-medium ${selectedCredit.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                                        {selectedCredit.status === 'paid' ? 'Ödenmiş' : 'Ödenmemiş'}
                                    </p>
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-sm text-[var(--text-muted-color)]">Müşteri</p>
                                <p className="font-medium text-[var(--text-color)]">
                                    {selectedCredit.customerName || 'Müşteri Bilgisi Yok'}
                                </p>
                                <p className="text-xs text-[var(--text-muted-color)]">
                                    {selectedCredit.customerPhone || 'Telefon yok'}
                                </p>
                            </div>
                            
                            <div>
                                <p className="text-sm text-[var(--text-muted-color)]">Toplam</p>
                                <p className="text-xl font-bold text-[var(--text-color)]">
                                    {formatCurrency(selectedCredit.total || 0)}
                                </p>
                            </div>
                            
                            <div className="border-t border-[var(--border-color)] pt-3">
                                <p className="text-sm text-[var(--text-muted-color)] mb-2">Ürünler</p>
                                <div className="space-y-1">
                                    {selectedCredit.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-[var(--text-color)]">
                                                {item.name} ({item.quantity}x)
                                            </span>
                                            <span className="font-medium text-[var(--text-color)]">
                                                {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                            </span>
                 </div>
            ))}
                                </div>
                            </div>
                            
                            {selectedCredit.status === 'paid' && (
                                <div className="border-t border-[var(--border-color)] pt-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-[var(--text-muted-color)]">Ödeme Yöntemi</p>
                                            <p className="font-medium text-[var(--text-color)]">
                                                {selectedCredit.paymentMethod || 'Nakit'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--text-muted-color)]">Ödeme Tarihi</p>
                                            <p className="font-medium text-[var(--text-color)]">
                                                {selectedCredit.paidDate?.toDate ? selectedCredit.paidDate.toDate().toLocaleString('tr-TR') : 'Tarih yok'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                onClick={() => setSelectedCredit(null)} 
                                className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] border border-[var(--border-color)]"
                            >
                                Kapat
                            </button>
                            {selectedCredit.status === 'unpaid' && (
                                <button 
                                    onClick={() => {
                                        setShowPaymentModal(true);
                                    }} 
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Ödeme Al
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
    
    const totalItemDiscount = (items) => items.reduce((acc, item) => acc + (item.discountApplied || 0), 0);

    const handleExportSales = () => {
        const headers = [
            { label: 'Tarih', value: (s) => (s.saleDate && s.saleDate.toDate ? s.saleDate.toDate().toLocaleString('tr-TR') : '') },
            { label: 'Tür', value: 'type' },
            { label: 'Ödeme', value: (s) => s.paymentMethod || '' },
            { label: 'Durum', value: (s) => s.status || '' },
            { label: 'Müşteri', value: (s) => s.customerName || '' },
            { label: 'Telefon', value: (s) => s.customerPhone || '' },
            { label: 'Toplam', value: (s) => s.total },
            { label: 'Ara Toplam', value: (s) => s.subTotal ?? '' },
            { label: 'Kasa İndirimi', value: (s) => s.transactionDiscount ?? 0 },
            { label: 'Kalemler', value: (s) => (s.items ? s.items.map(i => `${i.quantity}x ${i.name}`).join(' | ') : '') }
        ];
        downloadCSV(`satis_gecmisi_${new Date().toISOString().slice(0,10)}.csv`, headers, sales);
    };

    return (
        <div>
            <div className="flex justify-end pb-2">
                <button onClick={handleExportSales} className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-color)] hover:bg-[var(--surface-hover-color)] flex items-center gap-1 text-sm">
                    <Download size={16}/> CSV İndir
                </button>
            </div>
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
                            {(s.status !== 'cancelled') && (
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
                        {/* Müşteri Bilgisi - Opsiyonel */}
                        {(s.customerName || s.customerPhone) && (
                            <div className="flex items-center gap-2 text-sm text-[var(--text-muted-color)] mb-2">
                                <User size={14} />
                                <span>
                                    {s.customerName && <span className="font-medium text-[var(--text-color)]">{s.customerName}</span>}
                                    {s.customerName && s.customerPhone && <span> • </span>}
                                    {s.customerPhone && <span>{s.customerPhone}</span>}
                                </span>
                            </div>
                        )}
                        
                        {s.items && Array.isArray(s.items) ? (
                            s.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <p className="text-[var(--text-color)]">
                                        <span className="font-medium">{item.quantity}x</span> {item.name}
                                    </p>
                                    <div className={`text-[var(--text-muted-color)] flex items-center gap-2 ${s.type === 'cancelled' ? 'line-through' : ''}`}>
                                        {item.discountApplied > 0 && (
                                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">-{formatCurrency(item.discountApplied)}</span>
                                        )}
                                        <span>{s.type !== 'personnel' ? formatCurrency(item.price * item.quantity) : ''}</span>
                                    </div>
                                </div>
                            ))
                        ) : null }
                    </div>
                    {(s.transactionDiscount > 0 || totalItemDiscount(s.items || []) > 0) && s.type !== 'cancelled' && (
                        <div className="mt-2 border-t border-dashed border-[var(--border-color)] pt-2 space-y-1 text-xs text-right">
                           <p>Ara Toplam: <span className="font-medium">{formatCurrency(s.subTotal || s.total + (s.transactionDiscount || 0))}</span></p>
                           <p className="text-red-600">Kasa İndirimi: <span className="font-medium">-{formatCurrency(s.transactionDiscount || 0)}</span></p>
                        </div>
                    )}
                </motion.div>
                ))}
            </div>
        </div>
    );
};

// Satın Alma Sayfası - Yeni Tasarım
const PurchasesPage = ({ products, purchases, suppliers, productsPath, purchasesPath, suppliersPath, settings }) => {
    const [items, setItems] = useState([]);
    const [header, setHeader] = useState({ supplier: '', invoiceNumber: '', notes: '', vatRate: 0 });
    const [newItem, setNewItem] = useState({ barcode: '', name: '', quantity: 0, purchasePrice: 0 });
    const [supplierFilter, setSupplierFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedPurchase, setSelectedPurchase] = useState(null);

    const uniqueSuppliers = useMemo(() => {
        if (suppliers && suppliers.length > 0) {
            return suppliers.map(s => s.name);
        }
        return Array.from(new Set((purchases || []).map(p => p.supplier).filter(Boolean)));
    }, [suppliers, purchases]);

    const filteredPurchases = useMemo(() => {
        let list = purchases || [];
        if (supplierFilter) {
            list = list.filter(p => (p.supplier || '').toLowerCase().includes(supplierFilter.toLowerCase()));
        }
        if (dateFrom) {
            const start = new Date(dateFrom);
            start.setHours(0,0,0,0);
            list = list.filter(p => {
                // Tarih alanı date, createdAt veya purchaseDate olabilir
                const dateField = p.date || p.createdAt || p.purchaseDate;
                if (!dateField) return true; // Tarih yoksa dahil et
                if (dateField.toDate) {
                    return dateField.toDate() >= start;
                }
                // String tarih ise
                const itemDate = new Date(dateField);
                return itemDate >= start;
            });
        }
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23,59,59,999);
            list = list.filter(p => {
                // Tarih alanı date, createdAt veya purchaseDate olabilir
                const dateField = p.date || p.createdAt || p.purchaseDate;
                if (!dateField) return true; // Tarih yoksa dahil et
                if (dateField.toDate) {
                    return dateField.toDate() <= end;
                }
                // String tarih ise
                const itemDate = new Date(dateField);
                return itemDate <= end;
            });
        }
        // En son eklenenler en üstte olsun
        return list.sort((a, b) => {
            const aDate = a.date || a.createdAt || a.purchaseDate;
            const bDate = b.date || b.createdAt || b.purchaseDate;
            if (!aDate || !bDate) return 0;
            
            const aTime = aDate.toDate ? aDate.toDate().getTime() : new Date(aDate).getTime();
            const bTime = bDate.toDate ? bDate.toDate().getTime() : new Date(bDate).getTime();
            
            return bTime - aTime; // En yeni en üstte
        });
    }, [purchases, supplierFilter, dateFrom, dateTo]);

    const addItem = () => {
        if (!newItem.barcode.trim() || !newItem.name.trim() || newItem.quantity <= 0 || newItem.purchasePrice <= 0) {
            toast.warning('Lütfen tüm alanları doldurun ve geçerli değerler girin.');
            return;
        }
        setItems([...items, { ...newItem, id: Date.now() }]);
        setNewItem({ barcode: '', name: '', quantity: 0, purchasePrice: 0 });
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const finalizePurchase = async () => {
        if (items.length === 0) { 
            toast.warning('Sepete en az bir kalem ekleyin.'); 
            return; 
        }
        
        try {
            // Önce satın alma kaydını oluştur
            const total = items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
            const vatAmount = total * (header.vatRate / 100);
            const grandTotal = total + vatAmount;

            const purchaseData = {
                supplier: header.supplier,
                invoiceNumber: header.invoiceNumber,
                notes: header.notes,
                vatRate: header.vatRate,
                items: items.map(item => ({
                    barcode: item.barcode,
                    name: item.name,
                    quantity: item.quantity,
                    purchasePrice: item.purchasePrice,
                    total: item.quantity * item.purchasePrice
                })),
                total: total,
                vatAmount: vatAmount,
                grandTotal: grandTotal,
                date: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            // Satın alma kaydını kaydet
            const purchaseRef = await addDoc(collection(db, purchasesPath), purchaseData);
            
            // Şimdi ürünleri güncelle
        for (const line of items) {
            const existing = products.find(p => p.id === line.barcode || p.barcode === line.barcode);
                
            if (existing) {
                    // Mevcut ürünü güncelle
                let newPurchasePrice = line.purchasePrice;
                if (settings.costMethod === 'weighted') {
                    const currentStock = Number(existing.stock || 0);
                    const currentCost = Number(existing.purchasePrice || 0);
                        const newStock = currentStock + line.quantity;
                        newPurchasePrice = ((currentStock * currentCost) + (line.quantity * line.purchasePrice)) / newStock;
                    }
                    
                    const updateData = {
                        stock: increment(line.quantity),
                        purchasePrice: newPurchasePrice,
                        lastPurchaseDate: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    };
                    
                    // Satış fiyatını otomatik güncelle
                    if (settings.autoUpdateSalePrice) {
                        const markup = settings.defaultMarkup || 0.3;
                        const newSalePrice = newPurchasePrice * (1 + markup);
                        updateData.salePrice = newSalePrice;
                    }
                    
                    await updateDoc(doc(db, productsPath, existing.id), updateData);
            } else {
                    // Yeni ürün oluştur
                    const markup = settings.defaultMarkup || 0.3;
                    const salePrice = line.purchasePrice * (1 + markup);
                    
                    await setDoc(doc(db, productsPath, line.barcode), {
                    barcode: line.barcode,
                    name: line.name,
                    stock: line.quantity,
                    purchasePrice: line.purchasePrice,
                        salePrice: salePrice,
                        category: 'Genel',
                    createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                });
            }
        }

            toast.success('Satın alma başarıyla kaydedildi!');
            
            // Formu temizle
        setItems([]);
        setHeader({ supplier: '', invoiceNumber: '', notes: '', vatRate: 0 });
            
        } catch (error) {
            console.error('Satın alma hatası:', error);
            toast.error('Satın alma sırasında bir hata oluştu: ' + error.message);
        }
    };

    const handleExportPurchases = () => {
        const headers = [
            { label: 'Tarih', value: (p) => {
                const dateField = p.date || p.createdAt || p.purchaseDate;
                if (!dateField) return '';
                if (dateField.toDate) return dateField.toDate().toLocaleString('tr-TR');
                return new Date(dateField).toLocaleString('tr-TR');
            }},
            { label: 'Tedarikçi', value: 'supplier' },
            { label: 'Fatura No', value: 'invoiceNumber' },
            { label: 'Toplam', value: 'grandTotal' },
            { label: 'KDV', value: 'vatAmount' },
            { label: 'Not', value: 'notes' }
        ];
        downloadCSV(`satinalmalar_${new Date().toISOString().slice(0,10)}.csv`, headers, filteredPurchases);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">Yeni Satın Alma</h1>
                <p className="text-[var(--text-muted)]">Tedarikçilerden ürün satın alma işlemlerini yönetin</p>
                    </div>

            {/* Satın Alma Başlığı */}
            <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">Satın Alma Bilgileri</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Tedarikçi</label>
                        <input 
                            type="text" 
                            value={header.supplier} 
                            onChange={e => setHeader(h => ({...h, supplier: e.target.value}))} 
                            placeholder="Tedarikçi adı" 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Fatura No</label>
                        <input 
                            type="text" 
                            value={header.invoiceNumber} 
                            onChange={e => setHeader(h => ({...h, invoiceNumber: e.target.value}))} 
                            placeholder="Fatura numarası" 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Not</label>
                        <input 
                            type="text" 
                            value={header.notes} 
                            onChange={e => setHeader(h => ({...h, notes: e.target.value}))} 
                            placeholder="Notlar" 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">KDV (%)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={header.vatRate} 
                            onChange={e => setHeader(h => ({...h, vatRate: parseFloat(e.target.value) || 0}))} 
                            placeholder="KDV Oranı" 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                </div>
                        </div>
                    </div>

            {/* Ürün Ekleme Formu */}
            <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">Ürün Ekle</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Barkod</label>
                        <input 
                            type="text" 
                            value={newItem.barcode} 
                            onChange={e => setNewItem(n => ({...n, barcode: e.target.value}))} 
                            placeholder="Barkod..." 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Ürün Adı</label>
                        <input 
                            type="text" 
                            value={newItem.name} 
                            onChange={e => setNewItem(n => ({...n, name: e.target.value}))} 
                            placeholder="Ürün adı..." 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Miktar</label>
                        <input 
                            type="number" 
                            min="1" 
                            value={newItem.quantity} 
                            onChange={e => setNewItem(n => ({...n, quantity: parseInt(e.target.value) || 0}))} 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Alış Fiyatı (₺)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={newItem.purchasePrice} 
                            onChange={e => setNewItem(n => ({...n, purchasePrice: parseFloat(e.target.value) || 0}))} 
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" 
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            type="button"
                            onClick={addItem}
                            className="w-full bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                        >
                            Kalem Ekle
                        </button>
                                    </div>
                                    </div>
                                    </div>

            {/* Eklenen Ürünler */}
            {items.length > 0 && (
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">Eklenen Ürünler</h2>
                    <div className="space-y-3">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--surface-color)] rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium text-[var(--text-color)]">{item.name} {item.barcode}</div>
                                    </div>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={item.quantity} 
                                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} 
                                        className="w-20 px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-color)] text-[var(--text-color)]" 
                                    />
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0" 
                                        value={item.purchasePrice} 
                                        onChange={e => updateItem(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)} 
                                        className="w-24 px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-color)] text-[var(--text-color)]" 
                                        />
                                    <div className="text-[var(--text-color)] font-medium">
                                        ₺{(item.quantity * item.purchasePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                    <button 
                                        onClick={() => removeItem(item.id)} 
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    </div>
                                </div>
                            ))}
                            </div>
                    
                    {/* Toplam ve Kaydet */}
                    <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                        <div className="flex justify-between items-center">
                            <div className="text-[var(--text-color)]">
                                <div>Ara Toplam: ₺{items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                <div>KDV ({header.vatRate}%): ₺{(items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0) * (header.vatRate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                <div className="font-bold text-lg">Genel Toplam: ₺{(items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0) * (1 + header.vatRate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div>
                                <button 
                                    type="button" 
                                    onClick={finalizePurchase}
                                    className="bg-[var(--primary-600)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                                >
                                    Satın Almayı Kaydet
                                </button>
                        </div>
                </div>
            </div>
                </div>
            )}

            {/* Son Satın Almalar */}
            <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text-color)]">Son Satın Almalar</h3>
                    <div className="flex flex-wrap gap-2">
                        <input 
                            list="supplier-list" 
                            value={supplierFilter} 
                            onChange={e => setSupplierFilter(e.target.value)} 
                            placeholder="Tedarikçiye göre filtrele" 
                            className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm w-48" 
                        />
                        <datalist id="supplier-list">
                            {uniqueSuppliers.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <input 
                            type="date" 
                            value={dateFrom} 
                            onChange={e => setDateFrom(e.target.value)} 
                            className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm" 
                        />
                        <input 
                            type="date" 
                            value={dateTo} 
                            onChange={e => setDateTo(e.target.value)} 
                            className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm" 
                        />
                        <button 
                            onClick={() => { setSupplierFilter(''); setDateFrom(''); setDateTo(''); }} 
                            className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-color)] hover:bg-[var(--surface-hover-color)] text-sm"
                        >
                            Temizle
                        </button>
                        <button 
                            onClick={handleExportPurchases} 
                            className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-color)] hover:bg-[var(--surface-hover-color)] flex items-center gap-1 text-sm"
                        >
                        <Download size={16}/> CSV İndir
                    </button>
                </div>
            </div>
                
                <div className="max-h-[55vh] overflow-y-auto space-y-2">
                {filteredPurchases.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            <FileText size={40} className="mx-auto mb-2 opacity-50" />
                            <p>Henüz satın alma kaydı yok.</p>
                        </div>
                ) : filteredPurchases.map(p => (
                        <button 
                            key={p.id} 
                            onClick={() => setSelectedPurchase(p)} 
                            className="w-full text-left p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] hover:bg-[var(--surface-hover-color)] transition-colors"
                        >
                        <div className="flex justify-between items-center">
                            <div>
                                    <p className="text-sm font-semibold text-[var(--text-color)]">
                                        {p.items && p.items.length > 0 ? `${p.items.length} ürün` : 'Satın Alma'}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {(() => {
                                            const dateField = p.date || p.createdAt || p.purchaseDate;
                                            if (!dateField) return '';
                                            if (dateField.toDate) return dateField.toDate().toLocaleString('tr-TR');
                                            return new Date(dateField).toLocaleString('tr-TR');
                                        })()}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {p.supplier ? `Tedarikçi: ${p.supplier}` : ''} 
                                        {p.invoiceNumber ? ` • Fatura: ${p.invoiceNumber}` : ''}
                                    </p>
                            </div>
                            <div className="text-right">
                                    <p className="font-bold text-[var(--text-color)]">
                                        ₺{p.grandTotal ? p.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0.00'}
                                    </p>
                            </div>
                        </div>
                    </button>
                ))}
                </div>
            </div>

            {selectedPurchase && (
                <PurchaseDetailModal 
                    purchase={selectedPurchase}
                    onClose={() => setSelectedPurchase(null)}
                    productsPath={productsPath}
                    purchasesPath={purchasesPath}
                />
            )}
        </div>
    );
};

const PurchaseDetailModal = ({ purchase, onClose, productsPath, purchasesPath }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            // Stok geri alma + satın alma kaydını silme
            const batch = writeBatch(db);
            const purchaseRef = doc(db, purchasesPath, purchase.id);
            const productRef = doc(db, productsPath, purchase.barcode);
            if (purchase.quantity && purchase.quantity > 0) {
                batch.update(productRef, { stock: increment(-purchase.quantity) });
            }
            batch.delete(purchaseRef);
            await toast.promise(batch.commit(), {
                loading: 'Satın alma siliniyor...',
                success: 'Satın alma kaydı silindi ve stok geri alındı.',
                error: 'Silme sırasında bir hata oluştu.'
            });
            onClose();
        } catch (e) {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-12" onClick={onClose}>
            <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-[var(--text-color)]">Satın Alma Detayı</h3>
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-[var(--surface-hover-color)]"><X size={18}/></button>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Tarih</span><span className="font-medium">{purchase.purchaseDate && purchase.purchaseDate.toDate ? purchase.purchaseDate.toDate().toLocaleString('tr-TR') : ''}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Ürün</span><span className="font-medium">{purchase.productName}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Barkod</span><span className="font-medium">{purchase.barcode}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Tedarikçi</span><span className="font-medium">{purchase.supplier || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Fatura No</span><span className="font-medium">{purchase.invoiceNumber || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Miktar</span><span className="font-medium">{purchase.quantity}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Alış Fiyatı</span><span className="font-medium">{formatCurrency(purchase.purchasePrice)}</span></div>
                    {Array.isArray(purchase.items) ? (
                        <div className="mt-2 border-t border-[var(--border-color)] pt-2 space-y-1">
                            {purchase.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-[var(--text-muted-color)]">{it.barcode} • {it.name} ({it.quantity} x {formatCurrency(it.purchasePrice)})</span>
                                    <span className="font-medium">{formatCurrency(it.lineTotal || it.quantity * it.purchasePrice)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-xs"><span className="text-[var(--text-muted-color)]">Ara Toplam</span><span className="font-medium">{formatCurrency(purchase.subTotal || 0)}</span></div>
                            <div className="flex justify-between text-xs"><span className="text-[var(--text-muted-color)]">KDV ({purchase.vatRate || 0}%)</span><span className="font-medium">{formatCurrency(purchase.vatAmount || 0)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-[var(--text-muted-color)]">Toplam</span><span className="font-bold">{formatCurrency(purchase.totalCost || 0)}</span></div>
                        </div>
                    ) : (
                        <div className="flex justify-between"><span className="text-[var(--text-muted-color)]">Toplam Tutar</span><span className="font-bold">{formatCurrency(purchase.totalCost)}</span></div>
                    )}
                    {purchase.notes && <div className="pt-2 text-[var(--text-muted-color)]"><span className="text-xs">Not: </span><span className="text-[var(--text-color)]">{purchase.notes}</span></div>}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => printPurchaseReceipt(purchase)} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] border border-[var(--border-color)] flex items-center gap-2"><Download size={16}/> Yazdır/İndir</button>
                    <button onClick={onClose} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] border border-[var(--border-color)]">Kapat</button>
                    <button onClick={() => toast(`Kaydı silmek istediğinize emin misiniz?`, { action: { label: 'Evet, sil', onClick: handleDelete }, cancel: { label: 'Vazgeç' } })} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" disabled={isDeleting}>Sil</button>
                </div>
            </div>
        </div>
    );
};

// Tedarikçi Yönetimi
const SuppliersPage = ({ suppliers, suppliersPath, purchases }) => {
    const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => (suppliers || []).filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase())), [suppliers, search]);

    const saveSupplier = async (e) => {
        e.preventDefault();
        const name = (form.name || '').trim();
        if (!name) { toast.warning('Tedarikçi adı zorunludur.'); return; }
        const supplierRef = doc(db, suppliersPath, name);
        const data = { ...form, name, updatedAt: serverTimestamp() };
        await toast.promise(setDoc(supplierRef, data, { merge: true }), {
            loading: 'Kaydediliyor...',
            success: 'Tedarikçi kaydedildi.',
            error: 'Kayıt sırasında hata oluştu.'
        });
        setForm({ name: '', contact: '', phone: '', email: '', address: '' });
    };

    const deleteSupplier = async (name) => {
        const supplierRef = doc(db, suppliersPath, name);
        await toast.promise(deleteDoc(supplierRef), {
            loading: 'Siliniyor...',
            success: 'Tedarikçi silindi.',
            error: 'Silme sırasında hata.'
        });
    };

    const exportSuppliers = () => {
        const headers = [
            { label: 'Ad', value: 'name' },
            { label: 'İrtibat', value: (s) => s.contact || '' },
            { label: 'Telefon', value: (s) => s.phone || '' },
            { label: 'E-posta', value: (s) => s.email || '' },
            { label: 'Adres', value: (s) => s.address || '' }
        ];
        downloadCSV(`tedarikciler_${new Date().toISOString().slice(0,10)}.csv`, headers, suppliers || []);
    };

    return (
        <div className="space-y-4">
            <div className="bg-[var(--surface-color)] p-4 rounded-lg border border-[var(--border-color)]">
                <h3 className="font-semibold mb-3 text-[var(--text-color)] flex items-center gap-2"><Users size={18}/> Tedarikçi</h3>
                <form onSubmit={saveSupplier} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Ad</label>
                        <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" required />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">İrtibat</label>
                        <input value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Telefon</label>
                        <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">E-posta</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs text-[var(--text-muted-color)] mb-1">Adres</label>
                        <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)]" />
                    </div>
                    <div className="md:col-span-6 flex justify-end gap-2">
                        <button type="button" onClick={() => setForm({ name: '', contact: '', phone: '', email: '', address: '' })} className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-sm">Temizle</button>
                        <button type="submit" className="bg-[var(--primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-700)]">Kaydet</button>
                    </div>
                </form>
            </div>

            <div className="flex items-center justify-between">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara: tedarikçi adı" className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] text-sm w-60" />
                <button onClick={exportSuppliers} className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-color)] hover:bg-[var(--surface-hover-color)] flex items-center gap-1 text-sm"><Download size={16}/> CSV İndir</button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2 pb-4">
                {filtered.length === 0 ? (
                    <EmptyState icon={<Users size={40}/>} message="Tedarikçi bulunamadı." />
                ) : filtered.map(s => (
                    <div key={s.id || s.name} className="p-3 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-color)]">{s.name}</p>
                                <p className="text-xs text-[var(--text-muted-color)]">{s.contact || ''} {s.phone ? `• ${s.phone}` : ''} {s.email ? `• ${s.email}` : ''}</p>
                                {s.address && <p className="text-xs text-[var(--text-muted-color)]">{s.address}</p>}
                            </div>
                            <div className="text-right">
                                <button onClick={() => toast(`'${s.name}' silinsin mi?`, { action: { label: 'Evet, sil', onClick: () => deleteSupplier(s.name) }, cancel: { label: 'İptal' } })} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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
const BackupPage = ({ products, sales, purchases, suppliers, customers, categories, expenses, payments, customerPoints }) => {
    const [activeTab, setActiveTab] = useState('export');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState(null);

    const exportData = async (format = 'json') => {
        setIsExporting(true);
        try {
            const data = {
                products,
                sales,
                purchases,
                suppliers,
                customers,
                categories,
                expenses,
                payments,
                customerPoints,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `stok-takip-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else if (format === 'csv') {
                // Export products as CSV
                const csvData = convertToCSV(
                    ['ID', 'Barkod', 'Ad', 'Kategori', 'Stok', 'Alış Fiyatı', 'Satış Fiyatı', 'KDV', 'Açıklama'],
                    products.map(p => [
                        p.id,
                        p.barcode || '',
                        p.name || '',
                        p.category || '',
                        p.stock || 0,
                        p.purchasePrice || 0,
                        p.salePrice || 0,
                        p.vatRate || 0,
                        p.description || ''
                    ])
                );
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `urunler-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            toast.success(`${format.toUpperCase()} formatında yedekleme tamamlandı`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Yedekleme sırasında hata oluştu');
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportFile(file);
        
        if (file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    setImportPreview(data);
                } catch (error) {
                    toast.error('Geçersiz JSON dosyası');
                    setImportPreview(null);
                }
            };
            reader.readAsText(file);
        } else {
            toast.error('Sadece JSON dosyaları destekleniyor');
            setImportFile(null);
        }
    };

    const importData = async () => {
        if (!importFile || !importPreview) return;

        setIsImporting(true);
        try {
            const batch = writeBatch(db);
            let importedCount = 0;
            let errorCount = 0;

            // Import products
            if (importPreview.products && Array.isArray(importPreview.products)) {
                for (const product of importPreview.products) {
                    try {
                        const productRef = doc(collection(db, 'products'));
                        const productData = {
                            ...product,
                            id: productRef.id, // Use new ID
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(productRef, productData);
                        importedCount++;
                    } catch (error) {
                        console.error('Product import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import categories
            if (importPreview.categories && Array.isArray(importPreview.categories)) {
                for (const category of importPreview.categories) {
                    try {
                        const categoryRef = doc(collection(db, 'categories'));
                        const categoryData = {
                            ...category,
                            id: categoryRef.id,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(categoryRef, categoryData);
                        importedCount++;
                    } catch (error) {
                        console.error('Category import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import suppliers
            if (importPreview.suppliers && Array.isArray(importPreview.suppliers)) {
                for (const supplier of importPreview.suppliers) {
                    try {
                        const supplierRef = doc(collection(db, 'suppliers'));
                        const supplierData = {
                            ...supplier,
                            id: supplierRef.id,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(supplierRef, supplierData);
                        importedCount++;
                    } catch (error) {
                        console.error('Supplier import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import customers
            if (importPreview.customers && Array.isArray(importPreview.customers)) {
                for (const customer of importPreview.customers) {
                    try {
                        const customerRef = doc(collection(db, 'customers'));
                        const customerData = {
                            ...customer,
                            id: customerRef.id,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(customerRef, customerData);
                        importedCount++;
                    } catch (error) {
                        console.error('Customer import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import sales (be careful with sales as they affect stock)
            if (importPreview.sales && Array.isArray(importPreview.sales)) {
                for (const sale of importPreview.sales) {
                    try {
                        const saleRef = doc(collection(db, 'sales'));
                        const saleData = {
                            ...sale,
                            id: saleRef.id,
                            saleDate: sale.saleDate ? new Date(sale.saleDate) : serverTimestamp(),
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(saleRef, saleData);
                        importedCount++;
                    } catch (error) {
                        console.error('Sale import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import purchases
            if (importPreview.purchases && Array.isArray(importPreview.purchases)) {
                for (const purchase of importPreview.purchases) {
                    try {
                        const purchaseRef = doc(collection(db, 'purchases'));
                        const purchaseData = {
                            ...purchase,
                            id: purchaseRef.id,
                            purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate) : serverTimestamp(),
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(purchaseRef, purchaseData);
                        importedCount++;
                    } catch (error) {
                        console.error('Purchase import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import expenses
            if (importPreview.expenses && Array.isArray(importPreview.expenses)) {
                for (const expense of importPreview.expenses) {
                    try {
                        const expenseRef = doc(collection(db, 'expenses'));
                        const expenseData = {
                            ...expense,
                            id: expenseRef.id,
                            date: expense.date ? new Date(expense.date) : serverTimestamp(),
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(expenseRef, expenseData);
                        importedCount++;
                    } catch (error) {
                        console.error('Expense import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import payments
            if (importPreview.payments && Array.isArray(importPreview.payments)) {
                for (const payment of importPreview.payments) {
                    try {
                        const paymentRef = doc(collection(db, 'payments'));
                        const paymentData = {
                            ...payment,
                            id: paymentRef.id,
                            date: payment.date ? new Date(payment.date) : serverTimestamp(),
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(paymentRef, paymentData);
                        importedCount++;
                    } catch (error) {
                        console.error('Payment import error:', error);
                        errorCount++;
                    }
                }
            }

            // Import customer points
            if (importPreview.customerPoints && Array.isArray(importPreview.customerPoints)) {
                for (const point of importPreview.customerPoints) {
                    try {
                        const pointRef = doc(collection(db, 'customer_points'));
                        const pointData = {
                            ...point,
                            id: pointRef.id,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        batch.set(pointRef, pointData);
                        importedCount++;
                    } catch (error) {
                        console.error('Customer point import error:', error);
                        errorCount++;
                    }
                }
            }

            // Commit the batch
            await batch.commit();

            if (errorCount > 0) {
                toast.warning(`${importedCount} kayıt başarıyla içe aktarıldı, ${errorCount} kayıt hatası`);
            } else {
                toast.success(`${importedCount} kayıt başarıyla içe aktarıldı`);
            }

            setImportFile(null);
            setImportPreview(null);
        } catch (error) {
            console.error('Import error:', error);
            toast.error('İçe aktarma sırasında hata oluştu: ' + error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const getDataStats = () => {
        return {
            products: products.length,
            sales: sales.length,
            purchases: purchases.length,
            suppliers: suppliers.length,
            customers: customers.length,
            categories: categories.length,
            expenses: expenses.length,
            payments: payments.length,
            customerPoints: customerPoints.length
        };
    };

    const stats = getDataStats();

    return (
        <div className="p-4 bg-[var(--bg-color)] rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--text-color)] flex items-center gap-2">
                    <HardDrive className="w-6 h-6 text-[var(--primary-600)]" />
                    Yedekleme ve Geri Yükleme
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'export' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        Dışa Aktar
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'import' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        İçe Aktar
                    </button>
                </div>
            </div>

            {/* Data Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-[var(--surface-color)] p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-[var(--text-color)]">{stats.products}</div>
                    <div className="text-xs text-[var(--text-muted-color)]">Ürünler</div>
                </div>
                <div className="bg-[var(--surface-color)] p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-[var(--text-color)]">{stats.sales}</div>
                    <div className="text-xs text-[var(--text-muted-color)]">Satışlar</div>
                </div>
                <div className="bg-[var(--surface-color)] p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-[var(--text-color)]">{stats.purchases}</div>
                    <div className="text-xs text-[var(--text-muted-color)]">Alışlar</div>
                </div>
                <div className="bg-[var(--surface-color)] p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-[var(--text-color)]">{stats.customers}</div>
                    <div className="text-xs text-[var(--text-muted-color)]">Müşteriler</div>
                </div>
                <div className="bg-[var(--surface-color)] p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-[var(--text-color)]">{stats.suppliers}</div>
                    <div className="text-xs text-[var(--text-muted-color)]">Tedarikçiler</div>
                </div>
                <div className="bg-[var(--surface-color)] p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-[var(--text-color)]">{stats.categories}</div>
                    <div className="text-xs text-[var(--text-muted-color)]">Kategoriler</div>
                </div>
            </div>

            {/* Export Tab */}
            {activeTab === 'export' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Veri Dışa Aktarma
                        </h3>
                        <div className="space-y-4">
                            <p className="text-[var(--text-muted-color)]">
                                Tüm verilerinizi güvenli bir şekilde dışa aktarabilirsiniz. JSON formatı tüm verileri içerir, 
                                CSV formatı sadece ürünleri içerir.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => exportData('json')}
                                    disabled={isExporting}
                                    className="px-6 py-3 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Database className="w-4 h-4" />
                                    {isExporting ? 'Dışa Aktarılıyor...' : 'JSON Olarak Dışa Aktar'}
                                </button>
                                <button
                                    onClick={() => exportData('csv')}
                                    disabled={isExporting}
                                    className="px-6 py-3 bg-[var(--info-color)] text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <FileText className="w-4 h-4" />
                                    {isExporting ? 'Dışa Aktarılıyor...' : 'CSV Olarak Dışa Aktar'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Önemli Notlar
                        </h3>
                        <div className="space-y-2 text-sm text-[var(--text-muted-color)]">
                            <p>• JSON formatı tüm verileri (ürünler, satışlar, müşteriler vb.) içerir</p>
                            <p>• CSV formatı sadece ürün listesini içerir</p>
                            <p>• Yedekleme dosyalarını güvenli bir yerde saklayın</p>
                            <p>• Düzenli yedekleme yapmanız önerilir</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Tab */}
            {activeTab === 'import' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Veri İçe Aktarma
                        </h3>
                        <div className="space-y-4">
                            <p className="text-[var(--text-muted-color)]">
                                Daha önce dışa aktardığınız JSON dosyalarını içe aktarabilirsiniz.
                            </p>
                            <div className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="import-file"
                                />
                                <label
                                    htmlFor="import-file"
                                    className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                    <Upload className="w-8 h-8 text-[var(--text-muted-color)]" />
                                    <span className="text-[var(--text-color)]">JSON dosyası seçin</span>
                                    <span className="text-sm text-[var(--text-muted-color)]">Sadece JSON formatı destekleniyor</span>
                                </label>
                            </div>
                            
                            {importPreview && (
                                <div className="bg-[var(--bg-color)] p-4 rounded-lg border border-[var(--border-color)]">
                                    <h4 className="font-medium text-[var(--text-color)] mb-2">Önizleme:</h4>
                                    <div className="text-sm text-[var(--text-muted-color)] space-y-1">
                                        <p>Dosya Adı: {importFile.name}</p>
                                        <p>Dosya Boyutu: {(importFile.size / 1024).toFixed(2)} KB</p>
                                        <p>İçerik: {Object.keys(importPreview).join(', ')}</p>
                                        <p>Dışa Aktarma Tarihi: {importPreview.exportDate ? new Date(importPreview.exportDate).toLocaleString('tr-TR') : 'Bilinmiyor'}</p>
                                    </div>
                                    <button
                                        onClick={importData}
                                        disabled={isImporting}
                                        className="mt-3 px-4 py-2 bg-[var(--success-color)] text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {isImporting ? 'İçe Aktarılıyor...' : 'Verileri İçe Aktar'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Uyarılar
                        </h3>
                        <div className="space-y-2 text-sm text-[var(--text-muted-color)]">
                            <p>• İçe aktarma işlemi mevcut verileri etkileyebilir</p>
                            <p>• İşlem öncesi yedekleme yapmanız önerilir</p>
                            <p>• Sadece bu sistemden dışa aktarılan dosyalar desteklenir</p>
                            <p>• İçe aktarma özelliği yakında aktif olacak</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsPage = ({ settings, setSettings, settingsPath }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [tempSettings, setTempSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const { applyTheme } = useTheme();

    useEffect(() => {
        setTempSettings(settings);
    }, [settings]);

    // Apply theme changes in real-time for preview
    useEffect(() => {
        if (tempSettings.theme && tempSettings.palette) {
            applyTheme(tempSettings.theme, tempSettings.palette);
        }
    }, [tempSettings.theme, tempSettings.palette, applyTheme]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Validate that at least one section is enabled
            const enabledSections = tempSettings.enabledSections || {};
            const hasEnabledSection = Object.values(enabledSections).some(enabled => enabled);
            
            if (!hasEnabledSection) {
                toast.error('En az bir sidebar bölümü aktif olmalıdır');
                setIsSaving(false);
                return;
            }
            
            // Ensure settings feature is always enabled
            if (tempSettings.enabledFeatures) {
                tempSettings.enabledFeatures.settings = true;
            }
            
            await setDoc(doc(db, settingsPath, 'appSettings'), {
                ...tempSettings,
                updatedAt: serverTimestamp()
            }, { merge: true });
            setSettings(tempSettings);
            
            // Save theme settings to localStorage for persistence
            localStorage.setItem('theme', tempSettings.theme || 'light');
            localStorage.setItem('palette', tempSettings.palette || 'teal');
            
            toast.success('Ayarlar kaydedildi');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Ayarlar kaydedilemedi');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setTempSettings(settings);
        // Reset theme to original settings
        if (settings.theme && settings.palette) {
            applyTheme(settings.theme, settings.palette);
        }
        toast.info('Ayarlar sıfırlandı');
    };

    const colorPalettes = {
        teal: { name: 'Teal', primary: '#0ea5a5', secondary: '#14b8a6' },
        blue: { name: 'Blue', primary: '#3b82f6', secondary: '#2563eb' },
        purple: { name: 'Purple', primary: '#8b5cf6', secondary: '#7c3aed' },
        green: { name: 'Green', primary: '#10b981', secondary: '#059669' },
        orange: { name: 'Orange', primary: '#f97316', secondary: '#ea580c' },
        red: { name: 'Red', primary: '#ef4444', secondary: '#dc2626' },
        pink: { name: 'Pink', primary: '#ec4899', secondary: '#db2777' },
        indigo: { name: 'Indigo', primary: '#6366f1', secondary: '#4f46e5' }
    };

    return (
        <div className="p-4 bg-[var(--bg-color)] rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--text-color)] flex items-center gap-2">
                    <Settings className="w-6 h-6 text-[var(--primary-600)]" />
                    Ayarlar
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Sıfırla
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'general' 
                            ? 'bg-[var(--primary-600)] text-white' 
                            : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                    }`}
                >
                    Genel
                </button>
                <button
                    onClick={() => setActiveTab('company')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'company' 
                            ? 'bg-[var(--primary-600)] text-white' 
                            : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                    }`}
                >
                    Şirket Bilgileri
                </button>
                <button
                    onClick={() => setActiveTab('appearance')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'appearance' 
                            ? 'bg-[var(--primary-600)] text-white' 
                            : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                    }`}
                >
                    Görünüm
                </button>
                <button
                    onClick={() => setActiveTab('business')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'business' 
                            ? 'bg-[var(--primary-600)] text-white' 
                            : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                    }`}
                >
                    İş Ayarları
                </button>
                <button
                    onClick={() => setActiveTab('sidebar')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'sidebar' 
                            ? 'bg-[var(--primary-600)] text-white' 
                            : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                    }`}
                >
                    Sidebar Düzenleme
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'notifications' 
                            ? 'bg-[var(--primary-600)] text-white' 
                            : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                    }`}
                >
                    Bildirimler
                </button>
            </div>

            {/* General Settings */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Genel Ayarlar
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Kritik Stok Seviyesi</label>
                                <input
                                    type="number"
                                    value={tempSettings.criticalStockLevel || 5}
                                    onChange={(e) => setTempSettings({...tempSettings, criticalStockLevel: parseInt(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    min="0"
                                />
                                <p className="text-xs text-[var(--text-muted-color)] mt-1">Bu seviyenin altındaki ürünler kritik stok olarak işaretlenir</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Maliyet Hesaplama Yöntemi</label>
                                <select
                                    value={tempSettings.costMethod || 'last'}
                                    onChange={(e) => setTempSettings({...tempSettings, costMethod: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                >
                                    <option value="last">Son Alış Fiyatı</option>
                                    <option value="average">Ortalama Alış Fiyatı</option>
                                    <option value="fifo">FIFO (İlk Giren İlk Çıkar)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Varsayılan Kar Marjı (%)</label>
                                <input
                                    type="number"
                                    value={tempSettings.defaultMarkupPercent || 0}
                                    onChange={(e) => setTempSettings({...tempSettings, defaultMarkupPercent: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    min="0"
                                    step="0.1"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="autoUpdateSalePrice"
                                    checked={tempSettings.autoUpdateSalePrice || false}
                                    onChange={(e) => setTempSettings({...tempSettings, autoUpdateSalePrice: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="autoUpdateSalePrice" className="text-sm text-[var(--text-color)]">Alış fiyatı değiştiğinde satış fiyatını otomatik güncelle</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Company Information */}
            {activeTab === 'company' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Şirket Bilgileri
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Şirket Adı</label>
                                <input
                                    type="text"
                                    value={tempSettings.companyName || ''}
                                    onChange={(e) => setTempSettings({...tempSettings, companyName: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    placeholder="İşletmem"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Logo URL</label>
                                <input
                                    type="url"
                                    value={tempSettings.companyLogoUrl || ''}
                                    onChange={(e) => setTempSettings({...tempSettings, companyLogoUrl: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Adres</label>
                                <textarea
                                    value={tempSettings.companyAddress || ''}
                                    onChange={(e) => setTempSettings({...tempSettings, companyAddress: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    rows="3"
                                    placeholder="Şirket adresi"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Vergi Numarası</label>
                                    <input
                                        type="text"
                                        value={tempSettings.companyTaxNumber || ''}
                                        onChange={(e) => setTempSettings({...tempSettings, companyTaxNumber: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        placeholder="1234567890"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Telefon</label>
                                    <input
                                        type="tel"
                                        value={tempSettings.companyPhone || ''}
                                        onChange={(e) => setTempSettings({...tempSettings, companyPhone: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        placeholder="+90 555 123 45 67"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">E-posta</label>
                                    <input
                                        type="email"
                                        value={tempSettings.companyEmail || ''}
                                        onChange={(e) => setTempSettings({...tempSettings, companyEmail: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        placeholder="info@sirket.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Website</label>
                                    <input
                                        type="url"
                                        value={tempSettings.companyWebsite || ''}
                                        onChange={(e) => setTempSettings({...tempSettings, companyWebsite: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        placeholder="https://www.sirket.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Görünüm Ayarları
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-3">Tema</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setTempSettings({...tempSettings, theme: 'light'})}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                            tempSettings.theme === 'light' 
                                                ? 'bg-[var(--primary-600)] text-white' 
                                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                                        }`}
                                    >
                                        <Sun className="w-4 h-4" />
                                        Açık Tema
                                    </button>
                                    <button
                                        onClick={() => setTempSettings({...tempSettings, theme: 'dark'})}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                            tempSettings.theme === 'dark' 
                                                ? 'bg-[var(--primary-600)] text-white' 
                                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                                        }`}
                                    >
                                        <Moon className="w-4 h-4" />
                                        Koyu Tema
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-3">Renk Paleti</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {Object.entries(colorPalettes).map(([key, palette]) => (
                                        <button
                                            key={key}
                                            onClick={() => setTempSettings({...tempSettings, palette: key})}
                                            className={`p-3 rounded-lg border-2 transition-all ${
                                                tempSettings.palette === key 
                                                    ? 'border-[var(--primary-600)]' 
                                                    : 'border-[var(--border-color)] hover:border-[var(--primary-300)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div 
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: palette.primary }}
                                                />
                                                <span className="text-sm font-medium text-[var(--text-color)]">{palette.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Business Settings */}
            {activeTab === 'business' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            İş Ayarları
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Varsayılan KDV Oranı (%)</label>
                                <input
                                    type="number"
                                    value={tempSettings.defaultVatRate || 18}
                                    onChange={(e) => setTempSettings({...tempSettings, defaultVatRate: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Para Birimi</label>
                                <select
                                    value={tempSettings.currency || 'TRY'}
                                    onChange={(e) => setTempSettings({...tempSettings, currency: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                >
                                    <option value="TRY">Türk Lirası (₺)</option>
                                    <option value="USD">Amerikan Doları ($)</option>
                                    <option value="EUR">Euro (€)</option>
                                    <option value="GBP">İngiliz Sterlini (£)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="enableBarcodeScanner"
                                    checked={tempSettings.enableBarcodeScanner !== false}
                                    onChange={(e) => setTempSettings({...tempSettings, enableBarcodeScanner: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="enableBarcodeScanner" className="text-sm text-[var(--text-color)]">Barkod tarayıcısını etkinleştir</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="enableReceiptPrinting"
                                    checked={tempSettings.enableReceiptPrinting || false}
                                    onChange={(e) => setTempSettings({...tempSettings, enableReceiptPrinting: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="enableReceiptPrinting" className="text-sm text-[var(--text-color)]">Fiş yazdırmayı etkinleştir</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Customization Settings */}
            {activeTab === 'sidebar' && (
                <div className="space-y-6">
                    {/* Section Management */}
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Bölüm Yönetimi
                        </h3>
                        <p className="text-sm text-[var(--text-muted-color)] mb-6">
                            Sidebar'da görünmesini istediğiniz bölümleri seçin ve sıralayın.
                        </p>
                        
                        <div className="space-y-4">
                            {(tempSettings.sidebarOrder || ['main', 'inventory', 'purchasing', 'finance', 'customers', 'reports', 'tools']).map((sectionKey, index) => {
                                const section = {
                                    main: { title: 'Ana İşlemler', description: 'Satış, Dashboard, Hızlı Satış', color: 'text-blue-600' },
                                    inventory: { title: 'Stok Yönetimi', description: 'Stok, Sayım, Kritik Stok, Kategoriler', color: 'text-green-600' },
                                    purchasing: { title: 'Satın Alma', description: 'Satın Alma, Tedarikçiler, Siparişler', color: 'text-purple-600' },
                                    finance: { title: 'Finans', description: 'Kasa, Giderler, Veresiye, Ödemeler', color: 'text-yellow-600' },
                                    customers: { title: 'Müşteriler', description: 'Müşteri yönetimi', color: 'text-pink-600' },
                                    reports: { title: 'Raporlar', description: 'İstatistikler, Geçmiş, Raporlar, Analitik', color: 'text-indigo-600' },
                                    tools: { title: 'Araçlar', description: 'İndirimler, Ayarlar, Yedekleme, Notlar', color: 'text-gray-600' }
                                }[sectionKey];
                                
                                if (!section) return null;
                                
                                return (
                                    <div key={sectionKey} className="flex items-center gap-3 p-4 border border-[var(--border-color)] rounded-lg">
                                        <div className="flex items-center gap-2 text-gray-400 cursor-move">
                                            <GripVertical size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`font-medium ${section.color}`}>{section.title}</h4>
                                            </div>
                                            <p className="text-sm text-[var(--text-muted-color)]">{section.description}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={tempSettings.enabledSections?.[sectionKey] || false}
                                                disabled={sectionKey === 'tools'} // Araçlar bölümü (ayarlar dahil) kapatılamaz
                                                onChange={(e) => {
                                                    setTempSettings(prev => ({
                                                        ...prev,
                                                        enabledSections: {
                                                            ...prev.enabledSections,
                                                            [sectionKey]: e.target.checked
                                                        }
                                                    }));
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-200)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-600)] ${sectionKey === 'tools' ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Feature Management */}
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Özellik Yönetimi
                        </h3>
                        <p className="text-sm text-[var(--text-muted-color)] mb-6">
                            Her bölümdeki alt özellikleri ayrı ayrı açıp kapatabilirsiniz.
                        </p>
                        
                        <div className="space-y-6">
                            {[
                                { 
                                    section: 'main', 
                                    title: 'Ana İşlemler', 
                                    color: 'text-blue-600',
                                    features: [
                                        { id: 'salesScreen', name: 'Satış Ekranı', description: 'Hızlı satış ve sepet yönetimi' },
                                        { id: 'quickSale', name: 'Hızlı Satış', description: 'Tek tıkla anında satış' },
                                        { id: 'dashboard', name: 'Dashboard', description: 'Genel işletme durumu' }
                                    ]
                                },
                                { 
                                    section: 'inventory', 
                                    title: 'Stok Yönetimi', 
                                    color: 'text-green-600',
                                    features: [
                                        { id: 'stock', name: 'Stok Yönetimi', description: 'Ürün ekleme, düzenleme ve takip' },
                                        { id: 'stockCount', name: 'Stok Sayımı', description: 'Fiziksel stok kontrolü' },
                                        { id: 'lowStock', name: 'Kritik Stok', description: 'Düşük stok uyarıları' },
                                        { id: 'categories', name: 'Kategoriler', description: 'Ürün kategorileri yönetimi' }
                                    ]
                                },
                                { 
                                    section: 'purchasing', 
                                    title: 'Satın Alma', 
                                    color: 'text-purple-600',
                                    features: [
                                        { id: 'purchases', name: 'Satın Alma', description: 'Tedarikçilerden ürün alımı' },
                                        { id: 'suppliers', name: 'Tedarikçiler', description: 'Tedarikçi bilgileri ve iletişim' },
                                        { id: 'purchaseOrders', name: 'Siparişler', description: 'Açık ve geçmiş siparişler' }
                                    ]
                                },
                                { 
                                    section: 'finance', 
                                    title: 'Finans', 
                                    color: 'text-yellow-600',
                                    features: [
                                        { id: 'cashDrawer', name: 'Kasa Yönetimi', description: 'Günlük kasa işlemleri' },
                                        { id: 'expenses', name: 'Giderler', description: 'İşletme giderleri takibi' },
                                        { id: 'credit', name: 'Veresiye', description: 'Müşteri borçları' },
                                        { id: 'payments', name: 'Ödemeler', description: 'Ödeme yöntemleri ve geçmişi' }
                                    ]
                                },
                                { 
                                    section: 'customers', 
                                    title: 'Müşteriler', 
                                    color: 'text-pink-600',
                                    features: [
                                        { id: 'customers', name: 'Müşteriler', description: 'Müşteri bilgileri ve geçmişi' }
                                    ]
                                },
                                { 
                                    section: 'reports', 
                                    title: 'Raporlar', 
                                    color: 'text-indigo-600',
                                    features: [
                                        { id: 'statistics', name: 'İstatistikler', description: 'Detaylı satış analizleri' },
                                        { id: 'history', name: 'İşlem Geçmişi', description: 'Tüm işlem kayıtları' },
                                        { id: 'reports', name: 'Raporlar', description: 'Kâr/zarar ve performans raporları' },
                                        { id: 'analytics', name: 'Analitik', description: 'Gelişmiş veri analizi' }
                                    ]
                                },
                                { 
                                    section: 'tools', 
                                    title: 'Araçlar', 
                                    color: 'text-gray-600',
                                    features: [
                                        { id: 'discounts', name: 'İndirimler', description: 'Ürün ve kategori indirimleri' },
                                        { id: 'settings', name: 'Ayarlar', description: 'Sistem ayarları ve yapılandırma' },
                                        { id: 'backup', name: 'Yedekleme', description: 'Veri yedekleme ve geri yükleme' },
                                        { id: 'notes', name: 'Notlar', description: 'Kişisel notlar ve hatırlatıcılar' }
                                    ]
                                }
                            ].map(section => (
                                <div key={section.section} className="border border-[var(--border-color)] rounded-lg p-4">
                                    <h4 className={`font-medium mb-3 ${section.color}`}>{section.title}</h4>
                                    <div className="space-y-2">
                                        {section.features.map(feature => (
                                            <div key={feature.id} className="flex items-center justify-between p-2 rounded">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{feature.name}</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted-color)]">{feature.description}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={tempSettings.enabledFeatures?.[feature.id] !== false}
                                                        disabled={feature.id === 'settings'} // Ayarlar asla kapatılamaz
                                                        onChange={(e) => {
                                                            setTempSettings(prev => ({
                                                                ...prev,
                                                                enabledFeatures: {
                                                                    ...prev.enabledFeatures,
                                                                    [feature.id]: e.target.checked
                                                                }
                                                            }));
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary-200)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-600)] ${feature.id === 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Önemli Notlar</h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Ayarlar bölümü asla kapatılamaz</li>
                                    <li>• En az bir bölüm aktif olmalıdır</li>
                                    <li>• Değişiklikler kaydedildikten sonra sidebar otomatik güncellenir</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Bildirim Ayarları
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="lowStockNotifications"
                                    checked={tempSettings.lowStockNotifications !== false}
                                    onChange={(e) => setTempSettings({...tempSettings, lowStockNotifications: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="lowStockNotifications" className="text-sm text-[var(--text-color)]">Düşük stok bildirimleri</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="expiredProductNotifications"
                                    checked={tempSettings.expiredProductNotifications || false}
                                    onChange={(e) => setTempSettings({...tempSettings, expiredProductNotifications: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="expiredProductNotifications" className="text-sm text-[var(--text-color)]">Süresi dolan ürün bildirimleri</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="dailySalesReport"
                                    checked={tempSettings.dailySalesReport || false}
                                    onChange={(e) => setTempSettings({...tempSettings, dailySalesReport: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="dailySalesReport" className="text-sm text-[var(--text-color)]">Günlük satış raporu</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="backupReminders"
                                    checked={tempSettings.backupReminders || false}
                                    onChange={(e) => setTempSettings({...tempSettings, backupReminders: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="backupReminders" className="text-sm text-[var(--text-color)]">Yedekleme hatırlatmaları</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// Bildirim Sistemi
const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [isEnabled, setIsEnabled] = useState(false);
    const [permission, setPermission] = useState('default');

    // Request notification permission
    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            toast.error('Bu tarayıcı bildirimleri desteklemiyor');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);
            
            if (permission === 'granted') {
                setIsEnabled(true);
                toast.success('Bildirimler etkinleştirildi');
                return true;
            } else {
                toast.warning('Bildirim izni reddedildi');
                return false;
            }
        } catch (error) {
            console.error('Notification permission error:', error);
            toast.error('Bildirim izni alınamadı');
            return false;
        }
    }, []);

    // Send notification
    const sendNotification = useCallback((title, options = {}) => {
        if (!isEnabled || permission !== 'granted') {
            // Fallback to toast
            toast.info(title);
            return;
        }

        try {
            const notification = new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });

            // Auto close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            // Add to notifications list
            setNotifications(prev => [...prev, {
                id: Date.now(),
                title,
                options,
                timestamp: new Date(),
                read: false
            }]);

        } catch (error) {
            console.error('Notification send error:', error);
            toast.error('Bildirim gönderilemedi');
        }
    }, [isEnabled, permission]);

    // Mark notification as read
    const markAsRead = useCallback((id) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === id ? { ...notif, read: true } : notif
            )
        );
    }, []);

    // Clear all notifications
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Auto-request permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't auto-request, let user decide
        }
    }, []);

    const value = {
        notifications,
        isEnabled,
        permission,
        requestPermission,
        sendNotification,
        markAsRead,
        clearAll
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

// Çoklu Dil Desteği
const LanguageContext = createContext();

const translations = {
    tr: {
        // Genel
        'app.title': 'Stok Takip Uygulaması',
        'app.company': 'İşletme Paneli',
        'app.loading': 'Yükleniyor...',
        'app.error': 'Hata',
        'app.success': 'Başarılı',
        'app.warning': 'Uyarı',
        'app.info': 'Bilgi',
        'app.save': 'Kaydet',
        'app.cancel': 'İptal',
        'app.delete': 'Sil',
        'app.edit': 'Düzenle',
        'app.add': 'Ekle',
        'app.search': 'Ara',
        'app.filter': 'Filtrele',
        'app.clear': 'Temizle',
        'app.close': 'Kapat',
        'app.back': 'Geri',
        'app.next': 'İleri',
        'app.previous': 'Önceki',
        'app.confirm': 'Onayla',
        'app.yes': 'Evet',
        'app.no': 'Hayır',
        
        // Navigasyon
        'nav.dashboard': 'Gösterge Paneli',
        'nav.sales': 'Satış Ekranı',
        'nav.quickSale': 'Hızlı Satış',
        'nav.inventory': 'Stok Yönetimi',
        'nav.stockCount': 'Stok Sayımı',
        'nav.lowStock': 'Kritik Stok',
        'nav.categories': 'Kategoriler',
        'nav.purchases': 'Satın Alma',
        'nav.suppliers': 'Tedarikçiler',
        'nav.purchaseOrders': 'Siparişler',
        'nav.cashDrawer': 'Kasa Yönetimi',
        'nav.expenses': 'Giderler',
        'nav.credit': 'Veresiye',
        'nav.payments': 'Ödemeler',
        'nav.customers': 'Müşteriler',
        'nav.loyalty': 'Sadakat Programı',
        'nav.reports': 'Raporlar',
        'nav.analytics': 'Analitik',
        'nav.settings': 'Ayarlar',
        'nav.backup': 'Yedekleme',
        'nav.users': 'Kullanıcılar',
        'nav.history': 'İşlem Geçmişi',
        
        // Roller
        'role.admin': 'Yönetici',
        'role.manager': 'Müdür',
        'role.cashier': 'Kasiyer',
        'role.user': 'Kullanıcı',
        
        // Bildirimler
        'notification.enabled': 'Bildirimler etkinleştirildi',
        'notification.disabled': 'Bildirimler devre dışı',
        'notification.permission.denied': 'Bildirim izni reddedildi',
        'notification.permission.error': 'Bildirim izni alınamadı',
        'notification.sale.completed': 'Satış Tamamlandı',
        'notification.stock.low': 'Düşük Stok Uyarısı',
        
        // Satış
        'sales.title': 'Satış Ekranı',
        'sales.cart': 'Sepet',
        'sales.total': 'Toplam',
        'sales.payment': 'Ödeme',
        'sales.cash': 'Nakit',
        'sales.card': 'Kart',
        'sales.credit': 'Veresiye',
        'sales.personnel': 'Personel',
        'sales.completed': 'Satış tamamlandı',
        'sales.cancelled': 'Satış iptal edildi',
        
        // Stok
        'stock.title': 'Stok Yönetimi',
        'stock.add': 'Ürün Ekle',
        'stock.edit': 'Ürün Düzenle',
        'stock.name': 'Ürün Adı',
        'stock.barcode': 'Barkod',
        'stock.category': 'Kategori',
        'stock.quantity': 'Miktar',
        'stock.price': 'Fiyat',
        'stock.purchasePrice': 'Alış Fiyatı',
        'stock.salePrice': 'Satış Fiyatı',
        'stock.vat': 'KDV',
        'stock.description': 'Açıklama',
        'stock.low': 'Düşük Stok',
        'stock.critical': 'Kritik Stok',
        
        // Müşteriler
        'customer.title': 'Müşteri Yönetimi',
        'customer.name': 'Müşteri Adı',
        'customer.phone': 'Telefon',
        'customer.email': 'E-posta',
        'customer.address': 'Adres',
        'customer.add': 'Müşteri Ekle',
        'customer.edit': 'Müşteri Düzenle',
        'customer.totalPurchases': 'Toplam Alışveriş',
        'customer.lastPurchase': 'Son Alışveriş',
        
        // Raporlar
        'report.title': 'Raporlar',
        'report.sales': 'Satış Raporu',
        'report.purchases': 'Alış Raporu',
        'report.profit': 'Kar/Zarar',
        'report.inventory': 'Stok Raporu',
        'report.export': 'Dışa Aktar',
        'report.dateRange': 'Tarih Aralığı',
        'report.today': 'Bugün',
        'report.thisWeek': 'Bu Hafta',
        'report.thisMonth': 'Bu Ay',
        'report.thisYear': 'Bu Yıl',
        
        // Ayarlar
        'settings.title': 'Ayarlar',
        'settings.general': 'Genel',
        'settings.company': 'Şirket Bilgileri',
        'settings.appearance': 'Görünüm',
        'settings.business': 'İş Ayarları',
        'settings.notifications': 'Bildirimler',
        'settings.companyName': 'Şirket Adı',
        'settings.companyAddress': 'Şirket Adresi',
        'settings.companyPhone': 'Şirket Telefonu',
        'settings.companyEmail': 'Şirket E-postası',
        'settings.theme': 'Tema',
        'settings.light': 'Açık',
        'settings.dark': 'Koyu',
        'settings.palette': 'Renk Paleti',
        'settings.language': 'Dil',
        'settings.turkish': 'Türkçe',
        'settings.english': 'İngilizce',
        
        // Yedekleme
        'backup.title': 'Yedekleme ve Geri Yükleme',
        'backup.export': 'Dışa Aktar',
        'backup.import': 'İçe Aktar',
        'backup.json': 'JSON Formatı',
        'backup.csv': 'CSV Formatı',
        'backup.download': 'İndir',
        'backup.upload': 'Yükle',
        'backup.success': 'Yedekleme başarılı',
        'backup.error': 'Yedekleme hatası',
        
        // Kullanıcılar
        'user.title': 'Kullanıcı Yönetimi',
        'user.add': 'Kullanıcı Ekle',
        'user.edit': 'Kullanıcı Düzenle',
        'user.email': 'E-posta',
        'user.password': 'Şifre',
        'user.name': 'Ad Soyad',
        'user.phone': 'Telefon',
        'user.role': 'Rol',
        'user.active': 'Aktif',
        'user.inactive': 'Pasif',
        'user.created': 'Oluşturulma Tarihi',
        'user.lastLogin': 'Son Giriş',
        
        // Hata Mesajları
        'error.generic': 'Bir hata oluştu',
        'error.network': 'Ağ hatası',
        'error.permission': 'Yetki hatası',
        'error.validation': 'Doğrulama hatası',
        'error.notFound': 'Bulunamadı',
        'error.unauthorized': 'Yetkisiz erişim',
        'error.forbidden': 'Erişim reddedildi',
        'error.server': 'Sunucu hatası',
        
        // Başarı Mesajları
        'success.saved': 'Başarıyla kaydedildi',
        'success.updated': 'Başarıyla güncellendi',
        'success.deleted': 'Başarıyla silindi',
        'success.created': 'Başarıyla oluşturuldu',
        'success.sent': 'Başarıyla gönderildi',
        'success.completed': 'Başarıyla tamamlandı'
    },
    en: {
        // General
        'app.title': 'Stock Management App',
        'app.company': 'Business Panel',
        'app.loading': 'Loading...',
        'app.error': 'Error',
        'app.success': 'Success',
        'app.warning': 'Warning',
        'app.info': 'Info',
        'app.save': 'Save',
        'app.cancel': 'Cancel',
        'app.delete': 'Delete',
        'app.edit': 'Edit',
        'app.add': 'Add',
        'app.search': 'Search',
        'app.filter': 'Filter',
        'app.clear': 'Clear',
        'app.close': 'Close',
        'app.back': 'Back',
        'app.next': 'Next',
        'app.previous': 'Previous',
        'app.confirm': 'Confirm',
        'app.yes': 'Yes',
        'app.no': 'No',
        
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.sales': 'Sales Screen',
        'nav.quickSale': 'Quick Sale',
        'nav.inventory': 'Inventory Management',
        'nav.stockCount': 'Stock Count',
        'nav.lowStock': 'Low Stock',
        'nav.categories': 'Categories',
        'nav.purchases': 'Purchases',
        'nav.suppliers': 'Suppliers',
        'nav.purchaseOrders': 'Purchase Orders',
        'nav.cashDrawer': 'Cash Drawer',
        'nav.expenses': 'Expenses',
        'nav.credit': 'Credit',
        'nav.payments': 'Payments',
        'nav.customers': 'Customers',
        'nav.loyalty': 'Loyalty Program',
        'nav.reports': 'Reports',
        'nav.analytics': 'Analytics',
        'nav.settings': 'Settings',
        'nav.backup': 'Backup',
        'nav.users': 'Users',
        'nav.history': 'Transaction History',
        
        // Roles
        'role.admin': 'Administrator',
        'role.manager': 'Manager',
        'role.cashier': 'Cashier',
        'role.user': 'User',
        
        // Notifications
        'notification.enabled': 'Notifications enabled',
        'notification.disabled': 'Notifications disabled',
        'notification.permission.denied': 'Notification permission denied',
        'notification.permission.error': 'Could not get notification permission',
        'notification.sale.completed': 'Sale Completed',
        'notification.stock.low': 'Low Stock Warning',
        
        // Sales
        'sales.title': 'Sales Screen',
        'sales.cart': 'Cart',
        'sales.total': 'Total',
        'sales.payment': 'Payment',
        'sales.cash': 'Cash',
        'sales.card': 'Card',
        'sales.credit': 'Credit',
        'sales.personnel': 'Personnel',
        'sales.completed': 'Sale completed',
        'sales.cancelled': 'Sale cancelled',
        
        // Stock
        'stock.title': 'Inventory Management',
        'stock.add': 'Add Product',
        'stock.edit': 'Edit Product',
        'stock.name': 'Product Name',
        'stock.barcode': 'Barcode',
        'stock.category': 'Category',
        'stock.quantity': 'Quantity',
        'stock.price': 'Price',
        'stock.purchasePrice': 'Purchase Price',
        'stock.salePrice': 'Sale Price',
        'stock.vat': 'VAT',
        'stock.description': 'Description',
        'stock.low': 'Low Stock',
        'stock.critical': 'Critical Stock',
        
        // Customers
        'customer.title': 'Customer Management',
        'customer.name': 'Customer Name',
        'customer.phone': 'Phone',
        'customer.email': 'Email',
        'customer.address': 'Address',
        'customer.add': 'Add Customer',
        'customer.edit': 'Edit Customer',
        'customer.totalPurchases': 'Total Purchases',
        'customer.lastPurchase': 'Last Purchase',
        
        // Reports
        'report.title': 'Reports',
        'report.sales': 'Sales Report',
        'report.purchases': 'Purchase Report',
        'report.profit': 'Profit/Loss',
        'report.inventory': 'Inventory Report',
        'report.export': 'Export',
        'report.dateRange': 'Date Range',
        'report.today': 'Today',
        'report.thisWeek': 'This Week',
        'report.thisMonth': 'This Month',
        'report.thisYear': 'This Year',
        
        // Settings
        'settings.title': 'Settings',
        'settings.general': 'General',
        'settings.company': 'Company Information',
        'settings.appearance': 'Appearance',
        'settings.business': 'Business Settings',
        'settings.notifications': 'Notifications',
        'settings.companyName': 'Company Name',
        'settings.companyAddress': 'Company Address',
        'settings.companyPhone': 'Company Phone',
        'settings.companyEmail': 'Company Email',
        'settings.theme': 'Theme',
        'settings.light': 'Light',
        'settings.dark': 'Dark',
        'settings.palette': 'Color Palette',
        'settings.language': 'Language',
        'settings.turkish': 'Turkish',
        'settings.english': 'English',
        
        // Backup
        'backup.title': 'Backup and Restore',
        'backup.export': 'Export',
        'backup.import': 'Import',
        'backup.json': 'JSON Format',
        'backup.csv': 'CSV Format',
        'backup.download': 'Download',
        'backup.upload': 'Upload',
        'backup.success': 'Backup successful',
        'backup.error': 'Backup error',
        
        // Users
        'user.title': 'User Management',
        'user.add': 'Add User',
        'user.edit': 'Edit User',
        'user.email': 'Email',
        'user.password': 'Password',
        'user.name': 'Full Name',
        'user.phone': 'Phone',
        'user.role': 'Role',
        'user.active': 'Active',
        'user.inactive': 'Inactive',
        'user.created': 'Created Date',
        'user.lastLogin': 'Last Login',
        
        // Error Messages
        'error.generic': 'An error occurred',
        'error.network': 'Network error',
        'error.permission': 'Permission error',
        'error.validation': 'Validation error',
        'error.notFound': 'Not found',
        'error.unauthorized': 'Unauthorized access',
        'error.forbidden': 'Access denied',
        'error.server': 'Server error',
        
        // Success Messages
        'success.saved': 'Successfully saved',
        'success.updated': 'Successfully updated',
        'success.deleted': 'Successfully deleted',
        'success.created': 'Successfully created',
        'success.sent': 'Successfully sent',
        'success.completed': 'Successfully completed'
    }
};

const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('app-language') || 'tr';
    });

    const t = useCallback((key, fallback = key) => {
        return translations[language]?.[key] || fallback;
    }, [language]);

    const changeLanguage = useCallback((newLanguage) => {
        setLanguage(newLanguage);
        localStorage.setItem('app-language', newLanguage);
    }, []);

    const value = {
        language,
        setLanguage: changeLanguage,
        t,
        translations: translations[language] || translations.tr
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};

const UsersPage = ({ users, setUsers, usersPath }) => {
    const [activeTab, setActiveTab] = useState('list');
    const [form, setForm] = useState({ 
        email: '', 
        password: '', 
        role: 'user', 
        name: '', 
        phone: '', 
        isActive: true 
    });
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState('');

    const roles = [
        { value: 'admin', label: 'Yönetici', description: 'Tüm yetkilere sahip' },
        { value: 'manager', label: 'Müdür', description: 'Satış ve stok yönetimi' },
        { value: 'cashier', label: 'Kasiyer', description: 'Sadece satış işlemleri' },
        { value: 'user', label: 'Kullanıcı', description: 'Sınırlı erişim' }
    ];

    const filteredUsers = useMemo(() => {
        return (users || []).filter(user => 
            (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (user.name || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    const saveUser = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingUser) {
                // Update existing user
                await updateDoc(doc(db, usersPath, editingUser.id), {
                    ...form,
                    updatedAt: serverTimestamp()
                });
                toast.success('Kullanıcı güncellendi');
            } else {
                // Create new user
                await addDoc(collection(db, usersPath), {
                    ...form,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                toast.success('Kullanıcı oluşturuldu');
            }
            setForm({ email: '', password: '', role: 'user', name: '', phone: '', isActive: true });
            setEditingUser(null);
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error('Kullanıcı kaydedilemedi');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
        
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, usersPath, userId));
            toast.success('Kullanıcı silindi');
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Kullanıcı silinemedi');
        } finally {
            setIsDeleting(false);
        }
    };

    const editUser = (user) => {
        setForm({
            email: user.email || '',
            password: '', // Don't show password
            role: user.role || 'user',
            name: user.name || '',
            phone: user.phone || '',
            isActive: user.isActive !== false
        });
        setEditingUser(user);
        setActiveTab('form');
    };

    const resetForm = () => {
        setForm({ email: '', password: '', role: 'user', name: '', phone: '', isActive: true });
        setEditingUser(null);
    };

    const getRoleInfo = (role) => {
        return roles.find(r => r.value === role) || roles[3];
    };

    return (
        <div className="p-4 bg-[var(--bg-color)] rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--text-color)] flex items-center gap-2">
                    <UserCog className="w-6 h-6 text-[var(--primary-600)]" />
                    Kullanıcı Yönetimi
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'list' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        Kullanıcılar
                    </button>
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'form' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        {editingUser ? 'Düzenle' : 'Yeni Kullanıcı'}
                    </button>
                </div>
            </div>

            {/* Users List Tab */}
            {activeTab === 'list' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--text-color)]">Kullanıcı Listesi</h3>
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-[var(--text-muted-color)]" />
                                <input
                                    type="text"
                                    placeholder="Kullanıcı ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {filteredUsers.map(user => {
                                const roleInfo = getRoleInfo(user.role);
                                return (
                                    <div key={user.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[var(--primary-100)] rounded-full flex items-center justify-center">
                                                <Users className="w-5 h-5 text-[var(--primary-600)]" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-[var(--text-color)]">{user.name || user.email}</h4>
                                                <p className="text-sm text-[var(--text-muted-color)]">{user.email}</p>
                                                <p className="text-xs text-[var(--text-muted-color)]">{roleInfo.label}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                user.isActive !== false 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {user.isActive !== false ? 'Aktif' : 'Pasif'}
                                            </span>
                                            <button
                                                onClick={() => editUser(user)}
                                                className="p-2 text-[var(--primary-600)] hover:bg-[var(--primary-100)] rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                disabled={isDeleting}
                                                className="p-2 text-[var(--error-color)] hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {filteredUsers.length === 0 && (
                                <div className="text-center py-8 text-[var(--text-muted-color)]">
                                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Kullanıcı bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* User Form Tab */}
            {activeTab === 'form' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--text-color)]">
                                {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
                            </h3>
                            <button
                                onClick={resetForm}
                                className="px-3 py-1 text-sm text-[var(--text-muted-color)] hover:text-[var(--text-color)] transition-colors"
                            >
                                Temizle
                            </button>
                        </div>
                        
                        <form onSubmit={saveUser} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">E-posta</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({...form, email: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">
                                        Şifre {editingUser && <span className="text-xs text-[var(--text-muted-color)]">(Boş bırakırsanız değişmez)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({...form, password: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        required={!editingUser}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Ad Soyad</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({...form, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Telefon</label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm({...form, phone: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Rol</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({...form, role: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                >
                                    {roles.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label} - {role.description}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({...form, isActive: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="isActive" className="text-sm text-[var(--text-color)]">Aktif kullanıcı</label>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Kaydediliyor...' : (editingUser ? 'Güncelle' : 'Oluştur')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('list')}
                                    className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--surface-hover-color)] transition-colors"
                                >
                                    İptal
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)] flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Rol Yetkileri
                        </h3>
                        <div className="space-y-3">
                            {roles.map(role => (
                                <div key={role.value} className="p-3 border border-[var(--border-color)] rounded-lg">
                                    <h4 className="font-medium text-[var(--text-color)]">{role.label}</h4>
                                    <p className="text-sm text-[var(--text-muted-color)]">{role.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LoyaltyPage = ({ loyaltyPrograms, loyaltyTiers, loyaltyRewards, customerPoints, customers, loyaltyProgramsPath, loyaltyTiersPath, loyaltyRewardsPath, customerPointsPath }) => {
    const [activeTab, setActiveTab] = useState('programs');
    const [form, setForm] = useState({ name: '', description: '', pointsPerLira: 1, isActive: true });
    const [tierForm, setTierForm] = useState({ name: '', minPoints: 0, discountPercent: 0, color: '#0ea5a5' });
    const [rewardForm, setRewardForm] = useState({ name: '', description: '', pointsRequired: 0, discountPercent: 0, isActive: true });

    const saveProgram = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, loyaltyProgramsPath), {
                ...form,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setForm({ name: '', description: '', pointsPerLira: 1, isActive: true });
            toast.success('Sadakat programı kaydedildi');
        } catch (error) {
            console.error('Error saving loyalty program:', error);
            toast.error('Program kaydedilemedi');
        }
    };

    const saveTier = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, loyaltyTiersPath), {
                ...tierForm,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setTierForm({ name: '', minPoints: 0, discountPercent: 0, color: '#0ea5a5' });
            toast.success('Seviye kaydedildi');
        } catch (error) {
            console.error('Error saving tier:', error);
            toast.error('Seviye kaydedilemedi');
        }
    };

    const saveReward = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, loyaltyRewardsPath), {
                ...rewardForm,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setRewardForm({ name: '', description: '', pointsRequired: 0, discountPercent: 0, isActive: true });
            toast.success('Ödül kaydedildi');
        } catch (error) {
            console.error('Error saving reward:', error);
            toast.error('Ödül kaydedilemedi');
        }
    };

    const getCustomerTier = (totalPoints) => {
        const sortedTiers = [...loyaltyTiers].sort((a, b) => b.minPoints - a.minPoints);
        return sortedTiers.find(tier => totalPoints >= tier.minPoints) || sortedTiers[sortedTiers.length - 1];
    };

    const getCustomerStats = () => {
        const totalCustomers = customerPoints.length;
        const activeCustomers = customerPoints.filter(cp => cp.totalPoints > 0).length;
        const totalPointsIssued = customerPoints.reduce((sum, cp) => sum + (cp.totalPoints || 0), 0);
        const totalPointsRedeemed = customerPoints.reduce((sum, cp) => sum + (cp.redeemedPoints || 0), 0);
        
        return { totalCustomers, activeCustomers, totalPointsIssued, totalPointsRedeemed };
    };

    const stats = getCustomerStats();

    return (
        <div className="p-4 bg-[var(--bg-color)] rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--text-color)] flex items-center gap-2">
                    <Star className="w-6 h-6 text-[var(--primary-600)]" />
                    Sadakat Programı
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('programs')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'programs' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        Programlar
                    </button>
                    <button
                        onClick={() => setActiveTab('tiers')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'tiers' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        Seviyeler
                    </button>
                    <button
                        onClick={() => setActiveTab('rewards')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'rewards' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        Ödüller
                    </button>
                    <button
                        onClick={() => setActiveTab('customers')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'customers' 
                                ? 'bg-[var(--primary-600)] text-white' 
                                : 'bg-[var(--surface-color)] text-[var(--text-color)] hover:bg-[var(--surface-hover-color)]'
                        }`}
                    >
                        Müşteriler
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-[var(--primary-600)]" />
                        <span className="text-sm text-[var(--text-muted-color)]">Toplam Müşteri</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-color)]">{stats.totalCustomers}</div>
                </div>
                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-[var(--primary-600)]" />
                        <span className="text-sm text-[var(--text-muted-color)]">Aktif Müşteri</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-color)]">{stats.activeCustomers}</div>
                </div>
                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-[var(--primary-600)]" />
                        <span className="text-sm text-[var(--text-muted-color)]">Verilen Puan</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-color)]">{stats.totalPointsIssued.toLocaleString()}</div>
                </div>
                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-5 h-5 text-[var(--primary-600)]" />
                        <span className="text-sm text-[var(--text-muted-color)]">Kullanılan Puan</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-color)]">{stats.totalPointsRedeemed.toLocaleString()}</div>
                </div>
            </div>

            {/* Programs Tab */}
            {activeTab === 'programs' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">Yeni Program Ekle</h3>
                        <form onSubmit={saveProgram} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Program Adı</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({...form, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">TL Başına Puan</label>
                                    <input
                                        type="number"
                                        value={form.pointsPerLira}
                                        onChange={(e) => setForm({...form, pointsPerLira: parseFloat(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        min="0"
                                        step="0.1"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Açıklama</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({...form, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    rows="3"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({...form, isActive: e.target.checked})}
                                    className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                />
                                <label htmlFor="isActive" className="text-sm text-[var(--text-color)]">Aktif</label>
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                            >
                                Program Kaydet
                            </button>
                        </form>
                    </div>

                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">Mevcut Programlar</h3>
                        <div className="space-y-3">
                            {loyaltyPrograms.map(program => (
                                <div key={program.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-[var(--text-color)]">{program.name}</h4>
                                        <p className="text-sm text-[var(--text-muted-color)]">{program.description}</p>
                                        <p className="text-sm text-[var(--text-muted-color)]">{program.pointsPerLira} puan/TL</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            program.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {program.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tiers Tab */}
            {activeTab === 'tiers' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">Yeni Seviye Ekle</h3>
                        <form onSubmit={saveTier} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Seviye Adı</label>
                                    <input
                                        type="text"
                                        value={tierForm.name}
                                        onChange={(e) => setTierForm({...tierForm, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Minimum Puan</label>
                                    <input
                                        type="number"
                                        value={tierForm.minPoints}
                                        onChange={(e) => setTierForm({...tierForm, minPoints: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">İndirim (%)</label>
                                    <input
                                        type="number"
                                        value={tierForm.discountPercent}
                                        onChange={(e) => setTierForm({...tierForm, discountPercent: parseFloat(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Renk</label>
                                <input
                                    type="color"
                                    value={tierForm.color}
                                    onChange={(e) => setTierForm({...tierForm, color: e.target.value})}
                                    className="w-20 h-10 border border-[var(--border-color)] rounded-lg"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                            >
                                Seviye Kaydet
                            </button>
                        </form>
                    </div>

                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">Mevcut Seviyeler</h3>
                        <div className="space-y-3">
                            {loyaltyTiers.sort((a, b) => a.minPoints - b.minPoints).map(tier => (
                                <div key={tier.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: tier.color }}
                                        />
                                        <div>
                                            <h4 className="font-medium text-[var(--text-color)]">{tier.name}</h4>
                                            <p className="text-sm text-[var(--text-muted-color)]">{tier.minPoints} puan - %{tier.discountPercent} indirim</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
                <div className="space-y-6">
                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">Yeni Ödül Ekle</h3>
                        <form onSubmit={saveReward} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Ödül Adı</label>
                                    <input
                                        type="text"
                                        value={rewardForm.name}
                                        onChange={(e) => setRewardForm({...rewardForm, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Gerekli Puan</label>
                                    <input
                                        type="number"
                                        value={rewardForm.pointsRequired}
                                        onChange={(e) => setRewardForm({...rewardForm, pointsRequired: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Açıklama</label>
                                <textarea
                                    value={rewardForm.description}
                                    onChange={(e) => setRewardForm({...rewardForm, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    rows="3"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-color)] mb-2">İndirim (%)</label>
                                    <input
                                        type="number"
                                        value={rewardForm.discountPercent}
                                        onChange={(e) => setRewardForm({...rewardForm, discountPercent: parseFloat(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        required
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="rewardActive"
                                        checked={rewardForm.isActive}
                                        onChange={(e) => setRewardForm({...rewardForm, isActive: e.target.checked})}
                                        className="w-4 h-4 text-[var(--primary-600)] bg-[var(--bg-color)] border-[var(--border-color)] rounded focus:ring-[var(--primary-600)]"
                                    />
                                    <label htmlFor="rewardActive" className="text-sm text-[var(--text-color)]">Aktif</label>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                            >
                                Ödül Kaydet
                            </button>
                        </form>
                    </div>

                    <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">Mevcut Ödüller</h3>
                        <div className="space-y-3">
                            {loyaltyRewards.map(reward => (
                                <div key={reward.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-[var(--text-color)]">{reward.name}</h4>
                                        <p className="text-sm text-[var(--text-muted-color)]">{reward.description}</p>
                                        <p className="text-sm text-[var(--text-muted-color)]">{reward.pointsRequired} puan - %{reward.discountPercent} indirim</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            reward.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {reward.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
                <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">Müşteri Puanları</h3>
                    <div className="space-y-3">
                        {customerPoints.map(cp => {
                            const customer = customers.find(c => c.id === cp.customerId);
                            const tier = getCustomerTier(cp.totalPoints || 0);
                            return (
                                <div key={cp.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[var(--primary-100)] rounded-full flex items-center justify-center">
                                            <Star className="w-5 h-5 text-[var(--primary-600)]" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-[var(--text-color)]">{customer?.name || 'Bilinmeyen Müşteri'}</h4>
                                            <p className="text-sm text-[var(--text-muted-color)]">{customer?.phone || customer?.email || 'İletişim bilgisi yok'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-[var(--text-color)]">{cp.totalPoints || 0} puan</div>
                                        {tier && (
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: tier.color }}
                                                />
                                                <span className="text-sm text-[var(--text-muted-color)]">{tier.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const LoadingSpinner = ({ fullPage = false, message = '' }) => ( 
    <div className={`flex flex-col justify-center items-center ${fullPage ? 'h-screen bg-[var(--surface-color)]' : 'h-full py-10'}`}> 
        <Loader2 className="w-10 h-10 text-[var(--primary-600)] animate-spin" /> 
        {message && <p className="mt-4 text-[var(--text-muted-color)]">{message}</p>} 
    </div> 
);

const EmptyState = ({ icon, message, description }) => ( 
    <div className="text-center py-10 px-4 flex flex-col items-center justify-center h-full"> 
        <div className="text-[var(--text-muted-color)] mb-3">{icon}</div> 
        <h3 className="font-semibold text-lg text-[var(--text-color)]">{message}</h3> 
        {description && <p className="text-sm text-[var(--text-muted-color)] mt-1">{description}</p>} 
    </div> 
);

// Notlar Sayfası
const NotesPage = ({ notes, notesPath }) => {
    const [form, setForm] = useState({ 
        id: '', 
        title: '', 
        content: '', 
        color: '#0ea5a5', 
        isImportant: false,
        tags: []
    });
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [filterTag, setFilterTag] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const filteredNotes = useMemo(() => {
        return (notes || []).filter(note => {
            const matchesSearch = (note.title || '').toLowerCase().includes(search.toLowerCase()) ||
                                 (note.content || '').toLowerCase().includes(search.toLowerCase());
            const matchesTag = !filterTag || (note.tags || []).includes(filterTag);
            return matchesSearch && matchesTag;
        });
    }, [notes, search, filterTag]);

    const allTags = useMemo(() => {
        const tags = new Set();
        (notes || []).forEach(note => {
            (note.tags || []).forEach(tag => tags.add(tag));
        });
        return Array.from(tags);
    }, [notes]);

    const saveNote = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) {
            toast.warning('Başlık ve içerik alanları zorunludur');
            return;
        }

        setIsSaving(true);
        try {
            const noteData = {
                ...form,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'notes', editingId), noteData);
                toast.success('Not güncellendi');
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'notes'), {
                    ...noteData,
                    createdAt: serverTimestamp()
                });
                toast.success('Not kaydedildi');
            }

            setForm({ id: '', title: '', content: '', color: '#0ea5a5', isImportant: false, tags: [] });
            setEditingId(null);
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error('Not kaydedilemedi');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteNote = async (noteId) => {
        if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
        
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'notes', noteId));
            toast.success('Not silindi');
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error('Not silinemedi');
        }
    };

    const editNote = (note) => {
        setForm({
            id: note.id,
            title: note.title || '',
            content: note.content || '',
            color: note.color || '#0ea5a5',
            isImportant: note.isImportant || false,
            tags: note.tags || []
        });
        setEditingId(note.id);
    };

    const resetForm = () => {
        setForm({ id: '', title: '', content: '', color: '#0ea5a5', isImportant: false, tags: [] });
        setEditingId(null);
    };

    const addTag = (tag) => {
        if (tag.trim() && !form.tags.includes(tag.trim())) {
            setForm({ ...form, tags: [...form.tags, tag.trim()] });
        }
    };

    const removeTag = (tagToRemove) => {
        setForm({ ...form, tags: form.tags.filter(tag => tag !== tagToRemove) });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('tr-TR');
    };

    return (
        <div className="p-4 bg-[var(--bg-color)] rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--text-color)] flex items-center gap-2">
                    <StickyNote className="w-6 h-6 text-[var(--primary-600)]" />
                    Notlar
                </h2>
                <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                >
                    Yeni Not
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Not Formu */}
                <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-[var(--text-color)] mb-4">
                        {editingId ? 'Not Düzenle' : 'Yeni Not'}
                    </h3>
                    
                    <form onSubmit={saveNote} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Başlık</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({...form, title: e.target.value})}
                                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                placeholder="Not başlığı..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-color)] mb-2">İçerik</label>
                            <textarea
                                value={form.content}
                                onChange={(e) => setForm({...form, content: e.target.value})}
                                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                rows={6}
                                placeholder="Not içeriği..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Renk</label>
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({...form, color: e.target.value})}
                                    className="w-full h-10 border border-[var(--border-color)] rounded-lg cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isImportant"
                                    checked={form.isImportant}
                                    onChange={(e) => setForm({...form, isImportant: e.target.checked})}
                                    className="mr-2"
                                />
                                <label htmlFor="isImportant" className="text-sm font-medium text-[var(--text-color)]">
                                    Önemli
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-color)] mb-2">Etiketler</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {form.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 bg-[var(--primary-100)] text-[var(--primary-800)] rounded-full text-sm flex items-center gap-1"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="text-[var(--primary-600)] hover:text-[var(--primary-800)]"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Etiket ekle..."
                                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Kaydet')}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 bg-[var(--secondary-color)] text-[var(--text-color)] rounded-lg hover:bg-[var(--secondary-hover-color)] transition-colors"
                                >
                                    İptal
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Not Listesi */}
                <div className="bg-[var(--surface-color)] p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[var(--text-color)]">Notlarım</h3>
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-[var(--text-muted-color)]" />
                            <input
                                type="text"
                                placeholder="Not ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                            />
                        </div>
                    </div>

                    {filterTag && (
                        <div className="mb-4">
                            <span className="text-sm text-[var(--text-muted-color)]">
                                Filtre: <span className="font-medium">{filterTag}</span>
                                <button
                                    onClick={() => setFilterTag('')}
                                    className="ml-2 text-[var(--primary-600)] hover:text-[var(--primary-700)]"
                                >
                                    <X className="w-4 h-4 inline" />
                                </button>
                            </span>
                        </div>
                    )}

                    {allTags.length > 0 && (
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                                        className={`px-2 py-1 rounded-full text-xs transition-colors ${
                                            filterTag === tag 
                                                ? 'bg-[var(--primary-600)] text-white' 
                                                : 'bg-[var(--secondary-color)] text-[var(--text-color)] hover:bg-[var(--secondary-hover-color)]'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredNotes.map(note => (
                            <div
                                key={note.id}
                                className="p-4 border border-[var(--border-color)] rounded-lg hover:bg-[var(--surface-hover-color)] transition-colors"
                                style={{ borderLeftColor: note.color, borderLeftWidth: '4px' }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-medium text-[var(--text-color)]">{note.title}</h4>
                                            {note.isImportant && (
                                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                                    Önemli
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--text-muted-color)] mb-2 line-clamp-3">
                                            {note.content}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted-color)]">
                                            <span>Oluşturulma: {formatDate(note.createdAt)}</span>
                                            {note.updatedAt && note.updatedAt !== note.createdAt && (
                                                <span>Güncellenme: {formatDate(note.updatedAt)}</span>
                                            )}
                                        </div>
                                        {note.tags && note.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {note.tags.map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="px-2 py-1 bg-[var(--primary-100)] text-[var(--primary-800)] rounded-full text-xs"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => editNote(note)}
                                            className="p-2 text-[var(--primary-600)] hover:bg-[var(--primary-100)] rounded-lg transition-colors"
                                            title="Düzenle"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteNote(note.id)}
                                            className="p-2 text-[var(--error-color)] hover:bg-red-100 rounded-lg transition-colors"
                                            title="Sil"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredNotes.length === 0 && (
                        <div className="text-center py-8 text-[var(--text-muted-color)]">
                            {search || filterTag ? 'Arama kriterlerinize uygun not bulunamadı' : 'Henüz not eklenmemiş'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

