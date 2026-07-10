import { describe, expect, it, vi } from "vitest";
import { generateCallSummary, runAssistantTurn, type ChatClient } from "./brain";

const business = {
  id: 1,
  name: "Riverside Dental",
  timezone: "America/New_York",
  defaultLanguage: "en",
  description: "",
  notificationPhone: "+15550001111",
};

function completionWithContent(content: string) {
  return {
    choices: [{ message: { role: "assistant", content, tool_calls: undefined } }],
  };
}

function completionWithToolCall(name: string, args: object, content: string | null = null) {
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content,
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        },
      },
    ],
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fakeClient(queue: unknown[]): ChatClient & { calls: any[] } {
  const calls: any[] = [];
  return {
    calls,
    chat: {
      completions: {
        create: vi.fn(async (body: any) => {
          calls.push(body);
          if (queue.length === 0) throw new Error("fake client queue exhausted");
          return queue.shift() as any;
        }),
      },
    },
  };
}

const baseInput = {
  business,
  services: [],
  faqs: [],
  hours: [],
  callId: 42,
  fromNumber: "+15559998888",
  transcript: [
    { role: "assistant", content: "Hello, how can I help?" },
    { role: "caller", content: "Do you have anything tomorrow?" },
  ],
  model: "test-model",
};

describe("runAssistantTurn", () => {
  it("returns the model's reply for a plain answer", async () => {
    const client = fakeClient([completionWithContent("We're open nine to five.")]);
    const result = await runAssistantTurn({ ...baseInput, client });
    expect(result.say).toBe("We're open nine to five.");
    expect(result.turnState.endCall).toBe(false);
    // Transcript rows are mapped into the chat: system + 2 turns
    expect(client.calls[0].messages).toHaveLength(3);
    expect(client.calls[0].messages[0].role).toBe("system");
    expect(client.calls[0].messages[2]).toEqual({
      role: "user",
      content: "Do you have anything tomorrow?",
    });
  });

  it("dispatches tool calls and feeds results back to the model", async () => {
    const dispatch = vi.fn(async () => "Open times on 2024-01-02: 9:00 AM, 9:30 AM.");
    const client = fakeClient([
      completionWithToolCall("check_availability", { date: "2024-01-02" }),
      completionWithContent("We have nine or nine thirty tomorrow morning."),
    ]);
    const result = await runAssistantTurn({ ...baseInput, client, dispatch });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][1]).toBe("check_availability");
    expect(result.say).toBe("We have nine or nine thirty tomorrow morning.");
    // Second round must include the tool result message
    const secondMessages = client.calls[1].messages;
    expect(secondMessages.at(-1)).toMatchObject({
      role: "tool",
      content: "Open times on 2024-01-02: 9:00 AM, 9:30 AM.",
    });
  });

  it("ends the call when the model calls end_call, speaking the farewell", async () => {
    const dispatch = vi.fn(async (ctx: any, name: string, rawArgs: string) => {
      if (name === "end_call") {
        ctx.turnState.endCall = true;
        ctx.turnState.farewell = JSON.parse(rawArgs).farewell;
        return "Call will end after your farewell.";
      }
      return "ok";
    });
    const client = fakeClient([
      completionWithToolCall("end_call", { farewell: "Thanks for calling, goodbye!" }),
      completionWithContent(""),
    ]);
    const result = await runAssistantTurn({ ...baseInput, client, dispatch });
    expect(result.turnState.endCall).toBe(true);
    expect(result.say).toBe("Thanks for calling, goodbye!");
  });

  it("stops the tool loop after the round cap and still says something", async () => {
    const dispatch = vi.fn(async () => "ok");
    const loop = completionWithToolCall("capture_lead", { name: "A", reason: "b" });
    const client = fakeClient([loop, loop, loop, loop, loop]);
    const result = await runAssistantTurn({ ...baseInput, client, dispatch });
    expect(client.calls.length).toBeLessThanOrEqual(4);
    expect(result.say.length).toBeGreaterThan(0);
  });
});

describe("generateCallSummary", () => {
  it("parses the model's JSON", async () => {
    const client = fakeClient([
      completionWithContent(
        JSON.stringify({ summary: "Caller booked a cleaning.", intent: "appointment_booking" }),
      ),
    ]);
    const result = await generateCallSummary({
      businessName: "Riverside Dental",
      transcript: [{ role: "caller", content: "I'd like a cleaning" }],
      client,
      model: "test-model",
    });
    expect(result).toEqual({
      summary: "Caller booked a cleaning.",
      intent: "appointment_booking",
    });
  });

  it("falls back gracefully on malformed output", async () => {
    const client = fakeClient([completionWithContent("not json at all")]);
    const result = await generateCallSummary({
      businessName: "Riverside Dental",
      transcript: [{ role: "caller", content: "hello" }],
      client,
      model: "test-model",
    });
    expect(result.intent).toBe("unknown");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("returns the fallback without calling the model on an empty transcript", async () => {
    const client = fakeClient([]);
    const result = await generateCallSummary({
      businessName: "Riverside Dental",
      transcript: [],
      client,
      model: "test-model",
    });
    expect(result.intent).toBe("unknown");
    expect(client.calls).toHaveLength(0);
  });
});
