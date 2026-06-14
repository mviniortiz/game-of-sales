import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ProposalItem {
    nome: string;
    descricao?: string;
    quantidade: number;
    preco_unitario: number;
    desconto_percentual: number;
}

export type ProposalSectionKey = "capa" | "intro" | "itens" | "condicoes" | "sobre" | "assinatura";
export interface ProposalSection { key: ProposalSectionKey; enabled: boolean }

export const DEFAULT_SECTIONS: ProposalSection[] = [
    { key: "capa", enabled: true },
    { key: "intro", enabled: true },
    { key: "itens", enabled: true },
    { key: "condicoes", enabled: true },
    { key: "sobre", enabled: true },
    { key: "assinatura", enabled: true },
];

export const SECTION_LABELS: Record<ProposalSectionKey, string> = {
    capa: "Capa (logo + título)",
    intro: "Apresentação",
    itens: "Tabela de itens",
    condicoes: "Condições comerciais",
    sobre: "Sobre a empresa",
    assinatura: "Assinatura",
};

export interface ProposalData {
    companyName?: string;
    logoUrl?: string | null;
    brandColor?: string | null;
    dealTitle: string;
    proposalNumber?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    items: ProposalItem[];
    discountPercent?: number;
    conditions?: string;
    validityDays?: number;
    intro?: string;
    about?: string;
    sections?: ProposalSection[];
}

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export function computeProposalTotal(items: ProposalItem[], discountPercent = 0): number {
    const subtotal = items.reduce(
        (acc, it) => acc + (it.quantidade || 0) * (it.preco_unitario || 0) * (1 - (it.desconto_percentual || 0) / 100),
        0,
    );
    return subtotal * (1 - (discountPercent || 0) / 100);
}

