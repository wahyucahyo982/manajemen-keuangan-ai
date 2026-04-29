'use client';

import { useState, useRef, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Stack, Alert, CircularProgress, Paper, IconButton, Chip, MenuItem, Snackbar } from '@mui/material';
import { Icon } from '@iconify/react';
import { parseTransaction, parseTransactionWithImage } from '@/lib/gemini';
import { useAuth } from '@/lib/AuthProvider';
import { listenToData, writeData, updateData } from '@/lib/database';

interface Account {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
}

export default function AIInputPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice note states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleVoiceStart = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Browser tidak mendukung fitur voice note. Gunakan Chrome atau Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== 'no-speech') setError('Gagal merekam suara: ' + e.error);
    };
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setPrompt(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleVoiceStop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Editable result fields
  const [editedResult, setEditedResult] = useState<any>(null);

  // Load categories & accounts
  useEffect(() => {
    if (!user) return;
    const unsub1 = listenToData(`users/${user.uid}/categories`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories(Object.values(data).map((cat: any) => cat.name));
        }
      }
    });
    const unsub2 = listenToData(`users/${user.uid}/accounts`, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setAccounts(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      }
    });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('File harus berupa gambar'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!prompt.trim() && !selectedImage) { setError('Masukkan teks atau gambar'); return; }
    setProcessing(true);
    setError(null);
    setResult(null);
    setEditedResult(null);

    try {
      const accountsForAI = accounts.map(a => ({ id: a.id, name: a.name }));
      let parsedArray: any[];
      if (selectedImage) {
        const parsed = await parseTransactionWithImage(prompt, selectedImage, categories, accountsForAI);
        parsedArray = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        parsedArray = await parseTransaction(prompt, categories, accountsForAI);
      }

      // Separate valid and invalid transactions
      const validTransactions: any[] = [];
      const invalidTransactions: any[] = [];
      const invalidReasons: string[] = [];

      parsedArray.forEach((tx, idx) => {
        const error = getValidationError(tx);
        if (!error) {
          validTransactions.push(tx);
        } else {
          invalidTransactions.push(tx);
          invalidReasons.push(`Transaksi ${idx + 1}: ${error}`);
        }
      });

      // Save all valid transactions dengan tracking saldo lokal
      let savedCount = 0;
      const localBalances = new Map<string, number>();
      for (const tx of validTransactions) {
        await saveTransaction(tx, localBalances);
        savedCount++;
      }

      // Handle results
      if (savedCount > 0 && invalidTransactions.length === 0) {
        // All valid - show success
        setSuccess(true);
        setPrompt('');
        setSelectedImage(null);
        if (savedCount > 1) {
          setError(null); // Clear any error
        }
      } else if (invalidTransactions.length > 0) {
        // Some invalid - show review for first invalid one
        const msg = savedCount > 0
          ? `${savedCount} transaksi berhasil disimpan. Data kurang: ${invalidReasons.join('; ')}`
          : `Data kurang lengkap: ${invalidReasons.join('; ')}`;
        setError(msg);
        setResult(invalidTransactions);
        setEditedResult({ ...invalidTransactions[0] });
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memproses data');
    } finally {
      setProcessing(false);
    }
  };

  // Get validation error message (null if valid)
  const getValidationError = (data: any): string | null => {
    const missing: string[] = [];
    if (!data.type) missing.push('tipe transaksi');
    if (!data.amount || data.amount <= 0) missing.push('nominal (harus > 0)');
    if (!data.date) missing.push('tanggal');
    if (data.type === 'expense' && !data.sourceAccountId) missing.push('akun sumber');
    if (data.type === 'income' && !data.destAccountId) missing.push('akun tujuan');
    if (data.type === 'transfer' && !data.sourceAccountId) missing.push('akun sumber');
    if (data.type === 'transfer' && !data.destAccountId) missing.push('akun tujuan');
    if (data.type !== 'transfer' && !data.category) missing.push('kategori');
    return missing.length > 0 ? missing.join(', ') : null;
  };

  // Legacy function for compatibility
  const isDataValid = (data: any) => getValidationError(data) === null;

  // Save transaction to database
  // localBalances: track saldo lokal untuk multi-transaksi agar saldo dihitung kumulatif
  const saveTransaction = async (data: any, localBalances?: Map<string, number>) => {
    if (!user) return;
    const transactionId = Date.now().toString();
    const transaction = {
      type: data.type,
      category: data.type === 'transfer' ? 'Transfer' : data.category,
      amount: Number(data.amount),
      description: data.description || '',
      date: data.date,
      sourceAccountId: data.type === 'income' ? null : data.sourceAccountId,
      destAccountId: data.type === 'expense' ? null : data.destAccountId,
      createdAt: new Date().toISOString(),
    };

    await writeData(`users/${user.uid}/transactions/${transactionId}`, transaction);

    // Update saldo - gunakan localBalances jika ada untuk kalkulasi kumulatif
    if (data.type === 'expense' || data.type === 'transfer') {
      const acc = accounts.find(a => a.id === data.sourceAccountId);
      if (acc) {
        const currentBalance = localBalances?.get(data.sourceAccountId) ?? acc.balance;
        const newBalance = currentBalance - Number(data.amount);
        await updateData(`users/${user.uid}/accounts/${data.sourceAccountId}`, { balance: newBalance });
        localBalances?.set(data.sourceAccountId, newBalance);
      }
    }
    if (data.type === 'income' || data.type === 'transfer') {
      const acc = accounts.find(a => a.id === data.destAccountId);
      if (acc) {
        const currentBalance = localBalances?.get(data.destAccountId) ?? acc.balance;
        const newBalance = currentBalance + Number(data.amount);
        await updateData(`users/${user.uid}/accounts/${data.destAccountId}`, { balance: newBalance });
        localBalances?.set(data.destAccountId, newBalance);
      }
    }
  };

  const handleSave = async () => {
    if (!user || !editedResult) return;

    // Validasi: akun harus dipilih
    if (editedResult.type === 'expense' && !editedResult.sourceAccountId) {
      setError('Pilih akun sumber untuk pengeluaran!');
      return;
    }
    if (editedResult.type === 'income' && !editedResult.destAccountId) {
      setError('Pilih akun tujuan untuk pemasukan!');
      return;
    }
    if (editedResult.type === 'transfer') {
      if (!editedResult.sourceAccountId || !editedResult.destAccountId) {
        setError('Pilih akun sumber dan tujuan untuk transfer!');
        return;
      }
    }

    setSaving(true);
    try {
      const transactionId = Date.now().toString();
      const transaction = {
        type: editedResult.type,
        category: editedResult.type === 'transfer' ? 'Transfer' : editedResult.category,
        amount: Number(editedResult.amount),
        description: editedResult.description || '',
        date: editedResult.date,
        sourceAccountId: editedResult.type === 'income' ? null : editedResult.sourceAccountId,
        destAccountId: editedResult.type === 'expense' ? null : editedResult.destAccountId,
        createdAt: new Date().toISOString(),
      };

      await writeData(`users/${user.uid}/transactions/${transactionId}`, transaction);

      // Update saldo
      if (editedResult.type === 'expense' || editedResult.type === 'transfer') {
        const acc = accounts.find(a => a.id === editedResult.sourceAccountId);
        if (acc) await updateData(`users/${user.uid}/accounts/${editedResult.sourceAccountId}`, { balance: acc.balance - Number(editedResult.amount) });
      }
      if (editedResult.type === 'income' || editedResult.type === 'transfer') {
        const acc = accounts.find(a => a.id === editedResult.destAccountId);
        if (acc) await updateData(`users/${user.uid}/accounts/${editedResult.destAccountId}`, { balance: acc.balance + Number(editedResult.amount) });
      }

      setSuccess(true);
      setPrompt('');
      setSelectedImage(null);
      setResult(null);
      setEditedResult(null);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTypeColor = (type: string) => type === 'income' ? '#10b981' : type === 'expense' ? '#ef4444' : '#2563eb';

  return (
    <Box sx={{ pb: 12 }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 50%, #a5b4fc 100%)', color: 'white', p: 3, borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon="mdi:robot" width={24} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Input dengan AI</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Ketik atau upload gambar struk</Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Card elevation={0}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <TextField label="Contoh: Bayar listrik 500ribu dari BCA hari ini" multiline rows={3} fullWidth value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ketik transaksi Anda..." sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />

              {/* Voice Note */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button
                  variant={isListening ? 'contained' : 'outlined'}
                  onClick={isListening ? handleVoiceStop : handleVoiceStart}
                  startIcon={<Icon icon={isListening ? 'mdi:stop-circle' : 'mdi:microphone'} />}
                  color={isListening ? 'error' : 'primary'}
                  sx={{ borderRadius: 3, flex: 1, py: 1.2, fontWeight: 600, ...(isListening && { animation: 'pulse 1.5s infinite' }) }}
                >
                  {isListening ? 'Berhenti Merekam...' : 'Voice Note'}
                </Button>
                {prompt && (
                  <IconButton size="small" onClick={() => setPrompt('')} sx={{ bgcolor: 'rgba(239,68,68,0.1)', borderRadius: 2 }}>
                    <Icon icon="mdi:close" width={18} color="#ef4444" />
                  </IconButton>
                )}
              </Stack>

              {/* Image Upload */}
              <Box>
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }} />
                {!selectedImage ? (
                  <Paper variant="outlined" onClick={() => fileInputRef.current?.click()} sx={{ p: 2.5, borderStyle: 'dashed', borderColor: 'primary.main', borderRadius: 3, bgcolor: 'rgba(37, 99, 235, 0.04)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' } }}>
                    <Stack alignItems="center" spacing={1}>
                      <Icon icon="mdi:image-plus" width={32} color="#2563eb" />
                      <Typography variant="body2" fontWeight={600} color="primary">Upload Gambar Struk</Typography>
                    </Stack>
                  </Paper>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
                      <Icon icon="mdi:image-check" width={22} color="#10b981" />
                      <Typography flex={1} fontWeight={600} color="success.dark">Gambar dipilih</Typography>
                      <IconButton size="small" onClick={handleRemoveImage} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)' }}><Icon icon="mdi:close" width={16} color="#ef4444" /></IconButton>
                    </Stack>
                    <Box component="img" src={selectedImage} sx={{ width: '100%', maxHeight: 150, objectFit: 'contain', borderRadius: 2 }} />
                  </Paper>
                )}
              </Box>

              <Button variant="contained" fullWidth size="large" onClick={handleProcess} disabled={processing || (!prompt.trim() && !selectedImage)} sx={{ py: 1.5, background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', '&:disabled': { background: '#e2e8f0' } }} startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <Icon icon="mdi:robot" />}>
                {processing ? 'Memproses...' : 'Proses dengan AI'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Result */}
        {editedResult && (
          <Card sx={{ mt: 3 }} elevation={0}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: getTypeColor(editedResult.type), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="mdi:check" width={22} color="#fff" />
                </Box>
                <Typography variant="h6" fontWeight={600}>Hasil AI - Edit jika perlu</Typography>
              </Stack>

              <Stack spacing={2}>
                <TextField label="Tipe" select fullWidth value={editedResult.type} onChange={(e) => setEditedResult({ ...editedResult, type: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}>
                  <MenuItem value="expense">Pengeluaran</MenuItem>
                  <MenuItem value="income">Pemasukan</MenuItem>
                  <MenuItem value="transfer">Transfer</MenuItem>
                </TextField>

                {(editedResult.type === 'expense' || editedResult.type === 'transfer') && (
                  <TextField label="Akun Sumber *" select fullWidth value={editedResult.sourceAccountId || ''} onChange={(e) => setEditedResult({ ...editedResult, sourceAccountId: e.target.value })} error={!editedResult.sourceAccountId} helperText={!editedResult.sourceAccountId ? 'Wajib dipilih' : ''} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}>
                    {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name} (Rp {a.balance.toLocaleString('id-ID')})</MenuItem>)}
                  </TextField>
                )}

                {(editedResult.type === 'income' || editedResult.type === 'transfer') && (
                  <TextField label="Akun Tujuan *" select fullWidth value={editedResult.destAccountId || ''} onChange={(e) => setEditedResult({ ...editedResult, destAccountId: e.target.value })} error={!editedResult.destAccountId} helperText={!editedResult.destAccountId ? 'Wajib dipilih' : ''} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}>
                    {accounts.filter(a => a.id !== editedResult.sourceAccountId).map(a => <MenuItem key={a.id} value={a.id}>{a.name} (Rp {a.balance.toLocaleString('id-ID')})</MenuItem>)}
                  </TextField>
                )}

                {editedResult.type !== 'transfer' && (
                  <TextField label="Kategori" select fullWidth value={editedResult.category || ''} onChange={(e) => setEditedResult({ ...editedResult, category: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }}>
                    {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                )}

                <TextField label="Jumlah" type="number" fullWidth value={editedResult.amount || 0} onChange={(e) => setEditedResult({ ...editedResult, amount: e.target.value })} InputProps={{ startAdornment: <Typography sx={{ mr: 1, fontWeight: 600, color: 'text.secondary' }}>Rp</Typography> }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />

                <TextField label="Deskripsi" fullWidth value={editedResult.description || ''} onChange={(e) => setEditedResult({ ...editedResult, description: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />

                <TextField label="Tanggal" type="date" fullWidth value={editedResult.date || ''} onChange={(e) => setEditedResult({ ...editedResult, date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />

                <Button variant="contained" fullWidth size="large" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Icon icon="mdi:content-save" />} sx={{ py: 1.5 }}>
                  {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)} message="✓ Transaksi berhasil disimpan!" anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: 100, '& .MuiSnackbarContent-root': { borderRadius: 3, bgcolor: '#10b981', fontWeight: 600 } }} />
    </Box>
  );
}
