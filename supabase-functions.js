const { config, logger } = require('./config');

// Usa fetch nativo di Node.js 18+
const fetch = globalThis.fetch;

// Definizione dei tools disponibili per OpenAI
const tools = [
  {
    type: 'function',
    name: 'get_user_info',
    description: 'Ottiene informazioni su un cliente dal database',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Numero di telefono del cliente'
        },
        name: {
          type: 'string',
          description: 'Nome del cliente'
        }
      }
    }
  },
  {
    type: 'function',
    name: 'get_appointments',
    description: 'Verifica gli appuntamenti disponibili',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Data richiesta in formato YYYY-MM-DD'
        }
      }
    }
  },
  {
    type: 'function',
    name: 'get_practice_status',
    description: 'Controlla lo stato di una pratica',
    parameters: {
      type: 'object',
      properties: {
        practice_id: {
          type: 'string',
          description: 'ID della pratica'
        }
      }
    }
  }
];

// Funzione per chiamare Supabase
async function callSupabaseFunction(functionName, params) {
  const supabaseUrl = config.SUPABASE_URL;
  const supabaseKey = config.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase credentials not configured');
    return { error: 'Sistema non configurato' };
  }

  try {
    // Esempio di chiamata REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error(`Error calling Supabase function ${functionName}: ${error.message}`);
    return { error: error.message };
  }
}

// Handler per le funzioni
async function handleFunctionCall(functionName, args) {
  logger.info(`Handling function call: ${functionName} with args: ${JSON.stringify(args)}`);

  switch (functionName) {
    case 'get_user_info':
      return await getUserInfo(args);
    case 'get_appointments':
      return await getAppointments(args);
    case 'get_practice_status':
      return await getPracticeStatus(args);
    default:
      return { error: 'Funzione non trovata' };
  }
}

// Implementazioni specifiche
async function getUserInfo(args) {
  // Query al database Supabase
  const supabaseUrl = config.SUPABASE_URL;
  const supabaseKey = config.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/clienti?or=(telefono.eq.${args.phone},nome.ilike.*${args.name}*)&select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        success: true,
        cliente: {
          nome: data[0].nome,
          cognome: data[0].cognome,
          telefono: data[0].telefono,
          email: data[0].email
        }
      };
    }
    return { success: false, message: 'Cliente non trovato' };
  } catch (error) {
    logger.error(`Error in getUserInfo: ${error.message}`);
    return { error: error.message };
  }
}

async function getAppointments(args) {
  const supabaseUrl = config.SUPABASE_URL;
  const supabaseKey = config.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/bookings?date.eq.${args.date}&status.eq.available&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    return {
      success: true,
      appuntamenti: data.map(a => ({
        ora: a.time,
        disponibile: true
      }))
    };
  } catch (error) {
    logger.error(`Error in getAppointments: ${error.message}`);
    return { error: error.message };
  }
}

async function getPracticeStatus(args) {
  const supabaseUrl = config.SUPABASE_URL;
  const supabaseKey = config.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/practices?id.eq.${args.practice_id}&select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        success: true,
        pratica: {
          id: data[0].id,
          stato: data[0].status,
          descrizione: data[0].description
        }
      };
    }
    return { success: false, message: 'Pratica non trovata' };
  } catch (error) {
    logger.error(`Error in getPracticeStatus: ${error.message}`);
    return { error: error.message };
  }
}

module.exports = {
  tools,
  handleFunctionCall
};
