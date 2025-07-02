'use server';
/**
 * @fileOverview An AI flow for extracting structured data from invoice images.
 *
 * - extractInvoiceData - A function that handles the invoice data extraction process.
 * - ExtractInvoiceInput - The input type for the extractInvoiceData function.
 * - ExtractInvoiceOutput - The return type for the extractInvoiceData function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const ExtractInvoiceInputSchema = z.object({
  invoiceImageUri: z
    .string()
    .describe(
      "An image of an invoice or receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceInput = z.infer<typeof ExtractInvoiceInputSchema>;

const ExtractInvoiceOutputSchema = z.object({
  date: z.string().describe('The date of the invoice in YYYY-MM-DD format.'),
  category: z.string().describe('A suggested category for the expense from the following options: Software, Marketing, Office Supplies, Travel, Food, Utilities, Other.'),
  description: z.string().describe('A brief description of the expense, usually the vendor or merchant name.'),
  amount: z.number().describe('The final total amount of the invoice as a number.'),
});
export type ExtractInvoiceOutput = z.infer<typeof ExtractInvoiceOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceInput): Promise<ExtractInvoiceOutput> {
  return extractInvoiceDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractInvoicePrompt',
  input: {schema: ExtractInvoiceInputSchema},
  output: {schema: ExtractInvoiceOutputSchema},
  prompt: `You are an expert accounting assistant. Your task is to extract key information from an invoice or receipt image.

Analyze the image provided and pull out the following details:
1.  **Date**: The date the transaction occurred. Format it as YYYY-MM-DD. If no year is present, assume the current year.
2.  **Category**: Classify the expense into one of these categories: Software, Marketing, Office Supplies, Travel, Food, Utilities, Other.
3.  **Description**: Provide a short description, typically the name of the vendor or merchant.
4.  **Amount**: Extract the final total amount of the invoice. It should be a number, not a string.

Here is the invoice image:
{{media url=invoiceImageUri}}`,
});

const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceInputSchema,
    outputSchema: ExtractInvoiceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to extract data from the invoice.");
    }
    return output;
  }
);
