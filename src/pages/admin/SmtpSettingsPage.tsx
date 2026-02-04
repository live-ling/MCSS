import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getSmtpConfig, upsertSmtpConfig, testSmtpConfig } from '@/db/api';
import type { SmtpConfig } from '@/types';

export default function SmtpSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<Partial<SmtpConfig>>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: 'MC服务器平台',
    use_tls: true,
    is_active: true,
  });
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getSmtpConfig();
      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('加载SMTP配置失败:', error);
    }
  };

  const handleSave = async () => {
    if (!config.host || !config.username || !config.password || !config.from_email) {
      toast.error('请填写完整的SMTP配置');
      return;
    }

    setLoading(true);
    try {
      await upsertSmtpConfig(config);
      toast.success('SMTP配置保存成功');
      await loadConfig();
    } catch (error: any) {
      console.error('保存SMTP配置失败:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error('请输入测试邮箱地址');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setTesting(true);
    try {
      await testSmtpConfig(testEmail);
      toast.success('测试邮件已发送，请检查邮箱');
    } catch (error: any) {
      console.error('测试SMTP配置失败:', error);
      toast.error(error.message || '测试失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SMTP设置</h1>
        <p className="text-muted-foreground">配置邮件发送服务</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP配置</CardTitle>
          <CardDescription>
            配置SMTP服务器信息，用于发送邮件通知
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP服务器地址</Label>
              <Input
                id="host"
                placeholder="例如: smtp.qq.com"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">端口</Label>
              <Input
                id="port"
                type="number"
                placeholder="587"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="通常是完整的邮箱地址"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码/授权码</Label>
              <Input
                id="password"
                type="password"
                placeholder="SMTP密码或授权码"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from_email">发件人邮箱</Label>
              <Input
                id="from_email"
                type="email"
                placeholder="noreply@example.com"
                value={config.from_email}
                onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_name">发件人名称</Label>
              <Input
                id="from_name"
                placeholder="MC服务器平台"
                value={config.from_name}
                onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="use_tls"
              checked={config.use_tls}
              onCheckedChange={(checked) => setConfig({ ...config, use_tls: checked })}
            />
            <Label htmlFor="use_tls">使用TLS加密</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
            <Label htmlFor="is_active">启用此配置</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>测试SMTP配置</CardTitle>
          <CardDescription>
            发送测试邮件以验证配置是否正确
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test_email">测试邮箱地址</Label>
            <Input
              id="test_email"
              type="email"
              placeholder="输入接收测试邮件的邮箱"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <Button onClick={handleTest} disabled={testing} variant="outline">
            {testing ? '发送中...' : '发送测试邮件'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
