import React, { useState, useMemo, useCallback } from 'react';
import { 
    Search, Plus, Edit, Trash2, Package, AlertTriangle, 
    Filter, SortAsc, SortDesc, Download, Upload, Barcode,
    Eye, EyeOff, MoreHorizontal, Copy, Archive, RefreshCw,
    TrendingUp, TrendingDown, DollarSign, PackageX, CheckCircle,
    X, Save, XCircle, Camera, FileText, Printer, Share2, Percent
} from 'lucide-react';
import { toast } from 'sonner';

const StockManagement = ({ 
    products, 
    categoryDiscounts, 
    paths, 
    onAddOrUpdateProduct, 
    onDeleteProduct,
    formatCurrency,
    calculateDiscountedPrice 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [viewMode, setViewMode] = useState('grid'); // grid, list, compact
    const [showLowStock, setShowLowStock] = useState(false);
    const [showOutOfStock, setShowOutOfStock] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [isBulkEditMode, setIsBulkEditMode] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, product: null });
    const [productModal, setProductModal] = useState({ show: false, type: null, product: null });

    // Kategorileri ürünlerden çıkar
    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        return ['all', ...cats.sort()];
    }, [products]);

    // Filtrelenmiş ve sıralanmış ürünler
    const filteredProducts = useMemo(() => {
        let filtered = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (product.barcode && product.barcode.includes(searchTerm));
            const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
            const matchesLowStock = !showLowStock || product.stock <= (product.criticalStockLevel || 5);
            const matchesOutOfStock = !showOutOfStock || product.stock > 0;
            
            return matchesSearch && matchesCategory && matchesLowStock && matchesOutOfStock;
        });

        // Sıralama
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'stock':
                    aValue = a.stock;
                    bValue = b.stock;
                    break;
                case 'price':
                    aValue = a.salePrice || 0;
                    bValue = b.salePrice || 0;
                    break;
                case 'category':
                    aValue = a.category || '';
                    bValue = b.category || '';
                    break;
                case 'lastUpdated':
                    aValue = a.lastUpdatedAt?.toDate?.() || new Date(0);
                    bValue = b.lastUpdatedAt?.toDate?.() || new Date(0);
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [products, searchTerm, selectedCategory, sortBy, sortOrder, showLowStock, showOutOfStock]);

    // Tek ürün işlem fonksiyonları
    const handleProductStockUpdate = async (productId, operationType, value) => {
        try {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const currentStock = product.stock || 0;
            let newStock = currentStock;

            if (operationType === 'add') {
                newStock = currentStock + value;
            } else if (operationType === 'set') {
                newStock = value;
            }

            newStock = Math.max(0, newStock); // Stok negatif olamaz

            if (newStock !== currentStock) {
                const productRef = doc(db, 'artifacts', 'default-app-id', 'users', 'default-user', 'products', productId);
                await updateDoc(productRef, { 
                    stock: newStock,
                    updatedAt: serverTimestamp()
                });
                toast.success(`${product.name} ürününün stok miktarı güncellendi.`);
                setProductModal({ show: false, type: null, product: null });
            } else {
                toast.info('Stok miktarı değişmedi.');
            }
        } catch (error) {
            console.error('Stock update error:', error);
            toast.error('Stok güncelleme sırasında hata oluştu.');
        }
    };

    const handleProductPriceUpdate = async (productId, operationType, value) => {
        try {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const currentPrice = product.salePrice || 0;
            let newPrice = currentPrice;

            if (operationType === 'percentage') {
                newPrice = currentPrice * (1 + (value / 100));
            } else if (operationType === 'fixed') {
                newPrice = currentPrice + value;
            } else if (operationType === 'set') {
                newPrice = value;
            }

            newPrice = Math.max(0, newPrice); // Fiyat negatif olamaz

            if (newPrice !== currentPrice) {
                const productRef = doc(db, 'artifacts', 'default-app-id', 'users', 'default-user', 'products', productId);
                await updateDoc(productRef, { 
                    salePrice: newPrice,
                    updatedAt: serverTimestamp()
                });
                toast.success(`${product.name} ürününün fiyatı güncellendi.`);
                setProductModal({ show: false, type: null, product: null });
            } else {
                toast.info('Fiyat değişmedi.');
            }
        } catch (error) {
            console.error('Price update error:', error);
            toast.error('Fiyat güncelleme sırasında hata oluştu.');
        }
    };

    // İstatistikler
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => p.stock <= (p.criticalStockLevel || 5));
        const outOfStockProducts = products.filter(p => p.stock <= 0);
        const totalStockValue = products.reduce((sum, p) => sum + (p.stock * (p.salePrice || 0)), 0);
        const averagePrice = totalProducts > 0 ? products.reduce((sum, p) => sum + (p.salePrice || 0), 0) / totalProducts : 0;

        return {
            totalProducts,
            lowStockProducts: lowStockProducts.length,
            outOfStockProducts: outOfStockProducts.length,
            totalStockValue,
            averagePrice
        };
    }, [products]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleBulkAction = (action) => {
        if (selectedProducts.length === 0) {
            toast.warning('Lütfen en az bir ürün seçin');
            return;
        }

        switch (action) {
            case 'delete':
                if (confirm(`${selectedProducts.length} ürünü silmek istediğinizden emin misiniz?`)) {
                    selectedProducts.forEach(productId => {
                        const product = products.find(p => p.id === productId);
                        if (product) {
                            onDeleteProduct(productId, product.name);
                        }
                    });
                    setSelectedProducts([]);
                }
                break;
            case 'export':
                exportSelectedProducts();
                break;
            case 'print':
                printSelectedProducts();
                break;
        }
    };

    const exportSelectedProducts = () => {
        const selectedData = products.filter(p => selectedProducts.includes(p.id));
        const csv = convertToCSV(selectedData);
        downloadCSV('urunler.csv', csv);
    };

    const printSelectedProducts = () => {
        const selectedData = products.filter(p => selectedProducts.includes(p.id));
        const printWindow = window.open('', '_blank');
        printWindow.document.write(generatePrintHTML(selectedData));
        printWindow.document.close();
        printWindow.print();
    };

    const convertToCSV = (data) => {
        const headers = ['Barkod', 'Ürün Adı', 'Kategori', 'Stok', 'Satış Fiyatı', 'Alış Fiyatı', 'Kritik Stok'];
        const rows = data.map(item => [
            item.barcode || '',
            item.name || '',
            item.category || '',
            item.stock || 0,
            item.salePrice || 0,
            item.purchasePrice || 0,
            item.criticalStockLevel || 5
        ]);
        
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    };

    const downloadCSV = (filename, content) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('CSV dosyası indiriliyor');
    };

    const generatePrintHTML = (data) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ürün Listesi</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 20px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Ürün Listesi</h1>
                    <p>Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Barkod</th>
                            <th>Ürün Adı</th>
                            <th>Kategori</th>
                            <th>Stok</th>
                            <th>Satış Fiyatı</th>
                            <th>Alış Fiyatı</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td>${item.barcode || ''}</td>
                                <td>${item.name || ''}</td>
                                <td>${item.category || ''}</td>
                                <td>${item.stock || 0}</td>
                                <td>${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.salePrice || 0)}</td>
                                <td>${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.purchasePrice || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
    };

    const StatCard = ({ title, value, icon: Icon, color = 'blue', format = 'number' }) => {
        const formatValue = (val) => {
            if (format === 'currency') {
                return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
            }
            if (format === 'number') {
                return new Intl.NumberFormat('tr-TR').format(val);
            }
            return val;
        };

        return (
            <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-muted-color)]">{title}</p>
                        <p className="text-xl font-bold text-[var(--text-color)] mt-1">
                            {formatValue(value)}
                        </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}>
                        <Icon size={20} />
                    </div>
                </div>
            </div>
        );
    };

    const ProductCard = ({ product, isSelected, onSelect, onEdit, onDelete }) => {
        const { finalPrice, discountApplied } = calculateDiscountedPrice(product, categoryDiscounts);
        const isLowStock = product.stock <= (product.criticalStockLevel || 5);
        const isOutOfStock = product.stock <= 0;

        return (
            <div
                className={`border border-[var(--border-color)] rounded-lg p-4 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md hover:scale-[1.02] ${
                    isSelected ? 'ring-2 ring-[var(--primary-500)] shadow-lg' : ''
                } ${isOutOfStock ? 'bg-red-100 border-red-300' : isLowStock ? 'bg-red-50 border-red-200' : 'bg-[var(--bg-color)]'}`}
                onClick={() => onSelect(product.id)}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className={`font-semibold text-sm line-clamp-2 mb-1 ${
                            isOutOfStock || isLowStock ? 'text-gray-800' : 'text-[var(--text-color)]'
                        }`}>{product.name}</h3>
                        <p className="text-xs text-[var(--text-muted-color)]">{product.category || 'Kategorisiz'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {isOutOfStock && <PackageX size={16} className="text-red-600" />}
                        {isLowStock && !isOutOfStock && <AlertTriangle size={16} className="text-orange-600" />}
                        {!isLowStock && !isOutOfStock && <CheckCircle size={16} className="text-green-600" />}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-[var(--primary-600)]">
                            {formatCurrency(finalPrice)}
                        </span>
                        <span className={`text-sm font-semibold ${
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'
                        }`}>
                            Stok: {product.stock}
                        </span>
                    </div>

                    {discountApplied > 0 && (
                        <div className="flex items-center gap-1 text-green-600 text-xs">
                            <span>İndirimli</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-[var(--text-muted-color)]">
                        <span>Barkod: {product.barcode || 'Yok'}</span>
                        <span>Kritik: {product.criticalStockLevel || 5}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mt-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(product);
                            }}
                            className="p-2 bg-[var(--primary-600)] text-white rounded text-xs hover:bg-[var(--primary-700)] transition-colors duration-200 flex items-center justify-center gap-1"
                        >
                            <Edit size={12} />
                            Düzenle
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setProductModal({ show: true, type: 'stock', product });
                            }}
                            className="p-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-1"
                        >
                            <Package size={12} />
                            Stok Ekle
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setProductModal({ show: true, type: 'price', product });
                            }}
                            className="p-2 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-1"
                        >
                            <Percent size={12} />
                            Fiyat Değiştir
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(product.id, product.name);
                            }}
                            className="p-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-1"
                        >
                            <Trash2 size={12} />
                            Sil
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ProductListItem = ({ product, isSelected, onSelect, onEdit, onDelete }) => {
        const { finalPrice, discountApplied } = calculateDiscountedPrice(product, categoryDiscounts);
        const isLowStock = product.stock <= (product.criticalStockLevel || 5);
        const isOutOfStock = product.stock <= 0;

        return (
            <div
                className={`flex items-center gap-4 p-4 border border-[var(--border-color)] rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:shadow-sm hover:scale-[1.01] ${
                    isSelected ? 'ring-2 ring-[var(--primary-500)] shadow-md' : ''
                } ${isOutOfStock ? 'bg-red-100 border-red-300' : isLowStock ? 'bg-red-50 border-red-200' : 'bg-[var(--bg-color)]'}`}
                onClick={() => onSelect(product.id)}
            >
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                        {isOutOfStock && <PackageX size={16} className="text-red-600" />}
                        {isLowStock && !isOutOfStock && <AlertTriangle size={16} className="text-orange-600" />}
                        {!isLowStock && !isOutOfStock && <CheckCircle size={16} className="text-green-600" />}
                    </div>
                    <div className="flex-1">
                        <h3 className={`font-semibold ${
                            isOutOfStock || isLowStock ? 'text-gray-800' : 'text-[var(--text-color)]'
                        }`}>{product.name}</h3>
                        <p className="text-sm text-[var(--text-muted-color)]">
                            {product.category || 'Kategorisiz'} • Barkod: {product.barcode || 'Yok'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="font-semibold text-[var(--primary-600)]">
                            {formatCurrency(finalPrice)}
                        </p>
                        <p className={`text-sm ${
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'
                        }`}>
                            Stok: {product.stock}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(product);
                            }}
                            className="p-2 bg-[var(--primary-600)] text-white rounded hover:bg-[var(--primary-700)] transition-colors duration-200"
                            title="Düzenle"
                        >
                            <Edit size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setProductModal({ show: true, type: 'stock', product });
                            }}
                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
                            title="Stok Ekle"
                        >
                            <Package size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setProductModal({ show: true, type: 'price', product });
                            }}
                            className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
                            title="Fiyat Değiştir"
                        >
                            <Percent size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(product.id, product.name);
                            }}
                            className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
                            title="Sil"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-color)]">Stok Yönetimi</h1>
                    <p className="text-[var(--text-muted-color)]">Ürünlerinizi yönetin ve stok durumlarını takip edin</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--surface-color)] flex items-center gap-2"
                    >
                        <Upload size={16} />
                        İçe Aktar
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Yeni Ürün
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Toplam Ürün"
                    value={stats.totalProducts}
                    icon={Package}
                    color="blue"
                />
                <StatCard
                    title="Kritik Stok"
                    value={stats.lowStockProducts}
                    icon={AlertTriangle}
                    color="orange"
                />
                <StatCard
                    title="Stok Tükendi"
                    value={stats.outOfStockProducts}
                    icon={PackageX}
                    color="red"
                />
                <StatCard
                    title="Toplam Değer"
                    value={stats.totalStockValue}
                    icon={DollarSign}
                    color="green"
                    format="currency"
                />
                <StatCard
                    title="Ortalama Fiyat"
                    value={stats.averagePrice}
                    icon={TrendingUp}
                    color="purple"
                    format="currency"
                />
            </div>

            {/* Filtreler ve Kontroller */}
            <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Arama */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted-color)]" size={16} />
                        <input
                            type="text"
                            placeholder="Ürün ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                        />
                    </div>

                    {/* Kategori Filtresi */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category === 'all' ? 'Tüm Kategoriler' : category}
                            </option>
                        ))}
                    </select>

                    {/* Stok Filtreleri */}
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={showLowStock}
                            onChange={(e) => setShowLowStock(e.target.checked)}
                            className="rounded"
                        />
                        <span className="text-sm">Sadece Kritik Stok</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={showOutOfStock}
                            onChange={(e) => setShowOutOfStock(e.target.checked)}
                            className="rounded"
                        />
                        <span className="text-sm">Sadece Tükenen</span>
                    </label>

                    {/* Görünüm Modu */}
                    <div className="flex items-center gap-1 border border-[var(--border-color)] rounded-lg p-1">
                        {[
                            { mode: 'grid', icon: Package, label: 'Grid' },
                            { mode: 'list', icon: FileText, label: 'Liste' },
                            { mode: 'compact', icon: Eye, label: 'Kompakt' }
                        ].map(({ mode, icon: Icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`p-2 rounded text-sm flex items-center gap-1 transition-colors ${
                                    viewMode === mode
                                        ? 'bg-[var(--primary-600)] text-white'
                                        : 'hover:bg-[var(--surface-color)]'
                                }`}
                            >
                                <Icon size={14} />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toplu İşlemler */}
                {selectedProducts.length > 0 && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
                        <span className="text-sm text-[var(--text-muted-color)]">
                            {selectedProducts.length} ürün seçildi
                        </span>
                        <button
                            onClick={() => handleBulkAction('export')}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                        >
                            <Download size={14} />
                            Dışa Aktar
                        </button>
                        <button
                            onClick={() => handleBulkAction('print')}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-1"
                        >
                            <Printer size={14} />
                            Yazdır
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                        >
                            <Trash2 size={14} />
                            Sil
                        </button>
                        <button
                            onClick={() => setSelectedProducts([])}
                            className="px-3 py-1 border border-[var(--border-color)] rounded text-sm hover:bg-[var(--surface-color)]"
                        >
                            Seçimi Temizle
                        </button>
                    </div>
                )}
            </div>

            {/* Sıralama */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--text-muted-color)]">Sırala:</span>
                {[
                    { key: 'name', label: 'Ürün Adı' },
                    { key: 'stock', label: 'Stok' },
                    { key: 'price', label: 'Fiyat' },
                    { key: 'category', label: 'Kategori' },
                    { key: 'lastUpdated', label: 'Son Güncelleme' }
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => handleSort(key)}
                        className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${
                            sortBy === key
                                ? 'bg-[var(--primary-600)] text-white'
                                : 'hover:bg-[var(--surface-color)]'
                        }`}
                    >
                        {label}
                        {sortBy === key && (
                            sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
                        )}
                    </button>
                ))}
            </div>

            {/* Ürün Listesi */}
            <div className="space-y-4">
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    isSelected={selectedProducts.includes(product.id)}
                                    onSelect={(id) => {
                                        setSelectedProducts(prev => 
                                            prev.includes(id) 
                                                ? prev.filter(p => p !== id)
                                                : [...prev, id]
                                        );
                                    }}
                                    onEdit={(product) => {
                                        setEditingProduct(product);
                                        setIsEditModalOpen(true);
                                    }}
                                    onDelete={(id, name) => setDeleteConfirm({ show: true, product: { id, name } })}
                                />
                            ))}
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="space-y-2">
                            {filteredProducts.map(product => (
                                <ProductListItem
                                    key={product.id}
                                    product={product}
                                    isSelected={selectedProducts.includes(product.id)}
                                    onSelect={(id) => {
                                        setSelectedProducts(prev => 
                                            prev.includes(id) 
                                                ? prev.filter(p => p !== id)
                                                : [...prev, id]
                                        );
                                    }}
                                    onEdit={(product) => {
                                        setEditingProduct(product);
                                        setIsEditModalOpen(true);
                                    }}
                                    onDelete={(id, name) => setDeleteConfirm({ show: true, product: { id, name } })}
                                />
                            ))}
                    </div>
                )}

                {viewMode === 'compact' && (
                    <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[var(--surface-color)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Ürün</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Kategori</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Stok</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">Fiyat</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className="border-t border-[var(--border-color)] hover:bg-[var(--surface-color)]">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-xs text-[var(--text-muted-color)]">{product.barcode || 'Barkod yok'}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{product.category || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                product.stock <= 0 ? 'bg-red-100 text-red-600' :
                                                product.stock <= (product.criticalStockLevel || 5) ? 'bg-orange-100 text-orange-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {formatCurrency(product.salePrice || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingProduct(product);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-1 text-[var(--primary-600)] hover:bg-[var(--primary-100)] rounded"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteProduct(product.id, product.name)}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredProducts.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-muted-color)]">
                        <Package size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Ürün bulunamadı</p>
                        <p className="text-sm">Filtreleri değiştirmeyi deneyin</p>
                    </div>
                )}
            </div>

            {/* Modaller burada olacak */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-12" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-[var(--bg-color)] w-full max-w-lg rounded-xl p-6 border border-[var(--border-color)] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Yeni Ürün</h3>
                        <AddEditForm
                            initial={{ name: '', barcode: '', stock: 0, salePrice: 0, purchasePrice: 0, category: '', criticalStockLevel: 5 }}
                            onCancel={() => setIsAddModalOpen(false)}
                            onSave={(data) => { onAddOrUpdateProduct(data); setIsAddModalOpen(false); }}
                        />
                    </div>
                </div>
            )}
            {isEditModalOpen && editingProduct && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-12" onClick={() => setIsEditModalOpen(false)}>
                    <div className="bg-[var(--bg-color)] w-full max-w-lg rounded-xl p-6 border border-[var(--border-color)] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Ürünü Düzenle</h3>
                        <AddEditForm
                            initial={{ ...editingProduct }}
                            onCancel={() => setIsEditModalOpen(false)}
                            onSave={(data) => { onAddOrUpdateProduct(data); setIsEditModalOpen(false); setEditingProduct(null); }}
                        />
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm.show && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-12" onClick={() => setDeleteConfirm({ show: false, product: null })}>
                    <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-color)]">Ürünü Sil</h3>
                        </div>
                        <p className="text-[var(--text-muted-color)] mb-6">
                            <strong>"{deleteConfirm.product?.name}"</strong> ürününü silmek istediğinizden emin misiniz? 
                            Bu işlem geri alınamaz.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm({ show: false, product: null })}
                                className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--surface-color)] transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => {
                                    onDeleteProduct(deleteConfirm.product.id, deleteConfirm.product.name);
                                    setDeleteConfirm({ show: false, product: null });
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ürün İşlem Modal */}
            <ProductOperationModal
                isOpen={productModal.show}
                onClose={() => setProductModal({ show: false, type: null, product: null })}
                type={productModal.type}
                product={productModal.product}
                onStockUpdate={handleProductStockUpdate}
                onPriceUpdate={handleProductPriceUpdate}
            />
        </div>
    );
};

export default StockManagement;

// Reusable form for add/edit
const AddEditForm = ({ initial, onSave, onCancel }) => {
    const [form, setForm] = useState(initial);
    return (
        <form onSubmit={(e) => { 
            e.preventDefault(); 
            const processedForm = {
                ...form,
                stock: form.stock === '' ? 0 : form.stock,
                purchasePrice: form.purchasePrice === '' ? 0 : form.purchasePrice,
                salePrice: form.salePrice === '' ? 0 : form.salePrice,
                criticalStockLevel: form.criticalStockLevel === '' ? 5 : form.criticalStockLevel
            };
            onSave(processedForm); 
        }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Ad
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]" required />
                </label>
                <label className="text-sm">Barkod
                    <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]" required />
                </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <label className="text-sm">Stok
                    <input type="number" value={form.stock || ''} onChange={e => setForm({ ...form, stock: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]" min={0} placeholder="0" />
                </label>
                <label className="text-sm">Alış ₺
                    <input type="number" step="0.01" value={form.purchasePrice || ''} onChange={e => setForm({ ...form, purchasePrice: e.target.value === '' ? '' : parseFloat(e.target.value) || '' })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]" min={0} placeholder="0.00" />
                </label>
                <label className="text-sm">Satış ₺
                    <input type="number" step="0.01" value={form.salePrice || ''} onChange={e => setForm({ ...form, salePrice: e.target.value === '' ? '' : parseFloat(e.target.value) || '' })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]" min={0} placeholder="0.00" />
                </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Kategori
                    <input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]" />
                </label>
                <label className="text-sm">Kritik Stok
                    <input type="number" value={form.criticalStockLevel || ''} onChange={e => setForm({ ...form, criticalStockLevel: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })} className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]" min={0} placeholder="5" />
                </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-3 py-2 border border-[var(--border-color)] rounded-lg">İptal</button>
                <button type="submit" className="px-3 py-2 bg-[var(--primary-600)] text-white rounded-lg">Kaydet</button>
            </div>
        </form>
    );
};

// Ürün İşlem Modal Komponenti
const ProductOperationModal = ({ isOpen, onClose, type, product, onStockUpdate, onPriceUpdate }) => {
    const [operationType, setOperationType] = useState('add');
    const [value, setValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            toast.warning('Geçerli bir değer girin.');
            return;
        }

        if (type === 'stock') {
            onStockUpdate(product.id, operationType, numValue);
        } else if (type === 'price') {
            onPriceUpdate(product.id, operationType, numValue);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-12" onClick={onClose}>
            <div className="bg-[var(--bg-color)] p-6 rounded-xl shadow-2xl w-full max-w-md border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">
                    {type === 'stock' ? 'Stok Güncelleme' : 'Fiyat Güncelleme'} - {product.name}
                </h3>
                
                <div className="mb-4 p-3 bg-[var(--surface-color)] rounded-lg">
                    <p className="text-sm text-[var(--text-muted-color)]">
                        {type === 'stock' ? `Mevcut Stok: ${product.stock || 0}` : `Mevcut Fiyat: ₺${(product.salePrice || 0).toFixed(2)}`}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">İşlem Türü</label>
                        <select
                            value={operationType}
                            onChange={(e) => setOperationType(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                        >
                            {type === 'stock' ? (
                                <>
                                    <option value="add">Stok Ekle</option>
                                    <option value="set">Stok Miktarını Belirle</option>
                                </>
                            ) : (
                                <>
                                    <option value="percentage">Yüzde Artır/Azalt</option>
                                    <option value="fixed">Sabit Miktar Ekle/Çıkar</option>
                                    <option value="set">Yeni Fiyat Belirle</option>
                                </>
                            )}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            {type === 'stock' ? 'Miktar' : 'Değer'}
                        </label>
                        <input
                            type="number"
                            step={type === 'price' ? '0.01' : '1'}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                            placeholder={type === 'stock' ? 'Eklenecek miktar' : 'Değer girin'}
                            required
                        />
                        {type === 'price' && operationType === 'percentage' && (
                            <p className="text-xs text-[var(--text-muted-color)] mt-1">
                                Pozitif değer zam, negatif değer indirim yapar
                            </p>
                        )}
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--surface-color)] transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
                        >
                            {type === 'stock' ? 'Stok Güncelle' : 'Fiyat Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
