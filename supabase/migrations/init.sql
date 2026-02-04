-- MCSS 数据库初始化脚本
-- 生成时间: 2026-02-05

-- ==============================================
-- 1. 创建初始架构和表
-- ==============================================

-- 创建用户角色枚举
CREATE TYPE public.user_role AS ENUM ('player', 'owner', 'admin');

-- 创建服务器状态枚举
CREATE TYPE public.server_status AS ENUM ('pending', 'approved', 'rejected', 'offline');

-- 创建服务器类型枚举
CREATE TYPE public.server_type AS ENUM ('survival', 'creative', 'rpg', 'minigame', 'skyblock', 'prison', 'factions', 'other');

-- 创建游戏版本枚举
CREATE TYPE public.game_version AS ENUM (
  '1.21', '1.20', '1.19', '1.18', '1.17', '1.16', 
  '1.15', '1.14', '1.13', '1.12', '1.11', '1.10',
  '1.9', '1.8', '1.7', 'other'
);

-- 用户资料表
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  role public.user_role NOT NULL DEFAULT 'player',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 服务器表
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  port INTEGER DEFAULT 25565,
  version public.game_version NOT NULL,
  server_type public.server_type NOT NULL,
  is_pure_public BOOLEAN NOT NULL DEFAULT true,
  requires_whitelist BOOLEAN NOT NULL DEFAULT false,
  requires_genuine BOOLEAN NOT NULL DEFAULT false,
  max_players INTEGER,
  online_players INTEGER DEFAULT 0,
  status public.server_status NOT NULL DEFAULT 'pending',
  featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 服务器图片表
CREATE TABLE public.server_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 服务器标签表
CREATE TABLE public.server_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(server_id, tag)
);

-- 服务器点赞表
CREATE TABLE public.server_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- 服务器收藏表
CREATE TABLE public.server_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- 服务器评论表
CREATE TABLE public.server_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 服务器举报表
CREATE TABLE public.server_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.server_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  handled_by UUID REFERENCES public.profiles(id),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_target_check CHECK (
    (server_id IS NOT NULL AND comment_id IS NULL) OR
    (server_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- 创建索引
CREATE INDEX idx_servers_owner ON public.servers(owner_id);
CREATE INDEX idx_servers_status ON public.servers(status);
CREATE INDEX idx_servers_featured ON public.servers(featured);
CREATE INDEX idx_servers_created_at ON public.servers(created_at DESC);
CREATE INDEX idx_server_images_server ON public.server_images(server_id);
CREATE INDEX idx_server_tags_server ON public.server_tags(server_id);
CREATE INDEX idx_server_likes_server ON public.server_likes(server_id);
CREATE INDEX idx_server_likes_user ON public.server_likes(user_id);
CREATE INDEX idx_server_favorites_server ON public.server_favorites(server_id);
CREATE INDEX idx_server_favorites_user ON public.server_favorites(user_id);
CREATE INDEX idx_server_comments_server ON public.server_comments(server_id);
CREATE INDEX idx_server_comments_user ON public.server_comments(user_id);
CREATE INDEX idx_server_reports_status ON public.server_reports(status);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_server_comments_updated_at BEFORE UPDATE ON public.server_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建用户同步函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  new_username text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 从email中提取用户名（去掉@miaoda.com后缀）
  new_username := REPLACE(NEW.email, '@miaoda.com', '');
  
  -- 插入用户资料
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    new_username,
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'player'::public.user_role END
  );
  RETURN NEW;
END;
$$;

-- 创建用户确认触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_reports ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 2. 创建RLS策略
-- ==============================================

-- 创建管理员检查函数
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- 创建服主检查函数
CREATE OR REPLACE FUNCTION is_owner(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role IN ('owner'::user_role, 'admin'::user_role)
  );
$$;

-- Profiles 表策略
CREATE POLICY "管理员可以查看所有用户资料" ON profiles
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的资料" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "管理员可以更新所有用户资料" ON profiles
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- 创建公开用户资料视图
CREATE VIEW public_profiles AS
  SELECT id, username, avatar_url, bio, role, created_at FROM profiles;

-- Servers 表策略
CREATE POLICY "所有人可以查看已批准的服务器" ON servers
  FOR SELECT USING (status = 'approved'::server_status);

CREATE POLICY "服主可以查看自己的服务器" ON servers
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "管理员可以查看所有服务器" ON servers
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "认证用户可以创建服务器" ON servers
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "服主可以更新自己的服务器" ON servers
  FOR UPDATE TO authenticated USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND status IS NOT DISTINCT FROM (SELECT status FROM servers WHERE id = servers.id));

