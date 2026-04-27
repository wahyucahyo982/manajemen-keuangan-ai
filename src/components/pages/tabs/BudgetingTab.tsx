'use client';

import { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, LinearProgress, Grid } from '@mui/material';
import { Icon } from '@iconify/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

interface BudgetingTabProps {
    isLoading: boolean;
    isNominalHidden: boolean;
    selectedMonth: number;
    selectedYear: number;
    monthlyTransactions: Transaction[];
    categoriesWithBudget: Category[];
    totalIncome: number;
}

// Warna konsisten untuk kategori
const CATEGORY_COLORS = [
    '#2563eb', // indigo
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#14b8a6', // teal
    '#a855f7', // purple
    '#eab308', // yellow
];

export default function BudgetingTab({
    isLoading,
    isNominalHidden,
    selectedMonth,
    selectedYear,
    monthlyTransactions,
    categoriesWithBudget,
    totalIncome,
}: BudgetingTabProps) {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonthLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

    // Hitung pengeluaran per kategori
    const categoryExpenses = useMemo(() => {
        const expenses = monthlyTransactions.filter(t => t.type === 'expense');
        const catMap: Record<string, number> = {};
        expenses.forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });
        return Object.entries(catMap)
            .map(([category, amount], index) => ({
                category,
                amount,
                color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [monthlyTransactions]);

    // Total pengeluaran bulan ini
    const totalExpense = useMemo(() => {
        return categoryExpenses.reduce((sum, item) => sum + item.amount, 0);
    }, [categoryExpenses]);

    // Total budget yang ditetapkan
    const totalBudget = useMemo(() => {
        return categoriesWithBudget.reduce((sum, cat) => sum + (cat.monthlyBudget || 0), 0);
    }, [categoriesWithBudget]);

    // Sisa budget
    const remainingBudget = totalBudget - totalExpense;
    const budgetUsedPercentage = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;

    // Proyeksi pengeluaran bulanan
    const expenseProjection = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDate();
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        // Hanya hitung proyeksi jika bulan yang dipilih adalah bulan sekarang
        const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

        if (!isCurrentMonth || currentDay === 0) {
            return null;
        }

        // Rata-rata pengeluaran per hari
        const dailyAverage = totalExpense / currentDay;

        // Proyeksi total pengeluaran di akhir bulan
        const projectedTotal = dailyAverage * daysInMonth;

        // Sisa hari
        const remainingDays = daysInMonth - currentDay;

        // Budget harian yang disarankan untuk tidak melebihi budget
        const suggestedDailyBudget = remainingBudget > 0 ? remainingBudget / remainingDays : 0;

        return {
            dailyAverage,
            projectedTotal,
            remainingDays,
            daysInMonth,
            currentDay,
            suggestedDailyBudget,
            willExceedBudget: totalBudget > 0 && projectedTotal > totalBudget,
            willExceedIncome: totalIncome > 0 && projectedTotal > totalIncome,
        };
    }, [totalExpense, totalBudget, totalIncome, selectedMonth, selectedYear, remainingBudget]);

    // Persentase pengeluaran dari pemasukan
    const incomePercentage = useMemo(() => {
        if (totalIncome <= 0) return 0;
        return (totalExpense / totalIncome) * 100;
    }, [totalExpense, totalIncome]);

    // Data untuk pie chart
    const pieChartData = useMemo(() => {
        return categoryExpenses.map(item => ({
            name: item.category,
            value: item.amount,
            color: item.color,
        }));
    }, [categoryExpenses]);

    // Custom tooltip untuk pie chart
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload?.length) {
            const data = payload[0].payload;
            const percentage = ((data.value / totalExpense) * 100).toFixed(1);
            const incomePercent = totalIncome > 0 ? ((data.value / totalIncome) * 100).toFixed(1) : '0';
            return (
                <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">{data.name}</Typography>
                    <Typography variant="body2" fontWeight={700}>Rp {data.value.toLocaleString('id-ID')}</Typography>
                    <Typography variant="caption" color="text.secondary">{percentage}% dari total</Typography>
                    {totalIncome > 0 && (
                        <Typography variant="caption" display="block" sx={{ color: '#2563eb', fontWeight: 600 }}>
                            {incomePercent}% dari pemasukan
                        </Typography>
                    )}
                </Box>
            );
        }
        return null;
    };

    // Custom legend
    const renderCustomLegend = (props: any) => {
        const { payload } = props;
        return (
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ mt: 1 }}>
                {payload.map((entry: any, index: number) => (
                    <Stack key={index} direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {entry.value}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        );
    };

    // Gabungkan data kategori dengan budget
    const categoryWithBudgetData = useMemo(() => {
        return categoryExpenses.map(expense => {
            const budgetInfo = categoriesWithBudget.find(cat => cat.name === expense.category);
            const budget = budgetInfo?.monthlyBudget || 0;
            const percentage = budget > 0 ? (expense.amount / budget) * 100 : 0;
            const remaining = budget - expense.amount;
            const incomePercent = totalIncome > 0 ? (expense.amount / totalIncome) * 100 : 0;

            return {
                ...expense,
                budget,
                percentage,
                remaining,
                hasBudget: budget > 0,
                isOverBudget: expense.amount > budget && budget > 0,
                incomePercent,
            };
        });
    }, [categoryExpenses, categoriesWithBudget, totalIncome]);

    if (isLoading) {
        return (
            <Box sx={{ px: 2, mt: 2 }}>
                <Card elevation={0} sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Memuat data...</Typography>
                </Card>
            </Box>
        );
    }

    if (categoryExpenses.length === 0) {
        return (
            <Box sx={{ px: 2, mt: 2 }}>
                <Card
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        minHeight: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <CardContent sx={{ textAlign: 'center', p: 4 }}>
                        <Box
                            sx={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                                borderRadius: 4,
                                p: 3,
                                display: 'inline-flex',
                                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
                                mb: 3
                            }}
                        >
                            <Icon icon="mdi:chart-pie" width={48} color="#fff" />
                        </Box>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                            Belum Ada Pengeluaran
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto' }}>
                            Tidak ada data pengeluaran untuk bulan {currentMonthLabel}. Mulai catat pengeluaran Anda!
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ px: 2, mt: 2 }}>
            {/* Section 0: Budget Overview */}
            <Card elevation={0} sx={{ mb: 2, background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)', color: 'white' }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={600}>Ringkasan Budget</Typography>
                        <Chip label={currentMonthLabel} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 500 }} />
                    </Stack>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, backdropFilter: 'blur(10px)' }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>Total Budget</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {isNominalHidden ? '••••••••' : `Rp ${totalBudget.toLocaleString('id-ID')}`}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, backdropFilter: 'blur(10px)' }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>Terpakai</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {isNominalHidden ? '••••••••' : `Rp ${totalExpense.toLocaleString('id-ID')}`}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ p: 1.5, bgcolor: remainingBudget >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', borderRadius: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                            {remainingBudget >= 0 ? 'Sisa Budget' : 'Over Budget'}
                                        </Typography>
                                        <Typography variant="h6" fontWeight={700}>
                                            {isNominalHidden ? '••••••••' : `Rp ${Math.abs(remainingBudget).toLocaleString('id-ID')}`}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Icon
                                            icon={remainingBudget >= 0 ? 'mdi:check-circle' : 'mdi:alert-circle'}
                                            width={32}
                                            color={remainingBudget >= 0 ? '#10b981' : '#ef4444'}
                                        />
                                    </Box>
                                </Stack>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Progress Bar */}
                    {totalBudget > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>Pemakaian Budget</Typography>
                                <Typography variant="caption" fontWeight={600}>
                                    {budgetUsedPercentage.toFixed(1)}%
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(budgetUsedPercentage, 100)}
                                sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 5,
                                        bgcolor: budgetUsedPercentage > 100
                                            ? '#ef4444'
                                            : budgetUsedPercentage >= 80
                                                ? '#f59e0b'
                                                : '#10b981',
                                    },
                                }}
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Section 0.5: Proyeksi Pengeluaran */}
            {expenseProjection && (
                <Card
                    elevation={0}
                    sx={{
                        mb: 2,
                        background: expenseProjection.willExceedBudget || expenseProjection.willExceedIncome
                            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.05) 100%)'
                            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.05) 100%)',
                        border: expenseProjection.willExceedBudget || expenseProjection.willExceedIncome
                            ? '1px solid rgba(239, 68, 68, 0.2)'
                            : '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                >
                    <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <Icon
                                icon="mdi:chart-timeline-variant"
                                width={24}
                                color={expenseProjection.willExceedBudget || expenseProjection.willExceedIncome ? '#ef4444' : '#10b981'}
                            />
                            <Typography variant="h6" fontWeight={600}>Proyeksi Pengeluaran</Typography>
                        </Stack>

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" color="text.secondary">Rata-rata/Hari</Typography>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        {isNominalHidden ? '••••' : `Rp ${expenseProjection.dailyAverage.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6}>
                                <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" color="text.secondary">Sisa Hari</Typography>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        {expenseProjection.remainingDays} hari
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12}>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: 'white',
                                        borderRadius: 2,
                                        border: `2px solid ${expenseProjection.willExceedBudget || expenseProjection.willExceedIncome ? '#ef4444' : '#10b981'}`,
                                    }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Proyeksi Akhir Bulan
                                            </Typography>
                                            <Typography
                                                variant="h6"
                                                fontWeight={700}
                                                color={expenseProjection.willExceedBudget || expenseProjection.willExceedIncome ? 'error.main' : 'success.main'}
                                            >
                                                {isNominalHidden ? '••••••••' : `Rp ${expenseProjection.projectedTotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}
                                            </Typography>
                                        </Box>
                                        {(expenseProjection.willExceedBudget || expenseProjection.willExceedIncome) && (
                                            <Chip
                                                icon={<Icon icon="mdi:alert" width={16} />}
                                                label="Waspada!"
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#ef4444',
                                                    fontWeight: 600,
                                                    '& .MuiChip-icon': { color: '#ef4444' }
                                                }}
                                            />
                                        )}
                                    </Stack>
                                    {(expenseProjection.willExceedBudget || expenseProjection.willExceedIncome) && (
                                        <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
                                            {expenseProjection.willExceedBudget && 'Diprediksi melebihi budget! '}
                                            {expenseProjection.willExceedIncome && 'Diprediksi melebihi pemasukan!'}
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                            {remainingBudget > 0 && expenseProjection.suggestedDailyBudget > 0 && (
                                <Grid item xs={12}>
                                    <Box sx={{ p: 1.5, bgcolor: 'rgba(37, 99, 235, 0.1)', borderRadius: 2, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Icon icon="mdi:lightbulb-outline" width={20} color="#2563eb" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Budget harian yang disarankan
                                                </Typography>
                                                <Typography variant="subtitle2" fontWeight={700} color="primary">
                                                    {isNominalHidden ? '••••' : `Rp ${expenseProjection.suggestedDailyBudget.toLocaleString('id-ID', { maximumFractionDigits: 0 })}/hari`}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Section 1: Pie Chart */}
            <Card elevation={0} sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={600}>Pengeluaran per Kategori</Typography>
                        <Chip label={currentMonthLabel} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                    </Stack>

                    {/* Total Pengeluaran */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Total Pengeluaran</Typography>
                        <Typography variant="h5" fontWeight={700} color="error.main">
                            {isNominalHidden ? '••••••••' : `Rp ${totalExpense.toLocaleString('id-ID')}`}
                        </Typography>
                        {totalIncome > 0 && (
                            <Chip
                                label={`${incomePercentage.toFixed(1)}% dari pemasukan`}
                                size="small"
                                sx={{
                                    mt: 1,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    bgcolor: incomePercentage > 100 ? 'rgba(239, 68, 68, 0.15)' : incomePercentage > 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                    color: incomePercentage > 100 ? '#ef4444' : incomePercentage > 80 ? '#f59e0b' : '#10b981',
                                }}
                            />
                        )}
                    </Box>

                    {/* Pie Chart */}
                    <Box sx={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    dataKey="value"
                                    paddingAngle={2}
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend content={renderCustomLegend} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>

            {/* Section 2: Daftar Kategori dengan Budget */}
            <Card elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(96, 165, 250, 0.02) 100%)', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={600}>Detail per Kategori</Typography>
                        <Typography variant="caption" color="text.secondary">{categoryWithBudgetData.length} kategori</Typography>
                    </Stack>

                    <Stack spacing={2}>
                        {categoryWithBudgetData.map((item, idx) => (
                            <Box
                                key={item.category}
                                sx={{
                                    p: 2,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    border: '1px solid #e2e8f0',
                                    borderLeft: `4px solid ${item.color}`,
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color }} />
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={600}>{item.category}</Typography>
                                            {item.hasBudget && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Budget: {isNominalHidden ? '••••' : `Rp ${item.budget.toLocaleString('id-ID')}`}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                    <Box textAlign="right">
                                        <Typography variant="subtitle2" fontWeight={700} color={item.isOverBudget ? 'error.main' : 'text.primary'}>
                                            {isNominalHidden ? '••••••••' : `Rp ${item.amount.toLocaleString('id-ID')}`}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                            <Typography variant="caption" color="text.secondary">
                                                {((item.amount / totalExpense) * 100).toFixed(1)}%
                                            </Typography>
                                            {totalIncome > 0 && (
                                                <Chip
                                                    label={`${item.incomePercent.toFixed(1)}% income`}
                                                    size="small"
                                                    sx={{
                                                        height: 18,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        bgcolor: 'rgba(37, 99, 235, 0.1)',
                                                        color: '#2563eb',
                                                        '& .MuiChip-label': { px: 0.75 }
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>

                                {/* Budget Progress Bar */}
                                {item.hasBudget && (
                                    <>
                                        <Box sx={{ mt: 1.5 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Terpakai {item.percentage.toFixed(0)}%
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={600}
                                                    color={item.isOverBudget ? 'error.main' : item.percentage >= 80 ? 'warning.main' : 'success.main'}
                                                >
                                                    {item.isOverBudget
                                                        ? `Lebih ${isNominalHidden ? '••••' : `Rp ${Math.abs(item.remaining).toLocaleString('id-ID')}`}`
                                                        : `Sisa ${isNominalHidden ? '••••' : `Rp ${item.remaining.toLocaleString('id-ID')}`}`}
                                                </Typography>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(item.percentage, 100)}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: '#f1f5f9',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        bgcolor: item.isOverBudget
                                                            ? '#ef4444'
                                                            : item.percentage >= 80
                                                                ? '#f59e0b'
                                                                : '#10b981',
                                                    },
                                                }}
                                            />
                                        </Box>
                                        {item.isOverBudget && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                                                <Icon icon="mdi:alert" width={14} color="#ef4444" />
                                                <Typography variant="caption" color="error.main" fontWeight={500}>
                                                    Melebihi budget {(item.percentage - 100).toFixed(0)}%!
                                                </Typography>
                                            </Stack>
                                        )}
                                    </>
                                )}
                            </Box>
                        ))}
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