function hexToRgb(hex?: string | null): [number, number, number] {
    const fallback: [number, number, number] = [21, 86, 192];
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadImage(url?: string | null): Promise<HTMLImageElement | null> {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

export const generateProposalPDF = async (data: ProposalData): Promise<string> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    const brand = hexToRgb(data.brandColor);
    const textColor: [number, number, number] = [30, 41, 59];
    const mutedColor: [number, number, number] = [100, 116, 139];
    const company = data.companyName || "Sua Empresa";
    const logo = await loadImage(data.logoUrl);

    const sections = (data.sections && data.sections.length ? data.sections : DEFAULT_SECTIONS).filter((s) => s.enabled);
    let yPos = 0;

    const ensureSpace = (needed: number) => {
        if (yPos > pageHeight - needed - 25) {
            doc.addPage();
            yPos = 28;
        }
    };

    const sectionTitle = (label: string) => {
        ensureSpace(24);
        doc.setTextColor(...mutedColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(label.toUpperCase(), margin, yPos);
        yPos += 9;
    };

    const paragraph = (txt: string) => {
        doc.setTextColor(...textColor);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(txt, pageWidth - margin * 2);
        lines.forEach((ln: string) => {
            ensureSpace(8);
            doc.text(ln, margin, yPos);
            yPos += 6;
        });
    };

    // ── CAPA ───────────────────────────────────────────────────────────────────
    const renderCapa = () => {
        doc.setFillColor(...brand);
        doc.rect(0, 0, pageWidth, 50, "F");

        // Logo (altura fixa) ou nome da empresa
        if (logo && logo.naturalWidth > 0) {
            const h = 16;
            const w = Math.min(48, (logo.naturalWidth / logo.naturalHeight) * h);
            try { doc.addImage(logo, "PNG", margin, 13, w, h); } catch { /* tainted: ignora */ }
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(company, margin, 40);
        } else {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.text(company.toUpperCase(), margin, 24);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("PROPOSTA COMERCIAL", pageWidth - margin, 24, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const proposalDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        const proposalNumber = data.proposalNumber || `#${Date.now().toString().slice(-6)}`;
        doc.text(`${proposalNumber} • ${proposalDate}`, pageWidth - margin, 34, { align: "right" });

        yPos = 64;

        // Bloco cliente
        doc.setTextColor(...mutedColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("CLIENTE", margin, yPos);
        yPos += 8;
        doc.setTextColor(...textColor);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(data.customerName || "Cliente", margin, yPos);
        yPos += 6;
        const contactInfo = [data.customerEmail, data.customerPhone].filter(Boolean).join("  •  ");
        if (contactInfo) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...mutedColor);
            doc.text(contactInfo, margin, yPos);
            yPos += 6;
        }
        yPos += 4;
        doc.setTextColor(...textColor);
        doc.setFontSize(11);
        doc.text(`Assunto: ${data.dealTitle}`, margin, yPos);
        yPos += 14;
    };

    const renderIntro = () => {
        if (!data.intro?.trim()) return;
        sectionTitle("Apresentação");
        paragraph(data.intro.trim());
        yPos += 8;
    };

    const renderItens = () => {
        if (yPos === 0) yPos = 28; // caso a capa esteja desligada
        const tableData = data.items.map((it) => {
            const subtotal = it.quantidade * it.preco_unitario * (1 - (it.desconto_percentual || 0) / 100);
            return [
                it.descricao ? `${it.nome}\n${it.descricao}` : it.nome,
                String(it.quantidade),
                formatCurrency(it.preco_unitario),
                it.desconto_percentual > 0 ? `${it.desconto_percentual}%` : "-",
                formatCurrency(subtotal),
            ];
        });
        const subtotalGeral = data.items.reduce(
            (acc, it) => acc + it.quantidade * it.preco_unitario * (1 - (it.desconto_percentual || 0) / 100), 0,
        );
        const discountPercent = data.discountPercent || 0;
        const total = subtotalGeral * (1 - discountPercent / 100);
        const footRows: string[][] = [];
        if (discountPercent > 0) {
            footRows.push(["", "", "", "Subtotal", formatCurrency(subtotalGeral)]);
            footRows.push(["", "", "", `Desconto ${discountPercent}%`, `- ${formatCurrency(subtotalGeral - total)}`]);
        }
        footRows.push(["", "", "", "TOTAL", formatCurrency(total)]);

        autoTable(doc, {
            startY: yPos,
            head: [["Item", "Qtd", "Preço Unit.", "Desc.", "Subtotal"]],
            body: tableData,
            foot: footRows,
            theme: "plain",
            headStyles: { fillColor: [241, 245, 249], textColor, fontStyle: "bold", fontSize: 9, cellPadding: 6 },
            bodyStyles: { textColor, fontSize: 10, cellPadding: 5 },
            footStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10.5, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: "auto" }, 1: { halign: "center", cellWidth: 18 },
                2: { halign: "right", cellWidth: 30 }, 3: { halign: "center", cellWidth: 18 }, 4: { halign: "right", cellWidth: 34 },
            },
            margin: { left: margin, right: margin },
            didDrawPage: () => drawFooter(doc, pageWidth, margin, company),
        });
        yPos = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPos + 50;
        yPos += 16;
    };

    const renderCondicoes = () => {
        sectionTitle("Condições comerciais");
        doc.setTextColor(...textColor);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const validityDays = data.validityDays || 30;
        const customLines = (data.conditions || "").split("\n").map((l) => l.trim()).filter(Boolean);
        const lines = customLines.length
            ? customLines.map((l) => (l.startsWith("•") ? l : `• ${l}`))
            : [`• Proposta válida por ${validityDays} dias a partir desta data`, "• Pagamento conforme negociação", "• Preços em Reais (BRL)"];
        lines.forEach((line) => {
            const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
            ensureSpace(8 * wrapped.length);
            doc.text(wrapped, margin, yPos);
            yPos += 6 * wrapped.length;
        });
        yPos += 8;
    };

    const renderSobre = () => {
        if (!data.about?.trim()) return;
        sectionTitle(`Sobre ${company}`);
        paragraph(data.about.trim());
        yPos += 8;
    };

    const renderAssinatura = () => {
        ensureSpace(40);
        yPos += 10;
        const colW = (pageWidth - margin * 2 - 16) / 2;
        doc.setDrawColor(...mutedColor);
        doc.line(margin, yPos, margin + colW, yPos);
        doc.line(margin + colW + 16, yPos, pageWidth - margin, yPos);
        yPos += 5;
        doc.setTextColor(...mutedColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(data.customerName || "Cliente", margin, yPos);
        doc.text(company, margin + colW + 16, yPos);
    };

    const renderers: Record<ProposalSectionKey, () => void> = {
        capa: renderCapa, intro: renderIntro, itens: renderItens,
        condicoes: renderCondicoes, sobre: renderSobre, assinatura: renderAssinatura,
    };

    if (yPos === 0 && !sections.some((s) => s.key === "capa")) yPos = 28;
    sections.forEach((s) => renderers[s.key]?.());

    drawFooter(doc, pageWidth, margin, company);

    const safeName = (data.customerName || "cliente").replace(/\s+/g, "_").toLowerCase();
    const fileName = `proposta_${safeName}_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
    return fileName;
};

const drawFooter = (doc: jsPDF, pageWidth: number, margin: number, company: string) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${company} • Proposta gerada pelo Vyzon`, pageWidth / 2, pageHeight - 15, { align: "center" });
};

// ── Botão legado (gera a partir dos produtos do deal) — mantido p/ compat ──────
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProposalPDFButtonProps {
    deal: { id: string; title: string; customer_name: string; customer_email?: string; customer_phone?: string };
    products: Array<{ produto?: { nome: string; descricao?: string }; quantidade: number; preco_unitario: number; desconto_percentual: number }>;
    companyName?: string;
    logoUrl?: string | null;
    brandColor?: string | null;
    disabled?: boolean;
}

export const ProposalPDFButton = ({ deal, products, companyName, logoUrl, brandColor, disabled }: ProposalPDFButtonProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const handleGenerate = async () => {
        if (products.length === 0) { toast.error("Adicione pelo menos um produto para gerar a proposta"); return; }
        setIsGenerating(true);
        try {
            const items: ProposalItem[] = products.map((p) => ({
                nome: p.produto?.nome || "Produto", descricao: p.produto?.descricao,
                quantidade: p.quantidade, preco_unitario: p.preco_unitario, desconto_percentual: p.desconto_percentual,
            }));
            const fileName = await generateProposalPDF({
                companyName, logoUrl, brandColor, dealTitle: deal.title,
                customerName: deal.customer_name, customerEmail: deal.customer_email, customerPhone: deal.customer_phone, items,
            });
            toast.success(`Proposta gerada: ${fileName}`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Erro ao gerar proposta PDF");
        } finally { setIsGenerating(false); }
    };
    return (
        <Button onClick={handleGenerate} disabled={disabled || isGenerating || products.length === 0} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Gerar Proposta PDF
        </Button>
    );
};
