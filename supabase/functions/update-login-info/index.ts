import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateLoginInfoRequest {
  user_id: string;
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json() as UpdateLoginInfoRequest;

    if (!user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '缺少用户ID' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 查询当前用户的登录信息
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_login_ip, current_login_region, current_login_time')
      .eq('id', user_id)
      .single();

    // 查询IP信息
    const ipApiUrl = 'https://uapis.cn/api/v1/network/myip';
    const ipResponse = await fetch(ipApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    let ipInfo = null;
    if (ipResponse.ok) {
      ipInfo = await ipResponse.json();
    }

    // 更新登录信息
    const updateData: any = {
      current_login_ip: ipInfo?.ip || 'unknown',
      current_login_region: ipInfo?.region || '未知',
      current_login_time: new Date().toISOString(),
    };

    // 如果有上次登录信息，将其移到 last_login_*
    if (profile?.current_login_ip) {
      updateData.last_login_ip = profile.current_login_ip;
      updateData.last_login_region = profile.current_login_region;
      updateData.last_login_time = profile.current_login_time;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user_id);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          ip: updateData.current_login_ip,
          region: updateData.current_login_region,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('更新登录信息失败:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '更新失败' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
