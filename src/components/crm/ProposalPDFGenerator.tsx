import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProposalProduct {
    nome: string;
    descricao?: string;
    quantidade: number;
    preco_unitario: number;
    desconto_percentual: number;
}

interface ProposalData {
    // Deal info
    dealTitle: string;
    dealNumber?: string;

    // Customer info
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;

    // Products
    products: ProposalProduct[];

    // Optional company info (can be customized later)
    companyName?: string;

    // Validity
    validityDays?: number;
}

export const generateProposalPDF = (data: ProposalData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Colors
    const primaryColor: [number, number, number] = [79, 70, 229]; // emerald-600
    const textColor: [number, number, number] = [30, 41, 59]; // slate-800
    const mutedColor: [number, number, number] = [100, 116, 139]; // slate-500

    // === HEADER ===
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSTA COMERCIAL", margin, 28);

    // Proposal number and date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const proposalDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const proposalNumber = `#${Date.now().toString().slice(-6)}`;
    doc.text(`${proposalNumber} • ${proposalDate}`, pageWidth - margin, 28, { align: "right" });

    yPos = 60;

    // === CUSTOMER INFO ===
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", margin, yPos);

    yPos += 8;
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.customerName, margin, yPos);

    yPos += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);

    const contactInfo = [
        data.customerEmail,
        data.customerPhone
    ].filter(Boolean).join(" • ");

    if (contactInfo) {
        doc.text(contactInfo, margin, yPos);
        yPos += 6;
    }

    // Deal title
    yPos += 4;
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.text(`Proposta: ${data.dealTitle}`, margin, yPos);

    yPos += 15;

    // === PRODUCTS TABLE ===
    const tableData = data.products.map((product) => {
        const subtotal = product.quantidade * product.preco_unitario * (1 - product.desconto_percentual / 100);
        return [
            product.nome,
            product.quantidade.toString(),
            formatCurrency(product.preco_unitario),
            product.desconto_percentual > 0 ? `${product.desconto_percentual}%` : "-",
            formatCurrency(subtotal),
        ];
    });

    // Calculate total
    const total = data.products.reduce((acc, product) => {
        return acc + product.quantidade * product.preco_unitario * (1 - product.desconto_percentual / 100);
    }, 0);

    autoTable(doc, {
        startY: yPos,
        head: [["Produto/Serviço", "Qtd", "Preço Unit.", "Desc.", "Subtotal"]],
        body: tableData,
        foot: [["", "", "", "TOTAL", formatCurrency(total)]],
        theme: "plain",
        headStyles: {
            fillColor: [241, 245, 249], // slate-100
            textColor: textColor,
            fontStyle: "bold",
            fontSize: 9,
            cellPadding: 6,
        },
        bodyStyles: {
            textColor: textColor,
            fontSize: 10,
            cellPadding: 5,
        },
        footStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 11,
            cellPadding: 6,
        },
        columnStyles: {
            0: { cellWidth: "auto" },
            1: { halign: "center", cellWidth: 20 },
            2: { halign: "right", cellWidth: 30 },
            3: { halign: "center", cellWidth: 20 },
            4: { halign: "right", cellWidth: 35 },
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
            // Footer on each page
            drawFooter(doc, pageWidth, margin);
        },
    });

    // Get end position after table
    yPos = (doc as any).lastAutoTable?.finalY || yPos + 50;
    yPos += 20;

    // === CONDITIONS ===
    if (yPos > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        yPos = 30;
    }

    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("CONDIÇÕES COMERCIAIS", margin, yPos);

    yPos += 10;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const validityDays = data.validityDays || 30;
    const conditions = [
        `• Proposta válida por ${validityDays} dias a partir desta data`,
        "• Pagamento conforme negociação",
        "• Preços em Reais (BRL)",
    ];

    conditions.forEach((condition) => {
        doc.text(condition, margin, yPos);
        yPos += 6;
    });

    // Draw footer
    drawFooter(doc, pageWidth, margin);

    // === DOWNLOAD ===
    const fileName = `proposta_${data.customerName.replace(/\s+/g, "_").toLowerCase()}_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);

    return fileName;
};

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

const drawFooter = (doc: jsPDF, pageWidth: number, margin: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
        "Proposta gerada automaticamente • Game Sales CRM",
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
    );
};

// React Component to use as a button
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProposalPDFButtonProps {
    deal: {
        id: string;
        title: string;
        customer_name: string;
        customer_email?: string;
        customer_phone?: string;
    };
    products: Array<{
        produto?: {
            nome: string;
            descricao?: string;
        };
        quantidade: number;
        preco_unitario: number;
        desconto_percentual: number;
    }>;
    disabled?: boolean;
}

export const ProposalPDFButton = ({ deal, products, disabled }: ProposalPDFButtonProps) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        if (products.length === 0) {
            toast.error("Adicione pelo menos um produto para gerar a proposta");
            return;
        }

        setIsGenerating(true);

        try {
            const proposalProducts: ProposalProduct[] = products.map((p) => ({
                nome: p.produto?.nome || "Produto",
                descricao: p.produto?.descricao,
                quantidade: p.quantidade,
                preco_unitario: p.preco_unitario,
                desconto_percentual: p.desconto_percentual,
            }));

            const fileName = generateProposalPDF({
                dealTitle: deal.title,
                customerName: deal.customer_name,
                customerEmail: deal.customer_email,
                customerPhone: deal.customer_phone,
                products: proposalProducts,
            });

            toast.success(`Proposta gerada: ${fileName}`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Erro ao gerar proposta PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            onClick={handleGenerate}
            disabled={disabled || isGenerating || products.length === 0}
            className="gap-2 bg-emerald-600 hover:bg-emerald-500"
        >
            {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <FileDown className="h-4 w-4" />
            )}
            Gerar Proposta PDF
        </Button>
    );
};
