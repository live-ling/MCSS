import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Users, Heart } from 'lucide-react';
import type { ServerDetail } from '@/types';
import { cn } from '@/lib/utils';
import { checkServerStatus, type ServerStatus } from '@/db/api';

interface ServerCardProps {
  server: ServerDetail;
  className?: string;
}

const VERSION_LABELS: Record<string, string> = {
  '1.21': '1.21',
  '1.20': '1.20',
  '1.19': '1.19',
  '1.18': '1.18',
  '1.17': '1.17',
  '1.16': '1.16',
  '1.15': '1.15',
  '1.14': '1.14',
  '1.13': '1.13',
  '1.12': '1.12',
  '1.11': '1.11',
  '1.10': '1.10',
  '1.9': '1.9',
  '1.8': '1.8',
  '1.7': '1.7',
  'other': '其他',
};

const TYPE_LABELS: Record<string, string> = {
  survival: '生存',
  creative: '创造',
  rpg: 'RPG',
  minigame: '小游戏',
  skyblock: '空岛',
  prison: '监狱',
  factions: '派系',
  other: '其他',
};

export function ServerCard({ server, className }: ServerCardProps) {
  const primaryImage = server.images?.find(img => img.is_primary)?.image_url || server.images?.[0]?.image_url;
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // 组件挂载时查询服务器状态
    let isMounted = true;
    
    const fetchStatus = async () => {
      setIsChecking(true);
      try {
        // 构建服务器地址
        const serverAddress = server.port && server.port !== 25565 
          ? `${server.ip_address}:${server.port}`
          : server.ip_address;
        
        const status = await checkServerStatus(serverAddress);
        if (isMounted) {
          setServerStatus(status);
        }
      } catch (error) {
        console.error('查询服务器状态失败:', error);
        if (isMounted) {
          setServerStatus({ online: false, error: '查询失败' });
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    // 延迟查询，避免同时发起太多请求
    const timer = setTimeout(fetchStatus, Math.random() * 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [server.id, server.ip_address, server.port]); // 依赖服务器地址和端口

  return (
    <Link to={`/servers/${server.id}`}>
      <Card className={cn('card-hover transition-all', className)}>
        {/* 服务器图片 */}
        <div className="p-4 pb-0">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={server.name}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                暂无图片
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          {/* 服务器名称 */}
          <h3 className="mb-2 line-clamp-1 text-lg font-semibold">{server.name}</h3>

          {/* 服务器描述 */}
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {server.description}
          </p>

          {/* 标签 */}
          <div className="mb-3 flex flex-wrap gap-2">
            {/* 在线状态 */}
            {serverStatus && (
              <Badge 
                variant={serverStatus.online ? "default" : "secondary"} 
                className="text-xs"
              >
                {serverStatus.online ? '在线' : '离线'}
              </Badge>
            )}
            {isChecking && (
              <Badge variant="secondary" className="text-xs">
                检测中...
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {VERSION_LABELS[server.version] || server.version}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {TYPE_LABELS[server.server_type] || server.server_type}
            </Badge>
            {server.is_pure_public && (
              <Badge variant="outline" className="text-xs">
                纯公益
              </Badge>
            )}
            {server.requires_genuine && (
              <Badge variant="outline" className="text-xs">
                正版
              </Badge>
            )}
          </div>

          {/* 自定义标签 */}
          {server.tags && server.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {server.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="text-xs text-muted-foreground">
                  #{tag.tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-border p-4">
          <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{server.view_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>
                {serverStatus?.online && serverStatus.players 
                  ? `${serverStatus.players.online}/${serverStatus.players.max}`
                  : `${server.online_players}/${server.max_players || '∞'}`
                }
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{server.like_count || 0}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
