import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  userInitials: string;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

export function AvatarUpload({ currentAvatarUrl, userInitials, onUpload, uploading }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setShowPreview(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleConfirmUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      setShowPreview(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex items-center gap-6">
        <div
          className={cn(
            "relative group cursor-pointer",
            isDragging && "ring-2 ring-primary ring-offset-2 rounded-full"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar className="h-24 w-24">
            <AvatarImage src={currentAvatarUrl || ""} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload className="h-4 w-4 mr-2" />
            Escolher Foto
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            JPG, PNG ou GIF. Máx 2MB.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste e solte ou clique para selecionar
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview do Avatar</DialogTitle>
            <DialogDescription>
              Confirme se a imagem está boa antes de salvar
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={previewUrl || ""} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
