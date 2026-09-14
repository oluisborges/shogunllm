import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

const DEFAULT_SYSTEM =
  "Voce e o assistente de IA do Grupo Shogun. Ajude os usuarios a criar prompts de geracao de imagens. Responda sempre em portugues do Brasil de forma amigavel e profissional.";

const IMAGE_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_image",
    description:
      "Gera ou edita uma imagem usando IA. Use quando o usuario pedir para criar, gerar, fazer, desenhar, ou editar uma imagem, banner, logo, arte, design, poster, flyer, ou qualquer conteudo visual.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "Prompt detalhado em ingles para o modelo de geracao de imagens. Seja extremamente especifico sobre composicao, cores, estilo, texto, layout e todos os elementos visuais.",
        },
        size: {
          type: "string",
          enum: ["1024x1024", "1792x1024", "1024x1792"],
          description: "Tamanho da imagem. Padrao: 1024x1024.",
        },
      },
      required: ["prompt"],
    },
  },
};

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

async function generateImage(
  openai: OpenAI,
  prompt: string,
  size: string,
  referenceImages?: string[]
) {
  const model = "gpt-image-2.5-sunburst";

  if (referenceImages && referenceImages.length > 0) {
    let enhancedPrompt = prompt;
    if (referenceImages.length >= 2) {
      const content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [];
      content.push({
        type: "text",
        text: `O usuario quer gerar uma imagem e enviou ${referenceImages.length} imagem(ns) de referencia junto com esta instrucao de geracao: "${prompt}"

Analise cada imagem de referencia detalhadamente e escreva um prompt DETALHADO em ingles para um modelo de geracao de imagens que combine os elementos das imagens de referencia conforme a instrucao. O prompt deve ser extremamente especifico sobre elementos visuais, cores, fontes, posicionamento, composicao e estilo. Responda APENAS com o prompt final.`,
      });
      for (const img of referenceImages) {
        content.push({ type: "image_url", image_url: { url: img } });
      }
      const visionRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content }],
        max_tokens: 1000,
      });
      enhancedPrompt = visionRes.choices[0]?.message?.content || prompt;
    }

    const files = await Promise.all(
      referenceImages.map((src, i) => toImageFile(src, `input_${i}.png`))
    );
    const imageParam = files.length === 1 ? files[0] : files;

    const response = await openai.images.edit({
      model,
      image: imageParam,
      prompt: enhancedPrompt,
      size: size || "1024x1024",
    } as Parameters<typeof openai.images.edit>[0]);

    return response as { data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> };
  }

  const response = await openai.images.generate({
    model,
    prompt,
    n: 1,
    size: (size || "1024x1024") as "1024x1024" | "1792x1024" | "1024x1792",
    quality: "auto",
  } as Parameters<typeof openai.images.generate>[0]);

  return response as { data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> };
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key nao configurada. Va em Configuracoes e adicione sua chave." },
      { status: 401 }
    );
  }

  const { messages, systemPrompt, referenceImages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Mensagens sao obrigatorias." },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  const systemContent = (systemPrompt || DEFAULT_SYSTEM) +
    "\n\nVoce tem a capacidade de gerar imagens. Quando o usuario pedir para criar, gerar, fazer, desenhar ou editar qualquer tipo de imagem, banner, logo, arte, design, poster, flyer ou conteudo visual, use a funcao generate_image. Crie um prompt detalhado em INGLES para a geracao. Apos gerar, responda ao usuario confirmando o que foi criado.";

  const apiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages,
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: apiMessages,
      max_tokens: 4096,
      tools: [IMAGE_TOOL],
    });

    const choice = response.choices[0];
    const toolCalls = choice?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const imageCall = toolCalls.find((tc) => "function" in tc && tc.function.name === "generate_image");
      if (imageCall && "function" in imageCall) {
        const args = JSON.parse(imageCall.function.arguments);
        const imgPrompt: string = args.prompt;
        const imgSize: string = args.size || "1024x1024";

        const imgRefs: string[] = Array.isArray(referenceImages) ? referenceImages : [];
        const result = await generateImage(openai, imgPrompt, imgSize, imgRefs.length > 0 ? imgRefs : undefined);

        const item = result.data?.[0];
        let imageUrl: string | undefined;
        if (item?.b64_json) {
          imageUrl = `data:image/png;base64,${item.b64_json}`;
        } else if (item?.url) {
          const imgRes = await fetch(item.url);
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          imageUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;
        }

        const followUp = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...apiMessages,
            choice.message as ChatCompletionMessageParam,
            {
              role: "tool",
              tool_call_id: imageCall.id,
              content: JSON.stringify({ success: true, revised_prompt: item?.revised_prompt }),
            },
          ],
          max_tokens: 500,
        });

        const content = followUp.choices[0]?.message?.content || "Imagem gerada!";
        return NextResponse.json({ content, imageUrl, revisedPrompt: item?.revised_prompt });
      }
    }

    const content = choice?.message?.content || "";
    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
