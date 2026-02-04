import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getEmailTemplates, updateEmailTemplate } from '@/db/api';
import type { EmailTemplate } from '@/types';
import { Edit } from 'lucide-react';

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getEmailTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载邮件模板失败:', error);
      toast.error('加载邮件模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    if (!editingTemplate.subject || !editingTemplate.content) {
      toast.error('请填写完整的模板信息');
      return;
    }

    try {
      await updateEmailTemplate(editingTemplate.id, {
        subject: editingTemplate.subject,
        content: editingTemplate.content,
      });
      toast.success('模板已更新');
      setEditDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      console.error('更新模板失败:', error);
      toast.error(error.message || '更新失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">邮件模板</h1>
        <p className="text-muted-foreground">管理系统邮件模板</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">主题：</p>
                  <p className="text-sm text-muted-foreground">{template.subject}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">内容：</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {template.content}
                  </p>
                </div>
                {template.variables && template.variables.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">可用变量：</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.variables.map((variable) => (
                        <code
                          key={variable}
                          className="text-xs bg-muted px-2 py-1 rounded"
                        >
                          {`{{${variable}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑邮件模板</DialogTitle>
            <DialogDescription>
              修改邮件模板的主题和内容
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">邮件主题</Label>
                <Input
                  id="subject"
                  value={editingTemplate.subject}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">邮件内容</Label>
                <Textarea
                  id="content"
                  rows={10}
                  value={editingTemplate.content}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, content: e.target.value })
                  }
                />
              </div>

              {editingTemplate.variables && editingTemplate.variables.length > 0 && (
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm font-medium mb-2">可用变量：</p>
                  <div className="flex flex-wrap gap-2">
                    {editingTemplate.variables.map((variable) => (
                      <code
                        key={variable}
                        className="text-xs bg-background px-2 py-1 rounded"
                      >
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    在主题或内容中使用这些变量，系统会自动替换为实际值
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
