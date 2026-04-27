'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, Typography, Stack, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Fab, Chip, Skeleton, LinearProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuth } from '@/lib/AuthProvider';
import { writeData, deleteData, listenToData } from '@/lib/database';
import InputAdornment from '@mui/material/InputAdornment';

interface Category {
    id: string;
    name: string;
    monthlyBudget: number;
}

interface Transaction {
    id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    date: string;
    category: string;
}

// Komponen CategoryDialog dengan local state untuk performa
function CategoryDialog({ open, onClose, category, onSave }: {
    open: boolean;
    onClose: () => void;
    category: Category | null;
    onSave: (data: Omit<Category, 'id'>) => void;
}) {
    const [name, setName] = useState('');
    const [monthlyBudget, setMonthlyBudget] = useState(0);

    // Sync local state when category changes
    useEffect(() => {
        if (category) {
            setName(category.name);
            setMonthlyBudget(category.monthlyBudget);
        } else {
            setName('');
            setMonthlyBudget(0);
        }
    }, [category, open]);

    const handleSave = () => {
        onSave({
            name: name.trim(),
            monthlyBudget,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ fontWeight: 600 }}>{category ? 'Edit Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    <TextField
                        label="Nama Kategori"
                        fullWidth
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Makanan, Transport, Belanja"
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                    <TextField
                        label="Budget Bulanan"
                        fullWidth
                        value={monthlyBudget ? monthlyBudget.toLocaleString('id-ID') : ''}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\./g, '').replace(/\D/g, '');
                            setMonthlyBudget(Number(value) || 0);
                        }}
                        InputProps={{ startAdornment: <InputAdornment position="start">Rp</InputAdornment> }}
                        placeholder="0 = Tanpa batas"
                        helperText="Kosongkan atau isi 0 jika tidak ingin membatasi"
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} sx={{ borderRadius: 3, px: 3 }}>Batal</Button>
                <Button onClick={handleSave} variant="contained" disabled={!name.trim()} sx={{ borderRadius: 3, px: 3 }}>Simpan</Button>
            </DialogActions>
        </Dialog>
    );
}

