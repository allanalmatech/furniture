'use server';
/**
 * @fileOverview An AI flow for generating SMS marketing campaigns.
 *
 * - generateSmsCampaign - A function that handles the SMS campaign generation process.
 * - GenerateSmsCampaignInput - The input type for the generateSmsCampaign function.
 * - GenerateSmsCampaignOutput - The return type for the generateSmsCampaign function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const GenerateSmsCampaignInputSchema = z.object({
  topic: z.string().describe('The main topic or message for the SMS campaign.'),
});
export type GenerateSmsCampaignInput = z.infer<typeof GenerateSmsCampaignInputSchema>;

const GenerateSmsCampaignOutputSchema = z.object({
  message: z.string().describe('The generated SMS message content.'),
});
export type GenerateSmsCampaignOutput = z.infer<typeof GenerateSmsCampaignOutputSchema>;

export async function generateSmsCampaign(input: GenerateSmsCampaignInput): Promise<GenerateSmsCampaignOutput> {
  return smsCampaignFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smsCampaignPrompt',
  input: {schema: GenerateSmsCampaignInputSchema},
  output: {schema: GenerateSmsCampaignOutputSchema},
  prompt: `You are an expert SMS marketer. Your task is to generate a compelling and concise SMS message based on the provided topic.

The message must be under 160 characters. It should be punchy and have a clear call-to-action. If a link is relevant, use a placeholder like 'bit.ly/xxxx'.

Topic: {{{topic}}}
`,
});

const smsCampaignFlow = ai.defineFlow(
  {
    name: 'smsCampaignFlow',
    inputSchema: GenerateSmsCampaignInputSchema,
    outputSchema: GenerateSmsCampaignOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        return { message: "Error: The AI failed to generate an SMS message. Please try again." };
    }
    return output;
  }
);
