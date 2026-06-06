
import { GoogleGenAI, Type } from "@google/genai";
import { LabEnvironment, LabAnalysis, LabTask, LabFix } from "../types";

export const analyzeLabInstructions = async (
  instructions: string,
  env: LabEnvironment,
  iamContext: string
): Promise<LabAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    PERSONA: You are the "Google Cloud Lab Architect," an expert in GCP automation, IaC (Terraform), and cloud-native application development.

    CORE LOGIC DIRECTIVES:
    1. INTENT CLASSIFICATION: Analyze if the request is a "Native Build" (standard GCP services/configs) or a "Full Development Workflow" (custom apps, repos, kubectl, specific dev steps).
    2. PERFORMANCE OPTIMIZATION: Keep Native Build responses 30% shorter, focusing on commands. 

    ENVIRONMENT:
    User 1 Project ID: ${env.projectId}
    User 1 Username: ${env.username}
    Region: ${env.region}
    Zone: ${env.zone}
    ${env.projectId2 ? `User 2 Project ID: ${env.projectId2}` : ''}
    ${env.username2 ? `User 2 Username: ${env.username2}` : ''}

    INSTRUCTIONS:
    ${instructions}

    REQUIREMENTS:
    - Task 1: "IAM & Service Account Verification".
    - Categorize as 'Native Build' or 'Full Development'.
    - If 'Full Development': Provide code snippets, directory structure, and 'File Generation' steps.
    - If 'Native Build': Provide concise gcloud/IaC snippets.
    - Include exact snippets for Linux, BigQuery (bq), Kubernetes (kubectl), and gcloud (pull, push, repo creation).
    - IaC (TERRAFORM): Generate .tf files, include provider blocks.

    SCHEMA REQUIREMENT:
    Return a JSON object matching this structure:
    {
      "labName": string,
      "overview": string (Markdown allowed),
      "strategy": string (Markdown allowed),
      "infrastructureSummary": string (Markdown allowed),
      "workflowType": "Native Build" | "Full Development",
      "estimatedTime": string,
      "tasks": [
        {
          "id": number,
          "title": string,
          "description": string,
          "assignedUser": "User 1" | "User 2" | "Both",
          "commands": string[],
          "terraformCode": string (HCL code),
          "codeFiles": [{"path": string, "content": string, "language": string}],
          "framework": "bash" | "terraform" | "gcloud" | "python" | "k8s" | "code"
        }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Invalid response format from AI");
  }
};

export const refineLabAnalysis = async (
  currentAnalysis: LabAnalysis,
  refinementPrompt: string,
  env: LabEnvironment
): Promise<LabAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    PERSONA: You are the "Google Cloud Lab Architect."
    Current Lab Plan for: ${currentAnalysis.labName}
    User Refinement Request: "${refinementPrompt}"
    
    Environment:
    User 1 Project: ${env.projectId}, User 1 Username: ${env.username}
    ${env.projectId2 ? `User 2 Project: ${env.projectId2}, User 2 Username: ${env.username2}` : ''}
    Region: ${env.region}

    Update the current lab tasks to incorporate feedback. 
    Maintain the 'Native Build' or 'Full Development' classification and include code snippets/HCL as needed.

    Return the updated FULL LabAnalysis object in JSON format following the same structure.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    throw new Error("Refinement failed.");
  }
};

export const troubleshootTask = async (
  task: LabTask,
  errorOutput: string,
  env: LabEnvironment
): Promise<LabFix> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    The user encountered an error while executing task: "${task.title}".
    Original Commands:
    ${task.commands.join('\n')}

    Error Output from Terminal:
    ${errorOutput}

    Environment Context:
    User 1 Project: ${env.projectId}, Region: ${env.region}, Zone: ${env.zone}
    ${env.projectId2 ? `User 2 Project: ${env.projectId2}` : ''}

    Analyze the error output. Specifically check for:
    - Service agent IAM missing (e.g. roles/pubsub.publisher for GCS service account).
    - Resource already exists errors.
    - Quota limitations.
    - Incorrect machine scaling or load balancing configuration.

    Provide a remediation plan and corrected commands.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          remediation: { type: Type.STRING },
          commands: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["remediation", "commands"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    throw new Error("Failed to generate a fix.");
  }
};

export const generateLabSummary = async (
  analysis: LabAnalysis,
  env: LabEnvironment
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Create a professional summary of the completed lab: ${analysis.labName}.
    Environment used: Project ${env.projectId} in ${env.region}.
    
    The summary should explain:
    1. Key architectural components created.
    2. Challenges overcome (mention if any troubleshooting was needed).
    3. How these skills translate to Google Cloud Professional Cloud Architect or Engineer roles.
    
    Keep it concise for an advanced user.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "Summary generation failed.";
};
