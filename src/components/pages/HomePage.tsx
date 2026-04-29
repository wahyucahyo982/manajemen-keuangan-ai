'use client';

import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Stack, Avatar, Menu, MenuItem, Divider, ListItemIcon, ListItemText, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Switch, CircularProgress, Tabs, Tab } from '@mui/material';
import { Icon } from '@iconify/react';
import { logout } from '@/lib/auth';
import { useAuth } from '@/lib/AuthProvider';
import { writeData, readData, listenToData } from '@/lib/database';
import InstallPrompt from '@/components/InstallPrompt';
import StatistikTab from './tabs/StatistikTab';
import BudgetingTab from './tabs/BudgetingTab';
import TabunganTab from './tabs/TabunganTab';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  category: string;
  destAccountId?: string;
  sourceAccountId?: string;
}

interface Category {
  id: string;
  name: string;
  monthlyBudget: number;
}

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
}

interface HomePageProps {
  onNavigate?: (page: number) => void;
}

// Memoized PIN Dialog Component to prevent re-renders
interface PinDialogProps {
  open: boolean;
  mode: 'add' | 'change';
  currentPin?: string;
  userId?: string;
  onClose: () => void;
  onSuccess: (newPin: string) => void;
}

const PinDialog = memo(function PinDialog({ open, mode, currentPin, userId, onClose, onSuccess }: PinDialogProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [pinError, setPinError] = useState('');

  const handleClose = useCallback(() => {
    setNewPin('');
    setConfirmPin('');
    setOldPin('');
    setPinError('');
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (newPin.length !== 6) {
      setPinError('PIN harus 6 digit');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Konfirmasi PIN tidak sama');
      return;
    }
    if (mode === 'change' && currentPin && oldPin !== currentPin) {
      setPinError('PIN lama salah');
      return;
    }
    try {
      await writeData(`users/${userId}/profile/pin`, newPin);
      onSuccess(newPin);
      handleClose();
    } catch (error) {
      console.error('Error saving PIN:', error);
      setPinError('Gagal menyimpan PIN');
    }
  }, [newPin, confirmPin, oldPin, mode, currentPin, userId, onSuccess, handleClose]);

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { borderRadius: 3, minWidth: 320 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {mode === 'add' ? 'Tambah PIN' : 'Ubah PIN'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {mode === 'change' && (
            <TextField
              label="PIN Lama"
              type="password"
              value={oldPin}
              onChange={(e) => { setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError(''); }}
              fullWidth
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
              placeholder="Masukkan 6 digit PIN lama"
            />
          )}
          <TextField
            label="PIN Baru"
            type="password"
            value={newPin}
            onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError(''); }}
            fullWidth
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            placeholder="Masukkan 6 digit PIN"
          />
          <TextField
            label="Konfirmasi PIN"
            type="password"
            value={confirmPin}
            onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError(''); }}
            fullWidth
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            placeholder="Ulangi 6 digit PIN"
          />
          {pinError && (
            <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Icon icon="mdi:alert-circle" width={14} /> {pinError}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={handleClose} sx={{ borderRadius: 2 }}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)' }}
        >
          Simpan
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default function HomePage({ onNavigate }: HomePageProps) {
  const { user, isNominalHidden, toggleNominalVisibility } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesWithBudget, setCategoriesWithBudget] = useState<Category[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState(1); // Default to Statistik tab (index 1)

  // PIN dialog states
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'add' | 'change'>('add');

  const handlePinDialogClose = useCallback(() => {
    setPinDialogOpen(false);
  }, []);

  const handlePinSuccess = useCallback((newPin: string) => {
    setProfile((prev: any) => ({ ...prev, pin: newPin }));
  }, []);

  // PIN toggle loading state
  const [pinToggleLoading, setPinToggleLoading] = useState(false);

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const currentMonthLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

  // Load data dari database
  useEffect(() => {
    if (!user) return;
    const unsub1 = listenToData(`users/${user.uid}/categories`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        // Handle both old format (array) and new format (object)
        if (Array.isArray(data)) {
          setCategories(data);
          setCategoriesWithBudget([]);
        } else {
          // Extract category names from object format
          const categoryNames = Object.values(data).map((cat: any) => cat.name);
          setCategories(categoryNames);
          // Store full category data with budget
          const categoryList: Category[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          setCategoriesWithBudget(categoryList);
        }
      } else {
        setCategories([]);
        setCategoriesWithBudget([]);
      }
    });
    const unsub2 = listenToData(`users/${user.uid}/transactions`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setTransactions(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      } else setTransactions([]);
      setIsLoading(false);
    });
    const unsub3 = listenToData(`users/${user.uid}/accounts`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setAccounts(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      } else setAccounts([]);
    });
    const unsub4 = listenToData(`users/${user.uid}/savingsGoals`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setSavingsGoals(Object.values(data));
      } else setSavingsGoals([]);
    });
    readData(`users/${user.uid}/profile`).then(d => d && setProfile(d));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [user]);

  // Filter transaksi berdasarkan bulan yang dipilih
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Hitung total pemasukan bulan ini
  const totalIncome = useMemo(() => {
    return monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  }, [monthlyTransactions]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const handleNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };

  const handleLogout = async () => { try { await logout(); } catch (e) { console.error(e); } };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const userName = profile?.name || user?.displayName || 'User';
  const userEmail = user?.email || '';

  return (
    <Box sx={{ pb: 12 }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)', color: 'white', p: 3, borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="h5" fontWeight={700}>Beranda</Typography>
              <IconButton size="small" onClick={toggleNominalVisibility} sx={{ color: 'white', p: 0.5, opacity: 0.9, '&:hover': { opacity: 1 } }}>
                <Icon icon={isNominalHidden ? 'mdi:eye-off' : 'mdi:eye'} width={20} />
              </IconButton>
            </Stack>
            {/* Month Selector */}
            <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
              <IconButton size="small" onClick={handlePrevMonth} sx={{ color: 'white', p: 0.5 }}><Icon icon="mdi:chevron-left" width={20} /></IconButton>
              <Typography variant="body2" sx={{ opacity: 0.9, minWidth: 120, textAlign: 'center' }}>{currentMonthLabel}</Typography>
              <IconButton size="small" onClick={handleNextMonth} sx={{ color: 'white', p: 0.5 }}><Icon icon="mdi:chevron-right" width={20} /></IconButton>
            </Stack>
          </Box>
          <Avatar onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', cursor: 'pointer', backdropFilter: 'blur(10px)', fontSize: '1rem', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
            {userName.charAt(0).toUpperCase()}
          </Avatar>
        </Stack>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ px: 2, mt: 2 }}>
        <Card elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                fontWeight: 600,
                fontSize: '0.85rem',
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#2563eb',
                },
              },
              '& .MuiTab-iconWrapper': {
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
              },
            }}
          >
            <Tab
              icon={<Icon icon="mdi:wallet-bifold-outline" width={22} />}
              iconPosition="start"
              label="Budgeting"
              sx={{ gap: 0.5 }}
            />
            <Tab
              icon={<Icon icon="mdi:chart-line" width={22} />}
              iconPosition="start"
              label="Statistik"
              sx={{ gap: 0.5 }}
            />
            <Tab
              icon={<Icon icon="mdi:piggy-bank-outline" width={22} />}
              iconPosition="start"
              label="Tabungan"
              sx={{ gap: 0.5 }}
            />
          </Tabs>
        </Card>
      </Box>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Account Menu */}
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: 280, mt: 1, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' } }} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', borderRadius: 2.5, fontWeight: 700 }}>{userName.charAt(0).toUpperCase()}</Avatar>
            <Box><Typography fontWeight={600}>{userName}</Typography><Typography variant="caption" color="text.secondary">{userEmail}</Typography></Box>
          </Stack>
        </Box>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => { setAnchorEl(null); onNavigate?.(5); }} sx={{ mx: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' } }}>
          <ListItemIcon><Icon icon="mdi:shape-outline" width={20} color="#2563eb" /></ListItemIcon>
          <ListItemText primary="Kategori" primaryTypographyProps={{ fontWeight: 600 }} />
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); setPinMode(profile?.pin ? 'change' : 'add'); setPinDialogOpen(true); }} sx={{ mx: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' } }}>
          <ListItemIcon><Icon icon="mdi:lock-outline" width={20} color="#2563eb" /></ListItemIcon>
          <ListItemText primary={profile?.pin ? 'Ubah PIN' : 'Tambah PIN'} primaryTypographyProps={{ fontWeight: 600 }} />
        </MenuItem>
        <MenuItem
          sx={{ mx: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' } }}
          onClick={(e) => e.stopPropagation()}
        >
          <ListItemIcon><Icon icon="mdi:shield-lock-outline" width={20} color="#2563eb" /></ListItemIcon>
          <ListItemText primary="Aktifkan PIN" primaryTypographyProps={{ fontWeight: 600 }} />
          {pinToggleLoading ? (
            <CircularProgress size={20} sx={{ color: '#2563eb' }} />
          ) : (
            <Switch
              size="small"
              checked={profile?.usePIN || false}
              disabled={!profile?.pin}
              onChange={async (e) => {
                const newValue = e.target.checked;
                setPinToggleLoading(true);
                try {
                  await writeData(`users/${user?.uid}/profile/usePIN`, newValue);
                  setProfile((prev: any) => ({ ...prev, usePIN: newValue }));
                } catch (error) {
                  console.error('Error saving PIN setting:', error);
                } finally {
                  setPinToggleLoading(false);
                }
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#2563eb',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#2563eb',
                },
              }}
            />
          )}
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleLogout} sx={{ mx: 1, borderRadius: 2, color: 'error.main', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' } }}>
          <ListItemIcon><Icon icon="mdi:logout" width={20} color="#ef4444" /></ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, color: 'error.main' }} />
        </MenuItem>
        <Box sx={{ height: 8 }} />
      </Menu>

      {/* PIN Dialog */}
      <PinDialog
        open={pinDialogOpen}
        mode={pinMode}
        currentPin={profile?.pin}
        userId={user?.uid}
        onClose={handlePinDialogClose}
        onSuccess={handlePinSuccess}
      />

      {/* Tab Content */}
      {activeTab === 0 && (
        <BudgetingTab
          isLoading={isLoading}
          isNominalHidden={isNominalHidden}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          monthlyTransactions={monthlyTransactions}
          categoriesWithBudget={categoriesWithBudget}
          totalIncome={totalIncome}
        />
      )}
      {activeTab === 1 && (
        <StatistikTab
          isLoading={isLoading}
          isNominalHidden={isNominalHidden}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          monthlyTransactions={monthlyTransactions}
          transactions={transactions}
          categoriesWithBudget={categoriesWithBudget}
        />
      )}
      {activeTab === 2 && (
        <TabunganTab
          isLoading={isLoading}
          isNominalHidden={isNominalHidden}
          accounts={accounts}
          transactions={transactions}
          savingsGoals={savingsGoals}
          userId={user?.uid}
          onSavingsGoalUpdate={(goal) => {
            setSavingsGoals(prev => {
              const existing = prev.findIndex(g => g.accountId === goal.accountId);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = goal;
                return updated;
              }
              return [...prev, goal];
            });
          }}
        />
      )}
    </Box>
  );
}
