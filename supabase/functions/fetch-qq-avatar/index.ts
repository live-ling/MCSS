const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchQQAvatarRequest {
  email: string;
}

interface FetchQQAvatarResponse {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as FetchQQAvatarRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少邮箱地址' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 检测是否为QQ邮箱
    const qqEmailRegex = /^(\d+)@qq\.com$/i;
    const match = email.match(qqEmailRegex);

    if (!match) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '不是QQ邮箱' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const qqNumber = match[1];
    
    // QQ头像API地址
    const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${qqNumber}&s=640`;

    // 验证头像是否可访问
    try {
      const response = await fetch(avatarUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('头像不可访问');
      }
    } catch (error) {
      console.error('验证QQ头像失败:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'QQ头像不可访问' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('处理请求失败:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
