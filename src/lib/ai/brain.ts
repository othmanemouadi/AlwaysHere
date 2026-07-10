import "server-only";
import type OpenAI from "openai";
import { aiModel, getOpenAI } from "./client";
import { buildSystemPrompt, type PromptBusiness, type PromptFaq, type PromptHours, type PromptService } from "./prompt";
import {
  dispatchToolCall,
  newTurnState,
  TOOL_DEFINITIONS,
  type ToolContext,
  type TurnState,
} from "./tools";

/** Narrow client interface so tests can inject a fake. */
export interface ChatClient {
  chat: {
    completions: {
      create(
        body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      ): Promise<OpenAI.Chat.Completions.ChatCompletion>;
    };
  };
}

export type TranscriptRow = { role: string; content: string };

export type AssistantTurnInput = {
  business: PromptBusiness & { id: number; notificationPhone?: string | null };
  services: PromptService[];
  faqs: PromptFaq[];
  hours: PromptHours[];
  callId: number;
  fromNumber: string;
  transcript: TranscriptRow[];
  client?: ChatClient;
  model?: string;
  dispatch?: typeof dispatchToolCall;
  now?: Date;
};

export type AssistantTurnResult = {
  say: string;
  turnState: TurnState;
};

const MAX_TOOL_ROUNDS = 4;

export async function runAssistantTurn(
  input: AssistantTurnInput,
): Promise<AssistantTurnResult> {
  const client = input.client ?? getOpenAI();
  const model = input.model ?? aiModel();
  const dispatch = input.dispatch ?? dispatchToolCall;

  const turnState = newTurnState();
  const toolContext: ToolContext = {
    businessId: input.business.id,
    businessName: input.business.name,
    timezone: input.business.timezone,
    notificationPhone: input.business.notificationPhone ?? null,
    callId: input.callId,
    fromNumber: input.fromNumber,
    turnState,
  };

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        business: input.business,
        services: input.services,
        faqs: input.faqs,
        hours: input.hours,
        now: input.now,
      }),
    },
    ...input.transcript
      .filter((m) => m.role === "caller" || m.role === "assistant")
      .map((m) =>
        m.role === "caller"
          ? ({ role: "user", content: m.content } as const)
          : ({ role: "assistant", content: m.content } as const),
      ),
  ];

  let say = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools: TOOL_DEFINITIONS,
      temperature: 0.4,
      max_tokens: 400,
    });
    const choice = completion.choices[0]?.message;
    if (!choice) break;

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: choice.content ?? null,
        tool_calls: choice.tool_calls,
      });
      for (const toolCall of choice.tool_calls) {
        if (toolCall.type !== "function") continue;
        const result = await dispatch(
          toolContext,
          toolCall.function.name,
          toolCall.function.arguments,
        );
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
      // If the model already decided to hang up, don't force another round.
      if (turnState.endCall && choice.content) {
        say = choice.content;
        break;
      }
      continue;
    }

    say = choice.content?.trim() ?? "";
    break;
  }

  if (!say) {
    say =
      turnState.farewell ??
      "Sorry, I'm having trouble right now. The team will see your number and call you back.";
  }
  return { say, turnState };
}

export type CallSummary = { summary: string; intent: string };

export async function generateCallSummary(input: {
  businessName: string;
  transcript: TranscriptRow[];
  client?: ChatClient;
  model?: string;
}): Promise<CallSummary> {
  const client = input.client ?? getOpenAI();
  const model = input.model ?? aiModel();
  const text = input.transcript
    .filter((m) => m.role === "caller" || m.role === "assistant")
    .map((m) => `${m.role === "caller" ? "Caller" : "Receptionist"}: ${m.content}`)
    .join("\n");

  const fallback: CallSummary = {
    summary: "Call handled by the AI receptionist. See transcript for details.",
    intent: "unknown",
  };
  if (!text) return fallback;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            'You summarize phone calls for a business owner. Reply with JSON only: {"summary": "2-3 sentences: who called, what they needed, what happened, any follow-up needed", "intent": "2-4 word label like appointment_booking, pricing_question, urgent_issue"}',
        },
        { role: "user", content: `Business: ${input.businessName}\n\nTranscript:\n${text}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 300,
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as Partial<CallSummary>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      intent: typeof parsed.intent === "string" ? parsed.intent : fallback.intent,
    };
  } catch (error) {
    console.error("[ai] summary generation failed:", error);
    return fallback;
  }
}
