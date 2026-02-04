import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IPInfoResponse {
  success: boolean;
  data?: {
    ip: string;
    region: string;
    isp: string;
    llc: string;
    asn: string;
    latitude: number;
    longitude: number;
    beginip?: string;
    endip?: string;
    district?: string;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 获取客户端IP（从请求头中获取）
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // 调用 uapis.cn API 查询IP信息
    const apiUrl = 'https://uapis.cn/api/v1/network/myip';
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Forwarded-For': clientIP, // 传递客户端IP
      },
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();

    const result: IPInfoResponse = {
      success: true,
      data: {
        ip: data.ip,
        region: data.region,
        isp: data.isp,
        llc: data.llc,
        asn: data.asn,
        latitude: data.latitude,
        longitude: data.longitude,
        beginip: data.beginip,
        endip: data.endip,
        district: data.district,
      },
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('查询IP信息失败:', error);
    
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
