import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { queryMCPlayer, updateMinecraftUsername, clearMinecraftUsername } from '@/db/api';
import { toast } from 'sonner';
import { Loader2, User, Trash2 } from 'lucide-react';

interface MinecraftPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername?: string;
  onSuccess?: () => void;
}

export function MinecraftPlayerDialog({ 
  open, 
  onOpenChange, 
  currentUsername,
  onSuccess 
}: MinecraftPlayerDialogProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<{
    username: string;
    uuid: string;
    skin_url: string;
  } | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  useEffect(() => {
    if (open) {
      setUsername(currentUsername || '');
      setPlayerInfo(null);
      setStep('input');
    }
  }, [open, currentUsername]);

  const handleQuery = async () => {
    if (!username.trim()) {
      toast.error('请输入Minecraft用户名');
      return;
    }

    setLoading(true);
    try {
      const info = await queryMCPlayer(username.trim());
      if (info) {
        setPlayerInfo(info);
        setStep('preview');
      }
    } catch (error: any) {
      toast.error(error.message || '查询失败，请检查用户名是否正确');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!playerInfo) return;

    setLoading(true);
    try {
      await updateMinecraftUsername(playerInfo.username);
      toast.success('设置成功');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || '设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await clearMinecraftUsername();
      toast.success('已清除MC ID');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || '清除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('input');
    setPlayerInfo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>设置Minecraft正版ID</DialogTitle>
          <DialogDescription>
            输入你的Minecraft正版用户名，我们将自动获取你的UUID和皮肤信息
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minecraft-username">Minecraft用户名</Label>
              <Input
                id="minecraft-username"
                placeholder="例如：Notch"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleQuery();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                请输入你的Minecraft Java版正版用户名
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleQuery}
                disabled={loading || !username.trim()}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                查询玩家信息
              </Button>
              {currentUsername && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {playerInfo && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={`https://crafatar.com/avatars/${playerInfo.uuid}?overlay`} 
                      alt={playerInfo.username}
                    />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{playerInfo.username}</p>
                    <p className="text-xs text-muted-foreground">
                      UUID: {playerInfo.uuid}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="flex-1"
              >
                上一步
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                确认设置
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
