import { useState, useRef, useEffect } from "react";

const HOST_ORGANISMS = [
  { group: "Mammalian", items: ["CHO cells", "HEK293", "Vero cells", "NS0", "BHK-21", "Jurkat"] },
  { group: "Bacterial", items: ["E. coli K12", "E. coli BL21", "B. subtilis", "C. glutamicum", "P. putida"] },
  { group: "Yeast / Fungal", items: ["S. cerevisiae", "K. phaffii (P. pastoris)", "S. pombe", "A. niger"] },
  { group: "Insect", items: ["Sf9 / Sf21", "High Five (BTI-TN-5B1-4)", "D. melanogaster"] },
  { group: "Plant", items: ["N. benthamiana", "A. thaliana", "Tobacco BY-2", "Z. mays"] },
  { group: "Aquatic / Other", items: ["Zebrafish", "C. elegans", "Synechocystis sp.", "T. thermophilus"] },
];

interface HostOrganismInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function HostOrganismInput({ value, onChange }: HostOrganismInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = HOST_ORGANISMS.map(g => ({
    group: g.group,
    items: g.items.filter(item => item.toLowerCase().includes(search.toLowerCase())),
  })).filter(g => g.items.length > 0);

  function handleSelect(item: string) {
    onChange(item);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between gap-2 focus-within:ring-1 focus-within:ring-primary"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organisms..."
            className="bg-transparent text-foreground outline-none flex-1 text-sm placeholder:text-muted-foreground"
            onKeyDown={e => {
              if (e.key === "Escape") {
                setOpen(false);
                setSearch("");
              }
              if (e.key === "Enter" && filtered.length > 0) {
                handleSelect(filtered[0].items[0]);
              }
            }}
          />
        ) : (
          <span className="text-foreground truncate">{value}</span>
        )}
        <svg className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-muted-foreground text-xs">No organisms found</p>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="mt-2 text-primary text-xs hover:underline"
                >
                  Use &quot;{search}&quot; as custom organism
                </button>
              )}
            </div>
          ) : (
            <>
              {filtered.map(g => (
                <div key={g.group}>
                  <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold sticky top-0 bg-background">
                    {g.group}
                  </div>
                  {g.items.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors ${
                        item === value ? "text-primary font-medium" : "text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ))}
              <div className="border-t border-border px-3 py-2">
                <div className="px-0 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Custom</div>
                <p className="text-muted-foreground text-xs">Type in the search box to add a custom organism</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
