import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  getPendingServers,
  getPendingComments,
  getPendingEditRequests,
  getAllReports,
  getAllUsers,
  approveServer,
  approveComment,
  reviewServerEditRequest,
  handleReport,
  updateUserRole,
  sendEmailNotification,
} from '@/db/api';
import type { ServerDetail, ServerComment, ServerReport, Profile, ServerEditRequest } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, X, Eye, Edit } from 'lucide-react';

export default function AdminPage() {
  const { profile } = useAuth();
  const [pendingServers, setPendingServers] = useState<ServerDetail[]>([]);
  const [pendingComments, setPendingComments] = useState<ServerComment[]>([]);
  const [editRequests, setEditRequests] = useState<ServerEditRequest[]>([]);
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServerEditRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [serversData, commentsData, editRequestsData, reportsData, usersData] = await Promise.all([
        getPendingServers(),
        getPendingComments(),
        getPendingEditRequests(),
        getAllReports(),
        getAllUsers(),
      ]);
      setPendingServers(serversData);
      setPendingComments(commentsData);
      setEditRequests(editRequestsData);
      setReports(reportsData);
      setUsers(usersData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveServer = async (id: string, approved: boolean) => {
    try {
      const server = pendingServers.find(s => s.id === id);
      await approveServer(id, approved);
      toast.success(approved ? '已通过审核' : '已拒绝');
      
      // 发送邮件通知服主
      if (server?.owner?.email) {
        try {
          await sendEmailNotification(
            server.owner.email,
            approved ? '服务器审核通过' : '服务器审核未通过',
            approved 
              ? `恭喜！您的服务器"${server.name}"已通过审核，现在可以在平台上展示了。`
              : `很抱歉，您的服务器"${server.name}"未通过审核。`
          );
        } catch (error) {
          console.error('发送邮件通知失败:', error);
        }
      }
      
      loadData();
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const handleReviewEditRequest = async (approved: boolean) => {
    if (!selectedRequest) return;

    try {
      await reviewServerEditRequest(
        selectedRequest.id,
        approved ? 'approved' : 'rejected',
        adminNote
      );
      
      toast.success(approved ? '已批准编辑请求' : '已拒绝编辑请求');
      
      // 发送邮件通知服主
      if (selectedRequest.owner?.email) {
        try {
          await sendEmailNotification(
            selectedRequest.owner.email,
            approved ? '服务器编辑请求已批准' : '服务器编辑请求被拒绝',
            approved 
              ? `您的服务器编辑请求已被批准，修改已生效。${adminNote ? `\n管理员备注：${adminNote}` : ''}`
              : `您的服务器编辑请求被拒绝。${adminNote ? `\n原因：${adminNote}` : ''}`
          );
        } catch (error) {
          console.error('发送邮件通知失败:', error);
        }
      }
      
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setAdminNote('');
      loadData();
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const handleApproveComment = async (id: string, approved: boolean) => {
    try {
      await approveComment(id, approved);
      toast.success(approved ? '已通过审核' : '已删除');
      loadData();
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const handleReportAction = async (id: string) => {
    if (!profile) return;

    try {
      await handleReport(id, profile.id);
      toast.success('已处理');
      loadData();
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, role);
      toast.success('角色已更新');
      loadData();
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">无权访问</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">管理后台</h1>
            <p className="text-muted-foreground">管理平台内容和用户</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">

            </Button>
            <Button asChild variant="outline">

            </Button>
          </div>
        </div>

        <Tabs defaultValue="servers" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="servers">
              服务器审核
              {pendingServers.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingServers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="edits">
              编辑请求
              {editRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {editRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="comments">
              评论审核
              {pendingComments.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingComments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports">
              举报处理
              {reports.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {reports.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">用户管理</TabsTrigger>
          </TabsList>

          {/* 服务器审核 */}
          <TabsContent value="servers" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">加载中...</p>
            ) : pendingServers.length > 0 ? (
              <div className="space-y-4">
                {pendingServers.map((server) => (
                  <Card key={server.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle>{server.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            服主: {server.owner?.username}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link to={`/servers/${server.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看
                            </Link>
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveServer(server.id, true)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            通过
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleApproveServer(server.id, false)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            拒绝
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{server.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{server.version}</Badge>
                        <Badge variant="secondary">{server.server_type}</Badge>
                        {server.is_pure_public && <Badge variant="outline">纯公益</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无待审核的服务器</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 编辑请求审核 */}
          <TabsContent value="edits" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">加载中...</p>
            ) : editRequests.length > 0 ? (
              <div className="space-y-4">
                {editRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {request.server?.name || '未知服务器'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            服主：{request.owner?.username || '未知'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            提交时间：{new Date(request.created_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <Badge>待审核</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">修改内容：</h4>
                        <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-60">
                          {JSON.stringify(request.changes, null, 2)}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          审核
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无待审核的编辑请求</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 评论审核 */}
          <TabsContent value="comments" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">加载中...</p>
            ) : pendingComments.length > 0 ? (
              <div className="space-y-4">
                {pendingComments.map((comment) => (
                  <Card key={comment.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {comment.user?.username} 评论于{' '}
                            <Link
                              to={`/servers/${comment.server_id}`}
                              className="text-primary hover:underline"
                            >
                              {(comment as any).server?.name || '服务器'}
                            </Link>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveComment(comment.id, true)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            通过
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleApproveComment(comment.id, false)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            删除
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{comment.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无待审核的评论</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 举报处理 */}
          <TabsContent value="reports" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">加载中...</p>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {report.reporter?.username} 举报了{' '}
                            {report.server_id ? (
                              <Link
                                to={`/servers/${report.server_id}`}
                                className="text-primary hover:underline"
                              >
                                服务器
                              </Link>
                            ) : (
                              '评论'
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                            {report.status === 'pending' ? '待处理' : '已处理'}
                          </Badge>
                          {report.status === 'pending' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleReportAction(report.id)}
                            >
                              标记已处理
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        <span className="font-medium">举报原因：</span>
                        {report.reason}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无举报</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 用户管理 */}
          <TabsContent value="users" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">加载中...</p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户名</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>注册时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? '管理员' : user.role === 'owner' ? '服主' : '玩家'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {user.id !== profile.id && (
                              <Select
                                value={user.role}
                                onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="player">玩家</SelectItem>
                                  <SelectItem value="owner">服主</SelectItem>
                                  <SelectItem value="admin">管理员</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 编辑请求审核对话框 */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>审核编辑请求</DialogTitle>
              <DialogDescription>
                审核服主提交的服务器编辑请求
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <Label>服务器名称</Label>
                  <p className="text-sm mt-1">{selectedRequest.server?.name}</p>
                </div>
                <div>
                  <Label>服主</Label>
                  <p className="text-sm mt-1">{selectedRequest.owner?.username}</p>
                </div>
                <div>
                  <Label>修改内容</Label>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40 mt-1">
                    {JSON.stringify(selectedRequest.changes, null, 2)}
                  </pre>
                </div>
                <div>
                  <Label htmlFor="admin-note">管理员备注（可选）</Label>
                  <Textarea
                    id="admin-note"
                    placeholder="输入审核备注..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReviewDialogOpen(false);
                  setSelectedRequest(null);
                  setAdminNote('');
                }}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReviewEditRequest(false)}
              >
                拒绝
              </Button>
              <Button onClick={() => handleReviewEditRequest(true)}>
                批准
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
