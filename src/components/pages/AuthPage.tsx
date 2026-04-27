'use client';

import { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Stack, Alert, Tab, Tabs } from '@mui/material';
import { Icon } from '@iconify/react';
import { loginWithEmail, registerWithEmail } from '@/lib/auth';
import { writeData } from '@/lib/database';
import { updateProfile } from 'firebase/auth';

export default function AuthPage() {
    const [tab, setTab] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email || !password) { setError('Email dan password harus diisi'); return; }
        setLoading(true); setError(null);
        try {
            await loginWithEmail(email, password);
        } catch (err: any) {
            setError(err.message || 'Gagal login');
        } finally { setLoading(false); }
    };

    const handleRegister = async () => {
        if (!name) { setError('Nama harus diisi'); return; }
        if (!email || !password) { setError('Email dan password harus diisi'); return; }
        if (password !== confirmPassword) { setError('Password tidak cocok'); return; }
        if (password.length < 6) { setError('Password minimal 6 karakter'); return; }
        setLoading(true); setError(null);
        try {
            const user = await registerWithEmail(email, password);
            // Update display name
            await updateProfile(user, { displayName: name });
            // Save profile to database
            await writeData(`users/${user.uid}/profile`, {
                name,
                email,
                phone,
                createdAt: new Date().toISOString(),
            });
        } catch (err: any) {
            setError(err.message || 'Gagal registrasi');
        } finally { setLoading(false); }
    };



    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)' }}>
            {/* Header */}
            <Box sx={{ p: 4, pt: 8, textAlign: 'center', color: 'white' }}>
                <Box sx={{ width: 72, height: 72, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, backdropFilter: 'blur(10px)' }}>
                    <Icon icon="mdi:wallet-outline" width={40} />
                </Box>
                <Typography variant="h4" fontWeight={700}>FinFast</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>Kelola keuangan Anda dengan mudah dengan AI</Typography>
            </Box>

            {/* Auth Card */}
            <Box sx={{ flex: 1, px: 2, pb: 4 }}>
                <Card elevation={0} sx={{ borderRadius: 2, maxWidth: 400, mx: 'auto' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(null); }} variant="fullWidth" sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600, borderRadius: 2 } }}>
                            <Tab label="Masuk" />
                            <Tab label="Daftar" />
                        </Tabs>

                        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                        <Stack spacing={2}>
                            {tab === 1 && (
                                <>
                                    <TextField label="Nama Lengkap" fullWidth value={name} onChange={(e) => setName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />
                                    <TextField label="No. Telepon" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />
                                </>
                            )}
                            <TextField label="Email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />
                            <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && tab === 0) handleLogin(); }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />
                            {tab === 1 && <TextField label="Konfirmasi Password" type="password" fullWidth value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc' } }} />}

                            <Button variant="contained" size="large" fullWidth disabled={loading} onClick={tab === 0 ? handleLogin : handleRegister} sx={{ py: 1.5 }}>
                                {loading ? 'Memproses...' : tab === 0 ? 'Masuk' : 'Daftar'}
                            </Button>


                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}
