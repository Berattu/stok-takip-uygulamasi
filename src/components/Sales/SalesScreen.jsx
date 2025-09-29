import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
    Search, Plus, Minus, Trash2, CreditCard, Banknote, Wallet, 
    Calculator, Barcode, Camera, X, CheckCircle, AlertTriangle,
    Printer, Download, Undo2, UserCheck, Star, Percent, Tag,
    ShoppingCart, Package, Zap, DollarSign, Receipt, Clock,
    ArrowLeft, ArrowRight, Keyboard, Mouse
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SalesScreen = ({ 
    products, 
    categoryDiscounts, 
    paths, 
    onAddToCart, 
    onUpdateCartQuantity, 
    onRemoveFromCart, 
    onClearCart, 
    onFinalizeSale,
    onInstantSale,
    quickMode = false,
    cart,
    formatCurrency,
    calculateDiscountedPrice,
    paymentMethod: initialPaymentMethod = 'cash'
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
    const [transactionDiscount, setTransactionDiscount] = useState(0);
    const [discountType, setDiscountType] = useState('percentage');
    const [isBarcodeMode, setIsBarcodeMode] = useState(true);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [lastSale, setLastSale] = useState(null);
    const searchInputRef = useRef(null);
    const barcodeInputRef = useRef(null);

    // Kategorileri ürünlerden çıkar
    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        return ['all', ...cats.sort()];
    }, [products]);

    // Filtrelenmiş ürünler
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (product.barcode && product.barcode.includes(searchTerm));
            const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchTerm, selectedCategory]);

    // Sepet toplamları
    const cartTotals = useMemo(() => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalItems = 0;

        cart.forEach(item => {
            const { finalPrice, discountApplied } = calculateDiscountedPrice(item, categoryDiscounts);
            subtotal += finalPrice * item.quantity;
            totalDiscount += discountApplied * item.quantity;
            totalItems += item.quantity;
        });

        // İşlem indirimi
        let transactionDiscountAmount = 0;
        if (transactionDiscount > 0) {
            if (discountType === 'percentage') {
                transactionDiscountAmount = (subtotal * transactionDiscount) / 100;
            } else {
                transactionDiscountAmount = transactionDiscount;
            }
        }

        const total = Math.max(0, subtotal - transactionDiscountAmount);

        return {
            subtotal,
            totalDiscount,
            transactionDiscountAmount,
            total,
            totalItems
        };
    }, [cart, categoryDiscounts, transactionDiscount, discountType, calculateDiscountedPrice]);

    // Barkod modu
    useEffect(() => {
        if (isBarcodeMode && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [isBarcodeMode]);

    // Klavye kısayolları
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const key = e.key.toLowerCase();
            if (key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (key === 'b') {
                e.preventDefault();
                setIsBarcodeMode(prev => !prev);
            } else if (key === 'enter') {
                if (isBarcodeMode && barcodeInputRef.current) {
                    e.preventDefault();
                    handleBarcodeSubmit();
                }
            }
        };
        document.addEventListener('keydown', handleKeyPress, { passive: false });
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isBarcodeMode]);

    const handleBarcodeSubmit = () => {
        const barcode = barcodeInputRef.current?.value?.trim();
        if (!barcode) return;

        const product = products.find(p => p.barcode === barcode);
        if (product) {
            if (quickMode && onInstantSale) {
                onInstantSale(product, paymentMethod);
            } else {
                onAddToCart(product);
            }
            barcodeInputRef.current.value = '';
            toast.success(`${product.name} ${quickMode ? 'satıldı' : 'sepete eklendi'}`);
        } else {
            toast.error('Ürün bulunamadı');
        }
    };

    const handlePayment = async () => {
        if (cart.length === 0) {
            toast.warning('Sepetiniz boş');
            return;
        }
        setIsPaymentModalOpen(true);
    };

    

    const PaymentModal = () => {
        // Modal içinde local state kullanarak re-render'ları minimize edelim
        const [localCustomerInfo, setLocalCustomerInfo] = useState(customerInfo);
        const [localTransactionDiscount, setLocalTransactionDiscount] = useState(transactionDiscount);
        const [localDiscountType, setLocalDiscountType] = useState(discountType);
        const [localPaymentMethod, setLocalPaymentMethod] = useState(paymentMethod);

        // Modal açıldığında local state'i güncelle
        useEffect(() => {
            if (isPaymentModalOpen) {
                setLocalCustomerInfo(customerInfo);
                setLocalTransactionDiscount(transactionDiscount);
                setLocalDiscountType(discountType);
                setLocalPaymentMethod(paymentMethod);
            }
        }, [isPaymentModalOpen, customerInfo, transactionDiscount, discountType, paymentMethod]);

        // Modal kapatma fonksiyonu
        const closeModal = useCallback(() => {
            setIsPaymentModalOpen(false);
        }, []);

        // Ödeme tamamlama fonksiyonu
        const completePayment = useCallback(async () => {
            try {
                // Local state'i global state'e aktar
                setCustomerInfo(localCustomerInfo);
                setTransactionDiscount(localTransactionDiscount);
                setDiscountType(localDiscountType);
                setPaymentMethod(localPaymentMethod);

                const saleData = {
                    items: cart.map(item => {
                        const { finalPrice, discountApplied, originalPrice, appliedRule } = calculateDiscountedPrice(item, categoryDiscounts);
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
                    }),
                    paymentMethod: localPaymentMethod,
                    customerInfo: localCustomerInfo.name ? localCustomerInfo : null,
                    transactionDiscount: cartTotals.transactionDiscountAmount,
                    discountType: localDiscountType,
                    total: cartTotals.total,
                    subtotal: cartTotals.subtotal,
                    totalDiscount: cartTotals.totalDiscount,
                    totalItems: cartTotals.totalItems,
                    saleDate: new Date(),
                    type: 'sale',
                    status: 'completed'
                };

                try {
                    await onFinalizeSale(localPaymentMethod, cartTotals.transactionDiscountAmount, localCustomerInfo);
                    setLastSale(saleData);
                    closeModal();
                    setIsReceiptModalOpen(true);
                    
                    // Sepeti temizle
                    onClearCart();
                    setCustomerInfo({ name: '', phone: '', email: '' });
                    setTransactionDiscount(0);
                } catch (finalizeError) {
                    console.error('Finalize sale error:', finalizeError);
                    // onFinalizeSale zaten kendi toast mesajını gösteriyor, burada ekstra hata mesajı göstermiyoruz
                }
                
            } catch (error) {
                console.error('Payment error:', error);
                toast.error('Ödeme işlemi sırasında hata oluştu');
            }
        }, [localCustomerInfo, localTransactionDiscount, localDiscountType, localPaymentMethod, cart, cartTotals, onFinalizeSale, onClearCart, closeModal]);

        // Modal açık değilse hiçbir şey render etme
        if (!isPaymentModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-12">
                <div className="bg-[var(--bg-color)] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Ödeme</h2>
                        <button 
                            onClick={closeModal} 
                            className="p-2 hover:bg-[var(--surface-color)] rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Müşteri Bilgileri */}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-3">Müşteri Bilgileri (Opsiyonel)</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Müşteri Adı"
                                value={localCustomerInfo.name}
                                onChange={(e) => setLocalCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] focus:border-[var(--primary-500)] focus:outline-none transition-colors"
                            />
                            <input
                                type="tel"
                                placeholder="Telefon"
                                value={localCustomerInfo.phone}
                                onChange={(e) => setLocalCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] focus:border-[var(--primary-500)] focus:outline-none transition-colors"
                            />
                            <input
                                type="email"
                                placeholder="E-posta"
                                value={localCustomerInfo.email}
                                onChange={(e) => setLocalCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] focus:border-[var(--primary-500)] focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* İşlem İndirimi */}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-3">İşlem İndirimi</h3>
                        <div className="flex gap-2 mb-3">
                            <select
                                value={localDiscountType}
                                onChange={(e) => setLocalDiscountType(e.target.value)}
                                className="p-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] focus:border-[var(--primary-500)] focus:outline-none transition-colors"
                            >
                                <option value="percentage">%</option>
                                <option value="amount">₺</option>
                            </select>
                            <input
                                type="number"
                                placeholder="0"
                                value={localTransactionDiscount}
                                onChange={(e) => setLocalTransactionDiscount(parseFloat(e.target.value) || 0)}
                                className="flex-1 p-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] focus:border-[var(--primary-500)] focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Ödeme Yöntemi */}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-3">Ödeme Yöntemi</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'cash', label: 'Nakit', icon: Banknote },
                                { id: 'card', label: 'Kart', icon: CreditCard },
                                { id: 'credit', label: 'Veresiye', icon: UserCheck },
                                { id: 'personnel', label: 'Personel', icon: UserCheck }
                            ].map(method => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setLocalPaymentMethod(method.id)}
                                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                                        localPaymentMethod === method.id
                                            ? 'border-[var(--primary-600)] bg-[var(--primary-100)] shadow-md'
                                            : 'border-[var(--border-color)] hover:border-[var(--primary-500)] hover:bg-[var(--surface-color)]'
                                    }`}
                                >
                                    <method.icon size={24} />
                                    <span className="text-sm font-medium">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toplam */}
                    <div className="border-t border-[var(--border-color)] pt-4 mb-6">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Ara Toplam:</span>
                                <span>{formatCurrency(cartTotals.subtotal)}</span>
                            </div>
                            {cartTotals.totalDiscount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Ürün İndirimi:</span>
                                    <span>-{formatCurrency(cartTotals.totalDiscount)}</span>
                                </div>
                            )}
                            {cartTotals.transactionDiscountAmount > 0 && (
                                <div className="flex justify-between text-blue-600">
                                    <span>İşlem İndirimi:</span>
                                    <span>-{formatCurrency(cartTotals.transactionDiscountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t border-[var(--border-color)] pt-2">
                                <span>TOPLAM:</span>
                                <span>{formatCurrency(cartTotals.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Butonlar */}
                    <div className="flex gap-3">
                        <button
                            onClick={closeModal}
                            className="flex-1 p-3 border border-[var(--border-color)] rounded-lg hover:bg-[var(--surface-color)] transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={completePayment}
                            className="flex-1 p-3 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] font-semibold transition-colors"
                        >
                            Ödemeyi Tamamla
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ReceiptModal = () => {
        // Modal açık değilse hiçbir şey render etme
        if (!isReceiptModalOpen || !lastSale) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-12">
                <div className="bg-[var(--bg-color)] rounded-2xl p-6 w-full max-w-md">
                    <div className="text-center mb-6">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-green-600">Satış Tamamlandı!</h2>
                        <p className="text-[var(--text-muted-color)]">Toplam: {formatCurrency(lastSale.total)}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between text-sm">
                            <span>Satış No:</span>
                            <span className="font-mono">#{Date.now().toString().slice(-6)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Tarih:</span>
                            <span>{lastSale.saleDate.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Ödeme:</span>
                            <span className="capitalize">{lastSale.paymentMethod}</span>
                        </div>
                        {lastSale.customerInfo?.name && (
                            <div className="flex justify-between text-sm">
                                <span>Müşteri:</span>
                                <span>{lastSale.customerInfo.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setIsReceiptModalOpen(false);
                                setLastSale(null);
                            }}
                            className="flex-1 p-3 border border-[var(--border-color)] rounded-lg hover:bg-[var(--surface-color)] transition-colors"
                        >
                            Tamam
                        </button>
                        <button
                            onClick={() => {
                                // Fiş yazdırma işlemi
                                window.print();
                            }}
                            className="flex-1 p-3 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                            <Printer size={16} />
                            Yazdır
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Satış Ekranı</h1>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted-color)]">
                        <Keyboard size={16} />
                        <span>Ctrl+F: Arama</span>
                        <span>•</span>
                        <span>Ctrl+B: Barkod</span>
                        <span>•</span>
                        <span>{quickMode ? 'Hızlı Satış' : 'Sepet Modu'}</span>
                    </div>
                </div>
                                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsBarcodeMode(!isBarcodeMode)}
                            className={`p-2 rounded-lg transition-colors ${
                                isBarcodeMode 
                                    ? 'bg-[var(--primary-600)] text-white' 
                                    : 'bg-[var(--surface-color)] hover:bg-[var(--surface-hover-color)]'
                            }`}
                            title="Barkod Modu"
                        >
                            <Barcode size={20} />
                        </button>
                        {quickMode && (
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-[var(--text-muted-color)] mr-1">Ödeme:</span>
                                <span className="text-sm font-medium text-[var(--primary-600)]">
                                    {paymentMethod === 'cash' ? 'NAKİT' : 
                                     paymentMethod === 'card' ? 'KART' : 
                                     paymentMethod === 'credit' ? 'VERESİYE' : 'PERSONEL'}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => { /* quickMode indicator only; actual routing handled by parent */ }}
                            className={`p-2 rounded-lg ${quickMode ? 'bg-[var(--primary-600)] text-white' : 'bg-[var(--surface-color)] text-[var(--text-muted-color)]'}`}
                            title="Hızlı Satış"
                        >
                            <Zap size={20} />
                        </button>
                    </div>
            </div>

            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* Sol Panel - Ürünler */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Arama ve Filtreler */}
                    <div className="space-y-4">
                        {/* Barkod Girişi */}
                        {isBarcodeMode && (
                            <div className="flex gap-2">
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    placeholder="Barkod okutun..."
                                    className="flex-1 p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)] font-mono text-lg"
                                    onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                                />
                                <button
                                    onClick={handleBarcodeSubmit}
                                    className="px-6 py-3 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
                                >
                                    <Camera size={20} />
                                </button>
                            </div>
                        )}

                        {/* Arama */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted-color)]" size={20} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Ürün ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                            />
                        </div>

                        {/* Kategori Filtresi */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                                        selectedCategory === category
                                            ? 'bg-[var(--primary-600)] text-white'
                                            : 'bg-[var(--surface-color)] hover:bg-[var(--surface-hover-color)]'
                                    }`}
                                >
                                    {category === 'all' ? 'Tümü' : category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ürün Listesi */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => {
                                const { finalPrice, discountApplied } = calculateDiscountedPrice(product, categoryDiscounts);
                                const isInCart = cart.find(item => item.id === product.id);
                                
                                return (
                                    <div
                                        key={product.id}
                                        className={`bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md hover:scale-[1.02] ${
                                            isInCart ? 'ring-2 ring-[var(--primary-500)] shadow-lg' : ''
                                        }`}
                                        onClick={(e) => {
                                            if (quickMode && onInstantSale) {
                                                onInstantSale(product, paymentMethod);
                                                // Hızlı satış sonrası görsel geri bildirim
                                                const element = e.currentTarget;
                                                element.style.transform = 'scale(0.98)';
                                                element.style.backgroundColor = 'var(--primary-50)';
                                                setTimeout(() => {
                                                    element.style.transform = '';
                                                    element.style.backgroundColor = '';
                                                }, 150);
                                            } else {
                                                onAddToCart(product);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                                            <div className="flex items-center gap-1">
                                                {quickMode && (
                                                    <div className="bg-[var(--primary-600)] text-white text-xs px-2 py-1 rounded-full">
                                                        <Zap size={10} className="inline mr-1" />
                                                        HIZLI
                                                    </div>
                                                )}
                                                {isInCart && !quickMode && (
                                                    <div className="bg-[var(--primary-600)] text-white text-xs px-2 py-1 rounded-full">
                                                        {isInCart.quantity}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold text-[var(--primary-600)]">
                                                    {formatCurrency(finalPrice)}
                                                </span>
                                                <span className="text-xs text-[var(--text-muted-color)]">
                                                    Stok: {product.stock}
                                                </span>
                                            </div>
                                            
                                            {discountApplied > 0 && (
                                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                                    <Percent size={12} />
                                                    <span>İndirimli</span>
                                                </div>
                                            )}
                                            
                                            {product.stock <= (product.criticalStockLevel || 5) && (
                                                <div className="flex items-center gap-1 text-red-600 text-sm">
                                                    <AlertTriangle size={12} />
                                                    <span>Kritik Stok</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12 text-[var(--text-muted-color)]">
                                <Package size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Ürün bulunamadı</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Panel - Sepet (Normal Mod) veya Ödeme Butonları (Hızlı Satış) */}
                {!quickMode ? (
                <div className="w-96 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg flex flex-col">
                    {/* Sepet Header */}
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <ShoppingCart size={20} />
                                Sepet
                            </h2>
                            {cart.length > 0 && (
                                <button
                                    onClick={onClearCart}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-[var(--text-muted-color)]">
                            {cartTotals.totalItems} ürün
                        </p>
                    </div>

                    {/* Sepet İçeriği */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {cart.map(item => {
                            const { finalPrice, discountApplied } = calculateDiscountedPrice(item, categoryDiscounts);
                            
                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-3 bg-[var(--surface-color)] rounded-lg mb-3 transition-all duration-200 ease-in-out hover:shadow-sm hover:bg-[var(--surface-hover-color)]"
                                >
                                    <div className="flex-1">
                                        <h3 className="font-medium text-sm">{item.name}</h3>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[var(--primary-600)] font-semibold">
                                                {formatCurrency(finalPrice)}
                                            </span>
                                            <span className="text-[var(--text-muted-color)]">
                                                x{item.quantity}
                                            </span>
                                        </div>
                                        {discountApplied > 0 && (
                                            <div className="text-xs text-green-600">
                                                İndirim: {formatCurrency(discountApplied)}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onUpdateCartQuantity(item.id, item.quantity - 1)}
                                            className="p-1 hover:bg-[var(--surface-hover-color)] rounded transition-colors duration-150"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => onUpdateCartQuantity(item.id, item.quantity + 1)}
                                            className="p-1 hover:bg-[var(--surface-hover-color)] rounded transition-colors duration-150"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        <button
                                            onClick={() => onRemoveFromCart(item.id)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-150"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {cart.length === 0 && (
                            <div className="text-center py-12 text-[var(--text-muted-color)]">
                                <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Sepetiniz boş</p>
                                <p className="text-sm">Ürün eklemek için sol panelden seçim yapın</p>
                            </div>
                        )}
                    </div>

                    {/* Sepet Toplamı */}
                    {cart.length > 0 && (
                        <div className="p-4 border-t border-[var(--border-color)] space-y-3">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Ara Toplam:</span>
                                    <span>{formatCurrency(cartTotals.subtotal)}</span>
                                </div>
                                {cartTotals.totalDiscount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>İndirim:</span>
                                        <span>-{formatCurrency(cartTotals.totalDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t border-[var(--border-color)] pt-2">
                                    <span>TOPLAM:</span>
                                    <span>{formatCurrency(cartTotals.total)}</span>
                                </div>
                            </div>
                            
                            {!quickMode && (
                            <button
                                onClick={handlePayment}
                                className="w-full p-4 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] font-semibold text-lg flex items-center justify-center gap-2"
                            >
                                <CreditCard size={20} />
                                Ödeme Yap
                            </button>
                            )}
                        </div>
                    )}
                </div>
                ) : (
                /* Hızlı Satış - Ödeme Butonları */
                <div className="w-96 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg flex flex-col">
                    {/* Ödeme Butonları Header */}
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Zap size={20} />
                            Hızlı Satış
                        </h2>
                        <p className="text-sm text-[var(--text-muted-color)]">
                            Ödeme yöntemini seçin
                        </p>
                    </div>

                    {/* Ödeme Butonları */}
                    <div className="flex-1 p-4 space-y-3">
                        {[
                            { id: 'cash', label: 'NAKİT', icon: Banknote, color: 'bg-green-600', hoverColor: 'hover:bg-green-700' },
                            { id: 'card', label: 'KART', icon: CreditCard, color: 'bg-blue-600', hoverColor: 'hover:bg-blue-700' },
                            { id: 'credit', label: 'VERESİYE', icon: UserCheck, color: 'bg-orange-600', hoverColor: 'hover:bg-orange-700' },
                            { id: 'personnel', label: 'PERSONEL', icon: UserCheck, color: 'bg-purple-600', hoverColor: 'hover:bg-purple-700' }
                        ].map(method => (
                            <button
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id)}
                                className={`w-full p-4 rounded-lg text-white font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                                    paymentMethod === method.id
                                        ? `${method.color} shadow-lg ring-2 ring-white/20`
                                        : `${method.color} ${method.hoverColor} opacity-80 hover:opacity-100`
                                }`}
                            >
                                <method.icon size={24} />
                                {method.label}
                            </button>
                        ))}
                    </div>

                    {/* Aktif Ödeme Bilgisi */}
                    <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-color)]">
                        <div className="text-center">
                            <p className="text-sm text-[var(--text-muted-color)]">Aktif Ödeme Yöntemi</p>
                            <p className="text-lg font-bold text-[var(--primary-600)]">
                                {paymentMethod === 'cash' ? 'NAKİT' : 
                                 paymentMethod === 'card' ? 'KART' : 
                                 paymentMethod === 'credit' ? 'VERESİYE' : 'PERSONEL'}
                            </p>
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* Modaller */}
            <PaymentModal />
            <ReceiptModal />
        </div>
    );
};

export default SalesScreen;
