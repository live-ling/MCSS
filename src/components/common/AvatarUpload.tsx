import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

export interface AvatarUploadRef {
  triggerUpload: () => void;
}

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadSuccess: (url: string) => void;
  userId: string;
  showButton?: boolean;
}

export const AvatarUpload = forwardRef<AvatarUploadRef, AvatarUploadProps>(
  ({ currentAvatar, onUploadSuccess, userId, showButton = true }, ref) => {
    const [uploading, setUploading] = useState(false);
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<Crop>({
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerUpload: () => {
        fileInputRef.current?.click();
      },
    }));

    // 选择文件
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }

      // 验证文件大小（最大10MB）
      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片大小不能超过10MB');
        return;
      }

      // 读取文件并显示裁切对话框
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setShowCropDialog(true);
      });
      reader.readAsDataURL(file);
    };

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

      // 设置canvas尺寸为200x200（头像标准尺寸）
      canvas.width = 200;
      canvas.height = 200;

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        200,
        200
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

  // 压缩图片
  const compressImage = async (blob: Blob): Promise<Blob> => {
    // 如果已经小于10MB，直接返回
    if (blob.size <= 10 * 1024 * 1024) {
      return blob;
    }

    // 创建图片元素
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

        // 保持200x200尺寸
        canvas.width = 200;
        canvas.height = 200;
        ctx.drawImage(img, 0, 0, 200, 200);

        // 逐步降低质量直到小于1MB
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (compressedBlob) => {
              if (!compressedBlob) {
                reject(new Error('压缩失败'));
                return;
              }

              if (compressedBlob.size <= 1024 * 1024 || quality <= 0.1) {
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

  // 上传头像
  const handleUpload = async () => {
    if (!imgRef.current || !completedCrop) {
      toast.error('请先裁切图片');
      return;
    }

    setUploading(true);

    try {
      // 获取裁切后的图片
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // 压缩图片
      const compressedBlob = await compressImage(croppedBlob);

      // 生成文件名（包含用户ID文件夹）
      const fileName = `${userId}/avatar_${Date.now()}.webp`;

      // 上传到Supabase Storage
      const { data, error } = await supabase.storage
        .from('app-9eou800gj85c_avatars')
        .upload(fileName, compressedBlob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (error) throw error;

      // 获取公开URL
      const { data: urlData } = supabase.storage
        .from('app-9eou800gj85c_avatars')
        .getPublicUrl(data.path);

      // 更新用户资料
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-ignore
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast.success('头像上传成功');
      onUploadSuccess(urlData.publicUrl);
      setShowCropDialog(false);
      setImgSrc('');
    } catch (error) {
      console.error('上传失败:', error);
      toast.error('头像上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

    return (
      <div className="flex flex-col items-center gap-4">
        {/* 当前头像预览 */}
        <Avatar className="h-32 w-32">
          <AvatarImage src={currentAvatar} />
          <AvatarFallback className="text-4xl">头像</AvatarFallback>
        </Avatar>

        {/* 上传按钮 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        {showButton && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            更换头像
          </Button>
        )}

        {/* 裁切对话框 */}
        <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>裁切头像</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* 裁切区域 */}
              {imgSrc && (
                <div className="flex justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop
                  >
                    <img
                      ref={imgRef}
                      src={imgSrc}
                      alt="裁切预览"
                      style={{ maxHeight: '400px' }}
                    />
                  </ReactCrop>
                </div>
              )}

              {/* 预览区域 */}
              {completedCrop && imgRef.current && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">预览效果</p>
                  <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-border">
                    <canvas
                      ref={(canvas) => {
                        if (!canvas || !imgRef.current || !completedCrop) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        const image = imgRef.current;
                        const scaleX = image.naturalWidth / image.width;
                        const scaleY = image.naturalHeight / image.height;

                        canvas.width = 128;
                        canvas.height = 128;

                        ctx.drawImage(
                          image,
                          completedCrop.x * scaleX,
                          completedCrop.y * scaleY,
                          completedCrop.width * scaleX,
                          completedCrop.height * scaleY,
                          0,
                          0,
                          128,
                          128
                        );
                      }}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCropDialog(false);
                  setImgSrc('');
                }}
                disabled={uploading}
              >
                取消
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !completedCrop}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploading ? '上传中...' : '确认上传'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

AvatarUpload.displayName = 'AvatarUpload';
