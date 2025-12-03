import React, { useState, useEffect } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";
import { ArrowRight } from "lucide-react";

interface FieldMappingSectionProps {
  fileAHeaders: string[];
  fileBHeaders: string[];
  onMappingChange: (mapping: Record<string, string>) => void;
}

export const FieldMappingSection: React.FC<FieldMappingSectionProps> = ({
  fileAHeaders,
  fileBHeaders,
  onMappingChange,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    onMappingChange(mapping);
  }, [mapping, onMappingChange]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over) return;
    if (!over.id.toString().startsWith("b-")) return;

    const targetField = over.id.toString().replace("b-", "");
    const sourceField = active.id.toString().replace("a-", "");

    if (Object.values(mapping).includes(targetField)) return;

    setMapping((prev) => ({
      ...prev,
      [sourceField]: targetField,
    }));
  };

  const removeMapping = (aField: string) => {
    setMapping((prev) => {
      const updated = { ...prev };
      delete updated[aField];
      return updated;
    });
  };

  return (
    <div className="mt-10 p-6 bg-card border border-border rounded-xl shadow-sm transition-colors">
      <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
        🔗 Match Columns Between Files
      </h2>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* File A Fields */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border min-h-[200px] shadow-sm">
            <h3 className="text-lg font-medium mb-2 text-foreground text-center">
              File A Fields
            </h3>
            {fileAHeaders.length > 0 ? (
              fileAHeaders.map((field) => (
                <DraggableField
                  key={field}
                  id={`a-${field}`}
                  label={field}
                  disabled={Object.keys(mapping).includes(field)}
                />
              ))
            ) : (
              <p className="text-muted-foreground italic text-center text-sm">
                No fields in File A
              </p>
            )}
          </div>

          {/* Connector */}
          <div className="flex items-center justify-center">
            <ArrowRight className="w-10 h-10 text-primary animate-pulse" />
          </div>

          {/* File B Fields */}
          <div className="space-y-3">
            {fileBHeaders.map((bField) => (
              <DroppableField key={bField} id={`b-${bField}`} bField={bField}>
                {Object.entries(mapping).find(([a, b]) => b === bField) ? (
                  <MappedItem
                    aField={
                      Object.entries(mapping).find(([a, b]) => b === bField)?.[0] || ""
                    }
                    onRemove={removeMapping}
                  />
                ) : null}
              </DroppableField>
            ))}
          </div>
        </div>
      </DndContext>

      {/* Info */}
      <p className="mt-6 text-sm text-muted-foreground text-center">
        {Object.keys(mapping).length > 0
          ? `${Object.keys(mapping).length} field(s) mapped successfully 🎯`
          : "No fields mapped yet."}
      </p>
    </div>
  );
};

/* -------------------- DRAGGABLE -------------------- */
const DraggableField = ({
  id,
  label,
  disabled,
}: {
  id: string;
  label: string;
  disabled?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled,
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-3 py-2 mb-2 rounded-lg border text-center text-sm transition-all duration-200 shadow-sm ${
        disabled
          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
          : "bg-primary/10 text-foreground border-primary/40 cursor-grab hover:bg-primary/20"
      }`}
    >
      {label}
    </div>
  );
};

/* -------------------- DROPPABLE -------------------- */
const DroppableField: React.FC<{
  id: string;
  bField: string;
  children?: React.ReactNode;
}> = ({ id, bField, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`bg-muted/30 p-3 rounded-lg border-2 border-dashed flex flex-col justify-center items-center min-h-[60px] transition-all duration-200 text-sm font-medium ${
        isOver
          ? "border-primary bg-primary/10 scale-[1.02] shadow-md"
          : "border-border hover:bg-muted/50"
      }`}
    >
      <span className="text-foreground font-semibold mb-1">
        {bField}
      </span>
      {children ? (
        children
      ) : (
        <span className="text-muted-foreground text-xs italic">
          Drop matching field from File A
        </span>
      )}
    </div>
  );
};

/* -------------------- MAPPED ITEM -------------------- */
const MappedItem = ({
  aField,
  onRemove,
}: {
  aField: string;
  onRemove: (aField: string) => void;
}) => (
  <span className="flex items-center space-x-1 text-sm">
    <span className="text-primary font-semibold">{aField}</span>
    <button
      onClick={() => onRemove(aField)}
      className="ml-1 text-destructive hover:text-destructive/80 transition-colors"
    >
      ✕
    </button>
  </span>
);
