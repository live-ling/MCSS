import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/common/ImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUserServers, 
  createServer, 
  createServerEditRequest,
  deleteServer, 
  addServerImage,
  sendEmailNotification,
  getAdminEmails,
} from '@/db/api';
import type { ServerDetail, ServerFormData, GameVersion, ServerType } from '@/types';
import { toast } from 'sonner';
import { Plus, Eye, Trash2, Edit } from 'lucide-react';

const VERSION_OPTIONS: { value: GameVersion; label: string }[] = [
  { value: '1.21', label: '1.21' }, { value: '1.20', label: '1.20' },
  { value: '1.19', label: '1.19' }, { value: '1.18', label: '1.18' },
  { value: '1.17', label: '1.17' }, { value: '1.16', label: '1.16' },
  { value: '1.15', label: '1.15' }, { value: '1.14', label: '1.14' },
  { value: '1.13', label: '1.13' }, { value: '1.12', label: '1.12' },
  { value: '1.11', label: '1.11' }, { value: '1.10', label: '1.10' },
  { value: '1.9', label: '1.9' }, { value: '1.8', label: '1.8' },
  { value: '1.7', label: '1.7' }, { value: 'other', label: '其他' },
];

const TYPE_OPTIONS: { value: ServerType; label: string }[] = [
  { value: 'survival', label: '生存' }, { value: 'creative', label: '创造' },
  { value: 'rpg', label: 'RPG' }, { value: 'minigame', label: '小游戏' },
  { value: 'skyblock', label: '空岛' }, { value: 'prison', label: '监狱' },
  { value: 'factions', label: '派系' }, { value: 'other', label: '其他' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  offline: '已下线',
};

export default function OwnerPage() {
  const { profile } = useAuth();
  const [servers, setServers] = useState<ServerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerDetail | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<ServerFormData>({
    name: '',
    description: '',
    ip_address: '',
    port: 25565,
    version: '1.20',
    server_type: 'survival',
    is_pure_public: true,
    requires_whitelist: false,
    requires_genuine: false,
    max_players: null,
    tags: [],
    images: [],
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadServers();
  }, [profile]);

  const loadServers = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const data = await getUserServers(profile.id);
      setServers(data);
    } catch (error) {
      console.error('加载服务器列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    if (!formData.name || !formData.description || !formData.ip_address) {
      toast.error('请填写完整信息');
      return;
    }

    setSubmitting(true);
    try {
      if (editingServer) {
        // 创建编辑请求，等待管理员审核
        await createServerEditRequest(editingServer.id, profile.id, formData);
        
        toast.success('编辑请求已提交，等待管理员审核');
        
        // 发送邮件通知管理员
        try {
          const adminEmails = await getAdminEmails();
          for (const email of adminEmails) {
            await sendEmailNotification(
              email,
              '服务器编辑请求待审核',
              `服主 ${profile.username} 提交了服务器"${editingServer.name}"的编辑请求，请登录管理后台审核。`
            );
          }
        } catch (error) {
          console.error('发送邮件通知失败:', error);
        }
      } else {
        // 创建新服务器
        const server = await createServer(formData, profile.id);

        // 上传图片
        if (imageUrls.length > 0) {
          for (let i = 0; i < imageUrls.length; i++) {
            await addServerImage(server.id, imageUrls[i], i === 0);
          }
        }

        toast.success('服务器已提交，等待审核');
        
        // 发送邮件通知管理员
        try {
          const adminEmails = await getAdminEmails();
          for (const email of adminEmails) {
            await sendEmailNotification(
              email,
              '新服务器申请待审核',
              `服主 ${profile.username} 提交了新服务器"${formData.name}"的申请，请登录管理后台审核。`
            );
          }
        } catch (error) {
          console.error('发送邮件通知失败:', error);
        }
      }
      
      setDialogOpen(false);
      resetForm();
      loadServers();
    } catch (error) {
      console.error('提交失败:', error);
      toast.error(editingServer ? '更新失败' : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (server: ServerDetail) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      description: server.description,
      ip_address: server.ip_address,
      port: server.port,
      version: server.version,
      server_type: server.server_type,
      is_pure_public: server.is_pure_public,
      requires_whitelist: server.requires_whitelist,
      requires_genuine: server.requires_genuine,
      max_players: server.max_players,
      tags: server.tags?.map(t => t.tag) || [],
      images: [],
    });
    setImageUrls(server.images?.map(img => img.image_url) || []);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个服务器吗？')) return;

    try {
      await deleteServer(id);
      toast.success('删除成功');
      loadServers();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const resetForm = () => {
    setEditingServer(null);
    setFormData({
      name: '',
      description: '',
      ip_address: '',
      port: 25565,
      version: '1.20',
      server_type: 'survival',
      is_pure_public: true,
      requires_whitelist: false,
      requires_genuine: false,
      max_players: null,
      tags: [],
      images: [],
    });
    setImageUrls([]);
    setTagInput('');
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (formData.tags.includes(tagInput.trim())) {
      toast.error('标签已存在');
      return;
    }
    setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">服主中心</h1>
            <p className="text-muted-foreground">管理你的服务器</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingServer(null)}>
                <Plus className="mr-2 h-4 w-4" />
                添加服务器
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingServer ? '编辑服务器' : '添加服务器'}</DialogTitle>
                  <DialogDescription>
                    {editingServer ? '修改服务器信息' : '填写服务器信息，提交后等待管理员审核'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">服务器名称 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="输入服务器名称"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">服务器描述 *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="介绍你的服务器..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip">服务器地址 *</Label>
                      <Input
                        id="ip"
                        value={formData.ip_address}
                        onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                        placeholder="例如: mc.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">端口</Label>
                      <Input
                        id="port"
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: Number.parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="version">游戏版本 *</Label>
                      <Select
                        value={formData.version}
                        onValueChange={(value) => setFormData({ ...formData, version: value as GameVersion })}
                      >
                        <SelectTrigger id="version">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VERSION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">服务器类型 *</Label>
                      <Select
                        value={formData.server_type}
                        onValueChange={(value) => setFormData({ ...formData, server_type: value as ServerType })}
                      >
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_players">最大玩家数（可选）</Label>
                    <Input
                      id="max_players"
                      type="number"
                      value={formData.max_players || ''}
                      onChange={(e) => setFormData({ ...formData, max_players: e.target.value ? Number.parseInt(e.target.value) : null })}
                      placeholder="留空表示无限制"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>服务器特性</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_pure_public}
                          onChange={(e) => setFormData({ ...formData, is_pure_public: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">纯公益服务器</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.requires_genuine}
                          onChange={(e) => setFormData({ ...formData, requires_genuine: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">需要正版验证</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.requires_whitelist}
                          onChange={(e) => setFormData({ ...formData, requires_whitelist: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">需要白名单</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>标签</Label>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="添加标签"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag}>添加</Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 text-xs"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>服务器图片</Label>
                    <ImageUpload
                      bucketName="app-9eou800gj85c_server_images"
                      folder={profile.id}
                      maxFiles={5}
                      maxSizeMB={10}
                      onUploadComplete={setImageUrls}
                      existingImages={imageUrls}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    取消
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (editingServer ? '保存中...' : '提交中...') : (editingServer ? '保存' : '提交审核')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">加载中...</p>
        ) : servers.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => (
              <Card key={server.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{server.name}</CardTitle>
                    <Badge variant={server.status === 'approved' ? 'default' : server.status === 'pending' ? 'secondary' : 'destructive'}>
                      {STATUS_LABELS[server.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {server.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{server.view_count} 浏览</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to={`/servers/${server.id}`}>查看</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(server)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(server.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">还没有添加任何服务器</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加第一个服务器
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
