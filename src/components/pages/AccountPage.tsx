'use client';

import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Stack, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Fab, Chip, Skeleton } from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuth } from '@/lib/AuthProvider';
import { writeData, deleteData, listenToData } from '@/lib/database';
import InputAdornment from '@mui/material/InputAdornment';

interface FinancialAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'savings' | 'investment' | 'debt' | 'other';
  balance: number;
  icon: string;
  color: string;
}

const accountTypes = [
  { value: 'cash', label: 'Kas/Tunai', icon: 'mdi:cash', color: '#10b981' },
  { value: 'bank', label: 'Bank', icon: 'mdi:bank', color: '#2563eb' },
  { value: 'ewallet', label: 'E-Wallet', icon: 'mdi:wallet', color: '#ec4899' },
  { value: 'savings', label: 'Tabungan', icon: 'mdi:piggy-bank', color: '#14b8a6' },
  { value: 'investment', label: 'Investasi', icon: 'mdi:chart-line', color: '#8b5cf6' },
  { value: 'debt', label: 'Hutang', icon: 'mdi:credit-card-clock', color: '#ef4444' },
  { value: 'other', label: 'Lainnya', icon: 'mdi:dots-horizontal-circle', color: '#f59e0b' },
];

// Komponen AccountDialog dengan local state untuk performa
function AccountDialog({ open, onClose, account, onSave }: {
  open: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  onSave: (data: Omit<FinancialAccount, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FinancialAccount['type']>('cash');
  const [balance, setBalance] = useState(0);

  // Sync local state when account changes
  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(account.balance);
    } else {
      setName('');
      setType('cash');
      setBalance(0);
    }
  }, [account, open]);

  const handleSave = () => {
    const typeInfo = accountTypes.find(t => t.value === type)!;
    onSave({
      name,
      type,
      balance,
      icon: typeInfo.icon,
      color: typeInfo.color,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 600 }}>{account ? 'Edit Akun' : 'Tambah Akun Baru'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Nama Akun"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: BCA, Kas Kecil, GoPay"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
          />
          <TextField
            label="Tipe Akun"
            select
            fullWidth
            required
            value={type}
            onChange={(e) => setType(e.target.value as FinancialAccount['type'])}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
          >
            {accountTypes.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Icon icon={t.icon} width={20} color={t.color} />
                  <span>{t.label}</span>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Saldo Awal"
            fullWidth
            required
            value={balance ? balance.toLocaleString('id-ID') : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\./g, '').replace(/\D/g, '');
              setBalance(Number(value) || 0);
            }}
            InputProps={{ startAdornment: <InputAdornment position="start">Rp</InputAdornment> }}
            placeholder="0"
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 3, px: 3 }}>Batal</Button>
        <Button onClick={handleSave} variant="contained" disabled={!name} sx={{ borderRadius: 3, px: 3 }}>Simpan</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AccountPage() {
  const { user, isNominalHidden } = useAuth();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Load accounts dari database
  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToData(`users/${user.uid}/accounts`, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const accountList: FinancialAccount[] = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setAccounts(accountList);
      } else {
        setAccounts([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (account: FinancialAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleSave = async (accountData: Omit<FinancialAccount, 'id'>) => {
    if (!user) return;
    if (editingAccount) {
      await writeData(`users/${user.uid}/accounts/${editingAccount.id}`, accountData);
    } else {
      const newId = Date.now().toString();
      await writeData(`users/${user.uid}/accounts/${newId}`, accountData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm('Hapus akun ini?')) {
      await deleteData(`users/${user.uid}/accounts/${id}`);
    }
  };

  return (
    <Box sx={{ pb: 12 }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)', color: 'white', p: 3, pb: 8, borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <Typography variant="h5" fontWeight={700}>Akun Keuangan</Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>Kelola saldo akun Anda</Typography>
      </Box>

      <Box sx={{ px: 2, mt: -5, position: 'relative', zIndex: 10 }}>
        {/* Total Balance Card */}
        <Card elevation={0} sx={{ mb: 2, background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)', backdropFilter: 'blur(20px)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Box sx={{ width: 52, height: 52, borderRadius: 3, background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}>
                <Icon icon="mdi:wallet-outline" width={26} color="#fff" />
              </Box>
              <Box flex={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>Total Saldo</Typography>
                  <Chip label={`${accounts.length} Akun`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(37, 99, 235, 0.1)', color: 'primary.main', height: 22 }} />
                </Stack>
                <Typography variant="h5" fontWeight={700} color="primary.main">{isNominalHidden ? '••••••••' : `Rp ${totalBalance.toLocaleString('id-ID')}`}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Account List */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} letterSpacing={0.5} mb={1.5} mt={3}>DAFTAR AKUN</Typography>

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
        ) : accounts.length === 0 ? (
          <Card elevation={0}>
            <CardContent sx={{ py: 4 }}>
              <Stack alignItems="center" spacing={2}>
                <Box sx={{ width: 72, height: 72, borderRadius: 2, bgcolor: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="mdi:wallet-plus-outline" width={36} color="#2563eb" />
                </Box>
                <Typography color="text.secondary" fontWeight={500}>Belum ada akun</Typography>
                <Button variant="contained" startIcon={<Icon icon="mdi:plus" />} onClick={handleOpenAdd}>Tambah Akun</Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {accounts.map((account) => (
              <Card key={account.id} elevation={0} sx={{ transition: 'all 0.3s ease', '&:hover': { transform: 'translateX(4px)' } }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="flex-start" spacing={2}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: `${account.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon icon={account.icon} width={24} color={account.color} />
                    </Box>
                    <Box flex={1}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ flexShrink: 1, minWidth: 0 }}>{account.name}</Typography>
                        <Typography variant="subtitle2" fontWeight={700} color={account.balance >= 0 ? 'success.main' : 'error.main'} noWrap sx={{ flexShrink: 0 }}>
                          {isNominalHidden ? '••••••••' : `Rp ${account.balance.toLocaleString('id-ID')}`}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
                        <Typography variant="caption" color="text.secondary">{accountTypes.find(t => t.value === account.type)?.label}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleOpenEdit(account)} sx={{ bgcolor: 'rgba(37, 99, 235, 0.1)', '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.2)' } }}>
                            <Icon icon="mdi:pencil" width={16} color="#2563eb" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(account.id)} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}>
                            <Icon icon="mdi:delete" width={16} color="#ef4444" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* FAB Add Button */}
      <Fab color="primary" onClick={handleOpenAdd} sx={{ position: 'fixed', right: 20, bottom: 100, boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)' }}>
        <Icon icon="mdi:plus" width={28} />
      </Fab>

      {/* Add/Edit Dialog */}
      <AccountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        account={editingAccount}
        onSave={handleSave}
      />
    </Box>
  );
}
