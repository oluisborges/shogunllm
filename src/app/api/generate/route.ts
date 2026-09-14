import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

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

  const { prompt, size, model, image } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt e obrigatorio." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const chosenModel = model || "gpt-image-2.5-sunburst";

  try {
    let response: unknown;

    if (image && typeof image === "string") {
      let buf: Buffer;
      if (image.startsWith("http://") || image.startsWith("https://")) {
        const imgRes = await fetch(image);
        buf = Buffer.from(await imgRes.arrayBuffer());
      } else {
        const base64Data = image.includes(",") ? image.split(",")[1] : image;
        buf = Buffer.from(base64Data, "base64");
      }
      const file = await toFile(buf, "input.png", { type: "image/png" });

      response = await openai.images.edit({
        model: chosenModel,
        image: file,
        prompt: prompt.trim(),
        size: size || "1024x1024",
      } as Parameters<typeof openai.images.edit>[0]);
    } else {
      response = await openai.images.generate({
        model: chosenModel,
        prompt: prompt.trim(),
        n: 1,
        size: size || "1024x1024",
        quality: "auto",
      } as Parameters<typeof openai.images.generate>[0]);
    }

    const result = response as { data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> };
    const item = result.data?.[0];
    let imageUrl: string | undefined;
    if (item?.b64_json) {
      imageUrl = `data:image/png;base64,${item.b64_json}`;
    } else if (item?.url) {
      const imgRes = await fetch(item.url);
      const imgBuf = Buffer.from(await imgRes.arrayBuffer());
      imageUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;
    }
    const revisedPrompt = item?.revised_prompt;

    return NextResponse.json({ imageUrl, revisedPrompt });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido ao gerar imagem.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
