'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage: string | null;
}

export function ImageUpload({ onImageUploaded, currentImage }: ImageUploadProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onImageUploaded(data.url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    }
  }, [onImageUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'border-gray-300 dark:border-gray-700 hover:border-primary-400'}
      `}
    >
      <input {...getInputProps()} />
      {currentImage ? (
        <div className="space-y-4">
          <img src={currentImage} alt="Uploaded" className="mx-auto max-h-48 rounded-lg shadow-sm" />
          <p className="text-sm text-gray-500">Click or drag to replace image</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-4xl">📸</div>
          <p className="text-gray-600 dark:text-gray-400">
            {isDragActive ? 'Drop image here' : 'Drag & drop image here, or click to select'}
          </p>
          <p className="text-xs text-gray-400">PNG, JPG or WebP (max 10MB)</p>
        </div>
      )}
    </div>
  );
}
