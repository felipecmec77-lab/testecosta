import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserPhotoUploadProps {
  userId: string;
  currentPhotoUrl: string | null;
  userName: string;
  onPhotoUpdated: () => void;
}

const UserPhotoUpload = ({ userId, currentPhotoUrl, userName, onPhotoUpdated }: UserPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(fileName, selectedFile, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-photos')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast.success('Foto atualizada com sucesso!');
      onPhotoUpdated();
      setShowDialog(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ foto_url: null })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Foto removida com sucesso!');
      onPhotoUpdated();
      setShowDialog(false);
    } catch (error: any) {
      toast.error('Erro ao remover foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        className="h-8 w-8"
        title="Alterar foto"
      >
        <Camera className="w-4 h-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Foto de {userName}
            </DialogTitle>
            <DialogDescription>
              {selectedFile ? 'Confirme o upload da nova foto' : 'Gerencie a foto do usuário'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {/* Preview */}
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted">
              {(previewUrl || currentPhotoUrl) ? (
                <img
                  src={previewUrl || currentPhotoUrl || ''}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="text-4xl font-bold text-primary">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {!selectedFile && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {currentPhotoUrl ? 'Trocar foto' : 'Enviar foto'}
                </Button>
                {currentPhotoUrl && (
                  <Button
                    variant="destructive"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {selectedFile && (
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Confirmar
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserPhotoUpload;
