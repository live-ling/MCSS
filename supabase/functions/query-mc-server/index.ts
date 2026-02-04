import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServerStatusRequest {
  server: string;
}

interface ServerStatusResponse {
  success: boolean;
  data?: {
    online: boolean;
    ip: string;
    port: number;
    players: number;
    max_players: number;
    version: string;
    motd_clean: string;
    motd_html: string;
    favicon_url?: string;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { server } = await req.json() as ServerStatusRequest;

    if (!server) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '缺少服务器地址' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 调用 uapis.cn API 查询服务器状态
    const apiUrl = `https://uapis.cn/api/v1/game/minecraft/serverstatus?server=${encodeURIComponent(server)}`;
    
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
            success: true,
            data: {
              online: false,
              ip: '',
              port: 0,
              players: 0,
              max_players: 0,
              version: '',
              motd_clean: '',
              motd_html: '',
            },
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();

    const result: ServerStatusResponse = {
      success: true,
      data: {
        online: data.online,
        ip: data.ip,
        port: data.port,
        players: data.players,
        max_players: data.max_players,
        version: data.version,
        motd_clean: data.motd_clean,
        motd_html: data.motd_html,
        favicon_url: data.favicon_url,
      },
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('查询服务器状态失败:', error);
    
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
