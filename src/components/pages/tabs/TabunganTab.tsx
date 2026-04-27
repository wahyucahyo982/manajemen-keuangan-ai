'use client';

import { useState, useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, LinearProgress, Grid, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Skeleton } from '@mui/material';
import { Icon } from '@iconify/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { writeData } from '@/lib/database';

interface Account {
    id: string;
    name: string;
    type: 'cash' | 'bank' | 'ewallet' | 'savings' | 'investment' | 'debt' | 'other';
    balance: number;
    icon: string;
    color: string;
}

interface SavingsGoal {
    accountId: string;
    customName: string;
    targetAmount: number;
    targetDate?: string;
}

interface Transaction {
    id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    date: string;
    category: string;
    destAccountId?: string;
    sourceAccountId?: string;
}

interface TabunganTabProps {
    isLoading: boolean;
    isNominalHidden: boolean;
    accounts: Account[];
    transactions: Transaction[];
    savingsGoals: SavingsGoal[];
    userId?: string;
    onSavingsGoalUpdate: (goal: SavingsGoal) => void;
}

// Warna untuk grafik
const CHART_COLORS = [
    '#2563eb',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
    '#06b6d4',
];

export default function TabunganTab({
    isLoading,
    isNominalHidden,
    accounts,
    transactions,
    savingsGoals,
    userId,
    onSavingsGoalUpdate,
}: TabunganTabProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [customName, setCustomName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');

    // Filter akun tabungan saja
    const savingsAccounts = useMemo(() => {
        return accounts.filter(acc => acc.type === 'savings');
    }, [accounts]);

    // Total saldo tabungan
    const totalSavings = useMemo(() => {
        return savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    }, [savingsAccounts]);

    // Total target
    const totalTarget = useMemo(() => {
        return savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    }, [savingsGoals]);

    // Persentase pencapaian total
    const totalPercentage = totalTarget > 0 ? (totalSavings / totalTarget) * 100 : 0;

    // Data historis tabungan per bulan (6 bulan terakhir)
    const monthlyChartData = useMemo(() => {
        const data: { month: string; total: number }[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

            // Hitung saldo kumulatif sampai akhir bulan tersebut
            let cumulativeBalance = 0;

            savingsAccounts.forEach(account => {
                // Mulai dari saldo sekarang dan kurangi/tambahkan transaksi yang terjadi setelah bulan tersebut
                let accountBalance = account.balance;

                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                    // Jika transaksi terjadi setelah akhir bulan yang dihitung
                    if (tDate > endOfMonth) {
                        if (t.destAccountId === account.id) {
                            // Ini adalah pemasukan ke tabungan, kurangi untuk mendapatkan saldo sebelumnya
                            accountBalance -= t.amount;
                        } else if (t.sourceAccountId === account.id) {
                            // Ini adalah pengeluaran dari tabungan, tambahkan untuk mendapatkan saldo sebelumnya
                            accountBalance += t.amount;
                        }
                    }
                });

                cumulativeBalance += Math.max(0, accountBalance);
            });

            data.push({
                month: monthLabel,
                total: cumulativeBalance,
            });
        }

        return data;
    }, [savingsAccounts, transactions]);

    // Get savings goal for an account
    const getSavingsGoal = useCallback((accountId: string): SavingsGoal | undefined => {
        return savingsGoals.find(g => g.accountId === accountId);
    }, [savingsGoals]);

    // Format number dengan thousand separator
    const formatNumber = (value: string): string => {
        const num = value.replace(/\D/g, '');
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Parse formatted number ke number
    const parseFormattedNumber = (value: string): string => {
        return value.replace(/\./g, '');
    };

    // Handle edit dialog
    const handleOpenEdit = (account: Account) => {
        setSelectedAccount(account);
        const goal = getSavingsGoal(account.id);
        setCustomName(goal?.customName || account.name);
        setTargetAmount(goal?.targetAmount ? formatNumber(goal.targetAmount.toString()) : '');
        setEditDialogOpen(true);
    };

    const handleCloseEdit = () => {
        setEditDialogOpen(false);
        setSelectedAccount(null);
        setCustomName('');
        setTargetAmount('');
    };

    const handleSaveGoal = async () => {
        if (!selectedAccount || !userId) return;

        const goal: SavingsGoal = {
            accountId: selectedAccount.id,
            customName: customName || selectedAccount.name,
            targetAmount: parseFloat(parseFormattedNumber(targetAmount)) || 0,
        };

        try {
            await writeData(`users/${userId}/savingsGoals/${selectedAccount.id}`, goal);
            onSavingsGoalUpdate(goal);
            handleCloseEdit();
        } catch (error) {
            console.error('Error saving goal:', error);
        }
    };

    // Custom tooltip untuk chart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload?.length) {
            return (
                <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={700} color="success.main">
                        Rp {payload[0].value.toLocaleString('id-ID')}
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <Box sx={{ px: 2, mt: 2 }}>
                <Card elevation={0} sx={{ p: 4, textAlign: 'center' }}>
                    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                </Card>
            </Box>
        );
    }

    if (savingsAccounts.length === 0) {
        return (
            <Box sx={{ px: 2, mt: 2 }}>
                <Card
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.05) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        minHeight: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <CardContent sx={{ textAlign: 'center', p: 4 }}>
                        <Box
                            sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                borderRadius: 4,
                                p: 3,
                                display: 'inline-flex',
                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                                mb: 3
                            }}
                        >
                            <Icon icon="mdi:piggy-bank-outline" width={48} color="#fff" />
                        </Box>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                            Belum Ada Akun Tabungan
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto' }}>
                            Tambahkan akun dengan tipe &quot;Tabungan&quot; di menu Akun untuk mulai melacak tabungan Anda.
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ px: 2, mt: 2 }}>
            {/* Section 1: Total Tabungan Overview */}
            <Card elevation={0} sx={{ mb: 2, background: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)', color: 'white' }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Icon icon="mdi:piggy-bank" width={24} />
                            <Typography variant="h6" fontWeight={600}>Total Tabungan</Typography>
                        </Stack>
                        <Chip
                            label={`${savingsAccounts.length} akun`}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 500 }}
                        />
                    </Stack>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, backdropFilter: 'blur(10px)' }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>Saldo Saat Ini</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {isNominalHidden ? '••••••••' : `Rp ${totalSavings.toLocaleString('id-ID')}`}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, backdropFilter: 'blur(10px)' }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>Total Target</Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {isNominalHidden ? '••••••••' : `Rp ${totalTarget.toLocaleString('id-ID')}`}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Progress Bar */}
                    {totalTarget > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>Pencapaian Target</Typography>
                                <Typography variant="caption" fontWeight={600}>
                                    {totalPercentage.toFixed(1)}%
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(totalPercentage, 100)}
                                sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 5,
                                        bgcolor: totalPercentage >= 100 ? '#fbbf24' : 'white',
                                    },
                                }}
                            />
                            {totalPercentage >= 100 && (
                                <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                                    <Icon icon="mdi:party-popper" width={16} />
                                    <Typography variant="caption" fontWeight={600}>
                                        Selamat! Target tercapai!
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Section 2: Grafik Perkembangan Bulanan */}
            <Card elevation={0} sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <Icon icon="mdi:chart-line" width={24} color="#10b981" />
                        <Typography variant="h6" fontWeight={600}>Perkembangan Tabungan</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        6 bulan terakhir
                    </Typography>

                    <Box sx={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>

            {/* Section 3: Daftar Akun Tabungan */}
            <Card elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(52, 211, 153, 0.02) 100%)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={600}>Detail Tabungan</Typography>
                        <Typography variant="caption" color="text.secondary">{savingsAccounts.length} akun</Typography>
                    </Stack>

                    <Stack spacing={2}>
                        {savingsAccounts.map((account, idx) => {
                            const goal = getSavingsGoal(account.id);
                            const displayName = goal?.customName || account.name;
                            const target = goal?.targetAmount || 0;
                            const percentage = target > 0 ? (account.balance / target) * 100 : 0;
                            const remaining = target - account.balance;
                            const color = CHART_COLORS[idx % CHART_COLORS.length];

                            return (
                                <Box
                                    key={account.id}
                                    sx={{
                                        p: 2,
                                        bgcolor: 'white',
                                        borderRadius: 2,
                                        border: '1px solid #e2e8f0',
                                        borderLeft: `4px solid ${color}`,
                                    }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2,
                                                    bgcolor: `${color}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Icon icon={account.icon || 'mdi:piggy-bank'} width={24} color={color} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600}>{displayName}</Typography>
                                                {target > 0 && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Target: {isNominalHidden ? '••••' : `Rp ${target.toLocaleString('id-ID')}`}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <Box textAlign="right">
                                                <Typography variant="subtitle1" fontWeight={700} color="success.main">
                                                    {isNominalHidden ? '••••••••' : `Rp ${account.balance.toLocaleString('id-ID')}`}
                                                </Typography>
                                                {target > 0 && (
                                                    <Chip
                                                        size="small"
                                                        label={percentage >= 100 ? 'Tercapai!' : `${percentage.toFixed(0)}%`}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            bgcolor: percentage >= 100
                                                                ? 'rgba(16, 185, 129, 0.15)'
                                                                : percentage >= 75
                                                                    ? 'rgba(245, 158, 11, 0.15)'
                                                                    : 'rgba(37, 99, 235, 0.15)',
                                                            color: percentage >= 100
                                                                ? '#10b981'
                                                                : percentage >= 75
                                                                    ? '#f59e0b'
                                                                    : '#2563eb',
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenEdit(account)}
                                                sx={{ ml: 0.5 }}
                                            >
                                                <Icon icon="mdi:pencil" width={18} color="#64748b" />
                                            </IconButton>
                                        </Stack>
                                    </Stack>

                                    {/* Progress Bar untuk target */}
                                    {target > 0 && (
                                        <Box sx={{ mt: 2 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Progress
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={600}
                                                    color={remaining <= 0 ? 'success.main' : 'text.secondary'}
                                                >
                                                    {remaining <= 0
                                                        ? 'Target tercapai!'
                                                        : `Kurang ${isNominalHidden ? '••••' : `Rp ${remaining.toLocaleString('id-ID')}`}`}
                                                </Typography>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(percentage, 100)}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: '#f1f5f9',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        background: percentage >= 100
                                                            ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                                                            : `linear-gradient(90deg, ${color} 0%, ${color}99 100%)`,
                                                    },
                                                }}
                                            />
                                        </Box>
                                    )}

                                    {!target && (
                                        <Button
                                            size="small"
                                            startIcon={<Icon icon="mdi:target" width={16} />}
                                            onClick={() => handleOpenEdit(account)}
                                            sx={{
                                                mt: 1.5,
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                color: '#2563eb',
                                                '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' }
                                            }}
                                        >
                                            Atur Target Tabungan
                                        </Button>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={handleCloseEdit}
                PaperProps={{ sx: { borderRadius: 3, minWidth: 320 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    Atur Target Tabungan
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            label="Nama Kustom"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            fullWidth
                            placeholder={selectedAccount?.name || 'Nama tabungan'}
                            helperText="Beri nama yang mudah diingat"
                        />
                        <TextField
                            label="Target Tabungan"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(formatNumber(e.target.value))}
                            fullWidth
                            placeholder="0"
                            InputProps={{
                                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>Rp</Typography>,
                            }}
                            helperText="Berapa target yang ingin dicapai?"
                            inputProps={{ inputMode: 'numeric' }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={handleCloseEdit} sx={{ borderRadius: 2 }}>
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveGoal}
                        sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
                    >
                        Simpan
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
