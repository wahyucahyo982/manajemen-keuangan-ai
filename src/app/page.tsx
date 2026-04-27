'use client';

import { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/lib/AuthProvider';
import { readData } from '@/lib/database';
import BottomNav from '@/components/BottomNav';
import HomePage from '@/components/pages/HomePage';
import HistoryPage from '@/components/pages/HistoryPage';
import AIInputPage from '@/components/pages/AIInputPage';
import ManualInputPage from '@/components/pages/ManualInputPage';
import AccountPage from '@/components/pages/AccountPage';
import AuthPage from '@/components/pages/AuthPage';
import CategoryPage from '@/components/pages/CategoryPage';
import PinEntry from '@/components/PinEntry';

export default function Home() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  // PIN verification state
  const [pinVerified, setPinVerified] = useState(false);
  const [pinRequired, setPinRequired] = useState<boolean | null>(null);
  const [userPin, setUserPin] = useState<string>('');

  // Load PIN settings from Firebase
  useEffect(() => {
    if (!user) {
      setPinRequired(null);
      setPinVerified(false);
      return;
    }

    const loadPinSettings = async () => {
      try {
        const profile = await readData(`users/${user.uid}/profile`);
        if (profile?.usePIN && profile?.pin) {
          setPinRequired(true);
          setUserPin(profile.pin);
        } else {
          setPinRequired(false);
          setPinVerified(true);
        }
      } catch (error) {
        console.error('Error loading PIN settings:', error);
        setPinRequired(false);
        setPinVerified(true);
      }
    };

    loadPinSettings();
  }, [user]);

  // Jika belum login, tampilkan halaman auth
  if (!user) {
    return <AuthPage />;
  }

  // Loading state while checking PIN requirement
  if (pinRequired === null) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)',
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  // Show PIN entry if required and not verified
  if (pinRequired && !pinVerified) {
    return (
      <PinEntry
        correctPin={userPin}
        onSuccess={() => setPinVerified(true)}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 0: return <HomePage onNavigate={setCurrentPage} />;
      case 1: return <HistoryPage />;
      case 2: return <AIInputPage />;
      case 3: return <ManualInputPage />;
      case 4: return <AccountPage />;
      case 5: return <CategoryPage />;
      default: return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {renderPage()}
      <BottomNav value={currentPage} onChange={setCurrentPage} />
    </Box>
  );
}
