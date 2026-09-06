"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface CustomFieldDef {
  id: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  options: string[];
  required: boolean;
}

interface CustomFieldInputProps {
  field: CustomFieldDef;
  value: string;
  onChange: (value: string) => void;
}

export function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>

      {field.type === "TEXT" && <Input value={value} onChange={(e) => onChange(e.target.value)} />}

      {field.type === "TEXTAREA" && (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      )}

      {field.type === "NUMBER" && (
        <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === "DATE" && (
        <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === "BOOLEAN" && (
        <div className="flex items-center gap-2 pt-1">
          <Switch checked={value === "true"} onCheckedChange={(v) => onChange(v ? "true" : "false")} />
          <span className="text-sm text-muted-foreground">{value === "true" ? "Sim" : "Não"}</span>
        </div>
      )}

      {field.type === "SELECT" && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
