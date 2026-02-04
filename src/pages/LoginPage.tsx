import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { sendVerificationCode, resetPasswordWithCode } from '@/db/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  // 登录表单
  const [loginIdentifier, setLoginIdentifier] = useState(''); // 用户名或邮箱
  const [loginPassword, setLoginPassword] = useState('');

  // 忘记密码
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'verify' | 'password'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 注册表单
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginIdentifier || !loginPassword) {
      toast.error('请填写完整信息');
      return;
    }

    setLoading(true);
    try {
      // 判断是邮箱还是用户名
      const isEmail = loginIdentifier.includes('@');
      
      if (isEmail) {
        // 使用邮箱登录
        const { error } = await supabase.auth.signInWithPassword({
          email: loginIdentifier,
          password: loginPassword,
        });
        
        if (error) throw error;
      } else {
        // 使用用户名登录（转换为miaoda邮箱）
        if (!/^[a-zA-Z0-9_]+$/.test(loginIdentifier)) {
          toast.error('用户名只能包含字母、数字和下划线');
          setLoading(false);
          return;
        }
        await signIn(loginIdentifier, loginPassword);
      }
      
      toast.success('登录成功');
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('登录失败:', error);
      toast.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetStep === 'email') {
      // 第一步：发送验证码
      if (!resetEmail) {
        toast.error('请输入邮箱地址');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
        toast.error('请输入有效的邮箱地址');
        return;
      }

      setResetLoading(true);
      try {
        await sendVerificationCode(resetEmail.trim(), 'password_reset');
        toast.success('验证码已发送到邮箱');
        setResetStep('verify');
        setCountdown(60);

        // 倒计时
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (error: any) {
        console.error('发送验证码失败:', error);
        toast.error(error.message || '发送失败，请稍后重试');
      } finally {
        setResetLoading(false);
      }
    } else if (resetStep === 'verify') {
      // 第二步：验证验证码
      if (!resetCode) {
        toast.error('请输入验证码');
        return;
      }

      if (resetCode.length !== 6) {
        toast.error('验证码为6位数字');
        return;
      }

      setResetStep('password');
    } else if (resetStep === 'password') {
      // 第三步：设置新密码
      if (!newPassword || !confirmNewPassword) {
        toast.error('请输入新密码');
        return;
      }

      if (newPassword.length < 6) {
        toast.error('密码长度至少6位');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }

      setResetLoading(true);
      try {
        await resetPasswordWithCode(resetEmail, resetCode, newPassword);
        toast.success('密码重置成功，请使用新密码登录');
        handleResetDialogClose();
      } catch (error: any) {
        console.error('重置密码失败:', error);
        toast.error(error.message || '重置失败，请检查验证码是否正确');
      } finally {
        setResetLoading(false);
      }
    }
  };

  const handleResetDialogClose = () => {
    setResetPasswordOpen(false);
    setResetStep('email');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setCountdown(0);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupUsername || !signupEmail || !signupPassword || !signupConfirmPassword) {
      toast.error('请填写完整信息');
      return;
    }

    // 验证用户名格式（只允许字母、数字和下划线）
    if (!/^[a-zA-Z0-9_]+$/.test(signupUsername)) {
      toast.error('用户名只能包含字母、数字和下划线');
      return;
    }

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('密码长度至少为6位');
      return;
    }

    setLoading(true);
    try {
      await signUp(signupUsername, signupPassword, signupEmail);
      toast.success('注册成功，正在登录...');
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('注册失败:', error);
      toast.error(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">MC服务器分享平台</h1>
            <p className="text-muted-foreground">登录或注册以继续</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="signup">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <form onSubmit={handleLogin}>
                  <CardHeader>
                    <CardTitle>登录</CardTitle>
                    <CardDescription>使用用户名/邮箱和密码登录</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-identifier">用户名或邮箱</Label>
                      <Input
                        id="login-identifier"
                        type="text"
                        placeholder="请输入用户名或邮箱"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">密码</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="请输入密码"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col space-y-3 pt-6">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? '登录中...' : '登录'}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      忘记密码？
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <form onSubmit={handleSignup}>
                  <CardHeader>
                    <CardTitle>注册</CardTitle>
                    <CardDescription>创建一个新账号</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-username">用户名</Label>
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="只能包含字母、数字和下划线（推荐使用游戏ID）"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">邮箱</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="请输入邮箱地址"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">密码</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="至少6位"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">确认密码</Label>
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="再次输入密码"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col space-y-4 pt-6" data-href="/" data-target="_blank">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? '注册中...' : '注册'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      注册即表示您同意我们的
                      <Link to="/terms" className="font-bold underline hover:text-foreground mx-1">
                        服务条款
                      </Link>
                      和
                      <Link to="/privacy" className="font-bold underline hover:text-foreground mx-1">
                        隐私政策
                      </Link>
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center">
            <Button variant="ghost" asChild>
              <Link to="/">返回首页</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 忘记密码对话框 */}
      <Dialog open={resetPasswordOpen} onOpenChange={handleResetDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              {resetStep === 'email' && '输入您的邮箱地址，我们将发送验证码'}
              {resetStep === 'verify' && '输入发送到邮箱的验证码'}
              {resetStep === 'password' && '设置新密码'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {resetStep === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="reset-email">邮箱地址</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="请输入注册时使用的邮箱"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetLoading}
                />
              </div>
            )}

            {resetStep === 'verify' && (
              <div className="space-y-2">
                <Label htmlFor="reset-code">验证码</Label>
                <Input
                  id="reset-code"
                  type="text"
                  placeholder="请输入6位验证码"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  maxLength={6}
                  disabled={resetLoading}
                />
                <p className="text-sm text-muted-foreground">
                  验证码已发送到 {resetEmail}
                  {countdown > 0 ? (
                    <span className="ml-2">({countdown}秒后可重新发送)</span>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-2 h-auto p-0"
                      onClick={() => {
                        setResetStep('email');
                        setResetCode('');
                      }}
                    >
                      重新发送
                    </Button>
                  )}
                </p>
              </div>
            )}

            {resetStep === 'password' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="请输入新密码（至少6位）"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={resetLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">确认新密码</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="请再次输入新密码"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={resetLoading}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleResetDialogClose}
              disabled={resetLoading}
            >
              取消
            </Button>
            {resetStep === 'verify' && (
              <Button
                variant="outline"
                onClick={() => {
                  setResetStep('email');
                  setResetCode('');
                }}
                disabled={resetLoading}
              >
                上一步
              </Button>
            )}
            {resetStep === 'password' && (
              <Button
                variant="outline"
                onClick={() => {
                  setResetStep('verify');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                disabled={resetLoading}
              >
                上一步
              </Button>
            )}
            <Button onClick={handleResetPassword} disabled={resetLoading}>
              {resetLoading ? '处理中...' : 
                resetStep === 'email' ? '发送验证码' :
                resetStep === 'verify' ? '下一步' :
                '重置密码'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
