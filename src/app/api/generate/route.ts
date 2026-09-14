import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

async function toImageFile(src: string, name: string) {
  let buf: Buffer;
  if (src.startsWith("http://") || src.startsWith("https://")) {
    const res = await fetch(src);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const base64Data = src.includes(",") ? src.split(",")[1] : src;
    buf = Buffer.from(base64Data, "base64");
  }
  return toFile(buf, name, { type: "image/png" });
}

async function analyzeImagesWithVision(
  openai: OpenAI,
  images: string[],
  userPrompt: string
): Promise<string> {
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  content.push({
    type: "text",
    text: `O usuario quer gerar uma imagem e enviou ${images.length} imagem(ns) de referencia junto com esta instrucao: "${userPrompt}"

Analise cada imagem de referencia detalhadamente. Descreva:
- O que cada imagem contem (objetos, cores, estilo, texto, layout, composicao)
- Como as imagens se relacionam com a instrucao do usuario

Depois, escreva um prompt DETALHADO para um modelo de geracao de imagens que combine os elementos das imagens de referencia conforme a instrucao do usuario. O prompt deve ser extremamente especifico sobre:
- Exatamente quais elementos visuais copiar de cada imagem
- Cores exatas, fontes, posicionamento de texto
- Composicao e layout desejados
- Estilo visual e estetica

Responda APENAS com o prompt final de geracao, sem explicacoes adicionais. O prompt deve ser em ingles para melhor resultado na geracao.`,
  });

  for (let i = 0; i < images.length; i++) {
    content.push({
      type: "image_url",
      image_url: { url: images[i] },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content }],
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || userPrompt;
}

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

  const { prompt, size, model, images } = body;

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
    const imgArray: string[] = Array.isArray(images) ? images : images ? [images] : [];

    if (imgArray.length > 0) {
      let enhancedPrompt = prompt.trim();
      if (imgArray.length >= 2) {
        enhancedPrompt = await analyzeImagesWithVision(openai, imgArray, prompt.trim());
      }

      const files = await Promise.all(
        imgArray.map((src: string, i: number) => toImageFile(src, `input_${i}.png`))
      );
      const imageParam = files.length === 1 ? files[0] : files;

      response = await openai.images.edit({
        model: chosenModel,
        image: imageParam,
        prompt: enhancedPrompt,
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
