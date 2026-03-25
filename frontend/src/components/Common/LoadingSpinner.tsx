export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}
