/** Plain labelled text input shared by the store-draft sub-components (details + variants use
 * this same shape for every free-text field). */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:text-inventory-text-subtle"
      />
    </div>
  );
}
