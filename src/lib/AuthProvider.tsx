'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '@/lib/auth';
import { Box, CircularProgress } from '@mui/material';

/**
 * AuthContextType
 * 
 * Tipe untuk AuthContext yang menyediakan:
 * - user: User Firebase yang sedang login
 * - loading: Status loading auth
 * - isNominalHidden: Status apakah nominal (pemasukan, pengeluaran, selisih) disembunyikan
 * - toggleNominalVisibility: Fungsi untuk toggle show/hide nominal
 * 
 * Cara penggunaan di komponen lain:
 * const { isNominalHidden, toggleNominalVisibility } = useAuth();
 * 
 * Contoh menampilkan nominal yang bisa disembunyikan:
 * <Typography>{isNominalHidden ? '••••••••' : `Rp ${amount.toLocaleString('id-ID')}`}</Typography>
 */
interface AuthContextType {
    user: User | null;
    loading: boolean;
    // State untuk menyembunyikan nominal (pemasukan, pengeluaran, selisih)
    // Dapat digunakan di menu lain seperti: Transaksi, Akun, Laporan, dll
    isNominalHidden: boolean;
    // Fungsi untuk toggle show/hide nominal
    toggleNominalVisibility: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isNominalHidden: false,
    toggleNominalVisibility: () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

// Key untuk localStorage
const NOMINAL_HIDDEN_KEY = 'isNominalHidden';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // State untuk hide/show nominal di seluruh aplikasi
    // Nilai ini bisa digunakan di komponen manapun yang menampilkan nominal
    // seperti: HomePage, TransactionPage, AccountPage, ReportPage, dll
    // Nilai disimpan di localStorage agar tetap tersimpan saat reload
    const [isNominalHidden, setIsNominalHidden] = useState(false);

    // Load nilai isNominalHidden dari localStorage saat pertama kali mount
    useEffect(() => {
        const stored = localStorage.getItem(NOMINAL_HIDDEN_KEY);
        if (stored !== null) {
            setIsNominalHidden(stored === 'true');
        }
    }, []);

    // Simpan ke localStorage setiap kali nilai berubah
    useEffect(() => {
        localStorage.setItem(NOMINAL_HIDDEN_KEY, String(isNominalHidden));
    }, [isNominalHidden]);

    // Fungsi untuk toggle visibility nominal
    // Panggil fungsi ini dari icon mata di berbagai halaman
    const toggleNominalVisibility = () => {
        setIsNominalHidden(prev => !prev);
    };

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)' }}>
                <CircularProgress sx={{ color: 'white' }} size={48} />
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, isNominalHidden, toggleNominalVisibility }}>
            {children}
        </AuthContext.Provider>
    );
}
