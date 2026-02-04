import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServerStatusRequest {
  ip: string;
  port: number;
}

interface ServerStatusResponse {
  online: boolean;
  players?: {
    online: number;
    max: number;
  };
  version?: string;
  motd?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ip, port } = await req.json() as ServerStatusRequest;

    if (!ip) {
      return new Response(
        JSON.stringify({ online: false, error: '缺少服务器地址' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 使用 minecraft-server-util 的 ESM 版本
    const { status } = await import('https://esm.sh/minecraft-server-util@5.5.3');

    try {
      // 查询服务器状态，设置5秒超时
      const response = await status(ip, port || 25565, {
        timeout: 5000,
        enableSRV: true,
      });

      const result: ServerStatusResponse = {
        online: true,
        players: {
          online: response.players.online,
          max: response.players.max,
        },
        version: response.version.name,
        motd: response.motd.clean,
      };

      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      // 服务器离线或无法连接
      console.error('服务器查询失败:', error);
      
      return new Response(
        JSON.stringify({ 
          online: false, 
          error: '服务器离线或无法连接' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('处理请求失败:', error);
    
    return new Response(
      JSON.stringify({ 
        online: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
