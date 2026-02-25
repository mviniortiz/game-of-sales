import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface WhatsappConfigModalProps {
    open: boolean;
    onClose: () => void;
}

type ConnectionState = "idle" | "generating" | "qrcode" | "connected" | "error";

export const WhatsappConfigModal = ({ open, onClose }: WhatsappConfigModalProps) => {
    const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
    const [qrCodeData, setQrCodeData] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState("");

    const generateQRCode = async () => {
        setConnectionState("generating");
        setErrorMessage("");

        try {
            // Aqui teremos a chamada real para a Evolution API.
            // Por enquanto, vamos simular que estamos gerando um QR Code.

            setTimeout(() => {
                // Simulando sucesso na geração do QR
                setQrCodeData("simulated-qr-code-data-for-whatsapp-connection-string-" + Math.random());
                setConnectionState("qrcode");

                // Simular que o usuário leu o QR Code depois de 10s
                setTimeout(() => {
                    setConnectionState("connected");
                }, 8000);
            }, 2000);

            /*
            // Chamada futura baseada na Evolution API
            const response = await fetch("SUA_EVOLUTION_API_URL/instance/create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": "SUA_GLOBAL_API_KEY"
              },
              body: JSON.stringify({
                instanceName: "game-of-sales-vendedor",
                token: "qualquer-token",
                qrcode: true
              })
            });
            const data = await response.json();
            setQrCodeData(data.qrcode.base64); // Supondo que retorne base64 aqui
            setConnectionState("qrcode");
            */
        } catch (error: any) {
            console.error(error);
            setErrorMessage(error.message || "Erro ao gerar QR Code");
            setConnectionState("error");
        }
    };

    useEffect(() => {
        if (open && connectionState === "idle") {
            generateQRCode();
        }
    }, [open, connectionState]);

    const handleClose = () => {
        setConnectionState("idle");
        setQrCodeData("");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#121214] border-white/[0.05] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <WhatsAppIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        Conectar WhatsApp
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 mt-2">
                        Escaneie o QR Code com seu WhatsApp para conectar sua conta ao Game of Sales.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-4 flex flex-col items-center justify-center min-h-[300px]">
                    {connectionState === "generating" && (
                        <div className="flex flex-col items-center gap-4 text-emerald-500">
                            <Loader2 className="w-12 h-12 animate-spin opacity-80" />
                            <p className="text-sm text-slate-300 font-medium animate-pulse">
                                Gerando QR Code seguro...
                            </p>
                        </div>
                    )}

                    {connectionState === "qrcode" && qrCodeData && (
                        <div className="flex flex-col items-center gap-6 w-full animate-in fade-in zoom-in duration-300">
                            <div className="p-4 bg-white rounded-2xl shadow-xl ring-4 ring-white/10">
                                <QRCodeSVG
                                    value={qrCodeData}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 w-full text-center">
                                <p className="text-sm text-emerald-400 font-medium flex-1">
                                    Aguardando leitura do QR Code...
                                </p>
                                <p className="text-xs text-emerald-400/70 mt-1">
                                    Abra o WhatsApp no seu celular {"->"} Dispositivos Conectados {"->"} Conectar um aparelho
                                </p>
                            </div>
                        </div>
                    )}

                    {connectionState === "connected" && (
                        <div className="flex flex-col items-center gap-4 text-emerald-400 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/20">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white">WhatsApp Conectado!</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Suas mensagens agora podem ser enviadas direto do CRM.
                                </p>
                            </div>
                        </div>
                    )}

                    {connectionState === "error" && (
                        <div className="flex flex-col items-center gap-3 text-red-500 text-center">
                            <AlertCircle className="w-12 h-12" />
                            <p className="text-sm">{errorMessage}</p>
                            <Button
                                variant="outline"
                                onClick={generateQRCode}
                                className="mt-2 bg-transparent border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"
                            >
                                Tentar Novamente
                            </Button>
                        </div>
                    )}
                </div>

                {connectionState === "connected" && (
                    <div className="px-6 py-4 bg-black/20 border-t border-white/[0.05] flex justify-end">
                        <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                            Concluir
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
