import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">隐私政策</CardTitle>
            <p className="text-sm text-muted-foreground">最后更新：2026年2月</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. 信息收集</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>1.1 我们收集的信息包括：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>注册信息：用户名、邮箱地址</li>
                  <li>服务器信息：服务器名称、IP地址、描述、截图等</li>
                  <li>互动信息：评论、收藏、点赞等行为数据</li>
                  <li>技术信息：IP地址、浏览器类型、访问时间等</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. 信息使用</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>2.1 我们使用收集的信息用于：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>提供和改进平台服务</li>
                  <li>用户身份验证和账户管理</li>
                  <li>发送服务通知和重要更新</li>
                  <li>防止欺诈和滥用行为</li>
                  <li>分析平台使用情况，优化用户体验</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. 信息共享</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>3.1 我们不会出售或出租您的个人信息。</p>
                <p>3.2 以下情况下，我们可能共享您的信息：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>经您明确同意</li>
                  <li>法律法规要求或政府部门要求</li>
                  <li>为保护平台、用户或公众的合法权益</li>
                </ul>
                <p>3.3 公开信息：您发布的服务器信息、评论等将对所有用户可见。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. 信息安全</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>4.1 我们采取合理的安全措施保护您的信息：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>使用加密技术传输和存储敏感信息</li>
                  <li>实施访问控制，限制对个人信息的访问</li>
                  <li>定期进行安全审计和漏洞修复</li>
                </ul>
                <p>4.2 尽管我们采取了安全措施，但无法保证信息的绝对安全。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Cookie使用</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>5.1 我们使用Cookie和类似技术来：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>保持登录状态</li>
                  <li>记住用户偏好设置</li>
                  <li>分析网站流量和使用情况</li>
                </ul>
                <p>5.2 您可以通过浏览器设置管理Cookie，但这可能影响部分功能的使用。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. 用户权利</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>6.1 您对个人信息享有以下权利：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>访问和查看您的个人信息</li>
                  <li>更正不准确的个人信息</li>
                  <li>删除您的账户和个人信息</li>
                  <li>撤回对信息处理的同意</li>
                </ul>
                <p>6.2 如需行使上述权利，请通过平台提供的方式联系我们。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. 未成年人保护</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>7.1 我们重视未成年人的隐私保护。</p>
                <p>7.2 如果您是未成年人，请在监护人的指导下使用本平台。</p>
                <p>7.3 如发现未经监护人同意收集了未成年人信息，我们将立即删除。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. 政策更新</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>8.1 我们可能不时更新本隐私政策。</p>
                <p>8.2 重大变更将通过平台公告或邮件通知您。</p>
                <p>8.3 继续使用平台即表示您接受更新后的政策。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. 联系我们</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>9.1 如对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>通过平台的举报和反馈功能</li>
                  <li>发送邮件至平台管理员邮箱</li>
                </ul>
                <p>9.2 我们将在收到您的请求后尽快回复。</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
