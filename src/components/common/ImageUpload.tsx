import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucketName: string;
  folder?: string;
  maxFiles?: number;
  maxSizeMB?: number; // 最大文件大小（MB）
  onUploadComplete: (urls: string[]) => void;
  existingImages?: string[];
}

export function ImageUpload({
  bucketName,
  folder = '',
  maxFiles = 5,
  maxSizeMB = 10,
  onUploadComplete,
  existingImages = [],
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress] = useState(0);
  const [images, setImages] = useState<string[]>(existingImages);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 50.625, // 16:9 比例
    x: 5,
    y: 24.6875,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // 获取裁切后的图片
  const getCroppedImg = useCallback(
    async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('无法创建canvas上下文');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // 设置canvas尺寸为裁切区域的实际尺寸，但限制最大为1920x1080
      let targetWidth = crop.width * scaleX;
      let targetHeight = crop.height * scaleY;

      const maxWidth = 1920;
      const maxHeight = 1080;

      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = targetWidth * ratio;
        targetHeight = targetHeight * ratio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        targetWidth,
        targetHeight
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas为空'));
              return;
            }
            resolve(blob);
          },
          'image/webp',
          0.9
        );
      });
    },
    []
  );

  // 压缩图片到指定大小
  const compressImage = async (blob: Blob, maxSizeBytes: number): Promise<Blob> => {
    // 如果已经小于限制，直接返回
    if (blob.size <= maxSizeBytes) {
      return blob;
    }

    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 逐步降低质量直到小于限制
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (compressedBlob) => {
              if (!compressedBlob) {
                reject(new Error('压缩失败'));
                return;
              }

              if (compressedBlob.size <= maxSizeBytes || quality <= 0.1) {
                resolve(compressedBlob);
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/webp',
            quality
          );
        };

        tryCompress();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };

      img.src = url;
    });
  };

  const uploadCroppedImage = async (blob: Blob): Promise<string> => {
    // 压缩到指定大小
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const compressedBlob = await compressImage(blob, maxSizeBytes);

    if (compressedBlob.size > maxSizeBytes) {
      toast.info(`图片已压缩至 ${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB`);
    }

    // 生成文件名（只包含英文字母和数字）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${randomStr}.webp`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, compressedBlob, {
        contentType: 'image/webp',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrl;
  };

  // 处理裁切并上传
  const handleCropAndUpload = async () => {
    if (!imgRef.current || !completedCrop) {
      toast.error('请先裁切图片');
      return;
    }

    setUploading(true);

    try {
      // 获取裁切后的图片
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // 上传图片
      const url = await uploadCroppedImage(croppedBlob);
      
      const newImages = [...images, url];
      setImages(newImages);
      onUploadComplete(newImages);
      
      toast.success('上传成功');
      
      // 关闭对话框并处理下一个文件
      setShowCropDialog(false);
      setImgSrc('');
      
      // 如果还有待处理的文件，继续处理
      if (pendingFiles.length > 0) {
        const nextFile = pendingFiles[0];
        setPendingFiles(pendingFiles.slice(1));
        processFile(nextFile);
      }
    } catch (error) {
      console.error('上传失败:', error);
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 处理单个文件
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
      setShowCropDialog(true);
      // 重置裁切区域
      setCrop({
        unit: '%',
        width: 90,
        height: 50.625,
        x: 5,
        y: 24.6875,
      });
      setCompletedCrop(undefined);
    });
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (images.length + acceptedFiles.length > maxFiles) {
        toast.error(`最多只能上传${maxFiles}张图片`);
        return;
      }

      // 验证文件大小
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const oversizedFiles = acceptedFiles.filter(file => file.size > maxSizeBytes);
      if (oversizedFiles.length > 0) {
        toast.error(`图片大小不能超过${maxSizeMB}MB`);
        return;
      }

      // 处理第一个文件，其余文件放入待处理队列
      if (acceptedFiles.length > 0) {
        setPendingFiles(acceptedFiles.slice(1));
        processFile(acceptedFiles[0]);
      }
    },
    [images, maxFiles, maxSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/avif': ['.avif'],
    },
    maxFiles: maxFiles - images.length,
    disabled: uploading || images.length >= maxFiles,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onUploadComplete(newImages);
  };

  return (
    <div className="space-y-4">
      {/* 已上传的图片 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {images.map((url, index) => (
            <div key={index} className="group relative aspect-video overflow-hidden rounded-lg border border-border">
              <img src={url} alt={`上传图片 ${index + 1}`} className="h-full w-full object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 上传区域 */}
      {images.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-primary bg-accent'
              : 'border-border hover:border-primary hover:bg-accent'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            {uploading ? (
              <>
                <Upload className="h-8 w-8 animate-pulse text-muted-foreground" />
                <p className="text-sm text-muted-foreground">上传中...</p>
                <Progress value={progress} className="w-full max-w-xs" />
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? '释放以上传图片' : '点击或拖拽图片到此处上传'}
                </p>
                <p className="text-xs text-muted-foreground">
                  支持 JPG、PNG、WebP、GIF、AVIF 格式，最大 {maxSizeMB}MB
                </p>
                <p className="text-xs text-muted-foreground">
                  还可上传 {maxFiles - images.length} 张图片
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* 裁切对话框 */}
      <Dialog open={showCropDialog} onOpenChange={(open) => {
        if (!open && !uploading) {
          setShowCropDialog(false);
          setImgSrc('');
          setPendingFiles([]);
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>裁切图片 (16:9)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 裁切区域 */}
            {imgSrc && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={16 / 9}
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="裁切预览"
                    style={{ maxHeight: '500px', maxWidth: '100%' }}
                  />
                </ReactCrop>
              </div>
            )}

            {/* 预览区域 */}
            {completedCrop && imgRef.current && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">预览效果</p>
                <div className="relative w-full max-w-md overflow-hidden rounded-lg border-2 border-border">
                  <canvas
                    ref={(canvas) => {
                      if (!canvas || !imgRef.current || !completedCrop) return;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;

                      const image = imgRef.current;
                      const scaleX = image.naturalWidth / image.width;
                      const scaleY = image.naturalHeight / image.height;

                      // 预览尺寸
                      const previewWidth = 400;
                      const previewHeight = 225; // 16:9

                      canvas.width = previewWidth;
                      canvas.height = previewHeight;

                      ctx.drawImage(
                        image,
                        completedCrop.x * scaleX,
                        completedCrop.y * scaleY,
                        completedCrop.width * scaleX,
                        completedCrop.height * scaleY,
                        0,
                        0,
                        previewWidth,
                        previewHeight
                      );
                    }}
                    className="aspect-video w-full"
                  />
                </div>
              </div>
            )}

            {pendingFiles.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                还有 {pendingFiles.length} 张图片待处理
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCropDialog(false);
                setImgSrc('');
                // 清除文件选择
                setPendingFiles([]);
              }}
              disabled={uploading}
            >
              取消
            </Button>
            <Button onClick={handleCropAndUpload} disabled={uploading || !completedCrop}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? '上传中...' : '确认上传'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