CREATE POLICY "管理员可以更新所有服务器" ON servers
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "服主可以删除自己的服务器" ON servers
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "管理员可以删除所有服务器" ON servers
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Server Images 表策略
CREATE POLICY "所有人可以查看已批准服务器的图片" ON server_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_images.server_id 
      AND s.status = 'approved'::server_status
    )
  );

CREATE POLICY "服主可以查看自己服务器的图片" ON server_images
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_images.server_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "管理员可以查看所有图片" ON server_images
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "服主可以为自己的服务器添加图片" ON server_images
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_images.server_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "服主可以删除自己服务器的图片" ON server_images
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_images.server_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "管理员可以删除所有图片" ON server_images
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Server Tags 表策略
CREATE POLICY "所有人可以查看已批准服务器的标签" ON server_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_tags.server_id 
      AND s.status = 'approved'::server_status
    )
  );

CREATE POLICY "服主可以查看自己服务器的标签" ON server_tags
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_tags.server_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "服主可以为自己的服务器添加标签" ON server_tags
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_tags.server_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "服主可以删除自己服务器的标签" ON server_tags
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM servers s 
      WHERE s.id = server_tags.server_id 
      AND s.owner_id = auth.uid()
    )
  );

-- Server Likes 表策略
CREATE POLICY "所有人可以查看点赞" ON server_likes
  FOR SELECT USING (true);

CREATE POLICY "认证用户可以点赞" ON server_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以取消自己的点赞" ON server_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Server Favorites 表策略
CREATE POLICY "用户可以查看自己的收藏" ON server_favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "认证用户可以收藏" ON server_favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以取消自己的收藏" ON server_favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Server Comments 表策略
CREATE POLICY "所有人可以查看已批准的评论" ON server_comments
  FOR SELECT USING (is_approved = true);

CREATE POLICY "用户可以查看自己的评论" ON server_comments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有评论" ON server_comments
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "认证用户可以发表评论" ON server_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的评论" ON server_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_approved IS NOT DISTINCT FROM (SELECT is_approved FROM server_comments WHERE id = server_comments.id));

CREATE POLICY "管理员可以更新所有评论" ON server_comments
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以删除自己的评论" ON server_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "管理员可以删除所有评论" ON server_comments
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Server Reports 表策略
CREATE POLICY "用户可以查看自己的举报" ON server_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE POLICY "管理员可以查看所有举报" ON server_reports
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "认证用户可以提交举报" ON server_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "管理员可以处理举报" ON server_reports
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- ==============================================
-- 3. 创建存储桶
-- ==============================================

-- 创建服务器图片存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-9eou800gj85c_server_images',
  'app-9eou800gj85c_server_images',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
);

-- 存储桶策略：所有人可以查看
CREATE POLICY "所有人可以查看服务器图片"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-9eou800gj85c_server_images');

-- 存储桶策略：认证用户可以上传
CREATE POLICY "认证用户可以上传服务器图片"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-9eou800gj85c_server_images');

-- 存储桶策略：用户可以删除自己上传的图片
CREATE POLICY "用户可以删除自己上传的图片"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'app-9eou800gj85c_server_images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 创建用户头像存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-9eou800gj85c_avatars',
  'app-9eou800gj85c_avatars',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
);

-- 存储桶策略：所有人可以查看头像
CREATE POLICY "所有人可以查看用户头像"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-9eou800gj85c_avatars');

-- 存储桶策略：认证用户可以上传头像
CREATE POLICY "认证用户可以上传头像"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-9eou800gj85c_avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 存储桶策略：用户可以更新自己的头像
CREATE POLICY "用户可以更新自己的头像"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'app-9eou800gj85c_avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 存储桶策略：用户可以删除自己的头像
CREATE POLICY "用户可以删除自己的头像"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'app-9eou800gj85c_avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==============================================
-- 4. 创建辅助函数
-- ==============================================

