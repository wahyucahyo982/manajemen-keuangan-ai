'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, InputAdornment, Skeleton } from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuth } from '@/lib/AuthProvider';
import { listenToData, writeData, deleteData, updateData } from '@/lib/database';

// Komponen EditTransactionDialog dengan local state untuk performa
function EditTransactionDialog({ open, onClose, transaction, categories, onSave }: {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: string[];
  onSave: (data: Omit<Transaction, 'id'>) => void;
}) {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');

  // Sync local state when transaction changes
  useEffect(() => {
    if (transaction) {
      setCategory(transaction.category);
      setAmount(transaction.amount);
      setDescription(transaction.description);
      setDate(transaction.date);
    }
  }, [transaction]);

  const handleSave = () => {
    if (!transaction) return;
    onSave({
      type: transaction.type,
      category,
      amount,
      description,
      date,
      sourceAccountId: transaction.sourceAccountId ?? null,
      destAccountId: transaction.destAccountId ?? null,
      createdAt: transaction.createdAt,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle fontWeight={600}>Edit Transaksi</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField label="Kategori" select fullWidth value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField
            label="Jumlah"
            fullWidth
            value={amount ? amount.toLocaleString('id-ID') : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\./g, '').replace(/\D/g, '');
              setAmount(Number(value) || 0);
            }}
            InputProps={{ startAdornment: <InputAdornment position="start">Rp</InputAdornment> }}
          />
          <TextField label="Deskripsi" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
          <TextField label="Tanggal" type="date" fullWidth InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Batal</Button>
        <Button variant="contained" onClick={handleSave}>Simpan</Button>
      </DialogActions>
    </Dialog>
  );
}

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: string;
  sourceAccountId?: string | null;
  destAccountId?: string | null;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
}

const periodOptions = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: '7 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'all', label: 'Semua' },
  { value: 'custom', label: 'Custom' },
];

