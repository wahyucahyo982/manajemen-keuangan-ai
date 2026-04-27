'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { generateText } from '@/lib/gemini';

export default function GeminiChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const result = await generateText(prompt);
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Gagal mendapatkan response dari AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          <Icon icon="mdi:robot" style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Gemini AI Chat
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Tanya sesuatu..."
              multiline
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Icon icon="mdi:send" />
                )
              }
            >
              {loading ? 'Generating...' : 'Kirim'}
            </Button>
          </Stack>
        </form>

        {response && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Response:
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {response}
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
}
