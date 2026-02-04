import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlayerInfoRequest {
  username: string;
}

interface PlayerInfoResponse {
  success: boolean;
  data?: {
    username: string;
    uuid: string;
    skin_url: string;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username } = await req.json() as PlayerInfoRequest;

    if (!username) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '缺少玩家用户名' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 调用 uapis.cn API 查询玩家信息
    const apiUrl = `https://uapis.cn/api/v1/game/minecraft/userinfo?username=${encodeURIComponent(username)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: '未找到该玩家，请检查用户名是否正确' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();

    const result: PlayerInfoResponse = {
      success: true,
      data: {
        username: data.username,
        uuid: data.uuid,
        skin_url: data.skin_url,
      },
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('查询玩家信息失败:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '查询失败，请稍后重试' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
