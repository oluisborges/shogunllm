import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiKey =
    req.headers.get("x-api-key") || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key nao configurada. Va em Configuracoes e adicione sua chave." },
      { status: 401 }
    );
  }

  const { prompt, size } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt e obrigatorio." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size: size || "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt;

    return NextResponse.json({ imageUrl, revisedPrompt });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido ao gerar imagem.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
