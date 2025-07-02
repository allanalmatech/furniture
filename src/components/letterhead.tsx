
import Image from 'next/image';

type LetterheadProps = {
  companyName: string;
  logoUrl: string;
};

export function Letterhead({ companyName, logoUrl }: LetterheadProps) {
  return (
    <div className="mb-8 p-6 bg-card border rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Image src={logoUrl} alt={`${companyName} Logo`} width={50} height={50} className="rounded-md" data-ai-hint="company logo"/>
        <div>
          <h2 className="text-2xl font-bold text-primary">{companyName}</h2>
          <p className="text-sm text-muted-foreground">123 Furniture Ave, Mukono, Uganda</p>
        </div>
      </div>
      <div className="text-right text-sm text-muted-foreground">
        <p>sales@footsteps.co</p>
        <p>(123) 456-7890</p>
        <p>www.footsteps.co</p>
      </div>
    </div>
  );
}
