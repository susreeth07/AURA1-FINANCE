export type FormattingStyle =
  | 'Short'
  | 'Detailed'
  | 'Professional'
  | 'Conversational'
  | 'Bullet'
  | 'Markdown'
  | 'Executive Summary';

export class ResponseFormatter {
  static format(answer: string, style: FormattingStyle): string {
    const trimmed = answer.trim();

    switch (style) {
      case 'Short':
        // Return first two sentences
        const sentences = trimmed.split(/(?<=[.!?])\s+/);
        return sentences.slice(0, 2).join(' ');

      case 'Bullet':
        // Convert comma lists or sentences to bullets
        if (trimmed.includes('*') || trimmed.includes('-')) {
          return trimmed; // Already contains bullets
        }
        return trimmed
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(s => `- ${s}`)
          .join('\n');

      case 'Executive Summary':
        return `### Executive Summary\n\n${trimmed}\n\n*Aura Finance AI System*`;

      case 'Professional':
        return `[FINANCIAL REPORT] ${trimmed}`;

      case 'Conversational':
        return `Hey there! ${trimmed}`;

      case 'Markdown':
      case 'Detailed':
      default:
        return trimmed;
    }
  }
}
