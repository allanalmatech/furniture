
'use server';
/**
 * @fileOverview An AI flow for generating website landing page content.
 *
 * - generateWebsiteContent - A function that handles the website content generation.
 * - GenerateWebsiteContentInput - The input type for the generateWebsiteContent function.
 * - GenerateWebsiteContentOutput - The return type for the generateWebsiteContent function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const GenerateWebsiteContentInputSchema = z.object({
  topic: z.string().describe('A description of the business or website topic.'),
});
export type GenerateWebsiteContentInput = z.infer<typeof GenerateWebsiteContentInputSchema>;

const GenerateWebsiteContentOutputSchema = z.object({
  headline: z.string().describe('A catchy, engaging headline for the landing page.'),
  subheadline: z.string().describe('A supportive subheadline that adds more detail.'),
  bodyText: z.string().describe('A paragraph of compelling body text for the landing page (about 50-70 words).'),
  heroImagePrompt: z.string().describe('A short, descriptive prompt for an AI image generator to create a hero image related to the topic. E.g., "A modern coffee shop with customers enjoying their drinks", "A software developer at a clean desk writing code".'),
  features: z.array(z.object({
    icon: z.enum(['CheckCircle', 'Zap', 'Shield', 'Rocket', 'Target', 'Award']).describe('The name of a relevant Lucide icon for this feature. Choose one from the provided list.'),
    title: z.string().describe('A short, catchy title for the feature.'),
    description: z.string().describe('A brief description of the feature (about 15-20 words).')
  })).length(3).describe('An array of exactly three key features.'),
  cta: z.object({
      headline: z.string().describe("A short, compelling call-to-action headline for the bottom of the page."),
      buttonText: z.string().describe("The text for the final call-to-action button, e.g., 'Get Started Today'.")
  }).describe("A call to action section for the bottom of the page.")
});
export type GenerateWebsiteContentOutput = z.infer<typeof GenerateWebsiteContentOutputSchema>;

export async function generateWebsiteContent(input: GenerateWebsiteContentInput): Promise<GenerateWebsiteContentOutput> {
  return generateWebsiteContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWebsiteContentPrompt',
  input: {schema: GenerateWebsiteContentInputSchema},
  output: {schema: GenerateWebsiteContentOutputSchema},
  prompt: `You are an expert marketing copywriter. Your task is to generate compelling content for a website landing page based on the provided topic.

The tone should be professional, clear, and persuasive.

Generate the following components:
1.  **Headline**: A short, powerful headline.
2.  **Subheadline**: A brief sentence that expands on the headline.
3.  **Body Text**: A descriptive paragraph of about 50-70 words.
4.  **Hero Image Prompt**: A short, descriptive prompt (5-10 words) for an AI image generator to create a suitable hero image for this topic.
5.  **Features**: Generate exactly three key features. For each feature, provide a title, a short description, and a relevant icon name from this list: CheckCircle, Zap, Shield, Rocket, Target, Award.
6.  **Call to Action**: A short, compelling headline and button text to encourage users to sign up or get started.

Topic: {{{topic}}}
`,
});

const generateWebsiteContentFlow = ai.defineFlow(
  {
    name: 'generateWebsiteContentFlow',
    inputSchema: GenerateWebsiteContentInputSchema,
    outputSchema: GenerateWebsiteContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to generate website content.");
    }
    return output;
  }
);
