'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, Chip, Skeleton, Select, MenuItem, FormControl, IconButton } from '@mui/material';
import { Icon } from '@iconify/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Transaction {
    id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    date: string;
    category: string;
}

interface Category {
    id: string;
    name: string;
    monthlyBudget: number;
}

interface StatistikTabProps {
    isLoading: boolean;
    isNominalHidden: boolean;
    selectedMonth: number;
    selectedYear: number;
    monthlyTransactions: Transaction[];
    transactions: Transaction[];
    categoriesWithBudget: Category[];
}

export default function StatistikTab({
    isLoading,
    isNominalHidden,
    selectedMonth,
    selectedYear,
    monthlyTransactions,
    transactions,
    categoriesWithBudget,
}: StatistikTabProps) {
    const [chartPeriod, setChartPeriod] = useState<'7days' | '1month' | '6months'>('7days');
    const [activeChartIndex, setActiveChartIndex] = useState(0);
    const chartScrollRef = useRef<HTMLDivElement>(null);

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonthLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

    // Hitung total dari transaksi bulan ini
    const totalIncome = useMemo(() => monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthlyTransactions]);
    const totalExpense = useMemo(() => monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthlyTransactions]);
    const balance = totalIncome - totalExpense;

    // Data chart berdasarkan periode yang dipilih
    const generateChartData = useCallback((type: 'expense' | 'income' | 'balance') => {
        const data: { date: string; value: number }[] = [];
        const now = new Date();

        const getAmount = (dateStr: string, month?: number, year?: number) => {
            if (type === 'expense') {
                if (month !== undefined && year !== undefined) {
                    return transactions.filter(t => {
                        const td = new Date(t.date);
                        return t.type === 'expense' && td.getMonth() === month && td.getFullYear() === year;
                    }).reduce((s, t) => s + t.amount, 0);
                }
                return transactions.filter(t => t.type === 'expense' && t.date === dateStr).reduce((s, t) => s + t.amount, 0);
            } else if (type === 'income') {
                if (month !== undefined && year !== undefined) {
                    return transactions.filter(t => {
                        const td = new Date(t.date);
                        return t.type === 'income' && td.getMonth() === month && td.getFullYear() === year;
                    }).reduce((s, t) => s + t.amount, 0);
                }
                return transactions.filter(t => t.type === 'income' && t.date === dateStr).reduce((s, t) => s + t.amount, 0);
            } else {
                if (month !== undefined && year !== undefined) {
                    const inc = transactions.filter(t => {
                        const td = new Date(t.date);
                        return t.type === 'income' && td.getMonth() === month && td.getFullYear() === year;
                    }).reduce((s, t) => s + t.amount, 0);
                    const exp = transactions.filter(t => {
                        const td = new Date(t.date);
                        return t.type === 'expense' && td.getMonth() === month && td.getFullYear() === year;
                    }).reduce((s, t) => s + t.amount, 0);
                    return inc - exp;
                }
                const inc = transactions.filter(t => t.type === 'income' && t.date === dateStr).reduce((s, t) => s + t.amount, 0);
                const exp = transactions.filter(t => t.type === 'expense' && t.date === dateStr).reduce((s, t) => s + t.amount, 0);
                return inc - exp;
            }
        };

        if (chartPeriod === '7days') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                data.push({ date: dayLabel, value: getAmount(dateStr) });
            }
        } else if (chartPeriod === '1month') {
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayLabel = d.toLocaleDateString('id-ID', { day: 'numeric' });
                data.push({ date: dayLabel, value: getAmount(dateStr) });
            }
        } else {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });
                data.push({ date: monthLabel, value: getAmount('', d.getMonth(), d.getFullYear()) });
            }
        }
        return data;
    }, [transactions, chartPeriod]);

    const expenseChartData = useMemo(() => generateChartData('expense'), [generateChartData]);
    const incomeChartData = useMemo(() => generateChartData('income'), [generateChartData]);
    const balanceChartData = useMemo(() => generateChartData('balance'), [generateChartData]);

    const chartConfigs = [
        { title: 'Pengeluaran', data: expenseChartData, color: '#ef4444', gradientId: 'colorExpense', dataKey: 'value' },
        { title: 'Pemasukan', data: incomeChartData, color: '#10b981', gradientId: 'colorIncome', dataKey: 'value' },
        { title: 'Selisih', data: balanceChartData, color: '#2563eb', gradientId: 'colorBalance', dataKey: 'value' },
    ];

    const scrollToChart = (index: number) => {
        if (chartScrollRef.current) {
            const cardWidth = chartScrollRef.current.offsetWidth;
            chartScrollRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
            setActiveChartIndex(index);
        }
    };

    const handleChartScroll = () => {
        if (chartScrollRef.current) {
            const scrollLeft = chartScrollRef.current.scrollLeft;
            const cardWidth = chartScrollRef.current.offsetWidth;
            const newIndex = Math.round(scrollLeft / cardWidth);
            if (newIndex !== activeChartIndex) setActiveChartIndex(newIndex);
        }
    };

    // Ringkasan pengeluaran per kategori (bulan ini)
    const categoryExpenses = useMemo(() => {
        const expenses = monthlyTransactions.filter(t => t.type === 'expense');
        const catMap: Record<string, number> = {};
        expenses.forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });
        return Object.entries(catMap)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [monthlyTransactions]);

    // Budget tracking per kategori
    const budgetTracking = useMemo(() => {
        const categoriesWithBudgetSet = categoriesWithBudget.filter(cat => cat.monthlyBudget > 0);
        if (categoriesWithBudgetSet.length === 0) return [];

        return categoriesWithBudgetSet.map(cat => {
            const spent = categoryExpenses.find(e => e.category === cat.name)?.amount || 0;
            const budget = cat.monthlyBudget;
            const remaining = budget - spent;
            const percentage = (spent / budget) * 100;
            const remainingPercentage = 100 - percentage;

            return {
                name: cat.name,
                budget,
                spent,
                remaining,
                percentage,
                remainingPercentage,
                isOverBudget: spent > budget,
            };
        }).sort((a, b) => b.percentage - a.percentage);
    }, [categoriesWithBudget, categoryExpenses]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload?.length) {
            return (
                <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
                    {payload.map((e: any, i: number) => (
                        <Typography key={i} variant="body2" fontWeight={600} sx={{ color: e.color }}>{e.name}: Rp {e.value.toLocaleString('id-ID')}</Typography>
                    ))}
                </Box>
            );
        }
        return null;
    };

    return (
        <Box sx={{ px: 2, mt: 2 }}>
            {isLoading ? (
                <Grid container spacing={2}>
                    {[1, 2, 3].map((i) => (
                        <Grid item xs={12} key={i}>
                            <Card elevation={0}>
                                <CardContent sx={{ p: 2.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 3 }} />
                                        <Box flex={1}>
                                            <Skeleton variant="text" width="50%" height={16} />
                                            <Skeleton variant="text" width="70%" height={28} />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Card elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box sx={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', borderRadius: 3, p: 1.5, display: 'flex', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}><Icon icon="mdi:trending-down" width={24} color="#fff" /></Box>
                                    <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary" fontWeight={500}>Total Pemasukan</Typography><Typography variant="h6" color="success.main" fontWeight={700}>{isNominalHidden ? '••••••••' : `Rp ${totalIncome.toLocaleString('id-ID')}`}</Typography></Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12}>
                        <Card elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.05) 100%)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', borderRadius: 3, p: 1.5, display: 'flex', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)' }}><Icon icon="mdi:trending-up" width={24} color="#fff" /></Box>
                                    <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary" fontWeight={500}>Total Pengeluaran</Typography><Typography variant="h6" color="error.main" fontWeight={700}>{isNominalHidden ? '••••••••' : `Rp ${totalExpense.toLocaleString('id-ID')}`}</Typography></Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12}>
                        <Card elevation={0} sx={{ background: balance >= 0 ? 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)' : 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', color: 'white', position: 'relative' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 3, p: 1.5, display: 'flex' }}><Icon icon="mdi:wallet-outline" width={24} /></Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>Selisih</Typography>
                                            <Chip label={balance >= 0 ? 'Surplus' : 'Defisit'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, height: 22 }} />
                                        </Stack>
                                        <Typography variant="h5" fontWeight={700}>{isNominalHidden ? '••••••••' : `Rp ${balance.toLocaleString('id-ID')}`}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Chart Carousel */}
            <Box sx={{ mt: 3, position: 'relative' }}>
                {/* Period Filter */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={600}>Grafik {chartPeriod === '6months' ? 'Bulanan' : 'Harian'}</Typography>
                    <FormControl size="small">
                        <Select
                            value={chartPeriod}
                            onChange={(e) => setChartPeriod(e.target.value as any)}
                            sx={{ borderRadius: 2, fontSize: '0.75rem', fontWeight: 500, '& .MuiSelect-select': { py: 0.75, px: 1.5 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' } }}
                        >
                            <MenuItem value="7days">7 Hari</MenuItem>
                            <MenuItem value="1month">1 Bulan</MenuItem>
                            <MenuItem value="6months">6 Bulan</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                {/* Navigation Arrows */}
                <IconButton
                    onClick={() => scrollToChart(Math.max(0, activeChartIndex - 1))}
                    disabled={activeChartIndex === 0}
                    sx={{ position: 'absolute', left: -8, top: '55%', zIndex: 10, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', '&:hover': { bgcolor: '#f8fafc' }, '&.Mui-disabled': { opacity: 0.3 } }}
                >
                    <Icon icon="mdi:chevron-left" width={24} />
                </IconButton>
                <IconButton
                    onClick={() => scrollToChart(Math.min(2, activeChartIndex + 1))}
                    disabled={activeChartIndex === 2}
                    sx={{ position: 'absolute', right: -8, top: '55%', zIndex: 10, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', '&:hover': { bgcolor: '#f8fafc' }, '&.Mui-disabled': { opacity: 0.3 } }}
                >
                    <Icon icon="mdi:chevron-right" width={24} />
                </IconButton>

                {/* Scrollable Chart Cards */}
                <Box
                    ref={chartScrollRef}
                    onScroll={handleChartScroll}
                    sx={{
                        display: 'flex',
                        overflowX: 'auto',
                        scrollSnapType: 'x mandatory',
                        scrollBehavior: 'smooth',
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        mx: -2, px: 2,
                    }}
                >
                    {chartConfigs.map((config, idx) => (
                        <Card
                            key={config.title}
                            elevation={0}
                            sx={{
                                minWidth: '100%',
                                scrollSnapAlign: 'start',
                                transition: 'transform 0.3s ease, opacity 0.3s ease',
                                transform: activeChartIndex === idx ? 'scale(1)' : 'scale(0.95)',
                                opacity: activeChartIndex === idx ? 1 : 0.7,
                            }}
                        >
                            <CardContent sx={{ p: 2.5 }}>
                                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: config.color }} />
                                    <Typography variant="subtitle1" fontWeight={600}>{config.title}</Typography>
                                </Stack>
                                <Box sx={{ width: '100%', height: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000)}k`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey={config.dataKey} name={config.title} stroke={config.color} strokeWidth={2.5} fillOpacity={1} fill={`url(#${config.gradientId})`} dot={{ fill: config.color, strokeWidth: 2, r: 3 }} activeDot={{ r: 5, fill: config.color, stroke: '#fff', strokeWidth: 2 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {/* Dots Indicator */}
                <Stack direction="row" justifyContent="center" spacing={1} mt={2}>
                    {chartConfigs.map((_, idx) => (
                        <Box
                            key={idx}
                            onClick={() => scrollToChart(idx)}
                            sx={{
                                width: activeChartIndex === idx ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: activeChartIndex === idx ? '#2563eb' : '#e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': { bgcolor: activeChartIndex === idx ? '#2563eb' : '#cbd5e1' },
                            }}
                        />
                    ))}
                </Stack>
            </Box>

            {/* Category Summary */}
            {categoryExpenses.length > 0 && (
                <Card sx={{ mt: 3 }} elevation={0}>
                    <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight={600}>Pengeluaran per Kategori</Typography>
                            <Chip label={currentMonthLabel} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                        </Stack>
                        <Stack spacing={1.5}>
                            {categoryExpenses.map((item, idx) => (
                                <Box key={item.category}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" fontWeight={600} color={idx === 0 ? 'error.main' : 'text.primary'}>
                                                {idx + 1}. {item.category}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight={700} color={idx === 0 ? 'error.main' : 'text.primary'}>
                                            Rp {item.amount.toLocaleString('id-ID')}
                                        </Typography>
                                    </Stack>
                                    <Box sx={{ height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                        <Box sx={{ height: '100%', width: `${(item.amount / categoryExpenses[0].amount) * 100}%`, bgcolor: idx === 0 ? '#ef4444' : '#2563eb', borderRadius: 3, transition: 'width 0.5s ease' }} />
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
