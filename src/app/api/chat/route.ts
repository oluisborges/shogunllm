import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const apiKey =
    req.headers.get("x-api-key") || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key nao configurada. Va em Configuracoes e adicione sua chave." },
      { status: 401 }
    );
  }

  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Mensagens sao obrigatorias." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Voce e o assistente de IA do Grupo Shogun. Ajude os usuarios a criar prompts de geracao de imagens. Responda sempre em portugues do Brasil de forma amigavel e profissional. Quando o usuario pedir para gerar uma imagem, responda com uma descricao detalhada do prompt que sera usado e confirme que a imagem esta sendo gerada.",
        },
        ...messages,
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
