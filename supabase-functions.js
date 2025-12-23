const { config: appConfig, logger } = require('./config');

// Usa fetch nativo di Node.js 18+
const fetch = globalThis.fetch;

/**
 * Carica la configurazione dell'assistente dalla tabella ai_voice_config
 */
async function getAIConfig() {
  const supabaseUrl = appConfig.SUPABASE_URL;
  const supabaseKey = appConfig.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/ai_voice_config?select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) throw new Error(`Status: ${response.status}`);
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        system_prompt: data[0].system_prompt,
        welcome_message: data[0].welcome_message,
        voice: data[0].voice || 'alloy',
        name: data[0].assistant_name || 'Elisa'
      };
    }
  } catch (error) {
    logger.error(`Errore nel caricamento della configurazione AI: ${error.message}`);
  }
  return null;
}

/**
 * Definizione dei tools disponibili per OpenAI Realtime
 */
const tools = [
  {
    type: 'function',
    name: 'find_available_slots',
    description: 'Cerca gli slot disponibili per un appuntamento nel calendario.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data richiesta in formato YYYY-MM-DD' },
        service_id: { type: 'string', description: 'ID del servizio richiesto (opzionale)' }
      },
      required: ['date']
    }
  },
  {
    type: 'function',
    name: 'book_appointment',
    description: 'Registra un appuntamento per il cliente.',
    parameters: {
      type: 'object',
      properties: {
        slot_id: { type: 'string', description: 'L\'ID dello slot selezionato' },
        customer_name: { type: 'string', description: 'Nome del cliente' },
        customer_phone: { type: 'string', description: 'Telefono del cliente' },
        service_id: { type: 'string', description: 'ID del servizio scelto' }
      },
      required: ['slot_id', 'customer_name', 'customer_phone']
    }
  },
  {
    type: 'function',
    name: 'search_knowledge',
    description: 'Cerca informazioni su bonus, documenti, normative fiscali e orari dell\'ufficio.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'La domanda o l\'argomento da cercare' }
      },
      required: ['query']
    }
  },
  {
    type: 'function',
    name: 'send_whatsapp',
    description: 'Invia un messaggio WhatsApp di conferma o riepilogo documenti.',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Numero di telefono con prefisso internazionale (es. +39...)' },
        message: { type: 'string', description: 'Contenuto del messaggio' }
      },
      required: ['phone', 'message']
    }
  }
];

/**
 * Helper per chiamare le Edge Functions di Supabase
 */
async function callEdgeFunction(functionName, payload) {
  const supabaseUrl = appConfig.SUPABASE_URL;
  const supabaseKey = appConfig.SUPABASE_ANON_KEY;

  logger.info(`Chiamata Edge Function: ${functionName}`);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Edge Function ${functionName} ha restituito errore: ${errorText}`);
      return { error: `Errore nella funzione ${functionName}`, status: response.status };
    }

    return await response.json();
  } catch (error) {
    logger.error(`Eccezione durante la chiamata alla Edge Function ${functionName}: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Handler per il routing delle chiamate ai tools
 */
async function handleFunctionCall(functionName, args) {
  logger.info(`Handling tool call: ${functionName} con argomenti: ${JSON.stringify(args)}`);

  switch (functionName) {
    case 'find_available_slots':
      return await callEdgeFunction('find-available-slots', args);
    
    case 'book_appointment':
      return await callEdgeFunction('public-booking-handler', args);
    
    case 'search_knowledge':
      return await callEdgeFunction('ai-knowledge-tools', args);
    
    case 'send_whatsapp':
      return await callEdgeFunction('send-whatsapp', args);
    
    case 'cleanup_conversation':
      return await callEdgeFunction('voice-conversation-cleanup', args);

    default:
      return { error: `Tool ${functionName} non riconosciuto` };
  }
}

module.exports = {
  tools,
  handleFunctionCall,
  getAIConfig
};

