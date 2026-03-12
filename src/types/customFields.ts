export type CustomFieldType = "text" | "number" | "select" | "date" | "boolean";

export interface CustomFieldDefinition {
  id: string;
  company_id: string;
  field_name: string;
  field_type: CustomFieldType;
  options: string[] | null;
  position: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  deal_id: string;
  field_definition_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldWithValue extends CustomFieldDefinition {
  fieldValue: string | null;
  valueId: string | null;
}
