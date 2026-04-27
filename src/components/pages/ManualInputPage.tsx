'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Stack, MenuItem, Alert, Paper, Snackbar, InputAdornment } from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuth } from '@/lib/AuthProvider';
import { writeData, listenToData, updateData } from '@/lib/database';

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon: string;
  color: string;
}

export default function ManualInputPage() {
  const { user } = useAuth();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [category, setCategory] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs untuk input yang sering berubah (tidak trigger re-render)
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  // Load categories dan accounts dari database
  useEffect(() => {
    if (!user) return;
    const unsubCat = listenToData(`users/${user.uid}/categories`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories(Object.values(data).map((cat: any) => cat.name));
        }
      }
    });
    const unsubAcc = listenToData(`users/${user.uid}/accounts`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setAccounts(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      }
    });
    return () => { unsubCat(); unsubAcc(); };
  }, [user]);

  // Set default date saat component mount
  useEffect(() => {
    if (dateRef.current) {
      dateRef.current.value = new Date().toISOString().split('T')[0];
    }
  }, []);

  // Format number dengan thousand separator (tanpa re-render)
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPos = input.selectionStart || 0;
    const oldValue = input.value;
    const oldLength = oldValue.length;

    // Hapus semua non-digit
    const raw = oldValue.replace(/\D/g, '');
    // Format dengan thousand separator
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Update value langsung (tidak trigger re-render)
    input.value = formatted;

    // Adjust cursor position
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    const newCursorPos = Math.max(0, cursorPos + diff);

    // Set cursor position after React updates
    requestAnimationFrame(() => {
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, []);

  const getNumericAmount = () => {
    const raw = amountRef.current?.value?.replace(/\./g, '') || '0';
    return Number(raw) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(false);

    const numAmount = getNumericAmount();
    const description = descriptionRef.current?.value || '';
    const date = dateRef.current?.value || new Date().toISOString().split('T')[0];

    if (numAmount <= 0) { setError('Jumlah harus lebih dari 0'); return; }

    if (type === 'expense' && !sourceAccountId) { setError('Pilih akun sumber'); return; }
    if (type === 'income' && !destAccountId) { setError('Pilih akun tujuan'); return; }
    if (type === 'transfer') {
      if (!sourceAccountId || !destAccountId) { setError('Pilih akun sumber dan tujuan'); return; }
      if (sourceAccountId === destAccountId) { setError('Akun sumber dan tujuan harus berbeda'); return; }
    }
    if ((type === 'income' || type === 'expense') && !category) { setError('Pilih kategori'); return; }

    setLoading(true);
    try {
      const transactionId = Date.now().toString();
      const transaction = {
        type,
        category: type === 'transfer' ? 'Transfer' : category,
        amount: numAmount,
        description,
        date,
        sourceAccountId: type === 'income' ? null : sourceAccountId,
        destAccountId: type === 'expense' ? null : destAccountId,
        createdAt: new Date().toISOString(),
      };

      // Simpan transaksi
      await writeData(`users/${user.uid}/transactions/${transactionId}`, transaction);

      // Update saldo akun
      if (type === 'expense' || type === 'transfer') {
        const srcAcc = accounts.find(a => a.id === sourceAccountId);
        if (srcAcc) await updateData(`users/${user.uid}/accounts/${sourceAccountId}`, { balance: srcAcc.balance - numAmount });
      }
      if (type === 'income' || type === 'transfer') {
        const destAcc = accounts.find(a => a.id === destAccountId);
        if (destAcc) await updateData(`users/${user.uid}/accounts/${destAccountId}`, { balance: destAcc.balance + numAmount });
      }

      setSuccess(true);
      setCategory('');
      setSourceAccountId('');
      setDestAccountId('');
      // Reset refs
      if (amountRef.current) amountRef.current.value = '';
      if (descriptionRef.current) descriptionRef.current.value = '';
      if (dateRef.current) dateRef.current.value = new Date().toISOString().split('T')[0];
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (t: typeof type) => {
    setType(t);
    setCategory('');
    setSourceAccountId('');
    setDestAccountId('');
  };

  const TypeCard = ({ t, icon, label, color, bgColor }: { t: typeof type; icon: string; label: string; color: string; bgColor: string }) => (
    <Paper
      elevation={0}
      onClick={() => { setType(t); setCategory(''); setSourceAccountId(''); setDestAccountId(''); }}
      sx={{
        flex: 1, p: 1.5, cursor: 'pointer', borderRadius: 3, border: '2px solid',
        borderColor: type === t ? `${color}` : 'transparent',
        bgcolor: type === t ? bgColor : '#f8fafc',
        transition: 'all 0.3s ease',
        '&:hover': { bgcolor: bgColor },
      }}
    >
      <Stack alignItems="center" spacing={0.5}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: type === t ? color : `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
          <Icon icon={icon} width={20} color={type === t ? '#fff' : color} />
        </Box>
        <Typography variant="caption" fontWeight={600} color={type === t ? color : 'text.secondary'}>{label}</Typography>
      </Stack>
    </Paper>
  );

  return (
    <Box sx={{ pb: 12 }}>
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)', color: 'white', p: 3, borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon="mdi:pencil" width={24} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Input Manual</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Tambah transaksi secara manual</Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Card elevation={0}>
          <CardContent sx={{ p: 2.5 }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {/* Type Selection */}
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>Tipe Transaksi</Typography>
                  <Stack direction="row" spacing={1}>
                    <TypeCard t="expense" icon="mdi:arrow-up" label="Keluar" color="#ef4444" bgColor="rgba(239,68,68,0.08)" />
                    <TypeCard t="income" icon="mdi:arrow-down" label="Masuk" color="#10b981" bgColor="rgba(16,185,129,0.08)" />
                    <TypeCard t="transfer" icon="mdi:swap-horizontal" label="Transfer" color="#2563eb" bgColor="rgba(37,99,235,0.08)" />
                  </Stack>
                </Box>

                {/* Account Selection */}
                {(type === 'expense' || type === 'transfer') && (
                  <TextField label="Akun Sumber" select fullWidth required value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}>
                    {accounts.map((acc) => (
                      <MenuItem key={acc.id} value={acc.id}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Icon icon={acc.icon} width={20} color={acc.color} />
                          <span>{acc.name}</span>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>Rp {acc.balance.toLocaleString('id-ID')}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {(type === 'income' || type === 'transfer') && (
                  <TextField label="Akun Tujuan" select fullWidth required value={destAccountId} onChange={(e) => setDestAccountId(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}>
                    {accounts.filter(a => a.id !== sourceAccountId).map((acc) => (
                      <MenuItem key={acc.id} value={acc.id}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Icon icon={acc.icon} width={20} color={acc.color} />
                          <span>{acc.name}</span>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>Rp {acc.balance.toLocaleString('id-ID')}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {/* Category (not for transfer) */}
                {type !== 'transfer' && (
                  <TextField label="Kategori" select fullWidth required value={category} onChange={(e) => setCategory(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}>
                    {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                  </TextField>
                )}

                {/* Amount with thousand separator */}
                <TextField
                  label="Jumlah"
                  fullWidth
                  required
                  inputRef={amountRef}
                  onChange={handleAmountChange}
                  InputProps={{ startAdornment: <InputAdornment position="start">Rp</InputAdornment> }}
                  placeholder="0"
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                />

                {/* Description */}
                <TextField
                  label="Deskripsi"
                  multiline
                  rows={2}
                  fullWidth
                  inputRef={descriptionRef}
                  placeholder={type === 'transfer' ? 'Contoh: Transfer ke tabungan' : 'Contoh: Beli groceries'}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                />

                {/* Date */}
                <TextField
                  label="Tanggal"
                  type="date"
                  fullWidth
                  required
                  inputRef={dateRef}
                  defaultValue={new Date().toISOString().split('T')[0]}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}
                />

                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} startIcon={<Icon icon="mdi:content-save" />} sx={{ py: 1.5 }}>
                  {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>

      {/* Success Toast */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        message="✓ Transaksi berhasil disimpan!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 100, '& .MuiSnackbarContent-root': { borderRadius: 3, bgcolor: '#10b981', fontWeight: 600 } }}
      />
    </Box>
  );
}
