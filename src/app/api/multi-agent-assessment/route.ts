import { NextResponse } from "next/server";
import { anthropicMessage } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

type LogEntry = { timestamp: string; message: string; type: string };
type DialogueEntry = { timestamp: string; agent: string; message: string };

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const age = String(body.age ?? "").trim();
  const income = String(body.income ?? "").trim();
  const occupation = String(body.occupation ?? "").trim();
  const yearsExperience = String(body.yearsExperience ?? "").trim();
  const education = String(body.education ?? "").trim();
  const goals = String(body.goals ?? "").trim();

  const logs: LogEntry[] = [];
  const dialogues: DialogueEntry[] = [];

  const addLog = (message: string, type = "info") => {
    logs.push({ timestamp: nowIso(), message, type });
  };
  const addDialogue = (agent: string, message: string) => {
    dialogues.push({ timestamp: nowIso(), agent, message });
  };

  const formBlock = `Name: ${name}\nAge: ${age}\nIncome: ${income}\nOccupation: ${occupation}\nYears Experience: ${yearsExperience}\nEducation: ${education}\nGoals: ${goals}`;

  try {
    addLog("=== MULTI-AGENT ASSESSMENT STARTED ===", "header");

    addLog("Starting Concierge Agent...", "info");
    const greeting = await anthropicMessage({
      system:
        "You are the Concierge Agent. Your role is to greet users warmly and explain the multi-agent assessment process. Be professional, friendly, and reassuring. Explain that their form will be analyzed by multiple AI agents working together.",
      user: `Greet the user and explain that their submitted form will go through a multi-stage analysis process involving: 1) An Investigator who validates information, 2) An Administrator who conducts the assessment, and 3) A Grading Committee of 5 agents who will evaluate and score the results. Keep it under 100 words.`,
      maxTokens: 500,
    });
    addLog("Concierge responded", "success");
    addDialogue("Concierge", greeting);

    addLog("Starting Investigator Agent...", "info");
    const investigation = await anthropicMessage({
      system:
        "You are the Investigator Agent. Your role is to analyze form data for consistency, plausibility, and potential deception. Look for red flags like inconsistent age/experience, unrealistic income claims, vague responses, or logical contradictions. Be thorough but fair.",
      user: `Analyze this form submission for truthfulness and consistency:\n\n${formBlock}\n\nProvide your assessment with specific findings. Identify 1-3 key concerns or validations. Be concise (150 words max).`,
      maxTokens: 800,
    });
    addLog("Investigator responded", "success");
    addDialogue("Investigator", investigation);

    addLog("Starting Administrator Agent...", "info");
    const administration = await anthropicMessage({
      system:
        "You are the Test Administrator Agent. You oversee the assessment process, synthesizing investigator findings with form data to create a comprehensive analysis. Focus on calculating metrics like credibility score, completeness, and risk factors.",
      user: `Based on the investigator's findings and the original form data, create a structured assessment:\n\nInvestigator Report:\n${investigation}\n\nForm Data:\n${formBlock}\n\nProvide: 1) Credibility Score (0-100), 2) Key strengths, 3) Areas of concern. Keep under 200 words.`,
      maxTokens: 900,
    });
    addLog("Administrator responded", "success");
    addDialogue("Administrator", administration);

    addLog("Convening Grading Committee (5 agents)...", "info");
    const chairAnalysis = await anthropicMessage({
      system:
        "You are the Committee Chair of a 5-person grading committee. Review all evidence and provide your initial assessment and proposed score (0-100). Be balanced and consider both strengths and weaknesses.",
      user: `Review this case:\n\nAdministrator Report:\n${administration}\n\nInvestigator Report:\n${investigation}\n\nProvide your assessment and proposed score with brief justification (100 words).`,
      maxTokens: 600,
    });
    addDialogue("Committee Chair", chairAnalysis);

    const members = [
      "Member A (Skeptic)",
      "Member B (Optimist)",
      "Member C (Data Analyst)",
      "Member D (Risk Assessor)",
    ] as const;
    const memberResponses: string[] = [];

    for (const member of members) {
      const stance = member.includes("Skeptic")
        ? "critical and questioning"
        : member.includes("Optimist")
          ? "supportive and benefit-of-doubt"
          : member.includes("Data Analyst")
            ? "focused on statistical plausibility"
            : "focused on risk factors";

      const response = await anthropicMessage({
        system: `You are ${member} on a grading committee. Your perspective is ${stance}. React to the Chair's assessment and provide your own score recommendation.`,
        user: `Chair's Assessment:\n${chairAnalysis}\n\nProvide your perspective and score recommendation (60 words max).`,
        maxTokens: 400,
      });
      addDialogue(member, response);
      memberResponses.push(response);
      if (memberResponses.length > 1) {
        addLog(`${member} is discussing with other committee members...`, "dialogue");
      }
    }

    const finalDecision = await anthropicMessage({
      system:
        "You are the Committee Chair making the final decision. Consider all committee member inputs and synthesize them into a final verdict with score and recommendations.",
      user: `Committee Discussion:\n\nChair: ${chairAnalysis}\n\n${memberResponses.map((r, i) => `${members[i]}: ${r}`).join("\n\n")}\n\nProvide final score (0-100), verdict, and 2-3 key recommendations (150 words).`,
      maxTokens: 800,
    });
    addDialogue("Committee Chair (Final)", finalDecision);
    addLog("Committee has reached consensus", "success");

    addLog("=== ASSESSMENT COMPLETE ===", "header");

    return NextResponse.json({
      logs,
      dialogues,
      finalReport: {
        greeting,
        investigation,
        administration,
        finalGrade: finalDecision,
      },
      currentStep: "complete",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Assessment failed";
    addLog(`System error: ${msg}`, "error");
    return NextResponse.json(
      { error: msg, logs, dialogues },
      { status: msg.includes("ANTHROPIC_API_KEY") ? 503 : 500 }
    );
  }
}
