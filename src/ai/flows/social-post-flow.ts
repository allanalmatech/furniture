'use server';
/**
 * @fileOverview An AI flow for generating social media posts.
 *
 * - generateSocialPost - A function that handles the social post generation process.
 * - GenerateSocialPostInput - The input type for the generateSocialPost function.
 * - GenerateSocialPostOutput - The return type for the generateSocialPost function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const GenerateSocialPostInputSchema = z.object({
  topic: z.string().describe('The main topic or message for the social media post.'),
  platform: z.enum(['Twitter', 'Facebook', 'LinkedIn']).describe('The social media platform for which the post is being generated.'),
});
export type GenerateSocialPostInput = z.infer<typeof GenerateSocialPostInputSchema>;

const GenerateSocialPostOutputSchema = z.object({
  post: z.string().describe('The generated social media post content.'),
});
export type GenerateSocialPostOutput = z.infer<typeof GenerateSocialPostOutputSchema>;

export async function generateSocialPost(input: GenerateSocialPostInput): Promise<GenerateSocialPostOutput> {
  return socialPostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'socialPostPrompt',
  input: {schema: GenerateSocialPostInputSchema},
  output: {schema: GenerateSocialPostOutputSchema},
  prompt: `You are a social media marketing expert. Your task is to generate a compelling social media post based on the provided topic and target platform.

Platform: {{{platform}}}
Topic: {{{topic}}}

Consider the tone, style, and character limits appropriate for the specified platform. For Twitter, include relevant hashtags. For LinkedIn, use a professional tone. For Facebook, be engaging and conversational.
`,
});

const socialPostFlow = ai.defineFlow(
  {
    name: 'socialPostFlow',
    inputSchema: GenerateSocialPostInputSchema,
    outputSchema: GenerateSocialPostOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        return { post: "Error: The AI failed to generate a social media post. Please try again." };
    }
    return output;
  }
);
