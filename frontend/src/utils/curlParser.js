/**
 * Analisa uma string de comando cURL e retorna um objeto de requisição compatível com o sistema.
 */
export function parseCurl(curlString) {
  const request = {
    name: 'Requisição Importada',
    requestName: 'Requisição Importada',
    method: 'GET',
    url: '',
    headers: [],
    bodyRaw: '',
    bodyParams: [],
    bodyType: 'none',
    authType: 'none',
    authToken: '',
    authUsername: '',
    authPassword: '',
  };

  // Remove quebras de linha e barras invertidas de continuação (considerando espaços extras)
  const cleanCommand = curlString.replace(/\\[ \t]*\n/g, ' ').replace(/\n/g, ' ').trim();
  
  // Regex para capturar argumentos, respeitando aspas e escapes
  const args = cleanCommand.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|--?\S+|(?:https?:\/\/\S+)|[^\s=]+=?[^\s]*/g) || [];

  let hasFormData = false;
  let hasUrlEncoded = false;
  let hasFile = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1] ? args[i + 1].replace(/^["']|["']$/g, '').replace(/\\"/g, '"').replace(/\\'/g, "'") : '';

    // Método HTTP (-X ou --request)
    if (arg === '-X' || arg === '--request') {
      request.method = nextArg.toUpperCase();
      i++;
    } 
    // Headers (-H ou --header)
    else if (arg === '-H' || arg === '--header') {
      const separatorIndex = nextArg.indexOf(':');
      if (separatorIndex !== -1) {
        const key = nextArg.substring(0, separatorIndex).trim();
        const value = nextArg.substring(separatorIndex + 1).trim();

        const lowerKey = key.toLowerCase();
        if (lowerKey === 'authorization') {
          const lowerVal = value.toLowerCase();
          if (lowerVal.startsWith('bearer ')) {
            request.authType = 'bearer';
            request.authToken = value.substring(7).trim();
          } else if (lowerVal.startsWith('basic ')) {
            request.authType = 'basic';
            try {
              const base64 = value.substring(6).trim();
              const decoded = atob(base64);
              const colonIndex = decoded.indexOf(':');
              request.authUsername = colonIndex > -1 ? decoded.substring(0, colonIndex) : decoded;
              request.authPassword = colonIndex > -1 ? decoded.substring(colonIndex + 1) : '';
            } catch (e) {}
          }
        } else if (lowerKey === 'x-api-key' || lowerKey === 'apikey') {
          request.authType = 'apikey';
          request.apiKeyName = key;
          request.apiKeyValue = value;
          request.headers.push({ key, value });
        } else {
          request.headers.push({ key, value });
        }
      }
      i++;
    } 
    // Form Data (-F ou --form)
    else if (arg === '-F' || arg === '--form') {
      hasFormData = true;
      
      const eqIndex = nextArg.indexOf('=');
      const key = eqIndex > -1 ? nextArg.substring(0, eqIndex) : nextArg;
      const value = eqIndex > -1 ? nextArg.substring(eqIndex + 1) : '';
      
      request.bodyParams.push({
        key: key,
        value: value,
        type: value.startsWith('@') ? 'file' : 'text'
      });
      
      request.bodyRaw = request.bodyRaw ? request.bodyRaw + '\n' + nextArg : nextArg;
      if (request.method === 'GET') request.method = 'POST';
      i++;
    }
    // Dados/Corpo (-d, --data, --data-raw, --data-binary, --data-urlencode)
    else if (arg.match(/^-d|--data/)) {
      if (arg.includes('binary') && nextArg.startsWith('@')) {
        hasFile = true;
      } else if (arg.includes('urlencode')) {
        hasUrlEncoded = true;
      }
      
      // Concatena dados com & se for -d padrão (comportamento curl), senão apenas guarda
      if (request.bodyRaw && !hasFormData) {
        request.bodyRaw += '&' + nextArg;
      } else {
        request.bodyRaw = nextArg;
      }

      if (request.method === 'GET') request.method = 'POST';
      i++;
    }
    // Basic Auth via flag (-u ou --user)
    else if (arg === '-u' || arg === '--user') {
      request.authType = 'basic';
      const colonIndex = nextArg.indexOf(':');
      request.authUsername = colonIndex > -1 ? nextArg.substring(0, colonIndex) : nextArg;
      request.authPassword = colonIndex > -1 ? nextArg.substring(colonIndex + 1) : '';
      i++;
    }
    // URL (geralmente começa com http)
    else if (!request.url && (arg.startsWith('http') || arg.startsWith('"http') || arg.startsWith("'http"))) {
      request.url = arg.replace(/^["']|["']$/g, '');
    }
  }

  // Lógica de Inferência de bodyType final (Pós-processamento)
  if (hasFormData || hasFile) { // Prioriza form-data se houver -F ou --data-binary @file
    request.bodyType = 'form-data';
    
    // Se foi detectado arquivo via --data-binary, cria o parâmetro para o multipart
    // Isso é importante para que o backend saiba que é um arquivo e não um texto literal
    // E para que o ConfigView possa exibir o campo como 'file'
    // A chave 'file' é um fallback, pode ser sobrescrita se o cURL tiver -F "minha_chave=@arquivo"
    // Mas se for --data-binary @arquivo, o cURL não especifica a chave, então 'file' é um bom padrão.
    // Verifica se bodyParams já não foi populado por -F
    // E se o bodyRaw realmente começa com @ (indicando um arquivo)
    // E se o método é POST (GET com --data-binary não faz sentido e seria um erro do cURL)
    // TODO: Considerar se o método deve ser forçado para POST aqui se for GET e tiver --data-binary
    if (hasFile && request.bodyParams.length === 0 && request.bodyRaw.startsWith('@')) {
      request.bodyParams.push({
        key: 'file',
        value: request.bodyRaw,
        type: 'file'
      });
    }
  } else if (hasUrlEncoded) { // Prioriza form-urlencoded se houver --data-urlencode
    request.bodyType = 'form-urlencoded';
  } else if (request.bodyRaw) {
    const contentTypeHeader = request.headers.find(h => h.key.toLowerCase() === 'content-type');
    if (contentTypeHeader) {
      const ct = contentTypeHeader.value.toLowerCase();
      if (ct.includes('json')) request.bodyType = 'json';
      else if (ct.includes('xml')) request.bodyType = 'xml';
      else if (ct.includes('x-www-form-urlencoded')) request.bodyType = 'form-urlencoded';
      else if (ct.includes('multipart/form-data')) request.bodyType = 'form-data';
      else request.bodyType = 'text';
    } else { // Heurística final se não houver Content-Type
      const trimmedBody = request.bodyRaw.trim();
      if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) request.bodyType = 'json';
      else if (trimmedBody.startsWith('<')) request.bodyType = 'xml';
      else if (trimmedBody.includes('=') && !trimmedBody.startsWith('{') && !trimmedBody.startsWith('<')) request.bodyType = 'form-urlencoded'; // Heurística para form-urlencoded sem Content-Type
      else request.bodyType = 'text';
    }
  }

  // Se for form-urlencoded, popula os bodyParams para a tabela da UI
  if (request.bodyType === 'form-urlencoded' && request.bodyRaw && request.bodyParams.length === 0) {
    const pairs = request.bodyRaw.split('&');
    pairs.forEach(pair => {
      const eqIndex = pair.indexOf('=');
      const key = eqIndex > -1 ? pair.substring(0, eqIndex) : pair;
      const value = eqIndex > -1 ? pair.substring(eqIndex + 1) : '';
      if (key) {
        request.bodyParams.push({
          key: decodeURIComponent(key.replace(/\+/g, ' ')),
          value: decodeURIComponent(value.replace(/\+/g, ' ')),
          type: 'text'
        });
      }
    });
  }

  // Ajuste de nome se encontrar algo no path
  if (request.url) {
    try { request.name = `cURL: ${new URL(request.url).pathname}`; } catch(e) {}
  }

  return request;
}