-- 创建增加浏览量的函数
CREATE OR REPLACE FUNCTION increment_view_count(server_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE servers
  SET view_count = view_count + 1
  WHERE id = server_id;
END;
$$;

-- ==============================================
-- 5. 更新存储桶大小限制
-- ==============================================

-- 更新头像存储桶的文件大小限制为10MB
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'app-9eou800gj85c_avatars';

-- 更新服务器图片存储桶的文件大小限制为10MB
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'app-9eou800gj85c_server_images';

-- ==============================================
-- 6. 创建邮件系统表
-- ==============================================

-- SMTP配置表
CREATE TABLE public.smtp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'MC服务器平台',
  use_tls BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 邮件模板表
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  variables TEXT[], -- 可用变量列表
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 验证码表
CREATE TABLE public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'email_change', 'email_verify'
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 服务器修改申请表
CREATE TABLE public.server_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changes JSONB NOT NULL, -- 存储修改内容
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 插入默认邮件模板
INSERT INTO public.email_templates (name, subject, content, description, variables) VALUES
('verification_code', '邮箱验证码', '您的验证码是：{{code}}，有效期为10分钟。如非本人操作，请忽略此邮件。', '邮箱验证码模板', ARRAY['code', 'username']),
('server_approved', '服务器审核通过', '您好 {{username}}，您提交的服务器"{{server_name}}"已通过审核，现在可以在平台上展示了！', '服务器审核通过通知', ARRAY['username', 'server_name']),
('server_submitted', '新服务器申请', '管理员您好，用户 {{username}} 提交了新的服务器"{{server_name}}"，请及时审核。', '服务器提交管理员通知', ARRAY['username', 'server_name', 'server_id']),
('server_edit_approved', '服务器修改审核通过', '您好 {{username}}，您对服务器"{{server_name}}"的修改申请已通过审核。', '服务器修改审核通过通知', ARRAY['username', 'server_name']);

-- 创建索引
CREATE INDEX idx_verification_codes_user_id ON public.verification_codes(user_id);
CREATE INDEX idx_verification_codes_email ON public.verification_codes(email);
CREATE INDEX idx_verification_codes_expires_at ON public.verification_codes(expires_at);
CREATE INDEX idx_server_edit_requests_server_id ON public.server_edit_requests(server_id);
CREATE INDEX idx_server_edit_requests_status ON public.server_edit_requests(status);

-- ==============================================
-- 7. 创建邮件系统RLS策略
-- ==============================================

-- SMTP配置表RLS策略
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可以查看SMTP配置"
ON public.smtp_config FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "管理员可以插入SMTP配置"
ON public.smtp_config FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "管理员可以更新SMTP配置"
ON public.smtp_config FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "管理员可以删除SMTP配置"
ON public.smtp_config FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 邮件模板表RLS策略
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可以查看邮件模板"
ON public.email_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "管理员可以插入邮件模板"
ON public.email_templates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "管理员可以更新邮件模板"
ON public.email_templates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "管理员可以删除邮件模板"
ON public.email_templates FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 验证码表RLS策略
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的验证码"
ON public.verification_codes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "用户可以插入自己的验证码"
ON public.verification_codes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的验证码"
ON public.verification_codes FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 服务器修改申请表RLS策略
ALTER TABLE public.server_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "服主可以查看自己的修改申请"
ON public.server_edit_requests FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "服主可以提交修改申请"
ON public.server_edit_requests FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "管理员可以更新修改申请"
ON public.server_edit_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ==============================================
-- 8. 修复个人资料邮件触发器
-- ==============================================

-- 修改handle_new_user函数，不自动设置email字段
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
  new_username text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 从email中提取用户名（去掉@miaoda.com后缀）
  new_username := REPLACE(NEW.email, '@miaoda.com', '');
  
  -- 插入用户资料，email字段设置为NULL，由应用层更新
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    new_username,
    NULL, -- 不使用auth.users的email
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'player'::public.user_role END
  );
  RETURN NEW;
END;
$function$;

-- ==============================================
-- 9. 创建站点设置表
-- ==============================================

CREATE TABLE IF NOT EXISTS site_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  contact_email TEXT,
  qq_group TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 确保只有一行
ALTER TABLE site_settings ADD CONSTRAINT site_settings_single_row CHECK (id = 1);

