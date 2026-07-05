import { askGateway } from './gatewayClient';

// All coaching calls route through the ai-gateway's /ask endpoint (via the
// same-origin /api/ask serverless proxy — see api/ask.ts) instead of
// calling @google/genai directly from the browser. "Nothing bypasses the
// gateway." /ask is a flat text-in/text-out endpoint (no multi-turn roles,
// no system-instruction field, no structured-output schema), so prompts
// below fold persona/system instructions and chat history into one string.
//
// generateCoverImage was removed here (not migrated): the gateway has no
// image-generation capability, and it had no live caller in the app — a
// dead bypass isn't a smaller violation than a live one, so it's deleted
// rather than left in place pending a future gateway image endpoint.

async function askOrFallback(prompt, fallback) {
  try {
    const result = await askGateway(prompt);
    if (result.hil_pending) {
      console.warn('askGateway: request held for human review', result.hil_reason);
      return fallback;
    }
    return result.response || fallback;
  } catch (error) {
    console.error('Gateway ask failed:', error);
    return fallback;
  }
}

export async function getAICoachTip(openingName, currentMoves) {
  return askOrFallback(
    `You are an expert chess coach. The user is practicing the ${openingName} opening. The moves played so far are: ${currentMoves.join(', ')}. Give a single, short, punchy 1-sentence tip about the current position or the next move.`,
    'Focus on controlling the center and developing your pieces.'
  );
}

export async function sendMessageToCaruana(chatHistory, message, fenToAnalyze, openingName) {
  const historyText = chatHistory
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Fabiano'}: ${turn.parts?.map((p) => p.text).join(' ') ?? ''}`)
    .join('\n');
  const prompt = `You are Grandmaster Fabiano Caruana. You are analyzing the user's chess position. Keep your answers concise, analytical, objective, and somewhat dry but encouraging. Always stay in character as Fabiano. Format your response cleanly in Markdown. Focus on concrete variations and positional understanding.

${historyText ? historyText + '\n' : ''}[System Context: The user is currently playing the ${openingName}. The current board FEN is ${fenToAnalyze}.]

User: ${message}`;
  return askOrFallback(prompt, '*Sigh* I seem to be having connection issues. Let me look at the board again in a moment.');
}

export async function getDeepAnalysis(openingName, moves) {
  return askOrFallback(
    `You are a Grandmaster chess theoretician. Provide a deep, insightful analysis of the ${openingName} opening, specifically the line: ${moves.join(', ')}. Explain the core ideas, typical plans for both sides, and common pitfalls. Format the response in clean Markdown.`,
    'Analysis unavailable.'
  );
}

/// Generic single-persona coaching ask — used where a feature needs a
/// specific coach's voice on a specific prompt (e.g. Endgame Dojo's "Ask
/// Magnus") without a dedicated function like sendMessageToCaruana's chat
/// history.
export async function askCoach(personaDescription, promptText) {
  return askOrFallback(
    `You are ${personaDescription}. Keep your answers concise, analytical, and encouraging. 2-3 sentences max.\n\n${promptText}`,
    `Couldn't reach ${personaDescription} — check your connection.`
  );
}

export async function analyzePgnAndExpandRepertoire(pgn) {
  try {
    const result = await Promise.race([
      askGateway(
        `You are a Grandmaster chess coach. Analyze this game PGN and find where the opponent deviated from standard repertoire lines within the first 12 moves. Determine the best continuation against this deviation. Return JSON only, no markdown code fences, with exactly these keys: name (string), description (string), moves (array of SAN strings, exactly 12 moves / 24 plies from move 1).\n\nPGN:\n${pgn}`
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000)),
    ]);
    if (result.hil_pending) {
      console.warn('analyzePgnAndExpandRepertoire: held for human review', result.hil_reason);
      return null;
    }
    if (result?.response) {
      const text = result.response.trim().replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(text);
    }
    return null;
  } catch (error) {
    console.error('Error analyzing PGN:', error);
    return null;
  }
}
