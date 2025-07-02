
'use server';
/**
 * @fileOverview An AI flow for extracting structured data from product labels.
 *
 * - extractProductData - A function that handles the product data extraction process.
 * - ExtractProductInput - The input type for the extractProductData function.
 * - ExtractProductOutput - The return type for the extractProductData function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const ExtractProductInputSchema = z.object({
  productImageUri: z
    .string()
    .describe(
      "An image of a product label or barcode, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractProductInput = z.infer<typeof ExtractProductInputSchema>;

const ExtractProductOutputSchema = z.object({
  name: z.string().describe('The name of the product.'),
  sku: z.string().describe('The Stock Keeping Unit (SKU) or barcode number of the product.'),
  category: z.string().describe('A suggested category for the product (e.g., Widgets, Gadgets, Accessories).'),
});
export type ExtractProductOutput = z.infer<typeof ExtractProductOutputSchema>;

export async function extractProductData(input: ExtractProductInput): Promise<ExtractProductOutput> {
  return extractProductDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractProductPrompt',
  input: {schema: ExtractProductInputSchema},
  output: {schema: ExtractProductOutputSchema},
  prompt: `You are an expert inventory management assistant. Your task is to extract key information from an image of a product label or package.

Analyze the image provided and pull out the following details:
1.  **Name**: The full name of the product.
2.  **SKU**: The SKU or barcode number. If a barcode is visible, extract the number associated with it.
3.  **Category**: A simple, one or two-word category for this type of product.

Here is the product image:
{{media url=productImageUri}}`,
});

const extractProductDataFlow = ai.defineFlow(
  {
    name: 'extractProductDataFlow',
    inputSchema: ExtractProductInputSchema,
    outputSchema: ExtractProductOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to extract data from the product image.");
    }
    return output;
  }
);
