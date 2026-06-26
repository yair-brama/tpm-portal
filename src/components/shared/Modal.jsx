import Icon from '../layout/Icon';

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-[#1a1a1a]/75 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#fdfcfb] border border-[#1a1a1a] max-w-md w-full animate-fade-in">
        <div className="p-5 border-b border-[#1a1a1a]/20 flex justify-between items-center bg-[#f5f1eb]">
          <h3 className="font-bold font-headline text-sm uppercase tracking-wider">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 hover:bg-stone-200 flex items-center justify-center text-stone-500"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
