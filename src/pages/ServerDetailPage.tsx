import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Heart,
  Star,
  Eye,
  Users,
  Copy,
  MessageSquare,
  Flag,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import {
  getServerById,
  getServerComments,
  likeServer,
  unlikeServer,
  favoriteServer,
  unfavoriteServer,
  createComment,
  createReport,
  checkServerStatus,
  type ServerStatus,
} from '@/db/api';
import type { ServerDetail, ServerComment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const VERSION_LABELS: Record<string, string> = {
  '1.21': '1.21', '1.20': '1.20', '1.19': '1.19', '1.18': '1.18',
  '1.17': '1.17', '1.16': '1.16', '1.15': '1.15', '1.14': '1.14',
  '1.13': '1.13', '1.12': '1.12', '1.11': '1.11', '1.10': '1.10',
  '1.9': '1.9', '1.8': '1.8', '1.7': '1.7', 'other': '其他',
};

const TYPE_LABELS: Record<string, string> = {
  survival: '生存', creative: '创造', rpg: 'RPG', minigame: '小游戏',
  skyblock: '空岛', prison: '监狱', factions: '派系', other: '其他',
};

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [comments, setComments] = useState<ServerComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // 查询服务器状态
  const fetchServerStatus = async () => {
    if (!server) return;
    setCheckingStatus(true);
    try {
      // 构建服务器地址
      const serverAddress = server.port && server.port !== 25565 
        ? `${server.ip_address}:${server.port}`
        : server.ip_address;
      
      const status = await checkServerStatus(serverAddress);
      setServerStatus(status);
    } catch (error) {
      console.error('查询服务器状态失败:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [serverData, commentsData] = await Promise.all([
          getServerById(id, user?.id),
          getServerComments(id),
        ]);
        setServer(serverData);
        setComments(commentsData);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user]);

  // 服务器加载完成后查询状态
  useEffect(() => {
    if (server) {
      fetchServerStatus();
    }
  }, [server?.id]);

  const handleLike = async () => {
    if (!user || !server) {
      toast.error('请先登录');
      return;
    }

    try {
      if (server.is_liked) {
        await unlikeServer(server.id, user.id);
        setServer({ ...server, is_liked: false, like_count: (server.like_count || 0) - 1 });
        toast.success('已取消点赞');
      } else {
        await likeServer(server.id, user.id);
        setServer({ ...server, is_liked: true, like_count: (server.like_count || 0) + 1 });
        toast.success('点赞成功');
      }
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error('操作失败');
    }
  };

  const handleFavorite = async () => {
    if (!user || !server) {
      toast.error('请先登录');
      return;
    }

    try {
      if (server.is_favorited) {
        await unfavoriteServer(server.id, user.id);
        setServer({ ...server, is_favorited: false, favorite_count: (server.favorite_count || 0) - 1 });
        toast.success('已取消收藏');
      } else {
        await favoriteServer(server.id, user.id);
        setServer({ ...server, is_favorited: true, favorite_count: (server.favorite_count || 0) + 1 });
        toast.success('收藏成功');
      }
    } catch (error) {
      console.error('收藏失败:', error);
      toast.error('操作失败');
    }
  };

  const handleCopyIP = () => {
    if (!server) return;
    const ipText = server.port === 25565 ? server.ip_address : `${server.ip_address}:${server.port}`;
    navigator.clipboard.writeText(ipText);
    toast.success('已复制到剪贴板');
  };

  const handleSubmitComment = async () => {
    if (!user || !server) {
      toast.error('请先登录');
      return;
    }

    if (!commentContent.trim()) {
      toast.error('请输入评论内容');
      return;
    }

    setSubmitting(true);
    try {
      await createComment({ server_id: server.id, content: commentContent }, user.id);
      toast.success('评论已提交，等待审核');
      setCommentContent('');
    } catch (error) {
      console.error('提交评论失败:', error);
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!user || !server) {
      toast.error('请先登录');
      return;
    }

    if (!reportReason.trim()) {
      toast.error('请输入举报原因');
      return;
    }

    try {
      await createReport({ server_id: server.id, reason: reportReason }, user.id);
      toast.success('举报已提交');
      setReportReason('');
      setReportDialogOpen(false);
    } catch (error) {
      console.error('举报失败:', error);
      toast.error('举报失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="mb-4 h-8 w-32 bg-muted" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-video w-full bg-muted" />
              <Skeleton className="h-12 w-3/4 bg-muted" />
              <Skeleton className="h-32 w-full bg-muted" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">服务器不存在</p>
          <Button asChild>
            <Link to="/servers">返回列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* 返回按钮 */}
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/servers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 主要内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 图片轮播 */}
            {server.images && server.images.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {server.images.map((image) => (
                        <CarouselItem key={image.id}>
                          <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                            <img
                              src={image.image_url}
                              alt={server.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {server.images.length > 1 && (
                      <>
                        <CarouselPrevious className="left-6" />
                        <CarouselNext className="right-6" />
                      </>
                    )}
                  </Carousel>
                </CardContent>
              </Card>
            )}

            {/* 服务器信息 */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2 text-2xl">{server.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {/* 在线状态 */}
                      {serverStatus && (
                        <Badge 
                          variant={serverStatus.online ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          <span className={`h-2 w-2 rounded-full ${serverStatus.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {serverStatus.online ? '在线' : '离线'}
                        </Badge>
                      )}
                      {checkingStatus && (
                        <Badge variant="secondary">检测中...</Badge>
                      )}
                      <Badge variant="secondary">
                        {VERSION_LABELS[server.version] || server.version}
                      </Badge>
                      <Badge variant="secondary">
                        {TYPE_LABELS[server.server_type] || server.server_type}
                      </Badge>
                      {server.is_pure_public && <Badge variant="outline">纯公益</Badge>}
                      {server.requires_genuine && <Badge variant="outline">正版</Badge>}
                      {server.requires_whitelist && <Badge variant="outline">需要白名单</Badge>}
                    </div>
                  </div>
                  <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Flag className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>举报服务器</DialogTitle>
                        <DialogDescription>
                          请说明举报原因，我们会尽快处理
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason">举报原因</Label>
                          <Textarea
                            id="reason"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="请详细说明举报原因..."
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleReport}>提交举报</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{server.description}</p>

                {/* MOTD 和 Favicon 显示 */}
                {serverStatus && serverStatus.online && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    {serverStatus.favicon_url && (
                      <div className="flex items-center gap-3">
                        <img 
                          src={serverStatus.favicon_url} 
                          alt="服务器图标" 
                          className="h-16 w-16 rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">服务器图标</p>
                          <p className="text-xs text-muted-foreground">来自服务器实时查询</p>
                        </div>
                      </div>
                    )}
                    {serverStatus.motd_html && (
                      <div>
                        <p className="mb-2 text-sm font-medium">服务器MOTD</p>
                        <div 
                          className="rounded p-3 font-mono text-sm bg-[#e1e1e1cc] bg-none"
                          dangerouslySetInnerHTML={{ __html: serverStatus.motd_html }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {server.tags && server.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {server.tags.map((tag) => (
                      <span key={tag.id} className="text-sm text-muted-foreground">
                        #{tag.tag}
                      </span>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{server.view_count} 浏览</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>{server.like_count || 0} 点赞</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>{server.favorite_count || 0} 收藏</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{server.comment_count || 0} 评论</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 评论区 */}
            <Card>
              <CardHeader>
                <CardTitle>评论区</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="发表你的评论..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleSubmitComment} disabled={submitting}>
                      {submitting ? '提交中...' : '发表评论'}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                    <p className="mb-2 text-sm text-muted-foreground">登录后可以发表评论</p>
                    <Button size="sm" asChild>
                      <Link to="/login">登录</Link>
                    </Button>
                  </div>
                )}

                <Separator />

                {comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={comment.user?.avatar_url || undefined} />
                          <AvatarFallback>
                            {comment.user?.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-medium">{comment.user?.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">暂无评论</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 连接信息 */}
            <Card>
              <CardHeader>
                <CardTitle>连接信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">服务器地址</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                      {server.port === 25565 ? server.ip_address : `${server.ip_address}:${server.port}`}
                    </code>
                    <Button size="icon" variant="outline" onClick={handleCopyIP}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">在线人数</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={fetchServerStatus}
                        disabled={checkingStatus}
                      >
                        <RefreshCw className={`h-3 w-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {serverStatus?.online && serverStatus.players
                          ? `${serverStatus.players.online}/${serverStatus.players.max}`
                          : `${server.online_players}/${server.max_players || '∞'}`
                        }
                      </span>
                      {serverStatus?.online && (
                        <span className="text-xs text-green-600">• 实时</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">游戏版本</Label>
                    <p className="mt-1">
                      {serverStatus?.version || VERSION_LABELS[server.version] || server.version}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant={server.is_liked ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={handleLike}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${server.is_liked ? 'fill-current' : ''}`} />
                    {server.is_liked ? '已点赞' : '点赞'}
                  </Button>
                  <Button
                    variant={server.is_favorited ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={handleFavorite}
                  >
                    <Star className={`mr-2 h-4 w-4 ${server.is_favorited ? 'fill-current' : ''}`} />
                    {server.is_favorited ? '已收藏' : '收藏'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 服主信息 */}
            {server.owner && (
              <Card>
                <CardHeader>
                  <CardTitle>服主信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={server.owner.avatar_url || undefined} />
                      <AvatarFallback>
                        {server.owner.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{server.owner.username}</p>
                      {server.owner.bio && (
                        <p className="text-sm text-muted-foreground">{server.owner.bio}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