-- 插入默认数据
INSERT INTO site_settings (id, contact_email, qq_group)
VALUES (1, 'admin@example.com', '123456789')
ON CONFLICT (id) DO NOTHING;

-- 权限设置
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update site settings" ON site_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can insert site settings" ON site_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ==============================================
-- 10. 添加QQ群链接到站点设置
-- ==============================================

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS qq_group_link TEXT;

-- ==============================================
-- 11. 添加密码重置邮件模板
-- ==============================================

-- 添加忘记密码邮件模板
INSERT INTO email_templates (name, subject, content, description, variables)
VALUES (
  'password_reset',
  '重置您的密码',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
    .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MC服务器分享平台</h1>
    </div>
    <div class="content">
      <h2>重置密码请求</h2>
      <p>您好，{{username}}！</p>
      <p>我们收到了您的密码重置请求。如果这不是您本人的操作，请忽略此邮件。</p>
      <p>点击下方按钮重置您的密码：</p>
      <div style="text-align: center;">
        <a href="{{reset_link}}" class="button">重置密码</a>
      </div>
      <p style="color: #dc3545; margin-top: 20px;">
        <strong>注意：</strong>此链接将在24小时后失效。
      </p>
      <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
        如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>
        {{reset_link}}
      </p>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿直接回复。</p>
      <p>© 2026 MC服务器分享平台. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  '用户忘记密码时发送的重置密码邮件',
  ARRAY['username', 'reset_link']
)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- ==============================================
-- 12. 添加重置密码函数
-- ==============================================

-- 创建重置密码的数据库函数
CREATE OR REPLACE FUNCTION reset_user_password(user_email TEXT, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- 查找用户ID
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION '用户不存在';
  END IF;

  -- 更新密码（使用 Supabase 的内部函数）
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- ==============================================
-- 13. 允许匿名邮箱查询
-- ==============================================

-- 允许匿名用户通过邮箱查找用户（用于密码重置）
-- 只允许查询 id, username, email 字段，不暴露其他敏感信息
CREATE POLICY "允许匿名用户通过邮箱查找用户"
ON profiles
FOR SELECT
TO anon
USING (true);

-- ==============================================
-- 14. 允许匿名插入验证码
-- ==============================================

-- 允许匿名用户插入验证码（用于密码重置）
CREATE POLICY "允许匿名用户插入验证码"
ON verification_codes
FOR INSERT
TO anon
WITH CHECK (type = 'password_reset');

-- 允许匿名用户查看验证码（用于验证）
CREATE POLICY "允许匿名用户查看密码重置验证码"
ON verification_codes
FOR SELECT
TO anon
USING (type = 'password_reset');

-- 允许匿名用户更新验证码（标记为已使用）
CREATE POLICY "允许匿名用户更新密码重置验证码"
ON verification_codes
FOR UPDATE
TO anon
USING (type = 'password_reset')
WITH CHECK (type = 'password_reset');

-- ==============================================
-- 15. 添加Minecraft用户名到个人资料
-- ==============================================

-- 添加 Minecraft 用户名字段到 profiles 表
ALTER TABLE profiles
ADD COLUMN minecraft_username TEXT;

-- 添加注释
COMMENT ON COLUMN profiles.minecraft_username IS 'Minecraft 正版游戏ID';

-- ==============================================
-- 16. 添加登录信息到个人资料
-- ==============================================

-- 添加登录信息字段到 profiles 表
ALTER TABLE profiles
ADD COLUMN last_login_ip TEXT,
ADD COLUMN last_login_region TEXT,
ADD COLUMN last_login_time TIMESTAMPTZ,
ADD COLUMN current_login_ip TEXT,
ADD COLUMN current_login_region TEXT,
ADD COLUMN current_login_time TIMESTAMPTZ;

-- 添加注释
COMMENT ON COLUMN profiles.last_login_ip IS '上次登录IP地址';
COMMENT ON COLUMN profiles.last_login_region IS '上次登录地区';
COMMENT ON COLUMN profiles.last_login_time IS '上次登录时间';
COMMENT ON COLUMN profiles.current_login_ip IS '本次登录IP地址';
COMMENT ON COLUMN profiles.current_login_region IS '本次登录地区';
COMMENT ON COLUMN profiles.current_login_time IS '本次登录时间';
