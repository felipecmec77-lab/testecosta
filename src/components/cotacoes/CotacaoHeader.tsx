import { FileText } from 'lucide-react';

interface CotacaoHeaderProps {
  onHeaderClick?: () => void;
}

const CotacaoHeader = ({ onHeaderClick }: CotacaoHeaderProps) => {
  return (
    <button 
      onClick={onHeaderClick}
      className="w-full text-center p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
        <FileText className="w-8 h-8" />
        COTAÇÕES
      </h1>
      <p className="text-white/80 text-sm mt-1">COMERCIAL COSTA</p>
    </button>
  );
};

export default CotacaoHeader;
