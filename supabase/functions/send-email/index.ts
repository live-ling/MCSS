import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  templateName?: string;
  variables?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 验证用户身份
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '未授权' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, subject, content, templateName, variables }: EmailRequest = await req.json();

    // 获取SMTP配置
    const { data: smtpConfig, error: smtpError } = await supabaseClient
      .from('smtp_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (smtpError || !smtpConfig) {
      return new Response(
        JSON.stringify({ error: 'SMTP配置未设置或已禁用' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailContent = content;

    // 如果使用模板，获取模板并替换变量
    if (templateName) {
      const { data: template, error: templateError } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('name', templateName)
        .maybeSingle();

      if (templateError || !template) {
        return new Response(
          JSON.stringify({ error: '邮件模板不存在' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      emailContent = template.content;
      
      // 替换变量
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          emailContent = emailContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
    }

    // 使用nodemailer发送邮件
    const nodemailer = await import('npm:nodemailer@6.9.7');
    
    const transporter = nodemailer.default.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
      to,
      subject: templateName && variables ? subject.replace(/{{(\w+)}}/g, (_, key) => variables[key] || '') : subject,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>'),
    });

    return new Response(
      JSON.stringify({ success: true, message: '邮件发送成功' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('邮件发送失败:', error);
    return new Response(
      JSON.stringify({ error: error.message || '邮件发送失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
