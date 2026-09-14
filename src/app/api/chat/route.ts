import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key não configurada. Defina OPENAI_API_KEY no servidor." },
      { status: 500 }
    );
  }

  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Mensagens são obrigatórias." },
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
            "Você é o assistente de IA do Grupo Shogun. Ajude os usuários a criar prompts de geração de imagens. Responda sempre em português do Brasil de forma amigável e profissional. Quando o usuário pedir para gerar uma imagem, responda com uma descrição detalhada do prompt que será usado e confirme que a imagem está sendo gerada.",
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
