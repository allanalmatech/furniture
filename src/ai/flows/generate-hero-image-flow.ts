'use server';
/**
 * @fileOverview An AI flow for generating website hero images.
 *
 * - generateHeroImage - A function that handles hero image generation.
 * - GenerateHeroImageInput - The input type for the generateHeroImage function.
 * - GenerateHeroImageOutput - The return type for the generateHeroImage function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const GenerateHeroImageInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the desired hero image. Should be descriptive, e.g., "a software developer at a clean desk writing code".'),
});
export type GenerateHeroImageInput = z.infer<typeof GenerateHeroImageInputSchema>;

const GenerateHeroImageOutputSchema = z.object({
  imageUrl: z.string().describe("The generated image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateHeroImageOutput = z.infer<typeof GenerateHeroImageOutputSchema>;

export async function generateHeroImage(input: GenerateHeroImageInput): Promise<GenerateHeroImageOutput> {
  return generateHeroImageFlow(input);
}

const generateHeroImageFlow = ai.defineFlow(
  {
    name: 'generateHeroImageFlow',
    inputSchema: GenerateHeroImageInputSchema,
    outputSchema: GenerateHeroImageOutputSchema,
  },
  async ({ prompt }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `A vibrant, high-quality, professional marketing hero image for a website. The image should represent: ${prompt}. Cinematic, photorealistic style, 16:9 aspect ratio.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error("The AI failed to generate an image.");
    }

    return { imageUrl: media.url };
  }
);
