import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ServerCard } from '@/components/server/ServerCard';
import { AvatarUpload, type AvatarUploadRef } from '@/components/common/AvatarUpload';
import { EmailSettingsDialog } from '@/components/common/EmailSettingsDialog';
import { ChangePasswordDialog } from '@/components/common/ChangePasswordDialog';
import { MinecraftPlayerDialog } from '@/components/common/MinecraftPlayerDialog';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFavorites, getUserComments, getUserStats, queryMCPlayer, type MCPlayerInfo } from '@/db/api';
import type { ServerDetail, ServerComment, UserStats } from '@/types';
import { Heart, MessageSquare, Server, Mail, Lock, UserCircle } from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const avatarUploadRef = useRef<AvatarUploadRef>(null);
  const [favorites, setFavorites] = useState<ServerDetail[]>([]);
  const [comments, setComments] = useState<ServerComment[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [mcPlayerDialogOpen, setMcPlayerDialogOpen] = useState(false);
  const [mcPlayerInfo, setMcPlayerInfo] = useState<MCPlayerInfo | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        const [favoritesData, commentsData, statsData] = await Promise.all([
          getUserFavorites(profile.id),
          getUserComments(profile.id),
          getUserStats(profile.id),
        ]);
        setFavorites(favoritesData);
        setComments(commentsData);
        setStats(statsData);

        // 如果用户设置了 MC 用户名，查询玩家信息
        const mcUsername = (profile as any).minecraft_username;
        if (mcUsername) {
          try {
            const playerInfo = await queryMCPlayer(mcUsername);
            setMcPlayerInfo(playerInfo);
          } catch (error) {
            console.error('查询MC玩家信息失败:', error);
          }
        } else {
          setMcPlayerInfo(null);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile]);

  const handleAvatarUploadSuccess = (_url: string) => {
    // 刷新用户资料
    refreshProfile();
  };

  const handleEmailChangeSuccess = () => {
    // 刷新用户资料
    refreshProfile();
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* 用户信息卡片 */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* 头像上传 */}
              <AvatarUpload
                ref={avatarUploadRef}
                currentAvatar={profile.avatar_url || undefined}
                onUploadSuccess={handleAvatarUploadSuccess}
                userId={profile.id}
                showButton={false}
              />
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="mb-2 text-2xl font-bold">{profile.username}</h1>
                <p className="mb-2 text-sm text-muted-foreground">
                  用户角色：{profile.role === 'admin' ? '管理员' : profile.role === 'owner' ? '服主' : '玩家'}
                </p>
                <p className="mb-2 text-sm text-muted-foreground">
                  邮箱：{profile.email || '未设置'}
                </p>
                <div className="mb-4 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    MC正版ID：{(profile as any).minecraft_username || '未设置'}
                  </p>
                  {mcPlayerInfo && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-6 w-6">
                        <AvatarImage 
                          src={`https://crafatar.com/avatars/${mcPlayerInfo.uuid}?overlay`} 
                          alt={mcPlayerInfo.username}
                        />
                        <AvatarFallback className="text-xs">{""}</AvatarFallback>
                      </Avatar>
                      <span>UUID: {mcPlayerInfo.uuid}</span>
                    </div>
                  )}
                </div>
                
                {/* 操作按钮组 */}
                <div className="mb-4 flex flex-wrap justify-center gap-2 md:justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => avatarUploadRef.current?.triggerUpload()}
                  >
                    <UserCircle className="mr-2 h-4 w-4" />
                    修改头像
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmailDialogOpen(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    修改邮箱
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPasswordDialogOpen(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    修改密码
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMcPlayerDialogOpen(true)}
                  >
                    <Server className="mr-2 h-4 w-4" />
                    设置MC ID
                  </Button>
                </div>

                {profile.bio && (
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* 统计数据 */}
            {stats && (
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-6">
                <div className="text-center">
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{stats.server_count}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">我的服务器</p>
                </div>
                <div className="text-center">
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{stats.favorite_count}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">收藏</p>
                </div>
                <div className="text-center">
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{stats.comment_count}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">评论</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 登录信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">登录信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 本次登录 */}
            {(profile as any).current_login_ip && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium">本次登录</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>IP地址：{(profile as any).current_login_ip}</p>
                  <p>地区：{(profile as any).current_login_region}</p>
                  <p>
                    时间：
                    {(profile as any).current_login_time
                      ? new Date((profile as any).current_login_time).toLocaleString('zh-CN')
                      : '未知'}
                  </p>
                </div>
              </div>
            )}

            {/* 上次登录 */}
            {(profile as any).last_login_ip && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium">上次登录</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>IP地址：{(profile as any).last_login_ip}</p>
                  <p>地区：{(profile as any).last_login_region}</p>
                  <p>
                    时间：
                    {(profile as any).last_login_time
                      ? new Date((profile as any).last_login_time).toLocaleString('zh-CN')
                      : '未知'}
                  </p>
                </div>
              </div>
            )}

            {!(profile as any).current_login_ip && !(profile as any).last_login_ip && (
              <p className="text-center text-sm text-muted-foreground">暂无登录记录</p>
            )}
          </CardContent>
        </Card>

        {/* 内容标签页 */}
        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="favorites">我的收藏</TabsTrigger>
            <TabsTrigger value="comments">我的评论</TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">加载中...</p>
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {favorites.map((server) => (
                  <ServerCard key={server.id} server={server} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="mb-4 text-muted-foreground">还没有收藏任何服务器</p>
                  <Button asChild>
                    <Link to="/servers">去浏览服务器</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">加载中...</p>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          评论于{' '}
                          <Link
                            to={`/servers/${comment.server_id}`}
                            className="text-primary hover:underline"
                          >
                            {(comment as any).server?.name || '服务器'}
                          </Link>
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                      {!comment.is_approved && (
                        <p className="mt-2 text-xs text-muted-foreground">等待审核中...</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">还没有发表任何评论</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 邮箱设置对话框 */}
        <EmailSettingsDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          currentEmail={profile.email}
          onSuccess={handleEmailChangeSuccess}
        />

        {/* 修改密码对话框 */}
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
        />

        {/* MC玩家信息对话框 */}
        <MinecraftPlayerDialog
          open={mcPlayerDialogOpen}
          onOpenChange={setMcPlayerDialogOpen}
          currentUsername={(profile as any)?.minecraft_username}
          onSuccess={refreshProfile}
        />
      </div>
    </div>
  );
}
