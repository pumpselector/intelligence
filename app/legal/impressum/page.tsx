import LegalArticle from "@/components/LegalArticle";

export const metadata = {
  title: "Legal Notice / Impressum — PumpRadar24",
};

export default function ImpressumPage() {
  return (
    <LegalArticle>
      <h1>Legal Notice / Impressum</h1>

      <p>
        XLT Limited
        <br />
        No. 5, 17/F, Strand 50, 50 Bonham Strand, Sheung Wan, Hong Kong
        <br />
        Business Registration Number: 77741877
        <br />
        Contact: <a href="mailto:dealers@pumpradar24.com">dealers@pumpradar24.com</a>
      </p>

      <p>
        XLT Limited operates PumpRadar24 (pumpradar24.com), a subscription-based platform providing
        pump industry market intelligence.
      </p>

      <p>Responsible for content: XLT Limited, at the address above.</p>
    </LegalArticle>
  );
}
