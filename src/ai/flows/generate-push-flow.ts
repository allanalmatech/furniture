'use server';
/**
 * @fileOverview An AI flow for generating push notification campaigns.
 *
 * - generatePushCampaign - A function that handles the push notification generation process.
 * - GeneratePushCampaignInput - The input type for the generatePushCampaign function.
 * - GeneratePushCampaignOutput - The return type for the generatePushCampaign function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const GeneratePushCampaignInputSchema = z.object({
  topic: z.string().describe('The main topic or message for the push notification campaign.'),
});
export type GeneratePushCampaignInput = z.infer<typeof GeneratePushCampaignInputSchema>;

const GeneratePushCampaignOutputSchema = z.object({
  title: z.string().describe('The generated title for the push notification.'),
  body: z.string().describe('The generated body content for the push notification.'),
});
export type GeneratePushCampaignOutput = z.infer<typeof GeneratePushCampaignOutputSchema>;

export async function generatePushCampaign(input: GeneratePushCampaignInput): Promise<GeneratePushCampaignOutput> {
  return pushCampaignFlow(input);
}

const prompt = ai.definePrompt({
  name: 'pushCampaignPrompt',
  input: {schema: GeneratePushCampaignInputSchema},
  output: {schema: GeneratePushCampaignOutputSchema},
  prompt: `You are an expert mobile marketer. Your task is to generate a compelling push notification based on the provided topic.

Generate a short, attention-grabbing title and a concise body (around 20-30 words). The tone should be engaging and encourage a tap.

Topic: {{{topic}}}
`,
});

const pushCampaignFlow = ai.defineFlow(
  {
    name: 'pushCampaignFlow',
    inputSchema: GeneratePushCampaignInputSchema,
    outputSchema: GeneratePushCampaignOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        return {
          title: "Error",
          body: "The AI failed to generate push notification content. Please try again."
        };
    }
    return output;
  }
);