export default function CategoryPage() {
    const { user, isNominalHidden } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Bulan saat ini untuk perhitungan spending
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonthLabel = `${monthNames[currentMonth]} ${currentYear}`;

    // Load categories dari database
    useEffect(() => {
        if (!user) return;

        // Listen to categories
        const unsubCategories = listenToData(`users/${user.uid}/categories`, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Handle both old format (array) and new format (object)
                if (Array.isArray(data)) {
                    // Migrate from old format
                    const migratedCategories: Record<string, Omit<Category, 'id'>> = {};
                    data.forEach((name, idx) => {
                        const id = `cat_${Date.now()}_${idx}`;
                        migratedCategories[id] = { name, monthlyBudget: 0 };
                    });
                    writeData(`users/${user.uid}/categories`, migratedCategories);
                } else {
                    const categoryList: Category[] = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    setCategories(categoryList);
                }
            } else {
                // Create default categories
                const defaultCategories: Record<string, Omit<Category, 'id'>> = {
                    cat_001: { name: 'Makanan', monthlyBudget: 0 },
                    cat_002: { name: 'Transport', monthlyBudget: 0 },
                    cat_003: { name: 'Belanja', monthlyBudget: 0 },
                    cat_004: { name: 'Tagihan', monthlyBudget: 0 },
                    cat_005: { name: 'Hiburan', monthlyBudget: 0 },
                    cat_006: { name: 'Gaji', monthlyBudget: 0 },
                    cat_007: { name: 'Bonus', monthlyBudget: 0 },
                };
                writeData(`users/${user.uid}/categories`, defaultCategories);
            }
            setIsLoading(false);
        });

        // Listen to transactions for spending calculation
        const unsubTransactions = listenToData(`users/${user.uid}/transactions`, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setTransactions(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            } else {
                setTransactions([]);
            }
        });

        return () => {
            unsubCategories();
            unsubTransactions();
        };
    }, [user]);

    // Hitung spending per kategori bulan ini
    const categorySpending = useMemo(() => {
        const spending: Record<string, number> = {};
        transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                const d = new Date(t.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .forEach(t => {
                spending[t.category] = (spending[t.category] || 0) + t.amount;
            });
        return spending;
    }, [transactions, currentMonth, currentYear]);

    // Total budget dan total spending
    const totalBudget = useMemo(() => categories.reduce((sum, cat) => sum + cat.monthlyBudget, 0), [categories]);
    const totalSpending = useMemo(() => Object.values(categorySpending).reduce((sum, val) => sum + val, 0), [categorySpending]);

    const handleOpenAdd = () => {
        setEditingCategory(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (category: Category) => {
        setEditingCategory(category);
        setDialogOpen(true);
    };

    const handleSave = async (categoryData: Omit<Category, 'id'>) => {
        if (!user) return;
        if (editingCategory) {
            await writeData(`users/${user.uid}/categories/${editingCategory.id}`, categoryData);
        } else {
            const newId = `cat_${Date.now()}`;
            await writeData(`users/${user.uid}/categories/${newId}`, categoryData);
        }
        setDialogOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        if (confirm('Hapus kategori ini?')) {
            await deleteData(`users/${user.uid}/categories/${id}`);
        }
    };

    const getProgressColor = (spent: number, budget: number) => {
        if (budget === 0) return '#2563eb';
        const percentage = (spent / budget) * 100;
        if (percentage >= 100) return '#ef4444';
        if (percentage >= 80) return '#f59e0b';
        return '#10b981';
    };

    return (
        <Box sx={{ pb: 12 }}>
            {/* Header */}
            <Box sx={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)', color: 'white', p: 3, pb: 8, borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <Typography variant="h5" fontWeight={700}>Kategori</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>Kelola kategori & budget bulanan</Typography>
            </Box>

            <Box sx={{ px: 2, mt: -5, position: 'relative', zIndex: 10 }}>
                {/* Summary Card */}
                <Card elevation={0} sx={{ mb: 2, background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)', backdropFilter: 'blur(20px)' }}>
                    <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" alignItems="flex-start" spacing={2}>
                            <Box sx={{ width: 52, height: 52, borderRadius: 3, background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)' }}>
                                <Icon icon="mdi:shape-outline" width={26} color="#fff" />
                            </Box>
                            <Box flex={1}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Budget Bulan Ini</Typography>
                                    <Chip label={currentMonthLabel} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', height: 22 }} />
                                </Stack>
                                <Typography variant="h5" fontWeight={700} color="#8b5cf6">
                                    {isNominalHidden ? '••••••••' : `Rp ${totalBudget.toLocaleString('id-ID')}`}
                                </Typography>
                                <Stack direction="row" spacing={2} mt={1}>
                                    <Typography variant="caption" color="text.secondary">
                                        Terpakai: <Box component="span" fontWeight={600} color={totalSpending > totalBudget && totalBudget > 0 ? 'error.main' : 'text.primary'}>
                                            {isNominalHidden ? '••••' : `Rp ${totalSpending.toLocaleString('id-ID')}`}
                                        </Box>
                                    </Typography>
                                    {totalBudget > 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            Sisa: <Box component="span" fontWeight={600} color={(totalBudget - totalSpending) >= 0 ? 'success.main' : 'error.main'}>
                                                {isNominalHidden ? '••••' : `Rp ${(totalBudget - totalSpending).toLocaleString('id-ID')}`}
                                            </Box>
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Category List */}
                <Typography variant="subtitle2" color="text.secondary" fontWeight={600} letterSpacing={0.5} mb={1.5} mt={3}>DAFTAR KATEGORI</Typography>

                {isLoading ? (
                    <Stack spacing={1.5}>
                        {[1, 2, 3].map((i) => (
                            <Card key={i} elevation={0}>
                                <CardContent sx={{ p: 2 }}>
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 3 }} />
                                        <Box flex={1}>
                                            <Skeleton variant="text" width="60%" height={24} />
                                            <Skeleton variant="text" width="40%" height={16} />
                                        </Box>
                                        <Skeleton variant="text" width={100} height={32} />
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : categories.length === 0 ? (
                    <Card elevation={0}>
                        <CardContent sx={{ py: 4 }}>
                            <Stack alignItems="center" spacing={2}>
                                <Box sx={{ width: 72, height: 72, borderRadius: 2, bgcolor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon icon="mdi:shape-plus-outline" width={36} color="#8b5cf6" />
                                </Box>
                                <Typography color="text.secondary" fontWeight={500}>Belum ada kategori</Typography>
                                <Button variant="contained" startIcon={<Icon icon="mdi:plus" />} onClick={handleOpenAdd} sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}>Tambah Kategori</Button>
                            </Stack>
                        </CardContent>
                    </Card>
                ) : (
                    <Stack spacing={1.5}>
                        {categories.map((category) => {
                            const spent = categorySpending[category.name] || 0;
                            const budget = category.monthlyBudget;
                            const progressPercent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                            const progressColor = getProgressColor(spent, budget);

                            return (
                                <Card key={category.id} elevation={0} sx={{ transition: 'all 0.3s ease' }}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Stack direction="row" alignItems="flex-start" spacing={2}>
                                            <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon icon="mdi:tag" width={24} color="#8b5cf6" />
                                            </Box>
                                            <Box flex={1}>
                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                    <Typography variant="subtitle1" fontWeight={600}>{category.name}</Typography>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <IconButton size="small" onClick={() => handleOpenEdit(category)} sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' } }}>
                                                            <Icon icon="mdi:pencil" width={16} color="#8b5cf6" />
                                                        </IconButton>
                                                        <IconButton size="small" onClick={() => handleDelete(category.id)} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}>
                                                            <Icon icon="mdi:delete" width={16} color="#ef4444" />
                                                        </IconButton>
                                                    </Stack>
                                                </Stack>

                                                {/* Budget Info */}
                                                <Stack mt={0.5}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Budget: {budget === 0 ? 'Tanpa batas' : (isNominalHidden ? '••••' : `Rp ${budget.toLocaleString('id-ID')}`)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Terpakai: <Box component="span" fontWeight={600} color={spent > budget && budget > 0 ? 'error.main' : 'text.primary'}>
                                                            {isNominalHidden ? '••••' : `Rp ${spent.toLocaleString('id-ID')}`}
                                                        </Box>
                                                    </Typography>
                                                </Stack>

                                                {/* Progress Bar */}
                                                {budget > 0 && (
                                                    <Box sx={{ mt: 1 }}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={progressPercent}
                                                            sx={{
                                                                height: 6,
                                                                borderRadius: 3,
                                                                bgcolor: '#f1f5f9',
                                                                '& .MuiLinearProgress-bar': {
                                                                    bgcolor: progressColor,
                                                                    borderRadius: 3,
                                                                }
                                                            }}
                                                        />
                                                        <Typography variant="caption" color={progressColor} fontWeight={600} sx={{ mt: 0.5, display: 'block' }}>
                                                            {progressPercent.toFixed(0)}% terpakai
                                                            {spent > budget && ' (Melebihi budget!)'}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </Box>

            {/* FAB Add Button */}
            <Fab color="primary" onClick={handleOpenAdd} sx={{ position: 'fixed', right: 20, bottom: 100, bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)' }}>
                <Icon icon="mdi:plus" width={28} />
            </Fab>

            {/* Add/Edit Dialog */}
            <CategoryDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                category={editingCategory}
                onSave={handleSave}
            />
        </Box>
    );
}
