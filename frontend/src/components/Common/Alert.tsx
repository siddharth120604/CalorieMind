interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

const styles = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export default function Alert({ type, message, onClose }: AlertProps) {
  return (
    <div className={`border rounded-lg px-4 py-3 mb-4 flex justify-between items-center ${styles[type]}`}>
      <span className="text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-3 hover:opacity-70">
          &times;
        </button>
      )}
    </div>
  );
}
