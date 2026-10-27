import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setThemePref, useScheme, useThemePref, type ThemePref } from "@/lib/theme";

export function ThemeToggle() {
  const pref = useThemePref();
  const scheme = useScheme();
  const Icon = pref === "system" ? Monitor : scheme === "dark" ? Moon : Sun;
  const name = pref === "system" ? "System" : pref === "dark" ? "Dark" : "Light";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 hover:bg-surface hover:text-ink"
        aria-label={`Theme: ${name}. Change theme`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={pref} onValueChange={(v) => setThemePref(v as ThemePref)}>
          <DropdownMenuRadioItem value="system"><Monitor className="mr-2 h-4 w-4" aria-hidden />System</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light"><Sun className="mr-2 h-4 w-4" aria-hidden />Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="mr-2 h-4 w-4" aria-hidden />Dark</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
