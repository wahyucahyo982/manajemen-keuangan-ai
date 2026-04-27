'use client';

import { useState, useRef, ChangeEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Alert,
} from '@mui/material';
import { Icon } from '@iconify/react';
import axios from 'axios';

interface ImageUploadProps {
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
}

export default function ImageUpload({
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`Ukuran file maksimal ${maxSizeMB}MB`);
      return;
    }

    setError(null);

    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    setError(null);

    try {
      // Contoh upload ke API - sesuaikan dengan endpoint Anda
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onUploadSuccess) {
        onUploadSuccess(response.data.url);
      }
    } catch (err) {
      const errorMessage = 'Gagal mengupload gambar';
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!selectedImage ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            onClick={handleButtonClick}
          >
            <Icon icon="mdi:cloud-upload" width={64} height={64} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Klik untuk memilih gambar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Maksimal {maxSizeMB}MB
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 300,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
              <IconButton
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'background.paper',
                  },
                }}
                onClick={handleRemove}
              >
                <Icon icon="mdi:close" />
              </IconButton>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleUpload}
                disabled={uploading}
                startIcon={<Icon icon="mdi:upload" />}
              >
                {uploading ? 'Mengupload...' : 'Upload'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleButtonClick}
                startIcon={<Icon icon="mdi:image" />}
              >
                Ganti
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