export default function HistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [period, setPeriod] = useState('today');
  const [search, setSearch] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data dari database
  useEffect(() => {
    if (!user) return;
    const unsub1 = listenToData(`users/${user.uid}/transactions`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Transaction[] = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        // Sort descending: terbaru di atas (by date, then createdAt)
        list.sort((a, b) => {
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setTransactions(list);
      } else setTransactions([]);
      setIsLoading(false);
    });
    const unsub2 = listenToData(`users/${user.uid}/accounts`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setAccounts(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      }
    });
    const unsub3 = listenToData(`users/${user.uid}/categories`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories(Object.values(data).map((cat: any) => cat.name));
        }
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user]);

  // Filter transaksi
  const filteredTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    return transactions.filter(t => {
      // Period filter
      if (period === 'today' && t.date !== today) return false;
      if (period === 'week' && t.date < weekAgo) return false;
      if (period === 'month' && t.date < monthStart) return false;
      if (period === 'custom') {
        if (customStartDate && t.date < customStartDate) return false;
        if (customEndDate && t.date > customEndDate) return false;
      }
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        return t.description?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, period, search, customStartDate, customEndDate]);

  const getAccountName = (id: string | null | undefined) => accounts.find(a => a.id === id)?.name || '-';

  const handleEdit = (t: Transaction) => {
    setSelectedTransaction({ ...t });
    setEditDialog(true);
  };

  const handleSaveEdit = async (data: Omit<Transaction, 'id'>) => {
    if (!selectedTransaction || !user) return;
    await writeData(`users/${user.uid}/transactions/${selectedTransaction.id}`, data);
    setEditDialog(false);
    setSelectedTransaction(null);
  };

  const handleDelete = async (t: Transaction) => {
    if (!user || !confirm('Hapus transaksi ini?')) return;
    // Reverse balance changes
    if (t.type === 'expense' || t.type === 'transfer') {
      const acc = accounts.find(a => a.id === t.sourceAccountId);
      if (acc) await updateData(`users/${user.uid}/accounts/${t.sourceAccountId}`, { balance: acc.balance + t.amount });
    }
    if (t.type === 'income' || t.type === 'transfer') {
      const acc = accounts.find(a => a.id === t.destAccountId);
      if (acc) await updateData(`users/${user.uid}/accounts/${t.destAccountId}`, { balance: acc.balance - t.amount });
    }
    await deleteData(`users/${user.uid}/transactions/${t.id}`);
  };

  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = { 'Makanan': 'mdi:food', 'Transport': 'mdi:car', 'Gaji': 'mdi:cash', 'Belanja': 'mdi:shopping', 'Tagihan': 'mdi:receipt', 'Hiburan': 'mdi:movie', 'Transfer': 'mdi:swap-horizontal' };
    return icons[cat] || 'mdi:tag';
  };

  const getTypeColor = (type: string) => type === 'income' ? '#10b981' : type === 'expense' ? '#ef4444' : '#2563eb';

  return (
    <Box sx={{ pb: 12 }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)', color: 'white', p: 3, borderRadius: '0 0 32px 32px' }}>
        <Typography variant="h5" fontWeight={700}>Riwayat Transaksi</Typography>
        <Chip label={`${filteredTransactions.length} transaksi`} size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 500 }} />
      </Box>

      {/* Filters */}
      <Box sx={{ px: 2, mt: 2 }}>
        <Stack direction="row" spacing={1} mb={2} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
          {periodOptions.map(opt => (
            <Chip key={opt.value} label={opt.label} size="small" onClick={() => setPeriod(opt.value)}
              sx={{ fontWeight: 500, bgcolor: period === opt.value ? 'primary.main' : '#f1f5f9', color: period === opt.value ? 'white' : 'text.secondary', '&:hover': { bgcolor: period === opt.value ? 'primary.dark' : '#e2e8f0' } }} />
          ))}
        </Stack>

        {/* Custom Date Range Picker */}
        {period === 'custom' && (
          <Stack direction="row" spacing={2} mb={2}>
            <TextField
              size="small"
              type="date"
              label="Tanggal Awal"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
            />
            <TextField
              size="small"
              type="date"
              label="Tanggal Akhir"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
            />
          </Stack>
        )}

        <TextField size="small" fullWidth placeholder="Cari transaksi..." value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Icon icon="mdi:magnify" width={20} color="#94a3b8" /></InputAdornment> }}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f8fafc' } }} />
      </Box>

      {/* Transaction List */}
      <Box sx={{ px: 2 }}>
        {isLoading ? (
          <Stack spacing={1.5}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} elevation={0} sx={{ borderLeft: '4px solid #e2e8f0' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 2.5 }} />
                    <Box flex={1}>
                      <Skeleton variant="text" width="70%" height={20} />
                      <Stack direction="row" spacing={1} mt={0.5}>
                        <Skeleton variant="rounded" width={60} height={20} />
                        <Skeleton variant="text" width={50} height={16} />
                      </Stack>
                    </Box>
                    <Box textAlign="right">
                      <Skeleton variant="text" width={80} height={24} />
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" mt={1}>
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : filteredTransactions.length === 0 ? (
          <Card elevation={0}>
            <CardContent sx={{ py: 4 }}>
              <Stack alignItems="center" spacing={2}>
                <Box sx={{ width: 72, height: 72, borderRadius: 2, bgcolor: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="mdi:inbox-outline" width={36} color="#2563eb" />
                </Box>
                <Typography color="text.secondary" fontWeight={500}>Tidak ada transaksi</Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {filteredTransactions.map(t => (
              <Card key={t.id} elevation={0} sx={{ borderLeft: `4px solid ${getTypeColor(t.type)}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: `${getTypeColor(t.type)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon icon={getCategoryIcon(t.category)} width={22} color={getTypeColor(t.type)} />
                    </Box>
                    <Box flex={1} minWidth={0}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>{t.description || t.category}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                        <Chip label={t.category} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        <Typography variant="caption" color="text.secondary">{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</Typography>
                      </Stack>
                      {t.type === 'transfer' && (
                        <Typography variant="caption" color="text.secondary">{getAccountName(t.sourceAccountId)} → {getAccountName(t.destAccountId)}</Typography>
                      )}
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="subtitle1" fontWeight={700} color={getTypeColor(t.type)}>
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}Rp {t.amount.toLocaleString('id-ID')}
                      </Typography>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" mt={1}>
                        <IconButton size="small" onClick={() => handleEdit(t)} sx={{ bgcolor: 'rgba(37,99,235,0.1)' }} title="Edit"><Icon icon="mdi:pencil" width={14} color="#2563eb" /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(t)} sx={{ bgcolor: 'rgba(239,68,68,0.1)' }} title="Hapus"><Icon icon="mdi:delete" width={14} color="#ef4444" /></IconButton>
                        <IconButton size="small" onClick={() => { setSelectedTransaction(t); setDetailDialog(true); }} sx={{ bgcolor: 'rgba(16,185,129,0.1)' }} title="Detail"><Icon icon="mdi:eye" width={14} color="#10b981" /></IconButton>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Edit Dialog */}
      <EditTransactionDialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        transaction={selectedTransaction}
        categories={categories}
        onSave={handleSaveEdit}
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle fontWeight={600}>Detail Transaksi</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Stack spacing={2} mt={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                <Typography color="text.secondary">Tipe</Typography>
                <Chip label={selectedTransaction.type === 'income' ? 'Pemasukan' : selectedTransaction.type === 'expense' ? 'Pengeluaran' : 'Transfer'}
                  size="small" sx={{ bgcolor: `${getTypeColor(selectedTransaction.type)}15`, color: getTypeColor(selectedTransaction.type), fontWeight: 600 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                <Typography color="text.secondary">Kategori</Typography>
                <Typography fontWeight={500}>{selectedTransaction.category}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                <Typography color="text.secondary">Nominal</Typography>
                <Typography fontWeight={700} color={getTypeColor(selectedTransaction.type)}>
                  {selectedTransaction.type === 'income' ? '+' : selectedTransaction.type === 'expense' ? '-' : ''}Rp {selectedTransaction.amount.toLocaleString('id-ID')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                <Typography color="text.secondary">Tanggal</Typography>
                <Typography fontWeight={500}>{new Date(selectedTransaction.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Typography>
              </Box>
              {selectedTransaction.description && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                  <Typography color="text.secondary">Deskripsi</Typography>
                  <Typography fontWeight={500} sx={{ textAlign: 'right', maxWidth: '60%' }}>{selectedTransaction.description}</Typography>
                </Box>
              )}
              {selectedTransaction.type === 'transfer' && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                    <Typography color="text.secondary">Dari Akun</Typography>
                    <Typography fontWeight={500}>{getAccountName(selectedTransaction.sourceAccountId)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                    <Typography color="text.secondary">Ke Akun</Typography>
                    <Typography fontWeight={500}>{getAccountName(selectedTransaction.destAccountId)}</Typography>
                  </Box>
                </>
              )}
              {selectedTransaction.type !== 'transfer' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e2e8f0' }}>
                  <Typography color="text.secondary">Akun</Typography>
                  <Typography fontWeight={500}>{getAccountName(selectedTransaction.type === 'income' ? selectedTransaction.destAccountId : selectedTransaction.sourceAccountId)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography color="text.secondary">Dibuat</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(selectedTransaction.createdAt).toLocaleString('id-ID')}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailDialog(false)}>Tutup</Button>
          <Button variant="contained" onClick={() => { setDetailDialog(false); handleEdit(selectedTransaction!); }}>Edit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
