import React, { useState, useMemo } from 'react';
import { 
    TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, 
    Users, AlertTriangle, Clock, Calendar, BarChart3, PieChart,
    ArrowUp, ArrowDown, Eye, Download, RefreshCw, Filter,
    PackageX, CheckCircle, XCircle, Clock as ClockIcon,
    DollarSign as DollarIcon, ShoppingBag, UserCheck, Star, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart, Line,
    AreaChart, Area
} from 'recharts';

const Dashboard = ({ products = [], sales = [], purchases = [], suppliers = [], expenses = [], customers = [], onNavigate }) => {
    const [timeRange, setTimeRange] = useState('today');
    const [refreshKey, setRefreshKey] = useState(0);

    // Veri hesaplamaları
    const dashboardData = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());
        const lastYear = new Date(today.getFullYear() - 1, now.getMonth(), now.getDate());

        const filterByDate = (items = [], startDate) => {
            return items.filter(item => {
                const raw = item.saleDate ?? item.purchaseDate ?? item.date;
                const itemDate = raw && raw.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
                return itemDate instanceof Date && !isNaN(itemDate) && itemDate >= startDate;
            });
        };

        const getFilteredData = (startDate) => {
            const filteredSales = filterByDate(sales, startDate);
            const filteredPurchases = filterByDate(purchases, startDate);
            const filteredExpenses = filterByDate(expenses, startDate);

            return { filteredSales, filteredPurchases, filteredExpenses };
        };

        let currentData, previousData;
        switch (timeRange) {
            case 'today':
                currentData = getFilteredData(today);
                previousData = getFilteredData(yesterday);
                break;
            case 'week':
                currentData = getFilteredData(lastWeek);
                previousData = getFilteredData(new Date(lastWeek.getTime() - 7 * 24 * 60 * 60 * 1000));
                break;
            case 'month':
                currentData = getFilteredData(lastMonth);
                previousData = getFilteredData(new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000));
                break;
            case 'year':
                currentData = getFilteredData(new Date(today.getFullYear(), 0, 1));
                previousData = getFilteredData(new Date(today.getFullYear() - 1, 0, 1));
                break;
            default:
                currentData = getFilteredData(today);
                previousData = getFilteredData(yesterday);
        }

        // Satış hesaplamaları
        const currentSalesTotal = currentData.filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const previousSalesTotal = previousData.filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const salesChange = previousSalesTotal > 0 ? ((currentSalesTotal - previousSalesTotal) / previousSalesTotal) * 100 : 0;

        // Satış adedi
        const currentSalesCount = currentData.filteredSales.length;
        const previousSalesCount = previousData.filteredSales.length;
        const salesCountChange = previousSalesCount > 0 ? ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 : 0;

        // Kâr hesaplaması
        const currentProfit = currentData.filteredSales.reduce((sum, sale) => {
            const itemsProfit = (sale.items || []).reduce((itemSum, item) => {
                return itemSum + ((item.price - (item.purchasePrice || 0)) * item.quantity);
            }, 0);
            return sum + itemsProfit;
        }, 0);

        const previousProfit = previousData.filteredSales.reduce((sum, sale) => {
            const itemsProfit = (sale.items || []).reduce((itemSum, item) => {
                return itemSum + ((item.price - (item.purchasePrice || 0)) * item.quantity);
            }, 0);
            return sum + itemsProfit;
        }, 0);

        const profitChange = previousProfit > 0 ? ((currentProfit - previousProfit) / previousProfit) * 100 : 0;

        // Gider hesaplaması
        const currentExpenses = currentData.filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const previousExpenses = previousData.filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const expensesChange = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;

        // Stok durumu
        const lowStockProducts = products.filter(p => p.stock <= (p.criticalStockLevel || 5));
        const outOfStockProducts = products.filter(p => p.stock <= 0);
        const totalStockValue = products.reduce((sum, p) => sum + (p.stock * (p.salePrice || 0)), 0);

        // Müşteri istatistikleri
        const uniqueCustomers = [...new Set(sales.map(s => s.customerInfo?.name).filter(Boolean))];
        const newCustomers = uniqueCustomers.length;

        // En çok satan ürünler
        const productSales = {};
        currentData.filteredSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += item.price * item.quantity;
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Günlük satış grafiği - daha detaylı veri
        const dailySales = {};
        
        // Son 7 günün verilerini hazırla
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toLocaleDateString('tr-TR', { weekday: 'short' });
            dailySales[dateStr] = { sales: 0, revenue: 0, date: date };
        }
        
        // Mevcut satış verilerini ekle
        currentData.filteredSales.forEach(sale => {
            const rawDate = sale.saleDate ?? sale.date;
            const date = rawDate && rawDate.toDate ? rawDate.toDate() : (rawDate ? new Date(rawDate) : new Date());
            const dateStr = date.toLocaleDateString('tr-TR', { weekday: 'short' });
            if (dailySales[dateStr]) {
                dailySales[dateStr].sales += 1;
                dailySales[dateStr].revenue += sale.total || 0;
            }
        });

        // Haftalık sıraya göre düzenle
        const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const dailySalesData = weekDays.map(day => ({
            day,
            sales: dailySales[day]?.sales || 0,
            revenue: dailySales[day]?.revenue || 0
        }));

        // Kategori dağılımı
        const categorySales = {};
        currentData.filteredSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const category = item.category || 'Diğer';
                if (!categorySales[category]) {
                    categorySales[category] = 0;
                }
                categorySales[category] += item.price * item.quantity;
            });
        });

        const categoryData = Object.entries(categorySales).map(([category, revenue]) => ({
            name: category,
            value: revenue
        }));

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

        return {
            currentSalesTotal,
            salesChange,
            currentSalesCount,
            salesCountChange,
            currentProfit,
            profitChange,
            currentExpenses,
            expensesChange,
            lowStockProducts,
            outOfStockProducts,
            totalStockValue,
            newCustomers,
            topProducts,
            dailySalesData,
            categoryData,
            COLORS
        };
    }, [sales, purchases, expenses, products, timeRange, refreshKey]);

    const StatCard = ({ title, value, change, icon: Icon, color = 'blue', format = 'currency' }) => {
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
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-muted-color)]">{title}</p>
                        <p className="text-2xl font-bold text-[var(--text-color)] mt-1">
                            {formatValue(value)}
                        </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}>
                        <Icon size={24} />
                    </div>
                </div>
                {change !== undefined && (
                    <div className="flex items-center mt-4">
                        {change >= 0 ? (
                            <ArrowUp className="w-4 h-4 text-green-600" />
                        ) : (
                            <ArrowDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ml-1 ${
                            change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {Math.abs(change).toFixed(1)}%
                        </span>
                        <span className="text-sm text-[var(--text-muted-color)] ml-1">
                            önceki döneme göre
                        </span>
                    </div>
                )}
            </motion.div>
        );
    };

    const QuickActionCard = ({ title, description, icon: Icon, onClick, color = 'blue' }) => (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`p-4 bg-gradient-to-br from-${color}-50 to-${color}-100 border border-${color}-200 rounded-lg text-left hover:shadow-md transition-all`}
        >
            <div className={`w-12 h-12 bg-${color}-600 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-[var(--text-color)] mb-1">{title}</h3>
            <p className="text-sm text-[var(--text-muted-color)]">{description}</p>
        </motion.button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-color)]">Gösterge Paneli</h1>
                    <p className="text-[var(--text-muted-color)]">İşletmenizin genel durumu ve performansı</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]"
                    >
                        <option value="today">Bugün</option>
                        <option value="week">Bu Hafta</option>
                        <option value="month">Bu Ay</option>
                        <option value="year">Bu Yıl</option>
                    </select>
                    <button
                        onClick={() => setRefreshKey(prev => prev + 1)}
                        className="p-2 hover:bg-[var(--surface-color)] rounded-lg transition-colors"
                        title="Yenile"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Toplam Satış"
                    value={dashboardData.currentSalesTotal}
                    change={dashboardData.salesChange}
                    icon={DollarSign}
                    color="green"
                />
                <StatCard
                    title="Satış Adedi"
                    value={dashboardData.currentSalesCount}
                    change={dashboardData.salesCountChange}
                    icon={ShoppingCart}
                    color="blue"
                    format="number"
                />
                <StatCard
                    title="Net Kâr"
                    value={dashboardData.currentProfit}
                    change={dashboardData.profitChange}
                    icon={TrendingUp}
                    color="purple"
                />
                <StatCard
                    title="Giderler"
                    value={dashboardData.currentExpenses}
                    change={dashboardData.expensesChange}
                    icon={AlertTriangle}
                    color="red"
                />
            </div>

            {/* Hızlı Erişim */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionCard
                    title="Yeni Satış"
                    description="Hızlı satış ekranını aç"
                    icon={Zap}
                    color="green"
                    onClick={() => onNavigate && onNavigate('quickSale')}
                />
                <QuickActionCard
                    title="Ürün Ekle"
                    description="Yeni ürün ekle"
                    icon={Package}
                    color="blue"
                    onClick={() => onNavigate && onNavigate('stock')}
                />
                <QuickActionCard
                    title="Stok Kontrolü"
                    description="Kritik stok durumu"
                    icon={AlertTriangle}
                    color="red"
                    onClick={() => onNavigate && onNavigate('stock')}
                />
                <QuickActionCard
                    title="Raporlar"
                    description="Detaylı raporları görüntüle"
                    icon={BarChart3}
                    color="purple"
                    onClick={() => onNavigate && onNavigate('reports')}
                />
            </div>

            {/* Grafikler ve Detaylar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Günlük Satış Grafiği */}
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Günlük Satış Trendi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={dashboardData.dailySalesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="day" 
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                axisLine={{ stroke: '#374151' }}
                            />
                            <YAxis 
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                axisLine={{ stroke: '#374151' }}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#F9FAFB'
                                }}
                                formatter={(value, name) => [
                                    name === 'revenue' ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value) : value,
                                    name === 'revenue' ? 'Gelir' : 'Satış Adedi'
                                ]}
                                labelStyle={{ color: '#F9FAFB' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#3b82f6" 
                                fill="#3b82f6" 
                                fillOpacity={0.4}
                                strokeWidth={3}
                                name="revenue"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    
                    {/* Grafik altında özet bilgiler */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium">Toplam Gelir</p>
                            <p className="text-lg font-bold text-blue-800">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                                    dashboardData.dailySalesData.reduce((sum, day) => sum + day.revenue, 0)
                                )}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600 font-medium">Toplam Satış</p>
                            <p className="text-lg font-bold text-green-800">
                                {dashboardData.dailySalesData.reduce((sum, day) => sum + day.sales, 0)} adet
                            </p>
                        </div>
                    </div>
                </div>

                {/* Kategori Dağılımı */}
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Kategori Dağılımı</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                            <Pie
                                data={dashboardData.categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {dashboardData.categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={dashboardData.COLORS[index % dashboardData.COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)}
                            />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alt Kartlar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* En Çok Satan Ürünler */}
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">En Çok Satan Ürünler</h3>
                    <div className="space-y-3">
                        {dashboardData.topProducts.map((product, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[var(--surface-color)] rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[var(--primary-600)] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{product.name}</p>
                                        <p className="text-xs text-[var(--text-muted-color)]">
                                            {product.quantity} adet satıldı
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-sm">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.revenue)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stok Durumu */}
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Stok Durumu</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Toplam Ürün Değeri:</span>
                            <span className="font-semibold">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(dashboardData.totalStockValue)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Kritik Stok:</span>
                            <span className="font-semibold text-orange-600">
                                {dashboardData.lowStockProducts.length} ürün
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Stok Tükendi:</span>
                            <span className="font-semibold text-red-600">
                                {dashboardData.outOfStockProducts.length} ürün
                            </span>
                        </div>
                        
                        {/* Tüm ürünlerin stok durumu */}
                        <div className="mt-4">
                            <h4 className="text-sm font-medium mb-3 text-[var(--text-muted-color)]">Ürün Stok Durumu</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {products.map(product => {
                                    const isLowStock = product.stock <= (product.criticalStockLevel || 5);
                                    const isOutOfStock = product.stock <= 0;
                                    
                                    return (
                                        <div 
                                            key={product.id} 
                                            className={`flex items-center justify-between p-2 rounded ${
                                                isOutOfStock 
                                                    ? 'bg-red-50 border border-red-200' 
                                                    : isLowStock 
                                                        ? 'bg-orange-50 border border-orange-200' 
                                                        : 'bg-green-50 border border-green-200'
                                            }`}
                                        >
                                            <span className="text-sm font-semibold text-gray-800">{product.name}</span>
                                            <span className={`text-xs font-semibold ${
                                                isOutOfStock 
                                                    ? 'text-red-600' 
                                                    : isLowStock 
                                                        ? 'text-orange-600' 
                                                        : 'text-green-600'
                                            }`}>
                                                {product.stock} adet
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Son Aktiviteler */}
                <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Son Aktiviteler</h3>
                    <div className="space-y-3">
                        {sales.slice(0, 5).map(sale => (
                            <div key={sale.id} className="flex items-center gap-3 p-2 bg-[var(--surface-color)] rounded">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <ShoppingCart size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sale.total || 0)}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted-color)]">
                                        {sale.saleDate?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih bilgisi yok'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
