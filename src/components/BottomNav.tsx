'use client';

import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { Icon } from '@iconify/react';

export interface BottomNavProps {
  value: number;
  onChange: (value: number) => void;
}

const navItems = [
  { label: 'Beranda', icon: 'mingcute:home-4-line', activeIcon: 'mingcute:home-4-fill' },
  { label: 'Riwayat', icon: 'mingcute:report-forms-line', activeIcon: 'mingcute:report-forms-fill' },
  { label: 'AI', icon: 'mingcute:ai-line', activeIcon: 'mingcute:ai-fill' },
  { label: 'Manual', icon: 'mingcute:pencil-ruler-line', activeIcon: 'mingcute:pencil-ruler-fill' },
  { label: 'Akun', icon: 'mingcute:book-2-line', activeIcon: 'mingcute:book-2-fill' },
];

export default function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        px: 2,
        pb: 2,
        pt: 1,
        background: 'linear-gradient(to top, rgba(248, 250, 252, 1) 60%, rgba(248, 250, 252, 0))',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
          border: '1px solid rgba(255, 255, 255, 0.6)',
        }}
      >
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => {
            onChange(newValue);
          }}
          sx={{
            bgcolor: 'transparent',
            height: 70,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '8px 0',
              color: 'text.secondary',
              transition: 'all 0.3s ease',
              '&.Mui-selected': {
                color: 'primary.main',
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.7rem',
                marginTop: '4px',
                transition: 'all 0.3s ease',
              },
            },
          }}
        >
          {navItems.map((item, index) => (
            <BottomNavigationAction
              key={index}
              label={item.label}
              icon={
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 32,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Icon
                    icon={value === index ? item.activeIcon : item.icon}
                    width={24}
                    color={value === index ? '#1d4ed8' : undefined}
                  />
                </Box>
              }
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
