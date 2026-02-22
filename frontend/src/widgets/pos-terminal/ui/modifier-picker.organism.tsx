type ModifierPickerProps = {
  onClose: () => void;
};

export default function ModifierPicker({ onClose }: ModifierPickerProps) {
  return (
    <div className="glass mt-6 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Modifier Picker</h2>
        <button type="button" className="text-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Placeholder modal.</p>
    </div>
  );
}
