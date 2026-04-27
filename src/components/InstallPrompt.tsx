'use client';

import { useState, useEffect } from 'react';
import { Box, Button, IconButton, Stack, Typography, Collapse } from '@mui/material';
import { Icon } from '@iconify/react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        // Don't show if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;
        if (isStandalone) return;

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Check if dismissed recently (within 3 days)
        const dismissedAt = localStorage.getItem('pwa-install-dismissed');
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) return;
        }

        // Listen for native install prompt (Chrome, Edge, Samsung Browser, etc.)
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        // Hide prompt when app is installed
        const handleAppInstalled = () => {
            setShowPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // For iOS: show manual install instructions
        if (isIOSDevice) {
            setShowPrompt(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('Install prompt outcome:', outcome);
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Don't render anything until mounted (prevents hydration mismatch)
    if (!isMounted) return null;

    // Don't render if nothing to show
    if (!showPrompt) return null;

    return (
        <Collapse in={showPrompt}>
            <Box
                sx={{
                    mx: 2,
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
                }}
            >
                {/* Background decoration */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -30,
                        right: -30,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                    }}
                />

                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            borderRadius: 2,
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon icon="mdi:cellphone-arrow-down" width={28} />
                    </Box>

                    <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Install Aplikasi
                        </Typography>
                        {isIOS ? (
                            <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', lineHeight: 1.4 }}>
                                Ketuk <Icon icon="mdi:export-variant" width={14} style={{ verticalAlign: 'middle' }} /> lalu pilih {'"'}Add to Home Screen{'"'}
                            </Typography>
                        ) : (
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                Akses lebih cepat langsung dari layar utama
                            </Typography>
                        )}
                    </Box>

                    {/* Close button */}
                    <IconButton
                        size="small"
                        onClick={handleDismiss}
                        sx={{
                            color: 'white',
                            opacity: 0.7,
                            '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' },
                            position: 'absolute',
                            top: 8,
                            right: 8,
                        }}
                    >
                        <Icon icon="mdi:close" width={18} />
                    </IconButton>
                </Stack>

                {/* Install button only when beforeinstallprompt is available */}
                {!isIOS && deferredPrompt && (
                    <Button
                        variant="contained"
                        onClick={handleInstall}
                        sx={{
                            mt: 2,
                            bgcolor: 'white',
                            color: '#2563eb',
                            fontWeight: 600,
                            borderRadius: 2,
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                        }}
                        startIcon={<Icon icon="mdi:download" width={18} />}
                        fullWidth
                    >
                        Pasang Sekarang
                    </Button>
                )}
            </Box>
        </Collapse>
    );
}
