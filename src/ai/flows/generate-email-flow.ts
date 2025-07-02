
'use server';
/**
 * @fileOverview An AI flow for generating email marketing campaigns.
 *
 * - generateEmailCampaign - A function that handles the email campaign generation process.
 * - GenerateEmailCampaignInput - The input type for the generateEmailCampaign function.
 * - GenerateEmailCampaignOutput - The return type for the generateEmailCampaign function.
 */

import {ai} from '../genkit';
import {z} from 'zod';
import { getProductsByIds } from '@/services/inventory-service';
import type { Inventory } from '@/lib/types';


const GenerateEmailCampaignInputSchema = z.object({
  topic: z.string().describe('The main topic or message for the email campaign.'),
  productIds: z.array(z.string()).optional().describe('A list of product IDs to feature in the email.'),
});
export type GenerateEmailCampaignInput = z.infer<typeof GenerateEmailCampaignInputSchema>;

const GenerateEmailCampaignOutputSchema = z.object({
  subject: z.string().describe('The generated subject line for the email.'),
  bodyHtml: z.string().describe('The generated body of the email, formatted as a professional, responsive HTML document. Use inline CSS for styling to ensure compatibility across email clients.'),
});
export type GenerateEmailCampaignOutput = z.infer<typeof GenerateEmailCampaignOutputSchema>;

export async function generateEmailCampaign(input: GenerateEmailCampaignInput): Promise<GenerateEmailCampaignOutput> {
  return emailCampaignFlow(input);
}

const EmailPromptInputSchema = z.object({
    topic: z.string(),
    products: z.array(z.object({
        name: z.string(),
        price: z.number(),
    })).optional(),
});


const prompt = ai.definePrompt({
  name: 'emailCampaignPrompt',
  input: {schema: EmailPromptInputSchema},
  output: {schema: GenerateEmailCampaignOutputSchema},
  prompt: `You are an expert email marketer. Your task is to generate a compelling subject line and a full HTML body for an email campaign based on the provided topic.

The tone should be engaging, persuasive, and professional.

The output for the body MUST be a complete, responsive HTML document. Use a single-column layout, inline CSS for styling, and web-safe fonts. Make it visually appealing with a clear call-to-action button. Do not include any placeholder images.

Topic: {{{topic}}}

{{#if products}}
Please prominently feature the following products in the email. Include their names and prices, and weave them into the campaign naturally.
{{#each products}}
- Product Name: {{this.name}}
- Price: {{this.price}}
{{/each}}
{{/if}}
`,
});

const emailCampaignFlow = ai.defineFlow(
  {
    name: 'emailCampaignFlow',
    inputSchema: GenerateEmailCampaignInputSchema,
    outputSchema: GenerateEmailCampaignOutputSchema,
  },
  async (input) => {
    let products: Inventory[] | undefined = undefined;
    if (input.productIds && input.productIds.length > 0) {
      products = await getProductsByIds(input.productIds);
    }

    const promptInput = {
        topic: input.topic,
        products: products ? products.map(p => ({ name: p.name, price: p.price })) : undefined,
    };

    const {output} = await prompt(promptInput);
    if (!output) {
        throw new Error("The AI failed to generate an email campaign.");
    }
    return output;
  }
);
