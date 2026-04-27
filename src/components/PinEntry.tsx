'use client';

import { useState, useCallback } from 'react';
import { Box, Typography, IconButton, Stack } from '@mui/material';
import { Icon } from '@iconify/react';

interface PinEntryProps {
    onSuccess: () => void;
    correctPin: string;
}

export default function PinEntry({ onSuccess, correctPin }: PinEntryProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handleNumberPress = useCallback((num: string) => {
        if (pin.length >= 6) return;

        const newPin = pin + num;
        setPin(newPin);
        setError(false);

        // Auto-validate when 6 digits entered
        if (newPin.length === 6) {
            if (newPin === correctPin) {
                onSuccess();
            } else {
                setError(true);
                setShake(true);
                setTimeout(() => {
                    setPin('');
                    setShake(false);
                }, 500);
            }
        }
    }, [pin, correctPin, onSuccess]);

    const handleBackspace = useCallback(() => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
    }, []);

    const numpadButtons = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['', '0', 'backspace'],
    ];

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 50%, #93c5fd 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background decoration */}
            <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <Box sx={{ position: 'absolute', bottom: -150, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

            {/* Lock icon */}
            <Box
                sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    backdropFilter: 'blur(10px)',
                }}
            >
                <Icon icon="mdi:lock" width={40} color="white" />
            </Box>

            {/* Title */}
            <Typography variant="h5" fontWeight={700} color="white" mb={1}>
                Masukkan PIN
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.8)" mb={4}>
                Masukkan 6 digit PIN untuk melanjutkan
            </Typography>

            {/* PIN dots */}
            <Stack
                direction="row"
                spacing={2}
                sx={{
                    mb: 4,
                    animation: shake ? 'shake 0.5s ease-in-out' : 'none',
                    '@keyframes shake': {
                        '0%, 100%': { transform: 'translateX(0)' },
                        '20%, 60%': { transform: 'translateX(-10px)' },
                        '40%, 80%': { transform: 'translateX(10px)' },
                    },
                }}
            >
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <Box
                        key={index}
                        sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: index < pin.length
                                ? error ? '#ef4444' : 'white'
                                : 'rgba(255,255,255,0.3)',
                            border: '2px solid',
                            borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.2s ease',
                            transform: index < pin.length ? 'scale(1.1)' : 'scale(1)',
                        }}
                    />
                ))}
            </Stack>

            {/* Error message */}
            {error && (
                <Typography
                    variant="body2"
                    color="white"
                    sx={{
                        mb: 2,
                        bgcolor: 'rgba(239, 68, 68, 0.3)',
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                    }}
                >
                    <Icon icon="mdi:alert-circle" width={16} />
                    PIN salah, coba lagi
                </Typography>
            )}

            {/* Numpad */}
            <Box sx={{ p: 2 }}>
                {numpadButtons.map((row, rowIndex) => (
                    <Stack key={rowIndex} direction="row" spacing={1.5} mb={rowIndex < 3 ? 1.5 : 0}>
                        {row.map((btn, btnIndex) => (
                            <Box key={btnIndex} sx={{ width: 72, height: 56 }}>
                                {btn === '' ? (
                                    <Box sx={{ width: '100%', height: '100%' }} />
                                ) : btn === 'backspace' ? (
                                    <IconButton
                                        onClick={handleBackspace}
                                        disabled={pin.length === 0}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: 3,
                                            bgcolor: 'rgba(255,255,255,0.1)',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                            '&:active': { bgcolor: 'rgba(255,255,255,0.3)', transform: 'scale(0.95)' },
                                            '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <Icon icon="mdi:backspace-outline" width={24} />
                                    </IconButton>
                                ) : (
                                    <IconButton
                                        onClick={() => handleNumberPress(btn)}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: 3,
                                            bgcolor: 'rgba(255,255,255,0.15)',
                                            color: 'white',
                                            fontSize: '1.5rem',
                                            fontWeight: 600,
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                                            '&:active': { bgcolor: 'rgba(255,255,255,0.35)', transform: 'scale(0.95)' },
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {btn}
                                    </IconButton>
                                )}
                            </Box>
                        ))}
                    </Stack>
                ))}
            </Box>
        </Box>
    );
}
