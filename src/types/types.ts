// 用户角色类型
export type UserRole = 'player' | 'owner' | 'admin';

// 服务器状态类型
export type ServerStatus = 'pending' | 'approved' | 'rejected' | 'offline';

// 服务器类型
export type ServerType = 'survival' | 'creative' | 'rpg' | 'minigame' | 'skyblock' | 'prison' | 'factions' | 'other';

// 游戏版本类型
export type GameVersion = '1.21' | '1.20' | '1.19' | '1.18' | '1.17' | '1.16' | '1.15' | '1.14' | '1.13' | '1.12' | '1.11' | '1.10' | '1.9' | '1.8' | '1.7' | 'other';

// 用户资料
export interface Profile {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// 服务器
export interface Server {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  ip_address: string;
  port: number;
  version: GameVersion;
  server_type: ServerType;
  is_pure_public: boolean;
  requires_whitelist: boolean;
  requires_genuine: boolean;
  max_players: number | null;
  online_players: number;
  status: ServerStatus;
  featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// 服务器详情（包含关联数据）
export interface ServerDetail extends Server {
  owner?: Profile;
  images?: ServerImage[];
  tags?: ServerTag[];
  like_count?: number;
  favorite_count?: number;
  comment_count?: number;
  is_liked?: boolean;
  is_favorited?: boolean;
}

// 服务器图片
export interface ServerImage {
  id: string;
  server_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

// 服务器标签
export interface ServerTag {
  id: string;
  server_id: string;
  tag: string;
  created_at: string;
}

// 服务器点赞
export interface ServerLike {
  id: string;
  server_id: string;
  user_id: string;
  created_at: string;
}

// 服务器收藏
export interface ServerFavorite {
  id: string;
  server_id: string;
  user_id: string;
  created_at: string;
}

// 服务器评论
export interface ServerComment {
  id: string;
  server_id: string;
  user_id: string;
  content: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

// 服务器举报
export interface ServerReport {
  id: string;
  server_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: string;
  status: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  reporter?: Profile;
  server?: Server;
  comment?: ServerComment;
}

// 筛选条件
export interface ServerFilter {
  version?: GameVersion;
  server_type?: ServerType;
  is_pure_public?: boolean;
  requires_whitelist?: boolean;
  requires_genuine?: boolean;
  search?: string;
  sort?: 'latest' | 'popular' | 'featured';
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 服务器表单数据
export interface ServerFormData {
  name: string;
  description: string;
  ip_address: string;
  port: number;
  version: GameVersion;
  server_type: ServerType;
  is_pure_public: boolean;
  requires_whitelist: boolean;
  requires_genuine: boolean;
  max_players: number | null;
  tags: string[];
  images: File[];
}

// 评论表单数据
export interface CommentFormData {
  server_id: string;
  content: string;
}

// 举报表单数据
export interface ReportFormData {
  server_id?: string;
  comment_id?: string;
  reason: string;
}

// 用户统计
export interface UserStats {
  server_count: number;
  favorite_count: number;
  comment_count: number;
}

// SMTP配置
export interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 邮件模板
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  description: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

// 验证码
export interface VerificationCode {
  id: string;
  user_id: string;
  email: string;
  code: string;
  type: 'email_change' | 'email_verify';
  expires_at: string;
  used: boolean;
  created_at: string;
}

// 服务器修改申请
export interface ServerEditRequest {
  id: string;
  server_id: string;
  owner_id: string;
  changes: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  server?: Server;
  owner?: Profile;
}

// 站点设置
export interface SiteSettings {
  id: number;
  contact_email: string;
  qq_group: string;
  qq_group_link: string | null;
  updated_at: string;
}

// 服务器编辑请求
export interface ServerEditRequest {
  id: string;
  server_id: string;
  owner_id: string;
  changes: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  server?: Server;
  owner?: Profile;
}

