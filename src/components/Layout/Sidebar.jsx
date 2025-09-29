import React from 'react';
import { 
    Building,
    Package,
    Zap,
    LayoutDashboard,
    ClipboardCheck,
    AlertTriangle,
    Folder,
    FileText,
    Users,
    ShoppingBag,
    Wallet,
    Receipt,
    BookUser,
    CreditCard,
    BarChart3,
    History,
    Archive,
    TrendingUp,
    Percent,
    Star,
    Settings,
    Cloud,
    ShieldCheck,
    UserCheck,
    ChevronsLeft,
    Menu,
    LogOut,
    StickyNote,
    GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock useLanguage hook for now
const useLanguage = () => ({
    t: (key) => {
        const translations = {
            'nav.sales': 'Satış',
            'nav.quickSale': 'Hızlı Satış',
            'nav.dashboard': 'Dashboard',
            'nav.stockManagement': 'Stok Yönetimi',
            'nav.stockCount': 'Stok Sayım',
            'nav.lowStock': 'Kritik Stok',
            'nav.categories': 'Kategoriler',
            'nav.purchaseOrders': 'Siparişler',
            'nav.cashDrawer': 'Kasa Yönetimi',
            'nav.expenses': 'Giderler',
            'nav.payments': 'Ödemeler',
            'nav.customers': 'Müşteriler',
            'nav.loyalty': 'Sadakat Programı',
            'nav.reports': 'Raporlar',
            'nav.analytics': 'Analitik',
            'nav.settings': 'Ayarlar',
            'nav.backup': 'Yedekleme'
        };
        return translations[key] || key;
    }
});

const Sidebar = ({ activePage, setActivePage, user, isSidebarOpen, setIsSidebarOpen, onLogout, settings }) => {
    const { t } = useLanguage();
    const allNavItems = [
        // Ana İşlemler
        { 
            id: 'salesScreen', 
            label: t('nav.sales'), 
            icon: Zap, 
            section: 'main',
            description: 'Hızlı satış ve sepet yönetimi',
            badge: 'HOT'
        },
        { 
            id: 'quickSale', 
            label: t('nav.quickSale'), 
            icon: Zap, 
            section: 'main',
            description: 'Tek tıkla anında satış'
        },
        { 
            id: 'dashboard', 
            label: t('nav.dashboard'), 
            icon: LayoutDashboard, 
            section: 'main',
            description: 'Genel işletme durumu'
        },
        
        // Stok Yönetimi
        { 
            id: 'stock', 
            label: 'Stok Yönetimi', 
            icon: Package, 
            section: 'inventory',
            description: 'Ürün ekleme, düzenleme ve takip'
        },
        { 
            id: 'stockCount', 
            label: 'Stok Sayımı', 
            icon: ClipboardCheck, 
            section: 'inventory',
            description: 'Fiziksel stok kontrolü'
        },
        { 
            id: 'lowStock', 
            label: 'Kritik Stok', 
            icon: AlertTriangle, 
            section: 'inventory',
            description: 'Düşük stok uyarıları'
        },
        { 
            id: 'categories', 
            label: 'Kategoriler', 
            icon: Folder, 
            section: 'inventory',
            description: 'Ürün kategorileri yönetimi'
        },
        
        // Satın Alma
        { 
            id: 'purchases', 
            label: 'Satın Alma', 
            icon: FileText, 
            section: 'purchasing',
            description: 'Tedarikçilerden ürün alımı'
        },
        { 
            id: 'suppliers', 
            label: 'Tedarikçiler', 
            icon: Users, 
            section: 'purchasing',
            description: 'Tedarikçi bilgileri ve iletişim'
        },
        { 
            id: 'purchaseOrders', 
            label: 'Siparişler', 
            icon: ShoppingBag, 
            section: 'purchasing',
            description: 'Açık ve geçmiş siparişler'
        },
        
        // Finans
        { 
            id: 'cashDrawer', 
            label: 'Kasa Yönetimi', 
            icon: Wallet, 
            section: 'finance',
            description: 'Günlük kasa işlemleri'
        },
        { 
            id: 'expenses', 
            label: 'Giderler', 
            icon: Receipt, 
            section: 'finance',
            description: 'İşletme giderleri takibi'
        },
        { 
            id: 'credit', 
            label: 'Veresiye', 
            icon: BookUser, 
            section: 'finance',
            description: 'Müşteri borçları'
        },
        { 
            id: 'payments', 
            label: 'Ödemeler', 
            icon: CreditCard, 
            section: 'finance',
            description: 'Ödeme yöntemleri ve geçmişi'
        },
        
        // Müşteri İlişkileri
        { 
            id: 'customers', 
            label: 'Müşteriler', 
            icon: UserCheck, 
            section: 'customers',
            description: 'Müşteri bilgileri ve geçmişi'
        },
        
        // Raporlar ve Analiz
        { 
            id: 'statistics', 
            label: 'İstatistikler', 
            icon: BarChart3, 
            section: 'reports',
            description: 'Detaylı satış analizleri'
        },
        { 
            id: 'history', 
            label: 'İşlem Geçmişi', 
            icon: History, 
            section: 'reports',
            description: 'Tüm işlem kayıtları'
        },
        { 
            id: 'reports', 
            label: 'Raporlar', 
            icon: Archive, 
            section: 'reports',
            description: 'Kâr/zarar ve performans raporları'
        },
        { 
            id: 'analytics', 
            label: 'Analitik', 
            icon: TrendingUp, 
            section: 'reports',
            description: 'Gelişmiş veri analizi'
        },
        
        // Ayarlar ve Araçlar
        { 
            id: 'discounts', 
            label: 'İndirimler', 
            icon: Percent, 
            section: 'tools',
            description: 'Ürün ve kategori indirimleri'
        },
        { 
            id: 'settings', 
            label: 'Ayarlar', 
            icon: Settings, 
            section: 'tools',
            description: 'Sistem ayarları ve yapılandırma'
        },
        { 
            id: 'backup', 
            label: 'Yedekleme', 
            icon: Cloud, 
            section: 'tools',
            description: 'Veri yedekleme ve geri yükleme'
        },
        { 
            id: 'notes', 
            label: 'Notlar', 
            icon: StickyNote, 
            section: 'tools',
            description: 'Kişisel notlar ve hatırlatıcılar'
        }
    ];

    const sections = {
        main: { title: 'Ana İşlemler', color: 'text-blue-600' },
        inventory: { title: 'Stok Yönetimi', color: 'text-green-600' },
        purchasing: { title: 'Satın Alma', color: 'text-purple-600' },
        finance: { title: 'Finans', color: 'text-yellow-600' },
        customers: { title: 'Müşteriler', color: 'text-pink-600' },
        reports: { title: 'Raporlar', color: 'text-indigo-600' },
        tools: { title: 'Araçlar', color: 'text-gray-600' },
    };

    return (
        <aside className={`fixed top-0 left-0 h-full bg-[var(--bg-color)] border-r border-[var(--border-color)] flex flex-col z-30 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
            {/* Header */}
            <div className={`flex items-center border-b border-[var(--border-color)] p-4 h-16 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{opacity:0, x: -20}} 
                        animate={{opacity:1, x: 0}} 
                        exit={{opacity:0, x: -20}} 
                        className="font-bold text-xl flex items-center gap-2"
                    >
                        <Building className="text-[var(--primary-600)]" /> 
                        <span>Stok Takip</span>
                    </motion.div>
                )}
                </AnimatePresence>
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="p-2 rounded-md hover:bg-[var(--surface-color)] transition-colors"
                    title={isSidebarOpen ? 'Sidebar\'ı Daralt' : 'Sidebar\'ı Genişlet'}
                >
                    {isSidebarOpen ? <ChevronsLeft size={20} /> : <Menu size={20} />}
                </button>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                {(settings?.sidebarOrder || Object.keys(sections)).map(sectionKey => {
                    const section = sections[sectionKey];
                    if (!section) return null;
                    
                    // Check if this section is enabled
                    if (!settings?.enabledSections?.[sectionKey]) return null;
                    
                    return (
                        <div key={sectionKey} className="px-4">
                            {isSidebarOpen && (
                                <motion.h3 
                                    initial={{opacity:0}} 
                                    animate={{opacity:1}} 
                                    exit={{opacity:0}}
                                    className={`text-xs font-semibold uppercase tracking-wider mt-4 mb-2 ${section.color}`}
                                >
                                    {section.title}
                                </motion.h3>
                            )}
                            {allNavItems.filter(i => i.section === sectionKey && (settings?.enabledFeatures?.[i.id] !== false)).map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => setActivePage(item.id)}
                                className={`w-full flex items-center gap-3 p-3 my-1 rounded-lg transition-all duration-200 text-sm font-medium group relative ${
                                    activePage === item.id 
                                        ? 'bg-[var(--primary-100)] text-[var(--primary-700)] shadow-sm' 
                                        : 'text-[var(--text-muted-color)] hover:bg-[var(--surface-color)] hover:text-[var(--text-color)]'
                                }`}
                                title={isSidebarOpen ? item.description : item.label}
                            >
                                <item.icon size={20} className="flex-shrink-0" />
                                <AnimatePresence>
                                {isSidebarOpen && (
                                    <motion.div 
                                        initial={{opacity:0, x: -10}} 
                                        animate={{opacity:1, x: 0}} 
                                        exit={{opacity:0, x: -10}}
                                        className="flex-1 flex items-center justify-between"
                                    >
                                        <span>{item.label}</span>
                                        {item.badge && (
                                            <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full font-semibold">
                                                {item.badge}
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                                </AnimatePresence>
                                
                                {/* Tooltip for collapsed sidebar */}
                                {!isSidebarOpen && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        ))}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-[var(--border-color)] p-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-sm font-medium text-[var(--text-muted-color)] hover:bg-[var(--surface-color)] hover:text-[var(--text-color)] ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[var(--primary-600)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        {isSidebarOpen && (
                            <motion.div 
                                initial={{opacity:0}} 
                                animate={{opacity:1}} 
                                exit={{opacity:0}}
                                className="flex-1"
                            >
                                <p className="text-xs font-medium text-[var(--text-color)] truncate">
                                    {user?.email}
                                </p>
                                <p className="text-xs text-[var(--text-muted-color)]">
                                    Yönetici
                                </p>
                            </motion.div>
                        )}
                    </div>
                </div>
                
                <button 
                    onClick={onLogout} 
                    className={`w-full flex items-center gap-3 p-3 mt-2 rounded-lg transition-colors text-sm font-medium text-[var(--text-muted-color)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
                    title="Çıkış Yap"
                >
                    <LogOut size={20} />
                    {isSidebarOpen && <span>Çıkış Yap</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
