import HomePage from './pages/HomePage';
import ServersPage from './pages/ServersPage';
import ServerDetailPage from './pages/ServerDetailPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import OwnerPage from './pages/OwnerPage';
import AdminPage from './pages/AdminPage';
import SiteSettingsPage from './pages/admin/SiteSettingsPage';
import SmtpSettingsPage from './pages/admin/SmtpSettingsPage';
import EmailTemplatesPage from './pages/admin/EmailTemplatesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFound from './pages/NotFound';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '首页',
    path: '/',
    element: <HomePage />
  },
  {
    name: '服务器列表',
    path: '/servers',
    element: <ServersPage />
  },
  {
    name: '服务器详情',
    path: '/servers/:id',
    element: <ServerDetailPage />
  },
  {
    name: '登录',
    path: '/login',
    element: <LoginPage />
  },
  {
    name: '个人中心',
    path: '/profile',
    element: <ProfilePage />
  },
  {
    name: '服主中心',
    path: '/owner',
    element: <OwnerPage />
  },
  {
    name: '管理后台',
    path: '/admin',
    element: <AdminPage />
  },
  {
    name: '联系我们设置',
    path: '/admin/site-settings',
    element: <SiteSettingsPage />
  },
  {
    name: 'SMTP设置',
    path: '/admin/smtp',
    element: <SmtpSettingsPage />
  },
  {
    name: '邮件模板',
    path: '/admin/email-templates',
    element: <EmailTemplatesPage />
  },
  {
    name: '服务条款',
    path: '/terms',
    element: <TermsPage />
  },
  {
    name: '隐私政策',
    path: '/privacy',
    element: <PrivacyPage />
  },
  {
    name: '404',
    path: '*',
    element: <NotFound />
  }
];

export default routes;
