const fs = require("node:fs");
const path = require("node:path");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

const DEFAULT_MODEL = "gemini-2.0-flash";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(payload),
  };
}

function getLocalEnvValue(name) {
  const candidatePaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(__dirname, "..", ".env.local"),
  ];

  for (const filePath of candidatePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();

      if (key !== name) {
        continue;
      }

      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      return rawValue.replace(/^['"]|['"]$/g, "");
    }
  }

  return "";
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { success: false, error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY || getLocalEnvValue("GEMINI_API_KEY");
  const model =
    process.env.GEMINI_MODEL ||
    getLocalEnvValue("GEMINI_MODEL") ||
    DEFAULT_MODEL;

  if (!apiKey) {
    return json(500, {
      success: false,
      error:
        "GEMINI_API_KEY não configurada no ambiente. Defina a variável no Netlify ou em .env.local para usar com netlify dev.",
    });
  }

  let prompt;

  try {
    const body = JSON.parse(event.body || "{}");
    prompt = body.prompt;
  } catch {
    return json(400, { success: false, error: "JSON inválido no corpo da requisição." });
  }

  if (!prompt || !prompt.trim()) {
    return json(400, { success: false, error: "Prompt é obrigatório." });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        result?.error?.message ||
        "Falha inesperada ao consultar a API da Gemini.";

      const statusCode = response.status === 429 ? 429 : 502;

      return json(statusCode, {
        success: false,
        error:
          response.status === 429
            ? `A Gemini recusou a solicitação por limite de uso ou cota. ${message}`
            : `Erro na API da Gemini: ${message}`,
      });
    }

    const text = result?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim();

    if (!text) {
      return json(502, {
        success: false,
        error: "A Gemini respondeu sem texto utilizável.",
      });
    }

    return json(200, { success: true, text });
  } catch (error) {
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno ao processar a requisição.",
    });
  }
};
