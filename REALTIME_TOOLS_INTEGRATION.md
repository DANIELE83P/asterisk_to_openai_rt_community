# Integrazione OpenAI Realtime API con Tools/Functions

## Stato Attuale

Il sistema usa **OpenAI Realtime API** che al momento **NON supporta nativamente i function calls** come l'API standard di OpenAI.

### Limitazioni OpenAI Realtime API:
- ❌ Non supporta `tools` o `functions` nella session configuration
- ❌ Non può eseguire function calling durante la conversazione vocale
- ✅ Supporta solo conversazione audio/testo in tempo reale

## Soluzioni Possibili

### Opzione 1: Usare Assistant API (Raccomandato)
Se vuoi usare i tools configurati nel tuo assistente OpenAI:

1. **Passare da Realtime API a Assistant API** con audio
2. Configurare l'assistente con tools che chiamano Supabase Edge Functions
3. Gestire il ciclo: audio → trascrizione → assistant → function call → risposta → audio

**Vantaggi:**
- Supporto completo per function calling
- Usa il tuo assistente configurato
- Accesso a tutte le Edge Functions di Supabase

**Svantaggi:**
- Latenza maggiore (non real-time)
- Conversazione meno fluida

### Opzione 2: Keyword Detection + Function Call (Attuale)
Implementare detection di parole chiave nell'audio e chiamare manualmente le funzioni:

```javascript
// Nel codice quando ricevi trascrizione
if (transcript.includes('appuntamento')) {
  const result = await handleFunctionCall('get_appointments', params);
  ws.send(result); // Invia risposta all'assistente
}
```

**Vantaggi:**
- Mantiene real-time
- Controllo completo

**Svantaggi:**
- Logica manuale
- Meno flessibile

### Opzione 3: Hybrid Approach
Usare Realtime API per conversazione + chiamate asincrone a Supabase per dati:

1. Conversazione vocale in real-time
2. Quando serve un dato, pausare e fare query a Supabase
3. Iniettare il risultato nel contesto
4. Continuare conversazione

## Struttura File Creata

Ho creato `supabase-functions.js` con:
- Definizione tools (get_user_info, get_appointments, get_practice_status)
- Handler per chiamate a Supabase
- Query alle tabelle del database

## Prossimi Passi

Per completare l'integrazione servono:

1. **Credenziali Supabase nel config.conf:**
```properties
SUPABASE_URL=https://jcbfzkkzeqqmxkauxocb.supabase.co
SUPABASE_ANON_KEY=your_key_here
```

2. **Edge Functions specifiche** su Supabase da chiamare

3. **Decidere quale approccio usare** tra le 3 opzioni sopra

## Esempio di Uso

Se usi l'Opzione 2 (keyword detection):

```javascript
// In openai.js quando ricevi trascrizione utente
case 'conversation.item.input_audio_transcription.completed':
  const transcript = response.transcript.toLowerCase();
  
  if (transcript.includes('appuntamento')) {
    const result = await handleFunctionCall('get_appointments', {
      date: extractDate(transcript)
    });
    // Invia risposta strutturata all'assistente
  }
  break;
```

## Domande da Rispondere

1. Quale approccio preferisci? (Realtime con keywords o Assistant API con tools)
2. Quali Edge Functions hai già su Supabase?
3. Quali azioni deve poter fare l'assistente vocale?
