import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getSiteSettings } from '@/db/api';
import type { SiteSettings } from '@/types';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSiteSettings();
        setSiteSettings(data);
      } catch (error) {
        console.error('获取站点设置失败:', error);
      }
    };

    fetchSettings();
  }, []);

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* 关于 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">关于平台</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Minecraft公益服务器分享平台，为爱发电，服务社区。打造一个纯净、友好、非营利的服务器信息枢纽。
            </p>
          </div>

          {/* 联系我们 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">联系我们</h3>
            <div className="space-y-3 text-sm">
              {siteSettings?.contact_email && (
                <div>
                  <p className="text-muted-foreground mb-1">电子邮箱</p>
                  <a 
                    href={`mailto:${siteSettings.contact_email}`}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {siteSettings.contact_email}
                  </a>
                </div>
              )}
              {siteSettings?.qq_group && (
                <div>
                  <p className="text-muted-foreground mb-1">官方QQ群</p>
                  {siteSettings.qq_group_link ? (
                    <a 
                      href={siteSettings.qq_group_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground font-medium hover:text-primary transition-colors"
                    >
                      {siteSettings.qq_group}
                    </a>
                  ) : (
                    <p className="text-foreground font-medium">
                      {siteSettings.qq_group}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                如有疑问或建议，欢迎通过以上方式联系我们。
              </p>
            </div>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">快速链接</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground">
                  首页
                </Link>
              </li>
              <li>
                <Link to="/servers" className="text-muted-foreground hover:text-foreground">
                  服务器列表
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground">
                  服务条款
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
                  隐私政策
                </Link>
              </li>
            </ul>
          </div>

          {/* 社区守则 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">社区守则</h3>
            <p className="text-sm text-muted-foreground mb-3">
              请遵守社区守则，文明互动，共建和谐社区。
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>• 禁止发布虚假服务器信息</li>
              <li>• 禁止恶意抹黑其他服务器</li>
              <li>• 维护公益服生态环境</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© {currentYear} MC服务器分享平台. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
