import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sendVerificationCode, changeUserEmail, fetchQQAvatar } from '@/db/api';
import { supabase } from '@/db/supabase';

interface EmailSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string | null;
  onSuccess: () => void;
}

export function EmailSettingsDialog({
  open,
  onOpenChange,
  currentEmail,
  onSuccess,
}: EmailSettingsDialogProps) {
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!newEmail) {
      toast.error('请输入新邮箱地址');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    if (newEmail === currentEmail) {
      toast.error('新邮箱不能与当前邮箱相同');
      return;
    }

    setLoading(true);
    try {
      await sendVerificationCode(newEmail, 'email_change');
      toast.success('验证码已发送到新邮箱');
      setStep('verify');
      setCountdown(60);
      
      // 倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('发送验证码失败:', error);
      toast.error(error.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code) {
      toast.error('请输入验证码');
      return;
    }

    if (code.length !== 6) {
      toast.error('验证码为6位数字');
      return;
    }

    setLoading(true);
    try {
      await changeUserEmail(newEmail, code);
      
      // 尝试获取QQ头像并更新
      try {
        const avatarUrl = await fetchQQAvatar(newEmail);
        if (avatarUrl) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: updateError } = await (supabase
              .from('profiles') as any)
              .update({ avatar_url: avatarUrl })
              .eq('id', user.id);
            
            if (updateError) {
              console.error('更新头像失败:', updateError);
            } else {
              toast.success('邮箱修改成功，已自动设置QQ头像');
            }
          }
        } else {
          toast.success('邮箱修改成功');
        }
      } catch (error) {
        console.log('获取QQ头像失败，跳过:', error);
        toast.success('邮箱修改成功');
      }
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('修改邮箱失败:', error);
      toast.error(error.message || '修改邮箱失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setNewEmail('');
    setCode('');
    setCountdown(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改邮箱</DialogTitle>
          <DialogDescription>
            {step === 'input' ? '输入新邮箱地址' : '输入发送到新邮箱的验证码'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-email">当前邮箱</Label>
              <Input
                id="current-email"
                value={currentEmail || '未设置'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">新邮箱地址</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="请输入新邮箱地址"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email-display">新邮箱地址</Label>
              <Input
                id="new-email-display"
                value={newEmail}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <Input
                id="code"
                placeholder="请输入6位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                验证码已发送到新邮箱，有效期10分钟
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                取消
              </Button>
              <Button onClick={handleSendCode} disabled={loading}>
                {loading ? '发送中...' : '发送验证码'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('input')}
                disabled={loading}
              >
                返回
              </Button>
              <Button
                variant="outline"
                onClick={handleSendCode}
                disabled={loading || countdown > 0}
              >
                {countdown > 0 ? `重新发送(${countdown}s)` : '重新发送'}
              </Button>
              <Button onClick={handleVerify} disabled={loading}>
                {loading ? '验证中...' : '确认修改'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
