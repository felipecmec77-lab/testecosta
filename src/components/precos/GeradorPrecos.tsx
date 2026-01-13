import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Paintbrush, List } from "lucide-react";
import { CanvasEditor } from "./CanvasEditorKonva";
import { SimpleTagEditor } from "./SimpleTagEditor";

export function GeradorPrecos() {
  const [tamanho, setTamanho] = useState<"full" | "half">("half");

  return (
    <div className="space-y-4">
      <Tabs defaultValue="canvas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="canvas" className="flex items-center gap-2">
            <Paintbrush className="h-4 w-4" /> Editor Avançado
          </TabsTrigger>
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <List className="h-4 w-4" /> Editor Simples
          </TabsTrigger>
        </TabsList>

        <TabsContent value="canvas" className="mt-4">
          <div className="border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "600px" }}>
            <CanvasEditor tamanho={tamanho} onTamanhoChange={setTamanho} />
          </div>
        </TabsContent>

        <TabsContent value="simple" className="mt-4">
          <SimpleTagEditor tamanho={tamanho} onTamanhoChange={setTamanho} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
