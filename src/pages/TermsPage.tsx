import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">服务条款</CardTitle>
            <p className="text-sm text-muted-foreground">最后更新：2026年2月</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. 服务说明</h2>
              <p className="text-muted-foreground leading-relaxed">
                欢迎使用MC服务器分享平台（以下简称"本平台"）。本平台致力于为Minecraft公益服务器提供信息发布与发现服务。使用本平台即表示您同意遵守以下条款。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. 用户行为规范</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>2.1 用户应遵守中华人民共和国相关法律法规，不得发布违法违规内容。</p>
                <p>2.2 用户应文明互动，不得发布侮辱、诽谤、骚扰他人的内容。</p>
                <p>2.3 禁止发布虚假服务器信息，服主对其提交的服务器信息真实性负责。</p>
                <p>2.4 禁止恶意刷屏、灌水、发布广告等影响平台秩序的行为。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. 服务器入驻规则</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>3.1 服务器入驻需经过平台审核，确保信息真实有效。</p>
                <p>3.2 服务器应为公益性质，不得以营利为主要目的。</p>
                <p>3.3 服务器信息应真实准确，包括但不限于IP地址、版本、玩法类型等。</p>
                <p>3.4 平台有权拒绝或下架不符合要求的服务器。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. 内容审核</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>4.1 平台对用户发布的内容进行审核，包括服务器信息、评论等。</p>
                <p>4.2 平台有权删除违规内容，并对违规用户进行处理。</p>
                <p>4.3 用户可通过举报机制反馈违规内容，平台将在24小时内处理。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. 知识产权</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>5.1 平台的设计、代码、商标等知识产权归平台所有。</p>
                <p>5.2 用户发布的内容版权归用户所有，但授权平台在平台范围内使用。</p>
                <p>5.3 未经授权，不得复制、传播平台内容。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. 免责声明</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>6.1 平台仅提供信息展示服务，不对服务器的实际运营负责。</p>
                <p>6.2 用户使用服务器时产生的纠纷，应由用户与服主自行解决。</p>
                <p>6.3 平台不保证服务的持续性和稳定性，因不可抗力导致的服务中断不承担责任。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. 服务变更与终止</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>7.1 平台有权根据实际情况调整服务内容和条款。</p>
                <p>7.2 平台有权终止向违规用户提供服务。</p>
                <p>7.3 用户可随时停止使用平台服务。</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. 其他</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>8.1 本条款的解释权归平台所有。</p>
                <p>8.2 如有疑问，请通过平台提供的联系方式与我们联系。</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
