import { supabase } from '@/db/supabase';
import type {
  Profile,
  Server,
  ServerDetail,
  ServerImage,
  ServerTag,
  ServerComment,
  ServerReport,
  ServerFilter,
  PaginationParams,
  PaginatedResult,
  ServerFormData,
  CommentFormData,
  ReportFormData,
  UserStats,
  SmtpConfig,
  EmailTemplate,
  VerificationCode,
  ServerEditRequest,
  SiteSettings,
} from '@/types';

// ==================== 用户相关 ====================

/**
 * 获取当前用户资料
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 更新用户资料
 */
export async function updateProfile(id: string, updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>): Promise<Profile> {
  // @ts-ignore - Supabase类型推断问题
  const { data, error } = await supabase
    .from('profiles')
    // @ts-ignore
    // @ts-ignore
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 获取用户统计数据
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [serverCount, favoriteCount, commentCount] = await Promise.all([
    supabase.from('servers').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('server_favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('server_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    server_count: serverCount.count || 0,
    favorite_count: favoriteCount.count || 0,
    comment_count: commentCount.count || 0,
  };
}

// ==================== 服务器相关 ====================

/**
 * 获取服务器列表（带筛选和分页）
 */
export async function getServers(
  filter: ServerFilter = {},
  pagination: PaginationParams = { page: 1, pageSize: 12 }
): Promise<PaginatedResult<ServerDetail>> {
  let query = supabase
    .from('servers')
    .select(`
      *,
      owner:profiles!owner_id(id, username, avatar_url),
      images:server_images(id, image_url, is_primary, display_order),
      tags:server_tags(id, tag)
    `, { count: 'exact' })
    .eq('status', 'approved');

  // 应用筛选条件
  if (filter.version) {
    query = query.eq('version', filter.version);
  }
  if (filter.server_type) {
    query = query.eq('server_type', filter.server_type);
  }
  if (filter.is_pure_public !== undefined) {
    query = query.eq('is_pure_public', filter.is_pure_public);
  }
  if (filter.requires_whitelist !== undefined) {
    query = query.eq('requires_whitelist', filter.requires_whitelist);
  }
  if (filter.requires_genuine !== undefined) {
    query = query.eq('requires_genuine', filter.requires_genuine);
  }
  if (filter.search) {
    query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
  }

  // 排序
  if (filter.sort === 'popular') {
    query = query.order('view_count', { ascending: false });
  } else if (filter.sort === 'featured') {
    query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // 分页
  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []) as ServerDetail[],
    total: count || 0,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil((count || 0) / pagination.pageSize),
  };
}

/**
 * 获取推荐服务器
 */
export async function getFeaturedServers(limit = 6): Promise<ServerDetail[]> {
  const { data, error } = await supabase
    .from('servers')
    .select(`
      *,
      owner:profiles!owner_id(id, username, avatar_url),
      images:server_images(id, image_url, is_primary, display_order),
      tags:server_tags(id, tag)
    `)
    .eq('status', 'approved')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ServerDetail[];
}

/**
 * 获取最新服务器
 */
export async function getLatestServers(limit = 6): Promise<ServerDetail[]> {
  const { data, error } = await supabase
    .from('servers')
    .select(`
      *,
      owner:profiles!owner_id(id, username, avatar_url),
      images:server_images(id, image_url, is_primary, display_order),
      tags:server_tags(id, tag)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ServerDetail[];
}

/**
 * 获取服务器详情
 */
export async function getServerById(id: string, userId?: string): Promise<ServerDetail | null> {
  const { data, error } = await supabase
    .from('servers')
    .select(`
      *,
      owner:profiles!owner_id(id, username, avatar_url, bio),
      images:server_images(id, image_url, is_primary, display_order),
      tags:server_tags(id, tag)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // 获取点赞、收藏、评论数量
  const [likeCount, favoriteCount, commentCount] = await Promise.all([
    supabase.from('server_likes').select('id', { count: 'exact', head: true }).eq('server_id', id),
    supabase.from('server_favorites').select('id', { count: 'exact', head: true }).eq('server_id', id),
    supabase.from('server_comments').select('id', { count: 'exact', head: true }).eq('server_id', id).eq('is_approved', true),
  ]);

  // @ts-ignore
  const serverDetail: ServerDetail = {
    // @ts-ignore
    ...data,
    like_count: likeCount.count || 0,
    favorite_count: favoriteCount.count || 0,
    comment_count: commentCount.count || 0,
  };

  // 如果用户已登录，检查是否已点赞/收藏
  if (userId) {
    const [isLiked, isFavorited] = await Promise.all([
      supabase.from('server_likes').select('id').eq('server_id', id).eq('user_id', userId).maybeSingle(),
      supabase.from('server_favorites').select('id').eq('server_id', id).eq('user_id', userId).maybeSingle(),
    ]);

    serverDetail.is_liked = !!isLiked.data;
    serverDetail.is_favorited = !!isFavorited.data;
  }

  // 增加浏览量
  // @ts-ignore - Supabase类型推断问题
  await supabase.from('servers').update({ view_count: (data as any).view_count + 1 } as any).eq('id', id);

  return serverDetail;
}

/**
 * 创建服务器
 */
export async function createServer(formData: ServerFormData, ownerId: string): Promise<Server> {
  const { images, tags, ...serverData } = formData;

  // @ts-ignore - Supabase类型推断问题
  const { data: server, error } = await supabase
    .from('servers')
    // @ts-ignore
    .insert([{
      ...serverData,
      owner_id: ownerId,
    } as any])
    .select()
    .single();

  if (error) throw error;

  // 添加标签
  if (tags.length > 0) {
    // @ts-ignore
    const tagData = tags.map(tag => ({
      // @ts-ignore
      server_id: server.id,
      tag,
    }));
    // @ts-ignore - Supabase类型推断问题
    await supabase.from('server_tags').insert(tagData as any);
  }

  return server;
}

/**
 * 更新服务器
 */
export async function updateServer(id: string, updates: Partial<Omit<Server, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>): Promise<Server> {
  // @ts-ignore - Supabase类型推断问题
  const { data, error } = await supabase
    .from('servers')
    // @ts-ignore
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 删除服务器
 */
export async function deleteServer(id: string): Promise<void> {
  const { error } = await supabase
    .from('servers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * 获取用户的服务器列表
 */
export async function getUserServers(userId: string): Promise<ServerDetail[]> {
  const { data, error } = await supabase
    .from('servers')
    .select(`
      *,
      images:server_images(id, image_url, is_primary, display_order),
      tags:server_tags(id, tag)
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ServerDetail[];
}

// ==================== 服务器图片相关 ====================

/**
 * 添加服务器图片
 */
export async function addServerImage(serverId: string, imageUrl: string, isPrimary = false): Promise<ServerImage> {
  // @ts-ignore - Supabase类型推断问题
  const { data, error } = await supabase
    .from('server_images')
    // @ts-ignore
    .insert([{
      server_id: serverId,
      image_url: imageUrl,
      is_primary: isPrimary,
    } as any])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 删除服务器图片
 */
export async function deleteServerImage(id: string): Promise<void> {
  const { error } = await supabase
    .from('server_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==================== 服务器标签相关 ====================

/**
 * 添加服务器标签
 */
export async function addServerTag(serverId: string, tag: string): Promise<ServerTag> {
  // @ts-ignore - Supabase类型推断问题
  const { data, error } = await supabase
    .from('server_tags')
    // @ts-ignore
    .insert([{
      server_id: serverId,
      tag,
    } as any])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 删除服务器标签
 */
export async function deleteServerTag(id: string): Promise<void> {
  const { error } = await supabase
    .from('server_tags')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==================== 点赞相关 ====================

/**
 * 点赞服务器
 */
export async function likeServer(serverId: string, userId: string): Promise<void> {
  // @ts-ignore - Supabase类型推断问题
  const { error } = await supabase
    .from('server_likes')
    // @ts-ignore
    .insert([{
      server_id: serverId,
      user_id: userId,
    } as any]);

  if (error) throw error;
}

/**
 * 取消点赞
 */
export async function unlikeServer(serverId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('server_likes')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ==================== 收藏相关 ====================

/**
 * 收藏服务器
 */
export async function favoriteServer(serverId: string, userId: string): Promise<void> {
  // @ts-ignore - Supabase类型推断问题
  const { error } = await supabase
    .from('server_favorites')
    // @ts-ignore
    .insert([{
      server_id: serverId,
      user_id: userId,
    } as any]);

  if (error) throw error;
}

/**
 * 取消收藏
 */
export async function unfavoriteServer(serverId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('server_favorites')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * 获取用户收藏的服务器
 */
export async function getUserFavorites(userId: string): Promise<ServerDetail[]> {
  const { data, error } = await supabase
    .from('server_favorites')
    .select(`
      server:servers!server_id(
        *,
        owner:profiles!owner_id(id, username, avatar_url),
        images:server_images(id, image_url, is_primary, display_order),
        tags:server_tags(id, tag)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data || []).map((item: any) => item.server).filter(Boolean)) as ServerDetail[];
}

// ==================== 评论相关 ====================

/**
 * 获取服务器评论
 */
export async function getServerComments(serverId: string): Promise<ServerComment[]> {
  const { data, error } = await supabase
    .from('server_comments')
    .select(`
      *,
      user:profiles!user_id(id, username, avatar_url)
    `)
    .eq('server_id', serverId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ServerComment[];
}

/**
 * 创建评论
 */
export async function createComment(formData: CommentFormData, userId: string): Promise<ServerComment> {
  // @ts-ignore - Supabase类型推断问题
  const { data, error } = await supabase
    .from('server_comments')
    // @ts-ignore
    .insert([{
      ...formData,
      user_id: userId,
    } as any])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 删除评论
 */
export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('server_comments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * 获取用户的评论
 */
export async function getUserComments(userId: string): Promise<ServerComment[]> {
  const { data, error } = await supabase
    .from('server_comments')
    .select(`
      *,
      server:servers!server_id(id, name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ServerComment[];
}

// ==================== 举报相关 ====================

/**
 * 创建举报
 */
export async function createReport(formData: ReportFormData, reporterId: string): Promise<ServerReport> {
  // @ts-ignore - Supabase类型推断问题
  const { data, error } = await supabase
    .from('server_reports')
    // @ts-ignore
    .insert([{
      ...formData,
      reporter_id: reporterId,
    } as any])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== 管理员相关 ====================

/**
 * 获取待审核的服务器
 */
export async function getPendingServers(): Promise<ServerDetail[]> {
  const { data, error } = await supabase
    .from('servers')
    .select(`
      *,
      owner:profiles!owner_id(id, username, avatar_url),
      images:server_images(id, image_url, is_primary, display_order),
      tags:server_tags(id, tag)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ServerDetail[];
}

/**
 * 审核服务器
 */
export async function approveServer(id: string, approved: boolean): Promise<void> {
  // @ts-ignore - Supabase类型推断问题
  const { error } = await supabase
    .from('servers')
    // @ts-ignore
    .update({
      status: approved ? 'approved' : 'rejected',
    } as any)
    .eq('id', id);

  if (error) throw error;
}

/**
 * 获取待审核的评论
 */
export async function getPendingComments(): Promise<ServerComment[]> {
  const { data, error } = await supabase
    .from('server_comments')
    .select(`
      *,
      user:profiles!user_id(id, username, avatar_url),
      server:servers!server_id(id, name)
    `)
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ServerComment[];
}

/**
 * 审核评论
 */
export async function approveComment(id: string, approved: boolean): Promise<void> {
  if (approved) {
    // @ts-ignore - Supabase类型推断问题
    const { error } = await supabase
      .from('server_comments')
      // @ts-ignore
      .update({ is_approved: true } as any)
      .eq('id', id);

    if (error) throw error;
  } else {
    await deleteComment(id);
  }
}

/**
 * 获取所有举报
 */
export async function getAllReports(): Promise<ServerReport[]> {
  const { data, error } = await supabase
    .from('server_reports')
    .select(`
      *,
      reporter:profiles!reporter_id(id, username),
      server:servers!server_id(id, name),
      comment:server_comments!comment_id(id, content)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ServerReport[];
}

/**
 * 处理举报
 */
export async function handleReport(id: string, handlerId: string): Promise<void> {
  // @ts-ignore - Supabase类型推断问题
  const { error } = await supabase
    .from('server_reports')
    // @ts-ignore
    .update({
      status: 'handled',
      handled_by: handlerId,
      handled_at: new Date().toISOString(),
    } as any)
    .eq('id', id);

  if (error) throw error;
}

/**
 * 获取所有用户（管理员）
 */
export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 更新用户角色（管理员）
 */
export async function updateUserRole(userId: string, role: string): Promise<void> {
  // @ts-ignore - Supabase类型推断问题
  const { error } = await supabase
    .from('profiles')
    // @ts-ignore
    .update({ role } as any)
    .eq('id', userId);

  if (error) throw error;
}

// ==================== SMTP配置相关 ====================

/**
 * 获取SMTP配置
 */
export async function getSmtpConfig() {
  const { data, error } = await supabase
    .from('smtp_config')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 创建或更新SMTP配置
 */
export async function upsertSmtpConfig(config: Partial<SmtpConfig>) {
  // 先禁用所有配置
  await supabase
    .from('smtp_config')
    // @ts-ignore
    .update({ is_active: false })
    .eq('is_active', true);

  // 插入新配置
  const { data, error } = await supabase
    .from('smtp_config')
    // @ts-ignore
    .insert(config as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== 站点设置相关 ====================

/**
 * 获取站点设置
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  
  if (!data) {
    // 如果没有数据，返回默认值
    return {
      id: 1,
      contact_email: 'admin@example.com',
      qq_group: '123456789',
      qq_group_link: null,
      updated_at: new Date().toISOString()
    };
  }

  return data as SiteSettings;
}

/**
 * 更新站点设置
 */
export async function updateSiteSettings(updates: Partial<Omit<SiteSettings, 'id' | 'updated_at'>>): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    // @ts-ignore
    .update(updates)
    .eq('id', 1)
    .select()
    .single();

  if (error) throw error;
  return data as SiteSettings;
}

/**
 * 测试SMTP配置
 */
export async function testSmtpConfig(testEmail: string) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: testEmail,
      subject: 'SMTP配置测试',
      content: '这是一封测试邮件，如果您收到此邮件，说明SMTP配置正确。',
    },
  });

  if (error) throw error;
  return data;
}

// ==================== 服务器状态查询 ====================

export interface ServerStatus {
  online: boolean;
  players?: {
    online: number;
    max: number;
  };
  version?: string;
  motd?: string;
  motd_html?: string;
  favicon_url?: string;
  ip?: string;
  port?: number;
  error?: string;
}

/**
 * 查询MC服务器在线状态（使用新API）
 */
export async function checkServerStatus(serverAddress: string): Promise<ServerStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('query-mc-server', {
      body: { server: serverAddress },
    });

    if (error) {
      console.error('查询服务器状态失败:', error);
      return { online: false, error: error.message };
    }

    if (!data.success) {
      return { online: false, error: data.error || '查询失败' };
    }

    const serverData = data.data;
    return {
      online: serverData.online,
      players: {
        online: serverData.players,
        max: serverData.max_players,
      },
      version: serverData.version,
      motd: serverData.motd_clean,
      motd_html: serverData.motd_html,
      favicon_url: serverData.favicon_url,
      ip: serverData.ip,
      port: serverData.port,
    };
  } catch (error) {
    console.error('查询服务器状态异常:', error);
    return { 
      online: false, 
      error: error instanceof Error ? error.message : '查询失败' 
    };
  }
}

// ==================== MC玩家信息查询 ====================

export interface MCPlayerInfo {
  username: string;
  uuid: string;
  skin_url: string;
}

/**
 * 查询MC玩家信息
 */
export async function queryMCPlayer(username: string): Promise<MCPlayerInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke('query-mc-player', {
      body: { username },
    });

    if (error) {
      console.error('查询玩家信息失败:', error);
      throw new Error(error.message);
    }

    if (!data.success) {
      throw new Error(data.error || '查询失败');
    }

    return data.data;
  } catch (error) {
    console.error('查询玩家信息异常:', error);
    throw error;
  }
}

/**
 * 更新用户的 Minecraft 用户名
 */
export async function updateMinecraftUsername(username: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 先验证用户名是否有效
  await queryMCPlayer(username);

  // 更新到数据库
  const { error } = await supabase
    .from('profiles')
    // @ts-ignore
    .update({ minecraft_username: username })
    .eq('id', user.id);

  if (error) throw error;
}

/**
 * 清除用户的 Minecraft 用户名
 */
export async function clearMinecraftUsername() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { error } = await supabase
    .from('profiles')
    // @ts-ignore
    .update({ minecraft_username: null })
    .eq('id', user.id);

  if (error) throw error;
}

// ==================== QQ头像获取 ====================

/**
 * 获取QQ邮箱头像
 */
export async function fetchQQAvatar(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-qq-avatar', {
      body: { email },
    });

    if (error || !data?.success) {
      console.log('获取QQ头像失败:', error || data?.error);
      return null;
    }

    return data.avatarUrl;
  } catch (error) {
    console.error('获取QQ头像异常:', error);
    return null;
  }
}

// ==================== 登录信息管理 ====================

export interface IPInfo {
  ip: string;
  region: string;
  isp?: string;
  llc?: string;
  asn?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * 查询当前IP信息
 */
export async function queryMyIP(): Promise<IPInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke('query-my-ip');

    if (error || !data?.success) {
      console.error('查询IP信息失败:', error || data?.error);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('查询IP信息异常:', error);
    return null;
  }
}

/**
 * 更新用户登录信息
 */
export async function updateLoginInfo(userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('update-login-info', {
      body: { user_id: userId },
    });

    if (error || !data?.success) {
      console.error('更新登录信息失败:', error || data?.error);
      return;
    }

    return data.data;
  } catch (error) {
    console.error('更新登录信息异常:', error);
  }
}

// ==================== 服务器编辑请求 ====================

/**
 * 创建服务器编辑请求
 */
export async function createServerEditRequest(
  serverId: string,
  ownerId: string,
  changes: Record<string, any>
) {
  const { data, error } = await supabase
    .from('server_edit_requests')
    .insert({
      server_id: serverId,
      owner_id: ownerId,
      changes,
      status: 'pending',
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 获取所有待审核的编辑请求
 */
export async function getPendingEditRequests() {
  const { data, error } = await supabase
    .from('server_edit_requests')
    .select(`
      *,
      server:servers!server_id(id, name),
      owner:profiles!owner_id(id, username, avatar_url)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 审核服务器编辑请求
 */
export async function reviewServerEditRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminNote?: string
) {
  const { data: request, error: fetchError } = await supabase
    .from('server_edit_requests')
    .select('*, server:servers!server_id(*)')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;

  // 如果批准，应用修改到服务器
  if (status === 'approved' && (request as any).changes) {
    const { error: updateError } = await (supabase
      .from('servers') as any)
      .update((request as any).changes)
      .eq('id', (request as any).server_id);

    if (updateError) throw updateError;
  }

  // 更新请求状态
  const { data, error } = await (supabase
    .from('server_edit_requests') as any)
    .update({
      status,
      admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 发送邮件通知
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  content: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, content },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('发送邮件失败:', error);
    throw error;
  }
}

/**
 * 获取所有管理员邮箱
 */
export async function getAdminEmails(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'admin')
    .not('email', 'is', null);

  if (error) {
    console.error('获取管理员邮箱失败:', error);
    return [];
  }

  return (data as any[]).map(profile => profile.email).filter(Boolean) as string[];
}

// ==================== 邮件模板相关 ====================

/**
 * 获取所有邮件模板
 */
export async function getEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 获取单个邮件模板
 */
export async function getEmailTemplate(id: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 更新邮件模板
 */
export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>) {
  const { data, error } = await supabase
    .from('email_templates')
    // @ts-ignore
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== 验证码相关 ====================

/**
 * 发送邮箱验证码
 */
export async function sendVerificationCode(email: string, type: 'email_change' | 'email_verify' | 'password_reset') {
  let userId: string | null = null;
  let username = '用户';

  // 对于密码重置，不需要登录状态
  if (type === 'password_reset') {
    // 查找用户（不区分大小写）
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('email', email.trim())
      .maybeSingle();

    console.log('查找用户结果:', { email: email.trim(), profile, error });

    if (!profile) throw new Error('该邮箱未注册');
    
    userId = (profile as any).id;
    username = (profile as any).username;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');
    
    userId = user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    username = (profile as any)?.username || '用户';
  }

  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 保存验证码
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10分钟有效期

  const { error: insertError } = await supabase
    .from('verification_codes')
    // @ts-ignore
    .insert({
      user_id: userId,
      email,
      code,
      type,
      expires_at: expiresAt.toISOString(),
    } as any);

  if (insertError) throw insertError;

  // 发送邮件
  const subject = type === 'password_reset' ? '密码重置验证码' : '邮箱验证码';
  
  const { error: emailError } = await supabase.functions.invoke('send-email', {
    body: {
      to: email,
      templateName: 'verification_code',
      subject,
      variables: {
        code,
        username,
      },
    },
  });

  if (emailError) throw emailError;
}

/**
 * 验证验证码
 */
export async function verifyCode(email: string, code: string, type: 'email_change' | 'email_verify' | 'password_reset') {
  const trimmedEmail = email.trim();
  
  let query = supabase
    .from('verification_codes')
    .select('*')
    .ilike('email', trimmedEmail)
    .eq('code', code)
    .eq('type', type)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString());

  // 对于密码重置，不需要登录状态和验证 user_id
  if (type !== 'password_reset') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('验证码无效或已过期');

  // 标记为已使用
  await supabase
    .from('verification_codes')
    // @ts-ignore
    .update({ used: true })
    .eq('id', (data as any).id);

  return true;
}

/**
 * 修改用户邮箱
 */
export async function changeUserEmail(newEmail: string, code: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  // 验证验证码
  await verifyCode(newEmail, code, 'email_change');

  // 更新邮箱
  const { error } = await supabase
    .from('profiles')
    // @ts-ignore
    .update({ email: newEmail })
    .eq('id', user.id);

  if (error) throw error;
}

/**
 * 使用验证码重置密码
 */
export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  // 验证验证码
  await verifyCode(email.trim(), code, 'password_reset');

  // 查找用户（不区分大小写）
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('email', email.trim())
    .maybeSingle();

  if (!profile) throw new Error('用户不存在');

  const authEmail = `${(profile as any).username}@miaoda.com`;

  // 使用 RPC 调用重置密码
  const { error } = await (supabase.rpc as any)('reset_user_password', {
    user_email: authEmail,
    new_password: newPassword,
  });

  if (error) {
    console.error('重置密码失败:', error);
    throw new Error('重置密码失败，请稍后重试');
  }
}

// ==================== 服务器修改申请相关 ====================

/**
 * 提交服务器修改申请
 */
export async function submitServerEditRequest(serverId: string, changes: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('server_edit_requests')
    // @ts-ignore
    .insert({
      server_id: serverId,
      owner_id: user.id,
      changes,
      status: 'pending',
    } as any)
    .select()
    .single();

  if (error) throw error;

  // 发送邮件通知管理员
  const { data: server } = await supabase
    .from('servers')
    .select('name')
    .eq('id', serverId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  // 获取所有管理员邮箱
  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'admin');

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      if ((admin as any).email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: (admin as any).email,
            templateName: 'server_submitted',
            subject: '新服务器修改申请',
            variables: {
              username: (profile as any)?.username || '用户',
              server_name: (server as any)?.name || '未知服务器',
              server_id: serverId,
            },
          },
        });
      }
    }
  }

  return data;
}

/**
 * 获取服务器修改申请列表
 */
export async function getServerEditRequests(serverId?: string) {
  let query = supabase
    .from('server_edit_requests')
    .select('*, server:servers(id, name), owner:profiles!owner_id(id, username)')
    .order('created_at', { ascending: false });

  if (serverId) {
    query = query.eq('server_id', serverId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

