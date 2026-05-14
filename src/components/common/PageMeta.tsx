import { HelmetProvider, Helmet } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";

interface PageMetaProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
}

const PageMeta = ({
  title,
  description,
  canonical,
  noindex = false,
}: PageMetaProps) => (
  <Helmet>
    <title>{`${title} | ProofDesk AI`}</title>
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex, nofollow" />}
    {canonical && <link rel="canonical" href={canonical} />}

    {/* Open Graph */}
    <meta property="og:title" content={`${title} | ProofDesk AI`} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="ProofDesk AI" />

    {/* Twitter */}
    <meta name="twitter:title" content={`${title} | ProofDesk AI`} />
    <meta name="twitter:description" content={description} />
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>
    <TooltipProvider>
      {children}
    </TooltipProvider>
  </HelmetProvider>
);

export default PageMeta;
