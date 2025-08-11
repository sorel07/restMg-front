// Configuración de proxy para development y production
import type { APIRoute } from 'astro';

const BACKEND_URL = 'http://restmg.runasp.net/api';

export const ALL: APIRoute = async ({ request, url }) => {
  // Extraer la ruta después de /api-proxy/
  const path = url.pathname.replace('/api-proxy', '');
  const targetUrl = `${BACKEND_URL}${path}${url.search}`;

  console.log(`🔄 Proxy: ${request.method} ${targetUrl}`);

  try {
    // Preparar headers sin los problemáticos
    const forwardHeaders = new Headers();
    request.headers.forEach((value, key) => {
      // Excluir headers que pueden causar problemas en el proxy
      const excludedHeaders = ['host', 'origin', 'referer', 'connection', 'upgrade-insecure-requests'];
      if (!excludedHeaders.includes(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    });

    // Preparar el body de la petición si existe
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Para JSON, leer como texto y reenviar
        body = await request.text();
      } else if (contentType?.includes('multipart/form-data')) {
        // Para form-data, leer como blob
        body = await request.blob();
      } else {
        // Para otros tipos, leer como texto
        body = await request.text();
      }
    }

    // Reenviar la petición al backend real
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body,
    });

    console.log(`✅ Proxy response: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);

    // Crear respuesta con los mismos headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Permitir la mayoría de headers pero excluir algunos problemáticos
      const excludedResponseHeaders = ['content-encoding', 'transfer-encoding'];
      if (!excludedResponseHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Añadir headers CORS
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Para respuestas binarias (imágenes, PDFs, etc.), usar arrayBuffer
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('image/') || 
        contentType.includes('application/pdf') || 
        contentType.includes('application/octet-stream')) {
      
      console.log(`📷 Proxy: Handling binary response (${contentType})`);
      const responseBuffer = await response.arrayBuffer();
      
      return new Response(responseBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    // Para respuestas de texto (JSON, HTML, etc.), usar text
    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    // Determinar si es un error de conexión o del servidor
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const isConnectionError = errorMessage.includes('fetch') || errorMessage.includes('network');
    
    return new Response(
      JSON.stringify({ 
        error: 'Backend no disponible',
        details: errorMessage,
        target: targetUrl,
        method: request.method
      }), 
      { 
        status: isConnectionError ? 503 : 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};

// Manejar peticiones OPTIONS para CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
};
